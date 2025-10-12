import { Geometry, GPU } from "@trident/core";

export class Blit extends GPU.RenderPass {
    private shader: GPU.Shader;
    private geometry: Geometry;

    private renderTarget: GPU.RenderTexture;

    constructor() {
        super();
    }
    
    public async init(resources: GPU.ResourcePool) {
        this.shader = await GPU.Shader.Create({
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
            colorOutputs: [ { format: "rgba16float" }],
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

        this.shader.SetSampler("texSampler", GPU.TextureSampler.Create());

        this.geometry = Geometry.Plane();
        this.initialized = true;
    }

    public Process(inputTexture: GPU.Texture, outputWidth: number, outputHeight: number): GPU.RenderTexture {
        if (this.initialized === false) {
            throw Error("Not initialized")
        };

        if (!this.renderTarget || this.renderTarget.width !== outputWidth || this.renderTarget.height !== outputHeight) {
            this.renderTarget = GPU.RenderTexture.Create(outputWidth, outputHeight, 1, inputTexture.format);
        }

        this.shader.SetTexture("tex", inputTexture);

        GPU.RendererContext.BeginRenderPass(this.name, [{target: this.renderTarget, clear: true}], undefined, true);
        GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
        GPU.RendererContext.EndRenderPass();

        return this.renderTarget;
    }
}