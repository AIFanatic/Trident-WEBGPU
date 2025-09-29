import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Mesh } from "../../components/Mesh";
import { SkinnedMesh } from "../../components/SkinnedMesh";
import { Transform } from "../../components/Transform";
import { PassParams } from "../RenderingPipeline";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Renderer } from "../Renderer";
import { BoundingVolume } from "../../math/BoundingVolume";
import { DynamicBufferMemoryAllocator } from "../MemoryAllocator";

export class DeferredGBufferPass extends RenderPass {
    public name: string = "DeferredGBufferPass";
    private modelMatrixBuffer: DynamicBufferMemoryAllocator;

    constructor() {
        super({
            inputs: [
                PassParams.MainCamera,
                PassParams.GBufferAlbedo,
                PassParams.GBufferNormal,
                PassParams.GBufferERMO,
                PassParams.GBufferDepth,
            ], 
            outputs: [
            ]
        });
    }

    public async init(resources: ResourcePool) {
        this.modelMatrixBuffer = new DynamicBufferMemoryAllocator(16 * 4 * 1000);
        this.initialized = true;
    }

    private boundingVolume = new BoundingVolume();
    private frustumCull(camera: Camera, meshes: Mesh[]): Mesh[] {
        let nonOccluded: Mesh[] = [];
        for (const mesh of meshes) {
            this.boundingVolume.copy(mesh.geometry.boundingVolume);
            this.boundingVolume
            if (camera.frustum.intersectsBoundingVolume(mesh.geometry.boundingVolume) === true) {
                nonOccluded.push(mesh);
            }
        }
        return nonOccluded;
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;

        const scene = Camera.mainCamera.gameObject.scene;
        const _meshes =scene.GetComponents(Mesh);
        let meshesInfo: {mesh: Mesh, index: number}[] = [];

        for (let i = 0; i < _meshes.length; i++) {
            const mesh = _meshes[i];
            if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.geometry || !mesh.material || mesh instanceof InstancedMesh) continue;
            meshesInfo.push({mesh: mesh, index: i});
        }
        // const meshes = this.frustumCull(Camera.mainCamera, scene.GetComponents(Mesh));
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

        // Update meshes matrix buffer
        for (const meshInfo of meshesInfo) {
            this.modelMatrixBuffer.set(meshInfo.mesh.id, meshInfo.mesh.transform.localToWorldMatrix.elements);
        }

        RendererContext.BeginRenderPass(this.name,
            [
                {target: inputGBufferAlbedo, clear: false, color: backgroundColor},
                {target: inputGBufferNormal, clear: false, color: backgroundColor},
                {target: inputGBufferERMO, clear: false, color: backgroundColor},
            ],
            {target: inputGBufferDepth, clear: false}
        , true);

        const projectionMatrix = inputCamera.projectionMatrix;
        const viewMatrix = inputCamera.viewMatrix;

        for (const meshInfo of meshesInfo) {
            const geometry = meshInfo.mesh.geometry;
            const material = meshInfo.mesh.material;
            if (material.params.isDeferred === false) continue;
            if (!material.shader) {
                material.createShader();
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
            
            // Debug
            const position = geometry.attributes.get("position");
            Renderer.info.vertexCount += position.array.length / 3;
            Renderer.info.triangleCount += geometry.index ? geometry.index.array.length / 3 : position.array.length / 3;
        }

        for (const instancedMesh of instancedMeshes) {
            const geometry = instancedMesh.geometry
            const material = instancedMesh.material
            if (material.params.isDeferred === false) continue;
            if (!material.shader) {
                material.createShader().then(shader => {
                    // shader.params.cullMode = "front"
                })
                continue;
            }
            const shader = material.shader;
            shader.SetMatrix4("projectionMatrix", projectionMatrix);
            shader.SetMatrix4("viewMatrix", viewMatrix);
            shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
            shader.SetVector3("cameraPosition", inputCamera.transform.position);
            RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount+1);

            // Debug
            const position = geometry.attributes.get("position");
            Renderer.info.vertexCount += (position.array.length / 3) * instancedMesh.instanceCount;
            Renderer.info.triangleCount += (geometry.index ? geometry.index.array.length / 3 : position.array.length / 3) * instancedMesh.instanceCount;
        }

        resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
        resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
        resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
        resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);

        RendererContext.EndRenderPass();
    }
}