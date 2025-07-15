import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
export declare const MeshletPassParams: {
    indirectVertices: string;
    indirectMeshInfo: string;
    indirectMeshletInfo: string;
    indirectObjectInfo: string;
    indirectMeshMatrixInfo: string;
    indirectInstanceInfo: string;
    indirectDrawBuffer: string;
    meshletsCount: string;
    textureMaps: string;
    isCullingPrepass: string;
};
export declare class MeshletDraw extends RenderPass {
    name: string;
    private prepareSceneData;
    private cullingPass;
    private HiZ;
    private indirectRender;
    private shadows;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=MeshletDraw.d.ts.map