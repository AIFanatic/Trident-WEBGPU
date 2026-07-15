import { BindlessMesh } from './BindlessMesh.js';

class BindlessInstancedMesh extends BindlessMesh {
  capacity = 1e3;
  // set BEFORE geometry/material (allocation happens on upload)
  transformCapacity() {
    return this.capacity;
  }
  constructor(gameObject) {
    super(gameObject);
    this.instanceCount = 0;
  }
  SetMatrixAt(i, matrix) {
    if (i >= this.capacity) throw new Error("BindlessInstancedMesh: index >= capacity");
    this.transformData.SetArray(matrix, i * 16);
    this.instanceCount = Math.max(this.instanceCount, i + 1);
  }
  OnPreFrame() {
  }
}

export { BindlessInstancedMesh };
