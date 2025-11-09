import { GameObject, Component, Mathf } from "@trident/core";
import { PhysicsRapier } from "./PhysicsRapier";
import { Collider } from "./colliders/Collider";
import RAPIER from "./rapier/rapier";

export class RigidBody extends Component {
    private rigidBody: RAPIER.RigidBody;
    private rigidBodyDesc: RAPIER.RigidBodyDesc;

    private _velocity = new Mathf.Vector3();
    public get velocity(): Mathf.Vector3 {
        const v = this.rigidBody.linvel();
        this._velocity.set(v.x, v.y, v.z);
        return this._velocity;
    }

    public get mass(): number { return this.rigidBody.mass() };
    
    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public Start(): void {
        if (!this.rigidBody) {
            this.Create("dynamic");
        }
    }

    public AddForce(force: Mathf.Vector3) {
        this.rigidBody.addForce(force, true);
    }

    public Move(position: Mathf.Vector3) {
        const dt = 1/60; // TODO: Should be fixedTimestep instead
        const pNew = position.clone(); //our new desired position
        const p = this.transform.position.clone(); //our current position
        const v = this.velocity.clone(); //our current velocity
        const force = pNew.sub(p).sub(v.mul(dt)).div(dt).mul(this.mass);
        
        // this.velocity = new Vector3(0, 0, 0);
        this.rigidBody.setLinvel({x: 0, y: 0, z: 0}, true);
        this.AddForce(force);
    }

    public Create(type: "fixed" | "dynamic" | "kinematicVelocity" | "kinematicPosition") {
        const collider = this.gameObject.GetComponent(Collider) as Collider;
        if (!collider || !collider.collider) throw Error("Rigidbody needs a collider");

        if (type === "fixed") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.fixed();
        else if (type === "dynamic") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.dynamic();
        else if (type === "kinematicVelocity") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.kinematicVelocityBased();
        else if (type === "kinematicPosition") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.kinematicPositionBased();
        else throw Error("Unknown type");
        // this.rigidBodyDesc.setTranslation(this.transform.position.x, this.transform.position.y, this.transform.position.z);
        this.rigidBody = PhysicsRapier.PhysicsWorld.createRigidBody(this.rigidBodyDesc);
        this.rigidBody.setTranslation(this.transform.position, true);
        this.rigidBody.setRotation(this.transform.rotation, true);

        PhysicsRapier.PhysicsWorld.removeCollider(collider.collider, false);
        collider.collider = PhysicsRapier.PhysicsWorld.createCollider(collider.colliderDesc, this.rigidBody);
        collider.colliderDesc = collider.colliderDesc;
    }

    public Update(): void {
        if (!this.rigidBody) return;

        const t = this.rigidBody.translation();
        this.transform.position.set(t.x, t.y, t.z);

        const r = this.rigidBody.rotation();
        this.transform.rotation.set(r.x, r.y, r.z, r.w);
    }

}