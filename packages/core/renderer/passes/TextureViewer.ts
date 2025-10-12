import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { PassParams } from "../RenderingPipeline";

export class TextureViewer extends RenderPass {
    public name: string = "TextureViewer";
    private shader: Shader;
    private quadGeometry: Geometry;

    public async init() {
        const code = `
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<f32>;

        // Full-screen triangle (covers screen with 3 verts)
        const p = array<vec2f, 3>(
            vec2f(-1.0, -1.0),
            vec2f( 3.0, -1.0),
            vec2f(-1.0,  3.0)
        );

        @vertex fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
            var out : VertexOutput;
            out.position = vec4f(p[vertexIndex], 0.0, 1.0);
          
            // Derive UVs from NDC: ([-1,1] -> [0,1])
            let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
            out.vUv = vec2f(uv.x, 1.0 - uv.y); // flip Y if your texture space needs it
            return out;
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            return textureSampleLevel(texture, textureSampler, input.vUv, 0);
        }
        `;

        this.shader = await Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                texture: {group: 0, binding: 1, type: "texture"},
            }
        });
        this.quadGeometry = new Geometry();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);

        this.initialized = true;
    }

    public async execute(resources: ResourcePool) {
        if (this.initialized === false) return;

        const settings = resources.getResource(PassParams.DebugSettings);
        const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutputTexture) return;

        this.shader.SetTexture("texture", LightingPassOutputTexture);

        RendererContext.BeginRenderPass("TextureViewer", [{clear: false}], undefined, true);
        RendererContext.Draw(this.quadGeometry, this.shader, 3);
        RendererContext.EndRenderPass();
    }
}