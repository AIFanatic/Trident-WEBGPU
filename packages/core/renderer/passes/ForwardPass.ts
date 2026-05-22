import { RenderPass, ResourcePool } from "../RenderGraph";
import { RendererContext } from "../RendererContext";
import { PassParams } from "../RenderingPipeline";
import { FrameRenderData } from "./SceneExtractPass";
import { Renderable } from "@trident/core/components/Renderable";

export class ForwardPass extends RenderPass {
    public name: string = "ForwardPass";

    private renderables: Renderable[] = [];

    public async preFrame(resources: ResourcePool) {
        this.renderables.length = 0;

        const FrameBuffer = resources.getResource(PassParams.FrameBuffer);
        const frameData = resources.getResource(PassParams.FrameRenderData) as FrameRenderData;
        if (!frameData) return;
        for (const renderable of frameData.forwardRenderables) {
            renderable.OnPreFrame();
            renderable.material.shader.SetBuffer("frameBuffer", FrameBuffer);
            this.renderables.push(renderable);
        }
    }

    public preRender(resources: ResourcePool) {
        for (const renderable of this.renderables) renderable.OnPreRender();
    }

    public execute(resources: ResourcePool) {
        if (this.renderables.length === 0) return;

        const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
        const DepthPassOutput = resources.getResource(PassParams.GBufferDepth);

        RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], { target: DepthPassOutput, clear: false }, true);
        for (const renderable of this.renderables) renderable.OnRenderObject();
        RendererContext.EndRenderPass();
    }
}