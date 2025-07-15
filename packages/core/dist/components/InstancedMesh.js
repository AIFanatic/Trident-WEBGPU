import { Mesh } from "./Mesh";
import { DynamicBufferMemoryAllocator } from "../utils/MemoryAllocator";
export class InstancedMesh extends Mesh {
    incrementInstanceCount = 1000;
    _matricesBuffer = new DynamicBufferMemoryAllocator(this.incrementInstanceCount * 16);
    get matricesBuffer() { return this._matricesBuffer.getBuffer(); }
    _instanceCount = 0;
    get instanceCount() { return this._instanceCount; }
    ;
    SetMatrixAt(index, matrix) {
        if (!this._matricesBuffer)
            throw Error("Matrices buffer not created.");
        // if (index > this.maxInstanceCount) throw Error("Trying to create more instances than max instance count.");
        this._instanceCount = Math.max(index, this._instanceCount);
        // this._matricesBuffer.SetArray(matrix.elements, 4 * 16 * index);
        this._matricesBuffer.set(index, matrix.elements);
    }
}
