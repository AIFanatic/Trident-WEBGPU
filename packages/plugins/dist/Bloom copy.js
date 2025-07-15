import { Geometry } from "../Geometry";
import { RenderPass } from "../renderer/RenderGraph";
import { Renderer } from "../renderer/Renderer";
import { RendererContext } from "../renderer/RendererContext";
import { PassParams } from "../renderer/RenderingPipeline";
import { Shader } from "../renderer/Shader";
import { RenderTexture } from "../renderer/Texture";
import { TextureSampler } from "../renderer/TextureSampler";
import { Blit } from "./Blit";
import { Debugger } from "./Debugger";
import { GuassianBlur } from "./GuassianBlur";
import { TextureBlender } from "./TextureBlender";
import { Upscaler } from "./Upscaler";
import { UIFolder, UISliderStat } from "./ui/UIStats";
export class Bloom extends RenderPass {
    shader;
    geometry;
    renderTarget;
    output;
    guassianBlurs;
    upscalers;
    upscaler;
    blender;
    blit;
    constructor() {
        super({});
        this.guassianBlurs = [];
        this.upscalers = [];
        this.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.output = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    }
    async init(resources) {
        for (let i = 0; i < 10; i++) {
            const gaussianBlur = new GuassianBlur();
            await gaussianBlur.init(resources);
            this.guassianBlurs.push(gaussianBlur);
            const upscaler = new Upscaler();
            await upscaler.init(resources);
            this.upscalers.push(upscaler);
        }
        this.blender = new TextureBlender();
        await this.blender.init(resources);
        this.blit = new Blit(Renderer.width, Renderer.height, Renderer.SwapChainFormat);
        await this.blit.init(resources);
        this.upscaler = new Upscaler();
        await this.upscaler.init(resources);
        this.shader = await Shader.Create({
            code: `
            @group(0) @binding(0) var tex: texture_2d<f32>;
            @group(0) @binding(2) var texSampler: sampler;

            @group(0) @binding(3) var<storage, read> threshold: f32;
            @group(0) @binding(4) var<storage, read> knee: f32;

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


            @group(1) @binding(0) var _MainTex: texture_2d<f32>;
            @group(1) @binding(1) var _MainTexSampler: sampler;
            @group(1) @binding(2) var<storage, read> _MainTex_TexelSize: vec2<f32>;

            @group(1) @binding(3) var _BlendTarget: texture_2d<f32>;
            @group(1) @binding(4) var _BlendTargetSampler: sampler;


            struct BloomParams {
                _Filter: vec4f,
                _DownsampleDistance: f32,
                _UpsampleDistance: f32,
                _Strength: f32
            };

            @group(1) @binding(5) var<storage, read> params: BloomParams;

            fn kawase_sample(tex: texture_2d<f32>, texSampler: sampler, uv: vec2f, offset: vec4f) -> vec3f {
                let c = textureSample(tex, texSampler, uv + offset.xy).rgb + 
                       textureSample(tex, texSampler, uv + offset.zy).rgb +
                      textureSample(tex, texSampler, uv + offset.xw).rgb + 
                      textureSample(tex, texSampler, uv + offset.zw).rgb;
                return c * 0.25;
              }
        
            fn prefilter(uv: vec2f) -> vec4f
            {
                let color: vec4f = textureSample(_MainTex, _MainTexSampler, uv);
                let k: f32 = dot(vec3f(0.299, 0.587, 0.114), color.rgb);
                var soft_k: f32 = k - params._Filter.y;
                soft_k = clamp(soft_k, 0, params._Filter.z);
                soft_k = soft_k * soft_k * params._Filter.w;
                var filter_k: f32 = max(soft_k, k - params._Filter.x);
                filter_k /= max(k, 0.00001);
                return color * filter_k;
            }
          
            fn downsample (uv: vec2f) -> vec4f
            {
                let dist: f32 = params._DownsampleDistance;
                let offset: vec4f = _MainTex_TexelSize.xyxy * vec2f(-dist, dist).xxyy;
                let sample: vec3f = kawase_sample(_MainTex, _MainTexSampler, uv, offset);
                return vec4f(sample, 1);
            }
          
            fn upsample (uv: vec2f, _UpsampleDistance: f32) -> vec4f
            {
                let dist: f32 = params._UpsampleDistance;
                let offset: vec4f = _MainTex_TexelSize.xyxy * vec2f(-dist, dist).xxyy;
                let sample: vec3f = kawase_sample(_MainTex, _MainTexSampler, uv, offset);
                return vec4f(sample, 1);
            }
          
            fn blendpass (uv: vec2f) -> vec4f
            {
                let dist: f32 = params._UpsampleDistance;
                let c: vec4f = textureSample(_BlendTarget, _BlendTargetSampler, uv);
                let offset: vec4f = _MainTex_TexelSize.xyxy * vec2f(-dist, dist).xxyy;
                let acc = params._Strength * kawase_sample(_MainTex, _MainTexSampler, uv, offset);
                return vec4f(c.rgb + acc.rgb, c.a);
            }

            const EPSILON: f32 = 1.0e-4;

            // Quadratic color thresholding
            // curve = (threshold - knee, knee * 2, 0.25 / knee)
            fn QuadraticThreshold(color: vec4<f32>, threshold: f32, curve: vec3<f32>) -> vec4<f32>
            {
                // Maximum pixel brightness
                let brightness = max(max(color.r, color.g), color.b);
                // Quadratic curve
                var rq: f32 = clamp(brightness - curve.x, 0.0, curve.y);
                rq = curve.z * (rq * rq);
                let ret_color = color * max(rq, brightness - threshold) / max(brightness, EPSILON);
                return ret_color;
            }

            fn Prefilter(_color: vec4<f32>, uv: vec2<f32>, param: vec4f) -> vec4<f32>
            {
                let clamp_value = 20.0;
                var color: vec4<f32> = min(vec4<f32>(clamp_value), _color);
                color = QuadraticThreshold(color, param.x, param.yzw);
                return color;
            }

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let color = textureSample(tex, texSampler, input.uv);

                // let threshold = 0.5;
                // let knee = 0.9;
                return Prefilter(color, input.uv, vec4f(threshold, threshold - knee, knee * 2.0, 0.25 / knee));

                // let threshold = 0.8;
                // let luminance: f32 = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
                // var bloomColor: vec3f = vec3f(0.0);
                // if (luminance > threshold) {
                //     bloomColor = color.rgb;
                // }

                // return vec4f(bloomColor, 1.0);

                // // return vec4f(1.0, 1.0, 0.0, 1.0);
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
                threshold: { group: 0, binding: 3, type: "storage" },
                knee: { group: 0, binding: 4, type: "storage" },
                _MainTex: { group: 1, binding: 0, type: "texture" },
                _MainTexSampler: { group: 1, binding: 1, type: "sampler" },
                _MainTex_TexelSize: { group: 1, binding: 2, type: "storage" },
                _BlendTarget: { group: 1, binding: 3, type: "texture" },
                _BlendTargetSampler: { group: 1, binding: 4, type: "sampler" },
                params: { group: 1, binding: 5, type: "storage" },
            },
        });
        this.shader.SetSampler("texSampler", TextureSampler.Create());
        this.shader.SetSampler("_MainTexSampler", TextureSampler.Create());
        this.shader.SetSampler("_BlendTargetSampler", TextureSampler.Create());
        // this.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.geometry = Geometry.Plane();
        const bloomFolder = new UIFolder(Debugger.ui, "Bloom");
        bloomFolder.Open();
        this.shader.SetValue("threshold", 0.5);
        this.shader.SetValue("knee", 0.9);
        new UISliderStat(bloomFolder, "Threshold:", 0, 1, 0.01, 0.5, state => { this.shader.SetValue("threshold", state); });
        new UISliderStat(bloomFolder, "Knee:", 0, 1, 0.01, 0.5, state => { this.shader.SetValue("knee", state); });
        new UISliderStat(bloomFolder, "Size:", 0, 32, 1, 12, state => {
            this.shader.SetValue("knee", state);
            for (const blur of this.guassianBlurs) {
                blur.filterSize = state;
            }
        });
        this.initialized = true;
    }
    Blit(source, destination, shader) {
        shader.SetTexture("_MainTex", source);
        RendererContext.BeginRenderPass("Blit", [{ target: destination, clear: true }], undefined, true);
        RendererContext.DrawGeometry(this.geometry, shader);
        RendererContext.EndRenderPass();
    }
    execute(resources, ...args) {
        if (this.initialized === false) {
            throw Error("Not initialized");
        }
        ;
        const lightingTexture = resources.getResource(PassParams.LightingPassOutput);
        this.shader.SetTexture("tex", lightingTexture);
        // @group(1) @binding(0) var _MainTex: texture_2d<f32>;
        // @group(1) @binding(1) var _MainTexSampler: sampler;
        // @group(1) @binding(2) var<storage, read> _MainTex_TexelSize: vec2<f32>;
        // @group(1) @binding(3) var _BlendTarget: texture_2d<f32>;
        // @group(1) @binding(4) var _BlendTargetSampler: sampler;
        // struct BloomParams {
        //     _Filter: vec4f,
        //     _DownsampleDistance: f32,
        //     _UpsampleDistance: f32,
        //     _Strength: f32
        // };
        // @group(1) @binding(5) var<storage, read> params: BloomParams;
        this.shader.SetTexture("_MainTex", lightingTexture);
        this.shader.SetArray("_MainTex_TexelSize", new Float32Array([1 / lightingTexture.width, 1 / lightingTexture.height, 0, 0]));
        this.shader.SetTexture("_MainTex", lightingTexture);
        RendererContext.BeginRenderPass("Bloom", [{ target: this.renderTarget, clear: true }], undefined, true);
        RendererContext.DrawGeometry(this.geometry, this.shader);
        RendererContext.EndRenderPass();
        const sizes = [
            { w: this.renderTarget.width * 1 / 2, h: this.renderTarget.height * 1 / 2 },
            { w: this.renderTarget.width * 1 / 4, h: this.renderTarget.height * 1 / 4 },
            { w: this.renderTarget.width * 1 / 8, h: this.renderTarget.height * 1 / 8 },
        ];
        // Down
        const downscale1 = this.upscalers[0].Process(this.renderTarget, sizes[0].w, sizes[0].h);
        const gaussianBlurTexture1 = this.guassianBlurs[0].Process(downscale1);
        const downscale2 = this.upscalers[1].Process(gaussianBlurTexture1, sizes[1].w, sizes[1].h);
        // const gaussianBlurTexture2 = this.guassianBlurs[1].Process(downscale2);
        const downscale3 = this.upscalers[2].Process(downscale2, sizes[2].w, sizes[2].h);
        // const gaussianBlurTexture3 = this.guassianBlurs[2].Process(downscale3);
        // Up
        const upscale3 = this.upscalers[3].Process(downscale3, sizes[1].w, sizes[1].h);
        // const gaussianBlurTexture4 = this.guassianBlurs[3].Process(upscale3);
        const upscale4 = this.upscalers[4].Process(upscale3, sizes[0].w, sizes[0].h);
        // const gaussianBlurTexture5 = this.guassianBlurs[4].Process(upscale4);
        const upscale5 = this.upscalers[5].Process(upscale4, this.renderTarget.width, this.renderTarget.height);
        // const gaussianBlurTexture6 = this.guassianBlurs[5].Process(upscale5);
        RendererContext.CopyTextureToTextureV3({ texture: upscale5 }, { texture: this.output });
        const blended = this.blender.Process(upscale5, lightingTexture);
        // this.blit.Process(downscale1);
        // RendererContext.CopyTextureToTextureV3({texture: downscale1}, {texture: lightingTexture});
        resources.setResource(PassParams.LightingPassOutput, blended);
    }
}
