import { Buffer, BufferType, DynamicBuffer } from "../renderer/Buffer";
import { Renderer } from "../renderer/Renderer";
import { RendererContext } from "../renderer/RendererContext";

interface MemoryBlock {
    offset: number;
    size: number;
};
export class MemoryAllocator {
    public memorySize: number;
    public availableMemorySize: number;
    public freeBlocks: MemoryBlock[] = [];
    public usedBlocks: MemoryBlock[] = [];

    constructor(memorySize: number) {
        this.memorySize = memorySize;
        this.availableMemorySize = memorySize;
        this.freeBlocks.push({offset: 0, size: memorySize});
    }

    public allocate(size: number): number {
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

                this.usedBlocks.push({offset: offset, size: size});
                return offset;
            }
        }

        throw Error("Not enough space.");
    }

    private mergeFreeBlocks() {
        // First, sort the free blocks by their offset
        this.freeBlocks.sort((a, b) => a.offset - b.offset);
    
        // Then, iterate through the sorted free blocks and merge adjacent ones
        for (let i = 0; i < this.freeBlocks.length - 1; ) {
            const currentBlock = this.freeBlocks[i];
            const nextBlock = this.freeBlocks[i + 1];
    
            // Check if the current block is adjacent to the next block
            if (currentBlock.offset + currentBlock.size === nextBlock.offset) {
                // Merge the next block into the current block
                currentBlock.size += nextBlock.size;
    
                // Remove the next block from the freeBlocks array
                this.freeBlocks.splice(i + 1, 1);
                // Do not increment 'i' to check for further adjacent blocks
            } else {
                // Move to the next block
                i++;
            }
        }
    }

    public free(offset: number) {
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
    protected allocator: MemoryAllocator;
    protected buffer: Buffer;
    protected links: Map<any, number>;

    protected static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
    protected bufferType: BufferType;

    constructor(size: number, bufferType = BufferType.STORAGE) {
        this.allocator = new MemoryAllocator(size);
        this.buffer = Buffer.Create(size * BufferMemoryAllocator.BYTES_PER_ELEMENT, bufferType);
        this.links = new Map();
        this.bufferType = bufferType;
    }

    public has(link: any): boolean {
        return this.links.has(link);
    }

    public set(link: any, data: Float32Array | Uint32Array): number {
        let bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) {
            bufferOffset = this.allocator.allocate(data.length);
            this.links.set(link, bufferOffset);
        }
        this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
        return bufferOffset;
    }

    public delete(link: any) {
        const bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) throw Error("Link not found");
        this.allocator.free(bufferOffset);
        this.links.delete(link);
    }

    public getBuffer(): Buffer { return this.buffer; }
    public getAllocator(): MemoryAllocator { return this.allocator; }
}

export class DynamicBufferMemoryAllocator2 {
    protected allocator: MemoryAllocator;
    protected buffer: DynamicBuffer;
    protected links: Map<any, number>;

    protected static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
    protected bufferType: BufferType;

    constructor(size: number, bufferType = BufferType.STORAGE, minBindingSize: number = 256) {
        this.allocator = new MemoryAllocator(size);
        this.buffer = DynamicBuffer.Create(size * DynamicBufferMemoryAllocator2.BYTES_PER_ELEMENT, bufferType, minBindingSize);
        this.links = new Map();
        this.bufferType = bufferType;
    }

    public has(link: any): boolean {
        return this.links.has(link);
    }

    public set(link: any, data: Float32Array | Uint32Array): number {
        let bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) {
            bufferOffset = this.allocator.allocate(data.length);
            this.links.set(link, bufferOffset);
        }
        this.buffer.SetArray(data, bufferOffset * DynamicBufferMemoryAllocator2.BYTES_PER_ELEMENT, 0, data.length);
        return bufferOffset;
    }

    public delete(link: any) {
        const bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) throw Error("Link not found");
        this.allocator.free(bufferOffset);
        this.links.delete(link);
    }

    public getBuffer(): DynamicBuffer { return this.buffer; }
    public getAllocator(): MemoryAllocator { return this.allocator; }
    public setOffset(offset: number) { this.buffer.dynamicOffset = offset; }
}


export class DynamicBufferMemoryAllocator extends BufferMemoryAllocator {
    private incrementAmount: number;

    constructor(size: number, incrementAmount?: number, bufferType = BufferType.STORAGE) {
        super(size, bufferType);
        this.incrementAmount = incrementAmount ? incrementAmount : size;
    }

    public set(link: any, data: Float32Array | Uint32Array): number {
        let bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) {
            if (this.allocator.availableMemorySize - data.length < 0) {
                // Increment allocator
                const o = this.allocator.memorySize;
                const incrementAmount = this.incrementAmount > data.length ? this.incrementAmount : data.length;
                const oldMemorySize = this.allocator.memorySize - this.allocator.availableMemorySize;
                this.allocator.memorySize += incrementAmount;
                this.allocator.availableMemorySize += incrementAmount;
                this.allocator.freeBlocks.push({offset: oldMemorySize, size: incrementAmount});

                // Create new buffer
                const buffer = Buffer.Create(this.allocator.memorySize * BufferMemoryAllocator.BYTES_PER_ELEMENT, BufferType.STORAGE);
                const hasActiveFrame = Renderer.HasActiveFrame();
                if (!hasActiveFrame) Renderer.BeginRenderFrame();
                RendererContext.CopyBufferToBuffer(this.buffer, buffer);
                if (!hasActiveFrame) Renderer.EndRenderFrame();
                
                const oldBuffer = this.buffer;
                Renderer.OnFrameCompleted().then(() => {
                    oldBuffer.Destroy();
                })

                this.buffer = buffer;
            }
            
            bufferOffset = this.allocator.allocate(data.length);
            this.links.set(link, bufferOffset);
        }
        this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
        return bufferOffset;
    }

    public delete(link: any) {
        const bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) throw Error("Link not found");
        this.allocator.free(bufferOffset);
        this.links.delete(link);
        // TODO: Resize buffer
    }
}