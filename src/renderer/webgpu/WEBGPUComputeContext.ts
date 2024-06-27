import { ComputeContext } from "../ComputeContext";
import { WEBGPUDynamicBuffer } from "./WEBGPUBuffer";
import { WEBGPUComputeShader } from "./shader/WEBGPUCompute";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUComputeContext implements ComputeContext {
    private static activeComputePass: GPUComputePassEncoder | null = null;

    public static BeginComputePass(name: string) {
        const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
        if (!activeCommandEncoder) throw Error("No active command encoder!!");
        if (this.activeComputePass) throw Error("There is already an active compute pass");

        const computePassDescriptor: GPUComputePassDescriptor = {};

        this.activeComputePass = activeCommandEncoder.beginComputePass(computePassDescriptor);
        this.activeComputePass.label = "ComputePass: " + name;
    }

    public static EndComputePass() {
        if (!this.activeComputePass) throw Error("No active compute pass");
        this.activeComputePass.end();
        this.activeComputePass = null;
    }

    public static Dispatch(computeShader: WEBGPUComputeShader, workgroupCountX: number, workgroupCountY: number, workgroupCountZ: number) {
        if (!this.activeComputePass) throw Error("No active render pass");

        computeShader.OnPreRender();

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