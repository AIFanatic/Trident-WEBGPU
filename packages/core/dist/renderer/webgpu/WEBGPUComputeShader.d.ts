import { Compute, ComputeShaderParams } from "../Shader";
import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
export declare class WEBGPUComputeShader extends WEBGPUBaseShader implements Compute {
    private readonly computeEntrypoint;
    readonly params: ComputeShaderParams;
    protected _pipeline: GPUComputePipeline | null;
    get pipeline(): GPUComputePipeline | null;
    constructor(params: ComputeShaderParams);
    Compile(): void;
}
//# sourceMappingURL=WEBGPUComputeShader.d.ts.map