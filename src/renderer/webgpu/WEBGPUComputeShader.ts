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
        console.warn("Compiling shader")

        this._bindGroupsInfo = this.BuildBindGroupLayouts();
        const bindGroupLayouts: GPUBindGroupLayout[] = [];
        this._bindGroups = [];
        for (const bindGroupInfo of this._bindGroupsInfo) {
            const bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({entries: bindGroupInfo.layoutEntries});
            bindGroupLayouts.push(bindGroupLayout);

            const bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
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