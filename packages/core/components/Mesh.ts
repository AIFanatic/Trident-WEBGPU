import { EventSystemLocal } from "../Events";
import { GameObject } from "../GameObject";
import { BufferType, RendererContext, Shader } from "../renderer";
import { DynamicBufferMemoryAllocatorDynamic } from "../renderer/MemoryAllocator";
import { Component } from "./Component";
import { Renderable } from "./Renderable";
import { TransformEvents } from "./Transform";

export class Mesh extends Renderable {
    public static type = "@trident/core/components/Mesh";

    // Doing this instead of just passing this.transform.localToWorldMatrix allows the same material/shader to be reused per geometries
    public static modelMatrices: DynamicBufferMemoryAllocatorDynamic;
    private modelMatrixOffset: number = -1;

    constructor(gameObject: GameObject) {
        super(gameObject);

        if (!Mesh.modelMatrices) {
            Mesh.modelMatrices = new DynamicBufferMemoryAllocatorDynamic(256, BufferType.STORAGE, 256 * 10);
        }

        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
            this.modelMatrixOffset = Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
        })
    }

    public OnPreRender(shaderOverride?: Shader): void {
        const shader = shaderOverride ? shaderOverride : this.material?.shader;
        if (!this.geometry || !this.material || !shader) return;
        shader.SetBuffer("modelMatrix", Mesh.modelMatrices.getBuffer()); // Set here because the buffer is dynamic
    }

    public OnRenderObject(shaderOverride: Shader): void {
        const shader = shaderOverride ? shaderOverride : this.material?.shader;
        if (!this.geometry || !this.geometry.attributes.has("position") || !this.material || !shader) return;

        Mesh.modelMatrices.getBuffer().dynamicOffset = this.modelMatrixOffset * Mesh.modelMatrices.getStride();
        RendererContext.DrawGeometry(this.geometry, shader);
    }
}

Component.Registry.set(Mesh.type, Mesh);