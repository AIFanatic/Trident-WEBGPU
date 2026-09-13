import { Components, GameObject, GPU, Input, KeyCodes, Mathf, MouseCodes, PBRMaterial, Utils } from "@trident/core";
import { EditorAPI } from "@trident/editor";
import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { GPUPicker } from "./helpers/GPUPicker";

type GizmoMode = "move" | "rotate" | "scale";

interface Ray { origin: Mathf.Vector3; direction: Mathf.Vector3; }

interface DragState {
    mode: GizmoMode;
    axisIndex: number;              // 0 = X, 1 = Y, 2 = Z
    axis: Mathf.Vector3;            // world-space unit axis, frozen at drag start
    origin: Mathf.Vector3;          // gizmo world origin, frozen at drag start
    startPosition: Mathf.Vector3;
    startRotation: Mathf.Quaternion;
    startScale: Mathf.Vector3;
    startOffset: number;            // move/scale: pointer distance along the axis
    startVector: Mathf.Vector3;     // rotate: reference vector in the rotation plane
    gizmoScale: number;             // world size of the gizmo, for scale sensitivity
}

const GIZMO_SCREEN_SIZE = 0.025;
const MODES: GizmoMode[] = ["move", "rotate", "scale"];

/**
 * The rotate rings are mis-named in Gizmo.glb. All three BézierCircle meshes are authored
 * flat in Y (y-extent +-0.18), so an unrotated ring encircles Y, not X:
 *   Rot_Curve_X  no node rotation                 -> normal +Y  -> rotates about Y
 *   Rot_Curve_Y  q(0.5, 0.5, -0.5, 0.5)           -> normal +X  -> rotates about X
 *   Rot_Curve_Z  q(0.7071, 0, 0, 0.7071)          -> normal +Z  -> rotates about Z
 * Move/Scale node names are correct, so the remap is rotate-only.
 */
const ROTATE_AXIS_REMAP = [1, 0, 2];

const HIGHLIGHT_COLOR = new Mathf.Color(1, 0.85, 0, 1);

export class TransformControls extends Components.Component {
    public static type = "@trident/plugins/TransformControls";

    private static isDragging = false;
    private static dragEndFrame = -1;
    private static active: TransformControls | null = null;

    /**
     * True while dragging and for one frame after. Input.GetMouseButton goes false on the
     * frame the browser reports mouseup, but Input.GetMouseButtonUp only fires on the
     * frame AFTER that (`mouseUp[key] == frame - 1`, Input.ts:283). Without the extra
     * frame of grace, ObjectPicker's mouse-up pick lands after the drag has already
     * cleared the flag, and releasing the gizmo selects whatever is behind it.
     */
    public static get suppressSelection(): boolean {
        return TransformControls.isDragging || GPU.Renderer.info.frame <= TransformControls.dragEndFrame + 1;
    }

    public runInEditMode: boolean = true;

    private selectedGameObject: GameObject | null = null;

    private gizmo: GameObject;
    private parts: Record<GizmoMode, GameObject>;
    private mode: GizmoMode = "move";
    private ready = false;

    private drag: DragState | null = null;
    private pickPending = false;

    private tmpMatrix = new Mathf.Matrix4();
    private canvasRect: DOMRect | null = null;

    private hoverPending = false;
    private hoverMouse = new Mathf.Vector2(NaN, NaN);
    private highlighted: Components.Renderable | null = null;
    private savedColor: Mathf.Color;

    public async Start() {
        this.gizmo = await GLTFLoader.Load("./resources/Gizmo.glb", this.gameObject.scene);
        this.gizmo.transform.parent = this.gameObject.transform;
        this.gizmo.name = "Gizmo";

        // Resolve against the instance we just loaded, not by scene path: GLTFLoader
        // caches, so a second TransformControls would make "Gizmo/Move" ambiguous.
        const move = this.FindDescendant(this.gizmo, "Move");
        const rotate = this.FindDescendant(this.gizmo, "Rotate");
        const scale = this.FindDescendant(this.gizmo, "Scale");
        if (!move || !rotate || !scale) throw Error("Cannot find gizmo");

        this.parts = { move, rotate, scale };

        // keep the gizmo out of Play/Stop scene snapshots
        this.ForEachDescendant(this.gizmo, go => go.flags |= Utils.Flags.DontSaveInEditor);

        const meshes = this.gizmo.GetComponentsInChildren(Components.Mesh);
        for (const mesh of meshes) {
            mesh.enableShadows = false;
            (mesh.material as PBRMaterial).params.unlit = true;
        }

        this.SetMode(this.mode);
        this.gizmo.enabled = false;

        TransformControls.active = this;
        this.ready = true;

        EditorAPI.Events.onHierarchySelected(gameObject => {
            const go = gameObject as unknown as GameObject;
            // selecting a gizmo part must not retarget the gizmo onto itself
            if (go && TransformControls.IsGizmoObject(go)) return;
            this.selectedGameObject = go ?? null;
            this.drag = null;
        });
    }

    // ---------------------------------------------------------------- frame

    public Update(): void {
        if (!this.ready) return;

        if (Input.GetKeyDown(KeyCodes.W)) this.SetMode("move");
        else if (Input.GetKeyDown(KeyCodes.E)) this.SetMode("rotate");
        else if (Input.GetKeyDown(KeyCodes.R)) this.SetMode("scale");

        const target = this.selectedGameObject;
        if (this.gizmo.enabled !== !!target) this.gizmo.enabled = !!target;

        if (!target) {
            if (this.drag) this.EndDrag();
            this.SetHighlight(null);
            return;
        }

        this.UpdateGizmoTransform(target);

        if (!this.drag && !this.pickPending && Input.GetMouseButtonDown(MouseCodes.MOUSE_LEFT)) {
            this.BeginPick();
        }

        if (this.drag) {
            if (Input.GetMouseButton(MouseCodes.MOUSE_LEFT)) this.ApplyDrag();
            else this.EndDrag();
        }

        // during a drag the handle is already yellow from the hover that preceded it
        if (!this.drag) this.UpdateHover();
    }

    /** One pick in flight at a time, and only when the cursor moved — Pick() is a GPU readback. */
    private UpdateHover(): void {
        const mouse = Input.mousePosition;
        if (this.hoverPending || (mouse.x === this.hoverMouse.x && mouse.y === this.hoverMouse.y)) return;
        this.hoverMouse.set(mouse.x, mouse.y);

        this.hoverPending = true;
        GPUPicker.Pick(r => TransformControls.IsGizmoObject(r.gameObject)).then(hit => {
            this.hoverPending = false;
            if (!this.drag) this.SetHighlight(hit?.GetComponent(Components.Renderable) ?? null);
        });
    }

    // GLTFLoader builds a fresh PBRMaterial per primitive (GLTFLoader.ts:221), so recolouring
    // one handle can't bleed into the others sharing its glTF material.
    private SetHighlight(renderable: Components.Renderable | null): void {
        if (renderable === this.highlighted) return;

        if (this.highlighted) (this.highlighted.material as PBRMaterial).SetProperty("albedoColor", this.savedColor);
        this.highlighted = renderable;
        if (!renderable) return;

        const material = renderable.material as PBRMaterial;
        this.savedColor = material.params.albedoColor.clone();
        material.SetProperty("albedoColor", HIGHLIGHT_COLOR);
    }

    private UpdateGizmoTransform(target: GameObject): void {
        const camera = Components.Camera.mainCamera;
        if (!camera) return;

        const origin = target.transform.position;
        const rotation = target.transform.rotation;

        // constant apparent size regardless of distance
        const size = camera.transform.position.distanceTo(origin) * GIZMO_SCREEN_SIZE;

        // Each write markDirty()s the entire gizmo subtree (~25 transforms, Transform.ts:77)
        // and flags every gizmo Mesh for a model-matrix re-upload, so only write on change.
        const transform = this.gizmo.transform;
        if (!transform.position.equals(origin)) transform.position.copy(origin);
        if (!transform.rotation.equals(rotation)) transform.rotation.copy(rotation);
        if (Math.abs(transform.scale.x - size) > size * 1e-4) transform.scale.set(size, size, size);
    }

    private SetMode(mode: GizmoMode): void {
        this.mode = mode;
        if (!this.parts) return;
        this.SetHighlight(null);   // the old mode's handle is about to be hidden
        for (const m of MODES) this.parts[m].enabled = (m === mode);
    }

    // ----------------------------------------------------------- hit testing

    private BeginPick(): void {
        // capture the ray now; the GPU readback resolves a frame or two later
        this.canvasRect = GPU.Renderer.canvas.getBoundingClientRect();
        const ray = this.ScreenRay();
        if (!ray) return;

        this.pickPending = true;
        GPUPicker.Pick(r => TransformControls.IsGizmoObject(r.gameObject)).then(hit => {
            this.pickPending = false;
            if (!hit || !this.selectedGameObject) return;
            if (!Input.GetMouseButton(MouseCodes.MOUSE_LEFT)) return;  // released already

            const part = this.GizmoPartOf(hit);
            if (!part || part.axisIndex === -1) return;                // centre cube, no axis

            const axisIndex = part.mode === "rotate" ? ROTATE_AXIS_REMAP[part.axisIndex] : part.axisIndex;
            this.BeginDrag(part.mode, axisIndex, ray);
        });
    }

    /** Which gizmo sub-tree a picked object belongs to, and which axis it encodes. */
    private GizmoPartOf(gameObject: GameObject): { mode: GizmoMode, axisIndex: number } | null {
        let axisIndex = -1;
        for (let t: Components.Transform | null = gameObject.transform; t; t = t.parent) {
            if (axisIndex === -1) axisIndex = TransformControls.AxisFromName(t.gameObject.name);
            for (const mode of MODES) {
                if (t.gameObject === this.parts[mode]) return { mode, axisIndex };
            }
        }
        return null;
    }

    /** "Scale_Cube_X" -> 0, "X_Cylinder.001" -> 0, "Center_Cube.001" -> -1 */
    private static AxisFromName(name: string): number {
        const match = /(?:^|[_\s])([XYZ])(?:[_\s.]|$)/.exec(name);
        return match ? "XYZ".indexOf(match[1]) : -1;
    }

    public static IsGizmoObject(gameObject: GameObject): boolean {
        const gizmo = TransformControls.active?.gizmo;
        if (!gizmo) return false;
        for (let t: Components.Transform | null = gameObject.transform; t; t = t.parent) {
            if (t.gameObject === gizmo) return true;
        }
        return false;
    }

    // ---------------------------------------------------------------- drag

    private BeginDrag(mode: GizmoMode, axisIndex: number, ray: Ray): void {
        const target = this.selectedGameObject;
        if (!target) return;

        const origin = target.transform.position.clone();
        const axis = new Mathf.Vector3(+(axisIndex === 0), +(axisIndex === 1), +(axisIndex === 2))
            .applyQuaternion(target.transform.rotation)
            .normalize();

        const drag: DragState = {
            mode, axisIndex, axis, origin,
            startPosition: target.transform.position.clone(),
            startRotation: target.transform.rotation.clone(),
            startScale: target.transform.scale.clone(),
            startOffset: 0,
            startVector: new Mathf.Vector3(),
            gizmoScale: this.gizmo.transform.scale.x,
        };

        if (mode === "rotate") {
            const hit = this.RayPlane(ray, origin, axis);
            if (!hit) return;
            drag.startVector = hit.sub(origin);
        } else {
            const offset = this.ClosestPointOnAxis(ray, origin, axis);
            if (offset === null) return;
            drag.startOffset = offset;
        }

        this.drag = drag;
        TransformControls.isDragging = true;
    }

    private ApplyDrag(): void {
        const drag = this.drag;
        const target = this.selectedGameObject;
        if (!drag || !target) return;

        const ray = this.ScreenRay();
        if (!ray) return;

        if (drag.mode === "rotate") {
            const hit = this.RayPlane(ray, drag.origin, drag.axis);
            if (!hit) return;
            const current = hit.sub(drag.origin);

            const sin = drag.startVector.clone().cross(current).dot(drag.axis);
            const cos = drag.startVector.dot(current);
            const angle = Math.atan2(sin, cos);

            const delta = new Mathf.Quaternion().setFromAxisAngle(drag.axis, angle);
            target.transform.rotation = delta.mul(drag.startRotation).normalize();
        }
        else {
            const offset = this.ClosestPointOnAxis(ray, drag.origin, drag.axis);
            if (offset === null) return;
            const distance = offset - drag.startOffset;

            if (drag.mode === "move") {
                target.transform.position = drag.startPosition.clone().add(drag.axis.clone().mul(distance));
            }
            else {
                const factor = Math.max(0.001, 1 + distance / drag.gizmoScale);
                const s = drag.startScale;
                target.transform.scale = new Mathf.Vector3(
                    drag.axisIndex === 0 ? s.x * factor : s.x,
                    drag.axisIndex === 1 ? s.y * factor : s.y,
                    drag.axisIndex === 2 ? s.z * factor : s.z,
                );
            }
        }

        // NOT EditorAPI.RepaintInspector() here: it setState()s the whole inspector tree,
        // which repaints and invalidates the browser's hit-test tree every frame of the
        // drag. EndDrag repaints once instead.
    }

    private EndDrag(): void {
        this.drag = null;
        this.canvasRect = null;
        TransformControls.isDragging = false;
        TransformControls.dragEndFrame = GPU.Renderer.info.frame;
        EditorAPI.RepaintInspector();
    }

    // ---------------------------------------------------------------- math

    private ScreenRay(): Ray | null {
        const camera = Components.Camera.mainCamera;
        if (!camera) return null;

        // getBoundingClientRect forces a synchronous layout; the canvas can't move
        // mid-drag, so the rect captured at mouse-down is reused for the whole drag.
        const rect = this.canvasRect ?? GPU.Renderer.canvas.getBoundingClientRect();
        const mouse = Input.mousePosition;
        const ndcX = ((mouse.x - rect.left) / rect.width) * 2 - 1;
        const ndcY = 1 - ((mouse.y - rect.top) / rect.height) * 2;

        // WebGPU clip space: z = 0 at the near plane, 1 at the far plane
        const inverse = this.tmpMatrix.copy(camera.projectionViewMatrix).invert();
        const near = new Mathf.Vector3(ndcX, ndcY, 0).applyMatrix4(inverse);
        const far = new Mathf.Vector3(ndcX, ndcY, 1).applyMatrix4(inverse);

        return { origin: near, direction: far.sub(near).normalize() };
    }

    /** Distance along `axis` from `origin` to the point closest to the ray. */
    private ClosestPointOnAxis(ray: Ray, origin: Mathf.Vector3, axis: Mathf.Vector3): number | null {
        const w0 = origin.clone().sub(ray.origin);
        const b = axis.dot(ray.direction);
        const denominator = 1 - b * b;
        if (Math.abs(denominator) < 1e-6) return null;   // ray parallel to the axis

        const d = axis.dot(w0);
        const e = ray.direction.dot(w0);
        return (b * e - d) / denominator;
    }

    private RayPlane(ray: Ray, point: Mathf.Vector3, normal: Mathf.Vector3): Mathf.Vector3 | null {
        const denominator = ray.direction.dot(normal);
        if (Math.abs(denominator) < 1e-6) return null;   // ray parallel to the plane

        const t = point.clone().sub(ray.origin).dot(normal) / denominator;
        if (t < 0) return null;
        return ray.origin.clone().add(ray.direction.clone().mul(t));
    }

    // -------------------------------------------------------------- helpers

    private FindDescendant(root: GameObject, name: string): GameObject | null {
        if (root.name === name) return root;
        for (const child of root.transform.children) {
            const hit = this.FindDescendant(child.gameObject, name);
            if (hit) return hit;
        }
        return null;
    }

    private ForEachDescendant(root: GameObject, fn: (go: GameObject) => void): void {
        fn(root);
        for (const child of root.transform.children) this.ForEachDescendant(child.gameObject, fn);
    }

    public Destroy(): void {
        this.SetHighlight(null);
        if (TransformControls.active === this) TransformControls.active = null;
        TransformControls.isDragging = false;
        super.Destroy();
    }
}
