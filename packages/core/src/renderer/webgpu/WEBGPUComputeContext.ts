import { ComputeContext } from "../ComputeContext";
import { WEBGPUDynamicBuffer } from "./WEBGPUBuffer";
import { WEBGPUComputeShader } from "./WEBGPUComputeShader";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUTimestampQuery } from "./WEBGPUTimestampQuery";

export class WEBGPUComputeContext implements ComputeContext {
    private static activeComputePass: GPUComputePassEncoder | null = null;

    public static BeginComputePass(name: string, timestamp?: boolean) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
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

    public static Dispatch(computeShader: WEBGPUComputeShader, workgroupCountX: number, workgroupCountY: number, workgroupCountZ: number) {
        if (!this.activeComputePass) throw Error("No active render pass");

        computeShader.OnPreRender();
        computeShader.Compile();

        if (!computeShader.pipeline) throw Error("Shader doesnt have a pipeline");

        this.activeComputePass.setPipeline(computeShader.pipeline);
        for (let i = 0; i < computeShader.bindGroups.length; i++) {
            let dynamicOffsetsV2: number[] = [];
            for (const buffer of computeShader.bindGroupsInfo[i].buffers) {
                if (buffer instanceof WEBGPUDynamicBuffer)  {
                    dynamicOffsetsV2.push(buffer.dynamicOffset);
                }
            }
            this.activeComputePass.setBindGroup(i, computeShader.bindGroups[i], dynamicOffsetsV2);
        }

        this.activeComputePass.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }
}