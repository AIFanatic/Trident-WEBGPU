import { Renderer } from "./Renderer";
import { Compute } from "./Shader";
import { WEBGPUComputeShader } from "./webgpu/WEBGPUComputeShader";
import { WEBGPUComputeContext } from "./webgpu/WEBGPUComputeContext";

export class ComputeContext {
    private constructor() {}
    
    public static BeginComputePass(name: string, timestamp = false) {
        if (Renderer.type === "webgpu") WEBGPUComputeContext.BeginComputePass(name, timestamp);
        else throw Error("Unknown render api type.");
    }

    public static EndComputePass() {
        if (Renderer.type === "webgpu") WEBGPUComputeContext.EndComputePass();
        else throw Error("Unknown render api type.");
    }

    public static Dispatch(computeShader: Compute, workgroupCountX: number, workgroupCountY: number = 1, workgroupCountZ: number = 1) {
        if (Renderer.type === "webgpu") WEBGPUComputeContext.Dispatch(computeShader as WEBGPUComputeShader, workgroupCountX, workgroupCountY, workgroupCountZ);
        else throw Error("Unknown render api type.");
    }
}