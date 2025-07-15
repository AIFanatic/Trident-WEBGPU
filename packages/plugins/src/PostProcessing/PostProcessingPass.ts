import { RenderPass, ResourcePool } from "../../renderer/RenderGraph";
import { PassParams } from "../../renderer/RenderingPipeline";
import { PostProcessingFXAA } from "./effects/FXAA";

export class PostProcessingPass extends RenderPass {
    public name: string = "PostProcessingPass";

    public effects: RenderPass[] = []

    constructor() {
        super({
            inputs: [
                PassParams.LightingPassOutput,
            ],
            outputs: [
                PassParams.LightingPassOutput,
            ]
        });

        // PostProcessingPasses.push(new PostProcessingFXAA());
    }

    public async init(resources: ResourcePool) {
        for (const effect of this.effects) {
            await effect.init(resources);
        }

        this.initialized = true;
    }

    public async execute(resources: ResourcePool) {
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