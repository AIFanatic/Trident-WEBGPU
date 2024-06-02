/// <reference types="@webgpu/types" />

import { Renderer } from "../Renderer";

const adapter = navigator ? await navigator.gpu.requestAdapter() : null;
const device = adapter ? await adapter.requestDevice() : null;

export class WEBGPURenderer implements Renderer {
    public static adapter: GPUAdapter;
    public static device: GPUDevice;
    public static context: GPUCanvasContext;
    public static presentationFormat: GPUTextureFormat;

    private static activeCommandEncoder: GPUCommandEncoder | null = null;

    constructor(canvas: HTMLCanvasElement) {
        if (!adapter || !device) throw Error("WEBGPU not supported");

        const context = canvas.getContext("webgpu");
        if (!context) throw Error("Could not get WEBGPU context");
        
        WEBGPURenderer.adapter = adapter;
        WEBGPURenderer.device = device;
        WEBGPURenderer.presentationFormat = navigator.gpu.getPreferredCanvasFormat();

        context.configure({device, format: WEBGPURenderer.presentationFormat });

        WEBGPURenderer.adapter = adapter;
        WEBGPURenderer.device = device;
        WEBGPURenderer.context = context;

        WEBGPURenderer.context.configure({
            device: WEBGPURenderer.device,
            format: WEBGPURenderer.presentationFormat,
            alphaMode: "opaque",
        });
    }

    public static GetActiveCommandEncoder(): GPUCommandEncoder | null { return WEBGPURenderer.activeCommandEncoder }

    public BeginRenderFrame() {
        if (WEBGPURenderer.activeCommandEncoder !== null) {
            console.warn("Only one active encoder pipeline is allowed.");
            return;
        }

        WEBGPURenderer.activeCommandEncoder = WEBGPURenderer.device.createCommandEncoder();
    }

    public EndRenderFrame() {
        if (WEBGPURenderer.activeCommandEncoder === null) {
            console.log("There is no active render pass.");
            return;
        }

        WEBGPURenderer.device.queue.submit([WEBGPURenderer.activeCommandEncoder.finish()]);

        WEBGPURenderer.activeCommandEncoder = null;
    }
}