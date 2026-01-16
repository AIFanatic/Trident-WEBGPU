import { GameObject, Component, Mathf } from "@trident/core";
import { PhysicsRapier } from "./PhysicsRapier";
import { Collider } from "./colliders/Collider";
import RAPIER from "./rapier/rapier";

function isFrozen(c: number, flag: number): boolean {
    return (c & flag) !== 0;
}

export const RigidbodyConstraints = {
    None: 0,
    FreezePositionX: 1 << 0,
    FreezePositionY: 1 << 1,
    FreezePositionZ: 1 << 2,
    FreezeRotationX: 1 << 3,
    FreezeRotationY: 1 << 4,
    FreezeRotationZ: 1 << 5,
    FreezePosition: (1 << 0) | (1 << 1) | (1 << 2),
    FreezeRotation: (1 << 3) | (1 << 4) | (1 << 5),
    FreezeAll: ((1 << 0) | (1 << 1) | (1 << 2)) | ((1 << 3) | (1 << 4) | (1 << 5)),
};

type RigidbodyConstraints = (typeof RigidbodyConstraints)[keyof typeof RigidbodyConstraints];

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

    public set constraints(constraint: RigidbodyConstraints) {
        const freezeRot = isFrozen(constraint, RigidbodyConstraints.FreezeRotation);
        const freezePos = isFrozen(constraint, RigidbodyConstraints.FreezePosition);

        this.rigidBody.setEnabledRotations(
            !(isFrozen(constraint, RigidbodyConstraints.FreezeRotationX) || freezeRot),
            !(isFrozen(constraint, RigidbodyConstraints.FreezeRotationY) || freezeRot),
            !(isFrozen(constraint, RigidbodyConstraints.FreezeRotationZ) || freezeRot),
            true
        );

        this.rigidBody.setEnabledTranslations(
            !(isFrozen(constraint, RigidbodyConstraints.FreezePositionX) || freezePos),
            !(isFrozen(constraint, RigidbodyConstraints.FreezePositionY) || freezePos),
            !(isFrozen(constraint, RigidbodyConstraints.FreezePositionZ) || freezePos),
            true
        );
    }

    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public Start(): void {
        if (!this.rigidBody) {
            this.Create("kinematicPosition");
        }
    }

    public AddForce(force: Mathf.Vector3) {
        this.rigidBody.addForce(force, true);
    }

    public Move(position: Mathf.Vector3) {
        const dt = PhysicsRapier.fixedDeltaTime;
        const pNew = position.clone(); //our new desired position
        const p = this.transform.position.clone(); //our current position
        const v = this.velocity.clone(); //our current velocity
        const force = pNew.sub(p).sub(v.mul(dt)).div(dt).mul(this.mass);

        // this.velocity = new Vector3(0, 0, 0);
        this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
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
        const r = this.rigidBody.rotation();

        this.transform.position.set(t.x, t.y, t.z);
        this.transform.rotation.set(r.x, r.y, r.z, r.w);
    }

}