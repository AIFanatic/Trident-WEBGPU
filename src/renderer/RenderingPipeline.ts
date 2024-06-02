import { Camera } from "../components/Camera";
import { Renderer } from "./Renderer";
import { RendererContext } from "./RendererContext";
import { MeshRenderPass } from "./passes/MeshRenderPass";
import { OutputPass } from "./passes/OutputPass";
import { RenderPass } from "./passes/RenderPass";

export class RenderingPipeline {
    private renderer: Renderer;
    
    private meshRenderPass: MeshRenderPass;
    private outputPass: OutputPass;

    private customRenderPasses: RenderPass[] = [];

    constructor(renderer: Renderer) {
        this.renderer = renderer;

        this.meshRenderPass = new MeshRenderPass();
        this.outputPass = new OutputPass();
    }

    public Render() {
        const mainCamera = Camera.mainCamera;

        this.renderer.BeginRenderFrame();

        const meshRenderPassCommandBuffer = this.meshRenderPass.Execute();
        RendererContext.ProcessCommandBuffer(meshRenderPassCommandBuffer);

        const outputPassCommandBuffer = this.outputPass.Execute(this.meshRenderPass.GetRenderTarget());
        RendererContext.ProcessCommandBuffer(outputPassCommandBuffer);

        for (const renderPass of this.customRenderPasses) {
            const customPassCommandBuffer = renderPass.Execute();
            RendererContext.ProcessCommandBuffer(customPassCommandBuffer);
        }
        
        this.renderer.EndRenderFrame();
    }
}