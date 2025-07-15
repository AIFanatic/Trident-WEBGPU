import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUBaseShader } from "./WEBGPUBaseShader";
export class WEBGPUComputeShader extends WEBGPUBaseShader {
    computeEntrypoint;
    _pipeline = null;
    get pipeline() { return this._pipeline; }
    ;
    constructor(params) {
        super(params);
        this.params = params;
        this.computeEntrypoint = params.computeEntrypoint;
    }
    Compile() {
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
        const pipelineDescriptor = {
            layout: pipelineLayout,
            compute: { module: this.module, entryPoint: this.computeEntrypoint }
        };
        // Pipeline
        this._pipeline = WEBGPURenderer.device.createComputePipeline(pipelineDescriptor);
        this.needsUpdate = false;
    }
}
