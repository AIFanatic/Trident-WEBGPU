import { GPU } from '@trident/core';

class PostProcessingPass extends GPU.RenderPass {
  name = "PostProcessingPass";
  effects = [];
  constructor() {
    super();
  }
  async init(resources) {
    for (const effect of this.effects) {
      await effect.init(resources);
    }
    this.initialized = true;
  }
  async preFrame(resources) {
    if (this.initialized === false) return;
    for (const effect of this.effects) {
      if (!effect.initialized) {
        await effect.init(resources);
        continue;
      }
      effect.preFrame(resources);
    }
  }
  async execute(resources) {
    if (this.initialized === false) return;
    for (const effect of this.effects) {
      if (!effect.initialized) {
        throw Error("Effect not initialized");
      }
      effect.execute(resources);
    }
  }
}

export { PostProcessingPass };
