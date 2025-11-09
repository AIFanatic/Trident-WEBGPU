import { Component, Mathf } from '@trident/core';
import { PhysicsRapier } from './PhysicsRapier.js';
import { Collider } from './colliders/Collider.js';

class RigidBody extends Component {
  rigidBody;
  rigidBodyDesc;
  _velocity = new Mathf.Vector3();
  get velocity() {
    const v = this.rigidBody.linvel();
    this._velocity.set(v.x, v.y, v.z);
    return this._velocity;
  }
  get mass() {
    return this.rigidBody.mass();
  }
  constructor(gameObject) {
    super(gameObject);
  }
  Start() {
    if (!this.rigidBody) {
      this.Create("dynamic");
    }
  }
  AddForce(force) {
    this.rigidBody.addForce(force, true);
  }
  Move(position) {
    const dt = 1 / 60;
    const pNew = position.clone();
    const p = this.transform.position.clone();
    const v = this.velocity.clone();
    const force = pNew.sub(p).sub(v.mul(dt)).div(dt).mul(this.mass);
    this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.AddForce(force);
  }
  Create(type) {
    const collider = this.gameObject.GetComponent(Collider);
    if (!collider || !collider.collider) throw Error("Rigidbody needs a collider");
    if (type === "fixed") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.fixed();
    else if (type === "dynamic") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.dynamic();
    else if (type === "kinematicVelocity") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.kinematicVelocityBased();
    else if (type === "kinematicPosition") this.rigidBodyDesc = PhysicsRapier.Physics.RigidBodyDesc.kinematicPositionBased();
    else throw Error("Unknown type");
    this.rigidBody = PhysicsRapier.PhysicsWorld.createRigidBody(this.rigidBodyDesc);
    this.rigidBody.setTranslation(this.transform.position, true);
    this.rigidBody.setRotation(this.transform.rotation, true);
    PhysicsRapier.PhysicsWorld.removeCollider(collider.collider, false);
    collider.collider = PhysicsRapier.PhysicsWorld.createCollider(collider.colliderDesc, this.rigidBody);
    collider.colliderDesc = collider.colliderDesc;
  }
  Update() {
    if (!this.rigidBody) return;
    const t = this.rigidBody.translation();
    this.transform.position.set(t.x, t.y, t.z);
    const r = this.rigidBody.rotation();
    this.transform.rotation.set(r.x, r.y, r.z, r.w);
  }
}

export { RigidBody };
