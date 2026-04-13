import { GameObject, Mathf } from "@trident/core";
import { PhysicsRapier } from "../PhysicsRapier";
import { Collider } from "./Collider";

export class BoxCollider extends Collider {
    public static type = "@trident/plugins/PhysicsRapier/Colliders/BoxCollider";
    
    constructor(gameObject: GameObject) {
        super(gameObject);

        const p = new Mathf.Vector3();
        const q = new Mathf.Quaternion();
        const s = new Mathf.Vector3();
        this.transform.localToWorldMatrix.decompose(p, q, s);
        s.mul(0.5);

        this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(s.x, s.y, s.z);
        this.collider = PhysicsRapier.PhysicsWorld.createCollider(this.colliderDesc);
        this.collider.setTranslation(p);
        this.collider.setRotation(q);
    }
}