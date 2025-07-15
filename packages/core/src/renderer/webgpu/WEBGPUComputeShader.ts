import { Compute, ComputeShaderParams } from "../Shader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
import { pipelineLayoutCache } from "./WEBGPUShader";

export class WEBGPUComputeShader extends WEBGPUBaseShader implements Compute {
    private readonly computeEntrypoint: string | undefined;
    
    declare public readonly params: ComputeShaderParams;
    protected _pipeline: GPUComputePipeline | null = null;
    public get pipeline() { return this._pipeline };

    constructor(params: ComputeShaderParams) {
        super(params);
        this.params = params;
        this.computeEntrypoint = params.computeEntrypoint;
    }

    public Compile() {
        if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
            return;
        }

        console.log('%c Compiling shader', 'color: #ff0000');

        this.bindGroupLayouts = this.BuildBindGroupLayouts();
        this._bindGroups = this.BuildBindGroups();

        // let pipelineLayout = pipelineLayoutCache.get(this.bindGroupLayouts);
        // if (pipelineLayout === undefined) {
            let pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
                bindGroupLayouts: this.bindGroupLayouts
            });
        //     pipelineLayoutCache.set(this.bindGroupLayouts, pipelineLayout);
        // }

        // Pipeline descriptor
        const pipelineDescriptor: GPUComputePipelineDescriptor = {
            layout: pipelineLayout,
            compute: {module: this.module, entryPoint: this.computeEntrypoint}
        }

        // Pipeline
        this._pipeline = WEBGPURenderer.device.createComputePipeline(pipelineDescriptor);

        this.needsUpdate = false;
    }
}