import { Matrix4 } from "../math/Matrix4";
import { Buffer } from "../renderer/Buffer";
import { DynamicBufferMemoryAllocator } from "../renderer/MemoryAllocator";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { Mesh } from "./Mesh";

export class InstancedMesh extends Mesh {
    private matrices = new DynamicBufferMemoryAllocator(16 * 1000, 16 * 1000);

    protected uploadMatrices(): void { }                          // no GameObject-transform slot
    constructor(gameObject: any) { super(gameObject); this.instanceCount = 0; }

    public get matricesBuffer(): Buffer { return this.matrices.getBuffer(); }
    public ResetInstances(): void { this.instanceCount = 0; }

    public SetMatrixAt(index: number, matrix: Matrix4): void {
        this.matrices.set(index, matrix.elements);              // append-only, contiguous, grows cleanly
        this.instanceCount = Math.max(this.instanceCount, index + 1);
    }
    public SetMatricesBulk(matrices: Float32Array): void {
        this.matrices.set(0, matrices);
        this.instanceCount = matrices.length / 16;
    }

    public OnRenderObject(): void {
        const shader = this.material?.shader;
        if (!this.geometry?.attributes.has("position") || !this.material || !shader || this.instanceCount === 0) return;
        shader.SetBuffer("modelMatrix", this.matrices.getBuffer());
        RendererContext.DrawGeometry(this.geometry, shader, this.instanceCount, 0);
    }
}