import { Renderer } from './Renderer.js';
import { WEBGPUBuffer, WEBGPUDynamicBuffer } from './webgpu/WEBGPUBuffer.js';

var BufferType = /* @__PURE__ */ ((BufferType2) => {
  BufferType2[BufferType2["STORAGE"] = 0] = "STORAGE";
  BufferType2[BufferType2["STORAGE_WRITE"] = 1] = "STORAGE_WRITE";
  BufferType2[BufferType2["UNIFORM"] = 2] = "UNIFORM";
  BufferType2[BufferType2["VERTEX"] = 3] = "VERTEX";
  BufferType2[BufferType2["INDEX"] = 4] = "INDEX";
  BufferType2[BufferType2["INDIRECT"] = 5] = "INDIRECT";
  return BufferType2;
})(BufferType || {});
class Buffer {
  size;
  set name(name) {
  }
  get name() {
    return "Buffer";
  }
  constructor() {
  }
  static Create(size, type) {
    if (size === 0) throw Error("Tried to create a buffer with size 0");
    if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type);
    else throw Error("Renderer type invalid");
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
  }
  async GetData(sourceOffset, destinationOffset, size) {
    return new ArrayBuffer(1);
  }
  Destroy() {
  }
}
class DynamicBuffer {
  size;
  minBindingSize;
  dynamicOffset = 0;
  constructor() {
  }
  static Create(size, type, minBindingSize) {
    if (size === 0) throw Error("Tried to create a buffer with size 0");
    if (Renderer.type === "webgpu") return new WEBGPUDynamicBuffer(size, type, minBindingSize);
    else throw Error("Renderer type invalid");
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
  }
  async GetData(sourceOffset, destinationOffset, size) {
    return new ArrayBuffer(1);
  }
  Destroy() {
  }
}

export { Buffer, BufferType, DynamicBuffer };
