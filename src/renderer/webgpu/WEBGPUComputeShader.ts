import { Compute, ComputeShaderParams } from "../Shader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUBaseShader } from "./WEBGPUBaseShader";

export class WEBGPUComputeShader extends WEBGPUBaseShader implements Compute {
    private readonly computeEntrypoint: string | undefined;
    
    public readonly params: ComputeShaderParams;
    protected _pipeline: GPUComputePipeline | null = null;
    public get pipeline() { return this._pipeline };

    constructor(params: ComputeShaderParams) {
        super(params);
        this.params = params;
        this.computeEntrypoint = params.computeEntrypoint;
    }

    public RebuildDescriptors() {
        // console.warn("Compiling shader")
        console.log('%c Compiling shader', 'color: #3498db');

        this._bindGroupsInfo = this.BuildBindGroup();
        if (this._bindGroupsInfo.length !== this.bindGroupsLayout.length) {
            throw Error(`BindGroupLayout length (${this.bindGroupsLayout.length}) doesn't match the size of the BindGroup entries (${this._bindGroupsInfo.length})`)
        }
        const bindGroupLayouts: GPUBindGroupLayout[] = [];
        this._bindGroups = [];
        for (let i = 0; i < this._bindGroupsInfo.length; i++) {
            const bindGroup = WEBGPURenderer.device.createBindGroup({ layout: this.bindGroupsLayout[i], entries: this._bindGroupsInfo[i].entries });
            this._bindGroups.push(bindGroup);
        }

        const pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
            bindGroupLayouts: bindGroupLayouts  // Array of all bind group layouts used
        });

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