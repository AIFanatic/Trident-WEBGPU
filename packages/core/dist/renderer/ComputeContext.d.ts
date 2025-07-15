import { Compute } from "./Shader";
export declare class ComputeContext {
    private constructor();
    static BeginComputePass(name: string, timestamp?: boolean): void;
    static EndComputePass(): void;
    static Dispatch(computeShader: Compute, workgroupCountX: number, workgroupCountY?: number, workgroupCountZ?: number): void;
}
//# sourceMappingURL=ComputeContext.d.ts.map