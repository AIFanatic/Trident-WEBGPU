import { GPU, Geometry, VertexAttribute } from '@trident/core';
import { MeshletPassParams } from './MeshletDraw.js';

class IndirectGBufferPass extends GPU.RenderPass {
  name = "IndirectGBufferPass";
  shader;
  geometry;
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      name: this.name,
      code: await GPU.ShaderLoader.LoadURL(new URL("../resources/DrawIndirectGBuffer.wgsl", import.meta.url)),
      colorOutputs: [
        { format: "rgba16float" },
        { format: "rgba16float" },
        { format: "rgba16float" }
      ],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        frameBuffer: { group: 0, binding: 0, type: "storage" },
        vertexBuffer: { group: 1, binding: 0, type: "storage" },
        meshletVerticesBuffer: { group: 1, binding: 1, type: "storage" },
        meshletTrianglesBuffer: { group: 1, binding: 2, type: "storage" },
        meshletBuffer: { group: 1, binding: 3, type: "storage" },
        meshBuffer: { group: 1, binding: 4, type: "storage" },
        lodMeshBuffer: { group: 1, binding: 5, type: "storage" },
        objectInfoBuffer: { group: 1, binding: 6, type: "storage" },
        instanceInfoBuffer: { group: 1, binding: 7, type: "storage" }
      }
    });
    this.geometry = new Geometry();
    this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(1)));
    this.initialized = true;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    const frameBuffer = resources.getResource(MeshletPassParams.FrameBuffer);
    const vertexBuffer = resources.getResource(MeshletPassParams.VertexBuffer);
    const meshletVerticesBuffer = resources.getResource(MeshletPassParams.MeshletVerticesBuffer);
    const meshletTrianglesBuffer = resources.getResource(MeshletPassParams.MeshletTrianglesBuffer);
    const meshletBuffer = resources.getResource(MeshletPassParams.MeshletBuffer);
    const meshBuffer = resources.getResource(MeshletPassParams.MeshBuffer);
    const lodMeshBuffer = resources.getResource(MeshletPassParams.LodMeshBuffer);
    const objectInfoBuffer = resources.getResource(MeshletPassParams.ObjectInfoBuffer);
    const instanceInfoBuffer = resources.getResource(MeshletPassParams.InstanceInfoBuffer);
    this.shader.SetBuffer("frameBuffer", frameBuffer);
    this.shader.SetBuffer("vertexBuffer", vertexBuffer);
    this.shader.SetBuffer("meshletVerticesBuffer", meshletVerticesBuffer);
    this.shader.SetBuffer("meshletTrianglesBuffer", meshletTrianglesBuffer);
    this.shader.SetBuffer("meshletBuffer", meshletBuffer);
    this.shader.SetBuffer("meshBuffer", meshBuffer);
    this.shader.SetBuffer("lodMeshBuffer", lodMeshBuffer);
    this.shader.SetBuffer("objectInfoBuffer", objectInfoBuffer);
    this.shader.SetBuffer("instanceInfoBuffer", instanceInfoBuffer);
  }
  async execute(resources) {
    if (!this.initialized) return;
    const gBufferAlbedoRT = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const gBufferNormalRT = resources.getResource(GPU.PassParams.GBufferNormal);
    const gBufferERMORT = resources.getResource(GPU.PassParams.GBufferERMO);
    const gBufferDepthRT = resources.getResource(GPU.PassParams.GBufferDepth);
    const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.DrawIndirectBuffer);
    const colorTargets = [
      { target: gBufferAlbedoRT, clear: false },
      { target: gBufferNormalRT, clear: false },
      { target: gBufferERMORT, clear: false }
    ];
    GPU.RendererContext.BeginRenderPass(`IGBuffer - prepass: ${1}`, colorTargets, { target: gBufferDepthRT, clear: false }, true);
    GPU.RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer);
    GPU.RendererContext.EndRenderPass();
  }
}

export { IndirectGBufferPass };
