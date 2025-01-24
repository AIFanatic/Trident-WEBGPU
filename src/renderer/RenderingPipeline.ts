import { Scene } from "../Scene";
import { Renderer } from "./Renderer";
import { RenderGraph } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { Debugger } from "../plugins/Debugger";
import { WEBGPUTimestampQuery } from "./webgpu/WEBGPUTimestampQuery";
import { TextureViewer } from "./passes/TextureViewer";
import { DeferredGBufferPass } from "./passes/DeferredGBufferPass";
import { PrepareGBuffers } from "./passes/PrepareGBuffers";
import { MeshletDraw } from "../plugins/meshlets/passes/MeshletDraw";
import { DeferredShadowMapPass } from "./passes/DeferredShadowMapPass";
import { RenderCache } from "./RenderCache";
import { DebuggerTextureViewer } from "./passes/DebuggerTextureViewer";

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

export class RenderingPipeline {
    private renderer: Renderer;
    private renderGraph: RenderGraph;

    private frame: number = 0;
    private previousTime: number = 0;

    constructor(renderer: Renderer) {
        this.renderer = renderer;

        const passes = {
            PrepareDeferredRender: new PrepareGBuffers(),

            // meshletDrawPass: new MeshletDraw(),

            GBufferPass: new DeferredGBufferPass(),

            deferredShadowMapPass: new DeferredShadowMapPass(),

            DeferredLightingPass: new DeferredLightingPass(),
            OutputPass: new TextureViewer(),

            DebuggerTextureViewer: new DebuggerTextureViewer(),
        }

        this.renderGraph = new RenderGraph();
        for (const pass of Object.keys(passes)) {
            this.renderGraph.addPass(passes[pass]);
        }

        this.renderGraph.init();
    }

    public Render(scene: Scene) {
        RenderCache.Reset();
        
        Debugger.SetTriangleCount(0);

        Renderer.BeginRenderFrame();
        this.renderGraph.execute();
        Renderer.EndRenderFrame();

        WEBGPUTimestampQuery.GetResult().then(frameTimes => {
            if (frameTimes) {
                for (const [name, time] of frameTimes) {
                    Debugger.SetPassTime(name, time);
                }
            }
        });

        const currentTime = performance.now();
        const elapsed = currentTime - this.previousTime;
        this.previousTime = currentTime;
        Debugger.SetFPS(1 / elapsed * 1000);

        this.frame++;
    }
}