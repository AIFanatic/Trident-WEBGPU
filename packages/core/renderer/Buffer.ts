import { Renderer } from "./Renderer";
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./webgpu/WEBGPUBuffer";

export enum BufferType {
    STORAGE,
    STORAGE_WRITE,
    UNIFORM,
    VERTEX,
    INDEX,
    INDIRECT
};

export class Buffer {
    public readonly size: number;
    public set name(name: string) {};
    public get name(): string { return "Buffer" };

    protected constructor() {}

    public static Create(size: number, type: BufferType) {
        if (size === 0) throw Error("Tried to create a buffer with size 0");
        if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type);
        else throw Error("Renderer type invalid");
    }

    public SetArray(array: AllowSharedBufferSource, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {}
    public async GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<BufferSource> {return new ArrayBuffer(1)}
    public Destroy() {}
}

export class DynamicBuffer {
    public readonly size: number;
    public readonly minBindingSize: number | undefined;
    public dynamicOffset: number = 0;

    protected constructor() {}
    
    public static Create(size: number, type: BufferType, minBindingSize: number) {
        if (size === 0) throw Error("Tried to create a buffer with size 0");
        if (Renderer.type === "webgpu") return new WEBGPUDynamicBuffer(size, type, minBindingSize);
        else throw Error("Renderer type invalid");
    }

    public SetArray(array: AllowSharedBufferSource, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {}
    public async GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<BufferSource> {return new ArrayBuffer(1)}
    public Destroy() {}
}