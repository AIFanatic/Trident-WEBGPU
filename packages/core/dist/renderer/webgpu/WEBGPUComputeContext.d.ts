import { ComputeContext } from "../ComputeContext";
import { WEBGPUComputeShader } from "./WEBGPUComputeShader";
export declare class WEBGPUComputeContext implements ComputeContext {
    private static activeComputePass;
    static BeginComputePass(name: string, timestamp?: boolean): void;
    static EndComputePass(): void;
    static Dispatch(computeShader: WEBGPUComputeShader, workgroupCountX: number, workgroupCountY: number, workgroupCountZ: number): void;
}
//# sourceMappingURL=WEBGPUComputeContext.d.ts.map