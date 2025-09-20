import { RenderPass } from '../RenderGraph.js';
import { RendererContext } from '../RendererContext.js';
import { PassParams } from '../RenderingPipeline.js';
import { Camera } from '../../components/Camera.js';
import { Mesh } from '../../components/Mesh.js';
import { Buffer, BufferType } from '../Buffer.js';
import { DynamicBufferMemoryAllocator } from '../MemoryAllocator.js';

class ForwardPass extends RenderPass {
  name = "ForwardPass";
  projectionMatrix;
  viewMatrix;
  modelMatrices;
  constructor() {
    super({ inputs: [
      PassParams.LightingPassOutput
    ] });
  }
  async init(resources) {
    this.projectionMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
    this.viewMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
    this.modelMatrices = new DynamicBufferMemoryAllocator(16 * 4 * 10);
    this.initialized = true;
  }
  async execute(resources) {
    const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
    const DepthPassOutput = resources.getResource(PassParams.GBufferDepth);
    const mainCamera = Camera.mainCamera;
    const scene = mainCamera.gameObject.scene;
    const meshes = scene.GetComponents(Mesh);
    if (!meshes) return;
    RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], { target: DepthPassOutput, clear: false }, true);
    this.projectionMatrix.SetArray(mainCamera.projectionMatrix.elements);
    this.viewMatrix.SetArray(mainCamera.viewMatrix.elements);
    let meshCount = 0;
    for (const mesh of meshes) {
      const geometry = mesh.GetGeometry();
      if (!geometry) continue;
      if (!geometry.attributes.has("position")) continue;
      const materials = mesh.GetMaterials();
      for (const material of materials) {
        if (material.params.isDeferred === true) continue;
        if (!material.shader) await material.createShader();
        this.modelMatrices.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
        material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
        material.shader.SetBuffer("viewMatrix", this.viewMatrix);
        material.shader.SetBuffer("modelMatrix", this.modelMatrices.getBuffer());
        RendererContext.DrawGeometry(geometry, material.shader, 1, meshCount);
        meshCount++;
      }
    }
    RendererContext.EndRenderPass();
  }
}

export { ForwardPass };
