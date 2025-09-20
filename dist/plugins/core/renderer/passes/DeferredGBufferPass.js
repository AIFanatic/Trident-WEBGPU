import { Camera } from '../../components/Camera.js';
import { RendererContext } from '../RendererContext.js';
import { RenderPass } from '../RenderGraph.js';
import { Mesh } from '../../components/Mesh.js';
import { SkinnedMesh } from '../../components/SkinnedMesh.js';
import { PassParams } from '../RenderingPipeline.js';
import { InstancedMesh } from '../../components/InstancedMesh.js';
import { Renderer } from '../Renderer.js';
import { BoundingVolume } from '../../math/BoundingVolume.js';
import { DynamicBufferMemoryAllocator } from '../MemoryAllocator.js';

class DeferredGBufferPass extends RenderPass {
  name = "DeferredGBufferPass";
  modelMatrixBuffer;
  constructor() {
    super({
      inputs: [
        PassParams.MainCamera,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth
      ],
      outputs: []
    });
  }
  async init(resources) {
    this.modelMatrixBuffer = new DynamicBufferMemoryAllocator(16 * 4 * 1e3);
    this.initialized = true;
  }
  boundingVolume = new BoundingVolume();
  frustumCull(camera, meshes) {
    let nonOccluded = [];
    for (const mesh of meshes) {
      this.boundingVolume.copy(mesh.GetGeometry().boundingVolume);
      this.boundingVolume;
      if (camera.frustum.intersectsBoundingVolume(mesh.GetGeometry().boundingVolume) === true) {
        nonOccluded.push(mesh);
      }
    }
    return nonOccluded;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    const _meshes = [...scene.GetComponents(Mesh), ...scene.GetComponents(SkinnedMesh)];
    let meshesInfo = [];
    for (let i = 0; i < _meshes.length; i++) {
      const mesh = _meshes[i];
      if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.GetGeometry()) continue;
      meshesInfo.push({ mesh, index: i });
    }
    Renderer.info.visibleObjects = meshesInfo.length;
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    if (meshesInfo.length === 0 && instancedMeshes.length === 0) return;
    const inputCamera = Camera.mainCamera;
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const backgroundColor = inputCamera.backgroundColor;
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    for (const meshInfo of meshesInfo) {
      this.modelMatrixBuffer.set(meshInfo.mesh.id, meshInfo.mesh.transform.localToWorldMatrix.elements);
    }
    RendererContext.BeginRenderPass(
      this.name,
      [
        { target: inputGBufferAlbedo, clear: false, color: backgroundColor },
        { target: inputGBufferNormal, clear: false, color: backgroundColor },
        { target: inputGBufferERMO, clear: false, color: backgroundColor }
      ],
      { target: inputGBufferDepth, clear: false },
      true
    );
    const projectionMatrix = inputCamera.projectionMatrix;
    const viewMatrix = inputCamera.viewMatrix;
    for (const meshInfo of meshesInfo) {
      const geometry = meshInfo.mesh.GetGeometry();
      const materials = meshInfo.mesh.GetMaterials();
      for (const material of materials) {
        if (material.params.isDeferred === false) continue;
        if (!material.shader) {
          material.createShader().then((shader2) => {
          });
          continue;
        }
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetBuffer("modelMatrix", this.modelMatrixBuffer.getBuffer());
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        if (meshInfo.mesh instanceof SkinnedMesh) {
          shader.SetBuffer("boneMatrices", meshInfo.mesh.GetBoneMatricesBuffer());
        }
        RendererContext.DrawGeometry(geometry, shader, 1, meshInfo.index);
        if (geometry.index) {
          Renderer.info.triangleCount += geometry.index.array.length / 3;
        }
      }
    }
    for (const instancedMesh of instancedMeshes) {
      const geometry = instancedMesh.GetGeometry();
      const materials = instancedMesh.GetMaterials();
      for (const material of materials) {
        if (material.params.isDeferred === false) continue;
        if (!material.shader) {
          material.createShader().then((shader2) => {
          });
          continue;
        }
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount + 1);
        if (geometry.index) {
          Renderer.info.triangleCount = geometry.index.array.length / 3 * (instancedMesh.instanceCount + 1);
        } else {
          const position = geometry.attributes.get("position");
          if (position) {
            Renderer.info.triangleCount = position.array.length / 3 / 3 * (instancedMesh.instanceCount + 1);
          }
        }
      }
    }
    resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
    resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
    resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
    resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);
    RendererContext.EndRenderPass();
  }
}

export { DeferredGBufferPass };
