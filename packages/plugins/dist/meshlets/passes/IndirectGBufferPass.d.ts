import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
export declare class IndirectGBufferPass extends RenderPass {
    name: string;
    private shader;
    private geometry;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=IndirectGBufferPass.d.ts.map