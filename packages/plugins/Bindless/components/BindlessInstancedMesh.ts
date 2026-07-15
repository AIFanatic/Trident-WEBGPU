import { GameObject } from "@trident/core";
import { BindlessMesh } from "./BindlessMesh";

export class BindlessInstancedMesh extends BindlessMesh {
    public capacity = 1000;    // set BEFORE geometry/material (allocation happens on upload)
    protected transformCapacity(): number { return this.capacity; }

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.instanceCount = 0;
    }

    public SetMatrixAt(i: number, matrix: Float32Array) {
        if (i >= this.capacity) throw new Error("BindlessInstancedMesh: index >= capacity");
        this.transformData!.SetArray(matrix, i * 16);
        this.instanceCount = Math.max(this.instanceCount, i + 1);
    }

    public OnPreFrame() { }
}