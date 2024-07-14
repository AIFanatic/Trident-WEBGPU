import { Geometry } from "../Geometry";
import { Color } from "../math/Color";
import { Buffer } from "./Buffer";
import { Renderer } from "./Renderer";
import { Shader } from "./Shader";
import { DepthTexture, RenderTexture, Texture } from "./Texture";
import { WEBGPUBuffer } from "./webgpu/WEBGPUBuffer";
import { WEBGPURendererContext } from "./webgpu/WEBGPURendererContext";
import { WEBGPUShader } from "./webgpu/shader/WEBGPUShader";
import { WEBGPUTexture } from "./webgpu/WEBGPUTexture";

export interface RenderTarget {
    target?: RenderTexture;
    clear: boolean;
    color?: Color;
};

export interface DepthTarget {
    target: DepthTexture;
    clear: boolean;
};

export class RendererContext {
    private constructor() {}
    
    public static BeginRenderPass(name: string, renderTargets: RenderTarget[], depthTarget?: DepthTarget, timestamp: boolean = false) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.BeginRenderPass(name, renderTargets, depthTarget, timestamp);
        else throw Error("Unknown render api type.");
    }

    public static EndRenderPass() {
        if (Renderer.type === "webgpu") WEBGPURendererContext.EndRenderPass();
        else throw Error("Unknown render api type.");
    }

    public static SetViewport(x: number, y: number, width: number, height: number, minDepth: number = 0, maxDepth: number = 1) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.SetViewport(x, y, width, height, minDepth, maxDepth);
        else throw Error("Unknown render api type.");
    }

    public static SetScissor(x: number, y: number, width: number, height: number) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.SetScissor(x, y, width, height);
        else throw Error("Unknown render api type.");
    }

    public static DrawGeometry(geometry: Geometry, shader: Shader, instanceCount?: number) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.DrawGeometry(geometry, shader as WEBGPUShader, instanceCount);
        else throw Error("Unknown render api type.");
    }

    public static DrawIndirect(geometry: Geometry, shader: Shader, indirectBuffer: Buffer, indirectOffset: number = 0) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.DrawIndirect(geometry, shader as WEBGPUShader, indirectBuffer as WEBGPUBuffer, indirectOffset);
        else throw Error("Unknown render api type.");
    }

    public static CopyBufferToBuffer(source: Buffer, destination: Buffer, sourceOffset: number = 0, destinationOffset: number = 0, size: number | undefined = undefined) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.CopyBufferToBuffer(source as WEBGPUBuffer, destination as WEBGPUBuffer, sourceOffset, destinationOffset, size ? size : source.size);
        else throw Error("Unknown render api type.");
    }

    public static CopyTextureToTexture(source: Texture, destination: Texture, srcMip = 0, dstMip = 0, size?: number[]) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTexture(source as WEBGPUTexture, destination as WEBGPUTexture, srcMip, dstMip, size);
        else throw Error("Unknown render api type.");
    }

    public static ClearBuffer(buffer: Buffer, offset: number = 0, size?: number) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.ClearBuffer(buffer as WEBGPUBuffer, offset, size ? size : buffer.size);
        else throw Error("Unknown render api type.");
    }
}