import { GPU, Components } from '@trident/core';
import { Heap } from './Heap.js';
import { BindlessMesh } from './BindlessMesh.js';
import { BINDLESS_WGSL } from './BindlessPassCommon.js';
import { BindlessCamera } from './BindlessCamera.js';

class BindlessDrawPass extends GPU.RenderPass {
  name = "BindlessDrawPass";
  shader;
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: `#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
` + BINDLESS_WGSL + `

            struct VertexOutput {
                @builtin(position) position: vec4f,
                @location(0) normal: vec3f,
                @location(1) @interpolate(flat) material: u32,
            };

            @vertex
            fn vertexMain(@builtin(vertex_index) vi: u32, @builtin(instance_index) drawPtr: u32) -> VertexOutput {
                let draw = loadDraw(drawPtr);
                let geo  = loadGeometry(draw.geometry);
                let cam  = loadCamera(draw.camera);

                let localInstance = vi / geo.indexCount;
                let localVertex   = vi % geo.indexCount;

                let vertexId = U32At(geo.indices, localVertex);
                let position = Vec3At(geo.positions, vertexId);
                let normal   = Vec3At(geo.normals, vertexId);
                let model    = Mat4At(draw.transforms, localInstance);

                var output: VertexOutput;
                output.position = cam.projection * cam.view * model * vec4f(position, 1.0);
                output.normal   = normalize(model * vec4f(normal, 0.0)).xyz;
                output.material = draw.material;
                return output;
            }

            struct FragmentOutput {
                @location(0) albedo: vec4f,
                @location(1) normal: vec4f,
                @location(2) ermo:   vec4f,
            };

            @fragment
            fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                let mat = loadMaterial(input.material);

                var output: FragmentOutput;
                output.albedo = vec4f(mat.albedo.rgb, mat.roughness);
                output.normal = vec4f(OctEncode(normalize(input.normal)), 1.0, mat.metalness);
                output.ermo   = vec4f(mat.emissive.rgb, mat.unlit);
                return output;
            }
        `,
      colorOutputs: Array(3).fill({ format: GPU.RenderingPipeline.GBufferFormat }),
      depthOutput: "depth24plus"
    });
    this.shader.SetBuffer("data", Heap.buffer);
    this.initialized = true;
  }
  preFrame(resources) {
    if (!this.initialized) return;
    BindlessCamera.Update(Components.Camera.mainCamera);
    for (const mesh of BindlessMesh.Instances) {
      if (mesh.enabled && mesh.gameObject.enabled) mesh.OnPreFrame();
    }
  }
  async execute(resources) {
    if (!this.initialized) return;
    GPU.RendererContext.BeginRenderPass(this.name, [
      { target: resources.getResource(GPU.PassParams.GBufferAlbedo), clear: false },
      { target: resources.getResource(GPU.PassParams.GBufferNormal), clear: false },
      { target: resources.getResource(GPU.PassParams.GBufferERMO), clear: false }
    ], { target: resources.getResource(GPU.PassParams.GBufferDepth), clear: false }, true);
    for (const mesh of BindlessMesh.Instances) {
      if (!mesh.enabled || !mesh.gameObject.enabled) continue;
      GPU.RendererContext.DrawVertex(this.shader, mesh.vertexCount, 1, 0, mesh.drawPtr);
    }
    GPU.RendererContext.EndRenderPass();
  }
}

export { BindlessDrawPass };
