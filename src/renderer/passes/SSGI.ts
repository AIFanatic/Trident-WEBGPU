import { RenderPass, ResourcePool } from "../RenderGraph";
import { Debugger } from "../../plugins/Debugger";
import { Shader, ShaderCode } from "../Shader";
import { Geometry, VertexAttribute } from "../../Geometry";
import { RendererContext } from "../RendererContext";
import { TextureSampler } from "../TextureSampler";
import { DepthTexture, RenderTexture, Texture, TextureType } from "../Texture";
import { Renderer } from "../Renderer";
import { Camera } from "../../components/Camera";
import { Matrix4 } from "../../math/Matrix4";
import { WEBGPUTexture } from "../webgpu/WEBGPUTexture";

class DownSampler {
    private shader: Shader;
    private quadGeometry: Geometry;
    private outputTexture: RenderTexture;
    
    constructor(outputWidth: number, outputHeight: number) {
        this.shader = Shader.Create({
            code: ShaderCode.DownSample,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                texture: {group: 0, binding: 0, type: "texture"},
                textureSampler: {group: 0, binding: 1, type: "sampler"},
                multiplier: {group: 0, binding: 2, type: "storage"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        const lightingSampler = TextureSampler.Create({magFilter: "linear", minFilter: "linear"});
        this.shader.SetSampler("textureSampler", lightingSampler);
        this.quadGeometry = Geometry.Plane();

        this.outputTexture = RenderTexture.Create(Math.ceil(outputWidth), Math.ceil(outputHeight));
    }

    public run(inputTexture: RenderTexture, debug: boolean = false): RenderTexture {
        this.shader.SetTexture("texture", inputTexture);
        Debugger.AddFrameRenderPass("SSGI Downsample 1");
        RendererContext.BeginRenderPass("DownsamplePass", [{target: debug ? undefined : this.outputTexture, clear: true}]);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();

        return this.outputTexture;
    }
}

class UpSampler {
    private shader: Shader;
    private quadGeometry: Geometry;
    private outputTexture: RenderTexture;
    
    constructor(outputWidth: number, outputHeight: number) {
        this.shader = Shader.Create({
            code: ShaderCode.UpSample,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                texture: {group: 0, binding: 0, type: "texture"},
                textureSampler: {group: 0, binding: 1, type: "sampler"},
                multiplier: {group: 0, binding: 2, type: "storage"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        const lightingSampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", lightingSampler);
        this.quadGeometry = Geometry.Plane();

        this.outputTexture = RenderTexture.Create(Math.ceil(outputWidth), Math.ceil(outputHeight));
    }

    public run(inputTexture: RenderTexture, debug: boolean = false): RenderTexture {
        this.shader.SetTexture("texture", inputTexture);
        Debugger.AddFrameRenderPass("SSGI Upsample 1");
        RendererContext.BeginRenderPass("UpsamplePass", [{target: debug ? undefined : this.outputTexture, clear: true}]);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();

        return this.outputTexture;
    }
}

class Blur {
    private shader: Shader;
    private quadGeometry: Geometry;
    private outputTexture: RenderTexture;
    
    constructor() {
        this.shader = Shader.Create({
            code: ShaderCode.Blur,
            attributes: {
                position: { location: 0, size: 2, type: "vec2" },
            },
            uniforms: {
                textureSampler: {group: 0, binding: 0, type: "sampler"},

                view: {group: 0, binding: 1, type: "storage"},
                blurWeights: {group: 0, binding: 2, type: "storage"},
                
                gInvRenderTargetSize: {group: 0, binding: 3, type: "storage"},

                gNormalMap: {group: 0, binding: 4, type: "texture"},
                gDepthMap: {group: 0, binding: 5, type: "depthTexture"},
                gInputMap: {group: 0, binding: 6, type: "texture"},

                blurHorizontal: {group: 0, binding: 7, type: "storage"},
                blurRadius: {group: 0, binding: 8, type: "storage"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        const lightingSampler = TextureSampler.Create();
        this.shader.SetSampler("textureSampler", lightingSampler);
        this.quadGeometry = new Geometry();
        this.quadGeometry.attributes.set("position", new VertexAttribute(new Float32Array(6 * 3)));
        console.log(this.quadGeometry)

        console.log(this.quadGeometry)
    }

    private CalcGaussWeights(sigma): Float32Array {
        const twoSigma2 = 2.0 * sigma * sigma;

        // Estimate the blur radius based on sigma since sigma controls the "width" of the bell curve.
        // For example, for sigma = 3, the width of the bell curve is
        const blurRadius = Math.ceil(2.0 * sigma);

        const MaxBlurRadius = 5;
        if (blurRadius > MaxBlurRadius) throw Error("if (blurRadius > MaxBlurRadius)");

        let weightSum = 0.0;
        let weights = new Float32Array(12);

        for (let i = -blurRadius; i <= blurRadius; i++) {
            const x = i;
            weights[i + blurRadius] = Math.exp(-x * x / twoSigma2);

            weightSum += weights[i + blurRadius];
        }

        // Divide by the sum so all the weights add up to 1.0.
        for (let i = 0; i < weights.length; i++) {
            weights[i] /= weightSum;
        }
        
        return weights;
    }

    public run(blurHorizontal: boolean, blurRadius: number, gInputMap: RenderTexture, gNormalMap: RenderTexture, gDepthMap: DepthTexture, debug: boolean = false): RenderTexture {
        if (!this.outputTexture) {
            this.outputTexture = RenderTexture.Create(Math.ceil(gInputMap.width), Math.ceil(gInputMap.height));
        }

        // console.log(this.CalcGaussWeights(2.5));
        // this.shader.SetArray("view", new Float32Array([1]));
        this.shader.SetArray("blurWeights", this.CalcGaussWeights(2.5));
        
        const SsaoMapWidth = this.outputTexture.width / 2;
        const SsaoMapHeight = this.outputTexture.height / 2;

        // const InvRenderTargetSize = 1.0 / new Vector2(_ssao.SsaoMapWidth, _ssao.SsaoMapHeight);
        const InvRenderTargetSize = new Float32Array([1 / SsaoMapWidth, 1 / SsaoMapHeight]);
        this.shader.SetArray("gInvRenderTargetSize", InvRenderTargetSize);
        
        this.shader.SetTexture("gNormalMap", gNormalMap);
        this.shader.SetTexture("gDepthMap", gDepthMap);
        this.shader.SetTexture("gInputMap", gInputMap);

        this.shader.SetValue("blurHorizontal", blurHorizontal === true ? 1 : 0);
        this.shader.SetValue("blurRadius", blurRadius);

        const camera = Camera.mainCamera;
        const view = new Float32Array(16);
        // console.log(view)
        const tempMatrix = new Matrix4();
        tempMatrix.copy(camera.projectionMatrix); view.set(tempMatrix.elements, 0);
        // view.set([Renderer.width, Renderer.height, 0, 0], 0);
        // view.set(camera.transform.position.elements, 4);
        // tempMatrix.invert(); view.set(tempMatrix.elements, 24);
        // tempMatrix.copy(camera.viewMatrix); view.set(tempMatrix.elements, 40);
        // tempMatrix.invert(); view.set(tempMatrix.elements, 56);

        this.shader.SetArray("view", view);


        Debugger.AddFrameRenderPass("Blur");
        RendererContext.BeginRenderPass("BlurPass", [{target: debug ? undefined : this.outputTexture, clear: true}]);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();

        return this.outputTexture;
    }
}

export class SSGI extends RenderPass {
    public name: string = "SSGI";

    private shader: Shader;
    private quadGeometry: Geometry;
    private outputRt: RenderTexture;

    private ssgiOutput: RenderTexture;

    private blendShader: Shader;   
    
    
    private downsampler1: DownSampler;
    private downsampler2: DownSampler;

    private upsampler1: UpSampler;
    private upsampler2: UpSampler;

    private blur1: Blur;
    private blur2: Blur;
    private blur3: Blur;
    private blur4: Blur;

    private lastFrame: RenderTexture;

    constructor(inputGBufferDepth: string, inputGBufferNormal: string, inputDeferredLighting: string, inputAlbedoTexture: string) {
        super({inputs: [inputGBufferDepth, inputGBufferNormal, inputDeferredLighting, inputAlbedoTexture]});

        this.shader = Shader.Create({
            code: ShaderCode.SSGI,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                lightingTexture: {group: 0, binding: 0, type: "texture"},
                albedoTexture: {group: 0, binding: 1, type: "texture"},
                normalTexture: {group: 0, binding: 2, type: "texture"},
                depthTexture: {group: 0, binding: 3, type: "depthTexture"},
                lightingSampler: {group: 0, binding: 4, type: "sampler"},
                lastFrameTexture: {group: 0, binding: 5, type: "texture"},
                view: {group: 0, binding: 6, type: "storage"},
                hasLastFrame: {group: 0, binding: 7, type: "storage"},
                frame: {group: 0, binding: 8, type: "storage"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        const blendShaderCode = `
            struct VertexInput {
                @location(0) position : vec2<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vUv : vec2<f32>,
            };
            
            @group(0) @binding(0) var blurredTexture: texture_2d<f32>;
            @group(0) @binding(1) var albedoTexture: texture_2d<f32>;
            @group(0) @binding(2) var lightingTexture: texture_2d<f32>;
            @group(0) @binding(4) var textureSampler: sampler;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 0.0, 1.0);
                output.vUv = input.uv;
                return output;
            }
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let uv = input.vUv;
                
                let indirect = textureSample(blurredTexture, textureSampler, uv);
                let albedo = textureSample(albedoTexture, textureSampler, uv);
                let lighting = textureSample(lightingTexture, textureSampler, uv);
                // return vec4((indirect.rgb + albedo.rgb * 0.5) + lighting.rgb, 1.0);
                // return vec4(lighting.rgb, 1.0);
                return vec4(lighting.rgb + indirect.rgb * albedo.rgb, 1.0);

                // return vec4(lighting.rgb, 1.0);
            }
        `
        this.blendShader = Shader.Create({
            code: blendShaderCode,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                blurredTexture: {group: 0, binding: 0, type: "texture"},
                albedoTexture: {group: 0, binding: 1, type: "texture"},
                lightingTexture: {group: 0, binding: 2, type: "texture"},
                textureSampler: {group: 0, binding: 4, type: "sampler"},
            },
            colorOutputs: [{format: Renderer.SwapChainFormat}]
        });

        this.quadGeometry = Geometry.Plane();

        const lightingSampler = TextureSampler.Create();
        this.shader.SetSampler("lightingSampler", lightingSampler);

        this.blendShader.SetSampler("textureSampler", lightingSampler);

        this.downsampler1 = new DownSampler(Renderer.width * 0.5, Renderer.height * 0.5);
        this.downsampler2 = new DownSampler(Renderer.width * 0.25, Renderer.height * 0.25);

        this.upsampler1 = new UpSampler(Renderer.width * 0.5, Renderer.height * 0.5);
        this.upsampler2 = new UpSampler(Renderer.width, Renderer.height);

        this.blur1 = new Blur();
        this.blur2 = new Blur();

        this.blur3 = new Blur();
        this.blur4 = new Blur();
    }

    private frame = 0;
    public execute(resources: ResourcePool, inputGBufferDepth: DepthTexture, inputGBufferNormal: RenderTexture, outputLightingPass: RenderTexture, inputAlbedoTexture: RenderTexture) {
        let firstFrame = this.lastFrame ? 1.0 : 0.0;
        if (!this.lastFrame) {
            this.lastFrame = RenderTexture.Create(Renderer.width, Renderer.height, 1);
        }

        Debugger.AddFrameRenderPass("SSGI");

        this.shader.SetTexture("lightingTexture", outputLightingPass);
        this.shader.SetTexture("albedoTexture", inputAlbedoTexture);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);
        this.shader.SetTexture("lastFrameTexture", this.lastFrame);
        this.shader.SetValue("hasLastFrame", firstFrame);
        this.shader.SetValue("frame", this.frame);

        const camera = Camera.mainCamera;
        const view = new Float32Array(4 + 4 + 16 + 16 + 16 + 16);
        view.set([Renderer.width, Renderer.height, 0, 0], 0);
        view.set(camera.transform.position.elements, 4);
        // console.log(view)
        const tempMatrix = new Matrix4();
        tempMatrix.copy(camera.projectionMatrix); view.set(tempMatrix.elements, 8);
        tempMatrix.invert(); view.set(tempMatrix.elements, 24);
        tempMatrix.copy(camera.viewMatrix); view.set(tempMatrix.elements, 40);
        tempMatrix.invert(); view.set(tempMatrix.elements, 56);

        this.shader.SetArray("view", view);

        if (!this.ssgiOutput) {
            this.ssgiOutput = RenderTexture.Create(inputAlbedoTexture.width, inputAlbedoTexture.height);
        }

        RendererContext.BeginRenderPass("SSGIPass", [{target: this.ssgiOutput, clear: true}]);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        RendererContext.EndRenderPass();

        if (!this.outputRt) {
            this.outputRt = RenderTexture.Create(inputAlbedoTexture.width, inputAlbedoTexture.height);
        }
        
        const output1 = this.downsampler1.run(this.ssgiOutput);
        const output2 = this.downsampler2.run(output1);
        
        const output3 = this.upsampler1.run(output2);
        const output2BlurH = this.blur1.run(true, 3, output3, inputGBufferNormal, inputGBufferDepth);
        const output2BlurV = this.blur2.run(false, 3, output2BlurH, inputGBufferNormal, inputGBufferDepth);

        const output4 = this.upsampler2.run(output2BlurV);
        const output4BlurH = this.blur3.run(true, 3, output4, inputGBufferNormal, inputGBufferDepth);
        const output4BlurV = this.blur4.run(false, 3, output4BlurH, inputGBufferNormal, inputGBufferDepth);

        // if (this.lastFrame) {
        //     output4BlurV = this.lastFrame
        // }

        // Blend
        this.blendShader.SetTexture("blurredTexture", output4BlurV);
        this.blendShader.SetTexture("albedoTexture", inputAlbedoTexture);
        this.blendShader.SetTexture("lightingTexture", outputLightingPass);

        Debugger.AddFrameRenderPass("SSGI Blend");
        RendererContext.BeginRenderPass("BlendPass", [{clear: true}]);
        RendererContext.DrawGeometry(this.quadGeometry, this.blendShader);
        RendererContext.EndRenderPass();
        
        RendererContext.CopyTextureToTexture(this.ssgiOutput, this.lastFrame);
        this.frame++;

    }
}