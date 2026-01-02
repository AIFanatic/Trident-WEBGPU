import { Scene } from "../Scene";
import { Renderer } from "./Renderer";
import { RenderGraph, RenderPass } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { WEBGPUTimestampQuery } from "./webgpu/WEBGPUTimestampQuery";
import { TextureViewer } from "./passes/TextureViewer";
import { PrepareGBuffers } from "./passes/PrepareGBuffers";
import { DeferredShadowMapPass } from "./passes/DeferredShadowMapPass";
import { CubeTexture, RenderTexture, TextureFormat } from "./Texture";
import { ForwardPass } from "./passes/ForwardPass";
import { IBLLightingPass } from "./passes/IBLIBLLightingPass";
import { SkyboxPass } from "./passes/SkyboxPass";
import { RenderablePass } from "./passes/RenderablePass";
import { PostExposureTonemap } from "./passes/PostExposureTonemap";
import { BasePass } from "./passes/BasePass";

export const PassParams = {
    DebugSettings: "DebugSettings",
    MainCamera: "MainCamera",

    depthTexture: "depthTexture",
    depthTexturePyramid: "depthTexturePyramid",

    GBufferAlbedo: "GBufferAlbedo",
    GBufferNormal: "GBufferNormal",
    GBufferERMO: "GBufferERMO",
    GBufferDepth: "GBufferDepth",

    Skybox: "Skybox",
    SkyboxIrradiance: "SkyboxIrradiance",
    SkyboxPrefilter: "SkyboxPrefilter",
    SkyboxBRDFLUT: "SkyboxBRDFLUT",

    ShadowPassDepth: "ShadowPassDepth",

    ShadowPassCascadeData: "ShadowPassCascadeData",
    LightsBuffer: "LightsBuffer",
    
    LightingPassOutput: "LightingPassOutput",
    
    FrameBuffer: "FrameBuffer",
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
    private renderer: Renderer;
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
    public get skybox(): CubeTexture { return this.prepareGBuffersPass.skybox};
    public set skybox(skybox: CubeTexture) { this.prepareGBuffersPass.skybox = skybox};

    public get skyboxIrradiance(): CubeTexture { return this.prepareGBuffersPass.skyboxIrradiance};
    public set skyboxIrradiance(skyboxIrradiance: CubeTexture) { this.prepareGBuffersPass.skyboxIrradiance = skyboxIrradiance};

    public get skyboxPrefilter(): CubeTexture { return this.prepareGBuffersPass.skyboxPrefilter};
    public set skyboxPrefilter(skyboxPrefilter: CubeTexture) { this.prepareGBuffersPass.skyboxPrefilter = skyboxPrefilter};

    public get skyboxBRDFLUT(): RenderTexture { return this.prepareGBuffersPass.skyboxBRDFLUT};
    public set skyboxBRDFLUT(skyboxBRDFLUT: RenderTexture) { this.prepareGBuffersPass.skyboxBRDFLUT = skyboxBRDFLUT};

    public get GBufferFormat(): TextureFormat { return this.prepareGBuffersPass.GBufferFormat};

    public readonly DeferredShadowMapPass = new DeferredShadowMapPass();

    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.prepareGBuffersPass = new PrepareGBuffers();
        
        this.renderGraph = new RenderGraph();
        this.beforeGBufferPasses = [
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
            new IBLLightingPass(),
            new SkyboxPass(),
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

    public AddPass(pass: RenderPass, order: RenderPassOrder) {
        if (order === RenderPassOrder.BeforeGBuffer) this.beforeGBufferPasses.push(pass);
        else if (order === RenderPassOrder.AfterGBuffer) this.afterGBufferPasses.push(pass);
        else if (order === RenderPassOrder.BeforeLighting) this.beforeLightingPasses.push(pass);
        else if (order === RenderPassOrder.AfterLighting) this.afterLightingPasses.push(pass);
        else if (order === RenderPassOrder.BeforeScreenOutput) this.beforeScreenOutputPasses.push(pass);
        else if (order === RenderPassOrder.AfterScreenOutput) this.afterScreenOutputPasses.push(pass);

        this.UpdateRenderGraphPasses();
    }

    public async Render(scene: Scene) {
        Renderer.info.ResetFrame();
        
        const renderPipelineStart = performance.now();

        await this.renderGraph.preFrame();
        Renderer.BeginRenderFrame();
        await this.renderGraph.preRender();
        await this.renderGraph.execute();
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