import { Renderer } from "../Renderer";
export declare class WEBGPURenderer implements Renderer {
    static adapter: GPUAdapter;
    static device: GPUDevice;
    static context: GPUCanvasContext;
    static presentationFormat: GPUTextureFormat;
    private static activeCommandEncoder;
    constructor(canvas: HTMLCanvasElement);
    static GetActiveCommandEncoder(): GPUCommandEncoder | null;
    static BeginRenderFrame(): void;
    static EndRenderFrame(): void;
    static HasActiveFrame(): boolean;
    static OnFrameCompleted(): Promise<undefined>;
}
//# sourceMappingURL=WEBGPURenderer.d.ts.map