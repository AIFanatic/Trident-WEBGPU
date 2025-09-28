import { Compute, ComputeShaderParams } from "../Shader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
import { pipelineLayoutCache } from "./WEBGPUShader";
import { Renderer } from "../Renderer";

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

        Renderer.info.compiledShadersStat += 1;
        
        this.needsUpdate = false;
    }

    public Serialize(): Object {
        return {
            code: this.params.code,
            defines: this.params.defines,
            uniforms: this.params.uniforms,
        };
    }
}