
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { PassParams } from "../RenderingPipeline";
import { RenderTexture } from "../Texture";
import { TonemapSettings } from "./TonemapPass";

export class ExposurePass extends RenderPass {
    public name: string = "ExposurePass";
    private shader: Shader;
    private quadGeometry: Geometry;

    private renderTarget: RenderTexture;

    public async init() {
        const code = `
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<f32>;

        struct Params {
            exposure: f32,
            padding0: f32,
            padding1: f32,
            padding2: f32,
        };
        @group(0) @binding(2) var<storage, read> params: Params;

        // Full-screen triangle (covers screen with 3 verts)
        const p = array<vec2f, 3>(
            vec2f(-1.0, -1.0),
            vec2f( 3.0, -1.0),
            vec2f(-1.0,  3.0)
        );

        @vertex fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
            var out : VertexOutput;
            out.position = vec4f(p[vertexIndex], 0.0, 1.0);
            let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
            out.vUv = vec2f(uv.x, 1.0 - uv.y);
            return out;
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let c = textureSampleLevel(texture, textureSampler, input.vUv, 0.0);
            return vec4f(c.rgb * exp2(params.exposure), c.a);
        }
        `;

        this.shader = await Shader.Create({
            code: code,
            colorOutputs: [{ format: "rgba16float" }]
        });
        this.quadGeometry = new Geometry();

        const sampler = new TextureSampler();
        this.shader.SetSampler("textureSampler", sampler);

        this.initialized = true;
    }

    public preFrame(resources: ResourcePool): void {
        if (this.initialized === false) return;

        this.shader.SetArray("params", new Float32Array([
            TonemapSettings.r_exposure.value,
            0, 0, 0
        ]));
    }

    public execute(resources: ResourcePool) {
        if (this.initialized === false) return;

        // Nothing to do at 0 stops - skip the blit entirely.
        if (TonemapSettings.r_exposure.value === 0) return;

        const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutputTexture) return;
        if (!this.renderTarget || this.renderTarget.width !== LightingPassOutputTexture.width || this.renderTarget.height !== LightingPassOutputTexture.height) {
            if (this.renderTarget) this.renderTarget.Destroy();
            this.renderTarget = RenderTexture.Create(LightingPassOutputTexture.width, LightingPassOutputTexture.height, LightingPassOutputTexture.depth, LightingPassOutputTexture.format);
        }

        this.shader.SetTexture("texture", LightingPassOutputTexture);

        RendererContext.BeginRenderPass(this.name, [{ clear: false, target: this.renderTarget }], undefined, true);
        RendererContext.Draw(this.quadGeometry, this.shader, 3);
        RendererContext.EndRenderPass();

        RendererContext.CopyTextureToTexture(this.renderTarget, LightingPassOutputTexture);
    }
}
