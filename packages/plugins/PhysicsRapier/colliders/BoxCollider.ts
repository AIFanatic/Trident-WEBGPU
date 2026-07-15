import { Components, EventSystemLocal, Mathf, SerializeField } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider, ColliderEvents } from "./Collider";

export class BoxCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/BoxCollider";

    @SerializeField(Mathf.Vector3) public size = new Mathf.Vector3(1, 1, 1);

    public Start() {
        super.Start();
        const mesh = this.gameObject.GetComponent(Components.Mesh);
        if (mesh?.geometry?.attributes?.has("position")) {
            const bv = mesh.geometry.boundingVolume;
            this.center.copy(bv.center);
            this.size.set(bv.halfExtents.x * 2, bv.halfExtents.y * 2, bv.halfExtents.z * 2);
        }
        this.CreateCollider();
    }

    protected CreateCollider() {
        if (!PhysicsRapier.hasLoaded) { console.warn("PhysicsRapier not loaded"); return; }
        console.log("CALLED")

        const halfX = Math.abs(this.size.x * 0.5 * this.transform.scale.x);
        const halfY = Math.abs(this.size.y * 0.5 * this.transform.scale.y);
        const halfZ = Math.abs(this.size.z * 0.5 * this.transform.scale.z);

        if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(halfX, halfY, halfZ);
        this.collider = PhysicsRapier.CreateCollider(this, this.colliderDesc);

        this.UpdateTRS();

        EventSystemLocal.emit(ColliderEvents.Created, this.transform, this);
    }
}