import { Scene } from "../Scene";
import { Camera } from "../components/Camera";
import { Renderer } from "./Renderer";
import { RenderGraph, ResourcePool } from "./RenderGraph";
import { DeferredMeshRenderPass } from "./passes/DeferredMeshRenderPass";
import { RenderPass } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { ShadowPass } from "./passes/ShadowPass";
import { DebuggerPass } from "./passes/DebuggerPass";
import { Debugger } from "../plugins/Debugger";
import { SSGI } from "./passes/SSGI";
import { CullingPass } from "./passes/CullingPass";
import { WEBGPUTimestampQuery } from "./webgpu/WEBGPUTimestampQuery";
import { DepthViewer } from "./passes/DepthViewer";
import { TextureViewer } from "./passes/TextureViewer";
import { Forward } from "./passes/Forward";
import { ForwardInstanced } from "./passes/ForwardInstanced";
import { PrepareSceneData } from "./passes/PrepareSceneData";
import { IndirectGBufferPass } from "./passes/IndirectGBufferPass";
import { HiZPass } from "./passes/HiZPass";

export const PassParams = {
    MainCamera: "MainCamera",

    indirectVertices: "indirectVertices",
    indirectMeshInfo: "indirectMeshInfo",
    indirectMeshletInfo: "indirectMeshletInfo",
    indirectObjectInfo: "indirectObjectInfo",
    indirectMeshMatrixInfo: "indirectMeshMatrixInfo",
    indirectInstanceInfo: "indirectInstanceInfo",
    indirectDrawBuffer: "indirectDrawBuffer",
    meshletsCount: "meshletsCount",
    textureMaps: "textureMaps",

    isCullingPrepass: "isCullingPrepass",

    depthTexture: "depthTexture",
    depthTexturePyramid: "depthTexturePyramid",


    GBufferAlbedo: "GBufferAlbedo",
    GBufferNormal: "GBufferNormal",
    GBufferERMO: "GBufferERMO",
    GBufferDepth: "GBufferDepth",

    ShadowPassDepth: "ShadowPassDepth",
    
    LightingPassOutput: "LightingPassOutput",
};

class SetMeshRenderCameraPass extends RenderPass {
    public name = "SetMeshRenderCameraPass";
    
    public execute(resources: ResourcePool, cameraOutput: string) {
        resources.setResource(cameraOutput, Camera.mainCamera);
    }
}

export class RenderingPipeline {
    private renderer: Renderer;
    private renderGraph: RenderGraph;

    private debuggerPass: DebuggerPass;
    private frame: number = 0;
    private previousTime: number = 0;

    // private passes = {
    //     // SetMainCamera: new SetMeshRenderCameraPass({outputs: [PassParams.MainCamera]}),
    //     // DeferredMeshRenderPass: new DeferredMeshRenderPass(PassParams.MainCamera, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth),
    //     // ShadowPass: new ShadowPass(PassParams.ShadowPassDepth),
    //     // DeferredLightingPass: new DeferredLightingPass(PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth, PassParams.ShadowPassDepth, PassParams.LightingPassOutput),
    //     // SSGI: new SSGI(PassParams.GBufferDepth, PassParams.GBufferNormal, PassParams.LightingPassOutput, PassParams.GBufferAlbedo)
        
    //     PrepareSceneData: new PrepareSceneData(),
        
    //     CullingFirstPass: new CullingPass(),
    //     IndirectGBufferFirstPass: new IndirectGBufferPass(),
    //     BuildDepthPyramid: new HiZPass(),
    //     CullingSecondPass: new CullingPass(),
    //     IndirectGBufferSecondPass: new IndirectGBufferPass(),
        
    //     // Forward: new Forward(),
    //     // ForwardInstanced: new ForwardInstanced()
    // }
    
    constructor(renderer: Renderer) {
        this.renderer = renderer;

        const cullingPass = new CullingPass();
        const hizPass = new HiZPass();
        const indirectGBufferPass = new IndirectGBufferPass();

        const passes = {
            // SetMainCamera: new SetMeshRenderCameraPass({outputs: [PassParams.MainCamera]}),
            // DeferredMeshRenderPass: new DeferredMeshRenderPass(PassParams.MainCamera, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth),
            // ShadowPass: new ShadowPass(PassParams.ShadowPassDepth),
            // DeferredLightingPass: new DeferredLightingPass(PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth, PassParams.ShadowPassDepth, PassParams.LightingPassOutput),
            // SSGI: new SSGI(PassParams.GBufferDepth, PassParams.GBufferNormal, PassParams.LightingPassOutput, PassParams.GBufferAlbedo)
            
            PrepareSceneData: new PrepareSceneData(),
            
            // CullingFirstPass: new CullingPass(),

            CullingFirstPass: cullingPass,
            IndirectGBufferFirstPass: indirectGBufferPass,
            HiZPass: hizPass,

            CullingSecondPass: cullingPass,
            IndirectGBufferSecondPass: indirectGBufferPass,


            DeferredLightingPass: new DeferredLightingPass(),
            OutputPass: new TextureViewer(),

            Forward: new Forward(),
            // ForwardInstanced: new ForwardInstanced()
        }

        this.renderGraph = new RenderGraph();
        for (const pass of Object.keys(passes)) {
            this.renderGraph.addPass(passes[pass]);
        }

        this.renderGraph.init();
        
        this.debuggerPass = new DebuggerPass();

        console.log(this.renderGraph)

        // throw Error("HERE")
    }

    public async Render(scene: Scene) {
        // if (this.frame % 100 == 0) {
        //     Debugger.ResetFrame();
        // }
        
        this.renderer.BeginRenderFrame();
        this.renderGraph.execute();
        // this.debuggerPass.execute(this.renderGraph.resourcePool);
        // this.depthViewer.execute(this.renderGraph.resourcePool, this.passes.GPUDriven.depthPyramidTargetTexture);
        // this.textureViewer.execute(this.renderGraph.resourcePool, this.passes.GPUDriven.colorTarget);
        this.renderer.EndRenderFrame();

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