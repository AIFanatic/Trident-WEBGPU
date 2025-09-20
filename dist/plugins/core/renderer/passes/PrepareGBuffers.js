import { RenderPass } from '../RenderGraph.js';
import { DepthTexture, RenderTexture, CubeTexture, Texture } from '../Texture.js';
import { PassParams } from '../RenderingPipeline.js';
import { RendererEvents, Renderer } from '../Renderer.js';
import { RendererContext } from '../RendererContext.js';
import { Camera } from '../../components/Camera.js';
import { DeferredShadowMapPassDebug } from './DeferredShadowMapPass.js';
import { EventSystem } from '../../Events.js';

class PrepareGBuffers extends RenderPass {
  name = "PrepareGBuffers";
  gBufferAlbedoRT;
  gBufferNormalRT;
  gBufferERMORT;
  depthTexture;
  skybox;
  skyboxIrradiance;
  skyboxPrefilter;
  skyboxBRDFLUT;
  constructor() {
    super({ outputs: [
      PassParams.depthTexture,
      PassParams.GBufferAlbedo,
      PassParams.GBufferNormal,
      PassParams.GBufferERMO,
      PassParams.GBufferDepth
    ] });
    EventSystem.on(RendererEvents.Resized, (canvas) => {
      this.CreateGBufferTextures();
    });
  }
  CreateGBufferTextures() {
    if (this.depthTexture) this.depthTexture.Destroy();
    if (this.gBufferAlbedoRT) this.gBufferAlbedoRT.Destroy();
    if (this.gBufferNormalRT) this.gBufferNormalRT.Destroy();
    if (this.gBufferERMORT) this.gBufferERMORT.Destroy();
    this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);
    this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
  }
  async init(resources) {
    this.CreateGBufferTextures();
    this.skybox = CubeTexture.Create(1, 1, 6);
    this.skyboxIrradiance = CubeTexture.Create(1, 1, 6);
    this.skyboxPrefilter = CubeTexture.Create(1, 1, 6);
    this.skyboxBRDFLUT = Texture.Create(1, 1, 1);
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const colorTargets = [
      { target: this.gBufferAlbedoRT, clear: true },
      { target: this.gBufferNormalRT, clear: true },
      { target: this.gBufferERMORT, clear: true }
    ];
    RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, { target: this.depthTexture, clear: true }, true);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.depthTexture, this.depthTexture);
    resources.setResource(PassParams.GBufferDepth, this.depthTexture);
    resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
    resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
    resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);
    resources.setResource(PassParams.Skybox, this.skybox);
    resources.setResource(PassParams.SkyboxIrradiance, this.skyboxIrradiance);
    resources.setResource(PassParams.SkyboxPrefilter, this.skyboxPrefilter);
    resources.setResource(PassParams.SkyboxBRDFLUT, this.skyboxBRDFLUT);
    const settings = new Float32Array([
      0,
      // +Debugger.isDebugDepthPassEnabled,
      0,
      // Debugger.debugDepthMipLevel,
      0,
      // Debugger.debugDepthExposure,
      0,
      // Renderer.info.viewTypeValue,
      0,
      // +Renderer.info.useHeightMapValue,
      0,
      // Debugger.heightScale,
      +DeferredShadowMapPassDebug.debugCascadesValue,
      DeferredShadowMapPassDebug.pcfResolutionValue,
      DeferredShadowMapPassDebug.blendThresholdValue,
      +DeferredShadowMapPassDebug.viewBlendThresholdValue,
      ...Camera.mainCamera.transform.position.elements,
      0,
      0,
      0
    ]);
    resources.setResource(PassParams.DebugSettings, settings);
  }
}

export { PrepareGBuffers };
