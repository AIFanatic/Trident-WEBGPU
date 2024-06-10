import { TextureFormat } from "./Texture";
import { WEBGPURenderer } from "./webgpu/WEBGPURenderer";

export type RendererAPIType = "webgpu";

export class Renderer {
    public static type: RendererAPIType;
    public static width: number;
    public static height: number;
    
    public static Create(canvas: HTMLCanvasElement, type: RendererAPIType): Renderer {
        Renderer.type = type;
        Renderer.width = canvas.width;
        Renderer.height = canvas.height;

        if (type === "webgpu") return new WEBGPURenderer(canvas);
        throw Error("Unknown render api type.");
    }

    public static get SwapChainFormat(): TextureFormat {
        if (Renderer.type === "webgpu") return WEBGPURenderer.presentationFormat as TextureFormat;
        throw Error("Unknown render api type.");
    }
    public BeginRenderFrame() {}
    public EndRenderFrame() {}
}