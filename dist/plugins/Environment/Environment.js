import { Renderer } from '@trident/core';
import { Irradiance } from './Irradiance.js';
import { Prefilter } from './Prefilter.js';
import { BRDF } from './BRDF.js';

class Environment {
  scene;
  irradiance;
  prefilter;
  brdf;
  skyTexture;
  constructor(scene, skyTexture) {
    this.scene = scene;
    this.skyTexture = skyTexture;
  }
  async init() {
    this.irradiance = new Irradiance();
    this.prefilter = new Prefilter();
    this.brdf = new BRDF();
    await this.irradiance.init();
    await this.prefilter.init();
    await this.brdf.init();
    this.Update();
  }
  Update() {
    this.irradiance.Update(this.skyTexture);
    this.prefilter.Update(this.skyTexture);
    Renderer.RenderPipeline.skybox = this.skyTexture;
    Renderer.RenderPipeline.skyboxIrradiance = this.irradiance.irradianceTexture;
    Renderer.RenderPipeline.skyboxPrefilter = this.prefilter.prefilterTexture;
    Renderer.RenderPipeline.skyboxBRDFLUT = this.brdf.brdfTexture;
  }
}

export { Environment };
