import { Matrix4 } from "../math/Matrix4";
import { RendererContext, Shader } from "../renderer";
import { Buffer } from "../renderer/Buffer";
import { DynamicBufferMemoryAllocator } from "../renderer/MemoryAllocator";
import { Renderable } from "./Renderable";

export class InstancedMesh extends Renderable {
    private static readonly DefaultCapacity = 1000;

    private matrices = new DynamicBufferMemoryAllocator(16, InstancedMesh.DefaultCapacity * 16);
    private _instanceCount = 0;

    public get instanceCount(): number { return this._instanceCount; }
    public get matricesBuffer(): Buffer { return this.matrices.getBuffer(); }

    public ResetInstances(): void { this._instanceCount = 0; }

    public SetMatrixAt(index: number, matrix: Matrix4): void {
        this.matrices.set(index, matrix.elements);
        this._instanceCount = Math.max(this._instanceCount, index + 1);
    }

    public OnPreRender(): void {
        if (!this.geometry || !this.material || !this.material?.shader || this._instanceCount === 0) return;
        this.material.shader.SetBuffer("modelMatrix", this.matricesBuffer);
    }

    public OnRenderObject(shaderOverride: Shader): void {
        const shader = shaderOverride ? shaderOverride : this.material?.shader;
        if (!this.geometry || !this.material || !shader || this._instanceCount === 0) return;
        RendererContext.DrawGeometry(this.geometry, shader, this._instanceCount);
    }

    public Destroy(): void {
        super.Destroy();
        this.matricesBuffer.Destroy();
    }
}