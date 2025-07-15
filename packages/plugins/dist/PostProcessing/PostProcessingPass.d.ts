import { RenderPass, ResourcePool } from "../../renderer/RenderGraph";
export declare class PostProcessingPass extends RenderPass {
    name: string;
    effects: RenderPass[];
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool): Promise<void>;
}
//# sourceMappingURL=PostProcessingPass.d.ts.map