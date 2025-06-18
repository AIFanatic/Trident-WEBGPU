import { Light } from "../components/Light";
import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { RenderTexture } from "../renderer/Texture";
export declare class RSMRenderPass extends RenderPass {
    name: string;
    private light;
    rsmDepth: RenderTexture;
    rsmNormal: RenderTexture;
    rsmFlux: RenderTexture;
    rsmWorldPosition: RenderTexture;
    private shader;
    private modelMatrixBuffer;
    private colorBuffer;
    private dummyAlbedo;
    constructor(light: Light, RSM_RES: number);
    init(resources: ResourcePool): Promise<void>;
    private matrices;
    private modelColors;
    execute(resources: ResourcePool, ...args: any): void;
}
