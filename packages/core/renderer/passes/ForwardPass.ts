import { RenderPass, ResourcePool } from "../RenderGraph";
import { RendererContext } from "../RendererContext";
import { PassParams } from "../RenderingPipeline";
import { Camera } from "../../components/Camera";
import { Mesh } from "../../components/Mesh";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Buffer, BufferType } from "../Buffer";
import { DynamicBufferMemoryAllocator } from "../MemoryAllocator";

export class ForwardPass extends RenderPass {
    public name: string = "ForwardPass";

    private projectionMatrix: Buffer;
    private viewMatrix: Buffer;

    private modelMatrices: DynamicBufferMemoryAllocator;

    public async init(resources: ResourcePool) {
        this.projectionMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.viewMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.modelMatrices = new DynamicBufferMemoryAllocator(16 * 4 * 10);
        this.initialized = true;
    }

    public async preFrame(resources: ResourcePool) {
        this.drawCommands.length = 0;

        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Mesh);
        const instancedMeshes = scene.GetComponents(InstancedMesh);
        if (meshes.length === 0 && instancedMeshes.length === 0) return;

        this.projectionMatrix.SetArray(mainCamera.projectionMatrix.elements);
        this.viewMatrix.SetArray(mainCamera.viewMatrix.elements);

        for (const mesh of meshes) {
            const geometry = mesh.geometry;
            const material = mesh.material;

            if (!geometry || !material) continue;
            if (!geometry.attributes.has("position")) continue;

            if (material.params.isDeferred === true) continue;
            if (!material.shader) continue;

            const offset = this.modelMatrices.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
            const matrixIndex = offset / 16;
            material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
            material.shader.SetBuffer("viewMatrix", this.viewMatrix);
            material.shader.SetBuffer("modelMatrix", this.modelMatrices.getBuffer());

            this.drawCommands.push({ geometry: geometry, shader: material.shader, instanceCount: 1, firstInstance: matrixIndex })
        }

        for (const instancedMesh of instancedMeshes) {
            if (instancedMesh.instanceCount === 0) continue;

            const geometry = instancedMesh.geometry;
            const material = instancedMesh.material;

            if (!geometry || !material) continue;
            if (!geometry.attributes.has("position")) continue;


            if (material.params.isDeferred === true) continue;
            if (!material.shader) continue;

            material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
            material.shader.SetBuffer("viewMatrix", this.viewMatrix);
            material.shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
            this.drawCommands.push({ geometry: geometry, shader: material.shader, instanceCount: instancedMesh.instanceCount, firstInstance: 0 })
        }
    }

    public async execute(resources: ResourcePool) {
        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        const DepthPassOutput = resources.getResource(PassParams.GBufferDepth);

        RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], { target: DepthPassOutput, clear: false }, true);
        for (const draw of this.drawCommands) {
            RendererContext.DrawGeometry(draw.geometry, draw.shader, draw.instanceCount, draw.firstInstance);
        }
        RendererContext.EndRenderPass();
    }
}