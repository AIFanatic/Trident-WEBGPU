import { Mathf, Geometry, SerializeField, GameObject, EventSystemLocal, Components } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider, ColliderEvents } from "./Collider";

export class MeshCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/MeshCollider";
    public runInEditMode = true;

    @SerializeField(Geometry) geometry: Geometry;

    public Start(): void {
        super.Start();
        this.CreateCollider();
    }
    
    protected CreateCollider() {
        if (!PhysicsRapier.hasLoaded) {
            console.warn("PhysicsRapier not loaded");
            return;
        }
        if (!this.geometry) return;

        const p = new Mathf.Vector3();
        const q = new Mathf.Quaternion();
        const s = new Mathf.Vector3();
        this.transform.localToWorldMatrix.decompose(p, q, s);

        const verts = this.geometry.attributes.get("position").array as Float32Array;
        const idxAny = this.geometry.index.array as Uint16Array | Uint32Array;
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

        this.UpdateTRS();

        EventSystemLocal.emit(ColliderEvents.Created, this.transform, this);
    }
}