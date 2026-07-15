import { GPU } from "@trident/core";

export type Ptr = number;

const HEAP_SIZE_U32 = 100_000_000;   // 42 MB — keep your current value here

export class Heap {
    // start at 16 so ptr 0 is never a valid pointer — no reserved registers
    private static offset = 16;
    private static _buffer?: GPU.Buffer;

    // Created lazily on first use — safe regardless of module load order
    // (the event-based init broke in the editor: renderer exists before user bundles load).
    public static get buffer(): GPU.Buffer {
        if (!Heap._buffer) Heap._buffer = new GPU.Buffer(HEAP_SIZE_U32 * 4, GPU.BufferType.INDIRECT);
        return Heap._buffer;
    }

    public static alloc(countU32: number, align: number = 1): Ptr {
        Heap.offset = Math.ceil(Heap.offset / align) * align;
        if (Heap.offset + countU32 > HEAP_SIZE_U32) throw new Error("Heap is full");
        const ptr = Heap.offset;
        Heap.offset += countU32;
        return ptr;
    }

    public static writeU32(ptr: Ptr, values: ArrayLike<number>) {
        Heap.buffer.SetArray(new Uint32Array(values), ptr * 4);
    }

    public static writeF32(ptr: Ptr, values: Float32Array) {
        Heap.buffer.SetArray(values, ptr * 4);
    }
}

export class VBuffer {
    public readonly ptr: Ptr;
    public readonly size: number;   // in u32/f32 elements, like everything heap-side

    constructor(size: number, align: number = 1) {
        this.size = size;
        this.ptr = Heap.alloc(size, align);
    }

    public SetArray(data: Float32Array | Uint32Array, offset = 0) {
        if (offset + data.length > this.size) throw new Error(`VBuffer overflow: ${offset}+${data.length} > ${this.size}`);
        Heap.buffer.SetArray(data, (this.ptr + offset) * 4);
    }
}