import { TextureFormat } from "./Texture";
import { WEBGPURenderer } from "./webgpu/WEBGPURenderer";
import { RendererInfo } from "./RendererInfo";
import { EventSystem } from "../Events";

export type RendererAPIType = "webgpu";

export class RendererEvents {
    public static Resized = (canvas: HTMLCanvasElement) => {}
}

export class Renderer {
    public static type: RendererAPIType;
    public static width: number;
    public static height: number;
    public static activeRenderer: Renderer;

    public static info: RendererInfo = new RendererInfo();

    public static canvas: HTMLCanvasElement;

    public static Create(canvas: HTMLCanvasElement, type: RendererAPIType): Renderer {
        const aspectRatio = 1;
        canvas.width = canvas.parentElement.clientWidth * aspectRatio;
        canvas.height = canvas.parentElement.clientHeight * aspectRatio;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.userSelect = "none";

        const observer = new ResizeObserver(entries => {
            canvas.width = canvas.parentElement.clientWidth * aspectRatio;
            canvas.height = canvas.parentElement.clientHeight * aspectRatio;
            Renderer.width = canvas.width;
            Renderer.height = canvas.height;
            EventSystem.emit(RendererEvents.Resized, canvas);

            console.log("Resized")
        });
        observer.observe(canvas);

        Renderer.canvas = canvas;
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