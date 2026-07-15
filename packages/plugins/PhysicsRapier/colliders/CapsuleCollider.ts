import { Components, EventSystemLocal, SerializeField } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider, ColliderEvents } from "./Collider";

export class CapsuleCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/CapsuleCollider";

    @SerializeField public height = 1;
    @SerializeField public radius = 1;

    public Start() {
        super.Start();
        const mesh = this.gameObject.GetComponent(Components.Mesh);
        if (mesh?.geometry?.attributes?.has("position")) {
            const bv = mesh.geometry.boundingVolume;
            this.center.copy(bv.center);
            this.radius = bv.halfExtents.x;
            this.height = bv.halfExtents.y;
        }

        this.CreateCollider();
    }

    protected CreateCollider() {
        if (!PhysicsRapier.hasLoaded) { console.warn("PhysicsRapier not loaded"); return; }

        console.warn(this.height, this.radius)

        if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.capsule(this.height * 0.5, this.radius);
        this.collider = PhysicsRapier.CreateCollider(this, this.colliderDesc);

        this.UpdateTRS();

        EventSystemLocal.emit(ColliderEvents.Created, this.transform, this);
    }
}