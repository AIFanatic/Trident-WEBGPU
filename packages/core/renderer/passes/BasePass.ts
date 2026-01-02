import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { PassParams } from "../RenderingPipeline";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { RendererContext } from "../RendererContext";


export class BasePass extends RenderPass {
    public name: string = "BasePass";
    private shader: Shader;
    private quadGeometry: Geometry;

    public initialized = false;

    public async init() {
        this.shader = await Shader.Create({
            code: `
                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                    @location(0) uv: vec2<f32>,
                };

                @group(0) @binding(0) var textureSampler: sampler;
                @group(0) @binding(4) var ermoTexture: texture_2d<f32>;

                // Full-screen triangle (covers screen with 3 verts)
                const p = array<vec2f, 3>(
                    vec2f(-1.0, -1.0),
                    vec2f( 3.0, -1.0),
                    vec2f(-1.0,  3.0)
                );

                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(p[vertexIndex], 0.0, 1.0);
                    output.uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
                    output.uv.y = 1.0 - output.uv.y;
                    return output;
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let ermo = textureSample(ermoTexture, textureSampler, input.uv);
                    return vec4f(ermo.rgb, 1.0);
                }
            `,
            uniforms: {
                textureSampler: { group: 0, binding: 0, type: "sampler" },
                ermoTexture: { group: 0, binding: 4, type: "texture" },
            },
            colorOutputs: [{format: "rgba16float"}],
        });

        this.shader.SetSampler("textureSampler", TextureSampler.Create());

        this.quadGeometry = new Geometry();

        this.initialized = true;
    }

    public async preFrame(resources: ResourcePool) {
        if (!this.initialized) return;
        this.drawCommands.length = 0;

        const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
        if (!inputGBufferERMO) return;

        this.shader.SetTexture("ermoTexture", inputGBufferERMO);
        this.drawCommands.push({geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0});
    }

    public async execute(resources: ResourcePool) {
        if (!this.initialized) return;
        if (this.drawCommands.length === 0) return;

        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutput) return;

        RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], undefined, true);

        for (const draw of this.drawCommands) {
            RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
        }

        RendererContext.EndRenderPass();

        resources.setResource(PassParams.LightingPassOutput, LightingPassOutput);
    }
}