import { GPU, Geometry } from '@trident/core';
import IBLLightingWGSL from './resources/IBLLighting.wgsl.js';

class IBLLightingPass extends GPU.RenderPass {
  name = "IBLLightingPass";
  shader;
  sampler;
  quadGeometry;
  initialized = false;
  async init() {
    this.shader = await GPU.Shader.Create({
      code: await GPU.ShaderPreprocessor.ProcessIncludesV2(IBLLightingWGSL),
      colorOutputs: [{ format: "rgba16float", blendMode: "add" }]
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
  preFrame(resources) {
    if (!this.initialized) return;
    this.drawCommands.length = 0;
    const inputGBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
    const inputGbufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    const inputSkybox = resources.getResource(GPU.PassParams.Skybox);
    const inputSkyboxIrradiance = resources.getResource(GPU.PassParams.SkyboxIrradiance);
    const inputSkyboxPrefilter = resources.getResource(GPU.PassParams.SkyboxPrefilter);
    const inputSkyboxBRDFLUT = resources.getResource(GPU.PassParams.SkyboxBRDFLUT);
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
    this.drawCommands.push({ geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0 });
  }
  execute(resources) {
    if (!this.initialized) return;
    if (this.drawCommands.length === 0) return;
    const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    if (!LightingPassOutput) return;
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], void 0, true);
    for (const draw of this.drawCommands) {
      GPU.RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
    }
    GPU.RendererContext.EndRenderPass();
    resources.setResource(GPU.PassParams.LightingPassOutput, LightingPassOutput);
  }
}

export { IBLLightingPass };
