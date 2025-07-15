import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
export declare class PostProcessingSMAA extends RenderPass {
    name: string;
    private shader1;
    private shader2;
    private shader3;
    private quadGeometry;
    private edgeTex;
    private blendTex;
    private finalTex;
    constructor();
    init(): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=SMAA.d.ts.map