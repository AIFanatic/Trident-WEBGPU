import { RenderPass, ResourcePool } from "../RenderGraph";
import { CubeTexture, DepthTexture, RenderTexture } from "../Texture";
export declare class PrepareGBuffers extends RenderPass {
    name: string;
    gBufferAlbedoRT: RenderTexture;
    gBufferNormalRT: RenderTexture;
    gBufferERMORT: RenderTexture;
    depthTexture: DepthTexture;
    depthTextureClone: DepthTexture;
    gBufferAlbedoRTClone: RenderTexture;
    skybox: CubeTexture;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=PrepareGBuffers.d.ts.map