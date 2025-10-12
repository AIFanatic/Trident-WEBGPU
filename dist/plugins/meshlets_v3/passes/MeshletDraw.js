import { GPU } from '@trident/core';
import { PrepareMeshletData } from './PrepareMeshletData.js';
import { CullingPass } from './CullingPass.js';
import { IndirectGBufferPass } from './IndirectGBufferPass.js';

var MeshletPassParams = /* @__PURE__ */ ((MeshletPassParams2) => {
  MeshletPassParams2["FrameBuffer"] = "FrameBuffer";
  MeshletPassParams2["VertexBuffer"] = "VertexBuffer";
  MeshletPassParams2["MeshletVerticesBuffer"] = "MeshletVerticesBuffer";
  MeshletPassParams2["MeshletTrianglesBuffer"] = "MeshletTrianglesBuffer";
  MeshletPassParams2["MeshletBuffer"] = "MeshletBuffer";
  MeshletPassParams2["MeshBuffer"] = "MeshBuffer";
  MeshletPassParams2["LodMeshBuffer"] = "LodMeshBuffer";
  MeshletPassParams2["ObjectInfoBuffer"] = "ObjectInfoBuffer";
  MeshletPassParams2["InstanceInfoBuffer"] = "InstanceInfoBuffer";
  MeshletPassParams2["DrawIndirectBuffer"] = "DrawIndirectBuffer";
  MeshletPassParams2["CurrentMeshletCount"] = "CurrentMeshletCount";
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
  async preFrame(resources) {
    await this.prepareMeshletData.preFrame(resources);
    await this.cullingPass.preFrame(resources);
    await this.indirectGBufferPass.preFrame(resources);
  }
  async execute(resources) {
    await this.prepareMeshletData.execute(resources);
    await this.cullingPass.execute(resources);
    await this.indirectGBufferPass.execute(resources);
  }
}

export { MeshletDraw, MeshletPassParams };
