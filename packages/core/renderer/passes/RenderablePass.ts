import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { PassParams } from "../RenderingPipeline";
import { Scene } from "../../Scene";
import { Renderable } from "../../components/Renderable";

export class RenderablePass extends RenderPass {
    public name: string = "RenderablePass";
    private renderables: Renderable[] = [];

    public async preFrame(resources: ResourcePool) {
        this.renderables.length = 0;

        const FrameBuffer = resources.getResource(PassParams.FrameBuffer);
        const potentialRenderables = Scene.mainScene.GetComponents(Renderable);
        for (const renderable of potentialRenderables) {
            renderable.OnPreRender();

            if (!renderable.material.shader) continue;
            if (renderable.material.params.isDeferred === false) continue;
        
            renderable.material.shader.SetBuffer("frameBuffer", FrameBuffer);
            
            this.renderables.push(renderable);
        }
    }

    public async execute(resources: ResourcePool) {
        if (this.renderables.length === 0) return;
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

        for (const renderable of this.renderables) {
            renderable.OnRenderObject();
        }

        resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
        resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
        resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
        resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);

        RendererContext.EndRenderPass();
    }
}