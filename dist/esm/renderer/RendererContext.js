import { Renderer } from "./Renderer";
import { WEBGPURendererContext } from "./webgpu/WEBGPURendererContext";
;
;
export class RendererContext {
    constructor() { }
    static BeginRenderPass(name, renderTargets, depthTarget, timestamp = false) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.BeginRenderPass(name, renderTargets, depthTarget, timestamp);
        else
            throw Error("Unknown render api type.");
    }
    static EndRenderPass() {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.EndRenderPass();
        else
            throw Error("Unknown render api type.");
    }
    static SetViewport(x, y, width, height, minDepth = 0, maxDepth = 1) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.SetViewport(x, y, width, height, minDepth, maxDepth);
        else
            throw Error("Unknown render api type.");
    }
    static SetScissor(x, y, width, height) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.SetScissor(x, y, width, height);
        else
            throw Error("Unknown render api type.");
    }
    static DrawGeometry(geometry, shader, instanceCount) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.DrawGeometry(geometry, shader, instanceCount);
        else
            throw Error("Unknown render api type.");
    }
    static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset = 0) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.DrawIndirect(geometry, shader, indirectBuffer, indirectOffset);
        else
            throw Error("Unknown render api type.");
    }
    static CopyBufferToBuffer(source, destination, sourceOffset = 0, destinationOffset = 0, size = undefined) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size ? size : source.size);
        else
            throw Error("Unknown render api type.");
    }
    static CopyBufferToTexture(source, destination, copySize) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.CopyBufferToTexture(source, destination, copySize);
        else
            throw Error("Unknown render api type.");
    }
    static CopyTextureToTexture(source, destination, srcMip = 0, dstMip = 0, size) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.CopyTextureToTexture(source, destination, srcMip, dstMip, size);
        else
            throw Error("Unknown render api type.");
    }
    static CopyTextureToBuffer(source, destination, srcMip, size) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.CopyTextureToBuffer(source, destination, srcMip, size);
        else
            throw Error("Unknown render api type.");
    }
    static CopyTextureToBufferV2(source, destination, copySize) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.CopyTextureToBufferV2(source, destination, copySize);
        else
            throw Error("Unknown render api type.");
    }
    static CopyTextureToTextureV2(source, destination, srcMip = 0, dstMip = 0, size, depth) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.CopyTextureToTextureV2(source, destination, srcMip, dstMip, size, depth);
        else
            throw Error("Unknown render api type.");
    }
    static CopyTextureToTextureV3(source, destination, copySize) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.CopyTextureToTextureV3(source, destination, copySize);
        else
            throw Error("Unknown render api type.");
    }
    static ClearBuffer(buffer, offset = 0, size) {
        if (Renderer.type === "webgpu")
            WEBGPURendererContext.ClearBuffer(buffer, offset, size ? size : buffer.size);
        else
            throw Error("Unknown render api type.");
    }
}
//# sourceMappingURL=RendererContext.js.map