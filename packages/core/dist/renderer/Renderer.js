import { WEBGPURenderer } from "./webgpu/WEBGPURenderer";
export class Renderer {
    static type;
    static width;
    static height;
    static activeRenderer;
    static Create(canvas, type) {
        Renderer.type = type;
        Renderer.width = canvas.width;
        Renderer.height = canvas.height;
        if (type === "webgpu") {
            this.activeRenderer = new WEBGPURenderer(canvas);
            return this.activeRenderer;
        }
        throw Error("Unknown render api type.");
    }
    static get SwapChainFormat() {
        if (Renderer.type === "webgpu")
            return WEBGPURenderer.presentationFormat;
        throw Error("Unknown render api type.");
    }
    static BeginRenderFrame() {
        if (Renderer.type === "webgpu")
            return WEBGPURenderer.BeginRenderFrame();
        throw Error("Unknown render api type.");
    }
    static EndRenderFrame() {
        if (Renderer.type === "webgpu")
            return WEBGPURenderer.EndRenderFrame();
        throw Error("Unknown render api type.");
    }
    static HasActiveFrame() {
        if (Renderer.type === "webgpu")
            return WEBGPURenderer.HasActiveFrame();
        throw Error("Unknown render api type.");
    }
    static OnFrameCompleted() {
        if (Renderer.type === "webgpu")
            return WEBGPURenderer.OnFrameCompleted();
        throw Error("Unknown render api type.");
    }
}
