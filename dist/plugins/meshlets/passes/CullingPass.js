import { GPU, Renderer } from '@trident/core';
import { MeshletPassParams } from './MeshletDraw.js';
import { MeshletDebug } from '../MeshletDebug.js';

class CullingPass extends GPU.RenderPass {
  name = "CullingPass";
  instanceInfoBuffer;
  compute;
  debugBuffer;
  visibleObjects = 0;
  triangleCount = 0;
  visibleTriangles = 0;
  async init(resources) {
    this.compute = await GPU.ShaderCompute.Create({
      name: this.name,
      code: await GPU.ShaderLoader.LoadURL(new URL("../resources/CullingPass.wgsl", import.meta.url)),
      computeEntrypoint: "main"
    });
    this.debugBuffer = new GPU.Buffer(4 * 4, GPU.BufferType.STORAGE);
    this.instanceInfoBuffer = new GPU.Buffer(8, GPU.BufferType.STORAGE_WRITE);
    this.compute.SetBuffer("instanceInfoBuffer", this.instanceInfoBuffer);
  }
  preFrame(resources) {
    const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
    if (currentMeshletCount === 0) return;
    const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    const meshletParams = resources.getResource(MeshletPassParams.MeshletParams);
    const meshletInfoBuffer = resources.getResource(MeshletPassParams.MeshletBuffer);
    const meshInfoBuffer = resources.getResource(MeshletPassParams.MeshBuffer);
    const lodMeshBuffer = resources.getResource(MeshletPassParams.LodMeshBuffer);
    const objectInfoBuffer = resources.getResource(MeshletPassParams.ObjectInfoBuffer);
    const drawIndirectBuffer = resources.getResource(MeshletPassParams.DrawIndirectBuffer);
    const frameMeshlets = resources.getResource(MeshletPassParams.FrameMeshlets);
    const drawInit = new Uint32Array(frameMeshlets.size * 4);
    let running = 0;
    let m = 0;
    for (const survivors of frameMeshlets.values()) {
      drawInit[m * 4 + 0] = 128 * 3;
      drawInit[m * 4 + 1] = 0;
      drawInit[m * 4 + 2] = 0;
      drawInit[m * 4 + 3] = running;
      running += survivors;
      m++;
    }
    drawIndirectBuffer.SetArray(drawInit);
    const requiredBytes = Math.max(8, running * 2 * 4);
    if (requiredBytes > this.instanceInfoBuffer.size) {
      this.instanceInfoBuffer = new GPU.Buffer(requiredBytes, GPU.BufferType.STORAGE_WRITE);
      this.compute.SetBuffer("instanceInfoBuffer", this.instanceInfoBuffer);
    }
    this.compute.SetBuffer("drawBuffer", drawIndirectBuffer);
    this.compute.SetBuffer("meshletInfoBuffer", meshletInfoBuffer);
    this.compute.SetBuffer("meshInfoBuffer", meshInfoBuffer);
    this.compute.SetBuffer("lodMeshBuffer", lodMeshBuffer);
    this.compute.SetBuffer("objectInfoBuffer", objectInfoBuffer);
    this.compute.SetBuffer("frameBuffer", frameBuffer);
    this.compute.SetBuffer("meshletParamsBuffer", meshletParams);
    resources.setResource(MeshletPassParams.InstanceInfoBuffer, this.instanceInfoBuffer);
  }
  execute(resources) {
    const currentMeshletCount = resources.getResource(MeshletPassParams.CurrentMeshletCount);
    if (currentMeshletCount === 0) return;
    const maxInstanceCount = Math.max(1, resources.getResource(MeshletPassParams.MaxInstanceCount) ?? 1);
    GPU.ComputeContext.BeginComputePass(`Meshlets - Culling`, true);
    GPU.ComputeContext.Dispatch(
      this.compute,
      Math.ceil(currentMeshletCount / 8),
      Math.ceil(maxInstanceCount / 32),
      1
    );
    GPU.ComputeContext.EndComputePass();
    console.log(currentMeshletCount * maxInstanceCount * 1);
    Renderer.info.visibleObjects += this.visibleObjects;
    Renderer.info.triangleCount += this.triangleCount;
    Renderer.info.visibleTriangles += this.visibleTriangles;
    this.debugBuffer.GetData().then((v) => {
      const visibleMeshletCount = new Uint32Array(v)[1];
      MeshletDebug.visibleMeshes.SetValue(visibleMeshletCount);
      this.visibleObjects = visibleMeshletCount;
      this.triangleCount = 128 * currentMeshletCount;
      this.visibleTriangles = 128 * visibleMeshletCount;
    });
  }
}

export { CullingPass };
