import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { Mesh } from "../../components/Mesh";
import { Transform } from "../../components/Transform";
import { PassParams } from "../RenderingPipeline";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Renderer } from "../Renderer";
import { BoundingVolume } from "../../math/BoundingVolume";
import { DynamicBufferMemoryAllocator } from "../MemoryAllocator";

export class DeferredGBufferPass extends RenderPass {
    public name: string = "DeferredMeshRenderPass";
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
            this.boundingVolume.copy(mesh.GetGeometry().boundingVolume);
            this.boundingVolume
            if (camera.frustum.intersectsBoundingVolume(mesh.GetGeometry().boundingVolume) === true) {
                nonOccluded.push(mesh);
            }
        }
        return nonOccluded;
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;

        const scene = Camera.mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Mesh);
        // const meshes = this.frustumCull(Camera.mainCamera, scene.GetComponents(Mesh));
        Renderer.info.visibleObjects = meshes.length;
        const instancedMeshes = scene.GetComponents(InstancedMesh);
        if (meshes.length === 0 && instancedMeshes.length === 0) return;

        const inputCamera = Camera.mainCamera;
        if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
        const backgroundColor = inputCamera.backgroundColor;
        
        const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
        const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);

        // Update meshes matrix buffer
        for (const mesh of meshes) {
            if (!mesh.enabled) continue;

            const geometry = mesh.GetGeometry();
            if (!geometry) continue;

            const i = this.modelMatrixBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
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

        let meshCount = 0;
        for (const mesh of meshes) {
            if (!mesh.enabled) continue;

            const geometry = mesh.GetGeometry();
            if (!geometry) continue;

            const materials = mesh.GetMaterials();
            for (const material of materials) {
                if (material.params.isDeferred === false) continue;
                if (!material.shader) {
                    material.createShader().then(shader => {
                        // shader.params.cullMode = "back"
                    })
                    continue;
                }
                const shader = material.shader;
                shader.SetMatrix4("projectionMatrix", projectionMatrix);
                shader.SetMatrix4("viewMatrix", viewMatrix);
                // shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
                shader.SetBuffer("modelMatrix", this.modelMatrixBuffer.getBuffer());

                shader.SetVector3("cameraPosition", inputCamera.transform.position);
                RendererContext.DrawGeometry(geometry, shader, 1, meshCount);
                if (geometry.index) {
                    Renderer.info.triangleCount += geometry.index.array.length / 3;
                }
            }

            meshCount++;
        }

        for (const instancedMesh of instancedMeshes) {
            const geometry = instancedMesh.GetGeometry();
            const materials = instancedMesh.GetMaterials();
            for (const material of materials) {
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
                if (geometry.index) {
                    Renderer.info.triangleCount = geometry.index.array.length / 3 * (instancedMesh.instanceCount + 1);
                }
                else {
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