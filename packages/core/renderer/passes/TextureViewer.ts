import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { PassParams } from "../RenderingPipeline";
import { Console, ConsoleVarConfigs } from "../../Console";
import { Texture } from "../Texture";

const TextureViewerSettings = Console.define({r_exposure: { default: 0.0, help: "Final image exposure"}} satisfies ConsoleVarConfigs);

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

        @group(0) @binding(2) var<storage, read> exposure: f32;

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
            out.vUv = vec2f(uv.x, 1.0 - uv.y);
            return out;
        }

        fn gammaCorrection(color: vec3f) -> vec3f {
            return pow(color, vec3f(1.0 / 2.2));
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let c = textureSampleLevel(texture, textureSampler, input.vUv, 0.0);
            let a = c.a;
            var col = c.rgb;
            col = clamp(gammaCorrection(col), vec3f(0.0), vec3f(1.0));

            return vec4f(col, 1.0);
        }
        `;

        this.shader = await Shader.Create({
            name: "TextureViewer",
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
        });
        this.quadGeometry = new Geometry();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);

        this.initialized = true;
    }

    public async execute(resources: ResourcePool) {
        if (this.initialized === false) return;

        const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutputTexture) return;

        this.shader.SetTexture("texture", LightingPassOutputTexture);
        this.shader.SetValue("exposure", TextureViewerSettings.r_exposure.value);

        RendererContext.BeginRenderPass("TextureViewer", [{clear: false}], undefined, true);
        RendererContext.Draw(this.quadGeometry, this.shader, 3);
        RendererContext.EndRenderPass();
    }
}