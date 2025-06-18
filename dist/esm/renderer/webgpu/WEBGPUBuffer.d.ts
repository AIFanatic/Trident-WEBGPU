/// <reference types="@webgpu/types" />
import { Buffer, BufferType, DynamicBuffer } from "../Buffer";
declare class BaseBuffer {
    id: string;
    private buffer;
    readonly size: number;
    set name(name: string);
    get name(): string;
    constructor(sizeInBytes: number, type: BufferType);
    GetBuffer(): GPUBuffer;
    SetArray(array: ArrayBuffer, bufferOffset?: number, dataOffset?: number | undefined, size?: number | undefined): void;
    GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer>;
    Destroy(): void;
}
export declare class WEBGPUBuffer extends BaseBuffer implements Buffer {
    constructor(sizeInBytes: number, type: BufferType);
}
export declare class WEBGPUDynamicBuffer extends BaseBuffer implements DynamicBuffer {
    readonly minBindingSize: number;
    dynamicOffset: number;
    constructor(sizeInBytes: number, type: BufferType, minBindingSize: number);
}
export {};
