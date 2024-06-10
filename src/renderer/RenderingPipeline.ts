import { Scene } from "../Scene";
import { Camera } from "../components/Camera";
import { Light } from "../components/Light";
import { Renderer } from "./Renderer";
import { RenderGraph, ResourcePool } from "./RenderGraph";
import { MeshRenderPass } from "./passes/MeshRenderPass";
import { RenderPass } from "./RenderGraph";
import { OutputDepthPass } from "./passes/OutputDepthPass";
import { OutputPass } from "./passes/OutputPass";
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
        // OutputPass: new OutputPass(PassParams.GeometryRenderTargetNormal),
        LightingPass: new LightingPass(PassParams.GBufferPosition, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferDepth),
        // OutputDepthPass: new OutputDepthPass(),
    }
    
    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.renderGraph = new RenderGraph();
        for (const pass of Object.keys(this.passes)) {
            this.renderGraph.addPass(this.passes[pass]);
        }
        // this.renderGraph.addPass(new SetMeshRenderCameraPass([], ["MeshRenderPass.Camera"]));
        // this.renderGraph.addPass(new MeshRenderPass(["MeshRenderPass.Camera"], ["MeshRenderPass.RenderTargetColor", "MeshRenderPass.RenderTargetDepth"]));
        // this.renderGraph.addPass(new OutputDepthPassV2(["MeshRenderPass.RenderTargetDepth"], []));
        // this.renderGraph.addPass(new OutputPass(["MeshRenderPass.RenderTargetColor"], []));

        // this.passes.OutputPass.set({inputs: [PassParams.GeometryRenderTarget]});
    }

    public Render(scene: Scene) {
        const mainCamera = Camera.mainCamera;

        this.renderer.BeginRenderFrame();

        const lights = scene.GetComponents(Light);

        // this.passes.SetMainCamera.set({outputs: [PassParams.MainCamera]});
        // this.passes.MeshRenderPass.set({inputs: [PassParams.MainCamera], outputs: [PassParams.GeometryRenderTarget, PassParams.GeometryDepthTarget]})
        // this.passes.OutputPass.set({inputs: [PassParams.GeometryRenderTarget]});
        // this.passes.OutputDepthPass.set({inputs: [PassParams.GeometryDepthTarget]});

        this.renderGraph.execute();

        this.renderer.EndRenderFrame();
    }
}