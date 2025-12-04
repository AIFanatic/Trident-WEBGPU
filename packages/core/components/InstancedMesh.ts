import { Buffer } from "../renderer/Buffer";
import { Matrix4 } from "../math/Matrix4";
import { Mesh } from "./Mesh";
import { DynamicBufferMemoryAllocator } from "../renderer/MemoryAllocator";

export class InstancedMesh extends Mesh {
    private incrementInstanceCount = 1000;
    private _matricesBuffer = new DynamicBufferMemoryAllocator(this.incrementInstanceCount * 16);
    
    public get matricesBuffer(): Buffer { return this._matricesBuffer.getBuffer() }

    private _instanceCount: number = 0;
    public get instanceCount(): number { return this._instanceCount};

    public ResetInstances(): void {
        this._instanceCount = 0;
    }

    public SetMatrixAt(index: number, matrix: Matrix4) {
        this._instanceCount = Math.max(index, this._instanceCount);
        this._matricesBuffer.set(index, matrix.elements);
    }

    public Destroy(): void {
        this.matricesBuffer.Destroy();
    }
}