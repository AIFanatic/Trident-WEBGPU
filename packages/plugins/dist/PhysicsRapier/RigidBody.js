import { Component } from "../../components/Component";
import { PhysicsRapier } from "./PhysicsRapier";
import { Collider } from "./colliders/Collider";
export class RigidBody extends Component {
    rigidBody;
    rigidBodyDesc;
    constructor(gameObject) {
        super(gameObject);
    }
    Create(type) {
        const collider = this.gameObject.GetComponent(Collider);
        if (!collider.collider)
            throw Error("Rigidbody needs a collider");
        if (type === "fixed")
            this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.fixed();
        else if (type === "dynamic")
            this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.dynamic();
        else if (type === "kinematicVelocity")
            this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.kinematicVelocityBased();
        else if (type === "kinematicPosition")
            this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.kinematicPositionBased();
        else
            throw Error("Unknown type");
        // this.rigidBodyDesc.setTranslation(this.transform.position.x, this.transform.position.y, this.transform.position.z);
        this.rigidBody = PhysicsRapier.PhysicsWorld.createRigidBody(this.rigidBodyDesc);
        this.rigidBody.setTranslation(this.transform.position, true);
        this.rigidBody.setRotation(this.transform.rotation, true);
        PhysicsRapier.PhysicsWorld.removeCollider(collider.collider, false);
        collider.collider = PhysicsRapier.PhysicsWorld.createCollider(collider.colliderDesc, this.rigidBody);
        collider.colliderDesc = collider.colliderDesc;
    }
    Update() {
        if (!this.rigidBody)
            return;
        const t = this.rigidBody.translation();
        this.transform.position.set(t.x, t.y, t.z);
        const r = this.rigidBody.rotation();
        this.transform.rotation.set(r.x, r.y, r.z, r.w);
    }
}
