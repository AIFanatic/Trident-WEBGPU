import { Component, Mathf } from '@trident/core';
import { PhysicsRapier } from './PhysicsRapier.js';
import { RigidBody } from './RigidBody.js';
import { Collider } from './colliders/Collider.js';

class FirstPersonController extends Component {
  camera;
  collider;
  rigidbody;
  speed = 5;
  boostMultiplier = 10;
  orbitSpeed = 0.01;
  rayDistance = 1;
  playHeight = 1.8;
  v = new Mathf.Vector3();
  keysPressed = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
    up: false,
    down: false,
    jump: false,
    noclip: false
  };
  mouse = { deltaX: 0, deltaY: 0, left: false };
  target;
  state = 4 /* FALLING */;
  async Start() {
    if (!this.camera) throw Error("Camera parameter not set");
    const collider = this.gameObject.GetComponent(Collider);
    if (!collider) throw Error("FirstPersonController needs a collider attached to it");
    this.collider = collider;
    const rigidbody = this.gameObject.GetComponent(RigidBody);
    if (!rigidbody) throw Error("FirstPersonController needs a rigidbody attached to it");
    this.rigidbody = rigidbody;
    this.camera.transform.position.copy(this.transform.position);
    this.rigidbody.rigidBody.lockRotations(true, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "w") this.keysPressed.forward = true;
      if (event.key === "s") this.keysPressed.backward = true;
      if (event.key === "a") this.keysPressed.left = true;
      if (event.key === "d") this.keysPressed.right = true;
      if (event.key === "q") this.keysPressed.up = true;
      if (event.key === "e") this.keysPressed.down = true;
      if (event.key === " ") this.keysPressed.jump = true;
      if (event.key === "n") this.keysPressed.noclip = true;
      if (event.key === "Shift") this.keysPressed.boost = true;
    });
    document.addEventListener("keyup", (event) => {
      if (event.key === "w") this.keysPressed.forward = false;
      if (event.key === "s") this.keysPressed.backward = false;
      if (event.key === "a") this.keysPressed.left = false;
      if (event.key === "d") this.keysPressed.right = false;
      if (event.key === "q") this.keysPressed.up = false;
      if (event.key === "e") this.keysPressed.down = false;
      if (event.key === " ") this.keysPressed.jump = false;
      if (event.key === "n") this.keysPressed.noclip = false;
      if (event.key === "Shift") this.keysPressed.boost = false;
    });
    document.addEventListener("mousedown", (event) => {
      if (!(event.target instanceof HTMLCanvasElement)) return;
      document.body.requestPointerLock();
      this.mouse.left = true;
    });
    document.addEventListener("mouseup", (event) => {
      document.exitPointerLock();
      this.mouse.left = false;
    });
    document.addEventListener("mousemove", (event) => {
      if (this.mouse.left === false) return;
      this.mouse.deltaX -= event.movementX * this.orbitSpeed;
      this.mouse.deltaY -= event.movementY * this.orbitSpeed;
      this.camera.transform.rotation.fromEuler(new Mathf.Vector3(this.mouse.deltaY, this.mouse.deltaX, 0));
    });
    this.target = this.transform;
  }
  GroundRayCast() {
    const direction = this.target.up.clone().mul(-1);
    const from = this.target.position.clone();
    let ray = new PhysicsRapier.Physics.Ray(from, direction);
    let hit = PhysicsRapier.PhysicsWorld.castRay(ray, this.rayDistance + 2, true, void 0, void 0, this.collider.collider);
    if (hit !== null) {
      this.state = 0 /* GROUNDED */;
      this.floorY = ray.pointAt(hit.timeOfImpact).y;
      return;
    }
    this.state = 4 /* FALLING */;
  }
  CanMove() {
    return this.state == 0 /* GROUNDED */ || this.state == 1 /* MOVING */ || this.state == 2 /* RUNNING */;
  }
  SetPosition(position) {
    this.camera.transform.position.copy(position).add(new Mathf.Vector3(0, 1, 0));
  }
  HandleMovement() {
    let speed = this.speed;
    this.v.set(0, 0, 0);
    if (this.keysPressed.forward === true) this.v.z = -1;
    if (this.keysPressed.backward === true) this.v.z = 1;
    if (this.keysPressed.right === true) this.v.x = 1;
    if (this.keysPressed.left === true) this.v.x = -1;
    if (this.keysPressed.up === true) this.v.y = 1;
    if (this.keysPressed.down === true) this.v.y = -1;
    if (this.keysPressed.boost === true) speed = this.boostMultiplier;
    this.v.applyQuaternion(this.camera.transform.rotation);
    const forward = this.keysPressed.forward ? 1 : 0;
    const backward = this.keysPressed.backward ? 1 : 0;
    const left = this.keysPressed.left ? 1 : 0;
    const right = this.keysPressed.right ? 1 : 0;
    const r = this.rigidbody.rigidBody;
    const velocity = r.linvel();
    new Mathf.Vector3(0, 0, backward - forward);
    new Mathf.Vector3(left - right, 0, 0);
    const direction = this.v.mul(speed);
    r.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);
    const p = r.translation();
    const ray = new PhysicsRapier.Physics.Ray(p, { x: 0, y: -1, z: 0 });
    const rayHit = PhysicsRapier.PhysicsWorld.castRay(ray, this.rayDistance + 2, true, void 0, void 0, this.collider.collider);
    const grounded = rayHit && rayHit.collider && Math.abs(rayHit.timeOfImpact) <= 1.75;
    if (this.keysPressed.jump && grounded) r.setLinvel({ x: 0, y: 7.5, z: 0 }, true);
    this.transform.position.set(p.x, p.y, p.z);
    this.camera.transform.position.set(p.x, p.y, p.z).add(new Mathf.Vector3(0, -1.5 + this.playHeight, 0));
  }
  HandleNoClip() {
    if (this.keysPressed.noclip === true) {
      if (this.state === 5 /* NOCLIP */) this.state = 4 /* FALLING */;
      else this.state = 5 /* NOCLIP */;
      console.log(this.state);
    }
  }
  Update() {
    this.GroundRayCast();
    this.HandleNoClip();
    this.HandleMovement();
  }
}

export { FirstPersonController };
