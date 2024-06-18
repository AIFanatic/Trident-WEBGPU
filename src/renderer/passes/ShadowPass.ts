import { Camera } from "../../components/Camera";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture } from "../Texture";
import { RendererContext } from "../RendererContext";
import { Light } from "../../components/Light";
import { Mesh } from "../../components/Mesh";
import { ShadowMaterial } from "../Material";
import { InstancedMesh } from "../../components/InstancedMesh";

export class ShadowPass extends RenderPass {
    public name: string = "ShadowPass";
    
    private shadowDepthDT: DepthTexture;
    private shadowWidth = 1024;
    private shadowHeight = 1024;

    constructor(outputDepthDT: string) {
        super({outputs: [outputDepthDT]});

        this.shadowDepthDT = DepthTexture.Create(this.shadowWidth, this.shadowHeight, 2);
    }

    public execute(resources: ResourcePool, outputDepthDT: string) {
        const scene = Camera.mainCamera.gameObject.scene;

        const lights = scene.GetComponents(Light);
        const meshes = scene.GetComponents(Mesh);
        const instancedMeshes = scene.GetComponents(InstancedMesh);
        
        this.shadowDepthDT.currentLayer = 0;

        for (const sceneLight of lights) {
            RendererContext.BeginRenderPass("ShadowPass", [], {target: this.shadowDepthDT, clear: true});
            for (const mesh of meshes) {
                const shadowMaterials = mesh.GetMaterials(ShadowMaterial);
    
                for (const shadowMaterial of shadowMaterials) {
                    const light = shadowMaterial.light;
                    if (light !== sceneLight) continue;
                    const shader = shadowMaterial.shader;
                    shader.SetMatrix4("projectionMatrix", light.camera.projectionMatrix);
                    shader.SetMatrix4("viewMatrix", light.camera.viewMatrix);
                    shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
                    RendererContext.DrawGeometry(mesh.GetGeometry(), shader, 1);
                }
            }

            for (const instancedMesh of instancedMeshes) {
                const shadowMaterials = instancedMesh.GetMaterials(ShadowMaterial);
    
                for (const shadowMaterial of shadowMaterials) {
                    const light = shadowMaterial.light;
                    if (light !== sceneLight) continue;
                    const shader = shadowMaterial.shader;
                    shader.SetMatrix4("projectionMatrix", light.camera.projectionMatrix);
                    shader.SetMatrix4("viewMatrix", light.camera.viewMatrix);
                    shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
                    RendererContext.DrawGeometry(instancedMesh.GetGeometry(), shader, instancedMesh.instanceCount);
                }
            }

            this.shadowDepthDT.currentLayer++;
            RendererContext.EndRenderPass();
        }
        
        resources.setResource(outputDepthDT, this.shadowDepthDT);
    }
}