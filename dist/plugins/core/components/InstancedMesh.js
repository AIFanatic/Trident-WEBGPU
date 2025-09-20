import { Mesh } from './Mesh.js';
import { DynamicBufferMemoryAllocator } from '../renderer/MemoryAllocator.js';

class InstancedMesh extends Mesh {
  incrementInstanceCount = 1e3;
  _matricesBuffer = new DynamicBufferMemoryAllocator(this.incrementInstanceCount * 16);
  get matricesBuffer() {
    return this._matricesBuffer.getBuffer();
  }
  _instanceCount = 0;
  get instanceCount() {
    return this._instanceCount;
  }
  SetMatrixAt(index, matrix) {
    if (!this._matricesBuffer) throw Error("Matrices buffer not created.");
    this._instanceCount = Math.max(index, this._instanceCount);
    this._matricesBuffer.set(index, matrix.elements);
  }
  Destroy() {
    this.matricesBuffer.Destroy();
  }
}

export { InstancedMesh };
