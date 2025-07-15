import { Geometry } from "../Geometry";
import { Color } from "../math/Color";
import { Buffer } from "./Buffer";
import { Shader } from "./Shader";
import { DepthTexture, RenderTexture, Texture } from "./Texture";
import { WEBGPUBuffer } from "./webgpu/WEBGPUBuffer";
export interface RenderTarget {
    target?: RenderTexture;
    clear: boolean;
    color?: Color;
}
export interface DepthTarget {
    target: DepthTexture;
    clear: boolean;
}
export interface TextureCopyParameters {
    texture: Texture;
    mipLevel?: number;
    origin?: number[];
}
export interface BufferCopyParameters {
    buffer: Buffer;
    offset?: number;
    bytesPerRow?: number;
    rowsPerImage?: number;
}
export declare class RendererContext {
    private constructor();
    static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget, timestamp?: boolean): void;
    static EndRenderPass(): void;
    static SetViewport(x: number, y: number, width: number, height: number, minDepth?: number, maxDepth?: number): void;
    static SetScissor(x: number, y: number, width: number, height: number): void;
    static DrawGeometry(geometry: Geometry, shader: Shader, instanceCount?: number): void;
    static DrawIndirect(geometry: Geometry, shader: Shader, indirectBuffer: Buffer, indirectOffset?: number): void;
    static CopyBufferToBuffer(source: Buffer, destination: Buffer, sourceOffset?: number, destinationOffset?: number, size?: number | undefined): void;
    static CopyBufferToTexture(source: BufferCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
    static CopyTextureToTexture(source: Texture, destination: Texture, srcMip?: number, dstMip?: number, size?: number[]): void;
    static CopyTextureToBuffer(source: Texture, destination: WEBGPUBuffer, srcMip: number, size?: number[]): void;
    static CopyTextureToBufferV2(source: TextureCopyParameters, destination: BufferCopyParameters, copySize?: number[]): void;
    static CopyTextureToTextureV2(source: Texture, destination: Texture, srcMip?: number, dstMip?: number, size?: number[], depth?: number): void;
    static CopyTextureToTextureV3(source: TextureCopyParameters, destination: TextureCopyParameters, copySize?: number[]): void;
    static ClearBuffer(buffer: Buffer, offset?: number, size?: number): void;
}
//# sourceMappingURL=RendererContext.d.ts.map