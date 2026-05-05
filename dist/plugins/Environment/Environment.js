import { Renderer } from '@trident/core';
import { PrefilterDiffuse } from './PrefilterDiffuse.js';
import { PrefilterSpecular } from './PrefilterSpecular.js';
import { BRDF } from './BRDF.js';

class Environment {
  prefilterDiffuse;
  prefilterSpecular;
  brdf;
  skyTexture;
  constructor(scene, skyTexture) {
    this.skyTexture = skyTexture;
  }
  async init() {
    this.prefilterDiffuse = new PrefilterDiffuse();
    this.prefilterSpecular = new PrefilterSpecular();
    this.brdf = new BRDF();
    await this.prefilterDiffuse.init();
    await this.prefilterSpecular.init();
    await this.brdf.init();
    this.Update();
  }
  Update() {
    this.prefilterDiffuse.Update(this.skyTexture);
    this.prefilterSpecular.Update(this.skyTexture);
    Renderer.RenderPipeline.skybox = this.skyTexture;
    Renderer.RenderPipeline.skyboxPrefilterDiffuse = this.prefilterDiffuse.prefilterDiffuse;
    Renderer.RenderPipeline.skyboxPrefilterSpecular = this.prefilterSpecular.prefilterSpecular;
    Renderer.RenderPipeline.skyboxBRDFLUT = this.brdf.brdfTexture;
  }
}

export { Environment };
