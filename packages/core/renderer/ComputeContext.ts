import { Renderer } from "./Renderer";
import { DynamicBuffer } from "./Buffer";
import { ShaderCompute } from "./Shader";
import { WEBGPUTimestampQuery } from "./webgpu/utils/WEBGPUTimestampQuery";

export class ComputeContext implements ComputeContext {
    private static activeComputePass: GPUComputePassEncoder | null = null;

    public static BeginComputePass(name: string, timestamp: boolean = false) {
        const activeCommandEncoder = Renderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");
        if (this.activeComputePass) throw Error("There is already an active compute pass");

        const computePassDescriptor: GPUComputePassDescriptor = {};

        if (timestamp === true) computePassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);
        
        this.activeComputePass = activeCommandEncoder.beginComputePass(computePassDescriptor);
        this.activeComputePass.label = "ComputePass: " + name;
        
    }

    public static EndComputePass() {
        if (!this.activeComputePass) throw Error("No active compute pass");
        this.activeComputePass.end();
        this.activeComputePass = null;

        WEBGPUTimestampQuery.EndRenderTimestamp();
    }

    public static Dispatch(computeShader: ShaderCompute, workgroupCountX: number, workgroupCountY: number = 1, workgroupCountZ: number = 1) {
        if (!this.activeComputePass) throw Error("No active render pass");

        if (!computeShader.OnPreRender()) return;
        computeShader.Compile();

        if (!computeShader.pipeline) throw Error("Shader doesnt have a pipeline");

        this.activeComputePass.setPipeline(computeShader.pipeline);
        for (let i = 0; i < computeShader.bindGroups.length; i++) {
            let dynamicOffsetsV2: number[] = [];
            for (const buffer of computeShader.bindGroupsInfo[i].buffers) {
                if (buffer instanceof DynamicBuffer)  {
                    dynamicOffsetsV2.push(buffer.dynamicOffset);
                }
            }
            this.activeComputePass.setBindGroup(i, computeShader.bindGroups[i], dynamicOffsetsV2);
        }

        this.activeComputePass.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }
}