import { SerializeField, Mathf, Components, EventSystemLocal } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';

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
var _size_dec, _center_dec, _a, _init;
class BoxCollider extends (_a = Collider, _center_dec = [SerializeField(Mathf.Vector3)], _size_dec = [SerializeField(Mathf.Vector3)], _a) {
  constructor(gameObject) {
    super(gameObject);
    __publicField(this, "center", __runInitializers(_init, 8, this, new Mathf.Vector3(0, 0, 0))), __runInitializers(_init, 11, this);
    __publicField(this, "size", __runInitializers(_init, 12, this, new Mathf.Vector3(1, 1, 1))), __runInitializers(_init, 15, this);
    const mesh = gameObject.GetComponent(Components.Mesh);
    if (mesh?.geometry?.attributes?.has("position")) {
      const bv = mesh.geometry.boundingVolume;
      this.center.copy(bv.center);
      this.size.set(bv.halfExtents.x * 2, bv.halfExtents.y * 2, bv.halfExtents.z * 2);
    }
    EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
      if (!this.collider || this.collider.parent()) return;
      this.collider.setTranslation(this.center.clone().mul(this.transform.scale).applyQuaternion(this.transform.rotation).add(this.transform.position));
      this.collider.setRotation(this.transform.rotation);
    });
    EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
    });
  }
  Start() {
    this.CreateCollider();
  }
  CreateCollider() {
    if (!PhysicsRapier.hasLoaded) {
      console.warn("PhysicsRapier not loaded");
      return;
    }
    const p = new Mathf.Vector3();
    const q = new Mathf.Quaternion();
    const s = new Mathf.Vector3();
    this.transform.localToWorldMatrix.decompose(p, q, s);
    const halfX = Math.abs(this.size.x * 0.5 * s.x);
    const halfY = Math.abs(this.size.y * 0.5 * s.y);
    const halfZ = Math.abs(this.size.z * 0.5 * s.z);
    if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.cuboid(halfX, halfY, halfZ);
    this.collider = PhysicsRapier.CreateCollider(this, this.colliderDesc);
    const offset = new Mathf.Vector3(this.center.x * s.x, this.center.y * s.y, this.center.z * s.z).applyQuaternion(q);
    this.collider.setTranslation({ x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z });
    this.collider.setRotation(q);
  }
  Destroy() {
    if (this.collider && PhysicsRapier.PhysicsWorld) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 5, "center", _center_dec, BoxCollider);
__decorateElement(_init, 5, "size", _size_dec, BoxCollider);
__decoratorMetadata(_init, BoxCollider);
__publicField(BoxCollider, "type", "@trident/plugins/PhysicsRapier/Colliders/BoxCollider");

export { BoxCollider };
