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

    constructor() {
        super({inputs: [
            PassParams.LightingPassOutput,
        ]});
    }

    public async init(resources: ResourcePool) {
        this.projectionMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.viewMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.modelMatrices = new DynamicBufferMemoryAllocator(16 * 4 * 10);
        this.initialized = true;
    }

    public async execute(resources: ResourcePool) {
        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        const DepthPassOutput = resources.getResource(PassParams.GBufferDepth);

        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Mesh);
        const instancedMeshes = scene.GetComponents(InstancedMesh);
        if (meshes.length === 0 && instancedMeshes.length === 0) return;

        RendererContext.BeginRenderPass(this.name, [{target: LightingPassOutput, clear: false}], {target: DepthPassOutput, clear: false}, true);
        
        this.projectionMatrix.SetArray(mainCamera.projectionMatrix.elements);
        this.viewMatrix.SetArray(mainCamera.viewMatrix.elements);

        let meshCount = 0;
        for (const mesh of meshes) {
            const geometry = mesh.geometry;
            const material = mesh.material;
            
            if (!geometry || !material) continue;
            if (!geometry.attributes.has("position")) continue;
            
            if (material.params.isDeferred === true) continue;
            if (!material.shader) await material.createShader();
            
            this.modelMatrices.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
            material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
            material.shader.SetBuffer("viewMatrix", this.viewMatrix);
            material.shader.SetBuffer("modelMatrix", this.modelMatrices.getBuffer());

            RendererContext.DrawGeometry(geometry, material.shader, 1, meshCount);
            meshCount++; // This only works with meshes that only have one material
        }

        for (const instancedMesh of instancedMeshes) {
            if (instancedMesh.instanceCount === 0) continue;

            const geometry = instancedMesh.geometry;
            const material = instancedMesh.material;

            if (!geometry || !material) continue;
            if (!geometry.attributes.has("position")) continue;


            if (material.params.isDeferred === true) continue;
            if (!material.shader) await material.createShader();

            material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
            material.shader.SetBuffer("viewMatrix", this.viewMatrix);
            material.shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
            RendererContext.DrawGeometry(geometry, material.shader, instancedMesh.instanceCount, 0);
        }

        RendererContext.EndRenderPass();
    }
}