import { Matrix4 } from "../math/Matrix4";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Transform } from "./Transform";
import { Renderable } from "./Renderable";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { Component, SerializedComponent } from "./Component";
import { SerializeField } from "../utils";

export class Bone extends Component {
    public static type = "@trident/core/components/Bone";

    @SerializeField public index: number = 0;
    @SerializeField public skinId: number = -1;
    @SerializeField public inverseBindMatrix: Float32Array = new Float32Array(16);
}
Component.Registry.set(Bone.type, Bone);

export class SkinnedMesh extends Renderable {
    public static type = "@trident/core/components/SkinnedMesh";
    public skinId: number = -1;
    private boneMatricesBuffer: Buffer;
    private bones: { transform: Transform; inverseBindMatrix: Float32Array; index: number }[] = [];
    private jointData: Float32Array = new Float32Array(0);

    public GetBoneMatricesBuffer(): Buffer {
        return this.boneMatricesBuffer;
    }

    private getRootTransform(): Transform {
        let t = this.transform;
        while (t.parent) t = t.parent;
        return t;
    }

    private buildBones(): void {
        const root = this.getRootTransform();
        const bones: Bone[] = [];

        const walk = (t: Transform) => {
            const bone = t.gameObject.GetComponent(Bone);
            if (bone && (this.skinId < 0 || bone.skinId === this.skinId)) bones.push(bone);
            for (const child of t.children) walk(child);
        };
        walk(root);

        bones.sort((a, b) => a.index - b.index);

        this.bones = bones.map(b => ({
            transform: b.transform,
            inverseBindMatrix: b.inverseBindMatrix,
            index: b.index
        }));

        this.jointData = new Float32Array(this.bones.length * 16);
    }

    public Start(): void {
        this.tryInitBones();
    }

    private tryInitBones(): boolean {
        if (this.boneMatricesBuffer) return true;

        this.buildBones();
        if (!this.bones.length) return false;

        this.boneMatricesBuffer = new Buffer(this.jointData.length * 4, BufferType.STORAGE);
        this.boneMatricesBuffer.SetArray(this.jointData);
        return true;
    }

    public Update(): void {
        if (!this.boneMatricesBuffer && !this.tryInitBones()) return;
        if (!this.bones.length) return;

        const skinRootWorldMatrix = this.gameObject.transform.worldToLocalMatrix;
        for (let j = 0; j < this.bones.length; ++j) {
            const tmp = skinRootWorldMatrix.clone()
                .mul(this.bones[j].transform.localToWorldMatrix)
                .mul(new Matrix4().setFromArray(this.bones[j].inverseBindMatrix));

            this.jointData.set(tmp.elements, j * 16);
        }

        this.boneMatricesBuffer.SetArray(this.jointData);
    }

    public OnPreRender() {
        if (!this.geometry || !this.material || !this.material?.shader) return;
        if (!this.boneMatricesBuffer && !this.tryInitBones()) return;
        this.material.shader.SetMatrix4("modelMatrix", this.transform.localToWorldMatrix);
        this.material.shader.SetBuffer("boneMatrices", this.boneMatricesBuffer);
    }

    public OnRenderObject(shaderOverride: Shader): void {
        const shader = shaderOverride ? shaderOverride : this.material?.shader;
        if (!this.geometry || !this.material || !shader) return;
        RendererContext.DrawGeometry(this.geometry, shader);
    }
}

Component.Registry.set(SkinnedMesh.type, SkinnedMesh);
