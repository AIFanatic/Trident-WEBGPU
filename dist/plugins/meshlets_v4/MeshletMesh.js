import { Utils, InterleavedVertexAttribute, IndexAttribute, Component } from '@trident/core';
import { Meshoptimizer } from './meshoptimizer/Meshoptimizer.js';

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
const meshletsCache = /* @__PURE__ */ new Map();
await Meshoptimizer.load();
class MeshletEvents {
  static Updated = (meshlet) => {
  };
}
const _MeshletMesh = class _MeshletMesh extends (_a = Component, _material_dec = [Utils.SerializeField], _enableShadows_dec = [Utils.SerializeField], _a) {
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
  }
  get material() {
    return this._material;
  }
  set material(material) {
    this._material = material;
  }
  set geometry(geometry) {
    let cached = meshletsCache.get(geometry);
    if (cached) {
      this.meshlets = cached.meshlets;
      this.interleavedVertices = cached.interleavedVertices;
      this.indices = cached.indices;
      this.meshletInfoPacked = cached.meshletInfoPacked;
      return;
    }
    const pa = geometry.attributes.get("position");
    const na = geometry.attributes.get("normal");
    const ua = geometry.attributes.get("uv");
    const ta = geometry.attributes.get("tangent");
    const ia = geometry.index;
    if (!pa || !na || !ua || !ia || !ta) throw Error("To create meshlets need indices, position, normal and uv attributes");
    const p = pa.array;
    const n = na.array;
    const u = ua.array;
    const t = ta.array;
    const indices = ia.array instanceof Uint32Array ? ia.array : Uint32Array.from(ia.array);
    const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u, t], [3, 3, 2, 4]);
    const interleavedVertices = interleavedBufferAttribute.array;
    const output = Meshoptimizer.nanite(interleavedVertices, indices);
    this.meshlets = output.meshlets;
    this.interleavedVertices = interleavedBufferAttribute;
    this.indices = new IndexAttribute(output.indices);
    console.log("meshlets", this.meshlets);
    const meshletCount = this.meshlets.length;
    const bytesPerMeshlet = _MeshletMesh.MeshletInfoFloatStride * 4;
    const packedBuffer = new ArrayBuffer(meshletCount * bytesPerMeshlet);
    const packedView = new DataView(packedBuffer);
    for (let i = 0; i < meshletCount; i++) {
      const meshlet = this.meshlets[i];
      const base = i * bytesPerMeshlet;
      packedView.setUint32(base + 0, meshlet.index_offset, true);
      packedView.setUint32(base + 4, meshlet.index_count, true);
      packedView.setUint32(base + 8, 0, true);
      packedView.setUint32(base + 12, 0, true);
      packedView.setFloat32(base + 16, meshlet.center[0], true);
      packedView.setFloat32(base + 20, meshlet.center[1], true);
      packedView.setFloat32(base + 24, meshlet.center[2], true);
      packedView.setFloat32(base + 28, meshlet.radius, true);
      packedView.setFloat32(base + 32, meshlet.group_error, true);
      packedView.setFloat32(base + 36, 0, true);
      packedView.setFloat32(base + 40, 0, true);
      packedView.setFloat32(base + 44, 0, true);
      packedView.setFloat32(base + 48, meshlet.parent_center[0], true);
      packedView.setFloat32(base + 52, meshlet.parent_center[1], true);
      packedView.setFloat32(base + 56, meshlet.parent_center[2], true);
      packedView.setFloat32(base + 60, meshlet.parent_radius, true);
      packedView.setFloat32(base + 64, meshlet.parent_error, true);
      packedView.setFloat32(base + 68, 0, true);
      packedView.setFloat32(base + 72, 0, true);
      packedView.setFloat32(base + 76, 0, true);
    }
    this.meshletInfoPacked = new Float32Array(packedBuffer);
    meshletsCache.set(geometry, this);
  }
};
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "material", _material_dec, _MeshletMesh);
__decorateElement(_init, 5, "enableShadows", _enableShadows_dec, _MeshletMesh);
__decoratorMetadata(_init, _MeshletMesh);
__publicField(_MeshletMesh, "MeshletInfoFloatStride", 20);
let MeshletMesh = _MeshletMesh;

export { MeshletEvents, MeshletMesh, meshletsCache };
