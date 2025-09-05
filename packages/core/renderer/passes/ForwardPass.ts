import { RenderPass, ResourcePool } from "../RenderGraph";
import { RendererContext } from "../RendererContext";
import { PassParams } from "../RenderingPipeline";
import { Camera } from "../../components/Camera";
import { Mesh } from "../../components/Mesh";
import { Buffer, BufferType } from "../Buffer";

export class ForwardPass extends RenderPass {
    public name: string = "ForwardPass";
    
    private projectionMatrix: Buffer;
    private viewMatrix: Buffer;
    private modelMatrix: Buffer;

    constructor() {
        super({inputs: [
            PassParams.LightingPassOutput,
        ]});
    }

    public async init(resources: ResourcePool) {
        this.projectionMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.viewMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.modelMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
        this.initialized = true;
    }

    public async execute(resources: ResourcePool) {
        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        const DepthPassOutput = resources.getResource(PassParams.GBufferDepth);

        const mainCamera = Camera.mainCamera;
        const scene = mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Mesh);
        if (!meshes) return;

        RendererContext.BeginRenderPass(this.name, [{target: LightingPassOutput, clear: false}], {target: DepthPassOutput, clear: false}, true);

        for (const mesh of meshes) {
            
            const geometry = mesh.GetGeometry();
            if (!geometry) continue;
            if (!geometry.attributes.has("position")) continue;
            
            this.projectionMatrix.SetArray(mainCamera.projectionMatrix.elements);
            this.viewMatrix.SetArray(mainCamera.viewMatrix.elements);
            this.modelMatrix.SetArray(mesh.transform.localToWorldMatrix.elements);
            
            const materials = mesh.GetMaterials();
            for (const material of materials) {
                if (material.params.isDeferred === true) continue;
                if (!material.shader) await material.createShader();

                material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
                material.shader.SetBuffer("viewMatrix", this.viewMatrix);
                material.shader.SetBuffer("modelMatrix", this.modelMatrix);

                // console.log("DRawing", geometry.attributes.get("position"))
                RendererContext.DrawGeometry(geometry, material.shader);

            }
        }
        RendererContext.EndRenderPass();
    }
}