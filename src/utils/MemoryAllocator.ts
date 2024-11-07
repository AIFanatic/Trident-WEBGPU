import { Buffer, BufferType } from "../renderer/Buffer";

interface MemoryBlock {
    offset: number;
    size: number;
};
export class MemoryAllocator {
    private memorySize: number;
    private availableMemorySize: number;
    private freeBlocks: MemoryBlock[] = [];
    private usedBlocks: MemoryBlock[] = [];

    constructor(memorySize: number) {
        this.memorySize = memorySize;
        this.availableMemorySize = memorySize;
        this.freeBlocks.push({offset: 0, size: memorySize});
    }

    allocate(size: number): number {
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

    free(offset: number) {
        for (let i = 0; i < this.usedBlocks.length; i++) {
            const block = this.usedBlocks[i];
            if (block.offset === offset) {
                this.usedBlocks.splice(i, 1);
                this.freeBlocks.push(block);
                // this.mergeFreeBlocks();
                return;
            }
        }

        throw new Error(`No allocated block found at offset ${offset}`);
    }
}

export class BufferMemoryAllocator {
    private allocator: MemoryAllocator;
    private buffer: Buffer;
    private links: Map<any, number>;

    private static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;

    constructor(size: number) {
        this.allocator = new MemoryAllocator(size);
        this.buffer = Buffer.Create(size * BufferMemoryAllocator.BYTES_PER_ELEMENT, BufferType.STORAGE);
        this.links = new Map();

        // new MemoryAllocatorViewer(this.allocator)
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