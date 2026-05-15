import { SerializeField, Mathf, Component } from '@trident/core';
import { PhysicsRapier } from './PhysicsRapier.js';
import { Collider } from './colliders/Collider.js';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) fns[i].call(self) ;
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = 2 , key = __decoratorStrings[k + 5];
  var extraInitializers = array[j] || (array[j] = []);
  var desc = ((target = target.prototype), __getOwnPropDesc(target , name));
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
    }
    it = (0, decorators[i])(desc[key]  , ctx), done._ = 1;
    __expectFn(it) && (desc[key] = it );
  }
  return desc && __defProp(target, name, desc), target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _isKinematic_dec, _constraints_dec, _a, _init;
function isFrozen(c, flag) {
  return (c & flag) !== 0;
}
const RigidbodyConstraints = {
  None: 0,
  FreezePositionX: 1 << 0,
  FreezePositionY: 1 << 1,
  FreezePositionZ: 1 << 2,
  FreezeRotationX: 1 << 3,
  FreezeRotationY: 1 << 4,
  FreezeRotationZ: 1 << 5,
  FreezePosition: 1 << 0 | 1 << 1 | 1 << 2,
  FreezeRotation: 1 << 3 | 1 << 4 | 1 << 5,
  FreezeAll: 1 << 0 | 1 << 1 | 1 << 2 | (1 << 3 | 1 << 4 | 1 << 5)
};
class RigidBody extends (_a = Component, _constraints_dec = [SerializeField(RigidbodyConstraints)], _isKinematic_dec = [SerializeField(Boolean)], _a) {
  constructor(gameObject) {
    super(gameObject);
    __runInitializers(_init, 5, this);
    __publicField(this, "rigidBody");
    __publicField(this, "rigidBodyDesc");
    __publicField(this, "_velocity", new Mathf.Vector3());
    __publicField(this, "_constraints", RigidbodyConstraints.None);
    __publicField(this, "_isKinematic", true);
  }
  get velocity() {
    const v = this.rigidBody.linvel();
    this._velocity.set(v.x, v.y, v.z);
    return this._velocity;
  }
  get mass() {
    return this.rigidBody.mass();
  }
  get constraints() {
    return this._constraints;
  }
  set constraints(constraint) {
    this._constraints = constraint;
    if (!this.rigidBody) return;
    const freezePosition = isFrozen(constraint, RigidbodyConstraints.FreezePosition);
    const freezeRotation = isFrozen(constraint, RigidbodyConstraints.FreezeRotation);
    this.rigidBody.setEnabledRotations(
      !(freezeRotation || isFrozen(constraint, RigidbodyConstraints.FreezeRotationX)),
      !(freezeRotation || isFrozen(constraint, RigidbodyConstraints.FreezeRotationY)),
      !(freezeRotation || isFrozen(constraint, RigidbodyConstraints.FreezeRotationZ)),
      true
    );
    this.rigidBody.setEnabledTranslations(
      !(freezePosition || isFrozen(constraint, RigidbodyConstraints.FreezePositionX)),
      !(freezePosition || isFrozen(constraint, RigidbodyConstraints.FreezePositionY)),
      !(freezePosition || isFrozen(constraint, RigidbodyConstraints.FreezePositionZ)),
      true
    );
  }
  get isKinematic() {
    return this._isKinematic;
  }
  set isKinematic(isKinematic) {
    if (isKinematic === true) this.Create("kinematicPosition");
    else this.Create("dynamic");
    this._isKinematic = isKinematic;
  }
  Start() {
    if (!this.rigidBody) {
      this.Create("kinematicPosition");
    }
    this.rigidBody.setTranslation(this.transform.position, true);
    this.rigidBody.setRotation(this.transform.rotation, true);
  }
  AddForce(force) {
    this.rigidBody.addForce(force, true);
  }
  Move(position) {
    const dt = PhysicsRapier.fixedDeltaTime;
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
    if (this.rigidBody) PhysicsRapier.PhysicsWorld.removeRigidBody(this.rigidBody);
    this.rigidBody = PhysicsRapier.PhysicsWorld.createRigidBody(this.rigidBodyDesc);
    this.rigidBody.setTranslation(this.transform.position, true);
    this.rigidBody.setRotation(this.transform.rotation, true);
    this.constraints = this._constraints;
    PhysicsRapier.PhysicsWorld.removeCollider(collider.collider, false);
    collider.collider = PhysicsRapier.PhysicsWorld.createCollider(collider.colliderDesc, this.rigidBody);
    collider.colliderDesc = collider.colliderDesc;
  }
  Update() {
    if (!this.rigidBody) return;
    if (this.isKinematic) {
      this.rigidBody.setTranslation(this.transform.position, true);
      this.rigidBody.setRotation(this.transform.rotation, true);
    } else {
      const t = this.rigidBody.translation();
      const r = this.rigidBody.rotation();
      this.transform.position.set(t.x, t.y, t.z);
      this.transform.rotation.set(r.x, r.y, r.z, r.w);
    }
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "constraints", _constraints_dec, RigidBody);
__decorateElement(_init, 2, "isKinematic", _isKinematic_dec, RigidBody);
__decoratorMetadata(_init, RigidBody);
__publicField(RigidBody, "type", "@trident/plugins/PhysicsRapier/RigidBody");

export { RigidBody, RigidbodyConstraints };
