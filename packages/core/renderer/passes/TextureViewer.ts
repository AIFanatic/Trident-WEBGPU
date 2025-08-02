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

    constructor() {
        super({inputs: [
            PassParams.LightingPassOutput,
            PassParams.depthTexturePyramid
        ]});
    }

    public async init() {
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
        
        fn Tonemap_ACES(x: vec3f) -> vec3f {
            // Narkowicz 2015, "ACES Filmic Tone Mapping Curve"
            let a = 2.51;
            let b = 0.03;
            let c = 2.43;
            let d = 0.59;
            let e = 0.14;
            return (x * (a * x + b)) / (x * (c * x + d) + e);
        }
        
        fn OECF_sRGBFast(linear: vec3f) -> vec3f {
            return pow(linear, vec3(0.454545));
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            var color = textureSampleLevel(texture, textureSampler, uv, 0).rgb;
            // TODO: This is a post processing filter, it shouldn't be here
            color = Tonemap_ACES(color);
            color = OECF_sRGBFast(color);

            return vec4f(color, 1.0);
        }
        `;

        this.shader = await Shader.Create({
            code: code,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                texture: {group: 0, binding: 1, type: "texture"},
            }
        });
        this.quadGeometry = Geometry.Plane();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);

        this.initialized = true;
    }

    public execute(resources: ResourcePool) {
        if (this.initialized === false) return;

        const settings = resources.getResource(PassParams.DebugSettings);
        const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutputTexture) return;

        this.shader.SetTexture("texture", LightingPassOutputTexture);

        RendererContext.BeginRenderPass("TextureViewer", [{clear: false}], undefined, true);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();
    }
}