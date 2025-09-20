import { GPU } from '@trident/core';

class PostProcessingPass extends GPU.RenderPass {
  name = "PostProcessingPass";
  effects = [];
  constructor() {
    super({
      inputs: [
        GPU.PassParams.LightingPassOutput
      ],
      outputs: [
        GPU.PassParams.LightingPassOutput
      ]
    });
  }
  async init(resources) {
    for (const effect of this.effects) {
      await effect.init(resources);
    }
    this.initialized = true;
  }
  async execute(resources) {
    if (this.initialized === false) return;
    for (const effect of this.effects) {
      if (!effect.initialized) {
        await effect.init(resources);
        continue;
      }
      effect.execute(resources);
    }
    resources.setResource;
  }
}

export { PostProcessingPass };
