import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { RenderTexture, Texture } from "../renderer/Texture";
export declare class TextureBlender extends RenderPass {
    private shader;
    private geometry;
    private renderTarget;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    Process(texA: Texture, texB: Texture): RenderTexture;
}
