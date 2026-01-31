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

    // public Serialize(metadata: any = {}): SerializedComponent {
    //     return {
    //         type: Bone.type,
    //         index: this.index,
    //         skinId: this.skinId,
    //         inverseBindMatrix: Array.from(this.inverseBindMatrix)
    //     };
    // }

    // public Deserialize(data: any) {
    //     this.index = data.index ?? 0;
    //     this.skinId = data.skinId ?? -1;
    //     this.inverseBindMatrix = new Float32Array(data.inverseBindMatrix ?? 16);
    // }
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
        this.buildBones();
        if (!this.bones.length) throw Error("SkinnedMesh needs bones");

        this.boneMatricesBuffer = Buffer.Create(this.jointData.length * 4, BufferType.STORAGE);
        this.boneMatricesBuffer.SetArray(this.jointData);
    }

    public Update(): void {
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
        this.material.shader.SetMatrix4("modelMatrix", this.transform.localToWorldMatrix);
        this.material.shader.SetBuffer("boneMatrices", this.boneMatricesBuffer);
    }

    public OnRenderObject(shaderOverride: Shader): void {
        const shader = shaderOverride ? shaderOverride : this.material?.shader;
        if (!this.geometry || !this.material || !shader) return;
        RendererContext.DrawGeometry(this.geometry, shader);
    }

    // public Serialize(metadata: any = {}): SerializedComponent {
    //     return {
    //         type: SkinnedMesh.type,
    //         skinId: this.skinId,
    //         renderable: super.Serialize(metadata)
    //     }
    // }

    // public Deserialize(data: any) {
    //     this.skinId = data.skinId ?? -1;
    //     super.Deserialize(data.renderable);
    // }
}

Component.Registry.set(SkinnedMesh.type, SkinnedMesh);