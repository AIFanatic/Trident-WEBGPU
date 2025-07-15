import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
export declare class PostProcessingFXAA extends RenderPass {
    name: string;
    private shader;
    private quadGeometry;
    private renderTarget;
    constructor();
    init(): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=FXAA.d.ts.map