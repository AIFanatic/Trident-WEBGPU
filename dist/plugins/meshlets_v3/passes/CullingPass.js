import { GPU, Renderer } from '@trident/core';
import { MeshletPassParams } from './MeshletDraw.js';

class CullingPass extends GPU.RenderPass {
  name = "CullingPass";
  drawIndirectBuffer;
  instanceInfoBuffer;
  compute;
  debugBuffer;
  // Debug
  visibleObjects = 0;
  triangleCount = 0;
  visibleTriangles = 0;
  async init(resources) {
    this.compute = await GPU.Compute.Create({
      name: this.name,
      code: await GPU.ShaderLoader.LoadURL(new URL("../resources/CullingPass.wgsl", import.meta.url)),
      computeEntrypoint: "main",
      uniforms: {
        drawBuffer: { group: 0, binding: 0, type: "storage-write" },
        instanceInfoBuffer: { group: 0, binding: 1, type: "storage-write" },
        frameBuffer: { group: 0, binding: 2, type: "storage" },
        meshletInfoBuffer: { group: 0, binding: 3, type: "storage" },
        meshInfoBuffer: { group: 0, binding: 4, type: "storage" },
        lodMeshBuffer: { group: 0, binding: 5, type: "storage" },
        objectInfoBuffer: { group: 0, binding: 6, type: "storage" }
      }
    });
    this.drawIndirectBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.INDIRECT);
    this.debugBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    this.instanceInfoBuffer = GPU.Buffer.Create(1 * 1 * 4, GPU.BufferType.STORAGE_WRITE);
    this.compute.SetBuffer("drawBuffer", this.drawIndirectBuffer);
    this.compute.SetBuffer("instanceInfoBuffer", this.instanceInfoBuffer);
  }
  async preFrame(resources) {
    const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
    const frameBuffer = resources.getResource(MeshletPassParams.FrameBuffer);
    const meshletInfoBuffer = resources.getResource(MeshletPassParams.MeshletBuffer);
    const meshInfoBuffer = resources.getResource(MeshletPassParams.MeshBuffer);
    const lodMeshBuffer = resources.getResource(MeshletPassParams.LodMeshBuffer);
    const objectInfoBuffer = resources.getResource(MeshletPassParams.ObjectInfoBuffer);
    if (currentMeshletCount > this.instanceInfoBuffer.size / 1 * 4) {
      this.instanceInfoBuffer = GPU.Buffer.Create(currentMeshletCount * 1 * 4, GPU.BufferType.STORAGE_WRITE);
      this.compute.SetBuffer("instanceInfoBuffer", this.instanceInfoBuffer);
    }
    this.compute.SetBuffer("meshletInfoBuffer", meshletInfoBuffer);
    this.compute.SetBuffer("meshInfoBuffer", meshInfoBuffer);
    this.compute.SetBuffer("lodMeshBuffer", lodMeshBuffer);
    this.compute.SetBuffer("objectInfoBuffer", objectInfoBuffer);
    this.compute.SetBuffer("frameBuffer", frameBuffer);
    resources.setResource(MeshletPassParams.DrawIndirectBuffer, this.drawIndirectBuffer);
    resources.setResource(MeshletPassParams.InstanceInfoBuffer, this.instanceInfoBuffer);
  }
  async execute(resources) {
    const meshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
    GPU.RendererContext.CopyBufferToBuffer(this.drawIndirectBuffer, this.debugBuffer);
    GPU.RendererContext.ClearBuffer(this.drawIndirectBuffer);
    const dispatchSizeX = Math.ceil(Math.cbrt(meshletCount) / 4);
    const dispatchSizeY = Math.ceil(Math.cbrt(meshletCount) / 4);
    const dispatchSizeZ = Math.ceil(Math.cbrt(meshletCount) / 4);
    GPU.ComputeContext.BeginComputePass(`Culling`, true);
    GPU.ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
    GPU.ComputeContext.EndComputePass();
    Renderer.info.visibleObjects += this.visibleObjects;
    Renderer.info.triangleCount += this.triangleCount;
    Renderer.info.visibleTriangles += this.visibleTriangles;
    this.debugBuffer.GetData().then((v) => {
      const visibleMeshletCount = new Uint32Array(v)[1];
      this.visibleObjects = visibleMeshletCount;
      this.triangleCount = 128 * meshletCount;
      this.visibleTriangles = 128 * visibleMeshletCount;
    });
  }
}

export { CullingPass };
