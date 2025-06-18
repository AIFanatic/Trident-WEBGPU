import { Renderer } from "./Renderer";
import { WEBGPUComputeContext } from "./webgpu/WEBGPUComputeContext";
export class ComputeContext {
    constructor() { }
    static BeginComputePass(name, timestamp = false) {
        if (Renderer.type === "webgpu")
            WEBGPUComputeContext.BeginComputePass(name, timestamp);
        else
            throw Error("Unknown render api type.");
    }
    static EndComputePass() {
        if (Renderer.type === "webgpu")
            WEBGPUComputeContext.EndComputePass();
        else
            throw Error("Unknown render api type.");
    }
    static Dispatch(computeShader, workgroupCountX, workgroupCountY = 1, workgroupCountZ = 1) {
        if (Renderer.type === "webgpu")
            WEBGPUComputeContext.Dispatch(computeShader, workgroupCountX, workgroupCountY, workgroupCountZ);
        else
            throw Error("Unknown render api type.");
    }
}
//# sourceMappingURL=ComputeContext.js.map