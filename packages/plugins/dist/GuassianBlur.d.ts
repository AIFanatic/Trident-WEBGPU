import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { RenderTexture, Texture } from "../renderer/Texture";
export declare class GuassianBlur extends RenderPass {
    private shader;
    private geometry;
    private inputTexture;
    private renderTarget;
    private blurDir;
    private blurDirHorizontal;
    private blurDirVertical;
    private _filterSize;
    get filterSize(): number;
    set filterSize(value: number);
    constructor();
    init(resources: ResourcePool): Promise<void>;
    Process(texture: Texture): RenderTexture;
}
//# sourceMappingURL=GuassianBlur.d.ts.map