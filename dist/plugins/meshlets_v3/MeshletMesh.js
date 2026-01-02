import { Utils, InterleavedVertexAttribute, EventSystem, Component } from '@trident/core';
import { Meshoptimizer } from './nv_cluster_lod_builder/meshoptimizer/Meshoptimizer.js';
import { MeshInput } from './nv_cluster_lod_builder/nvclusterlod_mesh.js';
import { computeMeshletBounds, NV_Cluster } from './nv_cluster_lod_builder/lib.js';

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
await Meshoptimizer.load();
class MeshletEvents {
  static Updated = (meshlet) => {
  };
}
class MeshletMeshV3 extends (_a = Component, _material_dec = [Utils.SerializeField], _enableShadows_dec = [Utils.SerializeField], _a) {
  constructor() {
    super(...arguments);
    __runInitializers(_init, 5, this);
    __publicField(this, "_material");
    __publicField(this, "enableShadows", __runInitializers(_init, 8, this, true)), __runInitializers(_init, 11, this);
    __publicField(this, "lodMeshlets", []);
    __publicField(this, "clusterizeOnly", false);
  }
  get material() {
    return this._material;
  }
  set material(material) {
    this._material = material;
  }
  set geometry(geometry) {
    const pa = geometry.attributes.get("position");
    const na = geometry.attributes.get("normal");
    const ua = geometry.attributes.get("uv");
    const ia = geometry.index;
    if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
    const p = pa.array;
    const n = na.array;
    const u = ua.array;
    const indices = ia.array instanceof Uint32Array ? ia.array : Uint32Array.from(ia.array);
    const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
    const interleavedVertices = interleavedBufferAttribute.array;
    console.log("HEREREG");
    if (this.clusterizeOnly) {
      const meshletsBuildOutput = Meshoptimizer.meshopt_buildMeshlets(interleavedVertices, indices, 128, 128, 0);
      const lodMeshlet = {
        lod: 0,
        interleavedVertices,
        vertices: meshletsBuildOutput.meshlet_vertices_result,
        indices: meshletsBuildOutput.meshlet_triangles_result,
        meshlets: []
      };
      for (const meshlet of meshletsBuildOutput.meshlets_result) {
        const bounds = computeMeshletBounds(meshlet, meshletsBuildOutput.meshlet_vertices_result, meshletsBuildOutput.meshlet_triangles_result, interleavedVertices, 8);
        lodMeshlet.meshlets.push({
          triangle_offset: meshlet.triangle_offset,
          triangle_count: meshlet.triangle_count,
          vertex_offset: meshlet.vertex_offset,
          vertex_count: meshlet.vertex_count,
          cone: { apex: bounds.cone_apex, axis: bounds.cone_axis, cutoff: bounds.cone_cutoff },
          bounds: { center: bounds.center, radius: bounds.radius },
          parentBounds: { center: bounds.center, radius: bounds.radius },
          parentError: 0,
          error: Math.max(bounds.radius, 1)
        });
      }
      this.lodMeshlets.push(lodMeshlet);
      EventSystem.emit(MeshletEvents.Updated, this);
      return;
    }
    const meshInput = new MeshInput();
    meshInput.indices = indices;
    meshInput.indexCount = indices.length;
    meshInput.vertices = interleavedVertices;
    meshInput.vertexOffset = 0;
    meshInput.vertexCount = interleavedVertices.length / 8;
    meshInput.vertexStride = 3 + 3 + 2;
    meshInput.clusterConfig = {
      minClusterSize: 128,
      maxClusterSize: 128,
      costUnderfill: 0.9,
      costOverlap: 0.5,
      preSplitThreshold: 1 << 17
    };
    meshInput.groupConfig = {
      minClusterSize: 32,
      maxClusterSize: 32,
      costUnderfill: 0.5,
      costOverlap: 0,
      preSplitThreshold: 0
    };
    meshInput.decimationFactor = 0.5;
    try {
      const outputMeshes = NV_Cluster.BuildToMeshlets(meshInput);
      this.lodMeshlets = outputMeshes;
      EventSystem.emit(MeshletEvents.Updated, this);
    } catch (error) {
      console.warn("Ignoring geometry", geometry, error);
    }
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "material", _material_dec, MeshletMeshV3);
__decorateElement(_init, 5, "enableShadows", _enableShadows_dec, MeshletMeshV3);
__decoratorMetadata(_init, MeshletMeshV3);

export { MeshletEvents, MeshletMeshV3 };
