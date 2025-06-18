import { WEBGPUDynamicBuffer } from "./WEBGPUBuffer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPUTimestampQuery } from "./WEBGPUTimestampQuery";
export class WEBGPUComputeContext {
    static activeComputePass = null;
    static BeginComputePass(name, timestamp) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder)
            throw Error("No active command encoder!!");
        if (this.activeComputePass)
            throw Error("There is already an active compute pass");
        const computePassDescriptor = {};
        if (timestamp === true)
            computePassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);
        this.activeComputePass = activeCommandEncoder.beginComputePass(computePassDescriptor);
        this.activeComputePass.label = "ComputePass: " + name;
    }
    static EndComputePass() {
        if (!this.activeComputePass)
            throw Error("No active compute pass");
        this.activeComputePass.end();
        this.activeComputePass = null;
        WEBGPUTimestampQuery.EndRenderTimestamp();
    }
    static Dispatch(computeShader, workgroupCountX, workgroupCountY, workgroupCountZ) {
        if (!this.activeComputePass)
            throw Error("No active render pass");
        computeShader.OnPreRender();
        computeShader.Compile();
        if (!computeShader.pipeline)
            throw Error("Shader doesnt have a pipeline");
        this.activeComputePass.setPipeline(computeShader.pipeline);
        for (let i = 0; i < computeShader.bindGroups.length; i++) {
            let dynamicOffsetsV2 = [];
            for (const buffer of computeShader.bindGroupsInfo[i].buffers) {
                if (buffer instanceof WEBGPUDynamicBuffer) {
                    dynamicOffsetsV2.push(buffer.dynamicOffset);
                }
            }
            this.activeComputePass.setBindGroup(i, computeShader.bindGroups[i], dynamicOffsetsV2);
        }
        this.activeComputePass.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
    }
}
//# sourceMappingURL=WEBGPUComputeContext.js.map