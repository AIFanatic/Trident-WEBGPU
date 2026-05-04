/// <reference types="@webgpu/types" />

import { EventSystem } from "../Events";
import { RegisterBuiltinGeometries } from "../Geometry";
import { System } from "../System";
import { RendererInfo } from "./RendererInfo";
import { RenderingPipeline } from "./RenderingPipeline";
import { TextureFormat } from "./Texture";

export class RendererEvents {
    public static Created = (renderer: Renderer) => {}
    public static Resized = (canvas: HTMLCanvasElement) => {}
    public static FrameEnded = () => {}
}

export class Renderer extends System {
    public static canvas: HTMLCanvasElement;
    public static adapter: GPUAdapter;
    public static device: GPUDevice;
    public static context: GPUCanvasContext;
    public static SwapChainFormat: TextureFormat;
    public static type = "webgpu";
    public static width: number;
    public static height: number;

    public static info: RendererInfo = new RendererInfo();
    private static activeCommandEncoder: GPUCommandEncoder | null = null;

    // TODO: Remove one
    public static RenderPipeline: RenderingPipeline;
    public RenderPipeline: RenderingPipeline;

    private previousTime: number = 0;

    constructor(canvas: HTMLCanvasElement, aspectRatio = 1) {
        super();

        if (canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth * aspectRatio;
            canvas.height = canvas.parentElement.clientHeight * aspectRatio;
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.userSelect = "none";
        }

        if (globalThis.ResizeObserver) {
            const observer = new ResizeObserver(entries => {
                canvas.width = canvas.parentElement.clientWidth * aspectRatio;
                canvas.height = canvas.parentElement.clientHeight * aspectRatio;
                Renderer.width = canvas.width;
                Renderer.height = canvas.height;
                EventSystem.emit(RendererEvents.Resized, canvas);
            });
            observer.observe(canvas);
        }

        Renderer.canvas = canvas;
        Renderer.type = "webgpu";
        Renderer.width = canvas.width;
        Renderer.height = canvas.height;
    }

    public async Start() {
        const context = Renderer.canvas.getContext("webgpu");
        if (!context) throw Error("Could not get WEBGPU context");
        
        const adapter = navigator ? await navigator.gpu.requestAdapter() : null;
        if (!adapter) throw Error("WEBGPU not supported");

        const requiredLimits: {[key: string]: number} = {};
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

        context.configure({device: Renderer.device, format: Renderer.SwapChainFormat, alphaMode: "opaque" });

        Renderer.context = context;

        Renderer.device.onuncapturederror = (event) => {
            throw Error(`WebGPU uncaptured error: ${event.error}`);
        };

        EventSystem.emit(RendererEvents.Created, this);
        RegisterBuiltinGeometries();
        Renderer.RenderPipeline = new RenderingPipeline(this);
        this.RenderPipeline = Renderer.RenderPipeline;
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