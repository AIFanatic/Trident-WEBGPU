/// <reference types="@webgpu/types" />
export declare class WEBGPUTimestampQuery {
    private static querySet;
    private static resolveBuffer;
    private static resultBuffer;
    private static isTimestamping;
    private static links;
    private static currentLinkIndex;
    static BeginRenderTimestamp(name: string): GPURenderPassTimestampWrites | GPUComputePassTimestampWrites | undefined;
    static EndRenderTimestamp(): void;
    static GetResult(): Promise<Map<string, number>>;
}
