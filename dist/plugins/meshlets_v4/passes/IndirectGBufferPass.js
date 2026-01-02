import { GPU, Scene, Geometry, VertexAttribute } from '@trident/core';
import { MeshletPassParams } from './MeshletDraw.js';

class IndirectGBufferPass extends GPU.RenderPass {
  name = "IndirectGBufferPass";
  shader;
  geometry;
  dummyTexture;
  async init(resources) {
    const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;
    this.shader = await GPU.Shader.Create({
      name: this.name,
      code: await GPU.ShaderLoader.LoadURL(new URL("../resources/DrawIndirectGBuffer.wgsl", import.meta.url)),
      colorOutputs: [
        { format: gbufferFormat },
        { format: gbufferFormat },
        { format: gbufferFormat }
      ],
      depthOutput: "depth24plus"
    });
    this.geometry = new Geometry();
    this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(1)));
    this.shader.SetSampler("TextureSampler", GPU.TextureSampler.Create());
    this.dummyTexture = GPU.Texture.Create(1, 1);
    this.initialized = true;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
    if (currentMeshletCount === 0) return;
    const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    const vertexBuffer = resources.getResource(MeshletPassParams.VertexBuffer);
    const meshletTrianglesBuffer = resources.getResource(MeshletPassParams.MeshletTrianglesBuffer);
    const meshletBuffer = resources.getResource(MeshletPassParams.MeshletBuffer);
    const meshBuffer = resources.getResource(MeshletPassParams.MeshBuffer);
    const lodMeshBuffer = resources.getResource(MeshletPassParams.LodMeshBuffer);
    const materialInfoBuffer = resources.getResource(MeshletPassParams.MaterialInfoBuffer);
    const objectInfoBuffer = resources.getResource(MeshletPassParams.ObjectInfoBuffer);
    const instanceInfoBuffer = resources.getResource(MeshletPassParams.InstanceInfoBuffer);
    this.shader.SetBuffer("frameBuffer", frameBuffer);
    this.shader.SetBuffer("vertexBuffer", vertexBuffer);
    this.shader.SetBuffer("meshletTrianglesBuffer", meshletTrianglesBuffer);
    this.shader.SetBuffer("meshletBuffer", meshletBuffer);
    this.shader.SetBuffer("meshBuffer", meshBuffer);
    this.shader.SetBuffer("lodMeshBuffer", lodMeshBuffer);
    this.shader.SetBuffer("materialInfoBuffer", materialInfoBuffer);
    this.shader.SetBuffer("objectInfoBuffer", objectInfoBuffer);
    this.shader.SetBuffer("instanceInfoBuffer", instanceInfoBuffer);
  }
  async execute(resources) {
    if (!this.initialized) return;
    const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
    if (currentMeshletCount === 0) return;
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
    GPU.RendererContext.BeginRenderPass(`Meshlets - Draw prepass: ${1}`, colorTargets, { target: gBufferDepthRT, clear: false }, true);
    const frameMeshlets = resources.getResource(MeshletPassParams.FrameMeshlets);
    let materialIndex = 0;
    for (const [material] of frameMeshlets) {
      const albedoMap = material.params.albedoMap ? material.params.albedoMap : this.dummyTexture;
      const normalMap = material.params.normalMap ? material.params.normalMap : this.dummyTexture;
      const metalnessMap = material.params.metalnessMap ? material.params.metalnessMap : this.dummyTexture;
      this.shader.SetTexture("AlbedoMap", albedoMap);
      this.shader.SetTexture("NormalMap", normalMap);
      this.shader.SetTexture("MetalnessMap", metalnessMap);
      GPU.RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer, materialIndex * 16);
      materialIndex++;
    }
    GPU.RendererContext.EndRenderPass();
  }
}

export { IndirectGBufferPass };
