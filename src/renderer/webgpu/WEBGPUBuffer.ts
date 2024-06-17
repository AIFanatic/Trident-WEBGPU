import { Buffer, BufferType } from "../Buffer";
import { WEBGPURenderer } from "./WEBGPURenderer";


export class WEBGPUBuffer implements Buffer {
    private buffer: GPUBuffer;
    public readonly size: number;

    constructor(sizeInBytes: number, type: BufferType) {
        let usage = GPUBufferUsage.STORAGE;
        if (type == BufferType.VERTEX) usage = GPUBufferUsage.VERTEX;
        else if (type == BufferType.INDEX) usage = GPUBufferUsage.INDEX;
        this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage: usage | GPUBufferUsage.COPY_DST });
        this.size = sizeInBytes;
    }

    public GetBuffer(): GPUBuffer { return this.buffer };

    public SetArray(array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {
        WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
    }
}