import { GPU, Geometry, VertexAttribute, Components } from '@trident/core';
import { MeshletPassParams } from './MeshletDraw.js';
import { Meshlet } from '../Meshlet.js';

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
        viewMatrix: { group: 0, binding: 0, type: "storage" },
        projectionMatrix: { group: 0, binding: 1, type: "storage" },
        instanceInfo: { group: 0, binding: 2, type: "storage" },
        meshMaterialInfo: { group: 0, binding: 3, type: "storage" },
        meshMatrixInfo: { group: 0, binding: 4, type: "storage" },
        objectInfo: { group: 0, binding: 5, type: "storage" },
        settings: { group: 0, binding: 6, type: "storage" },
        vertices: { group: 0, binding: 7, type: "storage" },
        textureSampler: { group: 0, binding: 8, type: "sampler" },
        albedoMaps: { group: 0, binding: 9, type: "texture" },
        normalMaps: { group: 0, binding: 10, type: "texture" },
        heightMaps: { group: 0, binding: 11, type: "texture" },
        metalnessMaps: { group: 0, binding: 12, type: "texture" },
        emissiveMaps: { group: 0, binding: 13, type: "texture" },
        meshletSettings: { group: 0, binding: 14, type: "storage" }
      }
    });
    this.geometry = new Geometry();
    this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(Meshlet.max_triangles * 3)));
    const materialSampler = GPU.TextureSampler.Create();
    this.shader.SetSampler("textureSampler", materialSampler);
    this.initialized = true;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    const inputIndirectVertices = resources.getResource(MeshletPassParams.indirectVertices);
    const inputIndirectMeshInfo = resources.getResource(MeshletPassParams.indirectMeshInfo);
    const inputIndirectObjectInfo = resources.getResource(MeshletPassParams.indirectObjectInfo);
    const inputIndirectMeshMatrixInfo = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo);
    const inputIndirectInstanceInfo = resources.getResource(MeshletPassParams.indirectInstanceInfo);
    const textureMaps = resources.getResource(MeshletPassParams.textureMaps);
    if (!inputIndirectVertices) return;
    if (!inputIndirectInstanceInfo) return;
    const mainCamera = Components.Camera.mainCamera;
    this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
    this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
    this.shader.SetBuffer("vertices", inputIndirectVertices);
    this.shader.SetBuffer("meshMaterialInfo", inputIndirectMeshInfo);
    this.shader.SetBuffer("objectInfo", inputIndirectObjectInfo);
    this.shader.SetBuffer("meshMatrixInfo", inputIndirectMeshMatrixInfo);
    this.shader.SetBuffer("instanceInfo", inputIndirectInstanceInfo);
    if (textureMaps.albedo) this.shader.SetTexture("albedoMaps", textureMaps.albedo);
    if (textureMaps.normal) this.shader.SetTexture("normalMaps", textureMaps.normal);
    if (textureMaps.height) this.shader.SetTexture("heightMaps", textureMaps.height);
    if (textureMaps.metalness) this.shader.SetTexture("metalnessMaps", textureMaps.metalness);
    if (textureMaps.emissive) this.shader.SetTexture("emissiveMaps", textureMaps.emissive);
    this.shader.SetArray("settings", resources.getResource(GPU.PassParams.DebugSettings));
    this.shader.SetArray("meshletSettings", resources.getResource(MeshletPassParams.meshletSettings));
  }
  async execute(resources) {
    if (!this.initialized) return;
    const gBufferAlbedoRT = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const gBufferNormalRT = resources.getResource(GPU.PassParams.GBufferNormal);
    const gBufferERMORT = resources.getResource(GPU.PassParams.GBufferERMO);
    const gBufferDepthRT = resources.getResource(GPU.PassParams.GBufferDepth);
    const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.indirectDrawBuffer);
    const colorTargets = [
      { target: gBufferAlbedoRT, clear: true },
      { target: gBufferNormalRT, clear: true },
      { target: gBufferERMORT, clear: true }
    ];
    GPU.RendererContext.BeginRenderPass(`IGBuffer - prepass: ${1}`, colorTargets, { target: gBufferDepthRT, clear: true }, true);
    GPU.RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer);
    GPU.RendererContext.EndRenderPass();
  }
}

export { IndirectGBufferPass };
