import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { RenderTexture, Texture, TextureFormat } from "../renderer/Texture";
export declare class Blit extends RenderPass {
    private shader;
    private geometry;
    private renderTarget;
    private format;
    constructor(width: number, height: number, format: TextureFormat);
    init(resources: ResourcePool): Promise<void>;
    Process(tex: Texture): RenderTexture;
}
//# sourceMappingURL=Blit.d.ts.map