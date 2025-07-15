import { RenderPass, ResourcePool } from "../RenderGraph";
export declare class TextureViewer extends RenderPass {
    name: string;
    private shader;
    private quadGeometry;
    constructor();
    init(): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=TextureViewer.d.ts.map