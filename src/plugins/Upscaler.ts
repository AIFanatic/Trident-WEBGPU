import { Geometry } from "../Geometry";
import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { RenderTexture, Texture } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";

export class Upscaler extends RenderPass {
    private shader: Shader;
    private geometry: Geometry;

    private renderTarget: RenderTexture;

    constructor() { super({}) }
    
    public async init(resources: ResourcePool) {
        this.shader = await Shader.Create({
            code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(2) var texSampler: sampler;

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
                { format: "rgba16float" },
            ],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                tex: { group: 0, binding: 0, type: "texture" },
                texSampler: { group: 0, binding: 2, type: "sampler" },
            },
        });

        this.shader.SetSampler("texSampler", TextureSampler.Create());

        this.geometry = Geometry.Plane();
        this.initialized = true;
    }

    public Process(tex: Texture, width: number, height: number): RenderTexture {
        if (this.initialized === false) {
            throw Error("Not initialized")
        };

        if (!this.renderTarget || this.renderTarget.width !== width || this.renderTarget.height !== height) {
            this.renderTarget = RenderTexture.Create(width, height, tex.depth, "rgba16float");
        }

        this.shader.SetTexture("tex", tex);

        RendererContext.BeginRenderPass("Upscaler", [{target: this.renderTarget, clear: true}], undefined, true);
        RendererContext.DrawGeometry(this.geometry, this.shader);
        RendererContext.EndRenderPass();

        return this.renderTarget;
    }
}