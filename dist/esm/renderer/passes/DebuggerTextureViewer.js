import { RendererContext } from "../RendererContext";
import { RenderPass } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { PassParams } from "../RenderingPipeline";
export class DebuggerTextureViewer extends RenderPass {
    name = "DebuggerTextureViewer";
    shader;
    quadGeometry;
    constructor() {
        super({ inputs: [
                PassParams.ShadowPassDepth,
            ] });
    }
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
        // @group(0) @binding(1) var texture: texture_2d<f32>;
        @group(0) @binding(1) var texture: texture_depth_2d_array;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;
                //    textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);
            var d = textureSampleLevel(texture, textureSampler, uv, 0, 0);
            return vec4(vec3(d), 1.0);
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
                texture: { group: 0, binding: 1, type: "depthTexture" },
            }
        });
        this.quadGeometry = Geometry.Plane();
        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);
        this.initialized = true;
    }
    execute(resources) {
        if (this.initialized === false)
            return;
        const LightingPassOutputTexture = resources.getResource(PassParams.ShadowPassDepth);
        if (!LightingPassOutputTexture)
            return;
        this.shader.SetTexture("texture", LightingPassOutputTexture);
        RendererContext.BeginRenderPass("DebuggerTextureViewer", [{ clear: false }], undefined, true);
        RendererContext.SetViewport(Renderer.width - 100, 0, 100, 100);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.SetViewport(0, 0, Renderer.width, Renderer.height);
        RendererContext.EndRenderPass();
    }
}
//# sourceMappingURL=DebuggerTextureViewer.js.map