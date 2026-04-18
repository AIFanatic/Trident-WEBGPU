import { Components, EventSystemLocal, GameObject, Mathf, Geometry } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class MeshCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/MeshCollider";

    constructor(gameObject: GameObject) {
        super(gameObject);

        EventSystemLocal.on(Components.RenderableEvents.GeometryUpdated, this.transform, (gameObject, geometry) => {
            let meshes: Components.Mesh[] = this.gameObject.GetComponentsInChildren(Components.Mesh);
            if (meshes.length === 0) {
                console.warn("No mesh");
                return;
            }
    
            const mesh = meshes[0];
            if (!mesh.geometry) {
                console.warn("No mesh or mesh.geometry");
                return;
            }
    
            this.CreateCollider(mesh.geometry);
        });

        const meshes = this.gameObject.GetComponentsInChildren(Components.Mesh);
        if (meshes.length > 0 && meshes[0].geometry?.attributes?.has("position")) {
            this.CreateCollider(meshes[0].geometry);
        }
    }

    private CreateCollider(geometry: Geometry) {
        const p = new Mathf.Vector3();
        const q = new Mathf.Quaternion();
        const s = new Mathf.Vector3();
        this.transform.localToWorldMatrix.decompose(p, q, s);

        const verts = geometry.attributes.get("position").array as Float32Array;
        const idxAny = geometry.index.array as Uint16Array | Uint32Array;
        const idx32 = (idxAny instanceof Uint32Array) ? idxAny : new Uint32Array(idxAny);

        const baked = new Float32Array(verts.length);
        for (let i = 0; i < verts.length; i += 3) {
            baked[i + 0] = verts[i + 0] * s.x;
            baked[i + 1] = verts[i + 1] * s.y;
            baked[i + 2] = verts[i + 2] * s.z;
        }

        if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.trimesh(baked, idx32);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);

        this.collider.setTranslation(p);
        this.collider.setRotation(q);
    }
}