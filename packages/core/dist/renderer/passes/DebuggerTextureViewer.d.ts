import { RenderPass, ResourcePool } from "../RenderGraph";
export declare class DebuggerTextureViewer extends RenderPass {
    name: string;
    private shader;
    private quadGeometry;
    constructor();
    init(): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=DebuggerTextureViewer.d.ts.map