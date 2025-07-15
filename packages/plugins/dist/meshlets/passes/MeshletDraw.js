import { RenderPass } from "../../../renderer/RenderGraph";
import { PassParams } from "../../../renderer/RenderingPipeline";
import { HiZPass } from "../../../renderer/passes/HiZPass";
import { CullingPass } from "./CullingPass";
import { IndirectGBufferPass } from "./IndirectGBufferPass";
import { MeshletsShadowMapPass } from "./MeshletsShadowMapPass";
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
    isCullingPrepass: "isCullingPrepass",
};
export class MeshletDraw extends RenderPass {
    name = "MeshletDraw";
    prepareSceneData;
    cullingPass;
    HiZ;
    indirectRender;
    shadows;
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
            outputs: []
        });
    }
    async init(resources) {
        this.prepareSceneData = new PrepareSceneData();
        this.cullingPass = new CullingPass();
        this.HiZ = new HiZPass();
        this.indirectRender = new IndirectGBufferPass();
        this.shadows = new MeshletsShadowMapPass();
        await this.prepareSceneData.init(resources);
        await this.cullingPass.init(resources);
        await this.HiZ.init(resources);
        await this.indirectRender.init(resources);
        await this.shadows.init(resources);
        this.initialized = true;
    }
    execute(resources) {
        this.prepareSceneData.execute(resources);
        this.cullingPass.execute(resources);
        this.indirectRender.execute(resources);
        const depthTexture = resources.getResource(PassParams.depthTexture);
        const outputDepthTexturePyramid = PassParams.depthTexturePyramid;
        this.HiZ.execute(resources, depthTexture, outputDepthTexturePyramid);
        // // this.shadows.execute(resources);
        this.cullingPass.execute(resources);
        this.indirectRender.execute(resources);
    }
}
