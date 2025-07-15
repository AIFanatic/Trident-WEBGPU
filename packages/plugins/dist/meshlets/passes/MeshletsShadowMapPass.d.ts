import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
export declare let lightsCSMProjectionMatrix: Float32Array[];
export declare class MeshletsShadowMapPass extends RenderPass {
    name: string;
    private drawIndirectShadowShader;
    private lightProjectionMatrixBuffer;
    private lightProjectionViewMatricesBuffer;
    private cascadeIndexBuffers;
    private cascadeCurrentIndexBuffer;
    private meshletGeometry;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=MeshletsShadowMapPass.d.ts.map