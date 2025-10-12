import { GPU } from '@trident/core';

const SIZEOF = {
  u32: 4,
  f32: 4,
  "vec4<f32>": 16,
  "mat4x4<f32>": 64
};
const ALIGNOF = {
  u32: 4,
  f32: 4,
  "vec4<f32>": 16,
  "mat4x4<f32>": 16
  // std430
};
function alignTo(x, a) {
  return x + (a - 1) & ~(a - 1);
}
function defineStruct(name, fields) {
  let offset = 0;
  let maxAlign = 4;
  for (const f of fields) {
    const align = ALIGNOF[f.type];
    maxAlign = Math.max(maxAlign, align);
    offset = alignTo(offset, align);
    offset += SIZEOF[f.type];
  }
  const stride = alignTo(offset, Math.max(16, maxAlign));
  return { name, fields, stride };
}
function packRow(schema, view, base, row) {
  let offset = 0;
  for (const f of schema.fields) {
    const align = ALIGNOF[f.type];
    offset = alignTo(offset, align);
    if (f.type === "u32") {
      view.setUint32(base + offset, row[f.name], true);
      offset += 4;
    } else if (f.type === "f32") {
      view.setFloat32(base + offset, row[f.name], true);
      offset += 4;
    } else if (f.type === "vec4<f32>") {
      const v = row[f.name];
      for (let i = 0; i < 4; i++) view.setFloat32(base + offset + i * 4, v[i] ?? 0, true);
      offset += 16;
    } else if (f.type === "mat4x4<f32>") {
      const m = row[f.name];
      for (let i = 0; i < 16; i++) view.setFloat32(base + offset + i * 4, m[i] ?? 0, true);
      offset += 64;
    }
  }
}
function stableKey(row) {
  const parts = [];
  const keys = Object.keys(row).sort();
  for (const k of keys) {
    const v = row[k];
    if (Array.isArray(v)) parts.push(k + ":" + v.join(","));
    else parts.push(k + ":" + v);
  }
  return parts.join("|");
}
class Table {
  schema;
  capacity;
  count = 0;
  buffer;
  view;
  indexByKey = /* @__PURE__ */ new Map();
  gpuBuffer = null;
  constructor(schema, initialCapacity = 256) {
    this.schema = schema;
    this.capacity = initialCapacity;
    this.buffer = new ArrayBuffer(this.capacity * this.schema.stride);
    this.view = new DataView(this.buffer);
  }
  size() {
    return this.count;
  }
  clear() {
    this.count = 0;
    this.indexByKey.clear();
  }
  add(row) {
    const key = stableKey(row);
    const hit = this.indexByKey.get(key);
    if (hit !== void 0) return hit;
    if (this.count >= this.capacity) this.grow();
    const base = this.count * this.schema.stride;
    packRow(this.schema, this.view, base, row);
    const idx = this.count++;
    this.indexByKey.set(key, idx);
    return idx;
  }
  grow() {
    this.capacity = Math.ceil(this.capacity * 1.5);
    const next = new ArrayBuffer(this.capacity * this.schema.stride);
    new Uint8Array(next).set(new Uint8Array(this.buffer));
    this.buffer = next;
    this.view = new DataView(this.buffer);
  }
  /** Creates (or updates) the GPUBuffer and writes CPU shadow data in one go. */
  upload() {
    const byteLength = this.count * this.schema.stride;
    if (!this.gpuBuffer || this.gpuBuffer.size < byteLength) {
      if (this.gpuBuffer) this.gpuBuffer.Destroy();
      const alloc = alignTo(Math.max(byteLength, 4096), 4096);
      this.gpuBuffer = GPU.Buffer.Create(alloc * 4, GPU.BufferType.STORAGE);
    }
    this.gpuBuffer.SetArray(this.buffer);
    return this.gpuBuffer;
  }
  /** For debugging / binding */
  getBuffer() {
    return this.gpuBuffer;
  }
}

export { Table, defineStruct };
