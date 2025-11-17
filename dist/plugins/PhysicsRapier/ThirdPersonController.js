import { Component, Mathf, GPU, Input, KeyCodes } from '@trident/core';
import { PhysicsRapier } from './PhysicsRapier.js';

class ThirdPersonController extends Component {
  _controller;
  _animator;
  _model;
  _mainCamera;
  _animationIDS;
  move = new Mathf.Vector2();
  look = new Mathf.Vector2();
  jump = false;
  sprint = false;
  isPointerLocked = false;
  isGrounded = false;
  currentAnimation = -1;
  v = new Mathf.Vector3();
  speed = 2;
  boostMultiplier = 5;
  orbitSpeed = 0.01;
  rayDistance = 1;
  playHeight = 1.8;
  blendRotation = 0.15;
  animationSpeedRatio = 1;
  state = 1 /* Walking */;
  Start() {
    if (!this._controller) throw Error("No controller attached");
    if (!this._animator) console.warn("No animator attached");
    if (!this._model) throw Error("No model attached");
    if (!this._mainCamera) throw Error("No camera attached");
    if (!this._animationIDS) throw Error("No animation ids set");
    GPU.Renderer.canvas.addEventListener("pointerdown", (event) => {
      if (!this.isPointerLocked) document.body.requestPointerLock();
    });
    document.onpointerlockchange = (event) => {
      this.isPointerLocked = !this.isPointerLocked;
    };
  }
  Update() {
    this.UpdateInput();
    this.GroundedCheck();
    this.Move();
    this.CameraRotation();
    this.UpdateState();
    this.UpdateAnimation();
  }
  UpdateState() {
    const isGrounded = this.isGrounded;
    const isJumping = this.jump;
    const isMoving = this.move.length() > 1e-5;
    const isRunning = this.sprint;
    if (isGrounded === true && !isMoving) this.state = 0 /* Idle */;
    else if (isGrounded === true && isMoving) isRunning ? this.state = 2 /* Running */ : this.state = 1 /* Walking */;
    else if (isGrounded === true && isMoving && isRunning) this.state = 2 /* Running */;
    else if (isJumping === true) this.state = 3 /* Jumping */;
  }
  UpdateAnimation() {
    let currentAnimation = -1;
    if (this.state === 0 /* Idle */) currentAnimation = this._animationIDS.idle;
    if (this.state === 1 /* Walking */) currentAnimation = this._animationIDS.walk;
    if (this.state === 2 /* Running */) currentAnimation = this._animationIDS.sprint;
    if (this.state === 3 /* Jumping */) currentAnimation = this._animationIDS.jump;
    if (currentAnimation !== -1 && this.currentAnimation !== currentAnimation) this._animator.CrossFadeTo(currentAnimation, 0.25, this.state === 1 /* Walking */ ? this.speed * this.animationSpeedRatio : 1);
    this.currentAnimation = currentAnimation;
  }
  UpdateInput() {
    this.move.x = (Input.GetKey(KeyCodes.D) ? 1 : 0) - (Input.GetKey(KeyCodes.A) ? 1 : 0);
    this.move.y = (Input.GetKey(KeyCodes.W) ? 1 : 0) - (Input.GetKey(KeyCodes.S) ? 1 : 0);
    this.jump = Input.GetKey(KeyCodes.SPACE);
    this.sprint = Input.GetKey(KeyCodes.SHIFT);
    this.look.x = -Input.GetAxis("Horizontal");
    this.look.y = -Input.GetAxis("Vertical");
  }
  GroundedCheck() {
    const rigidbody = this._controller.rigidBody;
    const p = rigidbody.translation();
    const ray = new PhysicsRapier.Physics.Ray(p, { x: 0, y: -1, z: 0 });
    const rayHit = PhysicsRapier.PhysicsWorld.castRay(ray, this.rayDistance + 2, true, void 0, void 0, void 0, rigidbody);
    this.isGrounded = rayHit && rayHit.collider && Math.abs(rayHit.timeOfImpact) <= 1.75;
  }
  Move() {
    this.v.set(0, 0, 0);
    this.v.set(this.move.x, 0, -this.move.y);
    this.v.applyQuaternion(this._mainCamera.transform.rotation);
    const rigidbody = this._controller.rigidBody;
    const velocity = rigidbody.linvel();
    const direction = this.v.mul(this.sprint ? this.boostMultiplier : this.speed);
    rigidbody.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);
    if (this.jump && this.isGrounded) rigidbody.setLinvel({ x: 0, y: 7.5, z: 0 }, true);
    const p = rigidbody.translation();
    this._mainCamera.transform.position.set(p.x, p.y, p.z).add(new Mathf.Vector3(0, this.playHeight, 0)).sub(new Mathf.Vector3(0, 0, -2));
    this._model.transform.position.set(p.x, p.y - 1, p.z);
    if (Math.abs(this.move.x) > Mathf.Epsilon || Math.abs(this.move.y) > Mathf.Epsilon) {
      const targetRotation = (Mathf.Atan2(-this.move.x, this.move.y) + this.yaw) * Mathf.Rad2Deg;
      this.currentRotation = Mathf.Lerp(this.currentRotation, targetRotation, this.blendRotation);
      this._model.transform.rotation.fromEuler(new Mathf.Vector3(0, this.currentRotation, 0), true);
    }
  }
  currentRotation = 0;
  yaw = 0;
  pitch = 0;
  CameraRotation() {
    const minPhi = -Math.PI / 2;
    const maxPhi = 0;
    const distance = this._mainCamera.transform.position.distanceTo(this.transform.position);
    if (this.isPointerLocked) {
      this.yaw += this.look.x * this.orbitSpeed;
      this.pitch += this.look.y * this.orbitSpeed;
      this.pitch = Math.min(maxPhi, Math.max(minPhi, this.pitch));
    }
    this._mainCamera.transform.rotation.fromEuler(new Mathf.Vector3(this.pitch, this.yaw, 0));
    this._mainCamera.transform.position.set(0, 0, distance).applyQuaternion(this._mainCamera.transform.rotation).add(this.transform.position);
  }
}

export { ThirdPersonController };
