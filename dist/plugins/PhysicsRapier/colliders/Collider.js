import { SerializeField, Mathf, EventSystemLocal, Components, Component, HideInInspector } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra);
  }, set [name](x) {
    return __privateSet(this, extra, x);
  } }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _update_dec, _enabled_dec, _center_dec, _a, _init;
class ColliderEvents {
  static Created = (collider) => {
  };
}
class Collider extends (_a = Component, _center_dec = [SerializeField(Mathf.Vector3)], _enabled_dec = [SerializeField, HideInInspector], _update_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __runInitializers(_init, 5, this);
    __publicField(this, "collider");
    __publicField(this, "colliderDesc");
    __publicField(this, "runInEditMode", true);
    __publicField(this, "center", __runInitializers(_init, 8, this, new Mathf.Vector3(0, 0, 0))), __runInitializers(_init, 11, this);
    __publicField(this, "_enabled", true);
  }
  get enabled() {
    return this._enabled;
  }
  set enabled(value) {
    this._enabled = value;
    if (this.collider) this.collider.setEnabled(this._enabled);
  }
  get update() {
    return false;
  }
  set update(value) {
    if (this.isDeserializing) return;
    this.CreateCollider();
  }
  Start() {
    EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
      if (!this.collider || this.collider.parent()) return;
      this.UpdateTRS();
    });
  }
  CreateCollider() {
  }
  UpdateTRS() {
    this.collider.setTranslation(this.center.clone().mul(this.transform.scale).applyQuaternion(this.transform.rotation).add(this.transform.position));
    this.collider.setRotation(this.transform.rotation);
  }
  Destroy() {
    if (this.collider && PhysicsRapier.PhysicsWorld) PhysicsRapier.RemoveCollider(this.collider, true);
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "enabled", _enabled_dec, Collider);
__decorateElement(_init, 2, "update", _update_dec, Collider);
__decorateElement(_init, 5, "center", _center_dec, Collider);
__decoratorMetadata(_init, Collider);

export { Collider, ColliderEvents };
