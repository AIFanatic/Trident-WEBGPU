import { Components, EventSystemLocal, SerializeField } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';
import { ColliderEvents, Collider } from './Collider.js';

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
var _radius_dec, _height_dec, _a, _init;
class CapsuleCollider extends (_a = Collider, _height_dec = [SerializeField], _radius_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "height", __runInitializers(_init, 8, this, 1)), __runInitializers(_init, 11, this);
    __publicField(this, "radius", __runInitializers(_init, 12, this, 1)), __runInitializers(_init, 15, this);
  }
  Start() {
    super.Start();
    const mesh = this.gameObject.GetComponent(Components.Mesh);
    if (mesh?.geometry?.attributes?.has("position")) {
      const bv = mesh.geometry.boundingVolume;
      this.center.copy(bv.center);
      this.radius = bv.halfExtents.x;
      this.height = bv.halfExtents.y;
    }
    this.CreateCollider();
  }
  CreateCollider() {
    if (!PhysicsRapier.hasLoaded) {
      console.warn("PhysicsRapier not loaded");
      return;
    }
    console.warn(this.height, this.radius);
    if (this.collider) PhysicsRapier.PhysicsWorld.removeCollider(this.collider, true);
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.capsule(this.height * 0.5, this.radius);
    this.collider = PhysicsRapier.CreateCollider(this, this.colliderDesc);
    this.UpdateTRS();
    EventSystemLocal.emit(ColliderEvents.Created, this.transform, this);
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 5, "height", _height_dec, CapsuleCollider);
__decorateElement(_init, 5, "radius", _radius_dec, CapsuleCollider);
__decoratorMetadata(_init, CapsuleCollider);
__publicField(CapsuleCollider, "type", "@trident/plugins/PhysicsRapier/Colliders/CapsuleCollider");

export { CapsuleCollider };
