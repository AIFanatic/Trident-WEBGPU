import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, RenderTexture } from "../Texture";
import { Renderer } from "../Renderer";
import { Material } from "../Material";
import { Mesh } from "../../components/Mesh";
import { InstancedMesh } from "../../components/InstancedMesh";
import { Debugger } from "../../plugins/Debugger";
import { PassParams } from "../RenderingPipeline";

export class DeferredGBufferPass extends RenderPass {
    public name: string = "DeferredMeshRenderPass";

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
        this.initialized = true;
    }

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;
        // Debugger.AddFrameRenderPass("DeferredMeshRenderPass");

        const scene = Camera.mainCamera.gameObject.scene;
        const meshes = scene.GetComponents(Mesh);
        if (meshes.length === 0) return;

        const inputCamera = Camera.mainCamera;
        if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
        const backgroundColor = inputCamera.backgroundColor;
        
        const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
        const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
        const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
        const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);

        // console.log("shouldClear", shouldClear)
        RendererContext.BeginRenderPass("DeferredMeshRenderPass",
            [
                {target: inputGBufferAlbedo, clear: false, color: backgroundColor},
                {target: inputGBufferNormal, clear: false, color: backgroundColor},
                {target: inputGBufferERMO, clear: false, color: backgroundColor},
            ],
            {target: inputGBufferDepth, clear: false}
        , true);

        // SceneRenderer.Render(Camera.mainCamera.gameObject.scene, inputCamera, DeferredMeshMaterial);

        const projectionMatrix = inputCamera.projectionMatrix;
        const viewMatrix = inputCamera.viewMatrix;

        for (const mesh of meshes) {
            // console.log(mesh)
            const geometry = mesh.GetGeometry();
            const materials = mesh.GetMaterials();
            for (const material of materials) {
                if (!material.shader) {
                    material.createShader();
                    continue;
                }
                const shader = material.shader;
                shader.SetMatrix4("projectionMatrix", projectionMatrix);
                shader.SetMatrix4("viewMatrix", viewMatrix);
                shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
                shader.SetVector3("cameraPosition", inputCamera.transform.position);
                RendererContext.DrawGeometry(geometry, shader, 1);
            }
        }

        // const instancedMeshes = scene.GetComponents(InstancedMesh);
        // for (const instancedMesh of instancedMeshes) {
        //     const geometry = instancedMesh.GetGeometry();
        //     const materials = instancedMesh.GetMaterials(DeferredMeshMaterial);
        //     for (const material of materials) {
        //         const shader = material.shader;
        //         shader.SetMatrix4("projectionMatrix", projectionMatrix);
        //         shader.SetMatrix4("viewMatrix", viewMatrix);
        //         shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
        //         shader.SetVector3("cameraPosition", inputCamera.transform.position);
        //         RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount+1);
        //     }
        // }

        // resources.setResource(PassParams.depthTexture, PassParams.depthTexture);
        resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
        resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
        resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
        resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);

        RendererContext.EndRenderPass();
    }
}