import { RenderPass } from "../../../renderer/RenderGraph";
import { PassParams } from "../../../renderer/RenderingPipeline";
import { HiZPass } from "../../../renderer/passes/HiZPass";
import { Meshlet } from "../Meshlet";
import { CullingPass } from "./CullingPass";
import { IndirectGBufferPass } from "./IndirectGBufferPass";
import { MeshletDebug } from "./MeshletDebug";
import { PrepareSceneData } from "./PrepareSceneData";
export const MeshletPassParams = {
    indirectVertices: "indirectVertices",
    indirectMeshInfo: "indirectMeshInfo",
    indirectMeshletInfo: "indirectMeshletInfo",
    indirectObjectInfo: "indirectObjectInfo",
    indirectMeshMatrixInfo: "indirectMeshMatrixInfo",
    indirectInstanceInfo: "indirectInstanceInfo",
    indirectDrawBuffer: "indirectDrawBuffer",
    meshletsCount: "meshletsCount",
    textureMaps: "textureMaps",
    meshletSettings: "meshletSettings",
    isCullingPrepass: "isCullingPrepass",
};
export class MeshletDraw extends RenderPass {
    name = "MeshletDraw";
    prepareSceneData;
    cullingPass;
    HiZ;
    indirectRender;
    constructor() {
        super({
            inputs: [
                PassParams.depthTexture,
                PassParams.depthTexturePyramid,
                PassParams.DebugSettings,
                PassParams.depthTexture,
                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
            ],
            outputs: [
                MeshletPassParams.meshletSettings
            ]
        });
    }
    async init(resources) {
        this.prepareSceneData = new PrepareSceneData();
        this.cullingPass = new CullingPass();
        this.HiZ = new HiZPass();
        this.indirectRender = new IndirectGBufferPass();
        await this.prepareSceneData.init(resources);
        await this.cullingPass.init(resources);
        await this.HiZ.init(resources);
        await this.indirectRender.init(resources);
        this.initialized = true;
    }
    execute(resources) {
        this.prepareSceneData.execute(resources);
        const settings = new Float32Array([
            +MeshletDebug.isFrustumCullingEnabled,
            +MeshletDebug.isBackFaceCullingEnabled,
            +MeshletDebug.isOcclusionCullingEnabled,
            +MeshletDebug.isSmallFeaturesCullingEnabled,
            MeshletDebug.staticLODValue,
            MeshletDebug.dynamicLODErrorThresholdValue,
            +MeshletDebug.isDynamicLODEnabled,
            MeshletDebug.meshletsViewType,
            Meshlet.max_triangles,
        ]);
        resources.setResource(MeshletPassParams.meshletSettings, settings);
        this.cullingPass.execute(resources);
        this.indirectRender.execute(resources);
        // const depthTexture = resources.getResource(PassParams.depthTexture);
        // const outputDepthTexturePyramid = PassParams.depthTexturePyramid;
        // this.HiZ.execute(resources, depthTexture, outputDepthTexturePyramid);
        // // this.shadows.execute(resources);
        // this.cullingPass.execute(resources);
        // this.indirectRender.execute(resources);
    }
}
