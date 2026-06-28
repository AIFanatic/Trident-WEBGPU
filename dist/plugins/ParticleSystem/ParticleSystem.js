import { Assets, SerializeField, GPU, Mathf, Components, Utils, Geometry, Component } from '@trident/core';
import { GradientTexture } from './GradientTexture.js';
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
var _startSpeed_dec, _arcSpeed_dec, _arcLoop_dec, _gravity_dec, _colorOverLifetimeGradients_dec, _frameOvertime_dec, _textureTiles_dec, _texture_dec, _boxHalfExtents_dec, _coneHeight_dec, _coneAngle_dec, _radius_dec, _emitFromShell_dec, _shapeType_dec, _rateOverTime_dec, _startLifetime_dec, _startSize_dec, _a, _init;
Assets.Register("@trident/plugins/ParticleSystem/resources/structs.wgsl", WGSL_Structs);
var ShapeType = /* @__PURE__ */ ((ShapeType2) => {
  ShapeType2[ShapeType2["Sphere"] = 0] = "Sphere";
  ShapeType2[ShapeType2["HemiSphere"] = 1] = "HemiSphere";
  ShapeType2[ShapeType2["Cone"] = 2] = "Cone";
  ShapeType2[ShapeType2["Box"] = 3] = "Box";
  ShapeType2[ShapeType2["Circle"] = 4] = "Circle";
  return ShapeType2;
})(ShapeType || {});
class ParticleSystem extends (_a = Component, _startSize_dec = [SerializeField], _startLifetime_dec = [SerializeField], _rateOverTime_dec = [SerializeField], _shapeType_dec = [SerializeField(ShapeType)], _emitFromShell_dec = [SerializeField], _radius_dec = [SerializeField], _coneAngle_dec = [SerializeField], _coneHeight_dec = [SerializeField], _boxHalfExtents_dec = [SerializeField], _texture_dec = [SerializeField(GPU.Texture)], _textureTiles_dec = [SerializeField], _frameOvertime_dec = [SerializeField], _colorOverLifetimeGradients_dec = [SerializeField], _gravity_dec = [SerializeField], _arcLoop_dec = [SerializeField], _arcSpeed_dec = [SerializeField], _startSpeed_dec = [SerializeField(Mathf.Vector3)], _a) {
  constructor(gameObject) {
    super(gameObject);
    __runInitializers(_init, 5, this);
    __publicField(this, "runInEditMode", true);
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
    __publicField(this, "colorOverLifetimeGradients", __runInitializers(_init, 56, this, new GradientTexture())), __runInitializers(_init, 59, this);
    __publicField(this, "gravity", __runInitializers(_init, 60, this, new Mathf.Vector3(0, 0, 0))), __runInitializers(_init, 63, this);
    __publicField(this, "arcLoop", __runInitializers(_init, 64, this, false)), __runInitializers(_init, 67, this);
    __publicField(this, "arcSpeed", __runInitializers(_init, 68, this, 1)), __runInitializers(_init, 71, this);
    // loops per second
    __publicField(this, "arcPhase", 0);
    __publicField(this, "textureSampler");
    __publicField(this, "_startSpeed", new Mathf.Vector3(1, 1, 1).mul(10));
    this.init();
    this.colorOverLifetimeGradients.setColorKeys([
      { t: 0, r: 1, g: 1, b: 1 },
      { t: 1, r: 1, g: 1, b: 1 }
    ]);
    this.colorOverLifetimeGradients.setAlphaKeys([
      { t: 0, a: 1 },
      { t: 1, a: 0 }
    ]);
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
        depthWriteEnabled: false
      })
    });
    this.instancedMesh = this.gameObject.AddComponent(Components.InstancedMesh);
    this.instancedMesh.flags |= Utils.Flags.DontSaveInEditor;
    this.instancedMesh._instanceCount = 1024;
    this.instancedMesh.name = "ParticleSystem";
    this.instancedMesh.enableShadows = false;
    this.geometry = Geometry.Plane();
    this.instancedMesh.geometry = this.geometry;
    this.instancedMesh.material = this.material;
    this.compute = await GPU.ShaderCompute.Create({
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
    this.SetParams();
  }
  SetParams() {
    const currentTime = performance.now();
    const elapsed = currentTime - this.lastTime;
    this.lastTime = currentTime;
    const dt = elapsed / 1e3;
    if (this.arcLoop) this.arcPhase = (this.arcPhase + this.arcSpeed * dt) % 1;
    const particleCount = this.instancedMesh.instanceCount;
    if (!this.texture) this.texture = GPU.Texture.Create(1, 1);
    if (!this.textureSampler) this.textureSampler = new GPU.TextureSampler();
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
      ...this.textureTiles.elements,
      this.frameOvertime,
      0,
      ...this.gravity.elements,
      0,
      +this.arcLoop,
      this.arcPhase,
      0,
      0
      // ← new 16-byte row at the end
    ]);
    this.compute.SetArray("settings", settings);
    this.material.shader.SetArray("settings", settings);
  }
  Update() {
    if (!this.compute) return;
    this.SetParams();
    const particleCount = this.instancedMesh.instanceCount;
    const dispatchSizeX = Math.ceil(Math.cbrt(particleCount) / 4);
    const dispatchSizeY = Math.ceil(Math.cbrt(particleCount) / 4);
    const dispatchSizeZ = Math.ceil(Math.cbrt(particleCount) / 4);
    GPU.Renderer.BeginRenderFrame();
    GPU.ComputeContext.BeginComputePass("ParticleSystem", true);
    GPU.ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
    GPU.ComputeContext.EndComputePass();
    GPU.Renderer.EndRenderFrame();
  }
  Destroy() {
    super.Destroy();
    this.instancedMesh.Destroy();
    this.geometry.Destroy();
    this.material.Destroy();
    this.compute.Destroy();
    this.particleInfoBuffer.Destroy();
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
__decorateElement(_init, 5, "colorOverLifetimeGradients", _colorOverLifetimeGradients_dec, ParticleSystem);
__decorateElement(_init, 5, "gravity", _gravity_dec, ParticleSystem);
__decorateElement(_init, 5, "arcLoop", _arcLoop_dec, ParticleSystem);
__decorateElement(_init, 5, "arcSpeed", _arcSpeed_dec, ParticleSystem);
__decoratorMetadata(_init, ParticleSystem);
__publicField(ParticleSystem, "type", "@trident/plugins/ParticleSystem/ParticleSystem");

export { ParticleSystem };
