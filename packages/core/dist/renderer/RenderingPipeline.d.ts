import { Scene } from "../Scene";
import { Renderer } from "./Renderer";
import { RenderPass } from "./RenderGraph";
import { CubeTexture } from "./Texture";
export declare const PassParams: {
    DebugSettings: string;
    MainCamera: string;
    depthTexture: string;
    depthTexturePyramid: string;
    GBufferAlbedo: string;
    GBufferAlbedoClone: string;
    GBufferNormal: string;
    GBufferERMO: string;
    GBufferDepth: string;
    GBufferDepthClone: string;
    Skybox: string;
    ShadowPassDepth: string;
    ShadowPassCascadeData: string;
    LightingPassOutput: string;
};
export declare enum RenderPassOrder {
    BeforeGBuffer = 0,
    AfterGBuffer = 1,
    BeforeLighting = 2,
    AfterLighting = 3,
    BeforeScreenOutput = 4
}
export declare class RenderingPipeline {
    private renderer;
    private renderGraph;
    private frame;
    private previousTime;
    private beforeGBufferPasses;
    private afterGBufferPasses;
    private beforeLightingPasses;
    private afterLightingPasses;
    private beforeScreenOutputPasses;
    private prepareGBuffersPass;
    get skybox(): CubeTexture;
    set skybox(skybox: CubeTexture);
    constructor(renderer: Renderer);
    private UpdateRenderGraphPasses;
    AddPass(pass: RenderPass, order: RenderPassOrder): void;
    Render(scene: Scene): void;
}
//# sourceMappingURL=RenderingPipeline.d.ts.map