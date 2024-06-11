import { EventSystem } from "../../Events";
import { MeshRenderCache } from "./MeshRenderCache";
import { Camera } from "../../components/Camera";
import { Transform } from "../../components/Transform";
import { RendererContext } from "../RendererContext";
import { RenderPass, ResourcePool } from "../RenderGraph";
import { DepthTexture, RenderTexture } from "../Texture";
import { Renderer } from "../Renderer";

export class MeshRenderPass extends RenderPass {
    public name: string = "MeshRenderPass";

    private gbufferPositionRT: RenderTexture;
    private gbufferAlbedoRT: RenderTexture;
    private gbufferNormalRT: RenderTexture;
    private gbufferERMO: RenderTexture;
    private gbufferDepthDT: DepthTexture;
    
    constructor(inputCamera: string, outputGBufferPosition: string, outputGBufferAlbedo: string, outputGBufferNormal: string, outputGBufferERMO: string, outputGBufferDepth: string) {
        super({inputs: [inputCamera], outputs: [outputGBufferPosition, outputGBufferAlbedo, outputGBufferNormal, outputGBufferERMO, outputGBufferDepth]});

        EventSystem.on("MeshUpdated", (mesh, type) => {
            MeshRenderCache.AddMesh(mesh);
        });

        EventSystem.on("CallUpdate", (component, flag) => {
            if (flag === false && component instanceof Transform) MeshRenderCache.UpdateTransform(component);
        });

        this.gbufferPositionRT = RenderTexture.Create(Renderer.width, Renderer.height, "rgba16float");
        this.gbufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, "rgba16float");
        this.gbufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, "rgba16float");
        this.gbufferERMO = RenderTexture.Create(Renderer.width, Renderer.height, "rgba16float");
        this.gbufferDepthDT = DepthTexture.Create(Renderer.width, Renderer.height);
    }

    public execute(resources: ResourcePool, inputCamera: Camera, outputGBufferPosition: string, outputGBufferAlbedo: string, outputGBufferNormal: string, outputGBufferERMO: string, outputGBufferDepth: string) {
        if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
        const renderTarget = inputCamera.renderTarget;
        const depthTarget = inputCamera.depthTarget;
        const backgroundColor = inputCamera.backgroundColor;
        const projectionMatrix = inputCamera.projectionMatrix;
        const viewMatrix = inputCamera.viewMatrix;
        
        RendererContext.BeginRenderPass("MeshRenderPass",
            [
                {target: this.gbufferAlbedoRT, clear: true, color: backgroundColor},
                {target: this.gbufferNormalRT, clear: true, color: backgroundColor},
                {target: this.gbufferERMO, clear: true, color: backgroundColor},
            ],
            {target: this.gbufferDepthDT, clear: true}
        );
        
        // Render normal
        for (const renderable of MeshRenderCache.GetRenderable()) {
            const geometry = renderable.geometry;
            const shader = renderable.shader;
            shader.SetMatrix4("projectionMatrix", projectionMatrix);
            shader.SetMatrix4("viewMatrix", viewMatrix);
            shader.SetBuffer("modelMatrix", renderable.modelMatrixBuffer);
            RendererContext.DrawGeometry(geometry, shader, 1);
        }

        // Render instanced
        for (const [_, renderableInstanced] of MeshRenderCache.GetRenderableInstanced()) {
            const geometry = renderableInstanced.geometry;
            const shader = renderableInstanced.shader;
            shader.SetMatrix4("projectionMatrix", projectionMatrix);
            shader.SetMatrix4("viewMatrix", viewMatrix);
            shader.SetBuffer("modelMatrix", renderableInstanced.modelMatrixBuffer);
            RendererContext.DrawGeometry(geometry, shader, renderableInstanced.transform.length);

        }
        RendererContext.EndRenderPass();

        resources.setResource(outputGBufferPosition, this.gbufferPositionRT);
        resources.setResource(outputGBufferAlbedo, this.gbufferAlbedoRT);
        resources.setResource(outputGBufferNormal, this.gbufferNormalRT);
        resources.setResource(outputGBufferERMO, this.gbufferERMO);
        resources.setResource(outputGBufferDepth, this.gbufferDepthDT);
    }
}