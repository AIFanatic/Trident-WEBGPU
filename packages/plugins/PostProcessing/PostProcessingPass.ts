import { GPU } from "@trident/core";

export class PostProcessingPass extends GPU.RenderPass {
    public name: string = "PostProcessingPass";

    public effects: GPU.RenderPass[] = []

    public async init(resources: GPU.ResourcePool) {
        for (const effect of this.effects) {
            if (effect.initialized || effect.initializing) continue;
            effect.initializing = true;
            await effect.init(resources);
            effect.initialized = true;
        }

        this.initialized = true;
    }

    public preFrame(resources: GPU.ResourcePool) {
        if (this.initialized === false) return;

        for (const effect of this.effects) {
            if (!effect.initialized) {
                // RenderGraph calls preFrame fire-and-forget, so without this guard init() is
                // restarted every frame while the first is still awaiting, and each restart
                // swaps the effect's shaders out mid-flight.
                if (effect.initializing) continue;
                effect.initializing = true;
                effect.init(resources).then(() => { effect.initialized = true; });
                continue;
            }
            effect.preFrame(resources);
        }
    }

    public execute(resources: GPU.ResourcePool) {
        if (this.initialized === false) return;

        for (const effect of this.effects) {
            if (!effect.initialized) continue;
            effect.execute(resources);
        }
    }
}