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
  meshletSettings: "meshletSettings"};
class MeshletDraw extends GPU.RenderPass {
  name = "MeshletDraw";
  prepareSceneData;
  cullingPass;
  HiZ;
  indirectRender;
  constructor() {
    super();
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
  async preFrame(resources) {
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
      Meshlet.max_triangles
    ]);
    resources.setResource(MeshletPassParams.meshletSettings, settings);
    await this.cullingPass.preFrame(resources);
    await this.indirectRender.preFrame(resources);
  }
  async execute(resources) {
    await this.prepareSceneData.execute(resources);
    await this.cullingPass.execute(resources);
    await this.indirectRender.execute(resources);
  }
}

export { MeshletDraw, MeshletPassParams };
