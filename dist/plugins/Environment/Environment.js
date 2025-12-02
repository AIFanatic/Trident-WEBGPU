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
    this.scene.renderPipeline.skybox = this.skyTexture;
    this.scene.renderPipeline.skyboxIrradiance = this.irradiance.irradianceTexture;
    this.scene.renderPipeline.skyboxPrefilter = this.prefilter.prefilterTexture;
    this.scene.renderPipeline.skyboxBRDFLUT = this.brdf.brdfTexture;
  }
}

export { Environment };
