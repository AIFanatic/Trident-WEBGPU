import { Renderer } from "./Renderer";
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./webgpu/WEBGPUBuffer";

export enum BufferType {
    STORAGE,
    STORAGE_WRITE,
    UNIFORM,
    VERTEX,
    INDEX
};

export class Buffer {
    public readonly size: number;

    public static Create(size: number, type: BufferType) {
        if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type);
        else throw Error("Renderer type invalid");
    }

    public SetArray(array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {}
    public async GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer> {return new ArrayBuffer(1)}
}

export class DynamicBuffer {
    public readonly size: number;
    public readonly minBindingSize: number | undefined;
    public dynamicOffset: number = 0;

    public static Create(size: number, type: BufferType, minBindingSize: number) {
        if (Renderer.type === "webgpu") return new WEBGPUDynamicBuffer(size, type, minBindingSize);
        else throw Error("Renderer type invalid");
    }

    public SetArray(array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {}
    public async GetData(sourceOffset?: number, destinationOffset?: number, size?: number): Promise<ArrayBuffer> {return new ArrayBuffer(1)}
}