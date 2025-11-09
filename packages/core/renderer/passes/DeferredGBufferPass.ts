import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Mesh } from "../../components/Mesh";
import { SkinnedMesh } from "../../components/SkinnedMesh";
import { PassParams } from "../RenderingPipeline";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Renderer } from "../Renderer";
import { DynamicBufferMemoryAllocator } from "../MemoryAllocator";

export class DeferredGBufferPass extends RenderPass {
    public name: string = "DeferredGBufferPass";
    private modelMatrixBuffer: DynamicBufferMemoryAllocator;

    public async init(resources: ResourcePool) {
        this.modelMatrixBuffer = new DynamicBufferMemoryAllocator(16 * 4 * 1000);
        this.initialized = true;
    }

    // TODO: This still has bugs...specially with SkinnedMeshes and/or Transformed meshes.
    // Disabled for now
    private frustumCull(camera: Camera, meshes: Mesh[]): Mesh[] {
        let nonOccluded: Mesh[] = [];
        for (const mesh of meshes) {
            // if (camera.frustum.intersectsBoundingVolume(mesh.bounds) === true) {
                nonOccluded.push(mesh);
            // }
        }
        return nonOccluded;
    }

    public async preFrame(resources: ResourcePool) {
        this.drawCommands.length = 0;
        if (!this.initialized) return;

        const scene = Camera.mainCamera.gameObject.scene;
        const allMeshes = scene.GetComponents(Mesh);
        let renderableMeshes: Mesh[] = [];
        for (const mesh of allMeshes) {
            if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.geometry || !mesh.material || (mesh.constructor !== Mesh && mesh.constructor !== SkinnedMesh)) continue;
            renderableMeshes.push(mesh);
        }
        renderableMeshes = this.frustumCull(Camera.mainCamera, renderableMeshes);

        Renderer.info.visibleObjects += renderableMeshes.length;
        const instancedMeshes = scene.GetComponents(InstancedMesh);
        if (renderableMeshes.length === 0 && instancedMeshes.length === 0) return;

        const inputCamera = Camera.mainCamera;
        if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);

        const projectionMatrix = inputCamera.projectionMatrix;
        const viewMatrix = inputCamera.viewMatrix;
        
        for (const mesh of renderableMeshes) {
            // Update meshes matrix buffer
            const offset = this.modelMatrixBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
            const matrixIndex = offset / 16; // 16 floats per mat4
            const geometry = mesh.geometry;
            const material = mesh.material;
            if (material.params.isDeferred === false) continue;
            if (!material.shader) continue;
            const shader = material.shader;
            shader.SetMatrix4("projectionMatrix", projectionMatrix);
            shader.SetMatrix4("viewMatrix", viewMatrix);
            shader.SetBuffer("modelMatrix", this.modelMatrixBuffer.getBuffer());

            shader.SetVector3("cameraPosition", inputCamera.transform.position);
            if (mesh instanceof SkinnedMesh) {
                shader.SetBuffer("boneMatrices", mesh.GetBoneMatricesBuffer());
            }
            this.drawCommands.push({geometry: geometry, shader: shader, instanceCount: 1, firstInstance: matrixIndex});
            
            // Debug
            const position = geometry.attributes.get("position");
            Renderer.info.vertexCount += position.array.length / 3;
            Renderer.info.triangleCount += geometry.index ? geometry.index.array.length / 3 : position.array.length / 3;
        }

        for (const instancedMesh of instancedMeshes) {
            const geometry = instancedMesh.geometry
            const material = instancedMesh.material
            if (material.params.isDeferred === false) continue;
            if (!material.shader) continue;
            const shader = material.shader;
            shader.SetMatrix4("projectionMatrix", projectionMatrix);
            shader.SetMatrix4("viewMatrix", viewMatrix);
            shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
            shader.SetVector3("cameraPosition", inputCamera.transform.position);
            this.drawCommands.push({geometry: geometry, shader: shader, instanceCount: instancedMesh.instanceCount+1, firstInstance: 0});

            // Debug
            const position = geometry.attributes.get("position");
            Renderer.info.vertexCount += (position.array.length / 3) * instancedMesh.instanceCount;
            Renderer.info.triangleCount += (geometry.index ? geometry.index.array.length / 3 : position.array.length / 3) * instancedMesh.instanceCount;
        }
    }

    public async execute(resources: ResourcePool) {
        if (!this.initialized) return;
        if (this.drawCommands.length === 0) return;

        const inputCamera = Camera.mainCamera;
        if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
        const backgroundColor = inputCamera.backgroundColor;

        const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
        const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);

        RendererContext.BeginRenderPass(this.name,
            [
                {target: inputGBufferAlbedo, clear: false, color: backgroundColor},
                {target: inputGBufferNormal, clear: false, color: backgroundColor},
                {target: inputGBufferERMO, clear: false, color: backgroundColor},
            ],
            {target: inputGBufferDepth, clear: false}
        , true);

        for (const draw of this.drawCommands) {
            RendererContext.DrawGeometry(draw.geometry, draw.shader, draw.instanceCount, draw.firstInstance);
        }

        resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
        resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
        resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
        resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);

        RendererContext.EndRenderPass();
    }
}