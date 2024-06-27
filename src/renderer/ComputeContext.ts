import { Renderer } from "./Renderer";
import { Compute } from "./Shader";
import { WEBGPUCompute } from "./webgpu/WEBGPUCompute";
import { WEBGPUComputeContext } from "./webgpu/WEBGPUComputeContext";

export class ComputeContext {
    private constructor() {}
    
    public static BeginComputePass(name: string) {
        if (Renderer.type === "webgpu") WEBGPUComputeContext.BeginComputePass(name);
        else throw Error("Unknown render api type.");
    }

    public static EndComputePass() {
        if (Renderer.type === "webgpu") WEBGPUComputeContext.EndComputePass();
        else throw Error("Unknown render api type.");
    }

    public static Dispatch(computeShader: Compute, workgroupCountX: number, workgroupCountY: number = 1, workgroupCountZ: number = 1) {
        if (Renderer.type === "webgpu") WEBGPUComputeContext.Dispatch(computeShader as WEBGPUCompute, workgroupCountX, workgroupCountY, workgroupCountZ);
        else throw Error("Unknown render api type.");
    }
}