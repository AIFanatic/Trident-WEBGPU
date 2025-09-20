import { Mesh } from './Mesh.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Buffer, BufferType } from '../renderer/Buffer.js';

class Skin {
  joints;
  inverseBindMatrices;
  jointMatrices;
  jointData;
  constructor(joints, inverseBindMatrixData) {
    this.joints = joints;
    this.inverseBindMatrices = [];
    this.jointMatrices = [];
    this.jointData = new Float32Array(joints.length * 16);
    for (let i = 0; i < joints.length; ++i) {
      this.inverseBindMatrices.push(new Float32Array(
        inverseBindMatrixData.buffer,
        inverseBindMatrixData.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i,
        16
      ));
      this.jointMatrices.push(new Float32Array(
        this.jointData.buffer,
        Float32Array.BYTES_PER_ELEMENT * 16 * i,
        16
      ));
    }
  }
  update(skinRootWorldMatrix) {
    const globalWorldInverse = skinRootWorldMatrix.clone().invert();
    for (let j = 0; j < this.joints.length; ++j) {
      const jointXform = this.joints[j];
      const jointMatrix = globalWorldInverse.clone().mul(jointXform.localToWorldMatrix);
      const finalMatrix = jointMatrix.mul(new Matrix4(...this.inverseBindMatrices[j]));
      this.jointMatrices[j].set(finalMatrix.elements);
    }
  }
}
class SkinnedMesh extends Mesh {
  skin;
  boneMatricesBuffer;
  constructor(gameObject, skin) {
    super(gameObject);
    this.skin = skin;
  }
  Start() {
    super.Start();
    if (!this.skin) throw new Error("SkinnedMesh requires a skin");
    this.boneMatricesBuffer = Buffer.Create(this.skin.jointData.length * 4, BufferType.STORAGE);
    this.boneMatricesBuffer.SetArray(this.skin.jointData);
  }
  Update() {
    super.Update();
    if (this.skin) {
      this.skin.update(this.gameObject.transform.localToWorldMatrix);
      this.boneMatricesBuffer.SetArray(this.skin.jointData);
    }
  }
  Render() {
    if (this.material && this.material.shader && this.skin) {
      this.material.shader.SetBuffer("boneMatrices", this.boneMatricesBuffer);
    }
    super.Render();
  }
}

export { Skin, SkinnedMesh };
