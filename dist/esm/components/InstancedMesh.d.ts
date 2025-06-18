import { Buffer } from "../renderer/Buffer";
import { Matrix4 } from "../math/Matrix4";
import { Mesh } from "./Mesh";
export declare class InstancedMesh extends Mesh {
    private incrementInstanceCount;
    private _matricesBuffer;
    get matricesBuffer(): Buffer;
    private _instanceCount;
    get instanceCount(): number;
    SetMatrixAt(index: number, matrix: Matrix4): void;
}
