import { Buffer, BufferType } from "../renderer/Buffer";
import { Matrix4 } from "../math/Matrix4";
import { MeshletMesh } from "./Meshlet";

export class InstancedMeshlet extends MeshletMesh {
    private _maxInstanceCount = 1000000;
    private _matricesBuffer: Buffer = Buffer.Create(this.maxInstanceCount * 4 * 16, BufferType.STORAGE);
    public get matricesBuffer(): Buffer { return this._matricesBuffer }
    
    private get maxInstanceCount(): number { return this._maxInstanceCount; }
    private set maxInstanceCount(maxInstanceCount: number) {
        this._maxInstanceCount = maxInstanceCount;
        Buffer.Create(this.maxInstanceCount * 4 * 16, BufferType.STORAGE);
    }

    private _instanceCount: number = 0;
    public get instanceCount(): number { return this._instanceCount};

    public matrices: Matrix4[] = [];

    public SetMatrixAt(index: number, matrix: Matrix4) {
        if (!this._matricesBuffer) throw Error("Matrices buffer not created.");
        if (index > this.maxInstanceCount) throw Error("Trying to create more instances than max instance count.");
        this._instanceCount = Math.max(index, this._instanceCount);
        this._matricesBuffer.SetArray(matrix.elements, 4 * 16 * index);

        if (!this.matrices[index]) this.matrices[index] = matrix;
    }
}