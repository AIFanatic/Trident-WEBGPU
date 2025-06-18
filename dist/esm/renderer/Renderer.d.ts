import { TextureFormat } from "./Texture";
export type RendererAPIType = "webgpu";
export declare class Renderer {
    static type: RendererAPIType;
    static width: number;
    static height: number;
    static activeRenderer: Renderer;
    static Create(canvas: HTMLCanvasElement, type: RendererAPIType): Renderer;
    static get SwapChainFormat(): TextureFormat;
    static BeginRenderFrame(): void;
    static EndRenderFrame(): void;
    static HasActiveFrame(): boolean;
    static OnFrameCompleted(): Promise<undefined>;
}
