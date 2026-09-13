import { RenderPass, ResourcePool } from "../RenderGraph";
import { RenderTexture, DepthTexture } from "../Texture";
import { RendererContext } from "../RendererContext";
import { PassParams, RenderingPipeline } from "../RenderingPipeline";

export class SceneCopyPass extends RenderPass {
    public name = "SceneCopyPass";
    private gbufferAlbedo: RenderTexture;
    private gBufferDepth: DepthTexture;

    public execute(resources: ResourcePool) {
        if (!this.initialized) return;
        const albedo = resources.getResource(PassParams.GBufferAlbedo);
        const depth = resources.getResource(PassParams.GBufferDepth);
        if (!albedo || !depth) return;

        if (!this.gbufferAlbedo || this.gbufferAlbedo.width !== albedo.width || this.gbufferAlbedo.height !== albedo.height) {
            this.gbufferAlbedo = RenderTexture.Create(albedo.width, albedo.height, 1, RenderingPipeline.GBufferFormat);
            this.gbufferAlbedo.name = "GBufferAlbedoCopy";
        }
        if (!this.gBufferDepth || this.gBufferDepth.width !== depth.width || this.gBufferDepth.height !== depth.height) {
            this.gBufferDepth = DepthTexture.Create(depth.width, depth.height, depth.depth, depth.format);
            this.gBufferDepth.name = "GBufferDepthCopy";
        }

        RendererContext.CopyTextureToTextureV3({ texture: albedo }, { texture: this.gbufferAlbedo });
        RendererContext.CopyTextureToTextureV3({ texture: depth }, { texture: this.gBufferDepth });

        resources.setResource(PassParams.GBufferAlbedoCopy, this.gbufferAlbedo);
        resources.setResource(PassParams.GBufferDepthCopy, this.gBufferDepth);
    }
}