import { Geometry } from "../../Geometry";
import { BufferCopyParameters, DepthTarget, RenderTarget, RendererContext, TextureCopyParameters } from "../RendererContext";
import { WEBGPUBuffer } from "./WEBGPUBuffer";
import { WEBGPUShader } from "./WEBGPUShader";
import { WEBGPUTexture } from "./WEBGPUTexture";
export declare class WEBGPURendererContext implements RendererContext {
    private static activeRenderPass;
    static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget, timestamp?: boolean): void;
    static EndRenderPass(): void;
    static DrawGeometry(geometry: Geometry, shader: WEBGPUShader, instanceCount?: number): void;
    static DrawIndirect(geometry: Geometry, shader: WEBGPUShader, indirectBuffer: WEBGPUBuffer, indirectOffset: number): void;
    static SetViewport(x: number, y: number, width: number, height: number, minDepth: number, maxDepth: number): void;
    static SetScissor(x: number, y: number, width: number, height: number): void;
    static CopyBufferToBuffer(source: WEBGPUBuffer, destination: WEBGPUBuffer, sourceOffset: number, destinationOffset: number, size: number): void;
    static CopyBufferToTexture(source: BufferCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
    static CopyTextureToTexture(source: WEBGPUTexture, destination: WEBGPUTexture, srcMip: number, dstMip: number, size?: number[]): void;
    static CopyTextureToBuffer(source: WEBGPUTexture, destination: WEBGPUBuffer, srcMip: number, size?: number[]): void;
    static CopyTextureToBufferV2(source: TextureCopyParameters, destination: BufferCopyParameters, copySize?: number[]): void;
    static CopyTextureToTextureV2(source: WEBGPUTexture, destination: WEBGPUTexture, srcMip: number, dstMip: number, size?: number[], depth?: number): void;
    static CopyTextureToTextureV3(source: TextureCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
    static ClearBuffer(buffer: WEBGPUBuffer, offset: number, size: number): void;
}
//# sourceMappingURL=WEBGPURendererContext.d.ts.map