import { Mathf, Geometry, SerializeField, GameObject, EventSystemLocal, Components } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class MeshCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/MeshCollider";
    public runInEditMode = true;

    private _geometry: Geometry;
    @SerializeField(Geometry) public get geometry(): Geometry { return this._geometry }
    public set geometry(geometry: Geometry) {
        this._geometry = geometry;
        this.CreateCollider(this._geometry);
    }

    constructor(gameObject: GameObject) {
        super(gameObject);

        EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
            if (!this.collider) return;
            if (this.collider.parent()) return;   // attached to a Rigidbody — let physics drive it
            this.collider.setTranslation(this.transform.position);
            this.collider.setRotation(this.transform.rotation);
        })
    }

    private CreateCollider(geometry: Geometry) {
        if (!PhysicsRapier.hasLoaded) {
            console.warn("PhysicsRapier not loaded");
            return
        }
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

        if (this.collider) PhysicsRapier.RemoveCollider(this.collider, true);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.trimesh(baked, idx32);
        this.collider = PhysicsRapier.CreateCollider(this, this.colliderDesc);

        this.collider.setTranslation(p);
        this.collider.setRotation(q);
    }
}