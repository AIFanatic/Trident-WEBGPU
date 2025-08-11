import { Scene } from "../Scene";
import { Renderer } from "./Renderer";
import { RenderGraph, RenderPass } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { WEBGPUTimestampQuery } from "./webgpu/WEBGPUTimestampQuery";
import { TextureViewer } from "./passes/TextureViewer";
import { PrepareGBuffers } from "./passes/PrepareGBuffers";
import { DeferredShadowMapPass } from "./passes/DeferredShadowMapPass";
import { DebuggerTextureViewer } from "./passes/DebuggerTextureViewer";
import { CubeTexture } from "./Texture";
import { DeferredGBufferPass } from "./passes/DeferredGBufferPass";
import { ForwardPass } from "./passes/ForwardPass";

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

    private prepareGBuffersPass: PrepareGBuffers;
    public get skybox(): CubeTexture { return this.prepareGBuffersPass.skybox};
    public set skybox(skybox: CubeTexture) { this.prepareGBuffersPass.skybox = skybox};

    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.prepareGBuffersPass = new PrepareGBuffers();
        
        this.renderGraph = new RenderGraph();
        this.beforeGBufferPasses = [
            this.prepareGBuffersPass,
        ];
        
        this.afterGBufferPasses = [
            new DeferredGBufferPass(),
            new DeferredShadowMapPass(),
        ];

        this.beforeLightingPasses = [];
        this.afterLightingPasses = [
            new DeferredLightingPass(),
            new ForwardPass(),
        ];
        
        this.beforeScreenOutputPasses = [
            new TextureViewer(),
            // new DebuggerTextureViewer(),
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
        Renderer.info.ResetFrame();
        Renderer.info.triangleCount = 0;
        
        const renderPipelineStart = performance.now();
        Renderer.BeginRenderFrame();
        
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

        const currentTime = performance.now();
        const elapsed = currentTime - this.previousTime;
        this.previousTime = currentTime;
        Renderer.info.fps = 1 / elapsed * 1000;

        this.frame++;
    }
}