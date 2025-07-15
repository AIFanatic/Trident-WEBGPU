declare class _RendererDebug {
    viewTypeValue: number;
    heightScaleValue: number;
    useHeightMapValue: boolean;
    private gpuBufferSizeTotal;
    private gpuTextureSizeTotal;
    SetPassTime(name: string, time: number): void;
    SetCPUTime(value: number): void;
    SetTriangleCount(count: number): void;
    IncrementTriangleCount(count: number): void;
    SetVisibleTriangleCount(count: number): void;
    IncrementVisibleTriangleCount(count: number): void;
    SetFPS(count: number): void;
    IncrementBindGroupLayouts(value: number): void;
    IncrementBindGroups(value: number): void;
    private FormatBytes;
    IncrementGPUBufferSize(value: number): void;
    IncrementGPUTextureSize(value: number): void;
    IncrementDrawCalls(count: number): void;
    IncrementShaderCompiles(count: number): void;
    ResetFrame(): void;
}
export declare const RendererDebug: _RendererDebug;
export {};
//# sourceMappingURL=RendererDebug.d.ts.map