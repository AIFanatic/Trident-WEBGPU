import { Utils } from "../../utils/Utils";
import { BufferType } from "../Buffer";
import { RendererDebug } from "../RendererDebug";
import { WEBGPURenderer } from "./WEBGPURenderer";
class BaseBuffer {
    id = Utils.UUID();
    buffer;
    size;
    set name(name) { this.buffer.label = name; }
    ;
    get name() { return this.buffer.label; }
    ;
    constructor(sizeInBytes, type) {
        RendererDebug.IncrementGPUBufferSize(sizeInBytes);
        let usage = undefined;
        if (type == BufferType.STORAGE)
            usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.STORAGE_WRITE)
            usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.VERTEX)
            usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.INDEX)
            usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.UNIFORM)
            usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        else if (type == BufferType.INDIRECT)
            usage = GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
        else if (type == 10)
            usage = GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
        if (!usage)
            throw Error("Invalid buffer usage");
        this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage: usage });
        this.size = sizeInBytes;
    }
    GetBuffer() { return this.buffer; }
    ;
    SetArray(array, bufferOffset = 0, dataOffset, size) {
        WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
    }
    async GetData(sourceOffset = 0, destinationOffset = 0, size) {
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
    Destroy() {
        RendererDebug.IncrementGPUBufferSize(-this.size);
        this.buffer.destroy();
    }
}
export class WEBGPUBuffer extends BaseBuffer {
    constructor(sizeInBytes, type) {
        super(sizeInBytes, type);
    }
}
export class WEBGPUDynamicBuffer extends BaseBuffer {
    minBindingSize;
    dynamicOffset = 0;
    constructor(sizeInBytes, type, minBindingSize) {
        super(sizeInBytes, type);
        this.minBindingSize = minBindingSize;
    }
}
//# sourceMappingURL=WEBGPUBuffer.js.map