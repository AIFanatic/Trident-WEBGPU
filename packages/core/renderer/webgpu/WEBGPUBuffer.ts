import { UUID } from "../../utils";
import { Buffer, BufferType, DynamicBuffer } from "../Buffer";
import { Renderer } from "../Renderer";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { WEBGPURendererContext } from "./WEBGPURendererContext";

class BaseBuffer {
    public id = UUID();
    private buffer: GPUBuffer;
    public readonly size: number;

    public set name(name: string) { this.buffer.label = name};
    public get name(): string { return this.buffer.label };

    constructor(sizeInBytes: number, type: BufferType) {
        Renderer.info.gpuBufferSizeTotal += sizeInBytes;
        Renderer.info.gpuBufferCount++;
        let usage: GPUBufferUsageFlags | undefined = undefined;
        if (type == BufferType.STORAGE) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.STORAGE_WRITE) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.VERTEX) usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
        else if (type == BufferType.INDEX) usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
        else if (type == BufferType.UNIFORM) usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.INDIRECT) usage = GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
        else if (type == 10) usage = GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        if (!usage) throw Error("Invalid buffer usage");

        this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage: usage});
        this.size = sizeInBytes;
    }

    public GetBuffer(): GPUBuffer { return this.buffer };

    public SetArray(array: ArrayBuffer, bufferOffset: number = 0, dataOffset?: number | undefined, size?: number | undefined) {
        if (WEBGPURendererContext.HasActiveRenderPass()) {
            console.warn("Cannot set buffer data while there is an active render pass.");
            return;
        }
        if (WEBGPURenderer.GetActiveCommandEncoder()) {
            console.warn("Cannot set buffer data after a frame has started.");
            // return;
        }
        WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
    }

    public async GetData(sourceOffset: number = 0, destinationOffset: number = 0, size?: number): Promise<ArrayBuffer> {
        const readBuffer = WEBGPURenderer.device.createBuffer({
            size: size ? size : this.buffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        const commandEncoder = WEBGPURenderer.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(this.buffer, sourceOffset, readBuffer, destinationOffset, size ? size : this.buffer.size);
        WEBGPURenderer.device.queue.submit([commandEncoder.finish()]);

        await readBuffer.mapAsync(GPUMapMode.READ);
        const arrayBuffer = readBuffer.getMappedRange().slice(0);

        readBuffer.unmap();
        readBuffer.destroy();

        return arrayBuffer;
    }

    public Destroy() {
        Renderer.info.gpuBufferSizeTotal += -this.size;
        Renderer.info.gpuBufferCount--;
        this.buffer.destroy();
    }
}

export class WEBGPUBuffer extends BaseBuffer implements Buffer {
    constructor(sizeInBytes: number, type: BufferType) {
        super(sizeInBytes, type);
    }
}

export class WEBGPUDynamicBuffer extends BaseBuffer implements DynamicBuffer {
    public readonly minBindingSize: number;
    public dynamicOffset: number = 0;

    constructor(sizeInBytes: number, type: BufferType, minBindingSize: number) {
        super(sizeInBytes, type);
        this.minBindingSize = minBindingSize;
    }
}