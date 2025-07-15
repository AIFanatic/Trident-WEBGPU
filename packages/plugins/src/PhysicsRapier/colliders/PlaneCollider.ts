import { GameObject } from "../../../GameObject";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class PlaneCollider extends Collider {
    constructor(gameObject: GameObject) {
        super(gameObject);
        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(this.transform.scale.x, 0.01, this.transform.scale.z);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        this.collider.setTranslation(new PhysicsRapier.Physics.Vector3(this.transform.position.x, this.transform.position.y, this.transform.position.z));
    }

}