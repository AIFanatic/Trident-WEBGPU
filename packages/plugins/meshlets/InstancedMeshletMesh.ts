import { Component, Geometry, GPU, IndexAttribute, InterleavedVertexAttribute, Mathf, Utils } from "@trident/core";
import { Meshlet } from "./meshoptimizer/Meshoptimizer";
import { buildMeshletData } from "./MeshletMesh";

export class InstancedMeshletMesh extends Component {
    private static readonly DefaultCapacity = 1024;

    public meshlets: Meshlet[] = [];
    public interleavedVertices: InterleavedVertexAttribute;
    public indices: IndexAttribute;
    public meshletInfoPacked: Float32Array;

    private _material: GPU.Material;
    @Utils.SerializeField
    public get material(): GPU.Material { return this._material; }
    public set material(material: GPU.Material) { this._material = material; }

    @Utils.SerializeField
    public enableShadows: boolean = true;

    public clusterizeOnly = false;

    private _matrices = new Float32Array(InstancedMeshletMesh.DefaultCapacity * 16);
    private _instanceCount = 0;

    public get instanceCount(): number { return this._instanceCount; }
    public get matrices(): Float32Array { return this._matrices.subarray(0, this._instanceCount * 16); }

    public ResetInstances(): void { this._instanceCount = 0; }

    public SetMatrixAt(index: number, matrix: Mathf.Matrix4): void {
        const need = (index + 1) * 16;
        if (need > this._matrices.length) {
            const grown = new Float32Array(Math.max(this._matrices.length * 2, need));
            grown.set(this._matrices);
            this._matrices = grown;
        }
        this._matrices.set(matrix.elements, index * 16);
        if (index + 1 > this._instanceCount) this._instanceCount = index + 1;
    }

    public SetMatricesBulk(matrices: Float32Array): void {
        if (matrices.length > this._matrices.length) this._matrices = new Float32Array(matrices.length);
        this._matrices.set(matrices);
        this._instanceCount = matrices.length / 16;
    }

    public set geometry(geometry: Geometry) {
        const data = buildMeshletData(geometry);
        this.meshlets = data.meshlets;
        this.interleavedVertices = data.interleavedVertices;
        this.indices = data.indices;
        this.meshletInfoPacked = data.meshletInfoPacked;
    }
}
