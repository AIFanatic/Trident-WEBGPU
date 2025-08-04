import { GPU, Geometry } from '@trident/core';
import { UIFolder, UISliderStat } from '@trident/plugins/ui/UIStats.js';
import { Debugger } from '@trident/plugins/Debugger.js';

class Bloom extends GPU.RenderPass {
  shader;
  geometry;
  renderTarget;
  output;
  currentPassBuffer;
  temporaryTextures = /* @__PURE__ */ new Map();
  scratchTextures = [];
  iterations = 1;
  constructor() {
    super({});
    this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.output = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
  }
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(2) var texSampler: sampler;

            @group(0) @binding(3) var<storage, read> threshold: f32;
            @group(0) @binding(4) var<storage, read> knee: f32;

            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
            };

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4(input.position, 1.0);
                output.uv = input.uv;
                return output;
            }


            @group(1) @binding(0) var _MainTex: texture_2d<f32>;
            @group(1) @binding(1) var _MainTexSampler: sampler;
            @group(1) @binding(2) var<storage, read> _MainTex_TexelSize: vec2<f32>;

            @group(1) @binding(3) var _BlendTarget: texture_2d<f32>;
            @group(1) @binding(4) var _BlendTargetSampler: sampler;


            struct BloomParams {
                _Filter: vec4<f32>,
                _DownsampleDistance: vec4<f32>,
                _UpsampleDistance: vec4<f32>,
                _Strength: vec4<f32>
            };

            @group(1) @binding(5) var<storage, read> params: BloomParams;

            @group(1) @binding(6) var<storage, read> _pass: f32;

            fn rcp(x: f32) -> f32 {
                return 1 / x;
            }

            fn Brightness(c: vec3f) -> f32 {
                return max(c.r, max(c.g, c.b));
            }

            fn kawase_sample(tex: texture_2d<f32>, texSampler: sampler, uv: vec2f, offset: vec4f) -> vec3f {
                let s1: vec4f = textureSample(tex, texSampler, uv + offset.xy);
                let s2: vec4f = textureSample(tex, texSampler, uv + offset.zy);
                let s3: vec4f = textureSample(tex, texSampler, uv + offset.xw);
                let s4: vec4f = textureSample(tex, texSampler, uv + offset.zw);

                // let s = s1 + s2 + s3 + s4;
                // return s.rgb * 0.25;



                // Karis average
                let _LuminanceBias = 1.0;
                let s1w: f32 = rcp(Brightness(s1.rgb) + _LuminanceBias);
                let s2w: f32 = rcp(Brightness(s2.rgb) + _LuminanceBias);
                let s3w: f32 = rcp(Brightness(s3.rgb) + _LuminanceBias);
                let s4w: f32 = rcp(Brightness(s4.rgb) + _LuminanceBias);
                
                let s = s1 * s1w + s2 * s2w + s3 * s3w + s4 * s4w;
                return s.rgb * rcp(s1w + s2w + s3w + s4w);
              }
        
            fn prefilter(uv: vec2f) -> vec4f
            {
                let color: vec4f = textureSample(_MainTex, _MainTexSampler, uv);
                let k: f32 = dot(vec3f(0.299, 0.587, 0.114), color.rgb);
                var soft_k: f32 = k - params._Filter.y;
                soft_k = clamp(soft_k, 0, params._Filter.z);
                soft_k = soft_k * soft_k * params._Filter.w;
                var filter_k: f32 = max(soft_k, k - params._Filter.x);
                filter_k /= max(k, 0.00001);
                return color * filter_k;
            }
          
            fn downsample (uv: vec2f) -> vec4f
            {
                let dist: f32 = params._DownsampleDistance.x;
                let offset: vec4f = _MainTex_TexelSize.xyxy * vec2f(-dist, dist).xxyy;
                let sample: vec3f = kawase_sample(_MainTex, _MainTexSampler, uv, offset);
                return vec4f(sample, 1);
            }
          
            fn upsample (uv: vec2f) -> vec4f
            {
                let dist: f32 = params._UpsampleDistance.x;
                let offset: vec4f = _MainTex_TexelSize.xyxy * vec2f(-dist, dist).xxyy;
                let sample: vec3f = kawase_sample(_MainTex, _MainTexSampler, uv, offset);
                return vec4f(sample, 1);
            }
          
            fn blendpass (uv: vec2f) -> vec4f
            {
                let dist: f32 = params._UpsampleDistance.x;
                let c: vec4f = textureSample(_BlendTarget, _BlendTargetSampler, uv);
                let offset: vec4f = _MainTex_TexelSize.xyxy * vec2f(-dist, dist).xxyy;
                let acc = params._Strength.x * kawase_sample(_MainTex, _MainTexSampler, uv, offset);
                return vec4f(c.rgb + acc.rgb, c.a);
            }
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                if (u32(_pass) == 0) {
                    return prefilter(input.uv);
                }
                else if (u32(_pass) == 1) {
                    return downsample(input.uv);
                }
                else if (u32(_pass) == 2) {
                    return upsample(input.uv);
                }
                else if (u32(_pass) == 3) {
                    return blendpass(input.uv);
                }

                return vec4f(0.0);
            }
            `,
      colorOutputs: [
        { format: "rgba16float" }
      ],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        tex: { group: 0, binding: 0, type: "texture" },
        texSampler: { group: 0, binding: 2, type: "sampler" },
        threshold: { group: 0, binding: 3, type: "storage" },
        knee: { group: 0, binding: 4, type: "storage" },
        _MainTex: { group: 1, binding: 0, type: "texture" },
        _MainTexSampler: { group: 1, binding: 1, type: "sampler" },
        _MainTex_TexelSize: { group: 1, binding: 2, type: "storage" },
        _BlendTarget: { group: 1, binding: 3, type: "texture" },
        _BlendTargetSampler: { group: 1, binding: 4, type: "sampler" },
        params: { group: 1, binding: 5, type: "storage" },
        _pass: { group: 1, binding: 6, type: "storage" }
      }
    });
    this.shader.SetSampler("texSampler", GPU.TextureSampler.Create());
    this.shader.SetSampler("_MainTexSampler", GPU.TextureSampler.Create());
    this.shader.SetSampler("_BlendTargetSampler", GPU.TextureSampler.Create());
    this.geometry = Geometry.Plane();
    const minUniformBufferOffsetAlignment = 256;
    this.currentPassBuffer = GPU.DynamicBuffer.Create(minUniformBufferOffsetAlignment * 4 * 4, GPU.BufferType.STORAGE, 1 * 4);
    this.currentPassBuffer.SetArray(
      new Float32Array(
        new Array().concat(
          ...new Float32Array(minUniformBufferOffsetAlignment).fill(0),
          ...new Float32Array(minUniformBufferOffsetAlignment).fill(1),
          ...new Float32Array(minUniformBufferOffsetAlignment).fill(2),
          ...new Float32Array(minUniformBufferOffsetAlignment).fill(3)
        )
      )
    );
    this.shader.SetBuffer("_pass", this.currentPassBuffer);
    const bloomFolder = new UIFolder(Debugger.ui, "Bloom");
    bloomFolder.Open();
    let _DownsampleDistance = 1;
    let _UpsampleDistance = 0.5;
    let Strength = 1;
    let threshold = 0.8;
    let softThreshold = 0.25;
    const updateParams = () => {
      const knee = threshold * softThreshold;
      this.shader.SetArray("params", new Float32Array([
        threshold,
        threshold - knee,
        2 * knee,
        0.25 / (knee + 1e-5),
        _DownsampleDistance,
        0,
        0,
        0,
        _UpsampleDistance,
        0,
        0,
        0,
        Strength,
        0,
        0,
        0
      ]));
    };
    new UISliderStat(bloomFolder, "Iterations:", 1, 16, 1, this.iterations, (state) => {
      this.iterations = state;
    });
    new UISliderStat(bloomFolder, "Threshold:", 0, 1, 0.01, threshold, (state) => {
      threshold = state;
      updateParams();
    });
    new UISliderStat(bloomFolder, "Soft Threshold:", 0, 5, 0.01, softThreshold, (state) => {
      softThreshold = state;
      updateParams();
    });
    new UISliderStat(bloomFolder, "Strength:", 0, 5, 0.01, Strength, (state) => {
      Strength = state;
      updateParams();
    });
    new UISliderStat(bloomFolder, "Downsample distance:", 0, 50, 0.01, _DownsampleDistance, (state) => {
      _DownsampleDistance = state;
      updateParams();
    });
    new UISliderStat(bloomFolder, "Upsample distance:", 0, 50, 0.01, _UpsampleDistance, (state) => {
      _UpsampleDistance = state;
      updateParams();
    });
    updateParams();
    this.initialized = true;
  }
  Blit(source, destination, shader) {
    shader.SetTexture("_MainTex", source);
    GPU.RendererContext.BeginRenderPass("Blit", [{ target: destination, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, shader);
    GPU.RendererContext.EndRenderPass();
  }
  execute(resources, ...args) {
    if (this.initialized === false) {
      throw Error("Not initialized");
    }
    const lightingTexture = resources.getResource(GPU.PassParams.LightingPassOutput);
    this.shader.SetTexture("tex", lightingTexture);
    this.shader.SetTexture("_MainTex", lightingTexture);
    this.shader.SetArray("_MainTex_TexelSize", new Float32Array([1 / lightingTexture.width, 1 / lightingTexture.height, 0, 0]));
    this.shader.SetTexture("_BlendTarget", lightingTexture);
    const GetTemporaryTexture = (key, width2, height2, depth, format) => {
      let texture = this.temporaryTextures.get(key);
      if (texture === void 0) {
        texture = GPU.RenderTexture.Create(width2, height2, depth, format);
        this.temporaryTextures.set(key, texture);
      }
      return texture;
    };
    let width = this.renderTarget.width;
    let height = this.renderTarget.height;
    const minUniformBufferOffsetAlignment = 256;
    this.currentPassBuffer.dynamicOffset = 0 * 4 * minUniformBufferOffsetAlignment;
    let renderTarget = this.scratchTextures[0] = GetTemporaryTexture("prefilter - source", width, height, 1, "rgba16float");
    GPU.RendererContext.BeginRenderPass("Bloom - Prefilter", [{ target: renderTarget, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    let renderSource = renderTarget;
    let i = 1;
    for (i = 0; i < this.iterations; i++) {
      width /= 2;
      height /= 2;
      if (width < 2 || height < 2) {
        console.log("Cannot further downsample");
        break;
      }
      renderTarget = GetTemporaryTexture("downsample - " + i, width, height, 1, "rgba16float");
      this.scratchTextures[i] = renderTarget;
      this.shader.SetTexture("_MainTex", renderSource);
      this.currentPassBuffer.dynamicOffset = 1 * 4 * minUniformBufferOffsetAlignment;
      GPU.RendererContext.BeginRenderPass("Bloom - Downsample" + i, [{ target: renderTarget, clear: true }], void 0, true);
      GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
      GPU.RendererContext.EndRenderPass();
      renderSource = renderTarget;
    }
    for (i -= 2; i >= 0; i--) {
      renderTarget = this.scratchTextures[i];
      this.shader.SetTexture("_MainTex", renderSource);
      this.currentPassBuffer.dynamicOffset = 2 * 4 * minUniformBufferOffsetAlignment;
      GPU.RendererContext.BeginRenderPass("Bloom - Upsample" + i, [{ target: renderTarget, clear: true }], void 0, true);
      GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
      GPU.RendererContext.EndRenderPass();
      renderSource = renderTarget;
    }
    this.shader.SetTexture("_MainTex", renderSource);
    this.currentPassBuffer.dynamicOffset = 3 * 4 * minUniformBufferOffsetAlignment;
    GPU.RendererContext.BeginRenderPass("Bloom - Blend", [{ target: this.renderTarget, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.renderTarget }, { texture: lightingTexture });
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.scratchTextures[0] }, { texture: this.output });
  }
}

export { Bloom };
