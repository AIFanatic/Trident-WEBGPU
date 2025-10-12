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
        super();
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

    public async preFrame(resources: GPU.ResourcePool) {
        await this.prepareSceneData.preFrame(resources);

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

        await this.cullingPass.preFrame(resources);
        await this.indirectRender.preFrame(resources);
    }

    public async execute(resources: GPU.ResourcePool) {
        await this.prepareSceneData.execute(resources);
        
        await this.cullingPass.execute(resources);
        await this.indirectRender.execute(resources);
        
        // const depthTexture = resources.getResource(GPU.PassParams.depthTexture);
        // const outputDepthTexturePyramid = GPU.PassParams.depthTexturePyramid;
        // await this.HiZ.execute(resources, depthTexture, outputDepthTexturePyramid);

        // this.shadows.execute(resources);

        // await this.cullingPass.execute(resources);
        // await this.indirectRender.execute(resources);

    }
}