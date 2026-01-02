import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { TextureSampler } from "../TextureSampler";
import { PassParams } from "../RenderingPipeline";
import { Console, ConsoleVarConfigs } from "../../Console";
import { RenderTexture } from "../Texture";

const TextureViewerSettings = Console.define({
    r_tonemapper: { default: 0.0, help: "Tonemapper type (disabled"},
    r_exposure: { default: 0.0, help: "Exposure"},
    r_contrast: { default: 1.0, help: "Contrast"},
    r_saturation: { default: 1.0, help: "Saturation"},
} satisfies ConsoleVarConfigs);

export class PostExposureTonemap extends RenderPass {
    public name: string = "PostExposureTonemap";
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
            tonemapType: f32,
            exposure: f32,
            contrast: f32,
            saturation: f32

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
          
            // Derive UVs from NDC: ([-1,1] -> [0,1])
            let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
            out.vUv = vec2f(uv.x, 1.0 - uv.y);
            return out;
        }

        fn toneMapping(color: vec3f) -> vec3f {
            // Narkowicz 2015 ACES approx
            let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
            return clamp((color*(a*color+b)) / (color*(c*color+d)+e), vec3f(0.0), vec3f(1.0));
        }

        fn gammaCorrection(color: vec3f) -> vec3f {
            return pow(color, vec3f(1.0 / 2.2));
        }


        /*
        * ACES tonemapping fit for the sRGB color space
        * https://github.com/TheRealMJP/BakingLab/blob/master/BakingLab/ACES.hlsl
        */
        // sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
        const aces_input_mat = mat3x3<f32>(
            0.59719, 0.07600, 0.02840,
            0.35458, 0.90834, 0.13383,
            0.04823, 0.01566, 0.83777
        );

        // ODT_SAT => XYZ => D60_2_D65 => sRGB
        const aces_output_mat = mat3x3<f32>(
            1.60475, -0.10208, -0.00327,
            -0.53108,  1.10813, -0.07276,
            -0.07367, -0.00605,  1.07602
        );

        fn rrt_and_odt_fit(v: vec3f) -> vec3f {
            let a = v * (v + 0.0245786) - 0.000090537;
            let b = v * (0.983729 * v + 0.4329510) + 0.238081;
            return a / b;
        }
            
        fn aces_fitted(_color: vec3f) -> vec3f {
            var color = _color;
            color = aces_input_mat * color;
            color = rrt_and_odt_fit(color);
            color = aces_output_mat * color;
            return clamp(color, vec3f(0.0), vec3f(1.0));
        }

        //-----------------------------------------------------------------------------

        fn gamma_correct(linear_srgb: vec3f) -> vec3f {
            let a = 12.92 * linear_srgb;
            let b = 1.055 * pow(linear_srgb, vec3(1.0 / 2.4)) - 0.055;
            let c = step(vec3(0.0031308), linear_srgb);
            return mix(a, b, c);
        }

          fn luminance(c: vec3f) -> f32 { return dot(c, vec3f(0.2126, 0.7152, 0.0722)); }

        fn applyContrast(color: vec3f, contrast: f32) -> vec3f {
            return (color - vec3f(0.5)) * contrast + vec3f(0.5);
        }

        fn applySaturation(color: vec3f, sat: f32) -> vec3f {
            let l = luminance(color);
            return mix(vec3f(l), color, sat);
        }


        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let c = textureSampleLevel(texture, textureSampler, input.vUv, 0.0);
            let a = c.a;
            var col = c.rgb;
            
            col = col * exp2(params.exposure);

            // Tonemap
            col = toneMapping(col);

            col = applyContrast(col, params.contrast);
            col = applySaturation(col, params.saturation);
            col = clamp(col, vec3f(0.0), vec3f(1.0));

            return vec4f(col, 1.0);
        }
        `;

        this.shader = await Shader.Create({
            code: code,
            colorOutputs: [{format: "rgba16float"}],
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},
                texture: {group: 0, binding: 1, type: "texture"},
                exposure: {group: 0, binding: 2, type: "storage"},
            }
        });
        this.quadGeometry = new Geometry();

        const sampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", sampler);
        this.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");

        this.initialized = true;
    }

    public async execute(resources: ResourcePool) {
        if (this.initialized === false) return;

        const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
        if (!LightingPassOutputTexture) return;

        this.shader.SetTexture("texture", LightingPassOutputTexture);

        this.shader.SetArray("params", new Float32Array([
            TextureViewerSettings.r_tonemapper.value,
            TextureViewerSettings.r_exposure.value,
            TextureViewerSettings.r_contrast.value,
            TextureViewerSettings.r_saturation.value
        ]));

        RendererContext.BeginRenderPass(this.name, [{clear: false, target: this.renderTarget}], undefined, true);
        RendererContext.Draw(this.quadGeometry, this.shader, 3);
        RendererContext.EndRenderPass();

        RendererContext.CopyTextureToTexture(this.renderTarget, LightingPassOutputTexture);
    }
}