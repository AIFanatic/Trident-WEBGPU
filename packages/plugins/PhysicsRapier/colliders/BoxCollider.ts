import { GameObject } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class BoxCollider extends Collider {
    constructor(gameObject: GameObject) {
        super(gameObject);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(this.transform.scale.x * 0.5, this.transform.scale.y * 0.5, this.transform.scale.z * 0.5);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        this.collider.setTranslation(new PhysicsRapier.Physics.Vector3(this.transform.position.x, this.transform.position.y, this.transform.position.z));
        this.collider.setRotation(this.transform.rotation);
    }
}