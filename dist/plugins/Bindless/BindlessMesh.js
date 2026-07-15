import { Components } from '@trident/core';
import { VBuffer } from './Heap.js';
import { BindlessCamera } from './BindlessCamera.js';

class BindlessMesh extends Components.Component {
  static Instances = /* @__PURE__ */ new Set();
  static geometryCache = /* @__PURE__ */ new Map();
  _geometry;
  _material;
  transformData;
  drawRecord;
  indexCount = 0;
  get drawPtr() {
    return this.drawRecord.ptr;
  }
  get ready() {
    return this.drawRecord !== void 0;
  }
  set geometry(g) {
    this._geometry = g;
    this.tryUpload();
  }
  set material(m) {
    this._material = m;
    this.tryUpload();
  }
  geometryPtr = 0;
  get transformPtr() {
    return this.transformData.ptr;
  }
  instanceCount = 1;
  get vertexCount() {
    return this.indexCount * this.instanceCount;
  }
  // How many transforms to allocate. Subclasses override.
  transformCapacity() {
    return 1;
  }
  tryUpload() {
    if (!this._geometry || !this._material || this.drawRecord) return;
    const geo = BindlessMesh.uploadGeometry(this._geometry);
    this.geometryPtr = geo.ptr;
    this.indexCount = geo.indexCount;
    this.transformData = new VBuffer(16 * this.transformCapacity());
    this.drawRecord = new VBuffer(4);
    this.drawRecord.SetArray(new Uint32Array([geo.ptr, this.transformData.ptr, BindlessCamera.record.ptr, this._material.ptr]));
    BindlessMesh.Instances.add(this);
  }
  static uploadGeometry(geometry) {
    let cached = BindlessMesh.geometryCache.get(geometry);
    if (cached) return cached;
    const vertices = geometry.attributes.get("position").array;
    const normals = geometry.attributes.get("normal").array;
    const indices = new Uint32Array(geometry.index.array);
    const positions = new VBuffer(vertices.length);
    positions.SetArray(vertices);
    const normalData = new VBuffer(normals.length);
    normalData.SetArray(normals);
    const indexData = new VBuffer(indices.length);
    indexData.SetArray(indices);
    const record = new VBuffer(4);
    record.SetArray(new Uint32Array([positions.ptr, normalData.ptr, indexData.ptr, indices.length]));
    cached = { ptr: record.ptr, indexCount: indices.length };
    BindlessMesh.geometryCache.set(geometry, cached);
    return cached;
  }
  OnPreFrame() {
    this.transformData.SetArray(this.transform.localToWorldMatrix.elements);
  }
  Destroy() {
    BindlessMesh.Instances.delete(this);
    super.Destroy();
  }
}

export { BindlessMesh };
