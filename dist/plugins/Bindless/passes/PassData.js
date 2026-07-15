import { GPU } from '@trident/core';

const STRIDE = 256;
class PassData {
  static _buffer;
  static count = 0;
  static get buffer() {
    if (!this._buffer) this._buffer = new GPU.DynamicBuffer(64 * STRIDE, GPU.BufferType.STORAGE, STRIDE);
    return this._buffer;
  }
  // Reserve a slot holding a heap ptr. Returns the slot's dynamic offset.
  static Register(ptr) {
    const offset = this.count++ * STRIDE;
    this.buffer.SetArray(new Uint32Array([ptr]), offset);
    return offset;
  }
  // Re-point a slot (preFrame only — this is a buffer write).
  static Set(offset, ptr) {
    this.buffer.SetArray(new Uint32Array([ptr]), offset);
  }
  // Make a slot current for subsequent draws/dispatches. Encode-time, mid-frame safe.
  static Select(offset) {
    this.buffer.dynamicOffset = offset;
  }
}

export { PassData };
