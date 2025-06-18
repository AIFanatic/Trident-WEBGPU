import { RenderPass, ResourcePool } from "../RenderGraph";
export declare class DeferredGBufferPass extends RenderPass {
    name: string;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool): void;
}
