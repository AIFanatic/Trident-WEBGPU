import { Component } from './Component.js';
import { EventSystemLocal } from '../Events.js';
import { TransformEvents } from './Transform.js';
import { SerializeField } from '../utils/SerializeField.js';

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
var _enableShadows_dec, _materialsMapped_dec, _geometry_dec, _a, _init;
class Mesh extends (_a = Component, _geometry_dec = [SerializeField], _materialsMapped_dec = [SerializeField], _enableShadows_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "geometry", __runInitializers(_init, 8, this)), __runInitializers(_init, 11, this);
    __publicField(this, "materialsMapped", __runInitializers(_init, 12, this, /* @__PURE__ */ new Map())), __runInitializers(_init, 15, this);
    __publicField(this, "enableShadows", __runInitializers(_init, 16, this, true)), __runInitializers(_init, 19, this);
  }
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      if (!this.geometry) return;
      this.geometry.boundingVolume.center.copy(this.transform.position);
      this.geometry.boundingVolume.scale = Math.max(this.transform.scale.x, this.transform.scale.y, this.transform.scale.z);
    });
  }
  AddMaterial(material) {
    if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
    this.materialsMapped.get(material.constructor.name)?.push(material);
  }
  GetMaterials(type) {
    if (!type) return Array.from(this.materialsMapped, ([name, value]) => value).flat(Infinity);
    return this.materialsMapped.get(type.name) || [];
  }
  SetGeometry(geometry) {
    this.geometry = geometry;
  }
  GetGeometry() {
    return this.geometry;
  }
  Destroy() {
    this.geometry.Destroy();
    for (const material of this.GetMaterials()) material.Destroy();
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 5, "geometry", _geometry_dec, Mesh);
__decorateElement(_init, 5, "materialsMapped", _materialsMapped_dec, Mesh);
__decorateElement(_init, 5, "enableShadows", _enableShadows_dec, Mesh);
__decoratorMetadata(_init, Mesh);

export { Mesh };
