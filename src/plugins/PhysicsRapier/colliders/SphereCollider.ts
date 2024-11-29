import { GameObject } from "../../../GameObject";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class SphereCollider extends Collider {
    constructor(gameObject: GameObject) {
        super(gameObject);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.ball(this.transform.scale.x * 0.5);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        this.collider.setTranslation(new PhysicsRapier.Physics.Vector3(this.transform.position.x, this.transform.position.y, this.transform.position.z));
    }

}