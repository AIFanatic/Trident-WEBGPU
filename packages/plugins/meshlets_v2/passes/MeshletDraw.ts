import { Meshlet } from "../Meshlet";
import { CullingPass } from "./CullingPass";
import { IndirectGBufferPass } from "./IndirectGBufferPass";
import { MeshletDebug } from "./MeshletDebug";
import { PrepareSceneData } from "./PrepareSceneData";

import { HiZPass } from "@trident/plugins/HiZPass";

import {
    GPU
} from "@trident/core";

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

export class MeshletDraw extends GPU.RenderPass {
    public name: string = "MeshletDraw";

    private prepareSceneData: PrepareSceneData;
    private cullingPass: CullingPass;
    private HiZ: HiZPass;
    private indirectRender: IndirectGBufferPass;

    constructor() {
        super({
            inputs: [
                GPU.PassParams.depthTexture,
                GPU.PassParams.depthTexturePyramid,
                GPU.PassParams.DebugSettings,
                
                GPU.PassParams.depthTexture,
                GPU.PassParams.GBufferAlbedo,
                GPU.PassParams.GBufferNormal,
                GPU.PassParams.GBufferERMO,
                GPU.PassParams.GBufferDepth,
            ],
            outputs: [
                MeshletPassParams.meshletSettings
            ]
        });
    }
    public async init(resources: GPU.ResourcePool) {
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

    public execute(resources: GPU.ResourcePool): void {
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