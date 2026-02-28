import { Camera } from "../../components/Camera";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { PassParams } from "../RenderingPipeline";
import { Renderable } from "../../components/Renderable";
import { FrameRenderData } from "./SceneExtractPass";

export class RenderablePass extends RenderPass {
    public name: string = "RenderablePass";
    private renderables: Renderable[] = [];

    public async preFrame(resources: ResourcePool) {
        this.renderables.length = 0;

        const FrameBuffer = resources.getResource(PassParams.FrameBuffer);
        const frameData = resources.getResource(PassParams.FrameRenderData) as FrameRenderData;
        if (!frameData) return;
        for (const renderable of frameData.deferredRenderables) {
            renderable.OnPreFrame();

            if (!renderable.material || !renderable.material.shader) continue;
            renderable.material.shader.SetBuffer("frameBuffer", FrameBuffer);

            this.renderables.push(renderable);
        }
    }

    public async preRender(resources: ResourcePool) {
        for (const renderable of this.renderables) {
            if (!renderable.gameObject.enabled) continue;
            renderable.OnPreRender();
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
                { target: inputGBufferAlbedo, clear: false, color: backgroundColor },
                { target: inputGBufferNormal, clear: false, color: backgroundColor },
                { target: inputGBufferERMO, clear: false, color: backgroundColor },
            ],
            { target: inputGBufferDepth, clear: false }
            , true);

        for (const renderable of this.renderables) {
            if (!renderable.gameObject.enabled) continue;
            renderable.OnRenderObject();
        }

        resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
        resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
        resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
        resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);

        RendererContext.EndRenderPass();
    }
}