import { Scene } from "../Scene";
import { Camera } from "../components/Camera";
import { Renderer } from "./Renderer";
import { RenderGraph, ResourcePool } from "./RenderGraph";
import { MeshRenderPass } from "./passes/MeshRenderPass";
import { RenderPass } from "./RenderGraph";
import { LightingPass } from "./passes/LightingPass";

enum PassParams {
    MainCamera = "MainCamera",
    GBufferPosition = "GBufferPosition",
    GBufferAlbedo = "GBufferAlbedo",
    GBufferNormal = "GBufferNormal",
    GBufferDepth = "GBufferDepth",
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

    private passes = {
        SetMainCamera: new SetMeshRenderCameraPass({outputs: [PassParams.MainCamera]}),
        MeshRenderPass: new MeshRenderPass(PassParams.MainCamera, PassParams.GBufferPosition, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferDepth),
        LightingPass: new LightingPass(PassParams.GBufferPosition, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferDepth),
    }
    
    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.renderGraph = new RenderGraph();
        for (const pass of Object.keys(this.passes)) {
            this.renderGraph.addPass(this.passes[pass]);
        }
    }

    public Render(scene: Scene) {
        this.renderer.BeginRenderFrame();
        this.renderGraph.execute();
        this.renderer.EndRenderFrame();
    }
}