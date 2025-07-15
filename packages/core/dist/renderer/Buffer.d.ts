import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./webgpu/WEBGPUBuffer";
export declare enum BufferType {
    STORAGE = 0,
    STORAGE_WRITE = 1,
    UNIFORM = 2,
    VERTEX = 3,
    INDEX = 4,
    INDIRECT = 5
}
export declare class Buffer {
    readonly size: number;
    set name(name: string);
    get name(): string;
    protected constructor();
    static Create(size: number, type: BufferType): WEBGPUBuffer;
    SetArray(array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined): void;
    GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer>;
    Destroy(): void;
}
export declare class DynamicBuffer {
    readonly size: number;
    readonly minBindingSize: number | undefined;
    dynamicOffset: number;
    protected constructor();
    static Create(size: number, type: BufferType, minBindingSize: number): WEBGPUDynamicBuffer;
    SetArray(array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined): void;
    GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer>;
    Destroy(): void;
}
//# sourceMappingURL=Buffer.d.ts.map