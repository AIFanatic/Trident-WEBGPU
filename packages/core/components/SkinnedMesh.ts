import { Mesh } from "./Mesh";
import { Matrix4 } from "../math/Matrix4";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Transform } from "./Transform";

export class Skin {
    private joints: Transform[];
    private inverseBindMatrices: Float32Array[];
    public jointData: Float32Array;
    constructor(joints: Transform[], inverseBindMatrixData: Float32Array) {
        this.joints = joints;
        this.inverseBindMatrices = [];
        this.jointData = new Float32Array(joints.length * 16);
        for (let i = 0; i < joints.length; ++i) {
            this.inverseBindMatrices.push(new Float32Array(
                inverseBindMatrixData.buffer,
                inverseBindMatrixData.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i,
                16,
            ));
        }
    }

    private _matrix = new Matrix4();
    update(skinRootWorldMatrix: Matrix4) {
        for (let j = 0; j < this.joints.length; ++j) {
            const tmp = skinRootWorldMatrix.clone()
                .mul(this.joints[j].localToWorldMatrix)
                .mul(new Matrix4().setFromArray(this.inverseBindMatrices[j]));

            this.jointData.set(tmp.elements, j * 16);
        }
    }
}

export class SkinnedMesh extends Mesh {
    public skin: Skin;
    private boneMatricesBuffer: Buffer;

    constructor(gameObject) {
        super(gameObject);
    }

    public GetBoneMatricesBuffer(): Buffer {
        return this.boneMatricesBuffer;
    }

    public Start(): void {
        if (!this.skin) throw Error("SkinnedMesh needs a skin");

        this.boneMatricesBuffer = Buffer.Create(this.skin.jointData.length * 4, BufferType.STORAGE);
        this.boneMatricesBuffer.SetArray(this.skin.jointData);
    }

    public Update(): void {
        this.skin.update(this.gameObject.transform.worldToLocalMatrix);
        this.boneMatricesBuffer.SetArray(this.skin.jointData);
    }
}