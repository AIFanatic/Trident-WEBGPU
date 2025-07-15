import { RenderPass, ResourcePool } from "../RenderGraph";
export declare class DeferredLightingPass extends RenderPass {
    name: string;
    private shader;
    private sampler;
    private quadGeometry;
    private lightsBuffer;
    private lightsCountBuffer;
    private outputLightingPass;
    private needsUpdate;
    initialized: boolean;
    private dummyShadowPassDepth;
    constructor();
    init(): Promise<void>;
    private updateLightsBuffer;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=DeferredLightingPass.d.ts.map