import { Buffer } from "../renderer/Buffer";
interface MemoryBlock {
    offset: number;
    size: number;
}
export declare class MemoryAllocator {
    memorySize: number;
    availableMemorySize: number;
    freeBlocks: MemoryBlock[];
    usedBlocks: MemoryBlock[];
    constructor(memorySize: number);
    allocate(size: number): number;
    private mergeFreeBlocks;
    free(offset: number): void;
}
export declare class BufferMemoryAllocator {
    protected allocator: MemoryAllocator;
    protected buffer: Buffer;
    protected links: Map<any, number>;
    protected static BYTES_PER_ELEMENT: number;
    constructor(size: number);
    has(link: any): boolean;
    set(link: any, data: Float32Array | Uint32Array): number;
    delete(link: any): void;
    getBuffer(): Buffer;
    getAllocator(): MemoryAllocator;
}
export declare class DynamicBufferMemoryAllocator extends BufferMemoryAllocator {
    private incrementAmount;
    constructor(size: number, incrementAmount?: number);
    set(link: any, data: Float32Array | Uint32Array): number;
    delete(link: any): void;
}
export {};
