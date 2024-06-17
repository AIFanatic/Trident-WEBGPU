import { Scene } from "../Scene";
import { Camera } from "../components/Camera";
import { Renderer } from "./Renderer";
import { RenderGraph, ResourcePool } from "./RenderGraph";
import { DeferredMeshRenderPass } from "./passes/DeferredMeshRenderPass";
import { RenderPass } from "./RenderGraph";
import { DeferredLightingPass } from "./passes/DeferredLightingPass";
import { ShadowPass } from "./passes/ShadowPass";
import { DebuggerPass } from "./passes/DebuggerPass";

export enum PassParams {
    MainCamera = "MainCamera",
    GBufferAlbedo = "GBufferAlbedo",
    GBufferNormal = "GBufferNormal",
    GBufferERMO = "GBufferERMO",
    GBufferDepth = "GBufferDepth",

    ShadowPassDepth = "ShadowPassDepth",
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

    private passes = {
        SetMainCamera: new SetMeshRenderCameraPass({outputs: [PassParams.MainCamera]}),
        DeferredMeshRenderPass: new DeferredMeshRenderPass(PassParams.MainCamera, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth),
        ShadowPass: new ShadowPass(PassParams.ShadowPassDepth),
        DeferredLightingPass: new DeferredLightingPass(PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth, PassParams.ShadowPassDepth)
    }
    
    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.renderGraph = new RenderGraph();
        for (const pass of Object.keys(this.passes)) {
            this.renderGraph.addPass(this.passes[pass]);
        }

        this.debuggerPass = new DebuggerPass();
    }

    public Render(scene: Scene) {
        this.renderer.BeginRenderFrame();
        this.renderGraph.execute();
        this.debuggerPass.execute(this.renderGraph.resourcePool);
        this.renderer.EndRenderFrame();
    }
}