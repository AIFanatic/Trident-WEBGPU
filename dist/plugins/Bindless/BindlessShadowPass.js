import { GPU } from '@trident/core';
import { Heap, VBuffer } from './Heap.js';
import { BINDLESS_WGSL } from './BindlessPassCommon.js';
import { BindlessMesh } from './BindlessMesh.js';

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
class BindlessShadowPass extends GPU.RenderPass {
  name = "BindlessShadowPass";
  shader;
  lightCameras = /* @__PURE__ */ new Map();
  // light.id -> per-cascade camera records
  drawRecords = /* @__PURE__ */ new Map();
  // mesh.id/light.id/cascade -> draw record
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: BINDLESS_WGSL + `
                @vertex
                fn vertexMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) drawPtr: u32) -> @builtin(position) vec4f {
                    let draw = loadDraw(drawPtr);
                    let geo  = loadGeometry(draw.geometry);
                    let cam  = loadCamera(draw.camera);

                    let localInstance = vi / geo.indexCount;
                    let vertexId = U32At(geo.indices, vi % geo.indexCount);
                    let position = Vec3At(geo.positions, vertexId);
                    let model    = Mat4At(draw.transforms, localInstance);

                    return cam.projection * cam.view * model * vec4f(position, 1.0);
                }

                @fragment
                fn fragmentMain() -> @location(0) vec4<f32> { return vec4(1.0); }
                `,
      colorOutputs: [],
      depthOutput: "depth24plus",
      cullMode: "front",
      depthBias: 1,
      depthBiasSlopeScale: 1
    });
    this.shader.SetBuffer("data", Heap.buffer);
    this.initialized = true;
  }
  preFrame(resources) {
    if (!this.initialized) return;
    const shadowData = resources.getResource(GPU.PassParams.ShadowPassCascadeData);
    if (!shadowData) return;
    for (const [lightId, info] of shadowData) {
      let cams = this.lightCameras.get(lightId);
      if (!cams) {
        cams = [];
        for (let c = 0; c < 4; c++) {
          const cam = new VBuffer(32);
          cam.SetArray(IDENTITY, 16);
          cams.push(cam);
        }
        this.lightCameras.set(lightId, cams);
      }
      for (let c = 0; c < info.numCascades; c++) {
        cams[c].SetArray(info.projectionMatrices.subarray(c * 16, (c + 1) * 16), 0);
      }
      for (const mesh of BindlessMesh.Instances) {
        if (!mesh.ready) continue;
        for (let c = 0; c < info.numCascades; c++) {
          const key = `${mesh.id}/${lightId}/${c}`;
          if (this.drawRecords.has(key)) continue;
          const rec = new VBuffer(4);
          rec.SetArray(new Uint32Array([mesh.geometryPtr, mesh.transformPtr, cams[c].ptr, 0]));
          this.drawRecords.set(key, rec);
        }
      }
    }
  }
  execute(resources) {
    if (!this.initialized) return;
    const shadowData = resources.getResource(GPU.PassParams.ShadowPassCascadeData);
    const atlas = resources.getResource(GPU.PassParams.ShadowPassDepth);
    if (!shadowData || shadowData.size === 0 || !atlas) return;
    for (const [lightId, info] of shadowData) {
      atlas.SetActiveLayer(info.shadowMapIndex);
      for (let c = 0; c < info.numCascades; c++) {
        GPU.RendererContext.BeginRenderPass(this.name, [], { target: atlas, clear: false }, true);
        const vp = info.cascadeViewports[c];
        if (vp) GPU.RendererContext.SetViewport(vp.x, vp.y, vp.width, vp.height, 0, 1);
        for (const mesh of BindlessMesh.Instances) {
          if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.ready) continue;
          const rec = this.drawRecords.get(`${mesh.id}/${lightId}/${c}`);
          if (rec) GPU.RendererContext.DrawVertex(this.shader, mesh.vertexCount, 1, 0, rec.ptr);
        }
        GPU.RendererContext.EndRenderPass();
      }
    }
    atlas.SetActiveLayer(0);
  }
}

export { BindlessShadowPass };
