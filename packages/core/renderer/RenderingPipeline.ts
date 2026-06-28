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
import { PostExposureTonemap } from "./passes/PostExposureTonemap";
import { BasePass } from "./passes/BasePass";
import { SceneExtractPass } from "./passes/SceneExtractPass";
import { EventSystem } from "../Events";

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
};

export class RenderingPipeline {
    private renderGraph: RenderGraph;

    private frame: number = 0;
    private previousTime: number = 0;

    private beforeGBufferPasses: RenderPass[] = [];
    private afterGBufferPasses: RenderPass[] = [];

    private beforeLightingPasses: RenderPass[] = [];
    private afterLightingPasses: RenderPass[] = [];

    private beforeScreenOutputPasses: RenderPass[] = [];
    private afterScreenOutputPasses: RenderPass[] = [];

    private prepareGBuffersPass: PrepareGBuffers;

    public get GBufferFormat(): TextureFormat { return this.prepareGBuffersPass.GBufferFormat };

    public static GBufferFormat: TextureFormat = "rgba16float"; // use the current value

    public readonly DeferredShadowMapPass = new DeferredShadowMapPass();

    constructor() {
        this.prepareGBuffersPass = new PrepareGBuffers();

        this.renderGraph = new RenderGraph();
        this.beforeGBufferPasses = [
            new SceneExtractPass(),
            this.prepareGBuffersPass,
        ];

        this.afterGBufferPasses = [
            new RenderablePass(),
            this.DeferredShadowMapPass,
        ];

        this.beforeLightingPasses = [];
        this.afterLightingPasses = [
            new BasePass(),
            new DeferredLightingPass(),
            new ForwardPass(),
        ];

        this.beforeScreenOutputPasses = [
            new PostExposureTonemap(),
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