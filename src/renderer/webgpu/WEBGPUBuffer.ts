import { Utils } from "../../Utils";
import { Buffer, BufferType } from "../Buffer";
import { WEBGPURenderer } from "./WEBGPURenderer";


export class WEBGPUBuffer implements Buffer {
    private buffer: GPUBuffer;
    public readonly size: number;
    public readonly minBindingSize: number | undefined;

    constructor(sizeInBytes: number, type: BufferType, minBindingSize: number | undefined) {
        this.minBindingSize = minBindingSize;
        let usage: GPUBufferUsageFlags | undefined = undefined;
        if (type == BufferType.STORAGE) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.STORAGE_WRITE) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.VERTEX) usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.INDEX) usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.UNIFORM) usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        if (!usage) throw Error("Invalid buffer usage");

        this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage: usage});
        this.size = sizeInBytes;
    }

    public GetBuffer(): GPUBuffer { return this.buffer };

    public SetArray(array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {
        WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
    }
}