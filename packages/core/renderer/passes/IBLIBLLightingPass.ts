import { Shader } from "../Shader";
import { Geometry } from "../../Geometry";
import { CubeTexture, RenderTexture } from "../Texture";
import { TextureSampler } from "../TextureSampler";
import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Renderer } from "../Renderer";
import { Matrix4 } from "../../math/Matrix4";
import { ShaderLoader } from "../ShaderUtils";
import { PassParams } from "../RenderingPipeline";


export class IBLLightingPass extends RenderPass {
    public name: string = "IBLLightingPass";
    private shader: Shader;
    private sampler: TextureSampler;
    private quadGeometry: Geometry;

    public initialized = false;

    public async init() {
        this.shader = await Shader.Create({
            code: await ShaderLoader.IBLLighting,
            colorOutputs: [{format: "rgba16float", blendMode: "add"}],
        });

        this.sampler = TextureSampler.Create({
            minFilter: "linear",
            magFilter: "linear",
            mipmapFilter: "linear",
            addressModeU: "clamp-to-edge",
            addressModeV: "clamp-to-edge"
        });
        this.shader.SetSampler("textureSampler", this.sampler);

        const brdfSampler = TextureSampler.Create({
            minFilter: "linear",
            magFilter: "linear",
            addressModeU: "repeat",
            addressModeV: "repeat"
        });
        this.shader.SetSampler("brdfSampler", brdfSampler);

        this.quadGeometry = new Geometry();

        this.initialized = true;
    }

    public async preFrame(resources: ResourcePool) {
        if (!this.initialized) return;
        this.drawCommands.length = 0;
        
        const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
        const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
        const inputSkybox = resources.getResource(PassParams.Skybox) as CubeTexture;
        const inputSkyboxIrradiance = resources.getResource(PassParams.SkyboxIrradiance) as CubeTexture;
        const inputSkyboxPrefilter = resources.getResource(PassParams.SkyboxPrefilter) as CubeTexture;
        const inputSkyboxBRDFLUT = resources.getResource(PassParams.SkyboxBRDFLUT) as RenderTexture;
        const inputFrameBuffer = resources.getResource(PassParams.FrameBuffer);
        
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

    public async execute(resources: ResourcePool) {
        if (!this.initialized) return;
        if (this.drawCommands.length === 0) return;

        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], undefined, true);

        for (const draw of this.drawCommands) {
            RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
        }

        RendererContext.EndRenderPass();

        resources.setResource(PassParams.LightingPassOutput, LightingPassOutput);
    }
}