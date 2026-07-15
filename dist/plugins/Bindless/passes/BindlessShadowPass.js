import { GPU, Geometry } from '@trident/core';
import { Heap, VBuffer } from '../Heap.js';
import { BINDLESS_WGSL } from './BindlessPassCommon.js';
import { BindlessMesh } from '../components/BindlessMesh.js';
import { PassData } from './PassData.js';
import { BINDLESS_VT_WGSL, BindlessVT } from '../BindlessVT.js';

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
class BindlessShadowPass extends GPU.RenderPass {
  name = "BindlessShadowPass";
  shader;
  lightCameras = /* @__PURE__ */ new Map();
  // light.id -> per-cascade camera records
  passSlots = /* @__PURE__ */ new Map();
  dummyGeometry = new Geometry();
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: BINDLESS_WGSL + BINDLESS_VT_WGSL + `
                struct VertexOutput {
                    @builtin(position) position: vec4f,
                    @location(0) uv: vec2f,
                    @location(1) @interpolate(flat) material: u32,
                };

                @vertex
                fn vertexMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) drawPtr: u32) -> VertexOutput {
                    let draw = loadDraw(drawPtr);
                    let geo  = loadGeometry(draw.geometry);
                    let cam  = currentCamera();

                    let localInstance = vi / geo.indexCount;
                    let vertexId = U32At(geo.indices, vi % geo.indexCount);
                    let position = Vec3At(geo.positions, vertexId);
                    let model    = Mat4At(draw.transforms, localInstance);

                    var output: VertexOutput;
                    output.position = cam.projection * cam.view * model * vec4f(position, 1.0);
                    output.uv = Vec2At(geo.uvs, vertexId);
                    output.material = draw.material;
                    return output;
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let mat = loadMaterial(input.material);
                    if (mat.alphaCutoff > 0.0 && mat.albedoRegion.z > 0.0) {
                        if (SampleRegion(mat.albedoRegion, input.uv).a < mat.alphaCutoff) { discard; }
                    }
                    return vec4(1.0);
                }
            `,
      colorOutputs: [],
      depthOutput: "depth24plus",
      cullMode: "none",
      depthBias: 1,
      depthBiasSlopeScale: 1
    });
    this.shader.SetBuffer("data", Heap.buffer);
    this.shader.SetBuffer("passPtr", PassData.buffer);
    BindlessVT.Bind(this.shader);
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
        const key = `${lightId}/${c}`;
        if (!this.passSlots.has(key)) this.passSlots.set(key, PassData.Register(cams[c].ptr));
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
        PassData.Select(this.passSlots.get(`${lightId}/${c}`));
        GPU.RendererContext.BeginRenderPass(this.name, [], { target: atlas, clear: false }, true);
        const vp = info.cascadeViewports[c];
        if (vp) GPU.RendererContext.SetViewport(vp.x, vp.y, vp.width, vp.height, 0, 1);
        for (const mesh of BindlessMesh.Instances) {
          if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.ready) continue;
          for (const cmd of mesh.drawCommands) {
            if (!cmd.castShadows) continue;
            if (cmd.indirectByteOffset !== void 0) GPU.RendererContext.DrawIndirect(this.dummyGeometry, this.shader, Heap.buffer, cmd.indirectByteOffset);
            else GPU.RendererContext.DrawVertex(this.shader, cmd.vertexCount, 1, 0, cmd.drawPtr);
          }
        }
        GPU.RendererContext.EndRenderPass();
      }
    }
    atlas.SetActiveLayer(0);
  }
}

export { BindlessShadowPass };
