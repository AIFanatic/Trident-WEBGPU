import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { DepthTexture, RenderTexture, Texture } from "../renderer/Texture";
export declare class BilateralFilter extends RenderPass {
    private shader;
    private geometry;
    private inputTexture;
    private renderTarget;
    private blurDir;
    private blurDirHorizontal;
    private blurDirVertical;
    private _filterSize;
    private _blurDepthThreshold;
    private _blurNormalThreshold;
    get filterSize(): number;
    get blurDepthThreshold(): number;
    get blurNormalThreshold(): number;
    set filterSize(value: number);
    set blurDepthThreshold(value: number);
    set blurNormalThreshold(value: number);
    constructor();
    init(resources: ResourcePool): Promise<void>;
    Process(texture: Texture, depthTex: DepthTexture, normalTex: Texture): RenderTexture;
}
