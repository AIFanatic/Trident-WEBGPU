import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, RenderTexture } from "../Texture";
import { Renderer } from "../Renderer";
import { DeferredMeshMaterial } from "../Material";
import { Mesh } from "../../components/Mesh";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Debugger } from "../../plugins/Debugger";

export class DeferredMeshRenderPass extends RenderPass {
    public name: string = "DeferredMeshRenderPass";

    private gbufferAlbedoRT: RenderTexture;
    private gbufferNormalRT: RenderTexture;
    private gbufferERMO: RenderTexture;
    private gbufferDepthDT: DepthTexture;
    
    constructor(inputCamera: string, outputGBufferAlbedo: string, outputGBufferNormal: string, outputGBufferERMO: string, outputGBufferDepth: string) {
        super({inputs: [inputCamera], outputs: [outputGBufferAlbedo, outputGBufferNormal, outputGBufferERMO, outputGBufferDepth]});

        this.gbufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gbufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gbufferERMO = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
        this.gbufferDepthDT = DepthTexture.Create(Renderer.width, Renderer.height, 1);
    }

    public execute(resources: ResourcePool, inputCamera: Camera, outputGBufferAlbedo: string, outputGBufferNormal: string, outputGBufferERMO: string, outputGBufferDepth: string) {
        Debugger.AddFrameRenderPass("DeferredMeshRenderPass");
        
        if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
        const backgroundColor = inputCamera.backgroundColor;
        
        RendererContext.BeginRenderPass("DeferredMeshRenderPass",
            [
                {target: this.gbufferAlbedoRT, clear: true, color: backgroundColor},
                {target: this.gbufferNormalRT, clear: true, color: backgroundColor},
                {target: this.gbufferERMO, clear: true, color: backgroundColor},
            ],
            {target: this.gbufferDepthDT, clear: true}
        );

        // SceneRenderer.Render(Camera.mainCamera.gameObject.scene, inputCamera, DeferredMeshMaterial);

        const projectionMatrix = inputCamera.projectionMatrix;
        const viewMatrix = inputCamera.viewMatrix;

        const scene = Camera.mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Mesh);
        for (const mesh of meshes) {
            const geometry = mesh.GetGeometry();
            const materials = mesh.GetMaterials(DeferredMeshMaterial);
            for (const material of materials) {
                const shader = material.shader;
                shader.SetMatrix4("projectionMatrix", projectionMatrix);
                shader.SetMatrix4("viewMatrix", viewMatrix);
                shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
                shader.SetVector3("cameraPosition", inputCamera.transform.position);
                RendererContext.DrawGeometry(geometry, shader, 1);
            }
        }

        const instancedMeshes = scene.GetComponents(InstancedMesh);
        for (const instancedMesh of instancedMeshes) {
            const geometry = instancedMesh.GetGeometry();
            const materials = instancedMesh.GetMaterials(DeferredMeshMaterial);
            for (const material of materials) {
                const shader = material.shader;
                shader.SetMatrix4("projectionMatrix", projectionMatrix);
                shader.SetMatrix4("viewMatrix", viewMatrix);
                shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
                shader.SetVector3("cameraPosition", inputCamera.transform.position);
                RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount+1);
            }
        }

        RendererContext.EndRenderPass();

        resources.setResource(outputGBufferAlbedo, this.gbufferAlbedoRT);
        resources.setResource(outputGBufferNormal, this.gbufferNormalRT);
        resources.setResource(outputGBufferERMO, this.gbufferERMO);
        resources.setResource(outputGBufferDepth, this.gbufferDepthDT);
    }
}