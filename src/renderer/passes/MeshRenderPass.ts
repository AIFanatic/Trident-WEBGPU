import { EventSystem } from "../../Events";
import { MeshRenderCache } from "./MeshRenderCache";
import { RenderPass } from "./RenderPass";
import { Camera } from "../../components/Camera";
import { RenderCommandBuffer } from "../RenderCommandBuffer";
import { Transform } from "../../components/Transform";
import { DepthTexture, RenderTexture } from "../Texture";
import { Renderer } from "../Renderer";

export class MeshRenderPass implements RenderPass {
    
    private renderTarget: RenderTexture;
    private depthTarget: DepthTexture;

    constructor() {
        EventSystem.on("MeshUpdated", (mesh, type) => {
            MeshRenderCache.AddMesh(mesh);
        });

        EventSystem.on("CallUpdate", (component, flag) => {
            if (flag === false && component instanceof Transform) MeshRenderCache.UpdateTransform(component);
        });

        this.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height);
        this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
    }

    public Execute(): RenderCommandBuffer {
        const commandBuffer = new RenderCommandBuffer("MeshRenderPass");
        const mainCamera = Camera.mainCamera;
        commandBuffer.ClearRenderTarget(true, true, mainCamera.clearValue);
        commandBuffer.SetRenderTarget(this.renderTarget, this.depthTarget);

        // Render normal
        for (const renderable of MeshRenderCache.GetRenderable()) {
            renderable.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
            renderable.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
            if (!renderable.shader.HasBuffer("modelMatrix")) renderable.shader.SetBuffer("modelMatrix", renderable.modelMatrixBuffer);
        }

        // Render instanced
        for (const [_, renderableInstanced] of MeshRenderCache.GetRenderableInstanced()) {
            const shader = renderableInstanced.shader;
            
            shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
            shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
            if (!shader.HasBuffer("modelMatrix")) shader.SetBuffer("modelMatrix", renderableInstanced.modelMatrixBuffer);

            commandBuffer.DrawMesh(renderableInstanced.geometry, shader, renderableInstanced.transform.length);
        }
        return commandBuffer;
    }

    public GetRenderTarget(): RenderTexture { return this.renderTarget }
    public GetDepthTarget(): DepthTexture { return this.depthTarget }
}