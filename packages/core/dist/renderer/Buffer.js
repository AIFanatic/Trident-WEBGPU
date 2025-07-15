import { Renderer } from "./Renderer";
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from "./webgpu/WEBGPUBuffer";
export var BufferType;
(function (BufferType) {
    BufferType[BufferType["STORAGE"] = 0] = "STORAGE";
    BufferType[BufferType["STORAGE_WRITE"] = 1] = "STORAGE_WRITE";
    BufferType[BufferType["UNIFORM"] = 2] = "UNIFORM";
    BufferType[BufferType["VERTEX"] = 3] = "VERTEX";
    BufferType[BufferType["INDEX"] = 4] = "INDEX";
    BufferType[BufferType["INDIRECT"] = 5] = "INDIRECT";
})(BufferType || (BufferType = {}));
;
export class Buffer {
    size;
    set name(name) { }
    ;
    get name() { return "Buffer"; }
    ;
    constructor() { }
    static Create(size, type) {
        if (size === 0)
            throw Error("Tried to create a buffer with size 0");
        if (Renderer.type === "webgpu")
            return new WEBGPUBuffer(size, type);
        else
            throw Error("Renderer type invalid");
    }
    SetArray(array, bufferOffset = 0, dataOffset, size) { }
    async GetData(sourceOffset, destinationOffset, size) { return new ArrayBuffer(1); }
    Destroy() { }
}
export class DynamicBuffer {
    size;
    minBindingSize;
    dynamicOffset = 0;
    constructor() { }
    static Create(size, type, minBindingSize) {
        if (size === 0)
            throw Error("Tried to create a buffer with size 0");
        if (Renderer.type === "webgpu")
            return new WEBGPUDynamicBuffer(size, type, minBindingSize);
        else
            throw Error("Renderer type invalid");
    }
    SetArray(array, bufferOffset = 0, dataOffset, size) { }
    async GetData(sourceOffset, destinationOffset, size) { return new ArrayBuffer(1); }
    Destroy() { }
}
