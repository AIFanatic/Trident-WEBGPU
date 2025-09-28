import { Assets, Utils, Mathf, GPU, Components, Geometry, Component } from '@trident/core';
import { Gradient } from './Gradient.js';
import WGSL_Structs from './resources/structs.wgsl.js';
import WGSL_Draw from './resources/draw.wgsl.js';
import WGSL_Compute from './resources/update.wgsl.js';

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
var _startSpeed_dec, _gravity_dec, _frameOvertime_dec, _textureTiles_dec, _texture_dec, _boxHalfExtents_dec, _coneHeight_dec, _coneAngle_dec, _radius_dec, _emitFromShell_dec, _shapeType_dec, _rateOverTime_dec, _startLifetime_dec, _startSize_dec, _a, _init;
Assets.Register("@trident/plugins/ParticleSystem/resources/structs.wgsl", WGSL_Structs);
class ParticleSystem extends (_a = Component, _startSize_dec = [Utils.SerializeField], _startLifetime_dec = [Utils.SerializeField], _rateOverTime_dec = [Utils.SerializeField], _shapeType_dec = [Utils.SerializeField], _emitFromShell_dec = [Utils.SerializeField], _radius_dec = [Utils.SerializeField], _coneAngle_dec = [Utils.SerializeField], _coneHeight_dec = [Utils.SerializeField], _boxHalfExtents_dec = [Utils.SerializeField], _texture_dec = [Utils.SerializeField], _textureTiles_dec = [Utils.SerializeField], _frameOvertime_dec = [Utils.SerializeField], _gravity_dec = [Utils.SerializeField], _startSpeed_dec = [Utils.SerializeField], _a) {
  constructor(gameObject) {
    super(gameObject);
    __runInitializers(_init, 5, this);
    __publicField(this, "geometry");
    __publicField(this, "material");
    __publicField(this, "instancedMesh");
    __publicField(this, "compute");
    __publicField(this, "particleInfoBuffer");
    __publicField(this, "lastTime", 0);
    __publicField(this, "startSize", __runInitializers(_init, 8, this, 1)), __runInitializers(_init, 11, this);
    __publicField(this, "startLifetime", __runInitializers(_init, 12, this, 20)), __runInitializers(_init, 15, this);
    __publicField(this, "rateOverTime", __runInitializers(_init, 16, this, 100)), __runInitializers(_init, 19, this);
    __publicField(this, "shapeType", __runInitializers(_init, 20, this, 2 /* Cone */)), __runInitializers(_init, 23, this);
    __publicField(this, "emitFromShell", __runInitializers(_init, 24, this, true)), __runInitializers(_init, 27, this);
    __publicField(this, "radius", __runInitializers(_init, 28, this, 1)), __runInitializers(_init, 31, this);
    __publicField(this, "coneAngle", __runInitializers(_init, 32, this, 25)), __runInitializers(_init, 35, this);
    __publicField(this, "coneHeight", __runInitializers(_init, 36, this, 1)), __runInitializers(_init, 39, this);
    __publicField(this, "boxHalfExtents", __runInitializers(_init, 40, this, new Mathf.Vector3(0.5, 0.5, 0.5))), __runInitializers(_init, 43, this);
    __publicField(this, "texture", __runInitializers(_init, 44, this)), __runInitializers(_init, 47, this);
    __publicField(this, "textureTiles", __runInitializers(_init, 48, this, new Mathf.Vector2(1, 1))), __runInitializers(_init, 51, this);
    __publicField(this, "frameOvertime", __runInitializers(_init, 52, this, 2 /* Random */)), __runInitializers(_init, 55, this);
    // Color over lifetime
    __publicField(this, "_colorOverLifetimeGradients", new Gradient());
    __publicField(this, "gravity", __runInitializers(_init, 56, this, new Mathf.Vector3(0, 0, 0))), __runInitializers(_init, 59, this);
    __publicField(this, "textureSampler");
    __publicField(this, "_startSpeed", new Mathf.Vector3(1, 1, 1).mul(10));
    this.init();
  }
  get colorOverLifetimeGradients() {
    return this._colorOverLifetimeGradients;
  }
  colorOverLifetimeAddColor(color) {
    this.colorOverLifetimeGradients.addColor(color);
  }
  colorOverLifetimeAddAlpha(alpha) {
    this.colorOverLifetimeGradients.addAlpha(alpha);
  }
  colorOverLifetimeSetColorKeys(colorKeys) {
    this.colorOverLifetimeGradients.setColorKeys(colorKeys);
  }
  colorOverLifetimeSetAlphaKeys(alphaKeys) {
    this.colorOverLifetimeGradients.setAlphaKeys(alphaKeys);
  }
  get startSpeed() {
    return this._startSpeed;
  }
  set startSpeed(startSpeed) {
    this._startSpeed.copy(startSpeed);
  }
  async init() {
    this.material = new GPU.Material({
      isDeferred: false,
      shader: await GPU.Shader.Create({
        code: await GPU.ShaderPreprocessor.ProcessIncludesV2(WGSL_Draw),
        colorOutputs: [{ format: "rgba16float", blendMode: "premultiplied" }],
        depthOutput: "depth24plus",
        attributes: {
          position: { location: 0, size: 3, type: "vec3" },
          normal: { location: 1, size: 3, type: "vec3" },
          uv: { location: 2, size: 2, type: "vec2" }
        },
        uniforms: {
          projectionMatrix: { group: 0, binding: 0, type: "storage" },
          viewMatrix: { group: 0, binding: 1, type: "storage" },
          modelMatrix: { group: 0, binding: 2, type: "storage" },
          particles: { group: 0, binding: 3, type: "storage" },
          texture: { group: 0, binding: 4, type: "texture" },
          textureSampler: { group: 0, binding: 5, type: "sampler" },
          settings: { group: 0, binding: 6, type: "storage" },
          colorOverLifetimeRamp: { group: 0, binding: 7, type: "texture" }
        },
        depthWriteEnabled: false
      })
    });
    this.instancedMesh = this.gameObject.AddComponent(Components.InstancedMesh);
    this.instancedMesh._instanceCount = 1024;
    this.instancedMesh.name = "ParticleSystem";
    this.instancedMesh.enableShadows = false;
    this.geometry = Geometry.Plane();
    this.instancedMesh.geometry = this.geometry;
    this.instancedMesh.material = this.material;
    this.compute = await GPU.Compute.Create({
      code: await GPU.ShaderPreprocessor.ProcessIncludesV2(WGSL_Compute),
      computeEntrypoint: "main",
      uniforms: {
        particles: { group: 0, binding: 0, type: "storage-write" },
        settings: { group: 0, binding: 1, type: "storage" }
      }
    });
    this.particleInfoBuffer = new GPU.DynamicBufferMemoryAllocator(this.instancedMesh.instanceCount * 64);
    this.compute.SetBuffer("particles", this.particleInfoBuffer.getBuffer());
    this.material.shader.SetBuffer("particles", this.particleInfoBuffer.getBuffer());
  }
  Update() {
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;
    this.lastTime = currentTime;
    if (!this.compute) return;
    const particleCount = this.instancedMesh.instanceCount;
    const dispatchSizeX = Math.ceil(Math.cbrt(particleCount) / 4);
    const dispatchSizeY = Math.ceil(Math.cbrt(particleCount) / 4);
    const dispatchSizeZ = Math.ceil(Math.cbrt(particleCount) / 4);
    if (!this.texture) this.texture = GPU.Texture.Create(1, 1);
    if (!this.textureSampler) this.textureSampler = GPU.TextureSampler.Create();
    this.material.shader.SetSampler("textureSampler", this.textureSampler);
    this.material.shader.SetTexture("texture", this.texture);
    this.material.shader.SetTexture("colorOverLifetimeRamp", this.colorOverLifetimeGradients.rampTexture);
    const settings = new Float32Array([
      particleCount,
      elapsed,
      this.startSize,
      this.startLifetime,
      ...this._startSpeed.elements,
      0,
      ...this.transform.position.elements,
      0,
      currentTime,
      this.rateOverTime,
      this.shapeType,
      +this.emitFromShell,
      this.radius,
      this.coneAngle * Math.PI / 180,
      this.coneHeight,
      0,
      ...this.boxHalfExtents.elements,
      +(this.texture.width > 1 || this.texture.height > 1),
      // hasTexture
      ...this.textureTiles.elements,
      this.frameOvertime,
      0,
      ...this.gravity.elements,
      0
    ]);
    this.compute.SetArray("settings", settings);
    this.material.shader.SetArray("settings", settings);
    GPU.Renderer.BeginRenderFrame();
    GPU.ComputeContext.BeginComputePass("ParticleSystem", true);
    GPU.ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
    GPU.ComputeContext.EndComputePass();
    GPU.Renderer.EndRenderFrame();
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "startSpeed", _startSpeed_dec, ParticleSystem);
__decorateElement(_init, 5, "startSize", _startSize_dec, ParticleSystem);
__decorateElement(_init, 5, "startLifetime", _startLifetime_dec, ParticleSystem);
__decorateElement(_init, 5, "rateOverTime", _rateOverTime_dec, ParticleSystem);
__decorateElement(_init, 5, "shapeType", _shapeType_dec, ParticleSystem);
__decorateElement(_init, 5, "emitFromShell", _emitFromShell_dec, ParticleSystem);
__decorateElement(_init, 5, "radius", _radius_dec, ParticleSystem);
__decorateElement(_init, 5, "coneAngle", _coneAngle_dec, ParticleSystem);
__decorateElement(_init, 5, "coneHeight", _coneHeight_dec, ParticleSystem);
__decorateElement(_init, 5, "boxHalfExtents", _boxHalfExtents_dec, ParticleSystem);
__decorateElement(_init, 5, "texture", _texture_dec, ParticleSystem);
__decorateElement(_init, 5, "textureTiles", _textureTiles_dec, ParticleSystem);
__decorateElement(_init, 5, "frameOvertime", _frameOvertime_dec, ParticleSystem);
__decorateElement(_init, 5, "gravity", _gravity_dec, ParticleSystem);
__decoratorMetadata(_init, ParticleSystem);

export { ParticleSystem };
