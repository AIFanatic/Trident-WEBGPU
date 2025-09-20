import { GPU, Geometry } from '@trident/core';

class BilateralFilter extends GPU.RenderPass {
  shader;
  geometry;
  inputTexture;
  renderTarget;
  blurDir;
  blurDirHorizontal;
  blurDirVertical;
  _filterSize = 12;
  _blurDepthThreshold = 0.05;
  _blurNormalThreshold = 0.25;
  get filterSize() {
    return this._filterSize;
  }
  get blurDepthThreshold() {
    return this._blurDepthThreshold;
  }
  get blurNormalThreshold() {
    return this._blurNormalThreshold;
  }
  set filterSize(value) {
    this.shader.SetValue("filterSize", value);
  }
  set blurDepthThreshold(value) {
    this.shader.SetValue("blurDepthThreshold", value);
  }
  set blurNormalThreshold(value) {
    this.shader.SetValue("blurNormalThreshold", value);
  }
  constructor() {
    super({});
  }
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(1) var texSampler: sampler;

            @group(0) @binding(2) var depthTex: texture_depth_2d;
            @group(0) @binding(3) var depthSampler: sampler_comparison;

            @group(0) @binding(4) var normalTex: texture_2d<f32>;
            @group(0) @binding(5) var normalSampler: sampler;

            @group(0) @binding(6) var<storage, read> blurDir: vec4<f32>;

            @group(0) @binding(7) var<storage, read> filterSize: f32;
            @group(0) @binding(8) var<storage, read> blurDepthThreshold: f32;
            @group(0) @binding(9) var<storage, read> blurNormalThreshold: f32;

            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
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

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                var color: vec3f = textureSampleLevel(tex, texSampler, input.uv, 0.).rgb;
                var depth: f32 = textureSampleCompare(depthTex, depthSampler, input.uv, 0);
            
                if (depth >= 1e6 || depth <= 0.) {
                    return vec4f(color, 1.);
                }
            
                var normal: vec3f = textureSampleLevel(normalTex, normalSampler, input.uv, 0.).rgb;
            
                let filterSizeI32: i32 = i32(filterSize);
                var sigma: f32 =  f32(filterSize);
                var two_sigma2: f32 = 2.0 * sigma * sigma;
            
                var sigmaDepth: f32 = blurDepthThreshold;
                var two_sigmaDepth2: f32 = 2.0 * sigmaDepth * sigmaDepth;
            
                var sigmaNormal: f32 = blurNormalThreshold;
                var two_sigmaNormal2: f32 = 2.0 * sigmaNormal * sigmaNormal;
            
                var sum: vec3f =  vec3f(0.);
                var wsum: f32 = 0.;

                // let sigma_space = 2.0;
            
                for (var x: i32 = -filterSizeI32; x <= filterSizeI32; x++) {
                    var coords = vec2f(f32(x));
                    var sampleColor: vec3f = textureSampleLevel(tex, texSampler, input.uv + coords * blurDir.xy, 0.).rgb;
                    var sampleDepth: f32 = textureSampleCompareLevel(depthTex, depthSampler, input.uv + f32(x) * blurDir.xy, 0);
                    // // Ground depth:
                    // let ref_value = input.position.z / input.position.w;
                    // let depth_raw: f32 = textureSampleCompare(DEPTH_TEXTURE, depth_texture_sampler, input.SCREEN_UV, ref_value);
                    var sampleNormal: vec3f = textureSampleLevel(normalTex, normalSampler, input.uv + coords * blurDir.xy, 0.).rgb;
            
                    var r: f32 = dot(coords, coords);
                    var w: f32 = exp(-r / two_sigma2);
            
                    var depthDelta: f32 = abs(sampleDepth - depth);
                    var wd: f32 = step(depthDelta, blurDepthThreshold);
            
                    var normalDelta: vec3f = abs(sampleNormal - normal);
                    var wn: f32 = step(normalDelta.x + normalDelta.y + normalDelta.z, blurNormalThreshold);
            
                    sum += sampleColor * w * wd * wn;
                    wsum += w * wd * wn;
                }
                
                return vec4f(sum / wsum, 1.);
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
        texSampler: { group: 0, binding: 1, type: "sampler" },
        depthTex: { group: 0, binding: 2, type: "depthTexture" },
        depthSampler: { group: 0, binding: 3, type: "sampler-compare" },
        normalTex: { group: 0, binding: 4, type: "texture" },
        normalSampler: { group: 0, binding: 5, type: "sampler" },
        blurDir: { group: 0, binding: 6, type: "storage" },
        filterSize: { group: 0, binding: 7, type: "storage" },
        blurDepthThreshold: { group: 0, binding: 8, type: "storage" },
        blurNormalThreshold: { group: 0, binding: 9, type: "storage" }
      }
    });
    this.shader.SetSampler("texSampler", GPU.TextureSampler.Create());
    this.shader.SetSampler("depthSampler", GPU.TextureSampler.Create({ minFilter: "nearest", magFilter: "nearest", mipmapFilter: "nearest", compare: "less" }));
    this.shader.SetSampler("normalSampler", GPU.TextureSampler.Create());
    this.blurDir = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    this.blurDirHorizontal = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    this.blurDirVertical = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    this.shader.SetBuffer("blurDir", this.blurDir);
    this.shader.SetValue("filterSize", this.filterSize);
    this.shader.SetValue("blurDepthThreshold", this.blurDepthThreshold);
    this.shader.SetValue("blurNormalThreshold", this.blurNormalThreshold);
    this.geometry = Geometry.Plane();
    this.initialized = true;
  }
  Process(texture, depthTex, normalTex) {
    if (this.initialized === false) {
      throw Error("Not initialized");
    }
    if (!this.renderTarget || this.renderTarget.width !== texture.width || this.renderTarget.height !== texture.height || this.renderTarget.depth !== texture.depth) {
      this.inputTexture = GPU.Texture.Create(texture.width, texture.height, texture.depth, "rgba16float");
      this.renderTarget = GPU.RenderTexture.Create(texture.width, texture.height, texture.depth, "rgba16float");
      this.shader.SetTexture("tex", this.inputTexture);
      console.log(texture.width);
      this.blurDirHorizontal.SetArray(new Float32Array([1 / texture.width, 0, 0, 0]));
      this.blurDirVertical.SetArray(new Float32Array([0, 1 / texture.height, 0, 0]));
    }
    this.shader.SetTexture("depthTex", depthTex);
    this.shader.SetTexture("normalTex", normalTex);
    GPU.RendererContext.CopyTextureToTextureV3({ texture }, { texture: this.inputTexture });
    GPU.RendererContext.CopyBufferToBuffer(this.blurDirHorizontal, this.blurDir);
    GPU.RendererContext.BeginRenderPass("BilateralFilter - H", [{ target: this.renderTarget, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.renderTarget }, { texture: this.inputTexture });
    GPU.RendererContext.CopyBufferToBuffer(this.blurDirVertical, this.blurDir);
    GPU.RendererContext.BeginRenderPass("BilateralFilter - V", [{ target: this.renderTarget, clear: false }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    return this.renderTarget;
  }
}

export { BilateralFilter };
