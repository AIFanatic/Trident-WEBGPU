import { Renderer } from "./Renderer";
import { RenderGraph } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { WEBGPUTimestampQuery } from "./webgpu/WEBGPUTimestampQuery";
import { TextureViewer } from "./passes/TextureViewer";
import { PrepareGBuffers } from "./passes/PrepareGBuffers";
import { DebuggerTextureViewer } from "./passes/DebuggerTextureViewer";
import { RendererDebug } from "./RendererDebug";
import { DeferredGBufferPass } from "./passes/DeferredGBufferPass";
export const PassParams = {
    DebugSettings: "DebugSettings",
    MainCamera: "MainCamera",
    depthTexture: "depthTexture",
    depthTexturePyramid: "depthTexturePyramid",
    GBufferAlbedo: "GBufferAlbedo",
    GBufferAlbedoClone: "GBufferAlbedoClone",
    GBufferNormal: "GBufferNormal",
    GBufferERMO: "GBufferERMO",
    GBufferDepth: "GBufferDepth",
    GBufferDepthClone: "GBufferDepthClone",
    Skybox: "Skybox",
    ShadowPassDepth: "ShadowPassDepth",
    ShadowPassCascadeData: "ShadowPassCascadeData",
    LightingPassOutput: "LightingPassOutput",
};
export var RenderPassOrder;
(function (RenderPassOrder) {
    RenderPassOrder[RenderPassOrder["BeforeGBuffer"] = 0] = "BeforeGBuffer";
    RenderPassOrder[RenderPassOrder["AfterGBuffer"] = 1] = "AfterGBuffer";
    RenderPassOrder[RenderPassOrder["BeforeLighting"] = 2] = "BeforeLighting";
    RenderPassOrder[RenderPassOrder["AfterLighting"] = 3] = "AfterLighting";
    RenderPassOrder[RenderPassOrder["BeforeScreenOutput"] = 4] = "BeforeScreenOutput";
})(RenderPassOrder || (RenderPassOrder = {}));
;
export class RenderingPipeline {
    renderer;
    renderGraph;
    frame = 0;
    previousTime = 0;
    beforeGBufferPasses = [];
    afterGBufferPasses = [];
    beforeLightingPasses = [];
    afterLightingPasses = [];
    beforeScreenOutputPasses = [];
    prepareGBuffersPass;
    get skybox() { return this.prepareGBuffersPass.skybox; }
    ;
    set skybox(skybox) { this.prepareGBuffersPass.skybox = skybox; }
    ;
    constructor(renderer) {
        this.renderer = renderer;
        this.prepareGBuffersPass = new PrepareGBuffers();
        this.renderGraph = new RenderGraph();
        this.beforeGBufferPasses = [
            this.prepareGBuffersPass,
            new DeferredGBufferPass(),
        ];
        this.afterGBufferPasses = [
        // new DeferredShadowMapPass(),
        ];
        this.beforeLightingPasses = [
            new DeferredLightingPass(),
        ];
        this.afterLightingPasses = [];
        this.beforeScreenOutputPasses = [
            new TextureViewer(),
            new DebuggerTextureViewer(),
        ];
        this.UpdateRenderGraphPasses();
    }
    UpdateRenderGraphPasses() {
        this.renderGraph.passes = [];
        this.renderGraph.passes.push(...this.beforeGBufferPasses, ...this.afterGBufferPasses, ...this.beforeLightingPasses, ...this.afterLightingPasses, ...this.beforeScreenOutputPasses);
        this.renderGraph.init();
    }
    AddPass(pass, order) {
        if (order === RenderPassOrder.BeforeGBuffer)
            this.beforeGBufferPasses.push(pass);
        else if (order === RenderPassOrder.AfterGBuffer)
            this.afterGBufferPasses.push(pass);
        else if (order === RenderPassOrder.BeforeLighting)
            this.beforeLightingPasses.push(pass);
        else if (order === RenderPassOrder.AfterLighting)
            this.afterLightingPasses.push(pass);
        else if (order === RenderPassOrder.BeforeScreenOutput)
            this.beforeScreenOutputPasses.push(pass);
        this.UpdateRenderGraphPasses();
    }
    Render(scene) {
        RendererDebug.ResetFrame();
        RendererDebug.SetTriangleCount(0);
        const renderPipelineStart = performance.now();
        Renderer.BeginRenderFrame();
        this.renderGraph.execute();
        Renderer.EndRenderFrame();
        RendererDebug.SetCPUTime(performance.now() - renderPipelineStart);
        WEBGPUTimestampQuery.GetResult().then(frameTimes => {
            if (frameTimes) {
                for (const [name, time] of frameTimes) {
                    RendererDebug.SetPassTime(name, time);
                }
            }
        });
        const currentTime = performance.now();
        const elapsed = currentTime - this.previousTime;
        this.previousTime = currentTime;
        RendererDebug.SetFPS(1 / elapsed * 1000);
        this.frame++;
    }
}
//# sourceMappingURL=RenderingPipeline.js.map