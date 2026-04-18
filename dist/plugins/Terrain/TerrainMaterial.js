import { SerializeField, GPU } from '@trident/core';

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
var _armMap_dec, _normalMap_dec, _albedoMap_dec, _transform_dec, _name_dec, _init, _terrainLayers_dec, _a, _init2;
const uv_grid_url = "./resources/uv_grid.png";
_name_dec = [SerializeField], _transform_dec = [SerializeField], _albedoMap_dec = [SerializeField(GPU.Texture)], _normalMap_dec = [SerializeField(GPU.Texture)], _armMap_dec = [SerializeField(GPU.Texture)];
class TerrainLayer {
  constructor() {
    __publicField(this, "name", __runInitializers(_init, 8, this)), __runInitializers(_init, 11, this);
    __publicField(this, "transform", __runInitializers(_init, 12, this)), __runInitializers(_init, 15, this);
    __publicField(this, "albedoMap", __runInitializers(_init, 16, this)), __runInitializers(_init, 19, this);
    __publicField(this, "normalMap", __runInitializers(_init, 20, this)), __runInitializers(_init, 23, this);
    __publicField(this, "armMap", __runInitializers(_init, 24, this)), __runInitializers(_init, 27, this);
  }
}
_init = __decoratorStart(null);
__decorateElement(_init, 5, "name", _name_dec, TerrainLayer);
__decorateElement(_init, 5, "transform", _transform_dec, TerrainLayer);
__decorateElement(_init, 5, "albedoMap", _albedoMap_dec, TerrainLayer);
__decorateElement(_init, 5, "normalMap", _normalMap_dec, TerrainLayer);
__decorateElement(_init, 5, "armMap", _armMap_dec, TerrainLayer);
__decoratorMetadata(_init, TerrainLayer);
class TerrainMaterial extends (_a = GPU.Material, _terrainLayers_dec = [SerializeField(TerrainLayer)], _a) {
  constructor() {
    super({ isDeferred: true });
    __runInitializers(_init2, 5, this);
    __publicField(this, "terrainLayersBuffer");
    __publicField(this, "_terrainLayers", []);
    __publicField(this, "pendingShaderCreation");
    this.createShader();
  }
  CreateSolidTexture(data, format = "rgba8unorm") {
    const texture = GPU.Texture.Create(1, 1, 1, format);
    texture.SetData(new Uint8Array(data), 4);
    return texture;
  }
  CreateSolidTextureArray(data, format = "rgba8unorm") {
    const texture = GPU.TextureArray.Create(1, 1, 1, format);
    texture.SetData(new Uint8Array(data), 4, 1);
    return texture;
  }
  CreateTextureArray(textures) {
    const width = textures[0].width;
    const height = textures[0].height;
    const format = textures[0].format;
    const mipLevels = textures[0].mipLevels ?? 1;
    for (const texture of textures)
      if (texture.width !== width || texture.height !== height || texture.format !== format || texture.mipLevels !== mipLevels)
        throw new Error(
          `Texture array mismatch at index ${0}: expected ${width}x${height} ${format} mips=${mipLevels}, got ${texture.width}x${texture.height} ${texture.format} mips=${texture.mipLevels}, asset=${texture.assetPath ?? texture.name ?? "unknown"}`
        );
    const textureArray = GPU.TextureArray.Create(width, height, textures.length, format, mipLevels);
    GPU.Renderer.BeginRenderFrame();
    for (let layer = 0; layer < textures.length; layer++) {
      for (let mip = 0; mip < mipLevels; mip++) {
        const mipWidth = Math.max(1, width >> mip);
        const mipHeight = Math.max(1, height >> mip);
        GPU.RendererContext.CopyTextureToTextureV3(
          { texture: textures[layer], mipLevel: mip },
          { texture: textureArray, mipLevel: mip, origin: [0, 0, layer] },
          [mipWidth, mipHeight, 1]
        );
      }
    }
    GPU.Renderer.EndRenderFrame();
    textureArray.SetActiveMipCount(mipLevels);
    return textureArray;
  }
  set blendWeightMaps(blendWeightMaps) {
    this.shader.SetTexture("blendWeightMaps", this.CreateTextureArray(blendWeightMaps));
  }
  set materialIdMap(materialIdMap) {
    this.shader.SetTexture("materialIdMap", materialIdMap);
  }
  SetTerrainLayersArray(shader, data) {
    if (!this.terrainLayersBuffer || this.terrainLayersBuffer.size < data.byteLength) {
      this.terrainLayersBuffer = new GPU.Buffer(data.byteLength, GPU.BufferType.STORAGE);
      shader.SetBuffer("TerrainLayers", this.terrainLayersBuffer);
    }
    this.terrainLayersBuffer.SetArray(data);
  }
  get terrainLayers() {
    return this._terrainLayers;
  }
  set terrainLayers(layers) {
    this._terrainLayers = layers;
    if (!this.shader || layers.length === 0) return;
    this.ApplyTerrainLayers(layers);
  }
  ApplyTerrainLayers(layers) {
    const keys = ["albedoMap", "normalMap", "armMap"];
    for (const key of keys) {
      const tex = layers.map((b) => b[key]).filter(Boolean);
      if (tex.length !== 0 && tex.length !== layers.length) throw new Error(`All or none must have ${key}`);
    }
    let layersArray = [];
    let albedoTextures = [];
    let normalTextures = [];
    let armTextures = [];
    for (const layer of layers) {
      let textureIndices = [0, 0, 0, 0];
      let transform = layer.transform || [1, 1, 0, 0];
      if (layer.albedoMap) textureIndices[0] = albedoTextures.push(layer.albedoMap) - 1;
      if (layer.normalMap) textureIndices[1] = normalTextures.push(layer.normalMap) - 1;
      if (layer.armMap) textureIndices[2] = armTextures.push(layer.armMap) - 1;
      layersArray.push(...textureIndices, ...transform);
    }
    this.SetTerrainLayersArray(this.shader, new Float32Array(layersArray));
    if (albedoTextures.length > 0) this.shader.SetTexture("albedoTextures", this.CreateTextureArray(albedoTextures));
    if (normalTextures.length > 0) this.shader.SetTexture("normalTextures", this.CreateTextureArray(normalTextures));
    if (armTextures.length > 0) this.shader.SetTexture("armTextures", this.CreateTextureArray(armTextures));
  }
  async createShader() {
    if (this.pendingShaderCreation) return this.pendingShaderCreation;
    this.pendingShaderCreation = (async () => {
      const gbufferFormat = GPU.RenderingPipeline.GBufferFormat;
      const shader = await GPU.Shader.Create({
        code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                struct VertexInput {
                    @builtin(instance_index) instance : u32,
                    @builtin(vertex_index) vertex : u32,
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                    @location(3) tangent : vec4<f32>,
                };

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) normal : vec3<f32>,
                    @location(1) vUv : vec2<f32>,
                    @location(2) worldPosition : vec4<f32>,
                    @location(3) tangent : vec3<f32>,
                    @location(4) bitangent : vec3<f32>,
                };

                @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;


                @group(1) @binding(0) var textureSampler: sampler;
                @group(1) @binding(1) var albedoTextures: texture_2d_array<f32>;
                @group(1) @binding(2) var normalTextures: texture_2d_array<f32>;
                @group(1) @binding(3) var armTextures:    texture_2d_array<f32>;
                @group(1) @binding(4) var blendWeightMaps: texture_2d_array<f32>;

                @group(1) @binding(5) var materialIdMap: texture_2d<f32>;

                struct TerrainLayer {
                    textureIndices: vec4<f32>, // x=albedo, y=normal, z=arm
                    transform: vec4<f32>, // xy=scale, zw=offset
                };
                @group(1) @binding(6) var<storage, read> TerrainLayers: array<TerrainLayer>;

                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;

                    let modelMatrixInstance = modelMatrix[input.instance];

                    var p = input.position;
                    if (p.y < 0.01) {
                        p.y -= 0.1;
                    }
                    output.position = frameBuffer.projectionMatrix * frameBuffer.viewMatrix * modelMatrixInstance * vec4(p, 1.0);
                    output.vUv = input.uv;

                    output.worldPosition = modelMatrixInstance * vec4(p, 1.0);

                    let worldNormal = normalize(modelMatrixInstance * vec4(input.normal.xyz, 0.0)).xyz;
                    let worldTangent = normalize(modelMatrixInstance * vec4(input.tangent.xyz, 0.0)).xyz;
                    let worldBitangent = cross(worldNormal, worldTangent) * input.tangent.w;
                    
                    output.normal = worldNormal;
                    output.tangent = worldTangent;
                    output.bitangent = worldBitangent;

                    return output;
                }

                struct FragmentOutput {
                    @location(0) albedo : vec4f,
                    @location(1) normal : vec4f,
                    @location(2) RMO : vec4f,
                };
                
                struct TerrainSample {
                    albedo : vec3<f32>,
                    normal  : vec3<f32>,
                    arm: vec3<f32>
                };

                fn sample_layer(uv: vec2<f32>, layer_index: u32) -> TerrainSample {
                    let layer = TerrainLayers[layer_index];
                    let uv_layer = uv * 1 / layer.transform.xy + layer.transform.zw;
                    let layerAlbedo = textureSample(albedoTextures, textureSampler, uv_layer, u32(layer.textureIndices.x));
                    // let layerNormal = textureSample(normalTextures, textureSampler, uv_layer, layer_index);
                    let layerNormalSample = textureSample(normalTextures, textureSampler, uv_layer, u32(layer.textureIndices.y));
                    let layerNormal = layerNormalSample.xyz * 2.0 - 1.0;
                    let layerArm = textureSample(armTextures, textureSampler, uv_layer, u32(layer.textureIndices.z));

                    // // Unity style r=1.0 - smoothness,g=ao,b=detail,a=roughness
                    // let ao = layerArm.g;
                    // let roughness = 1.0 - layerArm.a;
                    // let metalness = layerArm.r;

                    // Unity style r=1.0 - smoothness,g=ao,b=detail,a=roughness
                    let ao = layerArm.r;
                    let roughness = layerArm.g;
                    let metalness = layerArm.b;

                    return TerrainSample(layerAlbedo.rgb, layerNormal, vec3(ao, roughness, metalness));
                }
                    
                @fragment
                fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                    var output: FragmentOutput;

                    let dims = vec2f(textureDimensions(materialIdMap));

                    let uv = input.vUv;

                    // Each channel corresponds to a layer entry index, so r=0=grass, r=1=rock etc
                    // Can have 3 layers per pixel rgb (alpha not used)
                    // Example rgb(0, 1, 2) // 0 = grass, 1 = rock, 2 = forest
                    let materialIdsPerPixel = vec4<u32>(textureLoad(materialIdMap, vec2<i32>(input.vUv * (dims - 1.0)), 0) * 255.0);
                    
                    // Weights of each layer, used for blending
                    // Example rgb(0.33, 0.33, 0.33) // 33% grass, 33% rock, 33% forest (from the example above)
                    let blendWeightsPerPixel = textureSample(blendWeightMaps, textureSampler, uv, 0);

                    let uv_detail = input.worldPosition.xz;
                    let layer0 = sample_layer(uv_detail, materialIdsPerPixel.x);
                    let layer1 = sample_layer(uv_detail, materialIdsPerPixel.y);
                    let layer2 = sample_layer(uv_detail, materialIdsPerPixel.z);

                    let albedo = (layer0.albedo * blendWeightsPerPixel.x) + (layer1.albedo * blendWeightsPerPixel.y) + (layer2.albedo * blendWeightsPerPixel.z);
                    let normal = (layer0.normal * blendWeightsPerPixel.x) + (layer1.normal * blendWeightsPerPixel.y) + (layer2.normal * blendWeightsPerPixel.z);
                    let arm = (layer0.arm * blendWeightsPerPixel.x) + (layer1.arm * blendWeightsPerPixel.y) + (layer2.arm * blendWeightsPerPixel.z);

                    let nTan = normalize(normal);

                    // TBN from geometry
                    let N = normalize(input.normal);
                    let T = normalize(input.tangent);
                    let B = normalize(input.bitangent);

                    let TBN = mat3x3<f32>(T, B, N);
                    let worldNormal = normalize(TBN * nTan);

                    output.albedo = vec4f(albedo, arm.y);
                    output.normal = vec4f(OctEncode(worldNormal), arm.x, arm.z);
                    output.RMO = vec4f(vec3(0.0), 0.0);

                    return output;
                }
            `,
        colorOutputs: [{ format: gbufferFormat }, { format: gbufferFormat }, { format: gbufferFormat }],
        depthOutput: "depth24plus"
      });
      const blackTexture = this.CreateSolidTexture([0, 0, 0, 255]);
      const whiteTextureArray = this.CreateSolidTextureArray([255, 255, 255, 255]);
      const flatNormalTextureArray = this.CreateSolidTextureArray([128, 128, 255, 255]);
      const defaultArmTextureArray = this.CreateSolidTextureArray([255, 255, 0, 255]);
      const uvGridTexture = await GPU.Texture.Load(
        new URL(uv_grid_url, import.meta.url),
        "rgba8unorm-srgb",
        { generateMips: true }
      );
      shader.SetSampler("textureSampler", new GPU.TextureSampler());
      shader.SetTexture("albedoTextures", this.CreateTextureArray([uvGridTexture]));
      shader.SetTexture("normalTextures", flatNormalTextureArray);
      shader.SetTexture("armTextures", defaultArmTextureArray);
      shader.SetTexture("blendWeightMaps", whiteTextureArray);
      shader.SetTexture("materialIdMap", blackTexture);
      this.SetTerrainLayersArray(shader, new Float32Array([0, 0, 0, 0, 10, 10, 0, 0]));
      this.shader = shader;
      if (this._terrainLayers.length > 0) this.ApplyTerrainLayers(this._terrainLayers);
      return shader;
    })();
    return this.pendingShaderCreation;
  }
}
_init2 = __decoratorStart(_a);
__decorateElement(_init2, 2, "terrainLayers", _terrainLayers_dec, TerrainMaterial);
__decoratorMetadata(_init2, TerrainMaterial);
__publicField(TerrainMaterial, "type", "@trident/plugins/Terrain/TerrainMaterial");

export { TerrainLayer, TerrainMaterial };
