import { GPU } from "@trident/core";

export class PostProcessingPass extends GPU.RenderPass {
    public name: string = "PostProcessingPass";

    public effects: GPU.RenderPass[] = []

    constructor() {
        super({
            inputs: [
                GPU.PassParams.LightingPassOutput,
            ],
            outputs: [
                GPU.PassParams.LightingPassOutput,
            ]
        });

        // PostProcessingPasses.push(new PostProcessingFXAA());
    }

    public async init(resources: GPU.ResourcePool) {
        for (const effect of this.effects) {
            await effect.init(resources);
        }

        this.initialized = true;
    }

    public async execute(resources: GPU.ResourcePool) {
        if (this.initialized === false) return;

        for (const effect of this.effects) {
            if (!effect.initialized) {
                await effect.init(resources);
                continue;
            }
            effect.execute(resources);
        }

        resources.setResource
    }
}