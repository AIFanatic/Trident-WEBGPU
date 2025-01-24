import { TextureFormat } from "./Texture";
import { WEBGPURenderer } from "./webgpu/WEBGPURenderer";

export type RendererAPIType = "webgpu";

export class Renderer {
    public static type: RendererAPIType;
    public static width: number;
    public static height: number;
    public static activeRenderer: Renderer;

    public static Create(canvas: HTMLCanvasElement, type: RendererAPIType): Renderer {
        Renderer.type = type;
        Renderer.width = canvas.width;
        Renderer.height = canvas.height;

        if (type === "webgpu") {
            this.activeRenderer = new WEBGPURenderer(canvas);
            return this.activeRenderer;
        }
        throw Error("Unknown render api type.");
    }

    public static get SwapChainFormat(): TextureFormat {
        if (Renderer.type === "webgpu") return WEBGPURenderer.presentationFormat as TextureFormat;
        throw Error("Unknown render api type.");
    }
    public static BeginRenderFrame() {
        if (Renderer.type === "webgpu") return WEBGPURenderer.BeginRenderFrame();
        throw Error("Unknown render api type.");
    }
    public static EndRenderFrame() {
        if (Renderer.type === "webgpu") return WEBGPURenderer.EndRenderFrame();
        throw Error("Unknown render api type.");
    }
    public static HasActiveFrame(): boolean {
        if (Renderer.type === "webgpu") return WEBGPURenderer.HasActiveFrame();
        throw Error("Unknown render api type.");
    }

    public static OnFrameCompleted(): Promise<undefined> {
        if (Renderer.type === "webgpu") return WEBGPURenderer.OnFrameCompleted();
        throw Error("Unknown render api type.");
    }
}