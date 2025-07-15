import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
export declare class CullingPass extends RenderPass {
    name: string;
    private drawIndirectBuffer;
    private compute;
    private cullData;
    private frustum;
    private visibilityBuffer;
    private instanceInfoBuffer;
    private debugBuffer;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=CullingPass.d.ts.map