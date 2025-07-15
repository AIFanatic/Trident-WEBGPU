/// <reference types="@webgpu/types" />
const adapter = navigator ? await navigator.gpu.requestAdapter() : null;
if (!adapter)
    throw Error("WEBGPU not supported");
const requiredLimits = {};
// @ts-ignore
for (const key in adapter.limits)
    requiredLimits[key] = adapter.limits[key];
const features = [];
if (adapter.features.has("timestamp-query"))
    features.push("timestamp-query");
const device = adapter ? await adapter.requestDevice({
    requiredFeatures: features,
    requiredLimits: requiredLimits
}) : null;
export class WEBGPURenderer {
    static adapter;
    static device;
    static context;
    static presentationFormat;
    static activeCommandEncoder = null;
    constructor(canvas) {
        if (!adapter || !device)
            throw Error("WEBGPU not supported");
        const context = canvas.getContext("webgpu");
        if (!context)
            throw Error("Could not get WEBGPU context");
        WEBGPURenderer.adapter = adapter;
        WEBGPURenderer.device = device;
        WEBGPURenderer.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format: WEBGPURenderer.presentationFormat });
        WEBGPURenderer.adapter = adapter;
        WEBGPURenderer.device = device;
        WEBGPURenderer.context = context;
        WEBGPURenderer.context.configure({
            device: WEBGPURenderer.device,
            format: WEBGPURenderer.presentationFormat,
            alphaMode: "opaque",
        });
    }
    static GetActiveCommandEncoder() { return WEBGPURenderer.activeCommandEncoder; }
    static BeginRenderFrame() {
        if (WEBGPURenderer.activeCommandEncoder !== null) {
            console.warn("Only one active encoder pipeline is allowed.");
            return;
        }
        WEBGPURenderer.activeCommandEncoder = WEBGPURenderer.device.createCommandEncoder();
    }
    static EndRenderFrame() {
        if (WEBGPURenderer.activeCommandEncoder === null) {
            console.log("There is no active render pass.");
            return;
        }
        WEBGPURenderer.device.queue.submit([WEBGPURenderer.activeCommandEncoder.finish()]);
        WEBGPURenderer.activeCommandEncoder = null;
    }
    static HasActiveFrame() {
        return WEBGPURenderer.activeCommandEncoder !== null;
    }
    static OnFrameCompleted() {
        return WEBGPURenderer.device.queue.onSubmittedWorkDone();
    }
}
