import { Scene } from "../Scene";
import { Renderer } from "./Renderer";
import { RenderGraph, RenderPass } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { Debugger } from "../plugins/Debugger";
import { WEBGPUTimestampQuery } from "./webgpu/WEBGPUTimestampQuery";
import { TextureViewer } from "./passes/TextureViewer";
import { DeferredGBufferPass } from "./passes/DeferredGBufferPass";
import { PrepareGBuffers } from "./passes/PrepareGBuffers";
// import { MeshletDraw } from "../plugins/meshlets/passes/MeshletDraw";
import { DeferredShadowMapPass } from "./passes/DeferredShadowMapPass";
import { RenderCache } from "./RenderCache";
import { DebuggerTextureViewer } from "./passes/DebuggerTextureViewer";
import { PostProcessingPass } from "../plugins/PostProcessing/PostProcessingPass";
import { RendererDebug } from "./RendererDebug";

export const PassParams = {
    DebugSettings: "DebugSettings",
    MainCamera: "MainCamera",

    depthTexture: "depthTexture",
    depthTexturePyramid: "depthTexturePyramid",


    GBufferAlbedo: "GBufferAlbedo",
    GBufferNormal: "GBufferNormal",
    GBufferERMO: "GBufferERMO",
    GBufferDepth: "GBufferDepth",

    ShadowPassDepth: "ShadowPassDepth",
    
    LightingPassOutput: "LightingPassOutput",
};

export enum RenderPassOrder {
    BeforeGBuffer,
    AfterGBuffer,
    BeforeLighting,
    AfterLighting,
    BeforeScreenOutput
};

export class RenderingPipeline {
    private renderer: Renderer;
    private renderGraph: RenderGraph;

    private frame: number = 0;
    private previousTime: number = 0;

    private beforeGBufferPasses: RenderPass[] = [];
    private afterGBufferPasses: RenderPass[] = [];

    private beforeLightingPasses: RenderPass[] = [];
    private afterLightingPasses: RenderPass[] = [];

    private beforeScreenOutputPasses: RenderPass[] = [];

    private renderPasses: RenderPass[] = [];

    constructor(renderer: Renderer) {
        this.renderer = renderer;

        console.warn("this sucks")

        this.renderGraph = new RenderGraph();
        this.beforeGBufferPasses = [
            new PrepareGBuffers(),
            // new DeferredGBufferPass(),
        ];
        
        this.afterGBufferPasses = [
            new DeferredShadowMapPass(),
        ];

        this.beforeLightingPasses = [
            new DeferredLightingPass(),
        ]

        this.afterLightingPasses = [];
        
        this.beforeScreenOutputPasses = [
            new TextureViewer(),
            new DebuggerTextureViewer(),
        ]
        
        this.UpdateRenderGraphPasses();
    }

    private UpdateRenderGraphPasses() {
        this.renderGraph.passes = [];
        this.renderGraph.passes.push(
            ...this.beforeGBufferPasses,
            ...this.afterGBufferPasses,
            ...this.beforeLightingPasses,
            ...this.afterLightingPasses,
            ...this.beforeScreenOutputPasses
        );

        this.renderGraph.init();
    }

    public AddPass(pass: RenderPass, order: RenderPassOrder) {
        if (order === RenderPassOrder.BeforeGBuffer) this.beforeGBufferPasses.push(pass);
        else if (order === RenderPassOrder.AfterGBuffer) this.afterGBufferPasses.push(pass);
        else if (order === RenderPassOrder.BeforeLighting) this.beforeLightingPasses.push(pass);
        else if (order === RenderPassOrder.AfterLighting) this.afterLightingPasses.push(pass);
        else if (order === RenderPassOrder.BeforeScreenOutput) this.beforeScreenOutputPasses.push(pass);

        this.UpdateRenderGraphPasses();
    }

    public Render(scene: Scene) {
        RenderCache.Reset();
        
        RendererDebug.SetTriangleCount(0);

        Renderer.BeginRenderFrame();
        this.renderGraph.execute();
        Renderer.EndRenderFrame();

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