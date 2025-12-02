import { Assets, GPU, Geometry } from '@trident/core';
import CommonWGSL from './resources/Common.wgsl.js';
import VertexWGSL from './resources/Vertex.wgsl.js';
import TransmittanceLUTWGSL from './resources/TransmittanceLUT.wgsl.js';
import SkyAtmosphereWGSL from './resources/SkyAtmosphere.wgsl.js';

Assets.Register("@trident/plugins/Sky/resources/Common.wgsl", CommonWGSL);
Assets.Register("@trident/plugins/Sky/resources/Vertex.wgsl", VertexWGSL);
class Sky {
  SUN_ELEVATION_DEGREES = 0;
  EYE_ALTITUDE = 0.5;
  skyTexture;
  transmittanceLUT;
  name = "Sky";
  initialized = false;
  geometry;
  transmittanceLUTShader;
  skyTextureShader;
  async init() {
    this.transmittanceLUTShader = await GPU.Shader.Create({
      code: await GPU.ShaderPreprocessor.ProcessIncludesV2(TransmittanceLUTWGSL),
      colorOutputs: [{ format: "rgba16float" }],
      uniforms: {
        params: { group: 0, binding: 0, type: "storage" }
      }
    });
    this.skyTextureShader = await GPU.Shader.Create({
      code: await GPU.ShaderPreprocessor.ProcessIncludesV2(SkyAtmosphereWGSL),
      colorOutputs: [{ format: "rgba16float" }],
      uniforms: {
        params: { group: 0, binding: 0, type: "storage" },
        textureSampler: { group: 0, binding: 1, type: "sampler" },
        TransmittanceLUTTexture: { group: 0, binding: 2, type: "texture" }
      }
    });
    this.geometry = Geometry.Plane();
    this.transmittanceLUT = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.skyTexture = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.skyTextureShader.SetSampler("textureSampler", GPU.TextureSampler.Create());
    this.initialized = true;
    this.Update();
  }
  Update() {
    if (!this.initialized) return;
    const params = new Float32Array([this.SUN_ELEVATION_DEGREES, this.EYE_ALTITUDE, 0, 0]);
    this.transmittanceLUTShader.SetArray("params", params);
    this.skyTextureShader.SetArray("params", params);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.transmittanceLUT, clear: true }]);
    GPU.RendererContext.Draw(this.geometry, this.transmittanceLUTShader, 3);
    GPU.RendererContext.EndRenderPass();
    this.skyTextureShader.SetTexture("TransmittanceLUTTexture", this.transmittanceLUT);
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.skyTexture, clear: true }]);
    GPU.RendererContext.Draw(this.geometry, this.skyTextureShader, 3);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
  }
}

export { Sky };
