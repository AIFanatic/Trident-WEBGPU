import { Renderer } from "./Renderer";
import { WEBGPUBuffer } from "./webgpu/WEBGPUBuffer";

export enum BufferType {
    STORAGE,
    STORAGE_WRITE,
    UNIFORM,
    VERTEX,
    INDEX
};

export class Buffer {
    public readonly size: number;
    public readonly minBindingSize: number | undefined;

    public static Create(size: number, type: BufferType, minBindingSize: number | undefined = undefined) {
        if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type, minBindingSize);
        else throw Error("Renderer type invalid");
    }

    public SetArray(array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {}
}