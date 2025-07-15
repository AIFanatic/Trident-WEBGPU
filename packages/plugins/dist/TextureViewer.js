import { Geometry } from "../Geometry";
import { Renderer } from "../renderer/Renderer";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { TextureSampler } from "../renderer/TextureSampler";
export class TextureViewer {
    name = "TextureViewer";
    shader;
    quadGeometry;
    initialized = false;
    async init() {
        const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<f32>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            return vec4(textureSampleLevel(texture, textureSampler, uv, 0));
        }
        `;
        this.shader = await Shader.Create({
            code: code,
            colorOutputs: [{ format: Renderer.SwapChainFormat }],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: { group: 0, binding: 0, type: "sampler" },
                texture: { group: 0, binding: 1, type: "texture" },
            }
        });
        this.quadGeometry = Geometry.Plane();
        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);
        this.initialized = true;
    }
    async execute(texture) {
        if (!this.initialized)
            await this.init();
        this.shader.SetTexture("texture", texture);
        Renderer.BeginRenderFrame();
        RendererContext.BeginRenderPass("TextureViewer", [{ clear: false }], undefined, true);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
        Renderer.EndRenderFrame();
    }
}
