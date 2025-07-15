import { RenderPass } from "../../renderer/RenderGraph";
import { PassParams } from "../../renderer/RenderingPipeline";
export class PostProcessingPass extends RenderPass {
    name = "PostProcessingPass";
    effects = [];
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
    async init(resources) {
        for (const effect of this.effects) {
            await effect.init(resources);
        }
        this.initialized = true;
    }
    async execute(resources) {
        if (this.initialized === false)
            return;
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
