import { SerializeField, Geometry, GPU, Components, EventSystemLocal, Runtime, NonSerialized } from '@trident/core';

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
var _material_dec, _geometry_dec, _init, _renderers_dec, _screenSize_dec, _init2, _geometry_dec2, _lods_dec, _a, _init3;
_geometry_dec = [SerializeField(Geometry)], _material_dec = [SerializeField(GPU.Material)];
class LODRenderer {
  constructor() {
    __publicField(this, "geometry", __runInitializers(_init, 8, this)), __runInitializers(_init, 11, this);
    __publicField(this, "material", __runInitializers(_init, 12, this)), __runInitializers(_init, 15, this);
  }
}
_init = __decoratorStart(null);
__decorateElement(_init, 5, "geometry", _geometry_dec, LODRenderer);
__decorateElement(_init, 5, "material", _material_dec, LODRenderer);
__decoratorMetadata(_init, LODRenderer);
_screenSize_dec = [SerializeField(Number)], _renderers_dec = [SerializeField(LODRenderer)];
class LOD {
  constructor() {
    __publicField(this, "screenSize", __runInitializers(_init2, 8, this, 0)), __runInitializers(_init2, 11, this);
    __publicField(this, "renderers", __runInitializers(_init2, 12, this, [])), __runInitializers(_init2, 15, this);
  }
}
_init2 = __decoratorStart(null);
__decorateElement(_init2, 5, "screenSize", _screenSize_dec, LOD);
__decorateElement(_init2, 5, "renderers", _renderers_dec, LOD);
__decoratorMetadata(_init2, LOD);
class LODGroup extends (_a = Components.Renderable, _lods_dec = [SerializeField(LOD)], _geometry_dec2 = [NonSerialized], _a) {
  constructor(gameObject) {
    super(gameObject);
    __runInitializers(_init3, 5, this);
    __publicField(this, "lods", __runInitializers(_init3, 8, this, [])), __runInitializers(_init3, 11, this);
    __publicField(this, "activeLodIndex", -1);
    __publicField(this, "modelMatrixOffset", -1);
    if (!Components.Mesh.modelMatrices) {
      Components.Mesh.modelMatrices = new GPU.DynamicBufferMemoryAllocatorDynamic(256 * 10, GPU.BufferType.STORAGE, 256 * 10);
    }
    EventSystemLocal.on(Components.TransformEvents.Updated, this.transform, () => {
      this.modelMatrixOffset = Components.Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
    });
  }
  Start() {
    this.modelMatrixOffset = Components.Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
    this.activeLodIndex = this.SelectLOD();
  }
  SelectLOD() {
    if (this.lods.length === 0) return -1;
    const camera = Components.Camera.mainCamera;
    if (!camera) return 0;
    const distance = this.transform.position.distanceTo(camera.transform.position);
    for (let i = 0; i < this.lods.length; i++) if (distance <= this.lods[i].screenSize) return i;
    return this.lods.length - 1;
  }
  OnPreRender(shaderOverride) {
    this.activeLodIndex = this.SelectLOD();
    const lod = this.lods[this.activeLodIndex];
    if (!lod) return;
    const resources = Runtime.Renderer.RenderPipeline.renderGraph.resourcePool;
    const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    const modelMatrices = Components.Mesh.modelMatrices.getBuffer();
    modelMatrices.dynamicOffset = this.modelMatrixOffset * Components.Mesh.modelMatrices.getStride();
    for (const renderer of lod.renderers) {
      const shader = shaderOverride ?? renderer.material?.shader;
      if (!renderer.geometry || !renderer.material || !shader) continue;
      shader.SetBuffer("frameBuffer", FrameBuffer);
      shader.SetBuffer("modelMatrix", modelMatrices);
    }
  }
  OnRenderObject(shaderOverride) {
    const lod = this.lods[this.activeLodIndex];
    if (!lod) return;
    Components.Mesh.modelMatrices.getBuffer().dynamicOffset = this.modelMatrixOffset * Components.Mesh.modelMatrices.getStride();
    for (const renderer of lod.renderers) {
      const shader = shaderOverride ?? renderer.material?.shader;
      if (!renderer.geometry || !renderer.geometry.attributes.has("position") || !renderer.material || !shader) {
        continue;
      }
      GPU.RendererContext.DrawGeometry(renderer.geometry, shader);
    }
  }
  get geometry() {
    const lod = this.lods[this.activeLodIndex] ?? this.lods[0];
    return lod?.renderers?.[0]?.geometry;
  }
  Destroy() {
    if (Components.Mesh.modelMatrices?.has(this.id)) {
      Components.Mesh.modelMatrices.delete(this.id);
    }
    super.Destroy();
  }
}
_init3 = __decoratorStart(_a);
__decorateElement(_init3, 2, "geometry", _geometry_dec2, LODGroup);
__decorateElement(_init3, 5, "lods", _lods_dec, LODGroup);
__decoratorMetadata(_init3, LODGroup);
__publicField(LODGroup, "type", "@trident/plugins/LOD/LODGroup");

export { LOD, LODGroup, LODRenderer };
