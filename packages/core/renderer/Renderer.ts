/// <reference types="@webgpu/types" />

import { EventSystem } from "../Events";
import { RegisterBuiltinGeometries } from "../Geometry";
import { System } from "../System";
import { RendererInfo } from "./RendererInfo";
import { RenderingPipeline } from "./RenderingPipeline";
import { TextureFormat } from "./Texture";

export class RendererEvents {
    public static Created = (renderer: Renderer) => { }
    public static Resized = (canvas: HTMLCanvasElement) => { }
    public static FrameEnded = () => { }
}

type ResolutionMode =
    | { mode: "fit", scale?: number }                       // fit parent × scale (default 1.0)
    | { mode: "fixed", width: number, height: number };     // explicit resolution

export class Renderer extends System {
    public static canvas: HTMLCanvasElement;
    public static adapter: GPUAdapter;
    public static device: GPUDevice;
    public static context: GPUCanvasContext;
    public static SwapChainFormat: TextureFormat;
    public static type = "webgpu";
    public static width: number;
    public static height: number;
    private static resolution: ResolutionMode = { mode: "fit", scale: 1 };

    public static info: RendererInfo = new RendererInfo();
    private static activeCommandEncoder: GPUCommandEncoder | null = null;

    // TODO: Remove one
    public static RenderPipeline: RenderingPipeline;
    public RenderPipeline: RenderingPipeline;

    private previousTime: number = 0;

    constructor(canvas: HTMLCanvasElement) {
        super();

        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.userSelect = "none";

        Renderer.canvas = canvas;
        Renderer.type = "webgpu";

        this.applyResolution();

        if (globalThis.ResizeObserver) new ResizeObserver(() => { if (Renderer.resolution.mode === "fit") this.applyResolution()}).observe(canvas);
    }

    public SetResolution(res: ResolutionMode) {
        Renderer.resolution = res;
        this.applyResolution();
    }

    private applyResolution() {
        const c = Renderer.canvas;
        const r = Renderer.resolution;

        if (r.mode === "fixed") {
            c.width = r.width;
            c.height = r.height;
        } else {
            const parent = c.parentElement;
            const scale = r.scale ?? 1;
            const w = (parent?.clientWidth ?? c.clientWidth) * scale;
            const h = (parent?.clientHeight ?? c.clientHeight) * scale;
            c.width = Math.max(1, Math.floor(w));
            c.height = Math.max(1, Math.floor(h));
        }

        Renderer.width = c.width;
        Renderer.height = c.height;
        EventSystem.emit(RendererEvents.Resized, c);
    }

    public async Start() {
        const context = Renderer.canvas.getContext("webgpu");
        if (!context) throw Error("Could not get WEBGPU context");

        const adapter = navigator ? await navigator.gpu.requestAdapter() : null;
        if (!adapter) throw Error("WEBGPU not supported");

        const requiredLimits: { [key: string]: number } = {};
        // @ts-ignore
        for (const key in adapter.limits) requiredLimits[key] = adapter.limits[key];

        const features: GPUFeatureName[] = [];
        if (adapter.features.has("timestamp-query")) features.push("timestamp-query");
        if (adapter.features.has("indirect-first-instance")) features.push("indirect-first-instance"); // TODO: Needed for meshlets. Figure out a way for plugins to request these

        const device = adapter ? await adapter.requestDevice({
            requiredFeatures: features,
            requiredLimits: requiredLimits
        }) : null;

        if (!adapter || !device) throw Error("WEBGPU not supported");

        Renderer.adapter = adapter;
        Renderer.device = device;
        Renderer.SwapChainFormat = navigator.gpu.getPreferredCanvasFormat();

        context.configure({ device: Renderer.device, format: Renderer.SwapChainFormat, alphaMode: "opaque" });

        Renderer.context = context;

        Renderer.device.onuncapturederror = (event) => {
            throw Error(`WebGPU uncaptured error: ${event.error}`);
        };

        window.addEventListener("beforeunload", () => {
            device.destroy();
        });

        RegisterBuiltinGeometries();
        Renderer.RenderPipeline = new RenderingPipeline();
        this.RenderPipeline = Renderer.RenderPipeline;

        EventSystem.emit(RendererEvents.Created, this);
    }

    public static GetActiveCommandEncoder(): GPUCommandEncoder | null { return Renderer.activeCommandEncoder }

    public static BeginRenderFrame() {
        if (Renderer.activeCommandEncoder !== null) {
            console.warn("Only one active encoder pipeline is allowed.");
            return;
        }

        Renderer.activeCommandEncoder = Renderer.device.createCommandEncoder();
    }

    public static EndRenderFrame() {
        if (Renderer.activeCommandEncoder === null) {
            console.log("There is no active render pass.");
            return;
        }

        Renderer.device.queue.submit([Renderer.activeCommandEncoder.finish()]);
        Renderer.activeCommandEncoder = null;
    }

    public static HasActiveFrame(): boolean {
        return Renderer.activeCommandEncoder !== null;
    }

    public Update(): void {
        Renderer.info.frame++;
        const currentTime = performance.now();
        Renderer.info.deltaTime = currentTime - this.previousTime;
        this.previousTime = currentTime;
        Renderer.RenderPipeline.Render();
    }
}