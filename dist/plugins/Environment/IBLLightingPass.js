import { GPU, Geometry } from '@trident/core';
import { PrefilterDiffuse } from './PrefilterDiffuse.js';
import { PrefilterSpecular } from './PrefilterSpecular.js';
import { BRDF } from './BRDF.js';
import IBLLightingWGSL from './resources/IBLLighting.wgsl.js';

class IBLLightingPass extends GPU.RenderPass {
  name = "IBLLightingPass";
  shader;
  sampler;
  quadGeometry;
  environmentMap = null;
  environmentDirty = false;
  prefilterDiffuse;
  prefilterSpecular;
  brdf;
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
    this.prefilterDiffuse = new PrefilterDiffuse();
    this.prefilterSpecular = new PrefilterSpecular();
    this.brdf = new BRDF();
    await this.prefilterDiffuse.init();
    await this.prefilterSpecular.init();
    await this.brdf.init();
    this.initialized = true;
  }
  UpdateEnvironmentIfNeeded() {
    if (!this.initialized) return;
    if (!this.environmentDirty) return;
    if (!this.environmentMap) return;
    this.prefilterDiffuse.Update(this.environmentMap);
    this.prefilterSpecular.Update(this.environmentMap);
    this.environmentDirty = false;
  }
  SetEnvironment(environmentMap) {
    this.environmentMap = environmentMap;
    this.environmentDirty = true;
  }
  preFrame(resources) {
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
  execute(resources) {
    if (!this.environmentMap) return;
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
  Destroy() {
    this.prefilterDiffuse?.Destroy();
    this.prefilterSpecular?.Destroy();
    this.brdf?.Destroy();
    this.environmentMap = null;
    this.prefilterDiffuse = void 0;
    this.prefilterSpecular = void 0;
    this.brdf = void 0;
    this.initialized = false;
    super.Destroy();
  }
}

export { IBLLightingPass };
