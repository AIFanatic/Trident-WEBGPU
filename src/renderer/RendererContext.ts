import { RenderCommandBuffer } from "./RenderCommandBuffer";
import { Renderer } from "./Renderer";
import { WEBGPURendererContext } from "./webgpu/WEBGPURendererContext";

export class RendererContext {
    public static ProcessCommandBuffer(commandBuffer: RenderCommandBuffer) {
        if (Renderer.type === "webgpu") WEBGPURendererContext.ProcessCommandBuffer(commandBuffer);
        else throw Error("Unknown render api type.");
    }
}