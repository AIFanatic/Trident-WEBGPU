import { Geometry, GPU } from "@trident/core";
import { PrefilterDiffuse } from "./PrefilterDiffuse";
import { PrefilterSpecular } from "./PrefilterSpecular";
import { BRDF } from "./BRDF";
import IBLLightingWGSL from "./resources/IBLLighting.wgsl" with { type: "text" };

export class IBLLightingPass extends GPU.RenderPass {
    public name: string = "IBLLightingPass";
    private shader: GPU.Shader;
    private sampler: GPU.TextureSampler;
    private quadGeometry: Geometry;

    private environmentMap: GPU.CubeTexture | null = null;
    private environmentDirty = false;
    private prefilterDiffuse: PrefilterDiffuse;
    private prefilterSpecular: PrefilterSpecular;
    private brdf: BRDF;

    public initialized = false;

    public async init() {
        this.shader = await GPU.Shader.Create({
            code: await GPU.ShaderPreprocessor.ProcessIncludesV2(IBLLightingWGSL),
            colorOutputs: [{ format: "rgba16float", blendMode: "add" }],
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

        this.prefilterDiffuse = new PrefilterDiffuse();
        this.prefilterSpecular = new PrefilterSpecular();
        this.brdf = new BRDF();

        await this.prefilterDiffuse.init();
        await this.prefilterSpecular.init();
        await this.brdf.init();

        this.initialized = true;
    }


    private UpdateEnvironmentIfNeeded() {
        if (!this.initialized) return;
        if (!this.environmentDirty) return;
        if (!this.environmentMap) return;

        this.prefilterDiffuse.Update(this.environmentMap);
        this.prefilterSpecular.Update(this.environmentMap);

        this.environmentDirty = false;
    }

    public SetEnvironment(environmentMap: GPU.CubeTexture) {
        this.environmentMap = environmentMap;
        this.environmentDirty = true;
    }

    public preFrame(resources: GPU.ResourcePool) {
        this.UpdateEnvironmentIfNeeded();
        if (!this.environmentMap) return;
        
        this.drawCommands.length = 0;

        const inputGBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
        const inputGbufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
        const inputFrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);

        if (!inputGBufferAlbedo) return;

        this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
        this.shader.SetTexture("normalTexture", inputGBufferNormal);
        this.shader.SetTexture("ermoTexture", inputGbufferERMO);
        this.shader.SetTexture("depthTexture", inputGBufferDepth);

        this.shader.SetTexture("skyboxIrradianceTexture", this.prefilterDiffuse.prefilterDiffuse);
        this.shader.SetTexture("skyboxPrefilterTexture", this.prefilterSpecular.prefilterSpecular);
        this.shader.SetTexture("skyboxBRDFLUT", this.brdf.brdfTexture);

        this.shader.SetBuffer("view", inputFrameBuffer);

        this.drawCommands.push({ geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0 });
    }

    public execute(resources: GPU.ResourcePool) {
        if (!this.environmentMap) return;
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
