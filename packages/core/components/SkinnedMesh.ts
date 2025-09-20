import { Mesh } from "./Mesh";
import { Matrix4 } from "../math/Matrix4";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Transform } from "./Transform";

export class Skin {
    private joints: Transform[];
    private inverseBindMatrices: Float32Array[];
    private jointMatrices: Float32Array[];
    public jointData: Float32Array;
    constructor(joints: Transform[], inverseBindMatrixData: Float32Array) {
        this.joints = joints;
        this.inverseBindMatrices = [];
        this.jointMatrices = [];
        this.jointData = new Float32Array(joints.length * 16);
        for (let i = 0; i < joints.length; ++i) {
            this.inverseBindMatrices.push(new Float32Array(
                inverseBindMatrixData.buffer,
                inverseBindMatrixData.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i,
                16,
            ));
            this.jointMatrices.push(new Float32Array(
                this.jointData.buffer,
                Float32Array.BYTES_PER_ELEMENT * 16 * i,
                16,
            ));
        }
    }

    update(skinRootWorldMatrix: Float32Array) {
        const globalWorldInverse = new Matrix4(...skinRootWorldMatrix).invert();
        for (let j = 0; j < this.joints.length; ++j) {
            const tmp = globalWorldInverse.clone()
            .mul(this.joints[j].localToWorldMatrix)         // see #3 about order
            .mul(new Matrix4(...this.inverseBindMatrices[j]).transpose());
          
            this.jointMatrices[j].set(tmp.elements);
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

        console.log("this.skin", this.skin)
        this.boneMatricesBuffer = Buffer.Create(this.skin.jointData.length * 4, BufferType.STORAGE);
        this.boneMatricesBuffer.SetArray(this.skin.jointData);
    }

    public Update() {
        // this.skin.update(this.gameObject.transform.localToWorldMatrix.elements);
        // this.boneMatricesBuffer.SetArray(this.skin.jointData);
    }
    public LateUpdate(): void {
        this.skin.update(this.gameObject.transform.localToWorldMatrix.elements);
        this.boneMatricesBuffer.SetArray(this.skin.jointData);
    }
}