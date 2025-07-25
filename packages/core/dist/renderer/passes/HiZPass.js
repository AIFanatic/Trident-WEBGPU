import { Geometry } from "../../Geometry";
import { Buffer, BufferType } from "../Buffer";
import { RenderPass } from "../RenderGraph";
import { RendererContext } from "../RendererContext";
import { PassParams } from "../RenderingPipeline";
import { Shader } from "../Shader";
import { ShaderLoader } from "../ShaderUtils";
import { DepthTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
export class HiZPass extends RenderPass {
    name = "HiZPass";
    shader;
    quadGeometry;
    debugDepthTexture;
    inputTexture;
    targetTextures = [];
    // TODO: This should be next powerOf2 for SwapChain dims
    depthWidth = 512;
    depthHeight = 512;
    passBuffers = [];
    currentBuffer;
    initialized = false;
    blitShader;
    constructor() {
        super({
            inputs: [PassParams.depthTexture],
            outputs: [PassParams.depthTexturePyramid]
        });
    }
    async init(resources) {
        this.shader = await Shader.Create({
            code: await ShaderLoader.DepthDownsample,
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            colorOutputs: [],
            depthOutput: "depth24plus",
            uniforms: {
                depthTextureInputSampler: { group: 0, binding: 0, type: "sampler" },
                depthTextureInput: { group: 0, binding: 1, type: "depthTexture" },
                currentMip: { group: 0, binding: 2, type: "storage" },
            }
        });
        this.quadGeometry = Geometry.Plane();
        let w = this.depthWidth;
        let h = this.depthHeight;
        let level = 0;
        while (w > 1) {
            this.targetTextures.push(DepthTexture.Create(w, h));
            const passBuffer = Buffer.Create(4 * 4, BufferType.STORAGE);
            passBuffer.SetArray(new Float32Array([level]));
            this.passBuffers.push(passBuffer);
            w /= 2;
            h /= 2;
            level++;
        }
        this.inputTexture = DepthTexture.Create(this.depthWidth, this.depthHeight, 1, "depth24plus", level);
        this.inputTexture.SetActiveMip(0);
        this.inputTexture.SetActiveMipCount(level);
        const Sampler = TextureSampler.Create({ magFilter: "nearest", minFilter: "nearest" });
        this.shader.SetSampler("depthTextureInputSampler", Sampler);
        this.shader.SetTexture("depthTextureInput", this.inputTexture);
        this.debugDepthTexture = this.inputTexture;
        this.currentBuffer = Buffer.Create(4 * 4, BufferType.STORAGE);
        console.log("mips", level);
        this.blitShader = await Shader.Create({
            code: await ShaderLoader.BlitDepth,
            colorOutputs: [],
            depthOutput: "depth24plus",
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                normal: { location: 1, size: 3, type: "vec3" },
                uv: { location: 2, size: 2, type: "vec2" }
            },
            uniforms: {
                texture: { group: 0, binding: 0, type: "depthTexture" },
                textureSampler: { group: 0, binding: 1, type: "sampler" },
                mip: { group: 0, binding: 2, type: "storage" },
            },
        });
        const blitSampler = TextureSampler.Create();
        this.blitShader.SetSampler("textureSampler", blitSampler);
        this.blitShader.SetValue("mip", 0);
        resources.setResource(PassParams.depthTexturePyramid, this.inputTexture);
        this.initialized = true;
    }
    execute(resources, inputDepthTexture, outputDepthTexturePyramid) {
        if (this.initialized === false)
            return;
        let currentLevel = 0;
        let currentTarget = this.targetTextures[currentLevel];
        // Copy depth to first mip of inputTexture
        // Need to use BlitDepth because webgpu doesn't support CopyTextureToTexture with unequal sizes for depth textures
        this.blitShader.SetTexture("texture", inputDepthTexture);
        RendererContext.BeginRenderPass("HiZ - First mip", [], { target: currentTarget, clear: true }, true);
        RendererContext.DrawGeometry(this.quadGeometry, this.blitShader);
        RendererContext.EndRenderPass();
        RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);
        this.shader.SetBuffer("currentMip", this.currentBuffer);
        for (let i = 0; i < this.targetTextures.length - 1; i++) {
            let levelBuffer = this.passBuffers[currentLevel];
            currentLevel++;
            currentTarget = this.targetTextures[currentLevel];
            RendererContext.CopyBufferToBuffer(levelBuffer, this.currentBuffer);
            RendererContext.BeginRenderPass("HiZ - DepthPyramid", [], { target: currentTarget, clear: true }, true);
            RendererContext.DrawGeometry(this.quadGeometry, this.shader);
            RendererContext.EndRenderPass();
            RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);
        }
        resources.setResource(outputDepthTexturePyramid, this.inputTexture);
    }
}
