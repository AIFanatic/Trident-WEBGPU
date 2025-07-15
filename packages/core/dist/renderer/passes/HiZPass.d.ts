import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture } from "../Texture";
export declare class HiZPass extends RenderPass {
    name: string;
    private shader;
    private quadGeometry;
    debugDepthTexture: DepthTexture;
    private inputTexture;
    private targetTextures;
    depthWidth: number;
    depthHeight: number;
    private passBuffers;
    private currentBuffer;
    initialized: boolean;
    private blitShader;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool, inputDepthTexture: DepthTexture, outputDepthTexturePyramid: string): void;
}
//# sourceMappingURL=HiZPass.d.ts.map