import { Renderer, RendererEvents } from "./Renderer";
import { RenderGraph, RenderPass } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { WEBGPUTimestampQuery } from "./webgpu/utils/WEBGPUTimestampQuery";
import { TextureViewer } from "./passes/TextureViewer";
import { PrepareGBuffers } from "./passes/PrepareGBuffers";
import { DeferredShadowMapPass } from "./passes/DeferredShadowMapPass";
import { TextureFormat } from "./Texture";
import { ForwardPass } from "./passes/ForwardPass";
import { RenderablePass } from "./passes/RenderablePass";
import { TonemapPass } from "./passes/TonemapPass";
import { BasePass } from "./passes/BasePass";
import { SceneExtractPass } from "./passes/SceneExtractPass";
import { EventSystem } from "../Events";
import { SceneCopyPass } from "./passes/SceneCopyPass";
import { ExposurePass } from "./passes/ExposurePass";

export const PassParams = {
    DebugSettings: "DebugSettings",
    MainCamera: "MainCamera",

    GBufferAlbedo: "GBufferAlbedo",
    GBufferNormal: "GBufferNormal",
    GBufferERMO: "GBufferERMO",
    GBufferDepth: "GBufferDepth",

    GBufferAlbedoCopy: "GBufferAlbedoCopy",
    GBufferDepthCopy: "GBufferDepthCopy",

    ShadowPassDepth: "ShadowPassDepth",

    ShadowPassCascadeData: "ShadowPassCascadeData",
    LightsBuffer: "LightsBuffer",

    LightingPassOutput: "LightingPassOutput",

    FrameBuffer: "FrameBuffer",
    FrameRenderData: "FrameRenderData",
};

export enum RenderPassOrder {
    BeforeGBuffer,
    AfterGBuffer,
    BeforeLighting,
    AfterLighting,
    BeforeScreenOutput,
    AfterScreenOutput,
    BeforePostProcess,
};

export class RenderingPipeline {
    private renderGraph: RenderGraph;

    private frame: number = 0;
    private previousTime: number = 0;

    private beforeGBufferPasses: RenderPass[] = [];
    private afterGBufferPasses: RenderPass[] = [];

    private beforeLightingPasses: RenderPass[] = [];
    private afterLightingPasses: RenderPass[] = [];
    private beforePostProcessPasses: RenderPass[] = [];

    private beforeScreenOutputPasses: RenderPass[] = [];
    private afterScreenOutputPasses: RenderPass[] = [];

    public get GBufferFormat(): TextureFormat { return RenderingPipeline.GBufferFormat };

    public static GBufferFormat: TextureFormat = "rgba16float";

    public readonly DeferredShadowMapPass = new DeferredShadowMapPass();

    constructor() {
        this.prepareGBuffersPass = new PrepareGBuffers();

        this.renderGraph = new RenderGraph();
        this.beforeGBufferPasses = [
            new SceneExtractPass(),
            new PrepareGBuffers(),
        ];

        this.afterGBufferPasses = [
            new RenderablePass(),
            new SceneCopyPass(),
            this.DeferredShadowMapPass,
        ];

        this.beforeLightingPasses = [];
        this.afterLightingPasses = [
            new BasePass(),
            new DeferredLightingPass(),
        ];

          this.beforePostProcessPasses = [
              new ForwardPass(),
              new ExposurePass(),
          ];

        this.beforeScreenOutputPasses = [
            new TonemapPass(),
        ]

        this.afterScreenOutputPasses = [
            new TextureViewer(),
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
            ...this.beforePostProcessPasses,
            ...this.beforeScreenOutputPasses,
            ...this.afterScreenOutputPasses
        );

        this.renderGraph.init();
    }

    public AddPass<T extends RenderPass>(pass: T | (new (...args: any[]) => T), order: RenderPassOrder) {
        const passInstance = typeof pass === "function" ? new pass() : pass;
        if (order === RenderPassOrder.BeforeGBuffer) this.beforeGBufferPasses.push(passInstance);
        else if (order === RenderPassOrder.AfterGBuffer) this.afterGBufferPasses.push(passInstance);
        else if (order === RenderPassOrder.BeforeLighting) this.beforeLightingPasses.push(passInstance);
        else if (order === RenderPassOrder.AfterLighting) this.afterLightingPasses.push(passInstance);
        else if (order === RenderPassOrder.BeforePostProcess) this.beforePostProcessPasses.push(passInstance);
        else if (order === RenderPassOrder.BeforeScreenOutput) this.beforeScreenOutputPasses.push(passInstance);
        else if (order === RenderPassOrder.AfterScreenOutput) this.afterScreenOutputPasses.push(passInstance);

        this.UpdateRenderGraphPasses();

        return passInstance;
    }

    public RemovePass(pass: RenderPass, order: RenderPassOrder): boolean {
        const buckets: Record<RenderPassOrder, RenderPass[]> = {
            [RenderPassOrder.BeforeGBuffer]: this.beforeGBufferPasses,
            [RenderPassOrder.AfterGBuffer]: this.afterGBufferPasses,
            [RenderPassOrder.BeforeLighting]: this.beforeLightingPasses,
            [RenderPassOrder.AfterLighting]: this.afterLightingPasses,
            [RenderPassOrder.BeforePostProcess]: this.beforePostProcessPasses,
            [RenderPassOrder.BeforeScreenOutput]: this.beforeScreenOutputPasses,
            [RenderPassOrder.AfterScreenOutput]: this.afterScreenOutputPasses,
        };
        const bucket = buckets[order];
        const i = bucket.indexOf(pass);
        if (i === -1) return false;
        bucket.splice(i, 1);
        this.UpdateRenderGraphPasses();
        pass.Destroy();
        return true;
    }

    public Render() {
        Renderer.info.ResetFrame();

        const renderPipelineStart = performance.now();

        this.renderGraph.preFrame();
        Renderer.BeginRenderFrame();
        this.renderGraph.preRender();
        this.renderGraph.execute();
        Renderer.EndRenderFrame();
        Renderer.info.cpuTime = performance.now() - renderPipelineStart;

        WEBGPUTimestampQuery.GetResult().then(frameTimes => {
            if (frameTimes) {
                for (const [name, time] of frameTimes) {
                    Renderer.info.SetPassTime(name, time);
                }
            }
        });

        EventSystem.emit(RendererEvents.FrameEnded);

        const currentTime = performance.now();
        const elapsed = currentTime - this.previousTime;
        this.previousTime = currentTime;
        Renderer.info.fps = 1 / elapsed * 1000;

        this.frame++;
    }
}