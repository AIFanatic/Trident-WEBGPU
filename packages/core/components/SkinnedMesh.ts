import { Matrix4 } from "../math/Matrix4";
import { Buffer, BufferType } from "../renderer/Buffer";
import { Transform, TransformEvents } from "./Transform";
import { Renderable } from "./Renderable";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { Component, SerializedComponent } from "./Component";
import { SerializeField } from "../utils";
import { GameObject } from "../GameObject";
import { Mesh } from "./Mesh";
import { DynamicBufferMemoryAllocatorDynamic } from "../renderer/MemoryAllocator";
import { EventSystemLocal } from "../Events";

export class Skeleton extends Component {
    public static type = "@trident/core/components/Skeleton";

    // Bone GameObjects, one per joint. Index N corresponds to inverseBindMatrices[N*16..N*16+16].
    @SerializeField public bones: GameObject[] = [];

    // Flat IBM buffer: bones.length * 16 floats.
    @SerializeField public inverseBindMatrices: Float32Array = new Float32Array(0);
}

Component.Registry.set(Skeleton.type, Skeleton);

export class SkinnedMesh extends Renderable {
    public static type = "@trident/core/components/SkinnedMesh";

    // GameObject holding the Skeleton component this mesh is bound to.
    // (Component refs aren't serializable today, but GameObject refs are.)
    @SerializeField public skeletonRoot: GameObject;

    private boneMatricesBuffer: Buffer;
    private jointData: Float32Array = new Float32Array(0);
    private modelMatrixOffset: number = -1;
    private _cachedSkeleton: Skeleton | null = null;
    private _cachedSkeletonRoot: GameObject | null = null;

    private _tmpMatrix = new Matrix4();
    private _tmpIBM = new Matrix4();

    constructor(gameObject: GameObject) {
        super(gameObject);

        if (!Mesh.modelMatrices) {
            Mesh.modelMatrices = new DynamicBufferMemoryAllocatorDynamic(256 * 10, BufferType.STORAGE, 256 * 10);
        }

        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            this.modelMatrixOffset = Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
        });

        this.modelMatrixOffset = Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
    }

    public GetBoneMatricesBuffer(): Buffer {
        return this.boneMatricesBuffer;
    }

    private getSkeleton(): Skeleton | null {
        // Invalidate cache if the ref changed (e.g., reassigned in inspector).
        if (this.skeletonRoot !== this._cachedSkeletonRoot) {
            this._cachedSkeleton = null;
            this._cachedSkeletonRoot = this.skeletonRoot;
        }
        if (!this._cachedSkeleton && this.skeletonRoot) {
            this._cachedSkeleton = this.skeletonRoot.GetComponent(Skeleton);
        }
        return this._cachedSkeleton;
    }

    private ensureBuffer(boneCount: number): boolean {
        if (this.boneMatricesBuffer && this.jointData.length === boneCount * 16) return true;
        if (boneCount === 0) return false;
        this.jointData = new Float32Array(boneCount * 16);
        this.boneMatricesBuffer = new Buffer(this.jointData.length * 4, BufferType.STORAGE);
        return true;
    }

    public OnPreFrame(): void {
        const skel = this.getSkeleton();
        if (!skel || skel.bones.length === 0) return;
        if (!this.ensureBuffer(skel.bones.length)) return;

        const skinRoot = this.gameObject.transform.worldToLocalMatrix;
        const ibm = skel.inverseBindMatrices;

        for (let j = 0; j < skel.bones.length; j++) {
            const bone = skel.bones[j];
            if (!bone) continue;

            this._tmpIBM.setFromArray(ibm.subarray(j * 16, j * 16 + 16));
            this._tmpMatrix.copy(skinRoot)
                .mul(bone.transform.localToWorldMatrix)
                .mul(this._tmpIBM);

            this.jointData.set(this._tmpMatrix.elements, j * 16);
        }

        this.boneMatricesBuffer.SetArray(this.jointData);
    }

    public OnPreRender(shaderOverride?: Shader): void {
        const shader = shaderOverride ?? this.material?.shader;
        if (!this.geometry || !this.material || !shader) return;
        shader.SetBuffer("modelMatrix", Mesh.modelMatrices.getBuffer());
    }

    public OnRenderObject(shaderOverride?: Shader): void {
        const shader = shaderOverride ?? this.material?.shader;
        if (!this.geometry || !this.material || !shader) return;
        if (!this.boneMatricesBuffer) return;

        if ((shader as any).uniformMap?.has("boneMatrices")) {
            shader.SetBuffer("boneMatrices", this.boneMatricesBuffer);
        }

        Mesh.modelMatrices.getBuffer().dynamicOffset = this.modelMatrixOffset * Mesh.modelMatrices.getStride();
        RendererContext.DrawGeometry(this.geometry, shader);
    }

    public Destroy(): void {
        super.Destroy();
        if (Mesh.modelMatrices?.has(this.id)) Mesh.modelMatrices.delete(this.id);
    }
}

Component.Registry.set(SkinnedMesh.type, SkinnedMesh);