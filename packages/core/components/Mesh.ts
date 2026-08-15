import { EventSystemLocal } from "../Events";
import { GameObject } from "../GameObject";
import { RendererContext } from "../renderer/RendererContext";
import { Shader } from "../renderer/Shader";
import { DynamicBufferMemoryAllocator } from "../renderer/MemoryAllocator";
import { Component } from "./Component";
import { Renderable } from "./Renderable";
import { TransformEvents } from "./Transform";

export class Mesh extends Renderable {
    public static type = "@trident/core/components/Mesh";
    public static modelMatrices: DynamicBufferMemoryAllocator;

    protected matrixOffset = 0;
    protected instanceCount = 1;
    protected get firstInstance(): number { return this.matrixOffset / 16; }

    constructor(gameObject: GameObject) {
        super(gameObject);
        if (!Mesh.modelMatrices) Mesh.modelMatrices = new DynamicBufferMemoryAllocator(16 * 1000, 16 * 1000);
        EventSystemLocal.on(TransformEvents.Updated, this.transform, () => this.uploadMatrices());
        this.uploadMatrices();
    }

    protected uploadMatrices(): void {
        this.matrixOffset = Mesh.modelMatrices.set(this.id, this.transform.localToWorldMatrix.elements);
        this.instanceCount = 1;
    }

    public OnRenderObject(): void {
        const shader = this.material?.shader;
        if (!this.geometry?.attributes.has("position") || !this.material || !shader || this.instanceCount === 0) return;
        shader.SetBuffer("modelMatrix", Mesh.modelMatrices.getBuffer());
        RendererContext.DrawGeometry(this.geometry, shader, this.instanceCount, this.firstInstance);
    }

    public Destroy(): void {
        super.Destroy();
        if (Mesh.modelMatrices?.has(this.id)) Mesh.modelMatrices.delete(this.id);
    }
}

Component.Registry.set(Mesh.type, Mesh);