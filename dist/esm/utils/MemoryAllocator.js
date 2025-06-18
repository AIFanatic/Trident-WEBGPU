import { Buffer, BufferType } from "../renderer/Buffer";
import { Renderer } from "../renderer/Renderer";
import { RendererContext } from "../renderer/RendererContext";
;
export class MemoryAllocator {
    memorySize;
    availableMemorySize;
    freeBlocks = [];
    usedBlocks = [];
    constructor(memorySize) {
        this.memorySize = memorySize;
        this.availableMemorySize = memorySize;
        this.freeBlocks.push({ offset: 0, size: memorySize });
    }
    allocate(size) {
        for (let i = 0; i < this.freeBlocks.length; i++) {
            const block = this.freeBlocks[i];
            if (block.size >= size) {
                const offset = block.offset;
                block.offset += size;
                block.size -= size;
                this.availableMemorySize -= size;
                if (block.size === 0) {
                    this.freeBlocks.splice(i, 1);
                }
                this.usedBlocks.push({ offset: offset, size: size });
                return offset;
            }
        }
        throw Error("Not enough space.");
    }
    mergeFreeBlocks() {
        // First, sort the free blocks by their offset
        this.freeBlocks.sort((a, b) => a.offset - b.offset);
        // Then, iterate through the sorted free blocks and merge adjacent ones
        for (let i = 0; i < this.freeBlocks.length - 1;) {
            const currentBlock = this.freeBlocks[i];
            const nextBlock = this.freeBlocks[i + 1];
            // Check if the current block is adjacent to the next block
            if (currentBlock.offset + currentBlock.size === nextBlock.offset) {
                // Merge the next block into the current block
                currentBlock.size += nextBlock.size;
                // Remove the next block from the freeBlocks array
                this.freeBlocks.splice(i + 1, 1);
                // Do not increment 'i' to check for further adjacent blocks
            }
            else {
                // Move to the next block
                i++;
            }
        }
    }
    free(offset) {
        for (let i = 0; i < this.usedBlocks.length; i++) {
            const block = this.usedBlocks[i];
            if (block.offset === offset) {
                this.usedBlocks.splice(i, 1);
                this.freeBlocks.push(block);
                this.mergeFreeBlocks();
                this.availableMemorySize += block.size;
                return;
            }
        }
        throw new Error(`No allocated block found at offset ${offset}`);
    }
}
export class BufferMemoryAllocator {
    allocator;
    buffer;
    links;
    static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
    constructor(size) {
        this.allocator = new MemoryAllocator(size);
        this.buffer = Buffer.Create(size * BufferMemoryAllocator.BYTES_PER_ELEMENT, BufferType.STORAGE);
        this.links = new Map();
    }
    has(link) {
        return this.links.has(link);
    }
    set(link, data) {
        let bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) {
            bufferOffset = this.allocator.allocate(data.length);
            this.links.set(link, bufferOffset);
        }
        this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
        return bufferOffset;
    }
    delete(link) {
        const bufferOffset = this.links.get(link);
        if (bufferOffset === undefined)
            throw Error("Link not found");
        this.allocator.free(bufferOffset);
        this.links.delete(link);
    }
    getBuffer() { return this.buffer; }
    getAllocator() { return this.allocator; }
}
export class DynamicBufferMemoryAllocator extends BufferMemoryAllocator {
    incrementAmount;
    constructor(size, incrementAmount) {
        super(size);
        this.incrementAmount = incrementAmount ? incrementAmount : size;
    }
    set(link, data) {
        let bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) {
            if (this.allocator.availableMemorySize - data.length < 0) {
                // Increment allocator
                const o = this.allocator.memorySize;
                const incrementAmount = this.incrementAmount > data.length ? this.incrementAmount : data.length;
                const oldMemorySize = this.allocator.memorySize - this.allocator.availableMemorySize;
                this.allocator.memorySize += incrementAmount;
                this.allocator.availableMemorySize += incrementAmount;
                this.allocator.freeBlocks.push({ offset: oldMemorySize, size: incrementAmount });
                console.log(`Incrementing DynamicBuffer from ${o} to ${this.allocator.memorySize}`);
                // Create new buffer
                const buffer = Buffer.Create(this.allocator.memorySize * BufferMemoryAllocator.BYTES_PER_ELEMENT, BufferType.STORAGE);
                const hasActiveFrame = Renderer.HasActiveFrame();
                if (!hasActiveFrame)
                    Renderer.BeginRenderFrame();
                RendererContext.CopyBufferToBuffer(this.buffer, buffer);
                if (!hasActiveFrame)
                    Renderer.EndRenderFrame();
                const oldBuffer = this.buffer;
                Renderer.OnFrameCompleted().then(() => {
                    oldBuffer.Destroy();
                });
                this.buffer = buffer;
            }
            bufferOffset = this.allocator.allocate(data.length);
            this.links.set(link, bufferOffset);
        }
        this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
        return bufferOffset;
    }
    delete(link) {
        const bufferOffset = this.links.get(link);
        if (bufferOffset === undefined)
            throw Error("Link not found");
        this.allocator.free(bufferOffset);
        this.links.delete(link);
        // TODO: Resize buffer
    }
}
//# sourceMappingURL=MemoryAllocator.js.map