import { RenderPass, ResourcePool } from "../renderer/RenderGraph";
import { Shader } from "../renderer/Shader";
import { RenderTexture, Texture } from "../renderer/Texture";
export declare class Bloom extends RenderPass {
    private shader;
    private geometry;
    private renderTarget;
    output: RenderTexture;
    private currentPassBuffer;
    private temporaryTextures;
    private scratchTextures;
    private iterations;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    Blit(source: Texture, destination: RenderTexture, shader: Shader): void;
    execute(resources: ResourcePool, ...args: any): void;
}
//# sourceMappingURL=Bloom.d.ts.map