/// <reference types="@webgpu/types" />
import { Compute, ComputeShaderParams } from "../Shader";
import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
export declare class WEBGPUComputeShader extends WEBGPUBaseShader implements Compute {
    private readonly computeEntrypoint;
    readonly params: ComputeShaderParams;
    protected _pipeline: GPUComputePipeline | null;
    get pipeline(): GPUComputePipeline;
    constructor(params: ComputeShaderParams);
    Compile(): void;
}
