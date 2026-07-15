import { GPU } from "@trident/core";
import { Ptr } from "../Heap";

const STRIDE = 256;   // minStorageBufferOffsetAlignment

// The pass pointer: WebGPU's push-constant substitute. Every bindless shader binds
// this once; each slot holds ONE heap ptr (a pass/group/camera record). Selecting
// a slot is encode-time state — free to change mid-frame, per pass or per dispatch.
// Slots have no identity: meaning lives in the record behind the ptr, never here.
export class PassData {
    private static _buffer?: GPU.DynamicBuffer;
    private static count = 0;

    public static get buffer(): GPU.DynamicBuffer {
        if (!this._buffer) this._buffer = new GPU.DynamicBuffer(64 * STRIDE, GPU.BufferType.STORAGE, STRIDE);
        return this._buffer;
    }

    // Reserve a slot holding a heap ptr. Returns the slot's dynamic offset.
    public static Register(ptr: Ptr): number {
        const offset = this.count++ * STRIDE;
        this.buffer.SetArray(new Uint32Array([ptr]), offset);
        return offset;
    }

    // Re-point a slot (preFrame only — this is a buffer write).
    public static Set(offset: number, ptr: Ptr) {
        this.buffer.SetArray(new Uint32Array([ptr]), offset);
    }

    // Make a slot current for subsequent draws/dispatches. Encode-time, mid-frame safe.
    public static Select(offset: number) {
        this.buffer.dynamicOffset = offset;
    }
}