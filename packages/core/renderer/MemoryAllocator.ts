import { EventSystem } from "../Events";
import { Buffer, BufferType, DynamicBuffer } from "../renderer/Buffer";
import { Renderer, RendererEvents } from "../renderer/Renderer";
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
        this.freeBlocks.push({ offset: 0, size: memorySize });
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

                this.usedBlocks.push({ offset: offset, size: size });
                return offset;
            }
        }

        throw Error("Not enough space.");
    }

    private mergeFreeBlocks() {
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
        this.buffer = new Buffer(size * BufferMemoryAllocator.BYTES_PER_ELEMENT, bufferType);
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

    public Destroy() {
        this.buffer.Destroy();
    }
}

export class DynamicBufferMemoryAllocatorDynamic {
    protected allocator: MemoryAllocator;
    protected buffer: DynamicBuffer;
    protected links: Map<any, number>;

    protected minBindingSize: number;
    protected bufferType: BufferType;

    constructor(slotCount: number, bufferType = BufferType.STORAGE, minBindingSize: number = 256) {
        this.minBindingSize = minBindingSize;
        this.allocator = new MemoryAllocator(slotCount);
        this.buffer = new DynamicBuffer(slotCount * minBindingSize, bufferType, minBindingSize);
        this.links = new Map();
        this.bufferType = bufferType;
    }

    public has(link: any): boolean {
        return this.links.has(link);
    }

    public set(link: any, data: Float32Array | Uint32Array): number {
        if (data.byteLength > this.minBindingSize) {
            throw Error(`Data size (${data.byteLength}) exceeds minBindingSize (${this.minBindingSize}).`);
        }

        let slotIndex = this.links.get(link);
        if (slotIndex === undefined) {
            slotIndex = this.allocator.allocate(1);
            this.links.set(link, slotIndex);
        }

        this.buffer.SetArray(data, slotIndex * this.minBindingSize);
        return slotIndex;
    }

    public delete(link: any) {
        const slotIndex = this.links.get(link);
        if (slotIndex === undefined) throw Error("Link not found");
        this.allocator.free(slotIndex);
        this.links.delete(link);
    }

    public getBuffer(): DynamicBuffer { return this.buffer; }
    public getAllocator(): MemoryAllocator { return this.allocator; }
    public getStride(): number { return this.minBindingSize; }
}

export class DynamicBufferMemoryAllocator extends BufferMemoryAllocator {
    private incrementAmount: number;

    constructor(size: number, incrementAmount?: number, bufferType = BufferType.STORAGE) {
        super(size, bufferType);
        this.incrementAmount = incrementAmount ?? size;
    }

    public get(link: any): number | null {
        return this.links.get(link) ?? null;
    }

    private grow(requiredSize: number): void {
        const oldCapacity = this.allocator.memorySize;
        const incrementAmount = Math.max(this.incrementAmount, requiredSize);
        const newCapacity = oldCapacity + incrementAmount;

        // Extend allocator space after the old capacity. Using allocated/used
        // memory here would create overlapping free blocks.
        this.allocator.memorySize = newCapacity;
        this.allocator.availableMemorySize += incrementAmount;
        this.allocator.freeBlocks.push({ offset: oldCapacity, size: incrementAmount });

        const oldBuffer = this.buffer;
        const newBuffer = new Buffer(newCapacity * BufferMemoryAllocator.BYTES_PER_ELEMENT, this.bufferType);

        const hasActiveFrame = Renderer.HasActiveFrame();
        if (!hasActiveFrame) Renderer.BeginRenderFrame();

        RendererContext.CopyBufferToBuffer(oldBuffer, newBuffer, 0, 0, oldBuffer.size);

        this.buffer = newBuffer;

        EventSystem.once(RendererEvents.FrameEnded, () => {
            oldBuffer.Destroy();
        });

        if (!hasActiveFrame) Renderer.EndRenderFrame();
    }

    private allocate(size: number): number {
        try {
            return this.allocator.allocate(size);
        } catch {
            // Allocation can fail even when total free memory is sufficient
            // when the existing free space is fragmented.
            this.grow(size);
            return this.allocator.allocate(size);
        }
    }

    /**
     * Reserves a contiguous block without uploading data.
     * The returned offset is measured in array elements, not bytes.
     */
    public reserve(link: any, size: number): number {
        let bufferOffset = this.links.get(link);

        if (bufferOffset === undefined) {
            bufferOffset = this.allocate(size);
            this.links.set(link, bufferOffset);
        }

        return bufferOffset;
    }

    public set(link: any, data: Float32Array | Uint32Array | Uint16Array | Uint8Array, bufferByteOffset: number = 0): number {
        const bufferOffset = this.reserve(link, data.length);
        const byteOffset = bufferOffset * DynamicBufferMemoryAllocator.BYTES_PER_ELEMENT + bufferByteOffset;

        // For TypedArrays, dataOffset and size are measured in elements.
        this.buffer.SetArray(data, byteOffset, 0, data.length);

        return bufferOffset;
    }

    public delete(link: any): void {
        const bufferOffset = this.links.get(link);
        if (bufferOffset === undefined) return;

        this.allocator.free(bufferOffset);
        this.links.delete(link);
    }
}