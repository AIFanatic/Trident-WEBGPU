import { Camera } from "../../components/Camera";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture } from "../Texture";
import { RendererContext } from "../RendererContext";
import { Light } from "../../components/Light";
import { ShadowMaterial } from "../Material";
import { Renderer } from "../Renderer";
import { SceneRenderer } from "./SceneRenderer";

export class ShadowPass extends RenderPass {
    public name: string = "ShadowPass";
    
    private shadowDepthDT: DepthTexture;
    private shadowWidth = 1024;
    private shadowHeight = 1024;
    
    constructor(outputDepthDT: string) {
        super({outputs: [outputDepthDT]});

        this.shadowDepthDT = DepthTexture.Create(this.shadowWidth, this.shadowHeight);
    }

    public execute(resources: ResourcePool, outputDepthDT: string) {
        const lights = Camera.mainCamera.gameObject.scene.GetComponents(Light);
        const light = lights[0];
        const inputCamera = light.camera;
        
        RendererContext.BeginRenderPass("DeferredMeshRenderPass",
            [], {target: this.shadowDepthDT, clear: true}
        );

        RendererContext.SetViewport(0, 0, this.shadowWidth, this.shadowHeight);
        
        SceneRenderer.Render(Camera.mainCamera.gameObject.scene, inputCamera, ShadowMaterial);

        resources.setResource(outputDepthDT, this.shadowDepthDT)
        RendererContext.EndRenderPass();
    }
}