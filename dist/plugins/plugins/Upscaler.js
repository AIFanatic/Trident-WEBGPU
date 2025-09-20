import { GPU, Geometry } from '@trident/core';

class Upscaler extends GPU.RenderPass {
  shader;
  geometry;
  renderTarget;
  constructor() {
    super({});
  }
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(1) var texSampler: sampler;

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

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let a = textureSample(tex, texSampler, input.uv);
                return a;
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
        texSampler: { group: 0, binding: 1, type: "sampler" }
      }
    });
    this.shader.SetSampler("texSampler", GPU.TextureSampler.Create());
    this.geometry = Geometry.Plane();
    this.initialized = true;
  }
  Process(tex, width, height) {
    if (this.initialized === false) {
      throw Error("Not initialized");
    }
    if (!this.renderTarget || this.renderTarget.width !== width) {
      console.log("HERE");
      this.renderTarget = GPU.RenderTexture.Create(width, height, tex.depth, "rgba16float");
    }
    this.shader.SetTexture("tex", tex);
    GPU.RendererContext.BeginRenderPass("Upscaler", [{ target: this.renderTarget, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    return this.renderTarget;
  }
}

export { Upscaler };
