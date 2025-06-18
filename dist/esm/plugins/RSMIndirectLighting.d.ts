import { Light } from "../components/Light";
import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { RenderTexture } from "../renderer/Texture";
import { RSMRenderPass } from "./RSM";
import { BilateralFilter } from "./BilateralFilter";
import { TextureBlender } from "./TextureBlender";
import { Upscaler } from "./Upscaler";
export declare class RSMIndirectLighting extends RenderPass {
    name: string;
    private light;
    RSMGenerator: RSMRenderPass;
    indirectLighting: RenderTexture;
    bilateralFilter: BilateralFilter;
    textureBlender: TextureBlender;
    upscaler: Upscaler;
    private geometry;
    private shader;
    private enabled;
    private showIndirect;
    private RSM_RES;
    private NUM_SAMPLES;
    private SAMPLES_TEX_SIZE;
    constructor(light: Light, RSM_RES: number, NUM_SAMPLES: number);
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool, ...args: any): Promise<void>;
}
