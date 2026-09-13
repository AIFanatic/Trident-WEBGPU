import { GPU } from '@trident/core';

class PostProcessingPass extends GPU.RenderPass {
  name = "PostProcessingPass";
  effects = [];
  async init(resources) {
    for (const effect of this.effects) {
      if (effect.initialized || effect.initializing) continue;
      effect.initializing = true;
      await effect.init(resources);
      effect.initialized = true;
    }
    this.initialized = true;
  }
  preFrame(resources) {
    if (this.initialized === false) return;
    for (const effect of this.effects) {
      if (!effect.initialized) {
        if (effect.initializing) continue;
        effect.initializing = true;
        effect.init(resources).then(() => {
          effect.initialized = true;
        });
        continue;
      }
      effect.preFrame(resources);
    }
  }
  execute(resources) {
    if (this.initialized === false) return;
    for (const effect of this.effects) {
      if (!effect.initialized) continue;
      effect.execute(resources);
    }
  }
}

export { PostProcessingPass };
