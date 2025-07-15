import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
import { Texture } from "../../../renderer/Texture";
export interface TextureMaps {
    albedo: Texture;
    normal: Texture;
    height: Texture;
    metalness: Texture;
    emissive: Texture;
}
export declare class PrepareSceneData extends RenderPass {
    name: string;
    private objectInfoBuffer;
    private vertexBuffer;
    private meshMaterialInfo;
    private meshMatrixInfoBuffer;
    private meshletInfoBuffer;
    private currentMeshCount;
    private currentMeshletsCount;
    private materialIndexCache;
    private albedoMaps;
    private normalMaps;
    private heightMaps;
    private metalnessMaps;
    private emissiveMaps;
    private textureMaps;
    private materialMaps;
    private dummyTexture;
    constructor();
    init(resources: ResourcePool): Promise<void>;
    private getVertexInfo;
    private getMeshletInfo;
    private getMeshMaterialInfo;
    private processMaterialMap;
    private createMaterialMap;
    execute(resources: ResourcePool): void;
}
//# sourceMappingURL=PrepareSceneData.d.ts.map