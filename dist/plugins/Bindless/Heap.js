import { GPU } from '@trident/core';

const HEAP_SIZE_U32 = 1e8;
class Heap {
  // start at 16 so ptr 0 is never a valid pointer — no reserved registers
  static offset = 16;
  static _buffer;
  // Created lazily on first use — safe regardless of module load order
  // (the event-based init broke in the editor: renderer exists before user bundles load).
  static get buffer() {
    if (!Heap._buffer) Heap._buffer = new GPU.Buffer(HEAP_SIZE_U32 * 4, GPU.BufferType.INDIRECT);
    return Heap._buffer;
  }
  static alloc(countU32, align = 1) {
    Heap.offset = Math.ceil(Heap.offset / align) * align;
    if (Heap.offset + countU32 > HEAP_SIZE_U32) throw new Error("Heap is full");
    const ptr = Heap.offset;
    Heap.offset += countU32;
    return ptr;
  }
  static writeU32(ptr, values) {
    Heap.buffer.SetArray(new Uint32Array(values), ptr * 4);
  }
  static writeF32(ptr, values) {
    Heap.buffer.SetArray(values, ptr * 4);
  }
}
class VBuffer {
  ptr;
  size;
  // in u32/f32 elements, like everything heap-side
  constructor(size, align = 1) {
    this.size = size;
    this.ptr = Heap.alloc(size, align);
  }
  SetArray(data, offset = 0) {
    if (offset + data.length > this.size) throw new Error(`VBuffer overflow: ${offset}+${data.length} > ${this.size}`);
    Heap.buffer.SetArray(data, (this.ptr + offset) * 4);
  }
}

export { Heap, VBuffer };
