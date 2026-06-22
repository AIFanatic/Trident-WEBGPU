import { Utils, Component } from '@trident/core';
import { buildMeshletData } from './MeshletMesh.js';

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
var _enableShadows_dec, _material_dec, _a, _init;
const _InstancedMeshletMesh = class _InstancedMeshletMesh extends (_a = Component, _material_dec = [Utils.SerializeField], _enableShadows_dec = [Utils.SerializeField], _a) {
  constructor() {
    super(...arguments);
    __runInitializers(_init, 5, this);
    __publicField(this, "meshlets", []);
    __publicField(this, "interleavedVertices");
    __publicField(this, "indices");
    __publicField(this, "meshletInfoPacked");
    __publicField(this, "_material");
    __publicField(this, "enableShadows", __runInitializers(_init, 8, this, true)), __runInitializers(_init, 11, this);
    __publicField(this, "clusterizeOnly", false);
    __publicField(this, "_matrices", new Float32Array(_InstancedMeshletMesh.DefaultCapacity * 16));
    __publicField(this, "_instanceCount", 0);
  }
  get material() {
    return this._material;
  }
  set material(material) {
    this._material = material;
  }
  get instanceCount() {
    return this._instanceCount;
  }
  get matrices() {
    return this._matrices.subarray(0, this._instanceCount * 16);
  }
  ResetInstances() {
    this._instanceCount = 0;
  }
  SetMatrixAt(index, matrix) {
    const need = (index + 1) * 16;
    if (need > this._matrices.length) {
      const grown = new Float32Array(Math.max(this._matrices.length * 2, need));
      grown.set(this._matrices);
      this._matrices = grown;
    }
    this._matrices.set(matrix.elements, index * 16);
    if (index + 1 > this._instanceCount) this._instanceCount = index + 1;
  }
  SetMatricesBulk(matrices) {
    if (matrices.length > this._matrices.length) this._matrices = new Float32Array(matrices.length);
    this._matrices.set(matrices);
    this._instanceCount = matrices.length / 16;
  }
  set geometry(geometry) {
    const data = buildMeshletData(geometry);
    this.meshlets = data.meshlets;
    this.interleavedVertices = data.interleavedVertices;
    this.indices = data.indices;
    this.meshletInfoPacked = data.meshletInfoPacked;
  }
};
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "material", _material_dec, _InstancedMeshletMesh);
__decorateElement(_init, 5, "enableShadows", _enableShadows_dec, _InstancedMeshletMesh);
__decoratorMetadata(_init, _InstancedMeshletMesh);
__publicField(_InstancedMeshletMesh, "DefaultCapacity", 1024);
let InstancedMeshletMesh = _InstancedMeshletMesh;

export { InstancedMeshletMesh };
