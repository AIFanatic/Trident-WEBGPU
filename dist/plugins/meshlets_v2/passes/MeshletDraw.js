import { Meshlet } from '../Meshlet.js';
import { CullingPass } from './CullingPass.js';
import { IndirectGBufferPass } from './IndirectGBufferPass.js';
import { MeshletDebug } from './MeshletDebug.js';
import { PrepareSceneData } from './PrepareSceneData.js';
import { HiZPass } from '@trident/plugins/HiZPass.js';
import { GPU } from '@trident/core';

const MeshletPassParams = {
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
  isCullingPrepass: "isCullingPrepass"
};
class MeshletDraw extends GPU.RenderPass {
  name = "MeshletDraw";
  prepareSceneData;
  cullingPass;
  HiZ;
  indirectRender;
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
        GPU.PassParams.GBufferDepth
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
      Meshlet.max_triangles
    ]);
    resources.setResource(MeshletPassParams.meshletSettings, settings);
    this.cullingPass.execute(resources);
    this.indirectRender.execute(resources);
  }
}

export { MeshletDraw, MeshletPassParams };
