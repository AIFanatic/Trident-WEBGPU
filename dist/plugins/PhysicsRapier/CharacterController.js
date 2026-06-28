import { SerializeField, GameObject, Mathf, Components, Input, MouseCodes, KeyCodes, Component } from '@trident/core';
import { PhysicsRapier } from '@trident/plugins/PhysicsRapier/PhysicsRapier.js';
import { RigidBody, RigidbodyConstraints } from '@trident/plugins/PhysicsRapier/RigidBody.js';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = array.length + 1 ;
  var initializers = (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  ((target = target.prototype), k < 5);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
      access.set = (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(void 0  , ctx), done._ = 1;
    __expectFn(it) && (initializers.unshift(it) );
  }
  return target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _reload_dec, _fire_dec, _fall_dec, _jump_dec, _sprint_dec, _walk_dec, _idle_dec, _init, _characterType_dec, _fireRateMs_dec, _animationSpeedRatio_dec, _blendRotation_dec, _jumpSpeed_dec, _groundFriction_dec, _groundAccelerate_dec, _airAccelerate_dec, _maxSpeed_dec, _playHeight_dec, _rayDistance_dec, _orbitSpeed_dec, _boostMultiplier_dec, _speed_dec, __animationIDS_dec, _player_dec, _a, _init2;
_idle_dec = [SerializeField], _walk_dec = [SerializeField], _sprint_dec = [SerializeField], _jump_dec = [SerializeField], _fall_dec = [SerializeField], _fire_dec = [SerializeField], _reload_dec = [SerializeField];
class AnimationIds {
  constructor() {
    __publicField(this, "idle", __runInitializers(_init, 8, this, -1)), __runInitializers(_init, 11, this);
    __publicField(this, "walk", __runInitializers(_init, 12, this, -1)), __runInitializers(_init, 15, this);
    __publicField(this, "sprint", __runInitializers(_init, 16, this, -1)), __runInitializers(_init, 19, this);
    __publicField(this, "jump", __runInitializers(_init, 20, this, -1)), __runInitializers(_init, 23, this);
    __publicField(this, "fall", __runInitializers(_init, 24, this, -1)), __runInitializers(_init, 27, this);
    __publicField(this, "fire", __runInitializers(_init, 28, this, -1)), __runInitializers(_init, 31, this);
    __publicField(this, "reload", __runInitializers(_init, 32, this, -1)), __runInitializers(_init, 35, this);
  }
}
_init = __decoratorStart(null);
__decorateElement(_init, 5, "idle", _idle_dec, AnimationIds);
__decorateElement(_init, 5, "walk", _walk_dec, AnimationIds);
__decorateElement(_init, 5, "sprint", _sprint_dec, AnimationIds);
__decorateElement(_init, 5, "jump", _jump_dec, AnimationIds);
__decorateElement(_init, 5, "fall", _fall_dec, AnimationIds);
__decorateElement(_init, 5, "fire", _fire_dec, AnimationIds);
__decorateElement(_init, 5, "reload", _reload_dec, AnimationIds);
__decoratorMetadata(_init, AnimationIds);
var CharacterType = /* @__PURE__ */ ((CharacterType2) => {
  CharacterType2[CharacterType2["FirstPerson"] = 0] = "FirstPerson";
  CharacterType2[CharacterType2["ThirdPerson"] = 1] = "ThirdPerson";
  return CharacterType2;
})(CharacterType || {});
class CharacterController extends (_a = Component, _player_dec = [SerializeField(GameObject)], __animationIDS_dec = [SerializeField(AnimationIds)], _speed_dec = [SerializeField], _boostMultiplier_dec = [SerializeField], _orbitSpeed_dec = [SerializeField], _rayDistance_dec = [SerializeField], _playHeight_dec = [SerializeField], _maxSpeed_dec = [SerializeField], _airAccelerate_dec = [SerializeField], _groundAccelerate_dec = [SerializeField], _groundFriction_dec = [SerializeField], _jumpSpeed_dec = [SerializeField], _blendRotation_dec = [SerializeField], _animationSpeedRatio_dec = [SerializeField], _fireRateMs_dec = [SerializeField], _characterType_dec = [SerializeField(CharacterType)], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "player", __runInitializers(_init2, 8, this)), __runInitializers(_init2, 11, this);
    __publicField(this, "_animationIDS", __runInitializers(_init2, 12, this, new AnimationIds())), __runInitializers(_init2, 15, this);
    __publicField(this, "speed", __runInitializers(_init2, 16, this, 8.13)), __runInitializers(_init2, 19, this);
    __publicField(this, "boostMultiplier", __runInitializers(_init2, 20, this, 1)), __runInitializers(_init2, 23, this);
    __publicField(this, "orbitSpeed", __runInitializers(_init2, 24, this, 0.01)), __runInitializers(_init2, 27, this);
    __publicField(this, "rayDistance", __runInitializers(_init2, 28, this, 1.75)), __runInitializers(_init2, 31, this);
    __publicField(this, "playHeight", __runInitializers(_init2, 32, this, 1.8)), __runInitializers(_init2, 35, this);
    __publicField(this, "maxSpeed", __runInitializers(_init2, 36, this, 8.13)), __runInitializers(_init2, 39, this);
    __publicField(this, "airAccelerate", __runInitializers(_init2, 40, this, 800)), __runInitializers(_init2, 43, this);
    __publicField(this, "groundAccelerate", __runInitializers(_init2, 44, this, 10)), __runInitializers(_init2, 47, this);
    __publicField(this, "groundFriction", __runInitializers(_init2, 48, this, 4)), __runInitializers(_init2, 51, this);
    __publicField(this, "jumpSpeed", __runInitializers(_init2, 52, this, 6.86)), __runInitializers(_init2, 55, this);
    __publicField(this, "blendRotation", __runInitializers(_init2, 56, this, 0.15)), __runInitializers(_init2, 59, this);
    __publicField(this, "animationSpeedRatio", __runInitializers(_init2, 60, this, 1)), __runInitializers(_init2, 63, this);
    __publicField(this, "fireRateMs", __runInitializers(_init2, 64, this, 100)), __runInitializers(_init2, 67, this);
    __publicField(this, "characterType", __runInitializers(_init2, 68, this, 0 /* FirstPerson */)), __runInitializers(_init2, 71, this);
    __publicField(this, "state", 0 /* Idle */);
    __publicField(this, "move", new Mathf.Vector2());
    __publicField(this, "isAiming", false);
    __publicField(this, "isFiring", false);
    __publicField(this, "_controller");
    __publicField(this, "_animator");
    __publicField(this, "_model");
    __publicField(this, "_mainCamera");
    __publicField(this, "look", new Mathf.Vector2());
    __publicField(this, "jump", false);
    __publicField(this, "sprint", false);
    __publicField(this, "isGrounded", false);
    __publicField(this, "isReloading", false);
    __publicField(this, "currentAnimation", -1);
    __publicField(this, "animLockUntil", 0);
    __publicField(this, "lastFireTime", 0);
    __publicField(this, "v", new Mathf.Vector3());
    __publicField(this, "groundPoint", new Mathf.Vector3());
    __publicField(this, "time", 0);
    __publicField(this, "currentRotation", 0);
    __publicField(this, "yaw", 0);
    __publicField(this, "pitch", 0);
  }
  Start() {
    if (!this.player) throw Error("No player attached");
    this._controller = this.player.GetComponentsInChildren(RigidBody)[0];
    this._animator = this.player.GetComponentsInChildren(Components.Animator)[0];
    this._model = this.player;
    this._mainCamera = this.player.GetComponentsInChildren(Components.Camera)[0];
    if (!this._controller) console.warn("CharacterController needs a Rigidbody, found none");
    if (!this._animator) console.warn("CharacterController needs an Animator, found none");
    if (!this._mainCamera) console.warn("CharacterController needs a Camera, found none");
    if (this._controller) this._controller.constraints = RigidbodyConstraints.FreezeRotation;
    Components.Camera.mainCamera = this._mainCamera;
  }
  Update() {
    if (!this.IsValid()) return;
    if (Input.GetMouseButtonDown(MouseCodes.MOUSE_LEFT) && !Input.isPointerLocked) {
      Input.LockPointer();
    }
    this.UpdateInput();
    this.GroundedCheck();
    if (!this._controller.isKinematic) {
      this.Move();
      this.CameraRotation();
    }
    this.UpdateState();
    this.UpdateAnimation();
  }
  IsValid() {
    return !!(this.player && this._controller && this._animator && this._model && this._mainCamera && this._animationIDS);
  }
  UpdateInput() {
    this.move.x = (Input.GetKey(KeyCodes.D) ? 1 : 0) - (Input.GetKey(KeyCodes.A) ? 1 : 0);
    this.move.y = (Input.GetKey(KeyCodes.W) ? 1 : 0) - (Input.GetKey(KeyCodes.S) ? 1 : 0);
    this.jump = Input.GetKey(KeyCodes.SPACE);
    this.sprint = Input.GetKey(KeyCodes.SHIFT);
    this.look.x = -Input.GetAxis("Horizontal");
    this.look.y = -Input.GetAxis("Vertical");
    this.isAiming = Input.isPointerLocked && Input.GetMouseButton(MouseCodes.MOUSE_RIGHT);
    this.isFiring = Input.isPointerLocked && Input.GetMouseButton(MouseCodes.MOUSE_LEFT);
    this.isReloading = Input.GetKey(KeyCodes.R);
  }
  UpdateState() {
    const isMoving = this.move.length() > 1e-5;
    if (this.isGrounded && isMoving && this.sprint) this.state = 2 /* Running */;
    else if (this.isGrounded && isMoving) this.state = 1 /* Walking */;
    else if (this.isGrounded) this.state = 0 /* Idle */;
    else if (this.jump) this.state = 3 /* Jumping */;
  }
  UpdateAnimation() {
    const now = performance.now();
    if (now < this.animLockUntil) return;
    const ids = this._animationIDS;
    if (this.isReloading && ids.reload >= 0 && this.currentAnimation !== ids.reload) {
      this._animator.CrossFadeTo(ids.reload, 0.1);
      this.currentAnimation = ids.reload;
      this.animLockUntil = now + this.ClipDurationMs(ids.reload);
      return;
    }
    if (this.isFiring && ids.fire >= 0 && now - this.lastFireTime > this.fireRateMs) {
      this._animator.SetClipByIndex(ids.fire);
      this.currentAnimation = ids.fire;
      this.lastFireTime = now;
      this.animLockUntil = now + this.fireRateMs;
      return;
    }
    let clip = -1;
    if (this.state === 0 /* Idle */) clip = ids.idle;
    else if (this.state === 1 /* Walking */) clip = ids.walk;
    else if (this.state === 2 /* Running */) clip = ids.sprint;
    else if (this.state === 3 /* Jumping */) clip = ids.jump;
    if (clip !== -1 && clip !== this.currentAnimation) {
      this._animator.CrossFadeTo(clip, 0.25);
      this.currentAnimation = clip;
    }
  }
  ClipDurationMs(index) {
    const clip = this._animator.clips[index];
    return clip ? clip.duration * 1e3 : 200;
  }
  GroundedCheck() {
    const rigidbody = this._controller.rigidBody;
    const p = rigidbody.translation();
    const ray = new PhysicsRapier.Physics.Ray(p, { x: 0, y: -1, z: 0 });
    const rayHit = PhysicsRapier.PhysicsWorld.castRay(ray, this.rayDistance + 2, true, void 0, void 0, void 0, rigidbody);
    this.isGrounded = rayHit && rayHit.collider && Math.abs(rayHit.timeOfImpact) <= 1.75;
    if (rayHit) {
      const groundPoint = ray.pointAt(rayHit.timeOfImpact);
      this.groundPoint.set(groundPoint.x, groundPoint.y, groundPoint.z);
      this.time = rayHit.timeOfImpact;
    }
  }
  Move() {
    const rigidbody = this._controller.rigidBody;
    const dt = 1 / 64;
    const current = rigidbody.linvel();
    const vel = new Mathf.Vector3(
      current.x,
      current.y,
      current.z
    );
    const wishDir = new Mathf.Vector3(this.move.x, 0, -this.move.y);
    if (wishDir.length() > 1e-5) {
      wishDir.normalize();
      const yawQuat = new Mathf.Quaternion().setFromEuler(
        new Mathf.Vector3(0, this.yaw, 0)
      );
      wishDir.applyQuaternion(yawQuat);
      wishDir.y = 0;
      if (wishDir.length() > 1e-5) {
        wishDir.normalize();
      }
    }
    const wishSpeed = this.maxSpeed;
    const useGroundMove = this.isGrounded && !this.jump && this.time < 1.2;
    if (useGroundMove) {
      const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      if (horizontalSpeed > 1e-5) {
        const drop = horizontalSpeed * this.groundFriction * dt;
        const newSpeed = Math.max(horizontalSpeed - drop, 0);
        const ratio = newSpeed / horizontalSpeed;
        vel.x *= ratio;
        vel.z *= ratio;
      }
      const currentSpeed = vel.x * wishDir.x + vel.y * wishDir.y + vel.z * wishDir.z;
      const addSpeed = wishSpeed - currentSpeed;
      if (addSpeed > 0) {
        let accelSpeed = this.groundAccelerate * wishSpeed * dt;
        if (accelSpeed > addSpeed) accelSpeed = addSpeed;
        vel.x += wishDir.x * accelSpeed;
        vel.y += wishDir.y * accelSpeed;
        vel.z += wishDir.z * accelSpeed;
      }
    } else {
      const currentSpeed = vel.x * wishDir.x + vel.y * wishDir.y + vel.z * wishDir.z;
      const addSpeed = wishSpeed - currentSpeed;
      if (addSpeed > 0) {
        let accelSpeed = this.airAccelerate * wishSpeed * dt;
        if (accelSpeed > addSpeed) accelSpeed = addSpeed;
        vel.x += wishDir.x * accelSpeed;
        vel.y += wishDir.y * accelSpeed;
        vel.z += wishDir.z * accelSpeed;
      }
    }
    if (this.jump && this.isGrounded) {
      vel.y = this.jumpSpeed;
    }
    rigidbody.setLinvel(
      {
        x: vel.x,
        y: vel.y,
        z: vel.z
      },
      true
    );
    const p = rigidbody.translation();
    this._mainCamera.transform.position.set(p.x, p.y + this.playHeight, p.z);
    this._model.transform.position.set(p.x, p.y - 1, p.z);
    if (Math.abs(this.move.x) > Mathf.Epsilon || Math.abs(this.move.y) > Mathf.Epsilon) {
      const targetRotation = (Mathf.Atan2(-this.move.x, this.move.y) + this.yaw) * Mathf.Rad2Deg;
      this.currentRotation = Mathf.Lerp(
        this.currentRotation,
        targetRotation,
        this.blendRotation
      );
    }
  }
  CameraRotation() {
    const minPhi = -Math.PI / 2;
    const maxPhi = Math.PI / 2;
    const distance = this._mainCamera.transform.position.distanceTo(this.transform.position) + 2;
    if (Input.isPointerLocked) {
      this.yaw += this.look.x * this.orbitSpeed;
      this.pitch += this.look.y * this.orbitSpeed;
      this.pitch = Math.min(maxPhi, Math.max(minPhi, this.pitch));
    }
    this._mainCamera.transform.rotation.setFromEuler(new Mathf.Vector3(this.pitch, this.yaw, 0));
    if (this.characterType === 0 /* FirstPerson */) {
      this._mainCamera.transform.position.set(this.transform.position.x, this.transform.position.y + this.playHeight, this.transform.position.z);
    } else {
      this._mainCamera.transform.position.set(0, 0, distance).applyQuaternion(this._mainCamera.transform.rotation).add(this.transform.position);
    }
  }
}
_init2 = __decoratorStart(_a);
__decorateElement(_init2, 5, "player", _player_dec, CharacterController);
__decorateElement(_init2, 5, "_animationIDS", __animationIDS_dec, CharacterController);
__decorateElement(_init2, 5, "speed", _speed_dec, CharacterController);
__decorateElement(_init2, 5, "boostMultiplier", _boostMultiplier_dec, CharacterController);
__decorateElement(_init2, 5, "orbitSpeed", _orbitSpeed_dec, CharacterController);
__decorateElement(_init2, 5, "rayDistance", _rayDistance_dec, CharacterController);
__decorateElement(_init2, 5, "playHeight", _playHeight_dec, CharacterController);
__decorateElement(_init2, 5, "maxSpeed", _maxSpeed_dec, CharacterController);
__decorateElement(_init2, 5, "airAccelerate", _airAccelerate_dec, CharacterController);
__decorateElement(_init2, 5, "groundAccelerate", _groundAccelerate_dec, CharacterController);
__decorateElement(_init2, 5, "groundFriction", _groundFriction_dec, CharacterController);
__decorateElement(_init2, 5, "jumpSpeed", _jumpSpeed_dec, CharacterController);
__decorateElement(_init2, 5, "blendRotation", _blendRotation_dec, CharacterController);
__decorateElement(_init2, 5, "animationSpeedRatio", _animationSpeedRatio_dec, CharacterController);
__decorateElement(_init2, 5, "fireRateMs", _fireRateMs_dec, CharacterController);
__decorateElement(_init2, 5, "characterType", _characterType_dec, CharacterController);
__decoratorMetadata(_init2, CharacterController);
__publicField(CharacterController, "type", "@trident/plugins/CharacterController/CharacterController");

export { CharacterController };
