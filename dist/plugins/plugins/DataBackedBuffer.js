import { GPU } from '@trident/core';

class DataBackedBuffer {
  buffer;
  data;
  dataOffsets;
  dataValues;
  constructor(data, bufferType = GPU.BufferType.STORAGE) {
    this.data = data;
    const dataOffsets = /* @__PURE__ */ new Map();
    const dataValues = [];
    let offset = 0;
    for (const key in data) {
      dataOffsets.set(key, offset);
      dataValues.push(data[key]);
      offset += data[key].length;
    }
    this.dataOffsets = dataOffsets;
    this.dataValues = new Float32Array(dataValues.flat(Infinity));
    this.buffer = GPU.Buffer.Create(this.dataValues.length * 4, bufferType);
    this.buffer.SetArray(this.dataValues);
  }
  set(key, value) {
    this.data[key] = value;
    const offset = this.dataOffsets.get(key);
    if (offset === void 0) throw Error("Could not find offset");
    this.dataValues.set(value, offset);
    this.buffer.SetArray(this.dataValues);
  }
  get(key) {
    return this.data[key];
  }
}

export { DataBackedBuffer };
