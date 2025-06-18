import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { RenderTexture } from "../renderer/Texture";
export declare class Upscaler extends RenderPass {
    private shader;
    private geometry;
    private renderTarget;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    Process(tex: RenderTexture, width: number, height: number): RenderTexture;
}
