import { VBuffer } from './Heap.js';

class BindlessCamera {
  static _record;
  static get record() {
    if (!this._record) this._record = new VBuffer(32);
    return this._record;
  }
  static Update(camera) {
    this.record.SetArray(camera.projectionMatrix.elements, 0);
    this.record.SetArray(camera.viewMatrix.elements, 16);
  }
}

export { BindlessCamera };
