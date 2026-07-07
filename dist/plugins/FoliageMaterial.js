import { GPU, SerializeField, Geometry, PBRMaterial } from '@trident/core';

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
var _foliageNormal_dec, _foliageAlbedo_dec, _foliageGeometry_dec, _a, _init;
class FoliageMaterialParams extends (_a = GPU.MaterialParams, _foliageGeometry_dec = [SerializeField(Geometry)], _foliageAlbedo_dec = [SerializeField(GPU.Texture)], _foliageNormal_dec = [SerializeField(GPU.Texture)], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "foliageGeometry", __runInitializers(_init, 8, this)), __runInitializers(_init, 11, this);
    __publicField(this, "foliageAlbedo", __runInitializers(_init, 12, this)), __runInitializers(_init, 15, this);
    __publicField(this, "foliageNormal", __runInitializers(_init, 16, this)), __runInitializers(_init, 19, this);
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 5, "foliageGeometry", _foliageGeometry_dec, FoliageMaterialParams);
__decorateElement(_init, 5, "foliageAlbedo", _foliageAlbedo_dec, FoliageMaterialParams);
__decorateElement(_init, 5, "foliageNormal", _foliageNormal_dec, FoliageMaterialParams);
__decoratorMetadata(_init, FoliageMaterialParams);
class FoliageMaterial extends GPU.Material {
  static type = "@trident/plugins/FoliageMaterial";
  // Just conveniences
  SetFromMesh(mesh) {
    const geometry = mesh.geometry;
    const material = mesh.material;
    if (geometry && material && material instanceof PBRMaterial) {
      this.params.foliageGeometry = geometry;
      this.params.foliageAlbedo = material.params.albedoMap;
      this.params.foliageNormal = material.params.normalMap;
      this.BuildShader().then((shader) => {
        this.shader = shader;
      });
    }
  }
  // Just conveniences
  static SetFromMesh(mesh) {
    const foliageMaterial = new FoliageMaterial();
    foliageMaterial.SetFromMesh(mesh);
    return foliageMaterial;
  }
  constructor(params) {
    super(new FoliageMaterialParams(), { isDeferred: true, ...params });
  }
  /**
   * For each billboard quad (6 indices = 2 triangles), computes the quad
   * center and writes it to every vertex of that quad. Used in the vertex
   * shader to pivot each leaf plane toward the camera.
   */
  computeBillboardCenters(vertices, indices, { vertexStride = 3, positionOffset = 0, indexStart = 0, indexCount = indices.length } = {}) {
    if (indexCount % 6 !== 0) {
      console.warn("Index count is not divisible by 6. Expected billboard quads (2 triangles / 6 indices).");
    }
    const centers = new Float32Array(vertices.length / vertexStride * 3);
    for (let i = indexStart; i < indexStart + indexCount; i += 6) {
      const quad = [...new Set(indices.slice(i, i + 6))];
      if (quad.length !== 4) {
        console.warn("Skipping non-quad index group:", quad);
        continue;
      }
      let cx = 0, cy = 0, cz = 0;
      for (const v of quad) {
        const base = v * vertexStride + positionOffset;
        cx += vertices[base];
        cy += vertices[base + 1];
        cz += vertices[base + 2];
      }
      cx /= quad.length;
      cy /= quad.length;
      cz /= quad.length;
      for (const v of quad) {
        const out = v * 3;
        centers[out] = cx;
        centers[out + 1] = cy;
        centers[out + 2] = cz;
      }
    }
    return centers;
  }
  async BuildShader() {
    if (!this.params.foliageGeometry || !this.params.foliageAlbedo || !this.params.foliageNormal) return;
    const gbufferFormat = GPU.RenderingPipeline.GBufferFormat;
    const shader = await GPU.Shader.Create({
      name: "FoliageMaterial",
      code: `
                    #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                    @group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
                    @group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;

                    @group(0) @binding(2) var textureSampler: sampler;
                    @group(0) @binding(3) var albedoMap: texture_2d<f32>;
                    @group(0) @binding(4) var normalMap: texture_2d<f32>;

                    @group(0) @binding(5) var<storage, read> leafCenters: array<f32>;

                    struct VertexInput {
                        @builtin(instance_index) instanceIdx: u32,
                        @builtin(vertex_index) vertexIdx: u32,
                        @location(0) position : vec3<f32>,
                        @location(1) normal : vec3<f32>,
                        @location(2) uv : vec2<f32>,
                    };

                    struct VertexOutput {
                        @builtin(position) position : vec4<f32>,
                        @location(0) vUv : vec2<f32>,
                    };

                    @vertex
                    fn vertexMain(input: VertexInput) -> VertexOutput {
                        var output : VertexOutput;

                        let centerBase = input.vertexIdx * 3u;
                        let leafCenterOS = vec3<f32>(
                            leafCenters[centerBase + 0u],
                            leafCenters[centerBase + 1u],
                            leafCenters[centerBase + 2u]
                        );

                        let localOffsetOS = input.position - leafCenterOS;

                        let model = modelMatrix[input.instanceIdx];
                        let centerWS = (model * vec4<f32>(leafCenterOS, 1.0)).xyz;

                        let forwardWS = normalize(frameBuffer.viewPosition.xyz - centerWS);
                        let rightWS = normalize(frameBuffer.viewInverseMatrix[0].xyz);
                        let upWS    = normalize(frameBuffer.viewInverseMatrix[1].xyz);

                        let billboardPositionWS = centerWS + rightWS * localOffsetOS.x + upWS * localOffsetOS.y;

                        output.position = frameBuffer.viewProjectionMatrix * vec4<f32>(billboardPositionWS, 1.0);
                        output.vUv = input.uv;
                        return output;
                    }

                    struct FragmentOutput {
                        @location(0) albedo : vec4f,
                        @location(1) normal : vec4f,
                        @location(2) RMO : vec4f,
                    };

                    @fragment
                    fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                        var output: FragmentOutput;

                        let albedo = textureSample(albedoMap, textureSampler, input.vUv);
                        if (albedo.a < 0.5) {
                            discard;
                        }

                        // TODO: Should the normal just pass through?
                        let normalSample = textureSample(normalMap, textureSampler, input.vUv);

                        output.albedo = vec4f(albedo.rgb, 1.0);
                        output.normal = normalSample;
                        output.RMO = vec4f(0.0);

                        return output;
                    }
                `,
      colorOutputs: Array(3).fill({ format: gbufferFormat }),
      depthOutput: "depth24plus",
      cullMode: "none"
    });
    shader.SetTexture("albedoMap", this.params.foliageAlbedo);
    shader.SetTexture("normalMap", this.params.foliageNormal);
    shader.SetSampler("textureSampler", new GPU.TextureSampler());
    const vertices = this.params.foliageGeometry.attributes.get("position");
    const indices = this.params.foliageGeometry.index;
    if (!vertices || !indices) {
      throw new Error("Foliage geometry needs both vertices and indices");
    }
    const leafCenters = this.computeBillboardCenters(vertices.array, indices.array);
    shader.SetArray("leafCenters", leafCenters);
    return shader;
  }
  ReloadMaterial() {
    const s = this._shader;
    if (!s) return;
    s.SetTexture("albedoMap", this.params.foliageAlbedo);
    s.SetTexture("normalMap", this.params.foliageNormal);
  }
}
GPU.Material.Registry.set(FoliageMaterial.type, FoliageMaterial);

export { FoliageMaterial };
