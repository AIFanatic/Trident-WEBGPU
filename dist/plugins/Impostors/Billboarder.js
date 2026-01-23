import { GPU, Mathf } from '@trident/core';

class Billboarder {
  static material;
  static async init() {
    if (this.material) return;
    this.material = new GPU.Material({ isDeferred: false });
    this.material.shader = await GPU.Shader.Create({
      code: `
            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
    
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vUv : vec2<f32>,
                @location(1) vNormal : vec3<f32>,
            };
    
            @group(0) @binding(4) var texture: texture_2d<f32>;
            @group(0) @binding(5) var textureSampler: sampler;

            @group(0) @binding(6) var<storage, read> modelMatrix: mat4x4<f32>;
    
            @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = modelMatrix * vec4(input.position, 1.0);
                output.vUv = input.uv;
                output.vNormal = input.normal;
                return output;
            }
            
            @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                let color = textureSample(texture, textureSampler, input.vUv);
                return color;
            }
            `,
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.material.shader.SetSampler("textureSampler", GPU.TextureSampler.Create());
  }
  static async Create(geometry, modelMatrix, outputTexture, sampleTexture) {
    await this.init();
    this.material.shader.SetTexture("texture", sampleTexture);
    this.material.shader.SetMatrix4("modelMatrix", modelMatrix);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass("Impostor creator", [{ target: outputTexture, clear: false }]);
    GPU.RendererContext.DrawGeometry(geometry, this.material.shader);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
  }
  static OctahedralCoordToVector(f) {
    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
    var n = new Mathf.Vector3(f.x, 1 - Math.abs(f.x) - Math.abs(f.y), f.y);
    var t = clamp(-n.y, 0, 1);
    n.x += n.x >= 0 ? -t : t;
    n.z += n.z >= 0 ? -t : t;
    return n;
  }
}

export { Billboarder };
