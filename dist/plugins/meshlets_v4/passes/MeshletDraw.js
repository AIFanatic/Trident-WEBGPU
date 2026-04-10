import { GPU } from '@trident/core';
import { PrepareMeshletData } from './PrepareMeshletData.js';
import { CullingPass } from './CullingPass.js';
import { IndirectGBufferPass } from './IndirectGBufferPass.js';

var MeshletPassParams = /* @__PURE__ */ ((MeshletPassParams2) => {
  MeshletPassParams2["MeshletParams"] = "MeshletParams";
  MeshletPassParams2["VertexBuffer"] = "VertexBuffer";
  MeshletPassParams2["MeshletTrianglesBuffer"] = "MeshletTrianglesBuffer";
  MeshletPassParams2["MeshletBuffer"] = "MeshletBuffer";
  MeshletPassParams2["MeshBuffer"] = "MeshBuffer";
  MeshletPassParams2["LodMeshBuffer"] = "LodMeshBuffer";
  MeshletPassParams2["MaterialInfoBuffer"] = "MaterialInfoBuffer";
  MeshletPassParams2["ObjectInfoBuffer"] = "ObjectInfoBuffer";
  MeshletPassParams2["InstanceInfoBuffer"] = "InstanceInfoBuffer";
  MeshletPassParams2["DrawIndirectBuffer"] = "DrawIndirectBuffer";
  MeshletPassParams2["CurrentMeshletCount"] = "CurrentMeshletCount";
  MeshletPassParams2["FrameMeshlets"] = "FrameMeshlets";
  return MeshletPassParams2;
})(MeshletPassParams || {});
class MeshletDraw extends GPU.RenderPass {
  name = "MeshletDraw";
  prepareMeshletData = new PrepareMeshletData();
  cullingPass = new CullingPass();
  indirectGBufferPass = new IndirectGBufferPass();
  async init(resources) {
    await this.prepareMeshletData.init(resources);
    await this.cullingPass.init(resources);
    await this.indirectGBufferPass.init(resources);
  }
  preFrame(resources) {
    this.prepareMeshletData.preFrame(resources);
    this.cullingPass.preFrame(resources);
    this.indirectGBufferPass.preFrame(resources);
  }
  execute(resources) {
    this.prepareMeshletData.execute(resources);
    this.cullingPass.execute(resources);
    this.indirectGBufferPass.execute(resources);
  }
}

export { MeshletDraw, MeshletPassParams };
