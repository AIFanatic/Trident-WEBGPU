import { Geometry, GPU } from "@trident/core";

import IBLLightingWGSL from "./resources/IBLLighting.wgsl" with { type: "text" };

export class IBLLightingPass extends GPU.RenderPass {
    public name: string = "IBLLightingPass";
    private shader: GPU.Shader;
    private sampler: GPU.TextureSampler;
    private quadGeometry: Geometry;

    public initialized = false;

    public async init() {
        this.shader = await GPU.Shader.Create({
            code: await GPU.ShaderPreprocessor.ProcessIncludesV2(IBLLightingWGSL),
            colorOutputs: [{format: "rgba16float", blendMode: "add"}],
        });

        this.sampler = new GPU.TextureSampler({
            minFilter: "linear",
            magFilter: "linear",
            mipmapFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.shader.SetSampler("textureSampler", this.sampler);

        const brdfSampler = new GPU.TextureSampler({
            minFilter: "linear",
            magFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.shader.SetSampler("brdfSampler", brdfSampler);

        this.quadGeometry = new Geometry();

        this.initialized = true;
    }

    public preFrame(resources: GPU.ResourcePool) {
        if (!this.initialized) return;
        this.drawCommands.length = 0;
        
        const inputGBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
        const inputGbufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
        const inputSkybox = resources.getResource(GPU.PassParams.Skybox) as GPU.CubeTexture;
        const inputSkyboxIrradiance = resources.getResource(GPU.PassParams.SkyboxIrradiance) as GPU.CubeTexture;
        const inputSkyboxPrefilter = resources.getResource(GPU.PassParams.SkyboxPrefilter) as GPU.CubeTexture;
        const inputSkyboxBRDFLUT = resources.getResource(GPU.PassParams.SkyboxBRDFLUT) as GPU.RenderTexture;
        const inputFrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
        
        if (!inputGBufferAlbedo) return;
        if (!inputSkyboxIrradiance) return;


        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("ermoTexture", inputGbufferERMO);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);

        this.shader.SetTexture("skybox", inputSkybox);
        this.shader.SetTexture("skyboxIrradianceTexture", inputSkyboxIrradiance);
        this.shader.SetTexture("skyboxPrefilterTexture", inputSkyboxPrefilter);
        this.shader.SetTexture("skyboxBRDFLUT", inputSkyboxBRDFLUT);
        
        this.shader.SetBuffer("view", inputFrameBuffer);
        
        // RendererContext.DrawGeometry(this.quadGeometry, this.shader);
        this.drawCommands.push({geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0});
    }

    public execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;
        if (this.drawCommands.length === 0) return;

        const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
        if (!LightingPassOutput) return;
        
        GPU.RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], undefined, true);

        for (const draw of this.drawCommands) {
            GPU.RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
        }

        GPU.RendererContext.EndRenderPass();

        resources.setResource(GPU.PassParams.LightingPassOutput, LightingPassOutput);
    }
}
