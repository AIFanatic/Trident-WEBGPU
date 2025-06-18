var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/Events.ts
var EventSystem = class {
  static events = /* @__PURE__ */ new Map();
  static on(event, callback) {
    const events = this.events.get(event) || [];
    events.push(callback);
    this.events.set(event, events);
  }
  static emit(event, ...args) {
    const callbacks = this.events.get(event);
    if (callbacks === void 0) return;
    for (let i2 = 0; i2 < callbacks.length; i2++) {
      callbacks[i2](...args);
    }
  }
};
var EventSystemLocal = class {
  static events = /* @__PURE__ */ new Map();
  static on(event, localId, callback) {
    const localEvents = this.events.get(event) || /* @__PURE__ */ new Map();
    const localEventsCallbacks = localEvents.get(localId) || [];
    localEventsCallbacks.push(callback);
    localEvents.set(localId, localEventsCallbacks);
    this.events.set(event, localEvents);
  }
  static emit(event, localId, ...args) {
    const localEvents = this.events.get(event);
    if (localEvents === void 0) return;
    const localEventsCallbacks = localEvents.get(localId);
    if (localEventsCallbacks === void 0) return;
    for (let i2 = 0; i2 < localEventsCallbacks.length; i2++) {
      localEventsCallbacks[i2](...args);
    }
  }
};

// src/utils/Utils.ts
var Utils = class {
  static UUID() {
    return Math.floor(Math.random() * 1e6).toString();
  }
  static StringFindAllBetween(source, start, end, exclusive = true) {
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapeRegExp(start)}(.*?)${escapeRegExp(end)}`, "gs");
    const matches = [];
    let match;
    while ((match = regex.exec(source)) !== null) {
      if (exclusive) matches.push(match[1]);
      else matches.push(start + match[1] + end);
    }
    return matches;
  }
};

// src/components/Component.ts
var ComponentEvents = class {
  static CallUpdate = (component, shouldUpdate) => {
  };
  static AddedComponent = (component, scene) => {
  };
  static RemovedComponent = (component, scene) => {
  };
};
var Component = class _Component {
  id = Utils.UUID();
  enabled = true;
  hasStarted = false;
  name;
  gameObject;
  transform;
  constructor(gameObject) {
    this.gameObject = gameObject;
    this.transform = gameObject.transform;
    this.name = this.constructor.name;
    if (this.gameObject.scene.hasStarted) this.Start();
    if (this.constructor.prototype.Update !== _Component.prototype.Update) EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);
  }
  Start() {
  }
  Update() {
  }
  LateUpdate() {
  }
  Destroy() {
  }
};

// src/math/Vector3.ts
var Vector3 = class _Vector3 {
  _x;
  _y;
  _z;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  set z(v) {
    this._z = v;
  }
  _elements = new Float32Array(3);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    this._elements[2] = this._z;
    return this._elements;
  }
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  setX(x) {
    this.x = x;
    return this;
  }
  setY(y) {
    this.y = y;
    return this;
  }
  setZ(z) {
    this.z = z;
    return this;
  }
  clone() {
    return new _Vector3(this.x, this.y, this.z);
  }
  copy(v) {
    return this.set(v.x, v.y, v.z);
  }
  mul(v) {
    if (v instanceof _Vector3) this.x *= v.x, this.y *= v.y, this.z *= v.z;
    else this.x *= v, this.y *= v, this.z *= v;
    return this;
  }
  div(v) {
    if (v instanceof _Vector3) this.x /= v.x, this.y /= v.y, this.z /= v.z;
    else this.x /= v, this.y /= v, this.z /= v;
    return this;
  }
  add(v) {
    if (v instanceof _Vector3) this.x += v.x, this.y += v.y, this.z += v.z;
    else this.x += v, this.y += v, this.z += v;
    return this;
  }
  sub(v) {
    if (v instanceof _Vector3) this.x -= v.x, this.y -= v.y, this.z -= v.z;
    else this.x -= v, this.y -= v, this.z -= v;
    return this;
  }
  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }
  applyQuaternion(q) {
    const vx = this.x, vy = this.y, vz = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this.set(
      vx + qw * tx + qy * tz - qz * ty,
      vy + qw * ty + qz * tx - qx * tz,
      vz + qw * tz + qx * ty - qy * tx
    );
    return this;
  }
  length() {
    return Math.hypot(this.x, this.y, this.z);
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  normalize() {
    return this.div(this.length() || 1);
  }
  distanceTo(v) {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  distanceToSquared(v) {
    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  cross(v) {
    return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
  }
  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z;
    const bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }
  min(v) {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    return this;
  }
  max(v) {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    return this;
  }
  lerp(v, t) {
    this.x = this.x + t * (v.x - this.x);
    this.y = this.y + t * (v.y - this.y);
    this.z = this.z + t * (v.z - this.z);
    return this;
  }
  setFromSphericalCoords(radius, phi, theta) {
    const sinPhiRadius = Math.sin(phi) * radius;
    this.x = sinPhiRadius * Math.sin(theta);
    this.y = Math.cos(phi) * radius;
    this.z = sinPhiRadius * Math.cos(theta);
    return this;
  }
  setFromMatrixPosition(m) {
    const e = m.elements;
    this.x = e[12];
    this.y = e[13];
    this.z = e[14];
    return this;
  }
  equals(v) {
    const EPS = 1e-4;
    return Math.abs(v.x - this.x) < EPS && Math.abs(v.y - this.y) < EPS && Math.abs(v.z - this.z) < EPS;
  }
  abs() {
    this.x = Math.abs(this.x);
    this.y = Math.abs(this.y);
    this.z = Math.abs(this.z);
    return this;
  }
  sign() {
    this.x = Math.sign(this.x);
    this.y = Math.sign(this.y);
    this.z = Math.sign(this.z);
    return this;
  }
  transformDirection(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z;
    this.y = e[1] * x + e[5] * y + e[9] * z;
    this.z = e[2] * x + e[6] * y + e[10] * z;
    return this.normalize();
  }
  toString() {
    return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)}, ${this.z.toPrecision(2)})`;
  }
  static fromArray(array) {
    if (array.length < 3) throw Error("Array doesn't have enough data");
    return new _Vector3(array[0], array[1], array[2]);
  }
};
var ObservableVector3 = class extends Vector3 {
  onChange;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  set x(value) {
    if (value !== this.x) {
      this._x = value;
      if (this.onChange) {
        this.onChange();
      }
    }
  }
  set y(value) {
    if (value !== this.y) {
      this._y = value;
      if (this.onChange) this.onChange();
    }
  }
  set z(value) {
    if (value !== this.z) {
      this._z = value;
      if (this.onChange) this.onChange();
    }
  }
  constructor(onChange, x = 0, y = 0, z = 0) {
    super(x, y, z);
    this.onChange = onChange;
  }
};

// src/math/Matrix4.ts
var Matrix4 = class _Matrix4 {
  elements;
  constructor(n11 = 1, n12 = 0, n13 = 0, n14 = 0, n21 = 0, n22 = 1, n23 = 0, n24 = 0, n31 = 0, n32 = 0, n33 = 1, n34 = 0, n41 = 0, n42 = 0, n43 = 0, n44 = 1) {
    this.elements = new Float32Array(16);
    this.set(
      n11,
      n12,
      n13,
      n14,
      n21,
      n22,
      n23,
      n24,
      n31,
      n32,
      n33,
      n34,
      n41,
      n42,
      n43,
      n44
    );
  }
  copy(m) {
    const te = this.elements;
    const me = m.elements;
    te[0] = me[0];
    te[1] = me[1];
    te[2] = me[2];
    te[3] = me[3];
    te[4] = me[4];
    te[5] = me[5];
    te[6] = me[6];
    te[7] = me[7];
    te[8] = me[8];
    te[9] = me[9];
    te[10] = me[10];
    te[11] = me[11];
    te[12] = me[12];
    te[13] = me[13];
    te[14] = me[14];
    te[15] = me[15];
    return this;
  }
  set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    const te = this.elements;
    te[0] = n11;
    te[4] = n12;
    te[8] = n13;
    te[12] = n14;
    te[1] = n21;
    te[5] = n22;
    te[9] = n23;
    te[13] = n24;
    te[2] = n31;
    te[6] = n32;
    te[10] = n33;
    te[14] = n34;
    te[3] = n41;
    te[7] = n42;
    te[11] = n43;
    te[15] = n44;
    return this;
  }
  setFromArray(array) {
    this.elements.set(array);
    return this;
  }
  clone() {
    return new _Matrix4().setFromArray(this.elements);
  }
  compose(position, quaternion, scale) {
    const te = this.elements;
    const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const sx = scale.x, sy = scale.y, sz = scale.z;
    te[0] = (1 - (yy + zz)) * sx;
    te[1] = (xy + wz) * sx;
    te[2] = (xz - wy) * sx;
    te[3] = 0;
    te[4] = (xy - wz) * sy;
    te[5] = (1 - (xx + zz)) * sy;
    te[6] = (yz + wx) * sy;
    te[7] = 0;
    te[8] = (xz + wy) * sz;
    te[9] = (yz - wx) * sz;
    te[10] = (1 - (xx + yy)) * sz;
    te[11] = 0;
    te[12] = position.x;
    te[13] = position.y;
    te[14] = position.z;
    te[15] = 1;
    return this;
  }
  decompose(position, quaternion, scale) {
    const te = this.elements;
    let sx = _v1.set(te[0], te[1], te[2]).length();
    const sy = _v1.set(te[4], te[5], te[6]).length();
    const sz = _v1.set(te[8], te[9], te[10]).length();
    const det = this.determinant();
    if (det < 0) sx = -sx;
    position.x = te[12];
    position.y = te[13];
    position.z = te[14];
    _m1.copy(this);
    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;
    _m1.elements[0] *= invSX;
    _m1.elements[1] *= invSX;
    _m1.elements[2] *= invSX;
    _m1.elements[4] *= invSY;
    _m1.elements[5] *= invSY;
    _m1.elements[6] *= invSY;
    _m1.elements[8] *= invSZ;
    _m1.elements[9] *= invSZ;
    _m1.elements[10] *= invSZ;
    quaternion.setFromRotationMatrix(_m1);
    scale.x = sx;
    scale.y = sy;
    scale.z = sz;
    return this;
  }
  mul(m) {
    return this.multiplyMatrices(this, m);
  }
  premultiply(m) {
    return this.multiplyMatrices(m, this);
  }
  multiplyMatrices(a, b) {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;
    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
    return this;
  }
  invert() {
    const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15], t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44, t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44, t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44, t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const detInv = 1 / det;
    te[0] = t11 * detInv;
    te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
    te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
    te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;
    te[4] = t12 * detInv;
    te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
    te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
    te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;
    te[8] = t13 * detInv;
    te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
    te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
    te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;
    te[12] = t14 * detInv;
    te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
    te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
    te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
    return this;
  }
  determinant() {
    const te = this.elements;
    const n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12];
    const n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13];
    const n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14];
    const n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];
    return n41 * (+n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34) + n42 * (+n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31) + n43 * (+n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31) + n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31);
  }
  transpose() {
    const te = this.elements;
    let tmp;
    tmp = te[1];
    te[1] = te[4];
    te[4] = tmp;
    tmp = te[2];
    te[2] = te[8];
    te[8] = tmp;
    tmp = te[6];
    te[6] = te[9];
    te[9] = tmp;
    tmp = te[3];
    te[3] = te[12];
    te[12] = tmp;
    tmp = te[7];
    te[7] = te[13];
    te[13] = tmp;
    tmp = te[11];
    te[11] = te[14];
    te[14] = tmp;
    return this;
  }
  perspective(fov, aspect, near, far) {
    const fovRad = fov;
    const f = 1 / Math.tan(fovRad / 2);
    const depth = 1 / (near - far);
    return this.set(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * depth, -1, 0, 0, 2 * far * near * depth, 0);
  }
  perspectiveZO(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    this.elements[0] = f / aspect;
    this.elements[1] = 0;
    this.elements[2] = 0;
    this.elements[3] = 0;
    this.elements[4] = 0;
    this.elements[5] = f;
    this.elements[6] = 0;
    this.elements[7] = 0;
    this.elements[8] = 0;
    this.elements[9] = 0;
    this.elements[11] = -1;
    this.elements[12] = 0;
    this.elements[13] = 0;
    this.elements[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      this.elements[10] = far * nf;
      this.elements[14] = far * near * nf;
    } else {
      this.elements[10] = -1;
      this.elements[14] = -near;
    }
    return this;
  }
  perspectiveLH(fovy, aspect, near, far) {
    const out = this.elements;
    const f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = far / (far - near);
    out[11] = 1;
    out[12] = 0;
    out[13] = 0;
    out[14] = -near * far / (far - near);
    out[15] = 0;
    return this;
  }
  perspectiveWGPUMatrix(fieldOfViewYInRadians, aspect, zNear, zFar) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
    const te = this.elements;
    te[0] = f / aspect;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 0;
    te[5] = f;
    te[6] = 0;
    te[7] = 0;
    te[8] = 0;
    te[9] = 0;
    te[11] = -1;
    te[12] = 0;
    te[13] = 0;
    te[15] = 0;
    if (Number.isFinite(zFar)) {
      const rangeInv = 1 / (zNear - zFar);
      te[10] = zFar * rangeInv;
      te[14] = zFar * zNear * rangeInv;
    } else {
      te[10] = -1;
      te[14] = -zNear;
    }
    return this;
  }
  orthoZO(left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return this.setFromArray(out);
  }
  // public orthoZO(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
  // 	var lr = 1 / (left - right);
  // 	var bt = 1 / (bottom - top);
  // 	var nf = 1 / (far - near);
  // 	const out = new Float32Array(16);
  // 	out[0] = -2 * lr;
  // 	out[1] = 0;
  // 	out[2] = 0;
  // 	out[3] = 0;
  // 	out[4] = 0;
  // 	out[5] = -2 * bt;
  // 	out[6] = 0;
  // 	out[7] = 0;
  // 	out[8] = 0;
  // 	out[9] = 0;
  // 	out[10] = nf;
  // 	out[11] = 0;
  // 	out[12] = (left + right) * lr;
  // 	out[13] = (top + bottom) * bt;
  // 	out[14] = -near * nf;
  // 	out[15] = 1;
  // 	return this.setFromArray(out);
  // }
  identity() {
    this.elements[0] = 1;
    this.elements[1] = 0;
    this.elements[2] = 0;
    this.elements[3] = 0;
    this.elements[4] = 0;
    this.elements[5] = 1;
    this.elements[6] = 0;
    this.elements[7] = 0;
    this.elements[8] = 0;
    this.elements[9] = 0;
    this.elements[10] = 1;
    this.elements[11] = 0;
    this.elements[12] = 0;
    this.elements[13] = 0;
    this.elements[14] = 0;
    this.elements[15] = 1;
    return this;
  }
  // LH
  lookAt(eye, center, up) {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    z0 = center.x - eye.x;
    z1 = center.y - eye.y;
    z2 = center.z - eye.z;
    len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      z0 *= len;
      z1 *= len;
      z2 *= len;
    }
    x0 = up.y * z2 - up.z * z1;
    x1 = up.z * z0 - up.x * z2;
    x2 = up.x * z1 - up.y * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    const out = this.elements;
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eye.x + x1 * eye.y + x2 * eye.z);
    out[13] = -(y0 * eye.x + y1 * eye.y + y2 * eye.z);
    out[14] = -(z0 * eye.x + z1 * eye.y + z2 * eye.z);
    out[15] = 1;
    return this;
  }
  translate(v) {
    this.set(
      1,
      0,
      0,
      v.x,
      0,
      1,
      0,
      v.y,
      0,
      0,
      1,
      v.z,
      0,
      0,
      0,
      1
    );
    return this;
  }
  scale(v) {
    const te = this.elements;
    const x = v.x, y = v.y, z = v.z;
    te[0] *= x;
    te[4] *= y;
    te[8] *= z;
    te[1] *= x;
    te[5] *= y;
    te[9] *= z;
    te[2] *= x;
    te[6] *= y;
    te[10] *= z;
    te[3] *= x;
    te[7] *= y;
    te[11] *= z;
    return this;
  }
  makeTranslation(v) {
    this.set(
      1,
      0,
      0,
      v.x,
      0,
      1,
      0,
      v.y,
      0,
      0,
      1,
      v.z,
      0,
      0,
      0,
      1
    );
    return this;
  }
  makeScale(v) {
    this.set(
      v.x,
      0,
      0,
      0,
      0,
      v.y,
      0,
      0,
      0,
      0,
      v.z,
      0,
      0,
      0,
      0,
      1
    );
    return this;
  }
};
var _v1 = new Vector3();
var _m1 = new Matrix4();

// src/math/Quaternion.ts
var EPSILON = 1e-4;
var Quaternion = class _Quaternion {
  _a = new Vector3();
  _b = new Vector3();
  _c = new Vector3();
  _x;
  _y;
  _z;
  _w;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  get w() {
    return this._w;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  set z(v) {
    this._z = v;
  }
  set w(v) {
    this._w = v;
  }
  _elements = new Float32Array(4);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    this._elements[2] = this._z;
    this._elements[3] = this._w;
    return this._elements;
  }
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  equals(v) {
    return Math.abs(v.x - this.x) < EPSILON && Math.abs(v.y - this.y) < EPSILON && Math.abs(v.z - this.z) < EPSILON && Math.abs(v.w - this.w) < EPSILON;
  }
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  clone() {
    return new _Quaternion(this.x, this.y, this.z, this.w);
  }
  copy(quaternion) {
    this.x = quaternion.x;
    this.y = quaternion.y;
    this.z = quaternion.z;
    this.w = quaternion.w;
    return this;
  }
  fromEuler(euler, inDegrees = false) {
    const roll = inDegrees ? euler.x * Math.PI / 180 : euler.x;
    const pitch = inDegrees ? euler.y * Math.PI / 180 : euler.y;
    const yaw = inDegrees ? euler.z * Math.PI / 180 : euler.z;
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    this.w = cr * cp * cy + sr * sp * sy;
    this.x = sr * cp * cy - cr * sp * sy;
    this.y = cr * sp * cy + sr * cp * sy;
    this.z = cr * cp * sy - sr * sp * cy;
    return this;
  }
  toEuler(out, inDegrees = false) {
    if (!out) out = new Vector3();
    const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
    const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
    out.x = Math.atan2(sinr_cosp, cosr_cosp);
    const sinp = Math.sqrt(1 + 2 * (this.w * this.y - this.x * this.z));
    const cosp = Math.sqrt(1 - 2 * (this.w * this.y - this.x * this.z));
    out.y = 2 * Math.atan2(sinp, cosp) - Math.PI / 2;
    const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
    const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
    out.z = Math.atan2(siny_cosp, cosy_cosp);
    if (inDegrees) {
      out.x *= 180 / Math.PI;
      out.y *= 180 / Math.PI;
      out.z *= 180 / Math.PI;
    }
    return out;
  }
  mul(b) {
    const qax = this._x, qay = this._y, qaz = this._z, qaw = this._w;
    const qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;
    this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    return this;
  }
  lookAt(eye, target, up) {
    const z = this._a.copy(eye).sub(target);
    if (z.length() === 0) z.z = 1;
    else z.normalize();
    const x = this._b.copy(up).cross(z);
    if (x.length() === 0) {
      const pup = this._c.copy(up);
      if (pup.z) pup.x += EPSILON;
      else if (pup.y) pup.z += EPSILON;
      else pup.y += EPSILON;
      x.cross(pup);
    }
    x.normalize();
    const y = this._c.copy(z).cross(x);
    const [sm11, sm12, sm13] = [x.x, x.y, x.z];
    const [sm21, sm22, sm23] = [y.x, y.y, y.z];
    const [sm31, sm32, sm33] = [z.x, z.y, z.z];
    const trace = sm11 + sm22 + sm33;
    if (trace > 0) {
      const S = Math.sqrt(trace + 1) * 2;
      return this.set((sm23 - sm32) / S, (sm31 - sm13) / S, (sm12 - sm21) / S, S / 4);
    } else if (sm11 > sm22 && sm11 > sm33) {
      const S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      return this.set(S / 4, (sm12 + sm21) / S, (sm31 + sm13) / S, (sm23 - sm32) / S);
    } else if (sm22 > sm33) {
      const S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      return this.set((sm12 + sm21) / S, S / 4, (sm23 + sm32) / S, (sm31 - sm13) / S);
    } else {
      const S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      return this.set((sm31 + sm13) / S, (sm23 + sm32) / S, S / 4, (sm12 - sm21) / S);
    }
  }
  setFromAxisAngle(axis, angle) {
    const halfAngle = angle / 2, s = Math.sin(halfAngle);
    this._x = axis.x * s;
    this._y = axis.y * s;
    this._z = axis.z * s;
    this._w = Math.cos(halfAngle);
    return this;
  }
  setFromRotationMatrix(m) {
    const te = m.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], trace = m11 + m22 + m33;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      this._w = 0.25 / s;
      this._x = (m32 - m23) * s;
      this._y = (m13 - m31) * s;
      this._z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
      this._w = (m32 - m23) / s;
      this._x = 0.25 * s;
      this._y = (m12 + m21) / s;
      this._z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
      this._w = (m13 - m31) / s;
      this._x = (m12 + m21) / s;
      this._y = 0.25 * s;
      this._z = (m23 + m32) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
      this._w = (m21 - m12) / s;
      this._x = (m13 + m31) / s;
      this._y = (m23 + m32) / s;
      this._z = 0.25 * s;
    }
    return this;
  }
  static fromArray(array) {
    if (array.length < 4) throw Error("Array doesn't have enough data");
    return new _Quaternion(array[0], array[1], array[2], array[3]);
  }
};
var ObservableQuaternion = class extends Quaternion {
  onChange;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  get w() {
    return this._w;
  }
  set x(value) {
    if (value !== this.x) {
      this._x = value;
      if (this.onChange) this.onChange();
    }
  }
  set y(value) {
    if (value !== this.y) {
      this._y = value;
      if (this.onChange) this.onChange();
    }
  }
  set z(value) {
    if (value !== this.z) {
      this._z = value;
      if (this.onChange) this.onChange();
    }
  }
  set w(value) {
    if (value !== this.w) {
      this._w = value;
      if (this.onChange) this.onChange();
    }
  }
  constructor(onChange, x = 0, y = 0, z = 0, w = 1) {
    super(x, y, z, w);
    this.onChange = onChange;
  }
};

// src/components/Transform.ts
var TransformEvents = class {
  static Updated = () => {
  };
};
var Transform = class extends Component {
  tempRotation = new Quaternion();
  up = new Vector3(0, 1, 0);
  forward = new Vector3(0, 0, 1);
  right = new Vector3(1, 0, 0);
  _localToWorldMatrix = new Matrix4();
  _worldToLocalMatrix = new Matrix4();
  get localToWorldMatrix() {
    return this._localToWorldMatrix;
  }
  get worldToLocalMatrix() {
    return this._worldToLocalMatrix;
  }
  _position = new ObservableVector3(() => {
    this.onChanged();
  }, 0, 0, 0);
  _rotation = new ObservableQuaternion(() => {
    this.onChanged();
  });
  _scale = new ObservableVector3(() => {
    this.onChanged();
  }, 1, 1, 1);
  _eulerAngles = new ObservableVector3(() => {
    this.onEulerChanged();
  });
  get position() {
    return this._position;
  }
  set position(value) {
    this._position.copy(value);
    this.onChanged();
  }
  get rotation() {
    return this._rotation;
  }
  set rotation(value) {
    this._rotation.copy(value);
    this.onChanged();
  }
  get eulerAngles() {
    return this._eulerAngles;
  }
  set eulerAngles(value) {
    this.eulerAngles.copy(value);
    this.onEulerChanged();
  }
  get scale() {
    return this._scale;
  }
  set scale(value) {
    this._scale.copy(value);
    this.onChanged();
  }
  children = /* @__PURE__ */ new Set();
  _parent = null;
  get parent() {
    return this._parent;
  }
  set parent(parent) {
    if (parent === null) {
      if (this._parent !== null) this._parent.children.delete(this);
    } else {
      parent.children.add(this);
    }
    this._parent = parent;
  }
  onEulerChanged() {
    this._rotation.fromEuler(this._eulerAngles, true);
    EventSystem.emit(ComponentEvents.CallUpdate, this, true);
  }
  onChanged() {
    EventSystem.emit(ComponentEvents.CallUpdate, this, true);
  }
  UpdateMatrices() {
    this._localToWorldMatrix.compose(this.position, this.rotation, this.scale);
    this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();
    if (this.parent !== null) {
      this._localToWorldMatrix.premultiply(this.parent._localToWorldMatrix);
    }
    for (const child of this.children) {
      child.UpdateMatrices();
    }
    EventSystem.emit(TransformEvents.Updated);
    EventSystemLocal.emit(TransformEvents.Updated, this);
  }
  Update() {
    this.UpdateMatrices();
    EventSystem.emit(ComponentEvents.CallUpdate, this, false);
  }
  LookAt(target) {
    m1.lookAt(this.position, target, this.up);
    this.rotation.setFromRotationMatrix(m1);
    this.UpdateMatrices();
    this.onChanged();
  }
  LookAtV1(target) {
    this.rotation.lookAt(this.position, target, this.up);
    this.tempRotation.lookAt(this.position, target, this.up);
    if (!this.tempRotation.equals(this.rotation)) {
      this.rotation.copy(this.tempRotation);
      this.UpdateMatrices();
      this.onChanged();
    }
  }
  // public LookAtV2(target: Vector3): void {
  //     m1.lookAtV3(this.position, target, this.up, true);
  //     this.rotation.setFromRotationMatrix(m1);
  //     this.UpdateMatrices();
  //     this.onChanged();
  // }
};
var m1 = new Matrix4();

// src/math/Vector4.ts
var Vector4 = class _Vector4 {
  _x;
  _y;
  _z;
  _w;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  get w() {
    return this._w;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  set z(v) {
    this._z = v;
  }
  set w(v) {
    this._w = v;
  }
  _elements = new Float32Array(4);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    this._elements[2] = this._z;
    this._elements[3] = this._w;
    return this._elements;
  }
  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  setX(x) {
    this.x = x;
    return this;
  }
  setY(y) {
    this.y = y;
    return this;
  }
  setZ(z) {
    this.z = z;
    return this;
  }
  setW(w) {
    this.w = w;
    return this;
  }
  clone() {
    return new _Vector4(this.x, this.y, this.z, this.w);
  }
  copy(v) {
    return this.set(v.x, v.y, v.z, v.w);
  }
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z + e[12] * w;
    this.y = e[1] * x + e[5] * y + e[9] * z + e[13] * w;
    this.z = e[2] * x + e[6] * y + e[10] * z + e[14] * w;
    this.w = e[3] * x + e[7] * y + e[11] * z + e[15] * w;
    return this;
  }
  normalize() {
    let x = this.x;
    let y = this.y;
    let z = this.z;
    let w = this.w;
    let len = x * x + y * y + z * z + w * w;
    if (len > 0) len = 1 / Math.sqrt(len);
    this.x = x * len;
    this.y = y * len;
    this.z = z * len;
    this.w = w * len;
    return this;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }
  toString() {
    return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)}, ${this.z.toPrecision(2)}, ${this.w.toPrecision(2)})`;
  }
};

// src/math/Color.ts
var Color = class _Color {
  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  _elements = new Float32Array([0, 0, 0, 0]);
  get elements() {
    this._elements.set([this.r, this.g, this.b, this.a]);
    return this._elements;
  }
  set(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  static fromVector(v) {
    return new _Color(v.x, v.y, v.z, v instanceof Vector4 ? v.w : 0);
  }
  static fromHex(hex) {
    return new _Color((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255);
  }
  mul(v) {
    if (v instanceof _Color) this.r *= v.r, this.g *= v.g, this.b *= v.b;
    else this.r *= v, this.g *= v, this.b *= v;
    return this;
  }
  toHex() {
    const r = Math.floor(this.r * 255).toString(16).padStart(2, "0");
    const g = Math.floor(this.g * 255).toString(16).padStart(2, "0");
    const b = Math.floor(this.b * 255).toString(16).padStart(2, "0");
    const a = Math.floor(this.a * 255).toString(16).padStart(2, "0");
    return "#" + r + g + b + a;
  }
};

// src/components/Camera.ts
var CameraEvents = class {
  static Updated = (camera) => {
  };
};
var Camera = class extends Component {
  backgroundColor = new Color(0, 0, 0, 1);
  projectionMatrix = new Matrix4();
  viewMatrix = new Matrix4();
  static mainCamera;
  fov;
  aspect;
  near;
  far;
  SetPerspective(fov, aspect, near, far) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.projectionMatrix.perspectiveZO(fov * (Math.PI / 180), aspect, near, far);
  }
  SetOrthographic(left, right, top, bottom, near, far) {
    this.near = near;
    this.far = far;
    this.projectionMatrix.orthoZO(left, right, top, bottom, near, far);
  }
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(CameraEvents.Updated, this);
    });
  }
  Update() {
    this.viewMatrix.copy(this.transform.worldToLocalMatrix);
  }
};

// src/GameObject.ts
var GameObject = class {
  id = Utils.UUID();
  name = "GameObject";
  scene;
  transform;
  componentsArray = [];
  componentsMapped = /* @__PURE__ */ new Map();
  constructor(scene) {
    this.scene = scene;
    this.transform = new Transform(this);
    this.scene.AddGameObject(this);
  }
  AddComponent(component) {
    try {
      let componentInstance = new component(this);
      if (!(componentInstance instanceof Component)) throw Error("Invalid component");
      if (componentInstance instanceof Transform) throw Error("A GameObject can only have one Transform");
      const AddComponentInternal = (component2, instance) => {
        if (!this.componentsMapped.has(component2.name)) this.componentsMapped.set(component2.name, []);
        this.componentsMapped.get(component2.name)?.push(instance);
        this.componentsArray.push(instance);
      };
      AddComponentInternal(component, componentInstance);
      let currentComponent = component;
      let i2 = 0;
      while (i2 < 10) {
        currentComponent = Object.getPrototypeOf(currentComponent);
        if (currentComponent.name === Component.name || currentComponent.name === "") {
          break;
        }
        AddComponentInternal(currentComponent, componentInstance);
        i2++;
      }
      if (componentInstance instanceof Camera && !Camera.mainCamera) Camera.mainCamera = componentInstance;
      if (this.scene.hasStarted) componentInstance.Start();
      return componentInstance;
    } catch (error) {
      throw Error(`Error creating component` + error);
    }
  }
  GetComponent(type) {
    const components = this.GetComponents(type);
    if (components.length > 0) return components[0];
    return null;
  }
  GetComponents(type) {
    return this.componentsMapped.get(type.name) || [];
  }
  Start() {
    for (const component of this.componentsArray) {
      if (!component.hasStarted) {
        component.Start();
        component.hasStarted = true;
      }
    }
  }
  Destroy() {
    for (const component of this.componentsArray) {
      component.Destroy();
    }
    this.componentsArray = [];
    this.componentsMapped.clear();
    this.scene.RemoveGameObject(this);
  }
};

// src/math/BoundingVolume.ts
var BoundingVolume = class _BoundingVolume {
  min;
  max;
  center;
  radius;
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), center = new Vector3(), radius = 0) {
    this.min = min;
    this.max = max;
    this.center = center;
    this.radius = radius;
  }
  static FromVertices(vertices) {
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    for (let i2 = 0; i2 < vertices.length; i2 += 3) {
      maxX = Math.max(maxX, vertices[i2]);
      minX = Math.min(minX, vertices[i2]);
      maxY = Math.max(maxY, vertices[i2 + 1]);
      minY = Math.min(minY, vertices[i2 + 1]);
      maxZ = Math.max(maxZ, vertices[i2 + 2]);
      minZ = Math.min(minZ, vertices[i2 + 2]);
    }
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;
    const centerZ = minZ + (maxZ - minZ) / 2;
    const newCenter = new Vector3(centerX, centerY, centerZ);
    const halfWidth = (maxX - minX) / 2;
    const halfHeight = (maxY - minY) / 2;
    const halfDepth = (maxZ - minZ) / 2;
    const newRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight + halfDepth * halfDepth);
    return new _BoundingVolume(
      new Vector3(minX, minY, minZ),
      new Vector3(maxX, maxY, maxZ),
      newCenter,
      newRadius
    );
  }
};

// src/renderer/webgpu/WEBGPURenderer.ts
var adapter = navigator ? await navigator.gpu.requestAdapter() : null;
if (!adapter) throw Error("WEBGPU not supported");
var requiredLimits = {};
for (const key in adapter.limits) requiredLimits[key] = adapter.limits[key];
var features = [];
if (adapter.features.has("timestamp-query")) features.push("timestamp-query");
var device = adapter ? await adapter.requestDevice({
  requiredFeatures: features,
  requiredLimits
}) : null;
var WEBGPURenderer = class _WEBGPURenderer {
  static adapter;
  static device;
  static context;
  static presentationFormat;
  static activeCommandEncoder = null;
  constructor(canvas2) {
    if (!adapter || !device) throw Error("WEBGPU not supported");
    const context = canvas2.getContext("webgpu");
    if (!context) throw Error("Could not get WEBGPU context");
    _WEBGPURenderer.adapter = adapter;
    _WEBGPURenderer.device = device;
    _WEBGPURenderer.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: _WEBGPURenderer.presentationFormat });
    _WEBGPURenderer.adapter = adapter;
    _WEBGPURenderer.device = device;
    _WEBGPURenderer.context = context;
    _WEBGPURenderer.context.configure({
      device: _WEBGPURenderer.device,
      format: _WEBGPURenderer.presentationFormat,
      alphaMode: "opaque"
    });
  }
  static GetActiveCommandEncoder() {
    return _WEBGPURenderer.activeCommandEncoder;
  }
  static BeginRenderFrame() {
    if (_WEBGPURenderer.activeCommandEncoder !== null) {
      console.warn("Only one active encoder pipeline is allowed.");
      return;
    }
    _WEBGPURenderer.activeCommandEncoder = _WEBGPURenderer.device.createCommandEncoder();
  }
  static EndRenderFrame() {
    if (_WEBGPURenderer.activeCommandEncoder === null) {
      console.log("There is no active render pass.");
      return;
    }
    _WEBGPURenderer.device.queue.submit([_WEBGPURenderer.activeCommandEncoder.finish()]);
    _WEBGPURenderer.activeCommandEncoder = null;
  }
  static HasActiveFrame() {
    return _WEBGPURenderer.activeCommandEncoder !== null;
  }
  static OnFrameCompleted() {
    return _WEBGPURenderer.device.queue.onSubmittedWorkDone();
  }
};

// src/renderer/Renderer.ts
var Renderer = class _Renderer {
  static type;
  static width;
  static height;
  static activeRenderer;
  static Create(canvas2, type) {
    _Renderer.type = type;
    _Renderer.width = canvas2.width;
    _Renderer.height = canvas2.height;
    if (type === "webgpu") {
      this.activeRenderer = new WEBGPURenderer(canvas2);
      return this.activeRenderer;
    }
    throw Error("Unknown render api type.");
  }
  static get SwapChainFormat() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.presentationFormat;
    throw Error("Unknown render api type.");
  }
  static BeginRenderFrame() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.BeginRenderFrame();
    throw Error("Unknown render api type.");
  }
  static EndRenderFrame() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.EndRenderFrame();
    throw Error("Unknown render api type.");
  }
  static HasActiveFrame() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.HasActiveFrame();
    throw Error("Unknown render api type.");
  }
  static OnFrameCompleted() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.OnFrameCompleted();
    throw Error("Unknown render api type.");
  }
};

// src/plugins/ui/UIStats.ts
var Stat = class {
  statContainer;
  constructor(container, label) {
    this.statContainer = document.createElement("div");
    this.statContainer.classList.add("stat");
    container.appendChild(this.statContainer);
    if (label !== null) {
      const labelElement = document.createElement("label");
      labelElement.classList.add("title");
      labelElement.classList.add("title");
      labelElement.textContent = label;
      this.statContainer.append(labelElement);
    }
  }
  Disable() {
    this.statContainer.classList.add("disabled");
  }
  Enable() {
    this.statContainer.classList.remove("disabled");
  }
};
var UIDropdownStat = class extends Stat {
  selectElement;
  constructor(folder, label, options, onChanged, defaultIndex = 0) {
    super(folder.container, label);
    this.selectElement = document.createElement("select");
    this.selectElement.classList.add("value");
    for (let i2 = 0; i2 < options.length; i2++) {
      const option = options[i2];
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      this.selectElement.append(optionElement);
      if (i2 === defaultIndex) {
        this.selectElement.value = option;
      }
    }
    this.statContainer.append(this.selectElement);
    this.selectElement.addEventListener("change", (event) => {
      onChanged(this.selectElement.selectedIndex, event.target.value);
    });
  }
};
var UIButtonStat = class extends Stat {
  button;
  state;
  onText;
  offText;
  constructor(folder, label, onClicked, defaultState = false, onText = "Enable", offText = "Disable") {
    super(folder.container, label);
    this.state = defaultState;
    this.onText = onText;
    this.offText = offText;
    this.button = document.createElement("button");
    this.button.classList.add("value");
    this.button.textContent = defaultState === true ? offText : onText;
    this.statContainer.append(this.button);
    this.button.addEventListener("click", (event) => {
      this.state = !this.state;
      if (this.state === true) this.button.textContent = this.offText;
      else this.button.textContent = this.onText;
      onClicked(this.state);
    });
  }
};
var UISliderStat = class extends Stat {
  constructor(folder, label, min, max, step, defaultValue, callback) {
    super(folder.container, label);
    const container = document.createElement("div");
    container.classList.add("value");
    container.style.display = "inline-flex";
    container.style.alignItems = "center";
    container.style.padding = "0px";
    const sliderElement = document.createElement("input");
    sliderElement.classList.add("slider");
    sliderElement.style.width = "60px";
    sliderElement.style.margin = "0px";
    sliderElement.type = "range";
    sliderElement.min = `${min}`;
    sliderElement.max = `${max}`;
    sliderElement.step = `${step}`;
    sliderElement.value = `${defaultValue}`;
    const textElement = document.createElement("input");
    textElement.style.width = "25px";
    textElement.style.marginLeft = "5px";
    textElement.value = defaultValue.toString();
    textElement.addEventListener("input", (event) => {
      sliderElement.value = textElement.value;
      callback(parseFloat(sliderElement.value));
    });
    textElement.addEventListener("change", (event) => {
      sliderElement.value = textElement.value;
      callback(parseFloat(sliderElement.value));
      if (textElement.value !== "") textElement.value = sliderElement.value;
    });
    sliderElement.addEventListener("input", (event) => {
      callback(parseFloat(sliderElement.value));
      textElement.value = sliderElement.value;
    });
    container.append(sliderElement, textElement);
    this.statContainer.append(container);
  }
};
var UITextStat = class extends Stat {
  textElement;
  previousValue;
  precision;
  unit;
  rolling;
  constructor(folder, label, defaultValue = 0, precision = 0, unit = "", rolling = false) {
    super(folder.container, label);
    this.previousValue = defaultValue;
    this.precision = precision;
    this.unit = unit;
    this.rolling = rolling;
    this.textElement = document.createElement("pre");
    this.textElement.classList.add("value");
    this.textElement.textContent = defaultValue.toFixed(precision);
    this.statContainer.append(this.textElement);
    setInterval(() => {
      this.Update();
    }, 100);
  }
  SetValue(value) {
    if (this.rolling === true) {
      value = this.previousValue * 0.95 + value * 0.05;
    }
    this.previousValue = value;
  }
  GetValue() {
    return this.previousValue;
  }
  // TODO: Current value
  GetPrecision() {
    return this.precision;
  }
  SetUnit(unit) {
    this.unit = unit;
  }
  Update() {
    const valueStr = this.precision === 0 ? this.previousValue.toString() : this.previousValue.toFixed(this.precision);
    this.textElement.textContent = valueStr + this.unit;
  }
};
var UIColorStat = class extends Stat {
  colorElement;
  constructor(folder, label, color, onChanged) {
    super(folder.container, label);
    this.colorElement = document.createElement("input");
    this.colorElement.type = "color";
    this.colorElement.value = color;
    this.colorElement.classList.add("value", "color");
    this.statContainer.append(this.colorElement);
    this.colorElement.addEventListener("change", (event) => {
      onChanged(event.target.value);
    });
  }
};
var UIFolder = class extends Stat {
  folderElement;
  container;
  constructor(container, title) {
    super(container instanceof HTMLDivElement ? container : container.container, null);
    this.folderElement = document.createElement("details");
    const folderTitle = document.createElement("summary");
    folderTitle.textContent = title;
    this.container = document.createElement("div");
    this.folderElement.append(folderTitle, this.container);
    this.statContainer.append(this.folderElement);
  }
  SetPosition(position) {
    if (position.left) this.container.style.left = `${position.left}px`;
    if (position.right) this.container.style.right = `${position.right}px`;
    if (position.top) this.container.style.top = `${position.top}px`;
    if (position.bottom) this.container.style.bottom = `${position.bottom}px`;
  }
  Open() {
    this.folderElement.setAttribute("open", "");
  }
};

// src/plugins/Debugger.ts
var _Debugger = class {
  ui;
  container;
  constructor() {
    this.container = document.createElement("div");
    this.container.classList.add("stats-panel");
    document.body.append(this.container);
    this.ui = new UIFolder(this.container, "Debugger");
    this.ui.Open();
  }
  Enable() {
    this.container.style.display = "";
  }
  Disable() {
    this.container.style.display = "none";
  }
};
var Debugger = new _Debugger();

// src/renderer/RendererDebug.ts
var _RendererDebug = class {
  isDebugDepthPassEnabled = false;
  rendererFolder;
  fps;
  triangleCount;
  visibleTriangles;
  cpuTime;
  gpuTime;
  gpuBufferSizeStat;
  gpuTextureSizeStat;
  bindGroupLayoutsStat;
  bindGroupsStat;
  compiledShadersStat;
  drawCallsStat;
  viewTypeStat;
  heightScale;
  useHeightMapStat;
  viewTypeValue = 0;
  heightScaleValue = 0;
  useHeightMapValue = false;
  gpuBufferSizeTotal = 0;
  gpuTextureSizeTotal = 0;
  renderPassesFolder;
  framePassesStats = /* @__PURE__ */ new Map();
  constructor() {
    this.rendererFolder = new UIFolder(Debugger.ui, "Renderer");
    this.rendererFolder.Open();
    this.fps = new UITextStat(this.rendererFolder, "FPS", 0, 2, "", true);
    this.triangleCount = new UITextStat(this.rendererFolder, "Triangles: ");
    this.visibleTriangles = new UITextStat(this.rendererFolder, "Visible triangles: ");
    this.cpuTime = new UITextStat(this.rendererFolder, "CPU: ", 0, 2, "ms", true);
    this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
    this.gpuBufferSizeStat = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
    this.gpuTextureSizeStat = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 2);
    this.bindGroupLayoutsStat = new UITextStat(this.rendererFolder, "Bind group layouts: ");
    this.bindGroupsStat = new UITextStat(this.rendererFolder, "Bind groups: ");
    this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
    this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");
    this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Final output:", ["Lighting", "Albedo Map", "Normal Map", "Metalness", "Roughness", "Emissive"], (index, value) => {
      this.viewTypeValue = index;
    }, this.viewTypeValue);
    this.heightScale = new UISliderStat(this.rendererFolder, "Height scale:", 0, 1, 0.01, this.heightScaleValue, (state) => {
      this.heightScaleValue = state;
    });
    this.useHeightMapStat = new UIButtonStat(this.rendererFolder, "Use heightmap:", (state) => {
      this.useHeightMapValue = state;
    }, this.useHeightMapValue);
    this.renderPassesFolder = new UIFolder(this.rendererFolder, "Frame passes");
    this.renderPassesFolder.Open();
  }
  SetPassTime(name, time) {
    let framePass = this.framePassesStats.get(name);
    if (!framePass) {
      framePass = new UITextStat(this.renderPassesFolder, name, 0, 2, "ms", true);
      this.framePassesStats.set(name, framePass);
    }
    framePass.SetValue(time / 1e6);
  }
  SetCPUTime(value) {
    this.cpuTime.SetValue(value);
  }
  SetTriangleCount(count) {
    this.triangleCount.SetValue(count);
  }
  IncrementTriangleCount(count) {
    this.triangleCount.SetValue(this.triangleCount.GetValue() + count);
  }
  SetVisibleTriangleCount(count) {
    this.visibleTriangles.SetValue(count);
  }
  IncrementVisibleTriangleCount(count) {
    this.visibleTriangles.SetValue(this.visibleTriangles.GetValue() + count);
  }
  SetFPS(count) {
    this.fps.SetValue(count);
    let totalGPUTime = 0;
    for (const [_, framePass] of this.framePassesStats) {
      totalGPUTime += framePass.GetValue();
    }
    this.gpuTime.SetValue(totalGPUTime);
  }
  IncrementBindGroupLayouts(value) {
    this.bindGroupLayoutsStat.SetValue(this.bindGroupLayoutsStat.GetValue() + value);
  }
  IncrementBindGroups(value) {
    this.bindGroupsStat.SetValue(this.bindGroupsStat.GetValue() + value);
  }
  FormatBytes(bytes, decimals = 2) {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i2 = Math.floor(Math.log(bytes) / Math.log(k));
    return { value: parseFloat((bytes / Math.pow(k, i2)).toFixed(decimals)), rank: sizes[i2] };
  }
  IncrementGPUBufferSize(value) {
    this.gpuBufferSizeTotal += value;
    const formatted = this.FormatBytes(this.gpuBufferSizeTotal, this.gpuBufferSizeStat.GetPrecision());
    this.gpuBufferSizeStat.SetUnit(formatted.rank);
    this.gpuBufferSizeStat.SetValue(formatted.value);
  }
  IncrementGPUTextureSize(value) {
    this.gpuTextureSizeTotal += value;
    const formatted = this.FormatBytes(this.gpuTextureSizeTotal, this.gpuTextureSizeStat.GetPrecision());
    this.gpuTextureSizeStat.SetUnit(formatted.rank);
    this.gpuTextureSizeStat.SetValue(formatted.value);
  }
  IncrementDrawCalls(count) {
    this.drawCallsStat.SetValue(this.drawCallsStat.GetValue() + count);
  }
  IncrementShaderCompiles(count) {
    this.compiledShadersStat.SetValue(this.compiledShadersStat.GetValue() + count);
  }
  ResetFrame() {
    this.drawCallsStat.SetValue(0);
  }
};
var RendererDebug = new _RendererDebug();

// src/renderer/webgpu/WEBGPUBuffer.ts
var BaseBuffer = class {
  id = Utils.UUID();
  buffer;
  size;
  set name(name) {
    this.buffer.label = name;
  }
  get name() {
    return this.buffer.label;
  }
  constructor(sizeInBytes, type) {
    RendererDebug.IncrementGPUBufferSize(sizeInBytes);
    let usage = void 0;
    if (type == 0 /* STORAGE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 1 /* STORAGE_WRITE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 3 /* VERTEX */) usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 4 /* INDEX */) usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 2 /* UNIFORM */) usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 5 /* INDIRECT */) usage = GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
    else if (type == 10) usage = GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    if (!usage) throw Error("Invalid buffer usage");
    this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage });
    this.size = sizeInBytes;
  }
  GetBuffer() {
    return this.buffer;
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
    WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
  }
  async GetData(sourceOffset = 0, destinationOffset = 0, size) {
    const readBuffer = WEBGPURenderer.device.createBuffer({
      size: size ? size : this.buffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    const commandEncoder = WEBGPURenderer.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(this.buffer, sourceOffset, readBuffer, destinationOffset, size ? size : this.buffer.size);
    WEBGPURenderer.device.queue.submit([commandEncoder.finish()]);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = readBuffer.getMappedRange().slice(0);
    readBuffer.unmap();
    readBuffer.destroy();
    return arrayBuffer;
  }
  Destroy() {
    RendererDebug.IncrementGPUBufferSize(-this.size);
    this.buffer.destroy();
  }
};
var WEBGPUBuffer = class extends BaseBuffer {
  constructor(sizeInBytes, type) {
    super(sizeInBytes, type);
  }
};
var WEBGPUDynamicBuffer = class extends BaseBuffer {
  minBindingSize;
  dynamicOffset = 0;
  constructor(sizeInBytes, type, minBindingSize) {
    super(sizeInBytes, type);
    this.minBindingSize = minBindingSize;
  }
};

// src/renderer/Buffer.ts
var Buffer3 = class {
  size;
  set name(name) {
  }
  get name() {
    return "Buffer";
  }
  constructor() {
  }
  static Create(size, type) {
    if (size === 0) throw Error("Tried to create a buffer with size 0");
    if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type);
    else throw Error("Renderer type invalid");
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
  }
  async GetData(sourceOffset, destinationOffset, size) {
    return new ArrayBuffer(1);
  }
  Destroy() {
  }
};

// src/Geometry.ts
var GeometryAttribute = class {
  array;
  buffer;
  constructor(array, type) {
    if (array.length === 0) throw Error("GeometryAttribute data is empty");
    this.array = array;
    this.buffer = Buffer3.Create(array.byteLength, type);
    this.buffer.SetArray(this.array);
  }
  GetBuffer() {
    return this.buffer;
  }
};
var VertexAttribute = class extends GeometryAttribute {
  constructor(array) {
    super(array, 3 /* VERTEX */);
  }
};
var InterleavedVertexAttribute = class _InterleavedVertexAttribute extends GeometryAttribute {
  constructor(array, stride) {
    super(array, 3 /* VERTEX */);
    this.array = array;
    this.stride = stride;
  }
  static fromArrays(attributes, inputStrides, outputStrides) {
    function stridedCopy(target, values, offset2, inputStride, outputStride, interleavedStride2) {
      let writeIndex = offset2;
      for (let i2 = 0; i2 < values.length; i2 += inputStride) {
        for (let j = 0; j < inputStride && i2 + j < values.length; j++) {
          target[writeIndex + j] = values[i2 + j];
        }
        for (let j = inputStride; j < outputStride; j++) {
          target[writeIndex + j] = 0;
        }
        writeIndex += interleavedStride2;
      }
    }
    if (!outputStrides) outputStrides = inputStrides;
    const interleavedStride = outputStrides.reduce((a, b) => a + b, 0);
    let totalLength = 0;
    for (let i2 = 0; i2 < attributes.length; i2++) {
      totalLength += attributes[i2].length / inputStrides[i2] * outputStrides[i2];
    }
    const interleavedArray = new Float32Array(totalLength);
    let offset = 0;
    for (let i2 = 0; i2 < attributes.length; i2++) {
      const attribute = attributes[i2];
      const inputStride = inputStrides[i2];
      const outputStride = outputStrides[i2];
      stridedCopy(interleavedArray, attribute, offset, inputStride, outputStride, interleavedStride);
      offset += outputStride;
    }
    return new _InterleavedVertexAttribute(interleavedArray, interleavedStride);
  }
};
var IndexAttribute = class extends GeometryAttribute {
  constructor(array) {
    super(array, 4 /* INDEX */);
  }
};
var Geometry = class _Geometry {
  id = Utils.UUID();
  index;
  attributes = /* @__PURE__ */ new Map();
  enableShadows = true;
  _boundingVolume;
  get boundingVolume() {
    const positions = this.attributes.get("position");
    if (!positions) throw Error("Geometry has no position attribute");
    if (!this._boundingVolume) this._boundingVolume = BoundingVolume.FromVertices(positions.array);
    return this._boundingVolume;
  }
  ComputeBoundingVolume() {
    const positions = this.attributes.get("position");
    if (!positions) throw Error("Geometry has no position attribute");
    this._boundingVolume = BoundingVolume.FromVertices(positions.array);
  }
  Clone() {
    const clone = new _Geometry();
    for (const attribute of this.attributes) {
      clone.attributes.set(attribute[0], attribute[1]);
    }
    if (this.index) {
      clone.index = new IndexAttribute(this.index.array);
    }
    clone.enableShadows = this.enableShadows;
    return clone;
  }
  ApplyOperationToVertices(operation, vec) {
    let verts = this.attributes.get("position");
    if (!verts) throw Error("No verts");
    if (verts instanceof InterleavedVertexAttribute) throw Error("InterleavedVertexAttribute not implemented.");
    const center = this.boundingVolume.center;
    let vertsCentered = new Float32Array(verts.array.length);
    for (let i2 = 0; i2 < verts.array.length; i2 += 3) {
      if (operation === "+") {
        vertsCentered[i2 + 0] = verts.array[i2 + 0] + vec.x;
        vertsCentered[i2 + 1] = verts.array[i2 + 1] + vec.y;
        vertsCentered[i2 + 2] = verts.array[i2 + 2] + vec.z;
      } else if (operation === "*") {
        vertsCentered[i2 + 0] = verts.array[i2 + 0] * vec.x;
        vertsCentered[i2 + 1] = verts.array[i2 + 1] * vec.y;
        vertsCentered[i2 + 2] = verts.array[i2 + 2] * vec.z;
      }
    }
    const geometryCentered = this.Clone();
    geometryCentered.attributes.set("position", new VertexAttribute(vertsCentered));
    return geometryCentered;
  }
  Center() {
    const center = this.boundingVolume.center;
    return this.ApplyOperationToVertices("+", center.mul(-1));
  }
  Scale(scale) {
    return this.ApplyOperationToVertices("*", scale);
  }
  ComputeNormals() {
    let posAttrData = this.attributes.get("position")?.array;
    let indexAttrData = this.index?.array;
    if (!posAttrData || !indexAttrData) throw Error("Cannot compute normals without vertices and indices");
    let normalAttrData = new Float32Array(posAttrData.length);
    let trianglesCount = indexAttrData.length / 3;
    let point1 = new Vector3(0, 1, 0);
    let point2 = new Vector3(0, 1, 0);
    let point3 = new Vector3(0, 1, 0);
    let crossA = new Vector3(0, 1, 0);
    let crossB = new Vector3(0, 1, 0);
    for (let i2 = 0; i2 < trianglesCount; i2++) {
      let index1 = indexAttrData[i2 * 3];
      let index2 = indexAttrData[i2 * 3 + 1];
      let index3 = indexAttrData[i2 * 3 + 2];
      point1.set(posAttrData[index1 * 3], posAttrData[index1 * 3 + 1], posAttrData[index1 * 3 + 2]);
      point2.set(posAttrData[index2 * 3], posAttrData[index2 * 3 + 1], posAttrData[index2 * 3 + 2]);
      point3.set(posAttrData[index3 * 3], posAttrData[index3 * 3 + 1], posAttrData[index3 * 3 + 2]);
      crossA.copy(point1).sub(point2).normalize();
      crossB.copy(point1).sub(point3).normalize();
      let normal = crossA.clone().cross(crossB).normalize();
      normalAttrData[index1 * 3] = normalAttrData[index2 * 3] = normalAttrData[index3 * 3] = normal.x;
      normalAttrData[index1 * 3 + 1] = normalAttrData[index2 * 3 + 1] = normalAttrData[index3 * 3 + 1] = normal.y;
      normalAttrData[index1 * 3 + 2] = normalAttrData[index2 * 3 + 2] = normalAttrData[index3 * 3 + 2] = normal.z;
    }
    let normals = this.attributes.get("normal");
    if (!normals) normals = new VertexAttribute(normalAttrData);
    this.attributes.set("normal", normals);
  }
  static ToNonIndexed(vertices, indices) {
    const itemSize = 3;
    const array2 = new Float32Array(indices.length * itemSize);
    let index = 0, index2 = 0;
    for (let i2 = 0, l = indices.length; i2 < l; i2++) {
      index = indices[i2] * itemSize;
      for (let j = 0; j < itemSize; j++) {
        array2[index2++] = vertices[index++];
      }
    }
    return array2;
  }
  static Cube() {
    const vertices = new Float32Array([
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5
    ]);
    const uvs = new Float32Array([
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0
    ]);
    const normals = new Float32Array([
      1,
      0,
      0,
      1,
      0,
      -0,
      1,
      0,
      -0,
      1,
      0,
      -0,
      -1,
      0,
      0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      0,
      -0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1
    ]);
    const indices = new Uint32Array([
      0,
      2,
      1,
      2,
      3,
      1,
      4,
      6,
      5,
      6,
      7,
      5,
      8,
      10,
      9,
      10,
      11,
      9,
      12,
      14,
      13,
      14,
      15,
      13,
      16,
      18,
      17,
      18,
      19,
      17,
      20,
      22,
      21,
      22,
      23,
      21
    ]);
    const geometry = new _Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.attributes.set("normal", new VertexAttribute(normals));
    geometry.index = new IndexAttribute(indices);
    return geometry;
  }
  static Plane() {
    const vertices = new Float32Array([
      -1,
      -1,
      0,
      // Bottom left
      1,
      -1,
      0,
      // Bottom right
      1,
      1,
      0,
      // Top right
      -1,
      1,
      0
      // Top left
    ]);
    const indices = new Uint32Array([
      0,
      1,
      2,
      // First triangle (bottom left to top right)
      2,
      3,
      0
      // Second triangle (top right to top left)
    ]);
    const uvs = new Float32Array([
      0,
      1,
      // Bottom left (now top left)
      1,
      1,
      // Bottom right (now top right)
      1,
      0,
      // Top right (now bottom right)
      0,
      0
      // Top left (now bottom left)
    ]);
    const normals = new Float32Array([
      0,
      0,
      1,
      // Normal for bottom left vertex
      0,
      0,
      1,
      // Normal for bottom right vertex
      0,
      0,
      1,
      // Normal for top right vertex
      0,
      0,
      1
      // Normal for top left vertex
    ]);
    const geometry = new _Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("normal", new VertexAttribute(normals));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.index = new IndexAttribute(indices);
    return geometry;
  }
  static Sphere() {
    const radius = 0.5;
    const phiStart = 0;
    const phiLength = Math.PI * 2;
    const thetaStart = 0;
    const thetaLength = Math.PI;
    let widthSegments = 16;
    let heightSegments = 8;
    widthSegments = Math.max(3, Math.floor(widthSegments));
    heightSegments = Math.max(2, Math.floor(heightSegments));
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
    let index = 0;
    const grid = [];
    const vertex = new Vector3();
    const normal = new Vector3();
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow = [];
      const v = iy / heightSegments;
      let uOffset = 0;
      if (iy === 0 && thetaStart === 0) uOffset = 0.5 / widthSegments;
      else if (iy === heightSegments && thetaEnd === Math.PI) uOffset = -0.5 / widthSegments;
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments;
        vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
        vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertices.push(vertex.x, vertex.y, vertex.z);
        normal.copy(vertex).normalize();
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u + uOffset, 1 - v);
        verticesRow.push(index++);
      }
      grid.push(verticesRow);
    }
    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = grid[iy][ix + 1];
        const b = grid[iy][ix];
        const c = grid[iy + 1][ix];
        const d = grid[iy + 1][ix + 1];
        if (iy !== 0 || thetaStart > 0) indices.push(a, b, d);
        if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d);
      }
    }
    const geometry = new _Geometry();
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
    return geometry;
  }
};

// src/EngineDebug.ts
var _EngineDebug = class {
  componentUpdate;
  engineFolder;
  constructor() {
    this.engineFolder = new UIFolder(Debugger.ui, "Engine");
    this.engineFolder.Open();
    this.componentUpdate = new UITextStat(this.engineFolder, "Component update", 0, 2, "", true);
  }
};
var EngineDebug = new _EngineDebug();

// src/renderer/RenderGraph.ts
var RenderPass = class {
  name;
  inputs = [];
  outputs = [];
  initialized = false;
  initializing = false;
  constructor(params) {
    if (params.inputs) this.inputs = params.inputs;
    if (params.outputs) this.outputs = params.outputs;
  }
  async init(resources) {
  }
  execute(resources, ...args) {
  }
  set(data) {
    if (data.inputs) this.inputs = data.inputs;
    if (data.outputs) this.outputs = data.outputs;
  }
};
var ResourcePool = class {
  resources = {};
  setResource(name, resource) {
    this.resources[name] = resource;
  }
  getResource(name) {
    return this.resources[name];
  }
};
var RenderGraph = class {
  passes = [];
  resourcePool = new ResourcePool();
  addPass(pass) {
    this.passes.push(pass);
  }
  async init() {
    const sortedPasses = this.topologicalSort();
    for (const pass of sortedPasses) {
      if (pass.initialized === true || pass.initializing === true) continue;
      pass.initializing = true;
      await pass.init(this.resourcePool);
      pass.initialized = true;
    }
  }
  execute() {
    const sortedPasses = this.topologicalSort();
    for (const pass of sortedPasses) {
      if (!pass.initialized) {
        console.log(`didnt execute ${pass.name} because its not initialized`);
        return;
      }
      const inputs = pass.inputs.map((value) => this.resourcePool.getResource(value));
      pass.execute(this.resourcePool, ...inputs, ...pass.outputs);
    }
  }
  topologicalSort() {
    return this.passes;
  }
};

// src/Assets.ts
var Assets = class _Assets {
  static cache = /* @__PURE__ */ new Map();
  static async Load(url, type) {
    const cached = _Assets.cache.get(url);
    if (cached !== void 0) {
      return cached;
    }
    const promise = fetch(url).then((response) => {
      if (!response.ok) throw Error(`File not found ${url}`);
      if (type === "json") return response.json();
      else if (type === "text") return response.text();
      else if (type === "binary") return response.arrayBuffer();
    }).then((result) => {
      _Assets.cache.set(url, Promise.resolve(result));
      return result;
    }).catch((error) => {
      _Assets.cache.delete(url);
      throw error;
    });
    _Assets.cache.set(url, promise);
    return promise;
  }
};

// src/renderer/webgpu/shaders/deferred/Cull.wgsl
var Cull_default = "./resources/renderer/webgpu/shaders/deferred/Cull.wgsl";

// src/renderer/webgpu/shaders/deferred/CullStructs.wgsl
var CullStructs_default = "./resources/renderer/webgpu/shaders/deferred/CullStructs.wgsl";

// src/renderer/webgpu/shaders/deferred/SettingsStructs.wgsl
var SettingsStructs_default = "./resources/renderer/webgpu/shaders/deferred/SettingsStructs.wgsl";

// src/renderer/webgpu/shaders/deferred/DrawIndirectGBuffer.wgsl
var DrawIndirectGBuffer_default = "./resources/renderer/webgpu/shaders/deferred/DrawIndirectGBuffer.wgsl";

// src/renderer/webgpu/shaders/deferred/DrawGBuffer.wgsl
var DrawGBuffer_default = "./resources/renderer/webgpu/shaders/deferred/DrawGBuffer.wgsl";

// src/renderer/webgpu/shaders/Blit.wgsl
var Blit_default = "./resources/renderer/webgpu/shaders/Blit.wgsl";

// src/renderer/webgpu/shaders/BlitDepth.wgsl
var BlitDepth_default = "./resources/renderer/webgpu/shaders/BlitDepth.wgsl";

// src/renderer/webgpu/shaders/DepthDownsample.wgsl
var DepthDownsample_default = "./resources/renderer/webgpu/shaders/DepthDownsample.wgsl";

// src/renderer/webgpu/shaders/deferred/DeferredLightingPBR.wgsl
var DeferredLightingPBR_default = "./resources/renderer/webgpu/shaders/deferred/DeferredLightingPBR.wgsl";

// src/renderer/ShaderUtils.ts
var ShaderPreprocessor = class {
  static ProcessDefines(code, defines) {
    const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);
    for (const condition of coditions) {
      const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
      const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
      if (defines[variable] === true) code = code.replaceAll(condition, value);
      else code = code.replaceAll(condition, "");
    }
    return code;
  }
  static async ProcessIncludes(code, url = "./") {
    const basepath = url.substring(url.lastIndexOf("/"), -1) + "/";
    const includes = Utils.StringFindAllBetween(code, "#include", "\n", false);
    for (const includeStr of includes) {
      const filenameArray = Utils.StringFindAllBetween(includeStr, '"', '"', true);
      if (filenameArray.length !== 1) throw Error(`Invalid include ${filenameArray}`);
      const includeFullPath = filenameArray[0];
      const includePath = includeFullPath.substring(includeFullPath.lastIndexOf("/"), -1) + "/";
      const includeFilename = includeFullPath.substring(includeFullPath.lastIndexOf("/")).slice(1);
      const new_path = basepath + includePath + includeFilename;
      const newCode = await Assets.Load(new_path, "text");
      const includedCode = await this.ProcessIncludes(newCode, new_path);
      code = code.replace(includeStr, includedCode + "\n");
    }
    return code;
  }
};
var ShaderLoader = class _ShaderLoader {
  static async Load(shader_url) {
    if (Renderer.type === "webgpu") {
      if (shader_url === "") throw Error(`Invalid shader ${shader_url}`);
      let code = await Assets.Load(shader_url, "text");
      code = await ShaderPreprocessor.ProcessIncludes(code, shader_url);
      return code;
    }
    throw Error("Unknown api");
  }
  static get Cull() {
    return _ShaderLoader.Load(Cull_default);
  }
  static get CullStructs() {
    return _ShaderLoader.Load(CullStructs_default);
  }
  static get SettingsStructs() {
    return _ShaderLoader.Load(SettingsStructs_default);
  }
  static get DepthDownsample() {
    return _ShaderLoader.Load(DepthDownsample_default);
  }
  static get DrawIndirect() {
    return _ShaderLoader.Load(DrawIndirectGBuffer_default);
  }
  static get Draw() {
    return _ShaderLoader.Load(DrawGBuffer_default);
  }
  static get Blit() {
    return _ShaderLoader.Load(Blit_default);
  }
  static get BlitDepth() {
    return _ShaderLoader.Load(BlitDepth_default);
  }
  static get DeferredLighting() {
    return _ShaderLoader.Load(DeferredLightingPBR_default);
  }
};

// src/math/Vector2.ts
var Vector2 = class _Vector2 {
  _x;
  _y;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  _elements = new Float32Array(3);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    return this._elements;
  }
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
  }
  mul(v) {
    if (v instanceof _Vector2) this.x *= v.x, this.y *= v.y;
    else this.x *= v, this.y *= v;
    return this;
  }
  div(v) {
    if (v instanceof _Vector2) this.x /= v.x, this.y /= v.y;
    else this.x /= v, this.y /= v;
    return this;
  }
  add(v) {
    if (v instanceof _Vector2) this.x += v.x, this.y += v.y;
    else this.x += v, this.y += v;
    return this;
  }
  sub(v) {
    if (v instanceof _Vector2) this.x -= v.x, this.y -= v.y;
    else this.x -= v, this.y -= v;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  clone() {
    return new _Vector2(this.x, this.y);
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  toString() {
    return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)})`;
  }
};

// src/renderer/webgpu/utils/WEBGPUMipsGenerator.ts
var WEBGPUMipsGenerator = class {
  static sampler;
  static module;
  static pipelineByFormat = {};
  static numMipLevels(...sizes) {
    return 1 + Math.log2(Math.max(...sizes)) | 0;
  }
  // TODO: Cannot call this twice because of texture usages
  static generateMips(source) {
    if (!WEBGPURenderer.device) throw Error("WEBGPU not initialized");
    const device2 = WEBGPURenderer.device;
    const sourceBuffer = source.GetBuffer();
    if (!this.module) {
      this.module = device2.createShaderModule({
        label: "textured quad shaders for mip level generation",
        code: `
                    struct VSOutput {
                        @builtin(position) position: vec4f,
                        @location(0) texcoord: vec2f,
                    };
                    
                    @vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VSOutput {
                        const pos = array(
                            vec2f( 0.0,  0.0),  // center
                            vec2f( 1.0,  0.0),  // right, center
                            vec2f( 0.0,  1.0),  // center, top
                    
                            // 2st triangle
                            vec2f( 0.0,  1.0),  // center, top
                            vec2f( 1.0,  0.0),  // right, center
                            vec2f( 1.0,  1.0),  // right, top
                        );
                    
                        var vsOutput: VSOutput;
                        let xy = pos[vertexIndex];
                        vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
                        vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
                        return vsOutput;
                    }
                    
                    @group(0) @binding(0) var ourSampler: sampler;
                    @group(0) @binding(1) var ourTexture: texture_2d<f32>;
                    
                    @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
                        return textureSample(ourTexture, ourSampler, fsInput.texcoord);
                    }
                `
      });
      this.sampler = device2.createSampler({ minFilter: "linear", magFilter: "linear" });
    }
    if (!this.pipelineByFormat[sourceBuffer.format]) {
      this.pipelineByFormat[sourceBuffer.format] = device2.createRenderPipeline({
        label: "mip level generator pipeline",
        layout: "auto",
        vertex: { module: this.module },
        fragment: { module: this.module, targets: [{ format: sourceBuffer.format }] }
      });
    }
    const pipeline = this.pipelineByFormat[sourceBuffer.format];
    const encoder = device2.createCommandEncoder({ label: "mip gen encoder" });
    const destinationBuffer = device2.createTexture({
      label: "destinationBuffer",
      format: sourceBuffer.format,
      mipLevelCount: this.numMipLevels(source.width, source.height),
      size: [source.width, source.height, 1],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT
    });
    let width = sourceBuffer.width;
    let height = sourceBuffer.height;
    encoder.copyTextureToTexture({ texture: sourceBuffer }, { texture: destinationBuffer }, [width, height]);
    let baseMipLevel = 0;
    while (width > 1 || height > 1) {
      width = Math.max(1, width / 2 | 0);
      height = Math.max(1, height / 2 | 0);
      const bindGroup = device2.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.sampler },
          { binding: 1, resource: destinationBuffer.createView({ baseMipLevel, mipLevelCount: 1 }) }
        ]
      });
      ++baseMipLevel;
      const renderPassDescriptor = {
        label: "WEBGPUMipsGenerator",
        colorAttachments: [
          {
            view: destinationBuffer.createView({ baseMipLevel, mipLevelCount: 1 }),
            loadOp: "clear",
            storeOp: "store"
          }
        ]
      };
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
      pass.end();
    }
    const commandBuffer = encoder.finish();
    device2.queue.submit([commandBuffer]);
    return destinationBuffer;
  }
};

// src/renderer/webgpu/WEBGPUTexture.ts
var WEBGPUTexture = class _WEBGPUTexture {
  id = Utils.UUID();
  width;
  height;
  depth;
  format;
  type;
  dimension;
  mipLevels;
  buffer;
  viewCache = /* @__PURE__ */ new Map();
  currentLayer = 0;
  currentMip = 0;
  activeMipCount = 1;
  constructor(width, height, depth, format, type, dimension, mipLevels) {
    let textureUsage = GPUTextureUsage.COPY_DST;
    let textureType = GPUTextureUsage.TEXTURE_BINDING;
    if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
    else if (type === 1 /* DEPTH */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    else if (type === 2 /* RENDER_TARGET */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    else if (type === 3 /* RENDER_TARGET_STORAGE */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
    else throw Error(`Unknown texture format ${format}`);
    let dim = "2d";
    if (dimension === "1d") dim = "1d";
    else if (dimension === "3d") dim = "3d";
    const textureBindingViewDimension = dimension === "cube" ? "cube" : void 0;
    this.buffer = WEBGPURenderer.device.createTexture({
      size: [width, height, depth],
      // @ts-ignore
      textureBindingViewDimension,
      dimension: dim,
      format,
      usage: textureUsage | textureType,
      mipLevelCount: mipLevels
    });
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.format = format;
    this.type = type;
    this.dimension = dimension;
    this.mipLevels = mipLevels;
  }
  GetBuffer() {
    return this.buffer;
  }
  GetView() {
    const key = `${this.currentLayer}-${this.currentMip}`;
    let view = this.viewCache.get(key);
    if (!view) {
      view = this.buffer.createView({
        dimension: this.dimension,
        baseArrayLayer: this.currentLayer,
        arrayLayerCount: 1,
        baseMipLevel: this.currentMip,
        mipLevelCount: this.activeMipCount
      });
      this.viewCache.set(key, view);
    }
    return view;
  }
  GenerateMips() {
    this.buffer = WEBGPUMipsGenerator.generateMips(this);
    this.SetActiveMipCount(WEBGPUMipsGenerator.numMipLevels(this.width, this.height));
  }
  SetActiveLayer(layer) {
    if (layer > this.depth) throw Error("Active layer cannot be bigger than depth size");
    this.currentLayer = layer;
  }
  GetActiveLayer() {
    return this.currentLayer;
  }
  SetActiveMip(mip) {
    if (mip > this.mipLevels) throw Error("Active mip cannot be bigger than mip levels size");
    this.currentMip = mip;
  }
  GetActiveMip() {
    return this.currentMip;
  }
  SetActiveMipCount(mipCount) {
    return this.activeMipCount = mipCount;
  }
  GetActiveMipCount() {
    return this.activeMipCount;
  }
  Destroy() {
    this.buffer.destroy();
  }
  SetData(data) {
    const extraBytes = this.format.includes("rgba32float") ? 4 : 1;
    console.log(extraBytes);
    try {
      WEBGPURenderer.device.queue.writeTexture(
        { texture: this.buffer },
        data,
        { bytesPerRow: this.width * 4 * extraBytes, rowsPerImage: this.depth },
        { width: this.width, height: this.height, depthOrArrayLayers: this.depth }
      );
    } catch (error) {
      console.warn(error);
    }
  }
  // Format and types are very limited for now
  // https://github.com/gpuweb/gpuweb/issues/2322
  static FromImageBitmap(imageBitmap, width, height, format, flipY) {
    const texture = new _WEBGPUTexture(width, height, 1, format, 2 /* RENDER_TARGET */, "2d", 1);
    try {
      WEBGPURenderer.device.queue.copyExternalImageToTexture(
        { source: imageBitmap, flipY },
        { texture: texture.GetBuffer() },
        [imageBitmap.width, imageBitmap.height]
      );
    } catch (error) {
      console.warn(error);
    }
    return texture;
  }
};

// src/renderer/webgpu/WEBGPUTimestampQuery.ts
var WEBGPUTimestampQuery = class {
  static querySet;
  static resolveBuffer;
  static resultBuffer;
  static isTimestamping = false;
  static links = /* @__PURE__ */ new Map();
  static currentLinkIndex = 0;
  static BeginRenderTimestamp(name) {
    if (this.links.has(name)) return void 0;
    if (!navigator.userAgent.toLowerCase().includes("chrome")) return void 0;
    if (this.isTimestamping === true) throw Error("Already timestamping");
    if (!this.querySet) {
      this.querySet = WEBGPURenderer.device.createQuerySet({
        type: "timestamp",
        count: 200
      });
    }
    if (!this.resolveBuffer) {
      this.resolveBuffer = WEBGPURenderer.device.createBuffer({
        size: this.querySet.count * 8,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
      });
    }
    if (!this.resultBuffer) {
      this.resultBuffer = WEBGPURenderer.device.createBuffer({
        size: this.querySet.count * 8,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });
    }
    this.isTimestamping = true;
    const currentLinkIndex = this.currentLinkIndex;
    this.currentLinkIndex += 2;
    this.links.set(name, currentLinkIndex);
    return { querySet: this.querySet, beginningOfPassWriteIndex: currentLinkIndex, endOfPassWriteIndex: currentLinkIndex + 1 };
  }
  static EndRenderTimestamp() {
    if (this.isTimestamping === false) return;
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.resultBuffer.mapState === "unmapped") {
      activeCommandEncoder.resolveQuerySet(this.querySet, 0, this.querySet.count, this.resolveBuffer, 0);
      activeCommandEncoder.copyBufferToBuffer(this.resolveBuffer, 0, this.resultBuffer, 0, this.resultBuffer.size);
    }
    this.isTimestamping = false;
  }
  static async GetResult() {
    if (!this.resultBuffer || this.resultBuffer.mapState !== "unmapped") return;
    await this.resultBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = this.resultBuffer.getMappedRange().slice(0);
    const times = new BigInt64Array(arrayBuffer);
    let visited = {};
    let frameTimes = /* @__PURE__ */ new Map();
    for (const [name, num] of this.links) {
      if (visited[name] === true) continue;
      const duration = Number(times[num + 1] - times[num]);
      frameTimes.set(name, duration);
      visited[name] = true;
    }
    this.resultBuffer.unmap();
    this.currentLinkIndex = 0;
    this.links.clear();
    return frameTimes;
  }
};

// src/renderer/webgpu/WEBGPURendererContext.ts
var WEBGPURendererContext = class {
  static activeRenderPass = null;
  static BeginRenderPass(name, renderTargets, depthTarget, timestamp) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.activeRenderPass) throw Error("There is already an active render pass");
    const renderPassDescriptor = { colorAttachments: [], label: "RenderPassDescriptor: " + name };
    if (timestamp === true) renderPassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);
    const attachments = [];
    for (const renderTarget of renderTargets) {
      attachments.push({
        view: renderTarget.target ? renderTarget.target.GetView() : WEBGPURenderer.context.getCurrentTexture().createView(),
        clearValue: renderTarget.color,
        loadOp: renderTarget.clear ? "clear" : "load",
        storeOp: "store"
      });
    }
    renderPassDescriptor.colorAttachments = attachments;
    if (depthTarget?.target) {
      renderPassDescriptor.depthStencilAttachment = {
        view: depthTarget.target.GetView(),
        depthClearValue: 1,
        depthLoadOp: depthTarget.clear ? "clear" : "load",
        depthStoreOp: "store"
      };
    }
    this.activeRenderPass = activeCommandEncoder.beginRenderPass(renderPassDescriptor);
    this.activeRenderPass.label = "RenderPass: " + name;
  }
  static EndRenderPass() {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.end();
    this.activeRenderPass = null;
    WEBGPUTimestampQuery.EndRenderTimestamp();
  }
  static DrawGeometry(geometry, shader, instanceCount = 1) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    if (!shader.OnPreRender()) return;
    shader.Compile();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    RendererDebug.IncrementDrawCalls(1);
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i2 = 0; i2 < shader.bindGroups.length; i2++) {
      let dynamicOffsets = [];
      for (const buffer of shader.bindGroupsInfo[i2].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsets.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i2, shader.bindGroups[i2], dynamicOffsets);
    }
    for (const [name, attribute] of geometry.attributes) {
      const attributeSlot = shader.GetAttributeSlot(name);
      if (attributeSlot === void 0) continue;
      const attributeBuffer = attribute.buffer;
      this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
    }
    if (!shader.params.topology || shader.params.topology === "triangle-list" /* Triangles */) {
      if (!geometry.index) {
        const positions = geometry.attributes.get("position");
        this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount);
      } else {
        const indexBuffer = geometry.index.buffer;
        this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
        this.activeRenderPass.drawIndexed(indexBuffer.size / 4, instanceCount);
      }
    } else if (shader.params.topology === "line-list" /* Lines */) {
      const positions = geometry.attributes.get("position");
      this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount);
    }
  }
  static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    shader.Compile();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i2 = 0; i2 < shader.bindGroups.length; i2++) {
      let dynamicOffsetsV2 = [];
      for (const buffer of shader.bindGroupsInfo[i2].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsetsV2.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i2, shader.bindGroups[i2], dynamicOffsetsV2);
    }
    for (const [name, attribute] of geometry.attributes) {
      const attributeSlot = shader.GetAttributeSlot(name);
      if (attributeSlot === void 0) continue;
      const attributeBuffer = attribute.buffer;
      this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
    }
    if (!geometry.index) {
      this.activeRenderPass.drawIndirect(indirectBuffer.GetBuffer(), indirectOffset);
    } else {
      const indexBuffer = geometry.index.buffer;
      this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
      this.activeRenderPass.drawIndexedIndirect(indirectBuffer.GetBuffer(), indirectOffset);
    }
  }
  static SetViewport(x, y, width, height, minDepth, maxDepth) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.setViewport(x, y, width, height, minDepth, maxDepth);
  }
  static SetScissor(x, y, width, height) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.setScissorRect(x, y, width, height);
  }
  static CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.copyBufferToBuffer(source.GetBuffer(), sourceOffset, destination.GetBuffer(), destinationOffset, size);
  }
  static CopyBufferToTexture(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { buffer: source.buffer.GetBuffer(), offset: source.offset, bytesPerRow: source.bytesPerRow, rowsPerImage: source.rowsPerImage };
    const destinationParameters = { texture: destination.texture.GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin };
    const extents = copySize ? copySize : [destination.texture.width, destination.texture.height, destination.texture.depth];
    activeCommandEncoder.copyBufferToTexture(sourceParameters, destinationParameters, extents);
  }
  // CopyTexture(Texture src, int srcElement, int srcMip, Texture dst, int dstElement, int dstMip);
  static CopyTextureToTexture(source, destination, srcMip, dstMip, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToTexture({ texture: source.GetBuffer(), mipLevel: srcMip }, { texture: destination.GetBuffer(), mipLevel: dstMip }, extents);
  }
  static CopyTextureToBuffer(source, destination, srcMip, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToBuffer({ texture: source.GetBuffer(), mipLevel: srcMip }, { buffer: destination.GetBuffer(), bytesPerRow: source.width * 4 }, extents);
  }
  static CopyTextureToBufferV2(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { texture: source.texture.GetBuffer(), mipLevel: source.mipLevel, origin: source.origin };
    const destinationParameters = { buffer: destination.buffer.GetBuffer(), offset: destination.offset, bytesPerRow: destination.bytesPerRow, rowsPerImage: destination.rowsPerImage };
    const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
    activeCommandEncoder.copyTextureToBuffer(sourceParameters, destinationParameters, extents);
  }
  static CopyTextureToTextureV2(source, destination, srcMip, dstMip, size, depth) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToTexture(
      { texture: source.GetBuffer(), mipLevel: srcMip, origin: { x: 0, y: 0, z: 0 } },
      { texture: destination.GetBuffer(), mipLevel: dstMip, origin: { x: 0, y: 0, z: depth ? depth : 0 } },
      extents
    );
  }
  static CopyTextureToTextureV3(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { texture: source.texture.GetBuffer(), mipLevel: source.mipLevel, origin: source.origin };
    const destinationParameters = { texture: destination.texture.GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin };
    const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
    activeCommandEncoder.copyTextureToTexture(sourceParameters, destinationParameters, extents);
  }
  static ClearBuffer(buffer, offset, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.clearBuffer(buffer.GetBuffer(), offset, size);
  }
};

// src/renderer/RendererContext.ts
var RendererContext = class {
  constructor() {
  }
  static BeginRenderPass(name, renderTargets, depthTarget, timestamp = false) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.BeginRenderPass(name, renderTargets, depthTarget, timestamp);
    else throw Error("Unknown render api type.");
  }
  static EndRenderPass() {
    if (Renderer.type === "webgpu") WEBGPURendererContext.EndRenderPass();
    else throw Error("Unknown render api type.");
  }
  static SetViewport(x, y, width, height, minDepth = 0, maxDepth = 1) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.SetViewport(x, y, width, height, minDepth, maxDepth);
    else throw Error("Unknown render api type.");
  }
  static SetScissor(x, y, width, height) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.SetScissor(x, y, width, height);
    else throw Error("Unknown render api type.");
  }
  static DrawGeometry(geometry, shader, instanceCount) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.DrawGeometry(geometry, shader, instanceCount);
    else throw Error("Unknown render api type.");
  }
  static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset = 0) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.DrawIndirect(geometry, shader, indirectBuffer, indirectOffset);
    else throw Error("Unknown render api type.");
  }
  static CopyBufferToBuffer(source, destination, sourceOffset = 0, destinationOffset = 0, size = void 0) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size ? size : source.size);
    else throw Error("Unknown render api type.");
  }
  static CopyBufferToTexture(source, destination, copySize) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyBufferToTexture(source, destination, copySize);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToTexture(source, destination, srcMip = 0, dstMip = 0, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTexture(source, destination, srcMip, dstMip, size);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToBuffer(source, destination, srcMip, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToBuffer(source, destination, srcMip, size);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToBufferV2(source, destination, copySize) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToBufferV2(source, destination, copySize);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToTextureV2(source, destination, srcMip = 0, dstMip = 0, size, depth) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTextureV2(source, destination, srcMip, dstMip, size, depth);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToTextureV3(source, destination, copySize) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTextureV3(source, destination, copySize);
    else throw Error("Unknown render api type.");
  }
  static ClearBuffer(buffer, offset = 0, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.ClearBuffer(buffer, offset, size ? size : buffer.size);
    else throw Error("Unknown render api type.");
  }
};

// src/renderer/webgpu/WEBGPUTextureSampler.ts
var WEBGPUTextureSampler = class {
  id = Utils.UUID();
  params;
  sampler;
  constructor(params) {
    this.params = params;
    const samplerDescriptor = {};
    if (params && params.minFilter) samplerDescriptor.minFilter = params.minFilter;
    if (params && params.magFilter) samplerDescriptor.magFilter = params.magFilter;
    if (params && params.mipmapFilter) samplerDescriptor.mipmapFilter = params.mipmapFilter;
    if (params && params.addressModeU) samplerDescriptor.addressModeU = params.addressModeU;
    if (params && params.addressModeV) samplerDescriptor.addressModeV = params.addressModeV;
    if (params && params.compare) samplerDescriptor.compare = params.compare;
    if (params && params.maxAnisotropy) samplerDescriptor.maxAnisotropy = params.maxAnisotropy;
    this.sampler = WEBGPURenderer.device.createSampler(samplerDescriptor);
  }
  GetBuffer() {
    return this.sampler;
  }
};

// src/renderer/TextureSampler.ts
var defaultSamplerParams = {
  magFilter: "linear",
  minFilter: "linear",
  mipmapFilter: "linear",
  addressModeU: "repeat",
  addressModeV: "repeat",
  compare: void 0,
  maxAnisotropy: 1
};
var TextureSampler = class {
  params;
  static Create(params) {
    const samplerParams = Object.assign({}, defaultSamplerParams, params);
    if (Renderer.type === "webgpu") return new WEBGPUTextureSampler(samplerParams);
    throw Error("Renderer type invalid");
  }
};

// src/renderer/webgpu/utils/WEBGBPUBlit.ts
var i = setInterval(async () => {
  if (Renderer.type === "webgpu") {
    WEBGPUBlit.blitShader = await Shader.Create({
      code: await ShaderLoader.Blit,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        texture: { group: 0, binding: 0, type: "texture" },
        textureSampler: { group: 0, binding: 1, type: "sampler" },
        mip: { group: 0, binding: 2, type: "storage" },
        uv_scale: { group: 0, binding: 3, type: "storage" }
      }
    });
    const textureSampler = TextureSampler.Create();
    WEBGPUBlit.blitShader.SetSampler("textureSampler", textureSampler);
    WEBGPUBlit.blitShader.SetValue("mip", 0);
    clearInterval(i);
  }
}, 100);
var WEBGPUBlit = class {
  static blitShader;
  static blitGeometry;
  static Blit(source, destination, width, height, uv_scale) {
    if (!this.blitShader) throw Error("Blit shader not created");
    if (!this.blitGeometry) this.blitGeometry = Geometry.Plane();
    this.blitShader.SetTexture("texture", source);
    this.blitShader.SetArray("uv_scale", uv_scale.elements);
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) Renderer.BeginRenderFrame();
    RendererContext.BeginRenderPass("Blit", [{ target: destination, clear: true }]);
    RendererContext.SetViewport(0, 0, width, height);
    RendererContext.DrawGeometry(this.blitGeometry, this.blitShader);
    RendererContext.EndRenderPass();
    if (!activeCommandEncoder) Renderer.EndRenderFrame();
  }
};

// src/renderer/Texture.ts
var Texture2 = class {
  id;
  width;
  height;
  depth;
  type;
  dimension;
  SetActiveLayer(layer) {
  }
  GetActiveLayer() {
    throw Error("Base class.");
  }
  SetActiveMip(layer) {
  }
  GetActiveMip() {
    throw Error("Base class.");
  }
  SetActiveMipCount(layer) {
  }
  GetActiveMipCount() {
    throw Error("Base class.");
  }
  GenerateMips() {
  }
  Destroy() {
  }
  SetData(data) {
  }
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 0 /* IMAGE */, "2d", mipLevels);
    throw Error("Renderer type invalid");
  }
  static async Load(url, format = Renderer.SwapChainFormat, flipY = false) {
    const response = await fetch(url);
    const imageBitmap = await createImageBitmap(await response.blob());
    RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4);
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
    throw Error("Renderer type invalid");
  }
  static async LoadImageSource(imageSource, format = Renderer.SwapChainFormat, flipY = false) {
    const imageBitmap = await createImageBitmap(imageSource);
    RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4);
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
    throw Error("Renderer type invalid");
  }
  static async Blit(source, destination, width, height, uv_scale = new Vector2(1, 1)) {
    if (Renderer.type === "webgpu") return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
    throw Error("Renderer type invalid");
  }
};
var DepthTexture = class extends Texture2 {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 1);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d", mipLevels);
    throw Error("Renderer type invalid");
  }
};
var RenderTexture = class extends Texture2 {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 2 /* RENDER_TARGET */, "2d", mipLevels);
    throw Error("Renderer type invalid");
  }
};
var TextureArray = class extends Texture2 {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 0 /* IMAGE */, "2d-array", mipLevels);
    throw Error("Renderer type invalid");
  }
};
var CubeTexture = class extends Texture2 {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 0 /* IMAGE */, "cube", mipLevels);
    throw Error("Renderer type invalid");
  }
};
var DepthTextureArray = class extends Texture2 {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 1);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d-array", mipLevels);
    throw Error("Renderer type invalid");
  }
};

// src/renderer/webgpu/WEBGPUBaseShader.ts
var BindGroupLayoutCache = /* @__PURE__ */ new Map();
var BindGroupCache = /* @__PURE__ */ new Map();
var UniformTypeToWGSL = {
  "uniform": "uniform",
  "storage": "read-only-storage",
  "storage-write": "storage"
};
var WEBGPUBaseShader = class {
  id = Utils.UUID();
  needsUpdate = false;
  module;
  params;
  uniformMap = /* @__PURE__ */ new Map();
  valueArray = new Float32Array(1);
  _pipeline = null;
  _bindGroups = [];
  _bindGroupsInfo = [];
  get pipeline() {
    return this._pipeline;
  }
  get bindGroups() {
    return this._bindGroups;
  }
  get bindGroupsInfo() {
    return this._bindGroupsInfo;
  }
  bindGroupLayouts = [];
  constructor(params) {
    const code = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
    this.params = params;
    this.module = WEBGPURenderer.device.createShaderModule({ code });
    if (this.params.uniforms) {
      this.uniformMap = new Map(Object.entries(this.params.uniforms));
    }
  }
  // TODO: This needs cleaning
  BuildBindGroupLayouts() {
    const bindGroupsLayoutEntries = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!bindGroupsLayoutEntries[uniform.group]) bindGroupsLayoutEntries[uniform.group] = [];
      const layoutEntries = bindGroupsLayoutEntries[uniform.group];
      if (uniform.buffer instanceof WEBGPUBuffer) {
        const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        layoutEntries.push({ binding: uniform.binding, visibility, buffer: { type: UniformTypeToWGSL[uniform.type] } });
      } else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
        const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        layoutEntries.push({
          binding: uniform.binding,
          visibility,
          buffer: {
            type: UniformTypeToWGSL[uniform.type],
            hasDynamicOffset: true,
            minBindingSize: uniform.buffer.minBindingSize
          }
        });
      } else if (uniform.buffer instanceof WEBGPUTexture) {
        let sampleType = uniform.type === "depthTexture" ? "depth" : "float";
        if (uniform.buffer.format.includes("32float")) sampleType = "unfilterable-float";
        else if (uniform.buffer.format.includes("32uint")) sampleType = "uint";
        else if (uniform.buffer.format.includes("32int")) sampleType = "sint";
        if (uniform.buffer.type === 3 /* RENDER_TARGET_STORAGE */) {
          layoutEntries.push({
            binding: uniform.binding,
            visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
            storageTexture: {
              format: uniform.buffer.format,
              viewDimension: uniform.buffer.dimension,
              access: "read-write"
            }
          });
        } else {
          layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: { sampleType, viewDimension: uniform.buffer.dimension } });
        }
      } else if (uniform.buffer instanceof WEBGPUTextureSampler) {
        let type = void 0;
        if (uniform.type === "sampler") type = "filtering";
        else if (uniform.type === "sampler-compare") type = "comparison";
        else if (uniform.type === "sampler-non-filterable") type = "non-filtering";
        layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, sampler: { type } });
      }
    }
    let bindGroupLayouts = [];
    for (const bindGroupsLayoutEntry of bindGroupsLayoutEntries) {
      const crc = JSON.stringify(bindGroupsLayoutEntry);
      let bindGroupLayout = BindGroupLayoutCache.get(crc);
      if (bindGroupLayout === void 0) {
        bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({ entries: bindGroupsLayoutEntry });
        BindGroupLayoutCache.set(crc, bindGroupLayout);
        RendererDebug.IncrementBindGroupLayouts(1);
      }
      bindGroupLayout.label = crc;
      bindGroupLayouts.push(bindGroupLayout);
    }
    return bindGroupLayouts;
  }
  BuildBindGroupsCRC() {
    const crcs = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!crcs[uniform.group]) crcs[uniform.group] = "";
      if (uniform.buffer) {
        crcs[uniform.group] += `${uniform.buffer.id},`;
      }
    }
    return crcs;
  }
  BuildBindGroups() {
    const bindGroupsInfo = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!bindGroupsInfo[uniform.group]) bindGroupsInfo[uniform.group] = { entries: [], buffers: [] };
      const group = bindGroupsInfo[uniform.group];
      if (uniform.buffer instanceof WEBGPUBuffer) {
        group.entries.push({ binding: uniform.binding, resource: { buffer: uniform.buffer.GetBuffer() } });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
        group.entries.push({
          binding: uniform.binding,
          resource: {
            buffer: uniform.buffer.GetBuffer(),
            offset: 0,
            size: uniform.buffer.minBindingSize
          }
        });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUTexture) {
        const view = {
          dimension: uniform.buffer.dimension,
          arrayLayerCount: uniform.buffer.dimension != "3d" ? uniform.buffer.GetBuffer().depthOrArrayLayers : 1,
          // arrayLayerCount: uniform.buffer.GetBuffer().depthOrArrayLayers,
          baseArrayLayer: 0,
          baseMipLevel: uniform.textureMip,
          mipLevelCount: uniform.activeMipCount
        };
        group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer().createView(view) });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUTextureSampler) {
        group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer() });
        group.buffers.push(uniform.buffer);
      }
    }
    this._bindGroupsInfo = bindGroupsInfo;
    let bindGroupsCRC = this.BuildBindGroupsCRC();
    let bindGroups = [];
    for (let i2 = 0; i2 < bindGroupsInfo.length; i2++) {
      const crc = bindGroupsCRC[i2];
      const bindGroupInfo = bindGroupsInfo[i2];
      const bindGroupLayout = this.bindGroupLayouts[i2];
      let bindGroup = BindGroupCache.get(crc);
      if (bindGroup === void 0) {
        bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
        RendererDebug.IncrementBindGroups(1);
        BindGroupCache.set(crc, bindGroup);
      }
      bindGroups.push(bindGroup);
    }
    return bindGroups;
  }
  GetValidUniform(name) {
    const uniform = this.uniformMap.get(name);
    if (!uniform) throw Error(`Shader does not have a parameter named ${name}`);
    return uniform;
  }
  SetUniformDataFromArray(name, data, dataOffset, bufferOffset = 0, size) {
    const uniform = this.GetValidUniform(name);
    if (!uniform.buffer) {
      let type = 0 /* STORAGE */;
      if (uniform.type === "uniform") type = 2 /* UNIFORM */;
      uniform.buffer = Buffer3.Create(data.byteLength, type);
      this.needsUpdate = true;
    }
    WEBGPURenderer.device.queue.writeBuffer(uniform.buffer.GetBuffer(), bufferOffset, data, dataOffset, size);
  }
  SetUniformDataFromBuffer(name, data) {
    if (!data) throw Error(`Invalid buffer ${name}`);
    const binding = this.GetValidUniform(name);
    if (!binding.buffer || binding.buffer.GetBuffer() !== data.GetBuffer()) {
      binding.buffer = data;
      this.needsUpdate = true;
    }
    if (data instanceof WEBGPUTexture) {
      binding.textureDimension = data.GetActiveLayer();
      binding.textureMip = data.GetActiveMip();
      binding.activeMipCount = data.GetActiveMipCount();
    }
  }
  SetArray(name, array, bufferOffset = 0, dataOffset, size) {
    this.SetUniformDataFromArray(name, array, bufferOffset, dataOffset, size);
  }
  SetValue(name, value) {
    this.valueArray[0] = value;
    this.SetUniformDataFromArray(name, this.valueArray);
  }
  SetMatrix4(name, matrix) {
    this.SetUniformDataFromArray(name, matrix.elements);
  }
  SetVector2(name, vector) {
    this.SetUniformDataFromArray(name, vector.elements);
  }
  SetVector3(name, vector) {
    this.SetUniformDataFromArray(name, vector.elements);
  }
  SetVector4(name, vector) {
    this.SetUniformDataFromArray(name, vector.elements);
  }
  SetTexture(name, texture) {
    this.SetUniformDataFromBuffer(name, texture);
  }
  SetSampler(name, sampler) {
    this.SetUniformDataFromBuffer(name, sampler);
  }
  SetBuffer(name, buffer) {
    this.SetUniformDataFromBuffer(name, buffer);
  }
  HasBuffer(name) {
    return this.uniformMap.get(name)?.buffer ? true : false;
  }
  Compile() {
  }
  OnPreRender() {
    return true;
  }
};

// src/renderer/webgpu/WEBGPUComputeShader.ts
var WEBGPUComputeShader = class extends WEBGPUBaseShader {
  computeEntrypoint;
  _pipeline = null;
  get pipeline() {
    return this._pipeline;
  }
  constructor(params) {
    super(params);
    this.params = params;
    this.computeEntrypoint = params.computeEntrypoint;
  }
  Compile() {
    if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
      return;
    }
    console.log("%c Compiling shader", "color: #ff0000");
    this.bindGroupLayouts = this.BuildBindGroupLayouts();
    this._bindGroups = this.BuildBindGroups();
    let pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
      bindGroupLayouts: this.bindGroupLayouts
    });
    const pipelineDescriptor = {
      layout: pipelineLayout,
      compute: { module: this.module, entryPoint: this.computeEntrypoint }
    };
    this._pipeline = WEBGPURenderer.device.createComputePipeline(pipelineDescriptor);
    this.needsUpdate = false;
  }
};

// src/renderer/webgpu/WEBGPUShader.ts
var pipelineLayoutCache = /* @__PURE__ */ new Map();
var pipelineCache = /* @__PURE__ */ new Map();
var WGSLShaderAttributeFormat = {
  vec2: "float32x2",
  vec3: "float32x3",
  vec4: "float32x4"
};
var WEBGPUShader = class extends WEBGPUBaseShader {
  vertexEntrypoint;
  fragmentEntrypoint;
  attributeMap = /* @__PURE__ */ new Map();
  _pipeline = null;
  get pipeline() {
    return this._pipeline;
  }
  constructor(params) {
    super(params);
    this.params = params;
    this.vertexEntrypoint = this.params.vertexEntrypoint;
    this.fragmentEntrypoint = this.params.fragmentEntrypoint;
    if (this.params.attributes) this.attributeMap = new Map(Object.entries(this.params.attributes));
  }
  // TODO: This needs cleaning
  Compile() {
    if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
      return;
    }
    let hasCompiled = false;
    this.bindGroupLayouts = this.BuildBindGroupLayouts();
    this._bindGroups = this.BuildBindGroups();
    let bindGroupLayoutsCRC = "";
    for (const b of this.bindGroupLayouts) bindGroupLayoutsCRC += b.label;
    let pipelineLayout = pipelineLayoutCache.get(bindGroupLayoutsCRC);
    if (pipelineLayout === void 0) {
      pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
        bindGroupLayouts: this.bindGroupLayouts
      });
      pipelineLayout.label = Utils.UUID();
      pipelineLayoutCache.set(bindGroupLayoutsCRC, pipelineLayout);
      hasCompiled = true;
    }
    let targets = [];
    for (const output of this.params.colorOutputs) targets.push({
      format: output.format
      // blend: {
      //     color: {
      //       srcFactor: 'one',
      //       dstFactor: 'one-minus-src-alpha',
      //       operation: 'add',
      //     },
      //     alpha: {
      //       srcFactor: 'one',
      //       dstFactor: 'one-minus-src-alpha',
      //       operation: 'add',
      //     },
      // }
    });
    const pipelineDescriptor = {
      layout: pipelineLayout,
      vertex: { module: this.module, entryPoint: this.vertexEntrypoint, buffers: [] },
      fragment: { module: this.module, entryPoint: this.fragmentEntrypoint, targets },
      primitive: {
        topology: this.params.topology ? this.params.topology : "triangle-list",
        frontFace: this.params.frontFace ? this.params.frontFace : "ccw",
        cullMode: this.params.cullMode ? this.params.cullMode : "back"
      }
    };
    if (this.params.depthOutput) {
      pipelineDescriptor.depthStencil = {
        depthWriteEnabled: this.params.depthWriteEnabled !== void 0 ? this.params.depthWriteEnabled : true,
        depthCompare: this.params.depthCompare ? this.params.depthCompare : "less",
        depthBias: this.params.depthBias ? this.params.depthBias : void 0,
        depthBiasSlopeScale: this.params.depthBiasSlopeScale ? this.params.depthBiasSlopeScale : void 0,
        depthBiasClamp: this.params.depthBiasClamp ? this.params.depthBiasClamp : void 0,
        format: this.params.depthOutput
      };
    }
    const buffers = [];
    for (const [_, attribute] of this.attributeMap) {
      buffers.push({ arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] });
    }
    pipelineDescriptor.vertex.buffers = buffers;
    pipelineDescriptor.label += "," + pipelineLayout.label;
    const pipelineDescriptorKey = JSON.stringify(pipelineDescriptor);
    let pipeline = pipelineCache.get(pipelineDescriptorKey);
    if (!pipeline) {
      pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
      pipelineCache.set(pipelineDescriptorKey, pipeline);
      hasCompiled = true;
    }
    this._pipeline = pipeline;
    if (hasCompiled === true) {
      console.warn("%c Compiling shader", "color: #3498db");
      RendererDebug.IncrementShaderCompiles(1);
    }
    this.needsUpdate = false;
  }
  GetAttributeSlot(name) {
    return this.attributeMap.get(name)?.location;
  }
};

// src/renderer/Shader.ts
var BaseShader = class {
  id;
  params;
  constructor() {
  }
  SetValue(name, value) {
  }
  SetMatrix4(name, matrix) {
  }
  SetVector2(name, vector) {
  }
  SetVector3(name, vector) {
  }
  SetVector4(name, vector) {
  }
  SetArray(name, array, bufferOffset, dataOffset, size) {
  }
  SetTexture(name, texture) {
  }
  SetSampler(name, texture) {
  }
  SetBuffer(name, buffer) {
  }
  HasBuffer(name) {
    return false;
  }
  OnPreRender(geometry) {
    return true;
  }
};
var Shader = class extends BaseShader {
  static async Create(params) {
    params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
    if (Renderer.type === "webgpu") return new WEBGPUShader(params);
    throw Error("Unknown api");
  }
};
var Compute = class extends BaseShader {
  static async Create(params) {
    params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
    if (Renderer.type === "webgpu") return new WEBGPUComputeShader(params);
    throw Error("Unknown api");
  }
};

// src/components/Light.ts
var LightEvents = class {
  static Updated = (light) => {
  };
};
var Light = class extends Component {
  camera;
  color = new Color(1, 1, 1);
  intensity = 1;
  range = 1e3;
  castShadows = true;
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(LightEvents.Updated, this);
    });
  }
};
var SpotLight = class extends Light {
  direction = new Vector3(0, -1, 0);
  angle = 1;
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1e3);
  }
};
var PointLight = class extends Light {
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
  }
};
var AreaLight = class extends Light {
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
  }
};
var DirectionalLight = class extends Light {
  direction = new Vector3(0, 1, 0);
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    const size = 1;
    this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
  }
};

// src/utils/MemoryAllocator.ts
var MemoryAllocator = class {
  memorySize;
  availableMemorySize;
  freeBlocks = [];
  usedBlocks = [];
  constructor(memorySize) {
    this.memorySize = memorySize;
    this.availableMemorySize = memorySize;
    this.freeBlocks.push({ offset: 0, size: memorySize });
  }
  allocate(size) {
    for (let i2 = 0; i2 < this.freeBlocks.length; i2++) {
      const block = this.freeBlocks[i2];
      if (block.size >= size) {
        const offset = block.offset;
        block.offset += size;
        block.size -= size;
        this.availableMemorySize -= size;
        if (block.size === 0) {
          this.freeBlocks.splice(i2, 1);
        }
        this.usedBlocks.push({ offset, size });
        return offset;
      }
    }
    throw Error("Not enough space.");
  }
  mergeFreeBlocks() {
    this.freeBlocks.sort((a, b) => a.offset - b.offset);
    for (let i2 = 0; i2 < this.freeBlocks.length - 1; ) {
      const currentBlock = this.freeBlocks[i2];
      const nextBlock = this.freeBlocks[i2 + 1];
      if (currentBlock.offset + currentBlock.size === nextBlock.offset) {
        currentBlock.size += nextBlock.size;
        this.freeBlocks.splice(i2 + 1, 1);
      } else {
        i2++;
      }
    }
  }
  free(offset) {
    for (let i2 = 0; i2 < this.usedBlocks.length; i2++) {
      const block = this.usedBlocks[i2];
      if (block.offset === offset) {
        this.usedBlocks.splice(i2, 1);
        this.freeBlocks.push(block);
        this.mergeFreeBlocks();
        this.availableMemorySize += block.size;
        return;
      }
    }
    throw new Error(`No allocated block found at offset ${offset}`);
  }
};
var BufferMemoryAllocator = class _BufferMemoryAllocator {
  allocator;
  buffer;
  links;
  static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
  constructor(size) {
    this.allocator = new MemoryAllocator(size);
    this.buffer = Buffer3.Create(size * _BufferMemoryAllocator.BYTES_PER_ELEMENT, 0 /* STORAGE */);
    this.links = /* @__PURE__ */ new Map();
  }
  has(link) {
    return this.links.has(link);
  }
  set(link, data) {
    let bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) {
      bufferOffset = this.allocator.allocate(data.length);
      this.links.set(link, bufferOffset);
    }
    this.buffer.SetArray(data, bufferOffset * _BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
    return bufferOffset;
  }
  delete(link) {
    const bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) throw Error("Link not found");
    this.allocator.free(bufferOffset);
    this.links.delete(link);
  }
  getBuffer() {
    return this.buffer;
  }
  getAllocator() {
    return this.allocator;
  }
};
var DynamicBufferMemoryAllocator = class extends BufferMemoryAllocator {
  incrementAmount;
  constructor(size, incrementAmount) {
    super(size);
    this.incrementAmount = incrementAmount ? incrementAmount : size;
  }
  set(link, data) {
    let bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) {
      if (this.allocator.availableMemorySize - data.length < 0) {
        const o = this.allocator.memorySize;
        const incrementAmount = this.incrementAmount > data.length ? this.incrementAmount : data.length;
        const oldMemorySize = this.allocator.memorySize - this.allocator.availableMemorySize;
        this.allocator.memorySize += incrementAmount;
        this.allocator.availableMemorySize += incrementAmount;
        this.allocator.freeBlocks.push({ offset: oldMemorySize, size: incrementAmount });
        console.log(`Incrementing DynamicBuffer from ${o} to ${this.allocator.memorySize}`);
        const buffer = Buffer3.Create(this.allocator.memorySize * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0 /* STORAGE */);
        const hasActiveFrame = Renderer.HasActiveFrame();
        if (!hasActiveFrame) Renderer.BeginRenderFrame();
        RendererContext.CopyBufferToBuffer(this.buffer, buffer);
        if (!hasActiveFrame) Renderer.EndRenderFrame();
        const oldBuffer = this.buffer;
        Renderer.OnFrameCompleted().then(() => {
          oldBuffer.Destroy();
        });
        this.buffer = buffer;
      }
      bufferOffset = this.allocator.allocate(data.length);
      this.links.set(link, bufferOffset);
    }
    this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
    return bufferOffset;
  }
  delete(link) {
    const bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) throw Error("Link not found");
    this.allocator.free(bufferOffset);
    this.links.delete(link);
  }
};

// src/renderer/passes/DeferredLightingPass.ts
var DeferredLightingPass = class extends RenderPass {
  name = "DeferredLightingPass";
  shader;
  sampler;
  quadGeometry;
  lightsBuffer;
  lightsCountBuffer;
  outputLightingPass;
  needsUpdate = true;
  initialized = false;
  dummyShadowPassDepth;
  constructor() {
    super({
      inputs: [
        PassParams.DebugSettings,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth,
        PassParams.ShadowPassDepth,
        PassParams.ShadowPassCascadeData
      ],
      outputs: [PassParams.LightingPassOutput]
    });
  }
  async init() {
    this.shader = await Shader.Create({
      code: await ShaderLoader.DeferredLighting,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        albedoTexture: { group: 0, binding: 1, type: "texture" },
        normalTexture: { group: 0, binding: 2, type: "texture" },
        ermoTexture: { group: 0, binding: 3, type: "texture" },
        depthTexture: { group: 0, binding: 4, type: "depthTexture" },
        shadowPassDepth: { group: 0, binding: 5, type: "depthTexture" },
        skyboxTexture: { group: 0, binding: 6, type: "texture" },
        lights: { group: 0, binding: 7, type: "storage" },
        lightCount: { group: 0, binding: 8, type: "storage" },
        view: { group: 0, binding: 9, type: "storage" },
        shadowSamplerComp: { group: 0, binding: 10, type: "sampler-compare" },
        settings: { group: 0, binding: 11, type: "storage" }
      },
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.sampler = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    this.shader.SetSampler("textureSampler", this.sampler);
    const shadowSamplerComp = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", compare: "less" });
    this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);
    this.quadGeometry = Geometry.Plane();
    this.lightsBuffer = new DynamicBufferMemoryAllocator(132 * 10);
    this.lightsCountBuffer = Buffer3.Create(1 * 4, 0 /* STORAGE */);
    this.shader.SetBuffer("lights", this.lightsBuffer.getBuffer());
    this.shader.SetBuffer("lightCount", this.lightsCountBuffer);
    this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.dummyShadowPassDepth = DepthTextureArray.Create(1, 1, 1);
    EventSystem.on(LightEvents.Updated, (component) => {
      this.needsUpdate = true;
    });
    this.initialized = true;
  }
  updateLightsBuffer(resources) {
    const scene = Camera.mainCamera.gameObject.scene;
    const lights = [...scene.GetComponents(Light), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(SpotLight), ...scene.GetComponents(AreaLight)];
    for (let i2 = 0; i2 < lights.length; i2++) {
      const light = lights[i2];
      const params1 = new Float32Array([light.intensity, light.range, +light.castShadows, -1]);
      const params2 = new Float32Array(4);
      if (light instanceof DirectionalLight) {
        params2.set(light.direction.elements);
      } else if (light instanceof SpotLight) {
        params2.set(light.direction.elements);
        params2.set([light.angle], 3);
      }
      let lightType = 0 /* SPOT_LIGHT */;
      if (light instanceof SpotLight) lightType = 0 /* SPOT_LIGHT */;
      else if (light instanceof DirectionalLight) lightType = 1 /* DIRECTIONAL_LIGHT */;
      else if (light instanceof PointLight) lightType = 2 /* POINT_LIGHT */;
      else if (light instanceof AreaLight) lightType = 3 /* AREA_LIGHT */;
      let projectionMatrices = new Float32Array(16 * 4);
      let cascadeSplits = new Float32Array(4);
      const lightsShadowData = resources.getResource(PassParams.ShadowPassCascadeData);
      const lightShadowData = lightsShadowData ? lightsShadowData.get(light.id) : void 0;
      if (lightShadowData !== void 0) {
        projectionMatrices = lightShadowData.projectionMatrices;
        cascadeSplits = lightShadowData.cascadeSplits;
        params1[3] = lightShadowData.shadowMapIndex;
      }
      const lightData = new Float32Array([
        light.transform.position.x,
        light.transform.position.y,
        light.transform.position.z,
        1,
        ...light.camera.projectionMatrix.elements,
        // ...lightsCSMProjectionMatrix[i].slice(0, 16 * 4),
        ...projectionMatrices,
        ...cascadeSplits,
        ...light.camera.viewMatrix.elements,
        ...light.camera.viewMatrix.clone().invert().elements,
        light.color.r,
        light.color.g,
        light.color.b,
        lightType,
        ...params1,
        ...params2
      ]);
      this.lightsBuffer.set(light.id, lightData);
    }
    this.lightsCountBuffer.SetArray(new Uint32Array([lights.length]));
    this.shader.SetBuffer("lights", this.lightsBuffer.getBuffer());
    this.needsUpdate = false;
  }
  execute(resources) {
    if (!this.initialized) return;
    const camera = Camera.mainCamera;
    if (this.needsUpdate) {
    }
    this.updateLightsBuffer(resources);
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    const inputShadowPassDepth = resources.getResource(PassParams.ShadowPassDepth) || this.dummyShadowPassDepth;
    const inputSkybox = resources.getResource(PassParams.Skybox);
    RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: true }], void 0, true);
    this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
    this.shader.SetTexture("normalTexture", inputGBufferNormal);
    this.shader.SetTexture("ermoTexture", inputGbufferERMO);
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);
    this.shader.SetTexture("skyboxTexture", inputSkybox);
    const view = new Float32Array(4 + 4 + 16 + 16 + 16);
    view.set([Renderer.width, Renderer.height, 0], 0);
    view.set(camera.transform.position.elements, 4);
    const tempMatrix = new Matrix4();
    tempMatrix.copy(camera.projectionMatrix).invert();
    view.set(tempMatrix.elements, 8);
    tempMatrix.copy(camera.viewMatrix).invert();
    view.set(tempMatrix.elements, 24);
    view.set(camera.viewMatrix.elements, 40);
    this.shader.SetArray("view", view);
    const settings = resources.getResource(PassParams.DebugSettings);
    this.shader.SetArray("settings", settings);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.LightingPassOutput, this.outputLightingPass);
  }
};

// src/renderer/passes/TextureViewer.ts
var TextureViewer = class extends RenderPass {
  name = "TextureViewer";
  shader;
  quadGeometry;
  constructor() {
    super({ inputs: [
      PassParams.LightingPassOutput,
      PassParams.depthTexturePyramid
    ] });
  }
  async init() {
    const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<f32>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        fn Tonemap_ACES(x: vec3f) -> vec3f {
            // Narkowicz 2015, "ACES Filmic Tone Mapping Curve"
            let a = 2.51;
            let b = 0.03;
            let c = 2.43;
            let d = 0.59;
            let e = 0.14;
            return (x * (a * x + b)) / (x * (c * x + d) + e);
        }
        
        fn OECF_sRGBFast(linear: vec3f) -> vec3f {
            return pow(linear, vec3(0.454545));
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            var color = textureSampleLevel(texture, textureSampler, uv, 0).rgb;
            // TODO: This is a post processing filter, it shouldn't be here
            color = Tonemap_ACES(color);
            color = OECF_sRGBFast(color);

            return vec4f(color, 1.0);
        }
        `;
    this.shader = await Shader.Create({
      code,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        uv: { location: 1, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        texture: { group: 0, binding: 1, type: "texture" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    const sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", sampler);
    this.initialized = true;
  }
  execute(resources) {
    if (this.initialized === false) return;
    const settings = resources.getResource(PassParams.DebugSettings);
    const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
    if (!LightingPassOutputTexture) return;
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass("TextureViewer", [{ clear: false }], void 0, true);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
  }
};

// src/components/Mesh.ts
var Mesh = class extends Component {
  geometry;
  materialsMapped = /* @__PURE__ */ new Map();
  enableShadows = true;
  Start() {
  }
  AddMaterial(material) {
    if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
    this.materialsMapped.get(material.constructor.name)?.push(material);
  }
  GetMaterials(type) {
    if (!type) return Array.from(this.materialsMapped, ([name, value]) => value).flat(Infinity);
    return this.materialsMapped.get(type.name) || [];
  }
  SetGeometry(geometry) {
    this.geometry = geometry;
  }
  GetGeometry() {
    return this.geometry;
  }
};

// src/components/InstancedMesh.ts
var InstancedMesh = class extends Mesh {
  incrementInstanceCount = 1e3;
  _matricesBuffer = new DynamicBufferMemoryAllocator(this.incrementInstanceCount * 16);
  get matricesBuffer() {
    return this._matricesBuffer.getBuffer();
  }
  _instanceCount = 0;
  get instanceCount() {
    return this._instanceCount;
  }
  SetMatrixAt(index, matrix) {
    if (!this._matricesBuffer) throw Error("Matrices buffer not created.");
    this._instanceCount = Math.max(index, this._instanceCount);
    this._matricesBuffer.set(index, matrix.elements);
  }
};

// src/renderer/passes/DeferredShadowMapPass.ts
var _DeferredShadowMapPassDebug = class {
  shadowsFolder;
  shadowsUpdate;
  shadowsRoundToPixelSize;
  debugCascades;
  pcfResolution;
  blendThreshold;
  viewBlendThreshold;
  shadowsUpdateValue = true;
  roundToPixelSizeValue = true;
  debugCascadesValue = false;
  pcfResolutionValue = 1;
  blendThresholdValue = 0.3;
  viewBlendThresholdValue = false;
  constructor() {
    this.shadowsFolder = new UIFolder(Debugger.ui, "CSM Shadows");
    this.shadowsUpdate = new UIButtonStat(this.shadowsFolder, "Update shadows", (value) => {
      this.shadowsUpdateValue = value;
    }, this.shadowsUpdateValue);
    this.shadowsRoundToPixelSize = new UIButtonStat(this.shadowsFolder, "RoundToPixelSize", (value) => {
      this.roundToPixelSizeValue = value;
    }, this.roundToPixelSizeValue);
    this.debugCascades = new UIButtonStat(this.shadowsFolder, "Debug cascades", (value) => {
      this.debugCascadesValue = value;
    }, this.debugCascadesValue);
    this.pcfResolution = new UISliderStat(this.shadowsFolder, "PCF resolution", 0, 7, 1, this.pcfResolutionValue, (value) => {
      this.pcfResolutionValue = value;
    });
    this.blendThreshold = new UISliderStat(this.shadowsFolder, "Blend threshold", 0, 1, 0.01, this.blendThresholdValue, (value) => {
      this.blendThresholdValue = value;
    });
    this.viewBlendThreshold = new UIButtonStat(this.shadowsFolder, "View blend threshold", (value) => {
      this.viewBlendThresholdValue = value;
    }, this.viewBlendThresholdValue);
    this.shadowsFolder.Open();
  }
};
var DeferredShadowMapPassDebug = new _DeferredShadowMapPassDebug();

// src/renderer/passes/PrepareGBuffers.ts
var PrepareGBuffers = class extends RenderPass {
  name = "PrepareGBuffers";
  gBufferAlbedoRT;
  gBufferNormalRT;
  gBufferERMORT;
  depthTexture;
  depthTextureClone;
  // So it can be used on the same pass
  gBufferAlbedoRTClone;
  skybox;
  constructor() {
    super({ outputs: [
      PassParams.depthTexture,
      PassParams.GBufferAlbedo,
      PassParams.GBufferNormal,
      PassParams.GBufferERMO,
      PassParams.GBufferDepth
    ] });
  }
  async init(resources) {
    this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);
    this.depthTextureClone = DepthTexture.Create(Renderer.width, Renderer.height);
    this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferAlbedoRTClone = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.skybox = CubeTexture.Create(1, 1, 6);
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const colorTargets = [
      { target: this.gBufferAlbedoRT, clear: true },
      { target: this.gBufferNormalRT, clear: true },
      { target: this.gBufferERMORT, clear: true }
    ];
    RendererContext.CopyTextureToTexture(this.gBufferAlbedoRT, this.gBufferAlbedoRTClone);
    RendererContext.CopyTextureToTexture(this.depthTexture, this.depthTextureClone);
    RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, { target: this.depthTexture, clear: true }, true);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.depthTexture, this.depthTexture);
    resources.setResource(PassParams.GBufferDepth, this.depthTexture);
    resources.setResource(PassParams.GBufferDepthClone, this.depthTextureClone);
    resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
    resources.setResource(PassParams.GBufferAlbedoClone, this.gBufferAlbedoRTClone);
    resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
    resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);
    resources.setResource(PassParams.Skybox, this.skybox);
    const settings = new Float32Array([
      0,
      // +Debugger.isDebugDepthPassEnabled,
      0,
      // Debugger.debugDepthMipLevel,
      0,
      //Debugger.debugDepthExposure,
      RendererDebug.viewTypeValue,
      +RendererDebug.useHeightMapValue,
      0,
      //Debugger.heightScale,
      +DeferredShadowMapPassDebug.debugCascadesValue,
      DeferredShadowMapPassDebug.pcfResolutionValue,
      DeferredShadowMapPassDebug.blendThresholdValue,
      +DeferredShadowMapPassDebug.viewBlendThresholdValue,
      ...Camera.mainCamera.transform.position.elements,
      0,
      0,
      0
    ]);
    resources.setResource(PassParams.DebugSettings, settings);
  }
};

// src/renderer/passes/DebuggerTextureViewer.ts
var DebuggerTextureViewer = class extends RenderPass {
  name = "DebuggerTextureViewer";
  shader;
  quadGeometry;
  constructor() {
    super({ inputs: [
      PassParams.ShadowPassDepth
    ] });
  }
  async init() {
    const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        // @group(0) @binding(1) var texture: texture_2d<f32>;
        @group(0) @binding(1) var texture: texture_depth_2d_array;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;
                //    textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);
            var d = textureSampleLevel(texture, textureSampler, uv, 0, 0);
            return vec4(vec3(d), 1.0);
        }
        `;
    this.shader = await Shader.Create({
      code,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        uv: { location: 1, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        texture: { group: 0, binding: 1, type: "depthTexture" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    const sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", sampler);
    this.initialized = true;
  }
  execute(resources) {
    if (this.initialized === false) return;
    const LightingPassOutputTexture = resources.getResource(PassParams.ShadowPassDepth);
    if (!LightingPassOutputTexture) return;
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass("DebuggerTextureViewer", [{ clear: false }], void 0, true);
    RendererContext.SetViewport(Renderer.width - 100, 0, 100, 100);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.SetViewport(0, 0, Renderer.width, Renderer.height);
    RendererContext.EndRenderPass();
  }
};

// src/renderer/RenderingPipeline.ts
var PassParams = {
  DebugSettings: "DebugSettings",
  MainCamera: "MainCamera",
  depthTexture: "depthTexture",
  depthTexturePyramid: "depthTexturePyramid",
  GBufferAlbedo: "GBufferAlbedo",
  GBufferAlbedoClone: "GBufferAlbedoClone",
  GBufferNormal: "GBufferNormal",
  GBufferERMO: "GBufferERMO",
  GBufferDepth: "GBufferDepth",
  GBufferDepthClone: "GBufferDepthClone",
  Skybox: "Skybox",
  ShadowPassDepth: "ShadowPassDepth",
  ShadowPassCascadeData: "ShadowPassCascadeData",
  LightingPassOutput: "LightingPassOutput"
};
var RenderingPipeline = class {
  renderer;
  renderGraph;
  frame = 0;
  previousTime = 0;
  beforeGBufferPasses = [];
  afterGBufferPasses = [];
  beforeLightingPasses = [];
  afterLightingPasses = [];
  beforeScreenOutputPasses = [];
  prepareGBuffersPass;
  get skybox() {
    return this.prepareGBuffersPass.skybox;
  }
  set skybox(skybox) {
    this.prepareGBuffersPass.skybox = skybox;
  }
  constructor(renderer) {
    this.renderer = renderer;
    this.prepareGBuffersPass = new PrepareGBuffers();
    this.renderGraph = new RenderGraph();
    this.beforeGBufferPasses = [
      this.prepareGBuffersPass
      // new DeferredGBufferPass(),
    ];
    this.afterGBufferPasses = [
      // new DeferredShadowMapPass(),
    ];
    this.beforeLightingPasses = [
      new DeferredLightingPass()
    ];
    this.afterLightingPasses = [];
    this.beforeScreenOutputPasses = [
      new TextureViewer(),
      new DebuggerTextureViewer()
    ];
    this.UpdateRenderGraphPasses();
  }
  UpdateRenderGraphPasses() {
    this.renderGraph.passes = [];
    this.renderGraph.passes.push(
      ...this.beforeGBufferPasses,
      ...this.afterGBufferPasses,
      ...this.beforeLightingPasses,
      ...this.afterLightingPasses,
      ...this.beforeScreenOutputPasses
    );
    this.renderGraph.init();
  }
  AddPass(pass, order) {
    if (order === 0 /* BeforeGBuffer */) this.beforeGBufferPasses.push(pass);
    else if (order === 1 /* AfterGBuffer */) this.afterGBufferPasses.push(pass);
    else if (order === 2 /* BeforeLighting */) this.beforeLightingPasses.push(pass);
    else if (order === 3 /* AfterLighting */) this.afterLightingPasses.push(pass);
    else if (order === 4 /* BeforeScreenOutput */) this.beforeScreenOutputPasses.push(pass);
    this.UpdateRenderGraphPasses();
  }
  Render(scene) {
    RendererDebug.ResetFrame();
    RendererDebug.SetTriangleCount(0);
    const renderPipelineStart = performance.now();
    Renderer.BeginRenderFrame();
    this.renderGraph.execute();
    Renderer.EndRenderFrame();
    RendererDebug.SetCPUTime(performance.now() - renderPipelineStart);
    WEBGPUTimestampQuery.GetResult().then((frameTimes) => {
      if (frameTimes) {
        for (const [name, time] of frameTimes) {
          RendererDebug.SetPassTime(name, time);
        }
      }
    });
    const currentTime = performance.now();
    const elapsed = currentTime - this.previousTime;
    this.previousTime = currentTime;
    RendererDebug.SetFPS(1 / elapsed * 1e3);
    this.frame++;
  }
};

// src/Scene.ts
var Scene = class {
  renderer;
  name = "Default scene";
  id = Utils.UUID();
  _hasStarted = false;
  get hasStarted() {
    return this._hasStarted;
  }
  gameObjects = [];
  toUpdate = /* @__PURE__ */ new Map();
  componentsByType = /* @__PURE__ */ new Map();
  renderPipeline;
  constructor(renderer) {
    this.renderer = renderer;
    this.renderPipeline = new RenderingPipeline(this.renderer);
    EventSystem.on(ComponentEvents.CallUpdate, (component, flag) => {
      if (flag) this.toUpdate.set(component, true);
      else this.toUpdate.delete(component);
    });
    EventSystem.on(ComponentEvents.AddedComponent, (component, scene) => {
      if (scene !== this) return;
      let componentsArray = this.componentsByType.get(component.name) || [];
      componentsArray.push(component);
      this.componentsByType.set(component.name, componentsArray);
    });
    EventSystem.on(ComponentEvents.RemovedComponent, (component, scene) => {
      let componentsArray = this.componentsByType.get(component.name);
      if (componentsArray) {
        const index = componentsArray.indexOf(component);
        if (index !== -1) {
          componentsArray.splice(index, 1);
          this.componentsByType.set(component.name, componentsArray);
        }
      }
    });
  }
  AddGameObject(gameObject) {
    this.gameObjects.push(gameObject);
  }
  GetGameObjects() {
    return this.gameObjects;
  }
  GetComponents(type) {
    return this.componentsByType.get(type.name) || [];
  }
  RemoveGameObject(gameObject) {
    const index = this.gameObjects.indexOf(gameObject);
    if (index !== -1) this.gameObjects.splice(index, 1);
  }
  Start() {
    if (this.hasStarted) return;
    for (const gameObject of this.gameObjects) gameObject.Start();
    this._hasStarted = true;
    this.Tick();
  }
  Tick() {
    const componentUpdateStart = performance.now();
    for (const [component, _] of this.toUpdate) component.Update();
    EngineDebug.componentUpdate.SetValue(performance.now() - componentUpdateStart);
    this.renderPipeline.Render(this);
    requestAnimationFrame(() => this.Tick());
  }
};

// src/plugins/OrbitControls.ts
var _v = new Vector3();
var OrbitControls = class {
  domElement;
  /** The center point to orbit around. Default is `0, 0, 0` */
  center = new Vector3();
  orbitSpeed = 0.01;
  panSpeed = 10;
  enableZoom = true;
  enablePan = true;
  minRadius = 0;
  maxRadius = Infinity;
  minTheta = -Infinity;
  maxTheta = Infinity;
  minPhi = 0;
  maxPhi = Math.PI;
  _camera;
  _element;
  _pointers = /* @__PURE__ */ new Map();
  constructor(domElement, camera) {
    this.domElement = domElement;
    this.domElement.style.touchAction = "none";
    this._camera = camera;
    this._camera.transform.LookAtV1(this.center);
    this.connect(domElement);
  }
  /**
   * Adjusts camera orbital zoom.
   */
  zoom(scale) {
    const radius = this._camera.transform.position.sub(this.center).length();
    this._camera.transform.position.mul(
      scale * (Math.min(this.maxRadius, Math.max(this.minRadius, radius * scale)) / (radius * scale))
    );
    this._camera.transform.position.add(this.center);
  }
  /**
   * Adjusts camera orbital position.
   */
  x = 0;
  y = 0;
  orbit(deltaX, deltaY) {
    const distance2 = this._camera.transform.position.distanceTo(this.center);
    this.x -= deltaX * this.orbitSpeed;
    this.y -= deltaY * this.orbitSpeed;
    const rotation = new Quaternion().fromEuler(new Vector3(this.y, this.x, 0));
    const position = new Vector3(0, 0, distance2).applyQuaternion(rotation).add(this.center);
    this._camera.transform.rotation.copy(rotation);
    this._camera.transform.position.copy(position);
  }
  /**
   * Adjusts orthogonal camera pan.
   */
  pan(deltaX, deltaY) {
    this._camera.transform.position.sub(this.center);
    this.center.add(
      _v.set(-deltaX, deltaY, 0).applyQuaternion(this._camera.transform.rotation).mul(this.panSpeed / this._element.clientHeight)
    );
    this._camera.transform.position.add(this.center);
  }
  _onContextMenu(event) {
    event.preventDefault();
  }
  _onScroll(event) {
    this.zoom(1 + event.deltaY / 720);
  }
  _onPointerMove(event) {
    const prevPointer = this._pointers.get(event.pointerId);
    if (prevPointer) {
      const deltaX = (event.pageX - prevPointer.pageX) / this._pointers.size;
      const deltaY = (event.pageY - prevPointer.pageY) / this._pointers.size;
      const type = event.pointerType === "touch" ? this._pointers.size : event.buttons;
      if (type === 1 /* LEFT */) {
        this._element.style.cursor = "grabbing";
        this.orbit(deltaX, deltaY);
      } else if (type === 2 /* RIGHT */) {
        this._element.style.cursor = "grabbing";
        if (this.enablePan) this.pan(deltaX, deltaY);
      }
      if (event.pointerType === "touch" && this._pointers.size === 2) {
        const otherPointer = Array.from(this._pointers.values()).find((p) => p.pointerId !== event.pointerId);
        if (otherPointer) {
          const currentDistance = Math.hypot(
            event.pageX - otherPointer.pageX,
            event.pageY - otherPointer.pageY
          );
          const previousDistance = Math.hypot(
            prevPointer.pageX - otherPointer.pageX,
            prevPointer.pageY - otherPointer.pageY
          );
          const zoomFactor = previousDistance / currentDistance;
          this.zoom(zoomFactor);
        }
      }
    } else if (event.pointerType == "touch") {
      this._element.setPointerCapture(event.pointerId);
    }
    this._pointers.set(event.pointerId, event);
  }
  _onPointerUp(event) {
    this._element.style.cursor = "grab";
    this._element.style.touchAction = this.enableZoom || this.enablePan ? "none" : "pinch-zoom";
    if (event.pointerType == "touch") this._element.releasePointerCapture(event.pointerId);
    this._pointers.delete(event.pointerId);
  }
  /**
   * Connects controls' event handlers, enabling interaction.
   */
  connect(element) {
    element.addEventListener("contextmenu", (event) => {
      this._onContextMenu(event);
    });
    element.addEventListener("wheel", (event) => {
      this._onScroll(event);
    }, { passive: true });
    element.addEventListener("pointermove", (event) => {
      this._onPointerMove(event);
    });
    element.addEventListener("pointerup", (event) => {
      this._onPointerUp(event);
    });
    element.tabIndex = 0;
    this._element = element;
    this._element.style.cursor = "grab";
  }
};

// src/plugins/DataBackedBuffer.ts
var DataBackedBuffer = class {
  buffer;
  data;
  dataOffsets;
  dataValues;
  constructor(data) {
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
    this.buffer = Buffer3.Create(this.dataValues.length * 4, 0 /* STORAGE */);
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
};

// src/plugins/Water/WaterPass.wgsl
var WaterPass_default = "./resources/plugins/Water/WaterPass.wgsl";

// src/plugins/Water/WaterPlugin.ts
function PlaneGeometry(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
  const width_half = width / 2;
  const height_half = height / 2;
  const gridX = Math.floor(widthSegments);
  const gridY = Math.floor(heightSegments);
  const gridX1 = gridX + 1;
  const gridY1 = gridY + 1;
  const segment_width = width / gridX;
  const segment_height = height / gridY;
  const indices = [];
  const vertices = [];
  for (let iy = 0; iy < gridY1; iy++) {
    const y = iy * segment_height - height_half;
    for (let ix = 0; ix < gridX1; ix++) {
      const x = ix * segment_width - width_half;
      vertices.push(x, -y, 0);
    }
  }
  for (let iy = 0; iy < gridY; iy++) {
    for (let ix = 0; ix < gridX; ix++) {
      const a = ix + gridX1 * iy;
      const b = ix + gridX1 * (iy + 1);
      const c = ix + 1 + gridX1 * (iy + 1);
      const d = ix + 1 + gridX1 * iy;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  const geometry = new Geometry();
  geometry.index = new IndexAttribute(new Uint32Array(indices));
  geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
  return geometry;
}
var WaterRenderPass = class extends RenderPass {
  name = "WaterRenderPass";
  albedoClone;
  depthClone;
  waterShader;
  // public readonly settings: DataBackedBuffer<WaterSettings>;
  waterGeometries;
  waterSettingsBuffer;
  constructor() {
    super({
      inputs: [
        PassParams.MainCamera,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth
      ],
      outputs: []
    });
    this.waterGeometries = /* @__PURE__ */ new Map();
  }
  async init(resources) {
    this.waterShader = await Shader.Create({
      code: await ShaderLoader.Load(WaterPass_default),
      colorOutputs: [
        { format: "rgba16float" },
        { format: "rgba16float" },
        { format: "rgba16float" }
      ],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        viewMatrix: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 0, binding: 2, type: "storage" },
        cameraPosition: { group: 0, binding: 3, type: "storage" },
        TIME: { group: 0, binding: 4, type: "storage" },
        INV_PROJECTION_MATRIX: { group: 0, binding: 5, type: "storage" },
        INV_VIEW_MATRIX: { group: 0, binding: 6, type: "storage" },
        uv_sampler: { group: 1, binding: 0, type: "texture" },
        normalmap_a_sampler: { group: 1, binding: 1, type: "texture" },
        normalmap_b_sampler: { group: 1, binding: 2, type: "texture" },
        foam_sampler: { group: 1, binding: 3, type: "texture" },
        SCREEN_TEXTURE: { group: 1, binding: 4, type: "texture" },
        DEPTH_TEXTURE: { group: 1, binding: 5, type: "depthTexture" },
        texture_sampler: { group: 1, binding: 6, type: "sampler" },
        waveSettings: { group: 1, binding: 7, type: "storage" }
      }
    });
    const uv_sampler_texture = await Texture2.Load("./plugins/Water/textures/Water_UV.png");
    const normalmap_a_sampler_texture = await Texture2.Load("./plugins/Water/textures/Water_N_A.png");
    const normalmap_b_sampler_texture = await Texture2.Load("./plugins/Water/textures/Water_N_B.png");
    const foam_sampler_texture = await Texture2.Load("./plugins/Water/textures/Foam.png");
    this.waterShader.SetTexture("uv_sampler", uv_sampler_texture);
    this.waterShader.SetTexture("normalmap_a_sampler", normalmap_a_sampler_texture);
    this.waterShader.SetTexture("normalmap_b_sampler", normalmap_b_sampler_texture);
    this.waterShader.SetTexture("foam_sampler", foam_sampler_texture);
    this.waterShader.SetSampler("texture_sampler", TextureSampler.Create());
    this.albedoClone = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.depthClone = DepthTexture.Create(Renderer.width, Renderer.height);
    this.waterSettingsBuffer = Buffer3.Create(14 * 4 * 4, 0 /* STORAGE */);
    this.waterShader.SetBuffer("waveSettings", this.waterSettingsBuffer);
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    const meshes = scene.GetComponents(Mesh);
    if (meshes.length === 0) return;
    const inputCamera = Camera.mainCamera;
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const backgroundColor = inputCamera.backgroundColor;
    const currentAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const currentDepth = resources.getResource(PassParams.GBufferDepth);
    if (!currentAlbedo || !currentDepth) return;
    RendererContext.CopyTextureToTexture(currentAlbedo, this.albedoClone);
    RendererContext.CopyTextureToTexture(currentDepth, this.depthClone);
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    RendererContext.BeginRenderPass(
      this.name,
      [
        { target: inputGBufferAlbedo, clear: false, color: backgroundColor },
        { target: inputGBufferNormal, clear: false, color: backgroundColor },
        { target: inputGBufferERMO, clear: false, color: backgroundColor }
      ],
      { target: inputGBufferDepth, clear: false },
      true
    );
    const projectionMatrix = inputCamera.projectionMatrix;
    const viewMatrix = inputCamera.viewMatrix;
    this.waterShader.SetTexture("SCREEN_TEXTURE", this.albedoClone);
    this.waterShader.SetTexture("DEPTH_TEXTURE", this.depthClone);
    this.waterShader.SetValue("TIME", performance.now() / 1e3);
    this.waterShader.SetMatrix4("projectionMatrix", projectionMatrix);
    this.waterShader.SetMatrix4("INV_PROJECTION_MATRIX", projectionMatrix.clone().invert());
    this.waterShader.SetMatrix4("viewMatrix", viewMatrix);
    this.waterShader.SetMatrix4("INV_VIEW_MATRIX", viewMatrix.clone().invert());
    this.waterShader.SetVector3("cameraPosition", inputCamera.transform.position);
    for (const [geometry, waterInfo] of this.waterGeometries) {
      this.waterShader.SetBuffer("waveSettings", waterInfo.settings.buffer);
      this.waterShader.SetMatrix4("modelMatrix", waterInfo.transform.localToWorldMatrix);
      RendererContext.DrawGeometry(geometry, this.waterShader, 1);
    }
    RendererContext.EndRenderPass();
  }
};
var Water = class _Water extends Component {
  settings;
  // Hack
  static WaterRenderPass;
  geometry;
  constructor(gameObject) {
    super(gameObject);
    if (!_Water.WaterRenderPass) {
      _Water.WaterRenderPass = new WaterRenderPass();
      this.gameObject.scene.renderPipeline.AddPass(_Water.WaterRenderPass, 1 /* AfterGBuffer */);
    }
    this.geometry = PlaneGeometry(128, 128, 256, 256);
    this.geometry.enableShadows = false;
    this.settings = new DataBackedBuffer({
      wave_speed: [0.5, 0, 0, 0],
      wave_a: [1, 0.4, 0.35, 3],
      wave_b: [-0.1, 0.6, 0.3, 1.55],
      wave_c: [-1, -0.8, 0.25, 0.9],
      sampler_scale: [0.25, 0.25, 0, 0],
      sampler_direction: [0.05, 0.04, 0, 0],
      uv_sampler_scale: [0.25, 0.25, 0, 0],
      uv_sampler_strength: [0.04, 0, 0, 0],
      foam_level: [0.75, 0, 0, 0],
      refraction: [0.075, 0, 0, 0],
      color_deep: [0.25, 1, 1.25, 1],
      color_shallow: [0.4, 0.9, 1, 1],
      beers_law: [2, 0, 0, 0],
      depth_offset: [-0.75, 0, 0, 0]
    });
    _Water.WaterRenderPass.waterGeometries.set(this.geometry, {
      settings: this.settings,
      transform: this.transform
    });
  }
};

// src/renderer/passes/HiZPass.ts
var HiZPass = class extends RenderPass {
  name = "HiZPass";
  shader;
  quadGeometry;
  debugDepthTexture;
  inputTexture;
  targetTextures = [];
  // TODO: This should be next powerOf2 for SwapChain dims
  depthWidth = 512;
  depthHeight = 512;
  passBuffers = [];
  currentBuffer;
  initialized = false;
  blitShader;
  constructor() {
    super({
      inputs: [PassParams.depthTexture],
      outputs: [PassParams.depthTexturePyramid]
    });
  }
  async init(resources) {
    this.shader = await Shader.Create({
      code: await ShaderLoader.DepthDownsample,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      colorOutputs: [],
      depthOutput: "depth24plus",
      uniforms: {
        depthTextureInputSampler: { group: 0, binding: 0, type: "sampler" },
        depthTextureInput: { group: 0, binding: 1, type: "depthTexture" },
        currentMip: { group: 0, binding: 2, type: "storage" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    let w = this.depthWidth;
    let h = this.depthHeight;
    let level = 0;
    while (w > 1) {
      this.targetTextures.push(DepthTexture.Create(w, h));
      const passBuffer = Buffer3.Create(4 * 4, 0 /* STORAGE */);
      passBuffer.SetArray(new Float32Array([level]));
      this.passBuffers.push(passBuffer);
      w /= 2;
      h /= 2;
      level++;
    }
    this.inputTexture = DepthTexture.Create(this.depthWidth, this.depthHeight, 1, "depth24plus", level);
    this.inputTexture.SetActiveMip(0);
    this.inputTexture.SetActiveMipCount(level);
    const Sampler = TextureSampler.Create({ magFilter: "nearest", minFilter: "nearest" });
    this.shader.SetSampler("depthTextureInputSampler", Sampler);
    this.shader.SetTexture("depthTextureInput", this.inputTexture);
    this.debugDepthTexture = this.inputTexture;
    this.currentBuffer = Buffer3.Create(4 * 4, 0 /* STORAGE */);
    console.log("mips", level);
    this.blitShader = await Shader.Create({
      code: await ShaderLoader.BlitDepth,
      colorOutputs: [],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        texture: { group: 0, binding: 0, type: "depthTexture" },
        textureSampler: { group: 0, binding: 1, type: "sampler" },
        mip: { group: 0, binding: 2, type: "storage" }
      }
    });
    const blitSampler = TextureSampler.Create();
    this.blitShader.SetSampler("textureSampler", blitSampler);
    this.blitShader.SetValue("mip", 0);
    resources.setResource(PassParams.depthTexturePyramid, this.inputTexture);
    this.initialized = true;
  }
  execute(resources, inputDepthTexture, outputDepthTexturePyramid) {
    if (this.initialized === false) return;
    let currentLevel = 0;
    let currentTarget = this.targetTextures[currentLevel];
    this.blitShader.SetTexture("texture", inputDepthTexture);
    RendererContext.BeginRenderPass("HiZ - First mip", [], { target: currentTarget, clear: true }, true);
    RendererContext.DrawGeometry(this.quadGeometry, this.blitShader);
    RendererContext.EndRenderPass();
    RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);
    this.shader.SetBuffer("currentMip", this.currentBuffer);
    for (let i2 = 0; i2 < this.targetTextures.length - 1; i2++) {
      let levelBuffer = this.passBuffers[currentLevel];
      currentLevel++;
      currentTarget = this.targetTextures[currentLevel];
      RendererContext.CopyBufferToBuffer(levelBuffer, this.currentBuffer);
      RendererContext.BeginRenderPass("HiZ - DepthPyramid", [], { target: currentTarget, clear: true }, true);
      RendererContext.DrawGeometry(this.quadGeometry, this.shader);
      RendererContext.EndRenderPass();
      RendererContext.CopyTextureToTexture(currentTarget, this.inputTexture, 0, currentLevel);
    }
    resources.setResource(outputDepthTexturePyramid, this.inputTexture);
  }
};

// src/utils/CRC32.ts
var CRC32 = class {
  /**
   * Lookup table calculated for 0xEDB88320 divisor
   */
  static lookupTable = [0, 1996959894, 3993919788, 2567524794, 124634137, 1886057615, 3915621685, 2657392035, 249268274, 2044508324, 3772115230, 2547177864, 162941995, 2125561021, 3887607047, 2428444049, 498536548, 1789927666, 4089016648, 2227061214, 450548861, 1843258603, 4107580753, 2211677639, 325883990, 1684777152, 4251122042, 2321926636, 335633487, 1661365465, 4195302755, 2366115317, 997073096, 1281953886, 3579855332, 2724688242, 1006888145, 1258607687, 3524101629, 2768942443, 901097722, 1119000684, 3686517206, 2898065728, 853044451, 1172266101, 3705015759, 2882616665, 651767980, 1373503546, 3369554304, 3218104598, 565507253, 1454621731, 3485111705, 3099436303, 671266974, 1594198024, 3322730930, 2970347812, 795835527, 1483230225, 3244367275, 3060149565, 1994146192, 31158534, 2563907772, 4023717930, 1907459465, 112637215, 2680153253, 3904427059, 2013776290, 251722036, 2517215374, 3775830040, 2137656763, 141376813, 2439277719, 3865271297, 1802195444, 476864866, 2238001368, 4066508878, 1812370925, 453092731, 2181625025, 4111451223, 1706088902, 314042704, 2344532202, 4240017532, 1658658271, 366619977, 2362670323, 4224994405, 1303535960, 984961486, 2747007092, 3569037538, 1256170817, 1037604311, 2765210733, 3554079995, 1131014506, 879679996, 2909243462, 3663771856, 1141124467, 855842277, 2852801631, 3708648649, 1342533948, 654459306, 3188396048, 3373015174, 1466479909, 544179635, 3110523913, 3462522015, 1591671054, 702138776, 2966460450, 3352799412, 1504918807, 783551873, 3082640443, 3233442989, 3988292384, 2596254646, 62317068, 1957810842, 3939845945, 2647816111, 81470997, 1943803523, 3814918930, 2489596804, 225274430, 2053790376, 3826175755, 2466906013, 167816743, 2097651377, 4027552580, 2265490386, 503444072, 1762050814, 4150417245, 2154129355, 426522225, 1852507879, 4275313526, 2312317920, 282753626, 1742555852, 4189708143, 2394877945, 397917763, 1622183637, 3604390888, 2714866558, 953729732, 1340076626, 3518719985, 2797360999, 1068828381, 1219638859, 3624741850, 2936675148, 906185462, 1090812512, 3747672003, 2825379669, 829329135, 1181335161, 3412177804, 3160834842, 628085408, 1382605366, 3423369109, 3138078467, 570562233, 1426400815, 3317316542, 2998733608, 733239954, 1555261956, 3268935591, 3050360625, 752459403, 1541320221, 2607071920, 3965973030, 1969922972, 40735498, 2617837225, 3943577151, 1913087877, 83908371, 2512341634, 3803740692, 2075208622, 213261112, 2463272603, 3855990285, 2094854071, 198958881, 2262029012, 4057260610, 1759359992, 534414190, 2176718541, 4139329115, 1873836001, 414664567, 2282248934, 4279200368, 1711684554, 285281116, 2405801727, 4167216745, 1634467795, 376229701, 2685067896, 3608007406, 1308918612, 956543938, 2808555105, 3495958263, 1231636301, 1047427035, 2932959818, 3654703836, 1088359270, 936918e3, 2847714899, 3736837829, 1202900863, 817233897, 3183342108, 3401237130, 1404277552, 615818150, 3134207493, 3453421203, 1423857449, 601450431, 3009837614, 3294710456, 1567103746, 711928724, 3020668471, 3272380065, 1510334235, 755167117];
  static calculateBytes(bytes, accumulator) {
    let crc = accumulator;
    for (const byte of bytes) {
      const tableIndex = (crc ^ byte) & 255;
      const tableVal = this.lookupTable[tableIndex];
      crc = crc >>> 8 ^ tableVal;
    }
    return crc;
  }
  static crcToUint(crc) {
    return this.toUint32(crc ^ 4294967295);
  }
  static toUint32(num) {
    if (num >= 0) {
      return num;
    }
    return 4294967295 - num * -1 + 1;
  }
  static forBytes(bytes) {
    const crc = this.calculateBytes(bytes, 4294967295);
    return this.crcToUint(crc);
  }
};

// src/plugins/meshlets_v2/Meshlet.ts
var Meshlet = class _Meshlet {
  static max_triangles = 128;
  static max_vertices = 255;
  vertices;
  indices;
  id = Utils.UUID();
  lod;
  children;
  parents;
  _boundingVolume;
  get boundingVolume() {
    return this._boundingVolume;
  }
  set boundingVolume(boundingVolume) {
    this._boundingVolume = boundingVolume;
  }
  // public boundingVolume: Sphere;
  parentBoundingVolume;
  parentError = Infinity;
  clusterError = 0;
  vertices_gpu;
  crc;
  bounds;
  interleaved;
  coneBounds;
  traversalMetric;
  constructor(vertices, indices) {
    this.vertices = vertices;
    this.indices = indices;
    this.lod = 0;
    this.children = [];
    this.parents = [];
    this.bounds = BoundingVolume.FromVertices(this.vertices);
    this.coneBounds = { cone_apex: new Vector3(), cone_axis: new Vector3(), cone_cutoff: 0 };
    const verticesNonIndexed = _Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 0);
    const normalsNonIndexed = _Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 3);
    const uvsNonIndexed = _Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 2, true, 8, 6);
    const interleaved = InterleavedVertexAttribute.fromArrays([verticesNonIndexed, normalsNonIndexed, uvsNonIndexed], [3, 3, 2]);
    const verticesGPU = [];
    for (let i2 = 0; i2 < interleaved.array.length; i2 += 8) {
      verticesGPU.push(
        interleaved.array[i2 + 0],
        interleaved.array[i2 + 1],
        interleaved.array[i2 + 2],
        interleaved.array[i2 + 3],
        interleaved.array[i2 + 4],
        interleaved.array[i2 + 5],
        interleaved.array[i2 + 6],
        interleaved.array[i2 + 7]
      );
    }
    this.interleaved = interleaved;
    this.vertices_gpu = new Float32Array(_Meshlet.max_triangles * (3 + 3 + 2) * 3);
    this.vertices_gpu.set(verticesGPU.slice(0, _Meshlet.max_triangles * (3 + 3 + 2) * 3));
    this.crc = CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
  }
  static convertBufferAttributeToNonIndexed(attribute, indices, itemSize, isInterleaved = false, stride = 3, offset = 0) {
    if (!attribute) throw Error("Invalid attribute");
    const array = attribute;
    const array2 = new Float32Array(indices.length * itemSize);
    let index = 0, index2 = 0;
    for (let i2 = 0, l = indices.length; i2 < l; i2++) {
      if (isInterleaved === true) index = indices[i2] * stride + offset;
      else index = indices[i2] * itemSize;
      for (let j = 0; j < itemSize; j++) {
        array2[index2++] = array[index++];
      }
    }
    return array2;
  }
};

// src/math/Plane.ts
var Plane = class {
  normal;
  constant;
  constructor(normal = new Vector3(1, 0, 0), constant = 0) {
    this.normal = normal;
    this.constant = constant;
  }
  setComponents(x, y, z, w) {
    this.normal.set(x, y, z);
    this.constant = w;
    return this;
  }
  normalize() {
    const inverseNormalLength = 1 / this.normal.length();
    this.normal.mul(inverseNormalLength);
    this.constant *= inverseNormalLength;
    return this;
  }
};

// src/math/Frustum.ts
var Frustum = class {
  planes;
  constructor(p0 = new Plane(), p1 = new Plane(), p2 = new Plane(), p3 = new Plane(), p4 = new Plane(), p5 = new Plane()) {
    this.planes = [p0, p1, p2, p3, p4, p5];
  }
  setFromProjectionMatrix(m) {
    const planes = this.planes;
    const me = m.elements;
    const me0 = me[0], me1 = me[1], me2 = me[2], me3 = me[3];
    const me4 = me[4], me5 = me[5], me6 = me[6], me7 = me[7];
    const me8 = me[8], me9 = me[9], me10 = me[10], me11 = me[11];
    const me12 = me[12], me13 = me[13], me14 = me[14], me15 = me[15];
    planes[0].setComponents(me3 - me0, me7 - me4, me11 - me8, me15 - me12).normalize();
    planes[1].setComponents(me3 + me0, me7 + me4, me11 + me8, me15 + me12).normalize();
    planes[2].setComponents(me3 + me1, me7 + me5, me11 + me9, me15 + me13).normalize();
    planes[3].setComponents(me3 - me1, me7 - me5, me11 - me9, me15 - me13).normalize();
    planes[4].setComponents(me3 - me2, me7 - me6, me11 - me10, me15 - me14).normalize();
    planes[5].setComponents(me2, me6, me10, me14).normalize();
    return this;
  }
};

// src/renderer/webgpu/WEBGPUComputeContext.ts
var WEBGPUComputeContext = class {
  static activeComputePass = null;
  static BeginComputePass(name, timestamp) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.activeComputePass) throw Error("There is already an active compute pass");
    const computePassDescriptor = {};
    if (timestamp === true) computePassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);
    this.activeComputePass = activeCommandEncoder.beginComputePass(computePassDescriptor);
    this.activeComputePass.label = "ComputePass: " + name;
  }
  static EndComputePass() {
    if (!this.activeComputePass) throw Error("No active compute pass");
    this.activeComputePass.end();
    this.activeComputePass = null;
    WEBGPUTimestampQuery.EndRenderTimestamp();
  }
  static Dispatch(computeShader, workgroupCountX, workgroupCountY, workgroupCountZ) {
    if (!this.activeComputePass) throw Error("No active render pass");
    computeShader.OnPreRender();
    computeShader.Compile();
    if (!computeShader.pipeline) throw Error("Shader doesnt have a pipeline");
    this.activeComputePass.setPipeline(computeShader.pipeline);
    for (let i2 = 0; i2 < computeShader.bindGroups.length; i2++) {
      let dynamicOffsetsV2 = [];
      for (const buffer of computeShader.bindGroupsInfo[i2].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsetsV2.push(buffer.dynamicOffset);
        }
      }
      this.activeComputePass.setBindGroup(i2, computeShader.bindGroups[i2], dynamicOffsetsV2);
    }
    this.activeComputePass.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
  }
};

// src/renderer/ComputeContext.ts
var ComputeContext = class {
  constructor() {
  }
  static BeginComputePass(name, timestamp = false) {
    if (Renderer.type === "webgpu") WEBGPUComputeContext.BeginComputePass(name, timestamp);
    else throw Error("Unknown render api type.");
  }
  static EndComputePass() {
    if (Renderer.type === "webgpu") WEBGPUComputeContext.EndComputePass();
    else throw Error("Unknown render api type.");
  }
  static Dispatch(computeShader, workgroupCountX, workgroupCountY = 1, workgroupCountZ = 1) {
    if (Renderer.type === "webgpu") WEBGPUComputeContext.Dispatch(computeShader, workgroupCountX, workgroupCountY, workgroupCountZ);
    else throw Error("Unknown render api type.");
  }
};

// src/plugins/meshlets_v2/passes/MeshletDebug.ts
var _MeshletDebug = class {
  meshletsFolder;
  viewTypeStat;
  viewTypeValue = 0;
  meshletsViewType = 0;
  totalMeshlets;
  visibleMeshes;
  hizFolder;
  debugDepthMipLevel;
  debugDepthMipLevelValue = 0;
  debugDepthExposure;
  debugDepthExposureValue = 0;
  debugDepth;
  isDebugDepthPassEnabled;
  cullingFolder;
  frustumCulling;
  backFaceCulling;
  occlusionCulling;
  smallFeatureCulling;
  dynamicLODErrorThreshold;
  dynamicLOD;
  staticLOD;
  isFrustumCullingEnabled = true;
  isBackFaceCullingEnabled = false;
  isOcclusionCullingEnabled = true;
  isSmallFeaturesCullingEnabled = true;
  dynamicLODErrorThresholdValue = 1;
  isDynamicLODEnabled = true;
  staticLODValue = 20;
  constructor() {
    this.meshletsFolder = new UIFolder(Debugger.ui, "Plugin - Meshlets");
    this.viewTypeStat = new UIDropdownStat(this.meshletsFolder, "Show:", ["Default", "Meshlets", "Triangles"], (index, value) => {
      this.meshletsViewType = index;
    }, this.meshletsViewType);
    this.totalMeshlets = new UITextStat(this.meshletsFolder, "Total meshlets");
    this.visibleMeshes = new UITextStat(this.meshletsFolder, "Visible meshlets: ");
    this.meshletsFolder.Open();
    this.hizFolder = new UIFolder(this.meshletsFolder, "- Hierarchical Z depth");
    this.hizFolder.Open();
    this.debugDepthMipLevel = new UISliderStat(this.hizFolder, "Depth mip:", 0, 20, 1, 0, (value) => {
      this.debugDepthMipLevelValue = value;
    });
    this.debugDepthExposure = new UISliderStat(this.hizFolder, "Depth exposure:", -10, 10, 0.01, 0, (value) => {
      this.debugDepthExposureValue = value;
    });
    this.debugDepthMipLevel.Disable();
    this.debugDepthExposure.Disable();
    this.debugDepth = new UIButtonStat(this.hizFolder, "View depth:", (state) => {
      this.isDebugDepthPassEnabled = state;
      if (this.isDebugDepthPassEnabled === true) {
        this.debugDepthMipLevel.Enable();
        this.debugDepthExposure.Enable();
      } else {
        this.debugDepthMipLevel.Disable();
        this.debugDepthExposure.Disable();
      }
    });
    this.cullingFolder = new UIFolder(this.meshletsFolder, "- Culling");
    this.frustumCulling = new UIButtonStat(this.cullingFolder, "Frustum culling:", (state) => {
      this.isFrustumCullingEnabled = state;
    }, this.isFrustumCullingEnabled);
    this.backFaceCulling = new UIButtonStat(this.cullingFolder, "Backface culling:", (state) => {
      this.isBackFaceCullingEnabled = state;
    }, this.isBackFaceCullingEnabled);
    this.occlusionCulling = new UIButtonStat(this.cullingFolder, "Occlusion culling:", (state) => {
      this.isOcclusionCullingEnabled = state;
    }, this.isOcclusionCullingEnabled);
    this.smallFeatureCulling = new UIButtonStat(this.cullingFolder, "Small features:", (state) => {
      this.isSmallFeaturesCullingEnabled = state;
    }, this.isSmallFeaturesCullingEnabled);
    this.staticLOD = new UISliderStat(this.cullingFolder, "Static LOD:", 0, this.staticLODValue, 1, 0, (state) => {
      this.staticLODValue = state;
    });
    this.staticLOD.Disable();
    this.dynamicLODErrorThreshold = new UISliderStat(this.cullingFolder, "Dynamic LOD error:", 0, 20, 0.01, this.dynamicLODErrorThresholdValue, (value) => {
      this.dynamicLODErrorThresholdValue = value;
    });
    this.dynamicLOD = new UIButtonStat(this.cullingFolder, "Dynamic LOD:", (state) => {
      this.isDynamicLODEnabled = state;
      if (this.isDynamicLODEnabled === true) {
        this.staticLOD.Disable();
        this.dynamicLODErrorThreshold.Enable();
      } else {
        this.staticLOD.Enable();
        this.dynamicLODErrorThreshold.Disable();
      }
    }, this.isDynamicLODEnabled);
    this.cullingFolder.Open();
  }
};
var MeshletDebug = new _MeshletDebug();

// src/plugins/meshlets_v2/passes/CullingPass.ts
var CullingPass = class extends RenderPass {
  name = "CullingPass";
  drawIndirectBuffer;
  compute;
  cullData;
  frustum = new Frustum();
  visibilityBuffer;
  instanceInfoBuffer;
  debugBuffer;
  constructor() {
    super({
      inputs: [
        MeshletPassParams.indirectMeshletInfo,
        MeshletPassParams.indirectObjectInfo,
        MeshletPassParams.indirectMeshMatrixInfo,
        MeshletPassParams.meshletsCount,
        MeshletPassParams.meshletSettings
      ],
      outputs: [
        MeshletPassParams.indirectDrawBuffer,
        MeshletPassParams.indirectInstanceInfo,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth,
        PassParams.GBufferDepth
      ]
    });
  }
  async init(resources) {
    this.compute = await Compute.Create({
      code: await ShaderLoader.Cull,
      computeEntrypoint: "main",
      uniforms: {
        drawBuffer: { group: 0, binding: 0, type: "storage-write" },
        instanceInfo: { group: 0, binding: 1, type: "storage-write" },
        cullData: { group: 0, binding: 2, type: "storage" },
        meshletInfo: { group: 0, binding: 3, type: "storage" },
        objectInfo: { group: 0, binding: 4, type: "storage" },
        meshMatrixInfo: { group: 0, binding: 5, type: "storage" },
        visibilityBuffer: { group: 0, binding: 6, type: "storage-write" },
        bPrepass: { group: 0, binding: 7, type: "storage" },
        textureSampler: { group: 0, binding: 8, type: "sampler" },
        depthTexture: { group: 0, binding: 9, type: "depthTexture" },
        meshletSettings: { group: 0, binding: 10, type: "storage" }
      }
    });
    this.drawIndirectBuffer = Buffer3.Create(4 * 4, 5 /* INDIRECT */);
    this.drawIndirectBuffer.name = "drawIndirectBuffer";
    this.compute.SetBuffer("drawBuffer", this.drawIndirectBuffer);
    const sampler = TextureSampler.Create({ magFilter: "nearest", minFilter: "nearest" });
    this.compute.SetSampler("textureSampler", sampler);
    this.debugBuffer = Buffer3.Create(4 * 4, 0 /* STORAGE */);
  }
  execute(resources) {
    const mainCamera = Camera.mainCamera;
    const meshletCount = resources.getResource(MeshletPassParams.meshletsCount);
    const meshletInfoBuffer = resources.getResource(MeshletPassParams.indirectMeshletInfo);
    const objectInfoBuffer = resources.getResource(MeshletPassParams.indirectObjectInfo);
    const meshMatrixInfoBuffer = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo);
    if (meshletCount === 0) return;
    if (!this.visibilityBuffer) {
      const visibilityBufferArray = new Float32Array(meshletCount).fill(1);
      this.visibilityBuffer = Buffer3.Create(visibilityBufferArray.byteLength, 1 /* STORAGE_WRITE */);
      this.visibilityBuffer.SetArray(visibilityBufferArray);
    }
    if (!this.instanceInfoBuffer) {
      console.log("meshletCount", meshletCount);
      this.instanceInfoBuffer = Buffer3.Create(meshletCount * 1 * 4, 1 /* STORAGE_WRITE */);
      this.instanceInfoBuffer.name = "instanceInfoBuffer";
    }
    this.compute.SetBuffer("meshletInfo", meshletInfoBuffer);
    this.compute.SetBuffer("objectInfo", objectInfoBuffer);
    this.compute.SetBuffer("meshMatrixInfo", meshMatrixInfoBuffer);
    this.compute.SetBuffer("instanceInfo", this.instanceInfoBuffer);
    this.compute.SetBuffer("visibilityBuffer", this.visibilityBuffer);
    this.frustum.setFromProjectionMatrix(mainCamera.projectionMatrix);
    const cullDataArray = new Float32Array([
      ...mainCamera.projectionMatrix.elements,
      ...mainCamera.viewMatrix.elements,
      ...mainCamera.transform.position.elements,
      0,
      ...this.frustum.planes[0].normal.elements,
      this.frustum.planes[0].constant,
      ...this.frustum.planes[1].normal.elements,
      this.frustum.planes[1].constant,
      ...this.frustum.planes[2].normal.elements,
      this.frustum.planes[2].constant,
      ...this.frustum.planes[3].normal.elements,
      this.frustum.planes[3].constant,
      ...this.frustum.planes[4].normal.elements,
      this.frustum.planes[4].constant,
      ...this.frustum.planes[5].normal.elements,
      this.frustum.planes[5].constant,
      meshletCount,
      0,
      Renderer.width,
      Renderer.height,
      0,
      0,
      mainCamera.near,
      mainCamera.far,
      ...mainCamera.projectionMatrix.clone().transpose().elements
    ]);
    if (!this.cullData) {
      this.cullData = Buffer3.Create(cullDataArray.byteLength, 0 /* STORAGE */);
      this.cullData.name = "cullData";
      this.compute.SetBuffer("cullData", this.cullData);
    }
    this.cullData.SetArray(cullDataArray);
    this.compute.SetArray("meshletSettings", resources.getResource(MeshletPassParams.meshletSettings));
    RendererContext.CopyBufferToBuffer(this.drawIndirectBuffer, this.debugBuffer);
    RendererContext.ClearBuffer(this.drawIndirectBuffer);
    const dispatchSizeX = Math.ceil(Math.cbrt(meshletCount) / 4);
    const dispatchSizeY = Math.ceil(Math.cbrt(meshletCount) / 4);
    const dispatchSizeZ = Math.ceil(Math.cbrt(meshletCount) / 4);
    ComputeContext.BeginComputePass(`Culling`, true);
    ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
    ComputeContext.EndComputePass();
    resources.setResource(MeshletPassParams.indirectDrawBuffer, this.drawIndirectBuffer);
    resources.setResource(MeshletPassParams.indirectInstanceInfo, this.instanceInfoBuffer);
    this.debugBuffer.GetData().then((v) => {
      const visibleMeshCount = new Uint32Array(v)[1];
      MeshletDebug.visibleMeshes.SetValue(visibleMeshCount);
      RendererDebug.SetTriangleCount(Meshlet.max_triangles * meshletCount);
      RendererDebug.SetVisibleTriangleCount(Meshlet.max_triangles * visibleMeshCount);
    });
  }
};

// src/math/Sphere.ts
var Sphere = class _Sphere {
  center;
  radius;
  constructor(center = new Vector3(0, 0, 0), radius = 0) {
    this.center = center;
    this.radius = radius;
  }
  static fromAABB(minBounds, maxBounds) {
    const center = maxBounds.clone().add(minBounds).mul(0.5);
    const radius = maxBounds.distanceTo(minBounds) * 0.5;
    return new _Sphere(center, radius);
  }
  static fromVertices(vertices, indices, vertex_positions_stride) {
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    let vertex = new Vector3();
    for (const index of indices) {
      const x = vertices[index * vertex_positions_stride + 0];
      const y = vertices[index * vertex_positions_stride + 1];
      const z = vertices[index * vertex_positions_stride + 2];
      if (isNaN(x) || isNaN(y) || isNaN(z)) throw Error(`Invalid vertex [i ${index}, ${x}, ${y}, ${z}]`);
      vertex.set(x, y, z);
      min.min(vertex);
      max.max(vertex);
    }
    return _Sphere.fromAABB(min, max);
  }
  // Set the sphere to contain all points in the array
  SetFromPoints(points) {
    if (points.length === 0) {
      throw new Error("Point array is empty.");
    }
    let centroid = points.reduce((acc, cur) => acc.add(cur)).mul(1 / points.length);
    let maxRadius = points.reduce((max, p) => Math.max(max, centroid.distanceTo(p)), 0);
    this.center = centroid;
    this.radius = maxRadius;
  }
};

// src/plugins/meshlets/WASMHelper.ts
var WASMPointer = class {
  data;
  ptr;
  type;
  constructor(data, type = "in") {
    this.data = data;
    this.ptr = null;
    this.type = type;
  }
};
var WASMHelper = class _WASMHelper {
  static TYPES = {
    i8: { array: Int8Array, heap: "HEAP8" },
    i16: { array: Int16Array, heap: "HEAP16" },
    i32: { array: Int32Array, heap: "HEAP32" },
    f32: { array: Float32Array, heap: "HEAPF32" },
    f64: { array: Float64Array, heap: "HEAPF64" },
    u8: { array: Uint8Array, heap: "HEAPU8" },
    u16: { array: Uint16Array, heap: "HEAPU16" },
    u32: { array: Uint32Array, heap: "HEAPU32" }
  };
  static getTypeForArray(array) {
    if (array instanceof Int8Array) return this.TYPES.i8;
    else if (array instanceof Int16Array) return this.TYPES.i16;
    else if (array instanceof Int32Array) return this.TYPES.i32;
    else if (array instanceof Uint8Array) return this.TYPES.u8;
    else if (array instanceof Uint16Array) return this.TYPES.u16;
    else if (array instanceof Uint32Array) return this.TYPES.u32;
    else if (array instanceof Float32Array) return this.TYPES.f32;
    else if (array instanceof Float64Array) return this.TYPES.f64;
    console.log(array);
    throw Error("Array has no type");
  }
  static transferNumberArrayToHeap(module, array) {
    const type = this.getTypeForArray(array);
    const typedArray = type.array.from(array);
    const heapPointer = module._malloc(
      typedArray.length * typedArray.BYTES_PER_ELEMENT
    );
    if (type.heap === "HEAPU8") module[type.heap].set(typedArray, heapPointer);
    else module[type.heap].set(typedArray, heapPointer >> 2);
    return heapPointer;
  }
  static getDataFromHeapU8(module, address, type, length) {
    return module[type.heap].slice(address, address + length);
  }
  static getDataFromHeap(module, address, type, length) {
    return module[type.heap].slice(address >> 2, (address >> 2) + length);
  }
  static getArgumentTypes(args) {
    let argTypes = [];
    for (let i2 = 0; i2 < args.length; i2++) {
      const arg = args[i2];
      if (arg instanceof Uint8Array) argTypes.push("number");
      else if (arg instanceof Uint16Array) argTypes.push("number");
      else if (arg instanceof Uint32Array) argTypes.push("number");
      else if (arg instanceof Int8Array) argTypes.push("number");
      else if (arg instanceof Int16Array) argTypes.push("number");
      else if (arg instanceof Int32Array) argTypes.push("number");
      else if (arg instanceof Float32Array) argTypes.push("number");
      else if (arg instanceof Float64Array) argTypes.push("number");
      else if (typeof arg === "string") argTypes.push("string");
      else argTypes.push("number");
    }
    return argTypes;
  }
  static transferArguments(module, args) {
    let method_args = [];
    for (let i2 = 0; i2 < args.length; i2++) {
      const arg = args[i2];
      if (arg instanceof WASMPointer) {
        arg.ptr = _WASMHelper.transferNumberArrayToHeap(module, arg.data);
        method_args.push(arg.ptr);
      } else method_args.push(args[i2]);
    }
    return method_args;
  }
  static getOutputArguments(module, args) {
    for (let i2 = 0; i2 < args.length; i2++) {
      const arg = args[i2];
      if (!(arg instanceof WASMPointer)) continue;
      if (arg.ptr === null) continue;
      if (arg.type === "in") continue;
      const type = _WASMHelper.getTypeForArray(arg.data);
      if (type === this.TYPES.u8) {
        arg.data = _WASMHelper.getDataFromHeapU8(module, arg.ptr, type, arg.data.length);
      } else {
        arg.data = _WASMHelper.getDataFromHeap(module, arg.ptr, type, arg.data.length);
      }
    }
  }
  static call(module, method, returnType, ...args) {
    let method_args = _WASMHelper.transferArguments(module, args);
    const method_arg_types = _WASMHelper.getArgumentTypes(args);
    const ret = module.ccall(
      method,
      returnType,
      method_arg_types,
      method_args
    );
    _WASMHelper.getOutputArguments(module, args);
    return ret;
  }
};

// src/plugins/meshlets/meshoptimizer/MeshOptimizer.js
var Module = (() => {
  var _scriptDir = import.meta.url;
  return function(Module3) {
    Module3 = Module3 || {};
    var Module3 = typeof Module3 != "undefined" ? Module3 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module3["ready"] = new Promise(function(resolve, reject) {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    ["_malloc", "_meshopt_computeClusterBounds", "_meshopt_buildMeshletsBound", "_meshopt_buildMeshlets", "_meshopt_simplify", "_meshopt_simplifyWithAttributes", "_meshopt_generateVertexRemap", "_meshopt_remapIndexBuffer", "_meshopt_remapVertexBuffer", "_meshopt_simplifyScale", "_fflush", "onRuntimeInitialized"].forEach((prop) => {
      if (!Object.getOwnPropertyDescriptor(Module3["ready"], prop)) {
        Object.defineProperty(Module3["ready"], prop, { get: () => abort("You are getting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js"), set: () => abort("You are setting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js") });
      }
    });
    var moduleOverrides = Object.assign({}, Module3);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = true;
    var ENVIRONMENT_IS_WORKER = false;
    var ENVIRONMENT_IS_NODE = false;
    var ENVIRONMENT_IS_SHELL = false;
    if (Module3["ENVIRONMENT"]) {
      throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
    }
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module3["locateFile"]) {
        return Module3["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var read_, readAsync, readBinary, setWindowTitle;
    function logExceptionOnExit(e) {
      if (e instanceof ExitStatus) return;
      let toLog = e;
      if (e && typeof e == "object" && e.stack) {
        toLog = [e, e.stack];
      }
      err("exiting due to exception: " + toLog);
    }
    if (ENVIRONMENT_IS_SHELL) {
      if (typeof process == "object" && typeof __require === "function" || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      if (typeof read != "undefined") {
        read_ = function shell_read(f) {
          return read(f);
        };
      }
      readBinary = function readBinary2(f) {
        let data;
        if (typeof readbuffer == "function") {
          return new Uint8Array(readbuffer(f));
        }
        data = read(f, "binary");
        assert2(typeof data == "object");
        return data;
      };
      readAsync = function readAsync2(f, onload, onerror) {
        setTimeout(() => onload(readBinary(f)), 0);
      };
      if (typeof scriptArgs != "undefined") {
        arguments_ = scriptArgs;
      } else if (typeof arguments != "undefined") {
        arguments_ = arguments;
      }
      if (typeof quit == "function") {
        quit_ = (status, toThrow) => {
          logExceptionOnExit(toThrow);
          quit(status);
        };
      }
      if (typeof print != "undefined") {
        if (typeof console == "undefined") console = {};
        console.log = print;
        console.warn = console.error = typeof printErr != "undefined" ? printErr : print;
      }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
      if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      {
        read_ = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.send(null);
          return xhr.responseText;
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(xhr.response);
          };
        }
        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
              onload(xhr.response);
              return;
            }
            onerror();
          };
          xhr.onerror = onerror;
          xhr.send(null);
        };
      }
      setWindowTitle = (title) => document.title = title;
    } else {
      throw new Error("environment detection error");
    }
    var out = Module3["print"] || console.log.bind(console);
    var err = Module3["printErr"] || console.warn.bind(console);
    Object.assign(Module3, moduleOverrides);
    moduleOverrides = null;
    checkIncomingModuleAPI();
    if (Module3["arguments"]) arguments_ = Module3["arguments"];
    legacyModuleProp("arguments", "arguments_");
    if (Module3["thisProgram"]) thisProgram = Module3["thisProgram"];
    legacyModuleProp("thisProgram", "thisProgram");
    if (Module3["quit"]) quit_ = Module3["quit"];
    legacyModuleProp("quit", "quit_");
    assert2(typeof Module3["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");
    assert2(typeof Module3["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
    assert2(typeof Module3["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
    assert2(typeof Module3["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify setWindowTitle in JS)");
    assert2(typeof Module3["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
    legacyModuleProp("read", "read_");
    legacyModuleProp("readAsync", "readAsync");
    legacyModuleProp("readBinary", "readBinary");
    legacyModuleProp("setWindowTitle", "setWindowTitle");
    assert2(!ENVIRONMENT_IS_WORKER, "worker environment detected but not enabled at build time.  Add 'worker' to `-sENVIRONMENT` to enable.");
    assert2(!ENVIRONMENT_IS_NODE, "node environment detected but not enabled at build time.  Add 'node' to `-sENVIRONMENT` to enable.");
    assert2(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");
    var POINTER_SIZE = 4;
    function legacyModuleProp(prop, newName) {
      if (!Object.getOwnPropertyDescriptor(Module3, prop)) {
        Object.defineProperty(Module3, prop, { configurable: true, get: function() {
          abort("Module." + prop + " has been replaced with plain " + newName + " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)");
        } });
      }
    }
    function ignoredModuleProp(prop) {
      if (Object.getOwnPropertyDescriptor(Module3, prop)) {
        abort("`Module." + prop + "` was supplied but `" + prop + "` not included in INCOMING_MODULE_JS_API");
      }
    }
    function isExportedByForceFilesystem(name) {
      return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
    }
    function missingLibrarySymbol(sym) {
      if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, { configurable: true, get: function() {
          var msg = "`" + sym + "` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line";
          if (isExportedByForceFilesystem(sym)) {
            msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
          }
          warnOnce(msg);
          return void 0;
        } });
      }
    }
    function unexportedRuntimeSymbol(sym) {
      if (!Object.getOwnPropertyDescriptor(Module3, sym)) {
        Object.defineProperty(Module3, sym, { configurable: true, get: function() {
          var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
          if (isExportedByForceFilesystem(sym)) {
            msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
          }
          abort(msg);
        } });
      }
    }
    var wasmBinary;
    if (Module3["wasmBinary"]) wasmBinary = Module3["wasmBinary"];
    legacyModuleProp("wasmBinary", "wasmBinary");
    var noExitRuntime = Module3["noExitRuntime"] || true;
    legacyModuleProp("noExitRuntime", "noExitRuntime");
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert2(condition, text) {
      if (!condition) {
        abort("Assertion failed" + (text ? ": " + text : ""));
      }
    }
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
    function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte 0x" + u0.toString(16) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var u = str.charCodeAt(i2);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i2);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 1114111) warnOnce("Invalid Unicode code point 0x" + u.toString(16) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      assert2(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateGlobalBufferAndViews(buf) {
      buffer = buf;
      Module3["HEAP8"] = HEAP8 = new Int8Array(buf);
      Module3["HEAP16"] = HEAP16 = new Int16Array(buf);
      Module3["HEAP32"] = HEAP32 = new Int32Array(buf);
      Module3["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
      Module3["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
      Module3["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
      Module3["HEAPF32"] = HEAPF32 = new Float32Array(buf);
      Module3["HEAPF64"] = HEAPF64 = new Float64Array(buf);
    }
    var TOTAL_STACK = 5242880;
    if (Module3["TOTAL_STACK"]) assert2(TOTAL_STACK === Module3["TOTAL_STACK"], "the stack size can no longer be determined at runtime");
    var INITIAL_MEMORY = Module3["INITIAL_MEMORY"] || 16777216;
    legacyModuleProp("INITIAL_MEMORY", "INITIAL_MEMORY");
    assert2(INITIAL_MEMORY >= TOTAL_STACK, "INITIAL_MEMORY should be larger than TOTAL_STACK, was " + INITIAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
    assert2(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0, "JS engine does not provide full typed array support");
    assert2(!Module3["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
    assert2(INITIAL_MEMORY == 16777216, "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
    var wasmTable;
    function writeStackCookie() {
      var max = _emscripten_stack_get_end();
      assert2((max & 3) == 0);
      HEAPU32[max >> 2] = 34821223;
      HEAPU32[max + 4 >> 2] = 2310721022;
      HEAPU32[0] = 1668509029;
    }
    function checkStackCookie() {
      if (ABORT) return;
      var max = _emscripten_stack_get_end();
      var cookie1 = HEAPU32[max >> 2];
      var cookie2 = HEAPU32[max + 4 >> 2];
      if (cookie1 != 34821223 || cookie2 != 2310721022) {
        abort("Stack overflow! Stack cookie has been overwritten at 0x" + max.toString(16) + ", expected hex dwords 0x89BACDFE and 0x2135467, but received 0x" + cookie2.toString(16) + " 0x" + cookie1.toString(16));
      }
      if (HEAPU32[0] !== 1668509029) abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
    }
    (function() {
      var h16 = new Int16Array(1);
      var h8 = new Int8Array(h16.buffer);
      h16[0] = 25459;
      if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
    })();
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    function preRun() {
      if (Module3["preRun"]) {
        if (typeof Module3["preRun"] == "function") Module3["preRun"] = [Module3["preRun"]];
        while (Module3["preRun"].length) {
          addOnPreRun(Module3["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      assert2(!runtimeInitialized);
      runtimeInitialized = true;
      checkStackCookie();
      callRuntimeCallbacks(__ATINIT__);
    }
    function postRun() {
      checkStackCookie();
      if (Module3["postRun"]) {
        if (typeof Module3["postRun"] == "function") Module3["postRun"] = [Module3["postRun"]];
        while (Module3["postRun"].length) {
          addOnPostRun(Module3["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    assert2(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert2(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert2(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert2(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    var runDependencyTracking = {};
    function addRunDependency(id) {
      runDependencies++;
      if (Module3["monitorRunDependencies"]) {
        Module3["monitorRunDependencies"](runDependencies);
      }
      if (id) {
        assert2(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
          runDependencyWatcher = setInterval(function() {
            if (ABORT) {
              clearInterval(runDependencyWatcher);
              runDependencyWatcher = null;
              return;
            }
            var shown = false;
            for (var dep in runDependencyTracking) {
              if (!shown) {
                shown = true;
                err("still waiting on run dependencies:");
              }
              err("dependency: " + dep);
            }
            if (shown) {
              err("(end of list)");
            }
          }, 1e4);
        }
      } else {
        err("warning: run dependency added without ID");
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module3["monitorRunDependencies"]) {
        Module3["monitorRunDependencies"](runDependencies);
      }
      if (id) {
        assert2(runDependencyTracking[id]);
        delete runDependencyTracking[id];
      } else {
        err("warning: run dependency removed without ID");
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      {
        if (Module3["onAbort"]) {
          Module3["onAbort"](what);
        }
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      EXITSTATUS = 1;
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var FS = { error: function() {
      abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");
    }, init: function() {
      FS.error();
    }, createDataFile: function() {
      FS.error();
    }, createPreloadedFile: function() {
      FS.error();
    }, createLazyFile: function() {
      FS.error();
    }, open: function() {
      FS.error();
    }, mkdev: function() {
      FS.error();
    }, registerDevice: function() {
      FS.error();
    }, analyzePath: function() {
      FS.error();
    }, loadFilesFromDB: function() {
      FS.error();
    }, ErrnoError: function ErrnoError() {
      FS.error();
    } };
    Module3["FS_createDataFile"] = FS.createDataFile;
    Module3["FS_createPreloadedFile"] = FS.createPreloadedFile;
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    function isFileURI(filename) {
      return filename.startsWith("file://");
    }
    function createExportWrapper(name, fixedasm) {
      return function() {
        var displayName = name;
        var asm2 = fixedasm;
        if (!fixedasm) {
          asm2 = Module3["asm"];
        }
        assert2(runtimeInitialized, "native function `" + displayName + "` called before runtime initialization");
        if (!asm2[name]) {
          assert2(asm2[name], "exported native function `" + displayName + "` not found");
        }
        return asm2[name].apply(null, arguments);
      };
    }
    var wasmBinaryFile;
    if (Module3["locateFile"]) {
      wasmBinaryFile = "MeshOptimizer.wasm";
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL("MeshOptimizer.wasm", import.meta.url).toString();
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) {
          return readBinary(file);
        }
        throw "both async and sync fetching of the wasm failed";
      } catch (err2) {
        abort(err2);
      }
    }
    function getBinaryPromise() {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(wasmBinaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile);
      });
    }
    function createWasm() {
      var info = { "env": asmLibraryArg, "wasi_snapshot_preview1": asmLibraryArg };
      function receiveInstance(instance, module) {
        var exports2 = instance.exports;
        Module3["asm"] = exports2;
        wasmMemory = Module3["asm"]["memory"];
        assert2(wasmMemory, "memory not found in wasm exports");
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module3["asm"]["__indirect_function_table"];
        assert2(wasmTable, "table not found in wasm exports");
        addOnInit(Module3["asm"]["__wasm_call_ctors"]);
        removeRunDependency("wasm-instantiate");
      }
      addRunDependency("wasm-instantiate");
      var trueModule = Module3;
      function receiveInstantiationResult(result) {
        assert2(Module3 === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
        trueModule = null;
        receiveInstance(result["instance"]);
      }
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(function(instance) {
          return instance;
        }).then(receiver, function(reason) {
          err("failed to asynchronously prepare wasm: " + reason);
          if (isFileURI(wasmBinaryFile)) {
            err("warning: Loading from a file URI (" + wasmBinaryFile + ") is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing");
          }
          abort(reason);
        });
      }
      function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(receiveInstantiationResult, function(reason) {
              err("wasm streaming compile failed: " + reason);
              err("falling back to ArrayBuffer instantiation");
              return instantiateArrayBuffer(receiveInstantiationResult);
            });
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiationResult);
        }
      }
      if (Module3["instantiateWasm"]) {
        try {
          var exports = Module3["instantiateWasm"](info, receiveInstance);
          return exports;
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          readyPromiseReject(e);
        }
      }
      instantiateAsync().catch(readyPromiseReject);
      return {};
    }
    var tempDouble;
    var tempI64;
    function ExitStatus(status) {
      this.name = "ExitStatus";
      this.message = "Program terminated with exit(" + status + ")";
      this.status = status;
    }
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        callbacks.shift()(Module3);
      }
    }
    function demangle(func) {
      warnOnce("warning: build with -sDEMANGLE_SUPPORT to link in libcxxabi demangling");
      return func;
    }
    function demangleAll(text) {
      var regex = /\b_Z[\w\d_]+/g;
      return text.replace(regex, function(x) {
        var y = demangle(x);
        return x === y ? x : y + " [" + x + "]";
      });
    }
    function jsStackTrace() {
      var error = new Error();
      if (!error.stack) {
        try {
          throw new Error();
        } catch (e) {
          error = e;
        }
        if (!error.stack) {
          return "(no stack trace available)";
        }
      }
      return error.stack.toString();
    }
    function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        err(text);
      }
    }
    function writeArrayToMemory(array, buffer2) {
      assert2(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
      HEAP8.set(array, buffer2);
    }
    function ___assert_fail(condition, filename, line, func) {
      abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
    }
    function _abort() {
      abort("native code called abort()");
    }
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    function getHeapMax() {
      return 2147483648;
    }
    function emscripten_realloc_buffer(size) {
      try {
        wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1;
      } catch (e) {
        err("emscripten_realloc_buffer: Attempted to grow heap from " + buffer.byteLength + " bytes to " + size + " bytes, but got error: " + e);
      }
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      assert2(requestedSize > oldSize);
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err("Cannot enlarge memory, asked to go up to " + requestedSize + " bytes, but the limit is " + maxHeapSize + " bytes!");
        return false;
      }
      let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
          return true;
        }
      }
      err("Failed to grow the heap from " + oldSize + " bytes to " + newSize + " bytes, not enough memory!");
      return false;
    }
    function getCFunc(ident) {
      var func = Module3["_" + ident];
      assert2(func, "Cannot call unknown function " + ident + ", make sure it is exported");
      return func;
    }
    function ccall(ident, returnType, argTypes, args, opts) {
      var toC = { "string": (str) => {
        var ret2 = 0;
        if (str !== null && str !== void 0 && str !== 0) {
          var len = (str.length << 2) + 1;
          ret2 = stackAlloc(len);
          stringToUTF8(str, ret2, len);
        }
        return ret2;
      }, "array": (arr) => {
        var ret2 = stackAlloc(arr.length);
        writeArrayToMemory(arr, ret2);
        return ret2;
      } };
      function convertReturnValue(ret2) {
        if (returnType === "string") {
          return UTF8ToString(ret2);
        }
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert2(returnType !== "array", 'Return type should not be "array".');
      if (args) {
        for (var i2 = 0; i2 < args.length; i2++) {
          var converter = toC[argTypes[i2]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i2] = converter(args[i2]);
          } else {
            cArgs[i2] = args[i2];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      function onDone(ret2) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      ret = onDone(ret);
      return ret;
    }
    function cwrap(ident, returnType, argTypes, opts) {
      return function() {
        return ccall(ident, returnType, argTypes, arguments, opts);
      };
    }
    function checkIncomingModuleAPI() {
      ignoredModuleProp("fetchSettings");
    }
    var asmLibraryArg = { "__assert_fail": ___assert_fail, "abort": _abort, "emscripten_memcpy_big": _emscripten_memcpy_big, "emscripten_resize_heap": _emscripten_resize_heap };
    var asm = createWasm();
    var ___wasm_call_ctors = Module3["___wasm_call_ctors"] = createExportWrapper("__wasm_call_ctors");
    var _meshopt_buildMeshletsBound = Module3["_meshopt_buildMeshletsBound"] = createExportWrapper("meshopt_buildMeshletsBound");
    var _meshopt_buildMeshlets = Module3["_meshopt_buildMeshlets"] = createExportWrapper("meshopt_buildMeshlets");
    var _meshopt_computeClusterBounds = Module3["_meshopt_computeClusterBounds"] = createExportWrapper("meshopt_computeClusterBounds");
    var _meshopt_simplify = Module3["_meshopt_simplify"] = createExportWrapper("meshopt_simplify");
    var _meshopt_simplifyWithAttributes = Module3["_meshopt_simplifyWithAttributes"] = createExportWrapper("meshopt_simplifyWithAttributes");
    var _meshopt_simplifyScale = Module3["_meshopt_simplifyScale"] = createExportWrapper("meshopt_simplifyScale");
    var _meshopt_generateVertexRemap = Module3["_meshopt_generateVertexRemap"] = createExportWrapper("meshopt_generateVertexRemap");
    var _meshopt_remapVertexBuffer = Module3["_meshopt_remapVertexBuffer"] = createExportWrapper("meshopt_remapVertexBuffer");
    var _meshopt_remapIndexBuffer = Module3["_meshopt_remapIndexBuffer"] = createExportWrapper("meshopt_remapIndexBuffer");
    var ___errno_location = Module3["___errno_location"] = createExportWrapper("__errno_location");
    var _fflush = Module3["_fflush"] = createExportWrapper("fflush");
    var _malloc = Module3["_malloc"] = createExportWrapper("malloc");
    var _emscripten_stack_init = Module3["_emscripten_stack_init"] = function() {
      return (_emscripten_stack_init = Module3["_emscripten_stack_init"] = Module3["asm"]["emscripten_stack_init"]).apply(null, arguments);
    };
    var _emscripten_stack_get_free = Module3["_emscripten_stack_get_free"] = function() {
      return (_emscripten_stack_get_free = Module3["_emscripten_stack_get_free"] = Module3["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
    };
    var _emscripten_stack_get_base = Module3["_emscripten_stack_get_base"] = function() {
      return (_emscripten_stack_get_base = Module3["_emscripten_stack_get_base"] = Module3["asm"]["emscripten_stack_get_base"]).apply(null, arguments);
    };
    var _emscripten_stack_get_end = Module3["_emscripten_stack_get_end"] = function() {
      return (_emscripten_stack_get_end = Module3["_emscripten_stack_get_end"] = Module3["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
    };
    var stackSave = Module3["stackSave"] = createExportWrapper("stackSave");
    var stackRestore = Module3["stackRestore"] = createExportWrapper("stackRestore");
    var stackAlloc = Module3["stackAlloc"] = createExportWrapper("stackAlloc");
    Module3["ccall"] = ccall;
    Module3["cwrap"] = cwrap;
    var unexportedRuntimeSymbols = ["run", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "addRunDependency", "removeRunDependency", "FS_createFolder", "FS_createPath", "FS_createDataFile", "FS_createPreloadedFile", "FS_createLazyFile", "FS_createLink", "FS_createDevice", "FS_unlink", "getLEB", "getFunctionTables", "alignFunctionTables", "registerFunctions", "prettyPrint", "getCompilerSetting", "print", "printErr", "callMain", "abort", "keepRuntimeAlive", "wasmMemory", "stackAlloc", "stackSave", "stackRestore", "getTempRet0", "setTempRet0", "writeStackCookie", "checkStackCookie", "ptrToString", "zeroMemory", "stringToNewUTF8", "exitJS", "getHeapMax", "emscripten_realloc_buffer", "ENV", "ERRNO_CODES", "ERRNO_MESSAGES", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "DNS", "getHostByName", "Protocols", "Sockets", "getRandomDevice", "warnOnce", "traverseStack", "UNWIND_CACHE", "convertPCtoSourceLocation", "readAsmConstArgsArray", "readAsmConstArgs", "mainThreadEM_ASM", "jstoi_q", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "handleException", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getCFunc", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "freeTableIndexes", "functionsInTableMap", "getEmptyTableSlot", "updateTableMap", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "setValue", "getValue", "PATH", "PATH_FS", "intArrayFromString", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16Decoder", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "allocateUTF8", "allocateUTF8OnStack", "writeStringToMemory", "writeArrayToMemory", "writeAsciiToMemory", "SYSCALLS", "getSocketFromFD", "getSocketAddress", "JSEvents", "registerKeyEventCallback", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "currentFullscreenStrategy", "restoreOldWindowedStyle", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "demangle", "demangleAll", "jsStackTrace", "stackTrace", "ExitStatus", "getEnvStrings", "checkWasiClock", "flush_NO_FILESYSTEM", "dlopenMissingError", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "exception_addRef", "exception_decRef", "Browser", "setMainLoop", "wget", "FS", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "_setNetworkCallback", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "GL", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "AL", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "SDL", "SDL_gfx", "GLUT", "EGL", "GLFW_Window", "GLFW", "GLEW", "IDBStore", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate"];
    unexportedRuntimeSymbols.forEach(unexportedRuntimeSymbol);
    var missingLibrarySymbols = ["ptrToString", "zeroMemory", "stringToNewUTF8", "exitJS", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "getHostByName", "getRandomDevice", "traverseStack", "convertPCtoSourceLocation", "readAsmConstArgs", "mainThreadEM_ASM", "jstoi_q", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "intArrayFromString", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "allocateUTF8", "allocateUTF8OnStack", "writeStringToMemory", "writeAsciiToMemory", "getSocketFromFD", "getSocketAddress", "registerKeyEventCallback", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "getEnvStrings", "checkWasiClock", "flush_NO_FILESYSTEM", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "ExceptionInfo", "exception_addRef", "exception_decRef", "setMainLoop", "_setNetworkCallback", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "GLFW_Window", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate"];
    missingLibrarySymbols.forEach(missingLibrarySymbol);
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function stackCheckInit() {
      _emscripten_stack_init();
      writeStackCookie();
    }
    function run(args) {
      args = args || arguments_;
      if (runDependencies > 0) {
        return;
      }
      stackCheckInit();
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module3["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module3);
        if (Module3["onRuntimeInitialized"]) Module3["onRuntimeInitialized"]();
        assert2(!Module3["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
        postRun();
      }
      if (Module3["setStatus"]) {
        Module3["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module3["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
      checkStackCookie();
    }
    if (Module3["preInit"]) {
      if (typeof Module3["preInit"] == "function") Module3["preInit"] = [Module3["preInit"]];
      while (Module3["preInit"].length > 0) {
        Module3["preInit"].pop()();
      }
    }
    run();
    return Module3.ready;
  };
})();
var MeshOptimizer_default = Module;

// src/plugins/meshlets/Meshoptimizer.ts
var attribute_size = 8;
var Meshoptimizer = class _Meshoptimizer {
  static module;
  static isLoaded = false;
  static kMeshletMaxTriangles = 512;
  static async load() {
    if (!_Meshoptimizer.module) {
      _Meshoptimizer.module = await MeshOptimizer_default();
      this.isLoaded = true;
    }
  }
  static buildNeighbors(meshlets, meshlet_vertices_result) {
    const vertex_to_meshlets = [];
    for (let i2 = 0; i2 < meshlets.length; i2++) {
      const meshlet = meshlets[i2];
      const meshlet_vertices = meshlet_vertices_result.slice(meshlet.vertex_offset, meshlet.vertex_offset + meshlet.vertex_count);
      for (let j = 0; j < meshlet_vertices.length; j++) {
        if (!vertex_to_meshlets[meshlet_vertices[j]]) vertex_to_meshlets[meshlet_vertices[j]] = { count: 0, meshlets: [] };
        vertex_to_meshlets[meshlet_vertices[j]].count++;
        vertex_to_meshlets[meshlet_vertices[j]].meshlets.push(i2);
      }
    }
    const neighbors = Array.from({ length: meshlets.length }, () => /* @__PURE__ */ new Set());
    for (const v of vertex_to_meshlets) {
      const meshletArray = v.meshlets;
      for (let i2 = 0; i2 < meshletArray.length; i2++) {
        for (let j = i2 + 1; j < meshletArray.length; j++) {
          neighbors[meshletArray[i2]].add(meshletArray[j]);
          neighbors[meshletArray[j]].add(meshletArray[i2]);
        }
      }
    }
    return neighbors.map((set) => [...set]);
  }
  static meshopt_buildMeshlets(vertices, indices, max_vertices, max_triangles, cone_weight) {
    if (!this.isLoaded) throw Error("Library not loaded");
    const MeshOptmizer = _Meshoptimizer.module;
    function rebuildMeshlets(data) {
      let meshlets2 = [];
      for (let i2 = 0; i2 < data.length; i2 += 4) {
        meshlets2.push({
          vertex_offset: data[i2 + 0],
          triangle_offset: data[i2 + 1],
          vertex_count: data[i2 + 2],
          triangle_count: data[i2 + 3]
        });
      }
      return meshlets2;
    }
    const max_meshlets = WASMHelper.call(MeshOptmizer, "meshopt_buildMeshletsBound", "number", indices.length, max_vertices, max_triangles);
    const meshlets = new WASMPointer(new Uint32Array(max_meshlets * 4), "out");
    const meshlet_vertices = new WASMPointer(new Uint32Array(max_meshlets * max_vertices), "out");
    const meshlet_triangles = new WASMPointer(new Uint8Array(max_meshlets * max_triangles * 3), "out");
    const meshletCount = WASMHelper.call(
      MeshOptmizer,
      "meshopt_buildMeshlets",
      "number",
      meshlets,
      meshlet_vertices,
      meshlet_triangles,
      new WASMPointer(Uint32Array.from(indices)),
      indices.length,
      new WASMPointer(Float32Array.from(vertices)),
      vertices.length / attribute_size,
      attribute_size * Float32Array.BYTES_PER_ELEMENT,
      max_vertices,
      max_triangles,
      cone_weight
    );
    const meshlets_result = rebuildMeshlets(meshlets.data).slice(0, meshletCount);
    const output = {
      meshlets_count: meshletCount,
      meshlets_result: meshlets_result.slice(0, meshletCount),
      meshlet_vertices_result: new Uint32Array(meshlet_vertices.data),
      meshlet_triangles_result: new Uint8Array(meshlet_triangles.data)
    };
    return output;
  }
  static meshopt_computeClusterBounds(vertices, indices) {
    if (!this.isLoaded) throw Error("Library not loaded");
    const MeshOptmizer = _Meshoptimizer.module;
    const boundsDataPtr = new WASMPointer(new Float32Array(16), "out");
    WASMHelper.call(
      MeshOptmizer,
      "meshopt_computeClusterBounds",
      "number",
      boundsDataPtr,
      new WASMPointer(Uint32Array.from(indices)),
      indices.length,
      new WASMPointer(Float32Array.from(vertices)),
      vertices.length / attribute_size,
      attribute_size * Float32Array.BYTES_PER_ELEMENT
    );
    const boundsData = boundsDataPtr.data;
    return {
      // /* bounding sphere, useful for frustum and occlusion culling */
      center: new Vector3(boundsData[0], boundsData[1], boundsData[2]),
      // center: Vector3; // float center[3];
      radius: boundsData[3],
      // float radius;
      // /* normal cone, useful for backface culling */
      cone_apex: new Vector3(boundsData[4], boundsData[5], boundsData[6]),
      // float cone_apex[3];
      cone_axis: new Vector3(boundsData[7], boundsData[8], boundsData[9]),
      // float cone_axis[3];
      cone_cutoff: boundsData[10]
      // float cone_cutoff; /* = cos(angle/2) */
      // // /* normal cone axis and cutoff, stored in 8-bit SNORM format; decode using x/127.0 */
      // cone_axis_s8: new Vector3(boundsData[11], boundsData[12], boundsData[13]), // signed char cone_axis_s8[3];
      // cone_cutoff_s8: new Vector3(boundsData[14], boundsData[15], boundsData[16]) // signed char cone_cutoff_s8;
    };
  }
  static clean(meshlet) {
    const MeshOptmizer = _Meshoptimizer.module;
    const remap = new WASMPointer(new Uint32Array(meshlet.indices.length * attribute_size), "out");
    const indices = new WASMPointer(new Uint32Array(meshlet.indices), "in");
    const vertices = new WASMPointer(new Float32Array(meshlet.vertices), "in");
    const vertex_count = WASMHelper.call(
      MeshOptmizer,
      "meshopt_generateVertexRemap",
      "number",
      remap,
      indices,
      meshlet.indices.length,
      vertices,
      meshlet.vertices.length / attribute_size,
      attribute_size * Float32Array.BYTES_PER_ELEMENT
    );
    const indices_remapped = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
    WASMHelper.call(
      MeshOptmizer,
      "meshopt_remapIndexBuffer",
      "number",
      indices_remapped,
      indices,
      meshlet.indices.length,
      remap
    );
    const vertices_remapped = new WASMPointer(new Float32Array(vertex_count * attribute_size), "out");
    WASMHelper.call(
      MeshOptmizer,
      "meshopt_remapVertexBuffer",
      "number",
      vertices_remapped,
      vertices,
      meshlet.vertices.length / attribute_size,
      attribute_size * Float32Array.BYTES_PER_ELEMENT,
      remap
    );
    return new Meshlet2(new Float32Array(vertices_remapped.data), new Uint32Array(indices_remapped.data));
  }
  static meshopt_simplify(meshlet, target_count, target_error = 1) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
    const meshopt_SimplifyLockBorder2 = 1 << 0;
    const meshopt_SimplifySparse2 = 1 << 1;
    const meshopt_SimplifyErrorAbsolute2 = 1 << 2;
    const options = meshopt_SimplifyLockBorder2 | meshopt_SimplifySparse2;
    const simplified_index_count = WASMHelper.call(
      MeshOptmizer,
      "meshopt_simplify",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer(new Uint32Array(meshlet.indices)),
      // const unsigned int* indices,
      meshlet.indices.length,
      // size_t index_count,
      new WASMPointer(new Float32Array(meshlet.vertices)),
      // const float* vertex_positions,
      meshlet.vertices.length / attribute_size,
      // size_t vertex_count,
      attribute_size * Float32Array.BYTES_PER_ELEMENT,
      // size_t vertex_positions_stride,
      target_count,
      // size_t target_index_count,
      target_error,
      // float target_error, Should be 0.01 but cant reach 128 triangles with it
      1,
      // unsigned int options, preserve borders
      result_error
      // float* result_error
    );
    const destination_resized = destination.data.slice(0, simplified_index_count);
    return {
      error: result_error.data[0],
      meshlet: new Meshlet2(meshlet.vertices, destination_resized)
    };
  }
  static meshopt_simplifyWithAttributes(meshlet, vertex_lock_array, target_count, target_error = 1) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
    const meshopt_SimplifyLockBorder2 = 1 << 0;
    const meshopt_SimplifySparse2 = 1 << 1;
    const meshopt_SimplifyErrorAbsolute2 = 1 << 2;
    const options = meshopt_SimplifySparse2;
    const vertex_lock = vertex_lock_array === null ? null : new WASMPointer(vertex_lock_array, "in");
    const simplified_index_count = WASMHelper.call(
      MeshOptmizer,
      "meshopt_simplifyWithAttributes",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer(new Uint32Array(meshlet.indices)),
      // const unsigned int* indices,
      meshlet.indices.length,
      // size_t index_count,
      new WASMPointer(new Float32Array(meshlet.vertices)),
      // const float* vertex_positions,
      meshlet.vertices.length / attribute_size,
      // size_t vertex_count,
      attribute_size * Float32Array.BYTES_PER_ELEMENT,
      // size_t vertex_positions_stride,
      null,
      0,
      null,
      0,
      vertex_lock,
      target_count,
      // size_t target_index_count,
      target_error,
      // float target_error, Should be 0.01 but cant reach 128 triangles with it
      options,
      // unsigned int options, preserve borders
      result_error
      // float* result_error
    );
    const destination_resized = destination.data.slice(0, simplified_index_count);
    return {
      error: result_error.data[0],
      meshlet: new Meshlet2(meshlet.vertices, destination_resized)
    };
  }
  // ib, ib, 24, vb, 9, 12, NULL, 0, NULL, 0, lock, 3, 1e-3f, 0
  static meshopt_simplifyWithAttributesRaw(indices, a, vertices, b, c, d, e, f, g, lock, target_count, target_error, options) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(indices.length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
    const vertex_lock = new WASMPointer(lock, "in");
    const simplified_index_count = WASMHelper.call(
      MeshOptmizer,
      "meshopt_simplifyWithAttributes",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer(new Uint32Array(indices)),
      // const unsigned int* indices,
      a,
      // size_t index_count,
      new WASMPointer(new Float32Array(vertices)),
      // const float* vertex_positions,
      b,
      // size_t vertex_count,
      c,
      d,
      e,
      f,
      g,
      vertex_lock,
      target_count,
      // size_t target_index_count,
      target_error,
      // float target_error, Should be 0.01 but cant reach 128 triangles with it
      options,
      // unsigned int options, preserve borders
      result_error
      // float* result_error
    );
    const destination_resized = destination.data.slice(0, simplified_index_count);
    return destination_resized;
  }
  static meshopt_simplifyScale(meshlet) {
    const MeshOptmizer = _Meshoptimizer.module;
    const vertices = new WASMPointer(new Float32Array(meshlet.vertices), "in");
    const scale = WASMHelper.call(
      MeshOptmizer,
      "meshopt_simplifyScale",
      "number",
      vertices,
      meshlet.vertices.length / attribute_size,
      attribute_size * Float32Array.BYTES_PER_ELEMENT
    );
    return scale;
  }
};

// src/plugins/meshlets/Meshlet.ts
var Meshlet2 = class _Meshlet {
  static max_triangles = 128;
  static max_vertices = 255;
  vertices;
  indices;
  id = Utils.UUID();
  lod;
  children;
  parents;
  _boundingVolume;
  get boundingVolume() {
    if (!this._boundingVolume) this._boundingVolume = Sphere.fromVertices(this.vertices, this.indices, attribute_size);
    return this._boundingVolume;
  }
  set boundingVolume(boundingVolume) {
    this._boundingVolume = boundingVolume;
  }
  // public boundingVolume: Sphere;
  parentBoundingVolume;
  parentError = Infinity;
  clusterError = 0;
  vertices_gpu;
  crc;
  bounds;
  interleaved;
  coneBounds;
  constructor(vertices, indices) {
    this.vertices = vertices;
    this.indices = indices;
    this.lod = 0;
    this.children = [];
    this.parents = [];
    this.bounds = BoundingVolume.FromVertices(this.vertices);
    if (this.indices.length / 3 < Meshoptimizer.kMeshletMaxTriangles) {
      const coneBounds = Meshoptimizer.meshopt_computeClusterBounds(this.vertices, this.indices);
      this.coneBounds = { cone_apex: coneBounds.cone_apex, cone_axis: coneBounds.cone_axis, cone_cutoff: coneBounds.cone_cutoff };
    }
    const verticesNonIndexed = _Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 0);
    const normalsNonIndexed = _Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 3);
    const uvsNonIndexed = _Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 2, true, 8, 6);
    const interleaved = InterleavedVertexAttribute.fromArrays([verticesNonIndexed, normalsNonIndexed, uvsNonIndexed], [3, 3, 2]);
    const verticesGPU = [];
    for (let i2 = 0; i2 < interleaved.array.length; i2 += 8) {
      verticesGPU.push(
        interleaved.array[i2 + 0],
        interleaved.array[i2 + 1],
        interleaved.array[i2 + 2],
        interleaved.array[i2 + 3],
        interleaved.array[i2 + 4],
        interleaved.array[i2 + 5],
        interleaved.array[i2 + 6],
        interleaved.array[i2 + 7]
      );
    }
    this.interleaved = interleaved;
    this.vertices_gpu = new Float32Array(_Meshlet.max_triangles * (3 + 3 + 2) * 3);
    this.vertices_gpu.set(verticesGPU.slice(0, _Meshlet.max_triangles * (3 + 3 + 2) * 3));
    this.crc = CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
  }
  static convertBufferAttributeToNonIndexed(attribute, indices, itemSize, isInterleaved = false, stride = 3, offset = 0) {
    if (!attribute) throw Error("Invalid attribute");
    const array = attribute;
    const array2 = new Float32Array(indices.length * itemSize);
    let index = 0, index2 = 0;
    for (let i2 = 0, l = indices.length; i2 < l; i2++) {
      if (isInterleaved === true) index = indices[i2] * stride + offset;
      else index = indices[i2] * itemSize;
      for (let j = 0; j < itemSize; j++) {
        array2[index2++] = array[index++];
      }
    }
    return array2;
  }
};

// src/plugins/meshlets_v2/passes/IndirectGBufferPass.ts
var IndirectGBufferPass = class extends RenderPass {
  name = "IndirectGBufferPass";
  shader;
  geometry;
  constructor() {
    super({
      inputs: [
        PassParams.DebugSettings,
        PassParams.depthTexture,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth,
        MeshletPassParams.indirectVertices,
        MeshletPassParams.indirectInstanceInfo,
        MeshletPassParams.indirectMeshInfo,
        MeshletPassParams.indirectObjectInfo,
        MeshletPassParams.indirectMeshMatrixInfo,
        MeshletPassParams.indirectDrawBuffer,
        MeshletPassParams.textureMaps,
        MeshletPassParams.isCullingPrepass,
        MeshletPassParams.meshletSettings
      ],
      outputs: []
    });
  }
  async init(resources) {
    this.shader = await Shader.Create({
      code: await ShaderLoader.DrawIndirect,
      colorOutputs: [
        { format: "rgba16float" },
        { format: "rgba16float" },
        { format: "rgba16float" }
      ],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        viewMatrix: { group: 0, binding: 0, type: "storage" },
        projectionMatrix: { group: 0, binding: 1, type: "storage" },
        instanceInfo: { group: 0, binding: 2, type: "storage" },
        meshMaterialInfo: { group: 0, binding: 3, type: "storage" },
        meshMatrixInfo: { group: 0, binding: 4, type: "storage" },
        objectInfo: { group: 0, binding: 5, type: "storage" },
        settings: { group: 0, binding: 6, type: "storage" },
        vertices: { group: 0, binding: 7, type: "storage" },
        textureSampler: { group: 0, binding: 8, type: "sampler" },
        albedoMaps: { group: 0, binding: 9, type: "texture" },
        normalMaps: { group: 0, binding: 10, type: "texture" },
        heightMaps: { group: 0, binding: 11, type: "texture" },
        metalnessMaps: { group: 0, binding: 12, type: "texture" },
        emissiveMaps: { group: 0, binding: 13, type: "texture" },
        meshletSettings: { group: 0, binding: 14, type: "storage" }
      }
    });
    this.geometry = new Geometry();
    this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(Meshlet2.max_triangles * 3)));
    const materialSampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", materialSampler);
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const inputIndirectVertices = resources.getResource(MeshletPassParams.indirectVertices);
    const inputIndirectMeshInfo = resources.getResource(MeshletPassParams.indirectMeshInfo);
    const inputIndirectObjectInfo = resources.getResource(MeshletPassParams.indirectObjectInfo);
    const inputIndirectMeshMatrixInfo = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo);
    const inputIndirectInstanceInfo = resources.getResource(MeshletPassParams.indirectInstanceInfo);
    const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.indirectDrawBuffer);
    const textureMaps = resources.getResource(MeshletPassParams.textureMaps);
    if (!inputIndirectVertices) return;
    if (!inputIndirectInstanceInfo) return;
    const mainCamera = Camera.mainCamera;
    this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
    this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
    this.shader.SetBuffer("vertices", inputIndirectVertices);
    this.shader.SetBuffer("meshMaterialInfo", inputIndirectMeshInfo);
    this.shader.SetBuffer("objectInfo", inputIndirectObjectInfo);
    this.shader.SetBuffer("meshMatrixInfo", inputIndirectMeshMatrixInfo);
    this.shader.SetBuffer("instanceInfo", inputIndirectInstanceInfo);
    if (textureMaps.albedo) this.shader.SetTexture("albedoMaps", textureMaps.albedo);
    if (textureMaps.normal) this.shader.SetTexture("normalMaps", textureMaps.normal);
    if (textureMaps.height) this.shader.SetTexture("heightMaps", textureMaps.height);
    if (textureMaps.metalness) this.shader.SetTexture("metalnessMaps", textureMaps.metalness);
    if (textureMaps.emissive) this.shader.SetTexture("emissiveMaps", textureMaps.emissive);
    this.shader.SetArray("settings", resources.getResource(PassParams.DebugSettings));
    this.shader.SetArray("meshletSettings", resources.getResource(MeshletPassParams.meshletSettings));
    const gBufferAlbedoRT = resources.getResource(PassParams.GBufferAlbedo);
    const gBufferNormalRT = resources.getResource(PassParams.GBufferNormal);
    const gBufferERMORT = resources.getResource(PassParams.GBufferERMO);
    const gBufferDepthRT = resources.getResource(PassParams.GBufferDepth);
    const colorTargets = [
      { target: gBufferAlbedoRT, clear: true },
      { target: gBufferNormalRT, clear: true },
      { target: gBufferERMORT, clear: true }
    ];
    RendererContext.BeginRenderPass(`IGBuffer - prepass: ${1}`, colorTargets, { target: gBufferDepthRT, clear: true }, true);
    RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer);
    RendererContext.EndRenderPass();
  }
};

// src/plugins/meshlets_v2/MeshletEvents.ts
var MeshletEvents = class {
  static Updated = (meshlet) => {
  };
};

// src/plugins/meshlets_v2/nv_cluster_lod_builder/meshoptimizer/WASMHelper.ts
var WASMPointer2 = class {
  data;
  ptr;
  type;
  constructor(data, type = "in") {
    this.data = data;
    this.ptr = null;
    this.type = type;
  }
};
var WASMHelper2 = class _WASMHelper {
  static TYPES = {
    i8: { array: Int8Array, heap: "HEAP8" },
    i16: { array: Int16Array, heap: "HEAP16" },
    i32: { array: Int32Array, heap: "HEAP32" },
    f32: { array: Float32Array, heap: "HEAPF32" },
    f64: { array: Float64Array, heap: "HEAPF64" },
    u8: { array: Uint8Array, heap: "HEAPU8" },
    u16: { array: Uint16Array, heap: "HEAPU16" },
    u32: { array: Uint32Array, heap: "HEAPU32" }
  };
  static getTypeForArray(array) {
    if (array instanceof Int8Array) return this.TYPES.i8;
    else if (array instanceof Int16Array) return this.TYPES.i16;
    else if (array instanceof Int32Array) return this.TYPES.i32;
    else if (array instanceof Uint8Array) return this.TYPES.u8;
    else if (array instanceof Uint16Array) return this.TYPES.u16;
    else if (array instanceof Uint32Array) return this.TYPES.u32;
    else if (array instanceof Float32Array) return this.TYPES.f32;
    else if (array instanceof Float64Array) return this.TYPES.f64;
    console.log(array);
    throw Error("Array has no type");
  }
  static transferNumberArrayToHeap(module, array) {
    const type = this.getTypeForArray(array);
    const typedArray = type.array.from(array);
    const heapPointer = module._malloc(
      typedArray.length * typedArray.BYTES_PER_ELEMENT
    );
    if (type.heap === "HEAPU8") module[type.heap].set(typedArray, heapPointer);
    else module[type.heap].set(typedArray, heapPointer >> 2);
    return heapPointer;
  }
  static getDataFromHeapU8(module, address, type, length) {
    return module[type.heap].slice(address, address + length);
  }
  static getDataFromHeap(module, address, type, length) {
    return module[type.heap].slice(address >> 2, (address >> 2) + length);
  }
  static getArgumentTypes(args) {
    let argTypes = [];
    for (let i2 = 0; i2 < args.length; i2++) {
      const arg = args[i2];
      if (arg instanceof Uint8Array) argTypes.push("number");
      else if (arg instanceof Uint16Array) argTypes.push("number");
      else if (arg instanceof Uint32Array) argTypes.push("number");
      else if (arg instanceof Int8Array) argTypes.push("number");
      else if (arg instanceof Int16Array) argTypes.push("number");
      else if (arg instanceof Int32Array) argTypes.push("number");
      else if (arg instanceof Float32Array) argTypes.push("number");
      else if (arg instanceof Float64Array) argTypes.push("number");
      else if (typeof arg === "string") argTypes.push("string");
      else argTypes.push("number");
    }
    return argTypes;
  }
  static transferArguments(module, args) {
    let method_args = [];
    for (let i2 = 0; i2 < args.length; i2++) {
      const arg = args[i2];
      if (arg instanceof WASMPointer2) {
        arg.ptr = _WASMHelper.transferNumberArrayToHeap(module, arg.data);
        method_args.push(arg.ptr);
      } else method_args.push(args[i2]);
    }
    return method_args;
  }
  static getOutputArguments(module, args) {
    for (let i2 = 0; i2 < args.length; i2++) {
      const arg = args[i2];
      if (!(arg instanceof WASMPointer2)) continue;
      if (arg.ptr === null) continue;
      if (arg.type === "in") continue;
      const type = _WASMHelper.getTypeForArray(arg.data);
      if (type === this.TYPES.u8) {
        arg.data = _WASMHelper.getDataFromHeapU8(module, arg.ptr, type, arg.data.length);
      } else {
        arg.data = _WASMHelper.getDataFromHeap(module, arg.ptr, type, arg.data.length);
      }
    }
  }
  static call(module, method, returnType, ...args) {
    let method_args = _WASMHelper.transferArguments(module, args);
    const method_arg_types = _WASMHelper.getArgumentTypes(args);
    const ret = module.ccall(
      method,
      returnType,
      method_arg_types,
      method_args
    );
    _WASMHelper.getOutputArguments(module, args);
    return ret;
  }
};

// src/plugins/meshlets_v2/nv_cluster_lod_builder/meshoptimizer/MeshOptimizerModule.js
var Module2 = (() => {
  var _scriptDir = import.meta.url;
  return function(Module3) {
    Module3 = Module3 || {};
    var Module3 = typeof Module3 != "undefined" ? Module3 : {};
    var readyPromiseResolve, readyPromiseReject;
    Module3["ready"] = new Promise(function(resolve, reject) {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
    ["_malloc", "_meshopt_simplifyWithAttributes", "_meshopt_simplifySloppy", "_meshopt_generateShadowIndexBuffer", "_fflush", "onRuntimeInitialized"].forEach((prop) => {
      if (!Object.getOwnPropertyDescriptor(Module3["ready"], prop)) {
        Object.defineProperty(Module3["ready"], prop, { get: () => abort("You are getting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js"), set: () => abort("You are setting " + prop + " on the Promise object, instead of the instance. Use .then() to get called back with the instance, see the MODULARIZE docs in src/settings.js") });
      }
    });
    var moduleOverrides = Object.assign({}, Module3);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof importScripts == "function";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && typeof process.versions == "object" && typeof process.versions.node == "string";
    var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    if (Module3["ENVIRONMENT"]) {
      throw new Error("Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)");
    }
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module3["locateFile"]) {
        return Module3["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var read_, readAsync, readBinary, setWindowTitle;
    function logExceptionOnExit(e) {
      if (e instanceof ExitStatus) return;
      let toLog = e;
      if (e && typeof e == "object" && e.stack) {
        toLog = [e, e.stack];
      }
      err("exiting due to exception: " + toLog);
    }
    if (ENVIRONMENT_IS_NODE) {
      if (typeof process == "undefined" || !process.release || process.release.name !== "node") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = __require("path").dirname(scriptDirectory) + "/";
      } else {
        scriptDirectory = __dirname + "/";
      }
      var fs;
      var nodePath;
      var requireNodeFS = () => {
        if (!nodePath) {
          fs = __require("fs");
          nodePath = __require("path");
        }
      };
      read_ = (filename, binary) => {
        var ret = tryParseAsDataURI(filename);
        if (ret) {
          return binary ? ret : ret.toString();
        }
        requireNodeFS();
        filename = nodePath["normalize"](filename);
        return fs.readFileSync(filename, binary ? void 0 : "utf8");
      };
      readBinary = (filename) => {
        var ret = read_(filename, true);
        if (!ret.buffer) {
          ret = new Uint8Array(ret);
        }
        assert2(ret.buffer);
        return ret;
      };
      readAsync = (filename, onload, onerror) => {
        var ret = tryParseAsDataURI(filename);
        if (ret) {
          onload(ret);
        }
        requireNodeFS();
        filename = nodePath["normalize"](filename);
        fs.readFile(filename, function(err2, data) {
          if (err2) onerror(err2);
          else onload(data.buffer);
        });
      };
      if (process["argv"].length > 1) {
        thisProgram = process["argv"][1].replace(/\\/g, "/");
      }
      arguments_ = process["argv"].slice(2);
      process["on"]("uncaughtException", function(ex) {
        if (!(ex instanceof ExitStatus)) {
          throw ex;
        }
      });
      process["on"]("unhandledRejection", function(reason) {
        throw reason;
      });
      quit_ = (status, toThrow) => {
        if (keepRuntimeAlive()) {
          process["exitCode"] = status;
          throw toThrow;
        }
        logExceptionOnExit(toThrow);
        process["exit"](status);
      };
      Module3["inspect"] = function() {
        return "[Emscripten Module object]";
      };
    } else if (ENVIRONMENT_IS_SHELL) {
      if (typeof process == "object" && typeof __require === "function" || typeof window == "object" || typeof importScripts == "function") throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      if (typeof read != "undefined") {
        read_ = function shell_read(f) {
          const data = tryParseAsDataURI(f);
          if (data) {
            return intArrayToString(data);
          }
          return read(f);
        };
      }
      readBinary = function readBinary2(f) {
        let data;
        data = tryParseAsDataURI(f);
        if (data) {
          return data;
        }
        if (typeof readbuffer == "function") {
          return new Uint8Array(readbuffer(f));
        }
        data = read(f, "binary");
        assert2(typeof data == "object");
        return data;
      };
      readAsync = function readAsync2(f, onload, onerror) {
        setTimeout(() => onload(readBinary(f)), 0);
      };
      if (typeof scriptArgs != "undefined") {
        arguments_ = scriptArgs;
      } else if (typeof arguments != "undefined") {
        arguments_ = arguments;
      }
      if (typeof quit == "function") {
        quit_ = (status, toThrow) => {
          logExceptionOnExit(toThrow);
          quit(status);
        };
      }
      if (typeof print != "undefined") {
        if (typeof console == "undefined") console = {};
        console.log = print;
        console.warn = console.error = typeof printErr != "undefined" ? printErr : print;
      }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (typeof document != "undefined" && document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf("blob:") !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.replace(/[?#].*/, "").lastIndexOf("/") + 1);
      } else {
        scriptDirectory = "";
      }
      if (!(typeof window == "object" || typeof importScripts == "function")) throw new Error("not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)");
      {
        read_ = (url) => {
          try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.send(null);
            return xhr.responseText;
          } catch (err2) {
            var data = tryParseAsDataURI(url);
            if (data) {
              return intArrayToString(data);
            }
            throw err2;
          }
        };
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = (url) => {
            try {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, false);
              xhr.responseType = "arraybuffer";
              xhr.send(null);
              return new Uint8Array(xhr.response);
            } catch (err2) {
              var data = tryParseAsDataURI(url);
              if (data) {
                return data;
              }
              throw err2;
            }
          };
        }
        readAsync = (url, onload, onerror) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, true);
          xhr.responseType = "arraybuffer";
          xhr.onload = () => {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
              onload(xhr.response);
              return;
            }
            var data = tryParseAsDataURI(url);
            if (data) {
              onload(data.buffer);
              return;
            }
            onerror();
          };
          xhr.onerror = onerror;
          xhr.send(null);
        };
      }
      setWindowTitle = (title) => document.title = title;
    } else {
      throw new Error("environment detection error");
    }
    var out = Module3["print"] || console.log.bind(console);
    var err = Module3["printErr"] || console.warn.bind(console);
    Object.assign(Module3, moduleOverrides);
    moduleOverrides = null;
    checkIncomingModuleAPI();
    if (Module3["arguments"]) arguments_ = Module3["arguments"];
    legacyModuleProp("arguments", "arguments_");
    if (Module3["thisProgram"]) thisProgram = Module3["thisProgram"];
    legacyModuleProp("thisProgram", "thisProgram");
    if (Module3["quit"]) quit_ = Module3["quit"];
    legacyModuleProp("quit", "quit_");
    assert2(typeof Module3["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
    assert2(typeof Module3["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");
    assert2(typeof Module3["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
    assert2(typeof Module3["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
    assert2(typeof Module3["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify setWindowTitle in JS)");
    assert2(typeof Module3["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
    legacyModuleProp("read", "read_");
    legacyModuleProp("readAsync", "readAsync");
    legacyModuleProp("readBinary", "readBinary");
    legacyModuleProp("setWindowTitle", "setWindowTitle");
    assert2(!ENVIRONMENT_IS_WORKER, "worker environment detected but not enabled at build time.  Add 'worker' to `-sENVIRONMENT` to enable.");
    assert2(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");
    var POINTER_SIZE = 4;
    function legacyModuleProp(prop, newName) {
      if (!Object.getOwnPropertyDescriptor(Module3, prop)) {
        Object.defineProperty(Module3, prop, { configurable: true, get: function() {
          abort("Module." + prop + " has been replaced with plain " + newName + " (the initial value can be provided on Module, but after startup the value is only looked for on a local variable of that name)");
        } });
      }
    }
    function ignoredModuleProp(prop) {
      if (Object.getOwnPropertyDescriptor(Module3, prop)) {
        abort("`Module." + prop + "` was supplied but `" + prop + "` not included in INCOMING_MODULE_JS_API");
      }
    }
    function isExportedByForceFilesystem(name) {
      return name === "FS_createPath" || name === "FS_createDataFile" || name === "FS_createPreloadedFile" || name === "FS_unlink" || name === "addRunDependency" || name === "FS_createLazyFile" || name === "FS_createDevice" || name === "removeRunDependency";
    }
    function missingLibrarySymbol(sym) {
      if (typeof globalThis !== "undefined" && !Object.getOwnPropertyDescriptor(globalThis, sym)) {
        Object.defineProperty(globalThis, sym, { configurable: true, get: function() {
          var msg = "`" + sym + "` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line";
          if (isExportedByForceFilesystem(sym)) {
            msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
          }
          warnOnce(msg);
          return void 0;
        } });
      }
    }
    function unexportedRuntimeSymbol(sym) {
      if (!Object.getOwnPropertyDescriptor(Module3, sym)) {
        Object.defineProperty(Module3, sym, { configurable: true, get: function() {
          var msg = "'" + sym + "' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the FAQ)";
          if (isExportedByForceFilesystem(sym)) {
            msg += ". Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you";
          }
          abort(msg);
        } });
      }
    }
    var wasmBinary;
    if (Module3["wasmBinary"]) wasmBinary = Module3["wasmBinary"];
    legacyModuleProp("wasmBinary", "wasmBinary");
    var noExitRuntime = Module3["noExitRuntime"] || true;
    legacyModuleProp("noExitRuntime", "noExitRuntime");
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert2(condition, text) {
      if (!condition) {
        abort("Assertion failed" + (text ? ": " + text : ""));
      }
    }
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder("utf8") : void 0;
    function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          if ((u0 & 248) != 240) warnOnce("Invalid UTF-8 leading byte 0x" + u0.toString(16) + " encountered when deserializing a UTF-8 string in wasm memory to a JS string!");
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
    }
    function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var u = str.charCodeAt(i2);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i2);
          u = 65536 + ((u & 1023) << 10) | u1 & 1023;
        }
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 1114111) warnOnce("Invalid Unicode code point 0x" + u.toString(16) + " encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).");
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }
    function stringToUTF8(str, outPtr, maxBytesToWrite) {
      assert2(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateGlobalBufferAndViews(buf) {
      buffer = buf;
      Module3["HEAP8"] = HEAP8 = new Int8Array(buf);
      Module3["HEAP16"] = HEAP16 = new Int16Array(buf);
      Module3["HEAP32"] = HEAP32 = new Int32Array(buf);
      Module3["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
      Module3["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
      Module3["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
      Module3["HEAPF32"] = HEAPF32 = new Float32Array(buf);
      Module3["HEAPF64"] = HEAPF64 = new Float64Array(buf);
    }
    var TOTAL_STACK = 5242880;
    if (Module3["TOTAL_STACK"]) assert2(TOTAL_STACK === Module3["TOTAL_STACK"], "the stack size can no longer be determined at runtime");
    var INITIAL_MEMORY = Module3["INITIAL_MEMORY"] || 16777216;
    legacyModuleProp("INITIAL_MEMORY", "INITIAL_MEMORY");
    assert2(INITIAL_MEMORY >= TOTAL_STACK, "INITIAL_MEMORY should be larger than TOTAL_STACK, was " + INITIAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
    assert2(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0, "JS engine does not provide full typed array support");
    assert2(!Module3["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
    assert2(INITIAL_MEMORY == 16777216, "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
    var wasmTable;
    function writeStackCookie() {
      var max = _emscripten_stack_get_end();
      assert2((max & 3) == 0);
      HEAPU32[max >> 2] = 34821223;
      HEAPU32[max + 4 >> 2] = 2310721022;
      HEAPU32[0] = 1668509029;
    }
    function checkStackCookie() {
      if (ABORT) return;
      var max = _emscripten_stack_get_end();
      var cookie1 = HEAPU32[max >> 2];
      var cookie2 = HEAPU32[max + 4 >> 2];
      if (cookie1 != 34821223 || cookie2 != 2310721022) {
        abort("Stack overflow! Stack cookie has been overwritten at 0x" + max.toString(16) + ", expected hex dwords 0x89BACDFE and 0x2135467, but received 0x" + cookie2.toString(16) + " 0x" + cookie1.toString(16));
      }
      if (HEAPU32[0] !== 1668509029) abort("Runtime error: The application has corrupted its heap memory area (address zero)!");
    }
    (function() {
      var h16 = new Int16Array(1);
      var h8 = new Int8Array(h16.buffer);
      h16[0] = 25459;
      if (h8[0] !== 115 || h8[1] !== 99) throw "Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)";
    })();
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    function keepRuntimeAlive() {
      return noExitRuntime;
    }
    function preRun() {
      if (Module3["preRun"]) {
        if (typeof Module3["preRun"] == "function") Module3["preRun"] = [Module3["preRun"]];
        while (Module3["preRun"].length) {
          addOnPreRun(Module3["preRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function initRuntime() {
      assert2(!runtimeInitialized);
      runtimeInitialized = true;
      checkStackCookie();
      callRuntimeCallbacks(__ATINIT__);
    }
    function postRun() {
      checkStackCookie();
      if (Module3["postRun"]) {
        if (typeof Module3["postRun"] == "function") Module3["postRun"] = [Module3["postRun"]];
        while (Module3["postRun"].length) {
          addOnPostRun(Module3["postRun"].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnInit(cb) {
      __ATINIT__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    assert2(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert2(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert2(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert2(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    var runDependencyTracking = {};
    function addRunDependency(id) {
      runDependencies++;
      if (Module3["monitorRunDependencies"]) {
        Module3["monitorRunDependencies"](runDependencies);
      }
      if (id) {
        assert2(!runDependencyTracking[id]);
        runDependencyTracking[id] = 1;
        if (runDependencyWatcher === null && typeof setInterval != "undefined") {
          runDependencyWatcher = setInterval(function() {
            if (ABORT) {
              clearInterval(runDependencyWatcher);
              runDependencyWatcher = null;
              return;
            }
            var shown = false;
            for (var dep in runDependencyTracking) {
              if (!shown) {
                shown = true;
                err("still waiting on run dependencies:");
              }
              err("dependency: " + dep);
            }
            if (shown) {
              err("(end of list)");
            }
          }, 1e4);
        }
      } else {
        err("warning: run dependency added without ID");
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module3["monitorRunDependencies"]) {
        Module3["monitorRunDependencies"](runDependencies);
      }
      if (id) {
        assert2(runDependencyTracking[id]);
        delete runDependencyTracking[id];
      } else {
        err("warning: run dependency removed without ID");
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    function abort(what) {
      {
        if (Module3["onAbort"]) {
          Module3["onAbort"](what);
        }
      }
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      EXITSTATUS = 1;
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var FS = { error: function() {
      abort("Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with -sFORCE_FILESYSTEM");
    }, init: function() {
      FS.error();
    }, createDataFile: function() {
      FS.error();
    }, createPreloadedFile: function() {
      FS.error();
    }, createLazyFile: function() {
      FS.error();
    }, open: function() {
      FS.error();
    }, mkdev: function() {
      FS.error();
    }, registerDevice: function() {
      FS.error();
    }, analyzePath: function() {
      FS.error();
    }, loadFilesFromDB: function() {
      FS.error();
    }, ErrnoError: function ErrnoError() {
      FS.error();
    } };
    Module3["FS_createDataFile"] = FS.createDataFile;
    Module3["FS_createPreloadedFile"] = FS.createPreloadedFile;
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    function isFileURI(filename) {
      return filename.startsWith("file://");
    }
    function createExportWrapper(name, fixedasm) {
      return function() {
        var displayName = name;
        var asm2 = fixedasm;
        if (!fixedasm) {
          asm2 = Module3["asm"];
        }
        assert2(runtimeInitialized, "native function `" + displayName + "` called before runtime initialization");
        if (!asm2[name]) {
          assert2(asm2[name], "exported native function `" + displayName + "` not found");
        }
        return asm2[name].apply(null, arguments);
      };
    }
    var wasmBinaryFile;
    wasmBinaryFile = "data:application/octet-stream;base64,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LWogATYCACACQQFqIgIgKUcNAAtBACEBQQAhACApQQFrIixBB08EQCApQXhxIQNBACEGA0AgMiAAQQJ0aiAANgIAIDIgAEEBciICQQJ0aiACNgIAIDIgAEECciICQQJ0aiACNgIAIDIgAEEDciICQQJ0aiACNgIAIDIgAEEEciICQQJ0aiACNgIAIDIgAEEFciICQQJ0aiACNgIAIDIgAEEGciICQQJ0aiACNgIAIDIgAEEHciICQQJ0aiACNgIAIABBCGohACAGQQhqIgYgA0cNAAsLIClBB3EiAgRAA0AgMiAAQQJ0aiAANgIAIABBAWohACABQQFqIgEgAkcNAAsLIClBAXEhPwJAICxFBEBBACEADAELIClBfnEhA0EAIQBBACEGA0AgACAtIABBAnQiAmooAgAiAUcEQCACIDJqIDIgAUECdGoiASgCADYCACABIAA2AgALIC0gAEEBciIsQQJ0IgJqKAIAIgEgLEcEQCACIDJqIDIgAUECdGoiASgCADYCACABICw2AgALIABBAmohACAGQQJqIgYgA0cNAAsLID9FDQAgLSAAQQJ0IgJqKAIAIgEgAEYNACACIDJqIDIgAUECdGoiASgCADYCACABIAA2AgALID5BjBQoAgARAQAgMSApQZAUKAIAEQAAIjA2AgAgKkEIaiA7QQVyQQJ0aiBFQZAUKAIAEQAAIgA2AgAgRUGQFCgCABEAACEBICogO0EHaiI+NgJoIDtBAnQgKmogATYCICAAQf8BIEwQCyE3IAFB/wEgTBALITkgKUUNCwNAIEQgBCIBQQFqIgRBAnRqKAIAIgAgRCABQQJ0IgNqKAIAIgJHBEAgACACayExIEYgAkEDdGohLCADIDlqIT8gAyA3aiFHQQAhBgNAAkAgASAsIAZBA3RqKAIAIjxGBEAgRyABNgIAID8gATYCAAwBCwJAIEQgPEECdCIDaiICKAIEIgAgAigCACI4Rg0AIEYgOEEDdGoiAigCACABRg0BIAAgOGshOEEAIQADQCAAQQFqIgAgOEYNASACIABBA3RqKAIAIAFHDQALIAAgOEkNAQsgAyA5aiIAIAEgPCAAKAIAQX9GGzYCACBHIDwgASBHKAIAQX9GGzYCAAsgBkEBaiIGIDFHDQALCyAEIClHDQALQQAhAANAAkACQCAAIC0gAEECdCICaigCACIB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FDYCFCACIAEoAhg2AhggAiABKAIcNgIcIAIgASgCIDYCICACIAEoAiQ2AiQgAiABKAIoNgIoIAIgASgCLDYCLCACIAEoAjA2AjAgAiABKAI0NgI0IAIgASgCODYCOCACIAEoAjw2AjwgAUFAayEBIAJBQGsiAiAETQ0ACwsgACACTQ0BA0AgAiABKAIANgIAIAFBBGohASACQQRqIgIgAEkNAAsMAQsgA0EESQRAIAAhAgwBCyAAIANBBGsiBEsEQCAAIQIMAQsgACECA0AgAiABLQAAOgAAIAIgAS0AAToAASACIAEtAAI6AAIgAiABLQADOgADIAFBBGohASACQQRqIgIgBE0NAAsLIAIgA0kEQANAIAIgAS0AADoAACABQQFqIQEgAkEBaiICIANHDQALCwvyAgICfwF+AkAgAkUNACAAIAE6AAAgACACaiIDQQFrIAE6AAAgAkEDSQ0AIAAgAToAAiAAIAE6AAEgA0EDayABOgAAIANBAmsgAToAACACQQdJDQAgACABOgADIANBBGsgAToAACACQQlJDQAgAEEAIABrQQNxIgRqIgMgAUH/AXFBgYKECGwiATYCACADIAIgBGtBfHEiBGoiAkEEayABNgIAIARBCUkNACADIAE2AgggAyABNgIEIAJBCGsgATYCACACQQxrIAE2AgAgBEEZSQ0AIAMgATYCGCADIAE2AhQgAyABNgIQIAMgATYCDCACQRBrIAE2AgAgAkEUayABNgIAIAJBGGsgATYCACACQRxrIAE2AgAgBCADQQRxQRhyIgRrIgJBIEkNACABrUKBgICAEH4hBSADIARqIQEDQCABIAU3AxggASAFNwMQIAEgBTcDCCABIAU3AwAgAUEgaiEBIAJBIGsiAkEfSw0ACwsgAAuBAQECfwJAAkAgAkEETwRAIAAgAXJBA3ENAQNAIAAoAgAgASgCAEcNAiABQQRqIQEgAEEEaiEAIAJBBGsiAkEDSw0ACwsgAkUNAQsDQCAALQAAIgMgAS0AACIERgRAIAFBAWohASAAQQFqIQAgAkEBayICDQEMAgsLIAMgBGsPC0EACwUAQaQUC08BAn9BlBQoAgAiASAAQQdqQXhxIgJqIQACQCACQQAgACABTRsNACAAPwBBEHRLBEAgABADRQ0BC0GUFCAANgIAIAEPC0GkFEEwNgIAQX8L8iwB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bmRpY2VzAGNvbXB1dGVWZXJ0ZXhJZHMAbWVzaG9wdF9nZW5lcmF0ZVNoYWRvd0luZGV4QnVmZmVyAHJlbWFwSW5kZXhCdWZmZXIAaGFzaExvb2t1cAAuL3NyYy9pbmRleGdlbmVyYXRvci5jcHAALi9zcmMvc2ltcGxpZmllci5jcHAAYnVpbGRTcGFyc2VSZW1hcAByZW1hcFtpXSA8IGkALi9zcmMvbWVzaG9wdGltaXplci5oAG9mZnNldCA9PSB1bmlxdWUAYWxsb2NhdGUAbWVzaG9wdF9zaW1wbGlmeUVkZ2UAdmVydGV4X3NpemUgPD0gdmVydGV4X3N0cmlkZQB2ZXJ0ZXhfc2l6ZSA+IDAgJiYgdmVydGV4X3NpemUgPD0gMjU2AHZlcnRleF9wb3NpdGlvbnNfc3RyaWRlID49IDEyICYmIHZlcnRleF9wb3NpdGlvbnNfc3RyaWRlIDw9IDI1NgB2ZXJ0ZXhfYXR0cmlidXRlc19zdHJpZGUgPj0gYXR0cmlidXRlX2NvdW50ICogc2l6ZW9mKGZsb2F0KSAmJiB2ZXJ0ZXhfYXR0cmlidXRlc19zdHJpZGUgPD0gMjU2AGdyaWRfc2l6ZSA+PSAxICYmIGdyaWRfc2l6ZSA8PSAxMDI0AGNvbGxhcHNlX3JlbWFwW3YyXSA9PSB2MgBoYXNoTG9va3VwMgBjb2xsYXBzZV9yZW1hcFt2MV0gPT0gdjEAd2VkZ2VbczBdID09IGkwICYmIHdlZGdlW3MxXSA9PSBpMQBjb2xsYXBzZV9yZW1hcFtpMV0gPT0gaTEAczAgIT0gaTAgJiYgczEgIT0gaTEAY29sbGFwc2VfcmVtYXBbdjBdID09IHYwAGNvbGxhcHNlX3JlbWFwW2kwXSA9PSBpMAB3ZWRnZVtpMF0gPT0gaTAAYnVja2V0cyA+IDAAaW5kZXhfY291bnQgJSAzID09IDAAdmVydGV4X3Bvc2l0aW9uc19zdHJpZGUgJSBzaXplb2YoZmxvYXQpID09IDAAdmVydGV4X2F0dHJpYnV0ZXNfc3RyaWRlICUgc2l6ZW9mKGZsb2F0KSA9PSAwAChvcHRpb25zICYgfihtZXNob3B0X1NpbXBsaWZ5TG9ja0JvcmRlciB8IG1lc2hvcHRfU2ltcGxpZnlTcGFyc2UgfCBtZXNob3B0X1NpbXBsaWZ5RXJyb3JBYnNvbHV0ZSkpID09IDAAKGJ1Y2tldHMgJiAoYnVja2V0cyAtIDEpKSA9PSAwAGNvdW50IDwgc2l6ZW9mKGJsb2NrcykgLyBzaXplb2YoYmxvY2tzWzBdKQBmYWxzZSAmJiAiSGFzaCB0YWJsZSBpcyBmdWxsIgAAAAABAAAAAgAAAAAAAAABAAAAAQEBAAEBAAEAAAEBAQABAAAAAAABAAEAQfATCxQBAQEBAQABAAAAAAABAAAAAAABAQBBjBQLCwEAAAACAAAAMAxQ";
    if (!isDataURI(wasmBinaryFile)) {
      wasmBinaryFile = locateFile(wasmBinaryFile);
    }
    function getBinary(file) {
      try {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        var binary = tryParseAsDataURI(file);
        if (binary) {
          return binary;
        }
        if (readBinary) {
          return readBinary(file);
        }
        throw "both async and sync fetching of the wasm failed";
      } catch (err2) {
        abort(err2);
      }
    }
    function getBinaryPromise() {
      if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
        if (typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            if (!response["ok"]) {
              throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            }
            return response["arrayBuffer"]();
          }).catch(function() {
            return getBinary(wasmBinaryFile);
          });
        }
      }
      return Promise.resolve().then(function() {
        return getBinary(wasmBinaryFile);
      });
    }
    function createWasm() {
      var info = { "env": asmLibraryArg, "wasi_snapshot_preview1": asmLibraryArg };
      function receiveInstance(instance, module) {
        var exports2 = instance.exports;
        Module3["asm"] = exports2;
        wasmMemory = Module3["asm"]["memory"];
        assert2(wasmMemory, "memory not found in wasm exports");
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module3["asm"]["__indirect_function_table"];
        assert2(wasmTable, "table not found in wasm exports");
        addOnInit(Module3["asm"]["__wasm_call_ctors"]);
        removeRunDependency("wasm-instantiate");
      }
      addRunDependency("wasm-instantiate");
      var trueModule = Module3;
      function receiveInstantiationResult(result) {
        assert2(Module3 === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
        trueModule = null;
        receiveInstance(result["instance"]);
      }
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(function(instance) {
          return instance;
        }).then(receiver, function(reason) {
          err("failed to asynchronously prepare wasm: " + reason);
          if (isFileURI(wasmBinaryFile)) {
            err("warning: Loading from a file URI (" + wasmBinaryFile + ") is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing");
          }
          abort(reason);
        });
      }
      function instantiateAsync() {
        if (!wasmBinary && typeof WebAssembly.instantiateStreaming == "function" && !isDataURI(wasmBinaryFile) && !ENVIRONMENT_IS_NODE && typeof fetch == "function") {
          return fetch(wasmBinaryFile, { credentials: "same-origin" }).then(function(response) {
            var result = WebAssembly.instantiateStreaming(response, info);
            return result.then(receiveInstantiationResult, function(reason) {
              err("wasm streaming compile failed: " + reason);
              err("falling back to ArrayBuffer instantiation");
              return instantiateArrayBuffer(receiveInstantiationResult);
            });
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiationResult);
        }
      }
      if (Module3["instantiateWasm"]) {
        try {
          var exports = Module3["instantiateWasm"](info, receiveInstance);
          return exports;
        } catch (e) {
          err("Module.instantiateWasm callback failed with error: " + e);
          readyPromiseReject(e);
        }
      }
      instantiateAsync().catch(readyPromiseReject);
      return {};
    }
    var tempDouble;
    var tempI64;
    function ExitStatus(status) {
      this.name = "ExitStatus";
      this.message = "Program terminated with exit(" + status + ")";
      this.status = status;
    }
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        callbacks.shift()(Module3);
      }
    }
    function demangle(func) {
      warnOnce("warning: build with -sDEMANGLE_SUPPORT to link in libcxxabi demangling");
      return func;
    }
    function demangleAll(text) {
      var regex = /\b_Z[\w\d_]+/g;
      return text.replace(regex, function(x) {
        var y = demangle(x);
        return x === y ? x : y + " [" + x + "]";
      });
    }
    function intArrayToString(array) {
      var ret = [];
      for (var i2 = 0; i2 < array.length; i2++) {
        var chr = array[i2];
        if (chr > 255) {
          if (ASSERTIONS) {
            assert2(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i2 + " not in 0x00-0xFF.");
          }
          chr &= 255;
        }
        ret.push(String.fromCharCode(chr));
      }
      return ret.join("");
    }
    function jsStackTrace() {
      var error = new Error();
      if (!error.stack) {
        try {
          throw new Error();
        } catch (e) {
          error = e;
        }
        if (!error.stack) {
          return "(no stack trace available)";
        }
      }
      return error.stack.toString();
    }
    function warnOnce(text) {
      if (!warnOnce.shown) warnOnce.shown = {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = "warning: " + text;
        err(text);
      }
    }
    function writeArrayToMemory(array, buffer2) {
      assert2(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
      HEAP8.set(array, buffer2);
    }
    function ___assert_fail(condition, filename, line, func) {
      abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
    }
    function _abort() {
      abort("native code called abort()");
    }
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.copyWithin(dest, src, src + num);
    }
    function getHeapMax() {
      return 2147483648;
    }
    function emscripten_realloc_buffer(size) {
      try {
        wasmMemory.grow(size - buffer.byteLength + 65535 >>> 16);
        updateGlobalBufferAndViews(wasmMemory.buffer);
        return 1;
      } catch (e) {
        err("emscripten_realloc_buffer: Attempted to grow heap from " + buffer.byteLength + " bytes to " + size + " bytes, but got error: " + e);
      }
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      assert2(requestedSize > oldSize);
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        err("Cannot enlarge memory, asked to go up to " + requestedSize + " bytes, but the limit is " + maxHeapSize + " bytes!");
        return false;
      }
      let alignUp = (x, multiple) => x + (multiple - x % multiple) % multiple;
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignUp(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = emscripten_realloc_buffer(newSize);
        if (replacement) {
          return true;
        }
      }
      err("Failed to grow the heap from " + oldSize + " bytes to " + newSize + " bytes, not enough memory!");
      return false;
    }
    function getCFunc(ident) {
      var func = Module3["_" + ident];
      assert2(func, "Cannot call unknown function " + ident + ", make sure it is exported");
      return func;
    }
    function ccall(ident, returnType, argTypes, args, opts) {
      var toC = { "string": (str) => {
        var ret2 = 0;
        if (str !== null && str !== void 0 && str !== 0) {
          var len = (str.length << 2) + 1;
          ret2 = stackAlloc(len);
          stringToUTF8(str, ret2, len);
        }
        return ret2;
      }, "array": (arr) => {
        var ret2 = stackAlloc(arr.length);
        writeArrayToMemory(arr, ret2);
        return ret2;
      } };
      function convertReturnValue(ret2) {
        if (returnType === "string") {
          return UTF8ToString(ret2);
        }
        if (returnType === "boolean") return Boolean(ret2);
        return ret2;
      }
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert2(returnType !== "array", 'Return type should not be "array".');
      if (args) {
        for (var i2 = 0; i2 < args.length; i2++) {
          var converter = toC[argTypes[i2]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i2] = converter(args[i2]);
          } else {
            cArgs[i2] = args[i2];
          }
        }
      }
      var ret = func.apply(null, cArgs);
      function onDone(ret2) {
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret2);
      }
      ret = onDone(ret);
      return ret;
    }
    function cwrap(ident, returnType, argTypes, opts) {
      return function() {
        return ccall(ident, returnType, argTypes, arguments, opts);
      };
    }
    var ASSERTIONS = true;
    var decodeBase64 = typeof atob == "function" ? atob : function(input) {
      var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var output = "";
      var chr1, chr2, chr3;
      var enc1, enc2, enc3, enc4;
      var i2 = 0;
      input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
      do {
        enc1 = keyStr.indexOf(input.charAt(i2++));
        enc2 = keyStr.indexOf(input.charAt(i2++));
        enc3 = keyStr.indexOf(input.charAt(i2++));
        enc4 = keyStr.indexOf(input.charAt(i2++));
        chr1 = enc1 << 2 | enc2 >> 4;
        chr2 = (enc2 & 15) << 4 | enc3 >> 2;
        chr3 = (enc3 & 3) << 6 | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 !== 64) {
          output = output + String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
          output = output + String.fromCharCode(chr3);
        }
      } while (i2 < input.length);
      return output;
    };
    function intArrayFromBase64(s) {
      if (typeof ENVIRONMENT_IS_NODE == "boolean" && ENVIRONMENT_IS_NODE) {
        var buf = Buffer.from(s, "base64");
        return new Uint8Array(buf["buffer"], buf["byteOffset"], buf["byteLength"]);
      }
      try {
        var decoded = decodeBase64(s);
        var bytes = new Uint8Array(decoded.length);
        for (var i2 = 0; i2 < decoded.length; ++i2) {
          bytes[i2] = decoded.charCodeAt(i2);
        }
        return bytes;
      } catch (_) {
        throw new Error("Converting base64 string to bytes failed.");
      }
    }
    function tryParseAsDataURI(filename) {
      if (!isDataURI(filename)) {
        return;
      }
      return intArrayFromBase64(filename.slice(dataURIPrefix.length));
    }
    function checkIncomingModuleAPI() {
      ignoredModuleProp("fetchSettings");
    }
    var asmLibraryArg = { "__assert_fail": ___assert_fail, "abort": _abort, "emscripten_memcpy_big": _emscripten_memcpy_big, "emscripten_resize_heap": _emscripten_resize_heap };
    var asm = createWasm();
    var ___wasm_call_ctors = Module3["___wasm_call_ctors"] = createExportWrapper("__wasm_call_ctors");
    var _meshopt_simplifyWithAttributes = Module3["_meshopt_simplifyWithAttributes"] = createExportWrapper("meshopt_simplifyWithAttributes");
    var _meshopt_simplifySloppy = Module3["_meshopt_simplifySloppy"] = createExportWrapper("meshopt_simplifySloppy");
    var _meshopt_generateShadowIndexBuffer = Module3["_meshopt_generateShadowIndexBuffer"] = createExportWrapper("meshopt_generateShadowIndexBuffer");
    var ___errno_location = Module3["___errno_location"] = createExportWrapper("__errno_location");
    var _fflush = Module3["_fflush"] = createExportWrapper("fflush");
    var _malloc = Module3["_malloc"] = createExportWrapper("malloc");
    var _emscripten_stack_init = Module3["_emscripten_stack_init"] = function() {
      return (_emscripten_stack_init = Module3["_emscripten_stack_init"] = Module3["asm"]["emscripten_stack_init"]).apply(null, arguments);
    };
    var _emscripten_stack_get_free = Module3["_emscripten_stack_get_free"] = function() {
      return (_emscripten_stack_get_free = Module3["_emscripten_stack_get_free"] = Module3["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
    };
    var _emscripten_stack_get_base = Module3["_emscripten_stack_get_base"] = function() {
      return (_emscripten_stack_get_base = Module3["_emscripten_stack_get_base"] = Module3["asm"]["emscripten_stack_get_base"]).apply(null, arguments);
    };
    var _emscripten_stack_get_end = Module3["_emscripten_stack_get_end"] = function() {
      return (_emscripten_stack_get_end = Module3["_emscripten_stack_get_end"] = Module3["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
    };
    var stackSave = Module3["stackSave"] = createExportWrapper("stackSave");
    var stackRestore = Module3["stackRestore"] = createExportWrapper("stackRestore");
    var stackAlloc = Module3["stackAlloc"] = createExportWrapper("stackAlloc");
    Module3["ccall"] = ccall;
    Module3["cwrap"] = cwrap;
    var unexportedRuntimeSymbols = ["run", "UTF8ArrayToString", "UTF8ToString", "stringToUTF8Array", "stringToUTF8", "lengthBytesUTF8", "addOnPreRun", "addOnInit", "addOnPreMain", "addOnExit", "addOnPostRun", "addRunDependency", "removeRunDependency", "FS_createFolder", "FS_createPath", "FS_createDataFile", "FS_createPreloadedFile", "FS_createLazyFile", "FS_createLink", "FS_createDevice", "FS_unlink", "getLEB", "getFunctionTables", "alignFunctionTables", "registerFunctions", "prettyPrint", "getCompilerSetting", "print", "printErr", "callMain", "abort", "keepRuntimeAlive", "wasmMemory", "stackAlloc", "stackSave", "stackRestore", "getTempRet0", "setTempRet0", "writeStackCookie", "checkStackCookie", "intArrayFromBase64", "tryParseAsDataURI", "ptrToString", "zeroMemory", "stringToNewUTF8", "exitJS", "getHeapMax", "emscripten_realloc_buffer", "ENV", "ERRNO_CODES", "ERRNO_MESSAGES", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "DNS", "getHostByName", "Protocols", "Sockets", "getRandomDevice", "warnOnce", "traverseStack", "UNWIND_CACHE", "convertPCtoSourceLocation", "readAsmConstArgsArray", "readAsmConstArgs", "mainThreadEM_ASM", "jstoi_q", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "handleException", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "getCFunc", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "freeTableIndexes", "functionsInTableMap", "getEmptyTableSlot", "updateTableMap", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "setValue", "getValue", "PATH", "PATH_FS", "intArrayFromString", "intArrayToString", "AsciiToString", "stringToAscii", "UTF16Decoder", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "allocateUTF8", "allocateUTF8OnStack", "writeStringToMemory", "writeArrayToMemory", "writeAsciiToMemory", "SYSCALLS", "getSocketFromFD", "getSocketAddress", "JSEvents", "registerKeyEventCallback", "specialHTMLTargets", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "currentFullscreenStrategy", "restoreOldWindowedStyle", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "demangle", "demangleAll", "jsStackTrace", "stackTrace", "ExitStatus", "getEnvStrings", "checkWasiClock", "flush_NO_FILESYSTEM", "dlopenMissingError", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "uncaughtExceptionCount", "exceptionLast", "exceptionCaught", "ExceptionInfo", "exception_addRef", "exception_decRef", "Browser", "setMainLoop", "wget", "FS", "MEMFS", "TTY", "PIPEFS", "SOCKFS", "_setNetworkCallback", "tempFixedLengthArray", "miniTempWebGLFloatBuffers", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "GL", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "AL", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "SDL", "SDL_gfx", "GLUT", "EGL", "GLFW_Window", "GLFW", "GLEW", "IDBStore", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate"];
    unexportedRuntimeSymbols.forEach(unexportedRuntimeSymbol);
    var missingLibrarySymbols = ["ptrToString", "zeroMemory", "stringToNewUTF8", "exitJS", "setErrNo", "inetPton4", "inetNtop4", "inetPton6", "inetNtop6", "readSockaddr", "writeSockaddr", "getHostByName", "getRandomDevice", "traverseStack", "convertPCtoSourceLocation", "readAsmConstArgs", "mainThreadEM_ASM", "jstoi_q", "jstoi_s", "getExecutableName", "listenOnce", "autoResumeAudioContext", "dynCallLegacy", "getDynCaller", "dynCall", "runtimeKeepalivePush", "runtimeKeepalivePop", "callUserCallback", "maybeExit", "safeSetTimeout", "asmjsMangle", "asyncLoad", "alignMemory", "mmapAlloc", "writeI53ToI64", "writeI53ToI64Clamped", "writeI53ToI64Signaling", "writeI53ToU64Clamped", "writeI53ToU64Signaling", "readI53FromI64", "readI53FromU64", "convertI32PairToI53", "convertI32PairToI53Checked", "convertU32PairToI53", "uleb128Encode", "sigToWasmTypes", "generateFuncType", "convertJsFunctionToWasm", "getEmptyTableSlot", "updateTableMap", "addFunction", "removeFunction", "reallyNegative", "unSign", "strLen", "reSign", "formatString", "intArrayFromString", "AsciiToString", "stringToAscii", "UTF16ToString", "stringToUTF16", "lengthBytesUTF16", "UTF32ToString", "stringToUTF32", "lengthBytesUTF32", "allocateUTF8", "allocateUTF8OnStack", "writeStringToMemory", "writeAsciiToMemory", "getSocketFromFD", "getSocketAddress", "registerKeyEventCallback", "maybeCStringToJsString", "findEventTarget", "findCanvasEventTarget", "getBoundingClientRect", "fillMouseEventData", "registerMouseEventCallback", "registerWheelEventCallback", "registerUiEventCallback", "registerFocusEventCallback", "fillDeviceOrientationEventData", "registerDeviceOrientationEventCallback", "fillDeviceMotionEventData", "registerDeviceMotionEventCallback", "screenOrientation", "fillOrientationChangeEventData", "registerOrientationChangeEventCallback", "fillFullscreenChangeEventData", "registerFullscreenChangeEventCallback", "JSEvents_requestFullscreen", "JSEvents_resizeCanvasForFullscreen", "registerRestoreOldStyle", "hideEverythingExceptGivenElement", "restoreHiddenElements", "setLetterbox", "softFullscreenResizeWebGLRenderTarget", "doRequestFullscreen", "fillPointerlockChangeEventData", "registerPointerlockChangeEventCallback", "registerPointerlockErrorEventCallback", "requestPointerLock", "fillVisibilityChangeEventData", "registerVisibilityChangeEventCallback", "registerTouchEventCallback", "fillGamepadEventData", "registerGamepadEventCallback", "registerBeforeUnloadEventCallback", "fillBatteryEventData", "battery", "registerBatteryEventCallback", "setCanvasElementSize", "getCanvasElementSize", "getEnvStrings", "checkWasiClock", "flush_NO_FILESYSTEM", "createDyncallWrapper", "setImmediateWrapped", "clearImmediateWrapped", "polyfillSetImmediate", "ExceptionInfo", "exception_addRef", "exception_decRef", "setMainLoop", "_setNetworkCallback", "heapObjectForWebGLType", "heapAccessShiftForWebGLHeap", "emscriptenWebGLGet", "computeUnpackAlignedImageSize", "emscriptenWebGLGetTexPixelData", "emscriptenWebGLGetUniform", "webglGetUniformLocation", "webglPrepareUniformLocationsBeforeFirstUse", "webglGetLeftBracePos", "emscriptenWebGLGetVertexAttrib", "writeGLArray", "SDL_unicode", "SDL_ttfContext", "SDL_audio", "GLFW_Window", "runAndAbortIfError", "ALLOC_NORMAL", "ALLOC_STACK", "allocate"];
    missingLibrarySymbols.forEach(missingLibrarySymbol);
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function stackCheckInit() {
      _emscripten_stack_init();
      writeStackCookie();
    }
    function run(args) {
      args = args || arguments_;
      if (runDependencies > 0) {
        return;
      }
      stackCheckInit();
      preRun();
      if (runDependencies > 0) {
        return;
      }
      function doRun() {
        if (calledRun) return;
        calledRun = true;
        Module3["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        readyPromiseResolve(Module3);
        if (Module3["onRuntimeInitialized"]) Module3["onRuntimeInitialized"]();
        assert2(!Module3["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
        postRun();
      }
      if (Module3["setStatus"]) {
        Module3["setStatus"]("Running...");
        setTimeout(function() {
          setTimeout(function() {
            Module3["setStatus"]("");
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
      checkStackCookie();
    }
    if (Module3["preInit"]) {
      if (typeof Module3["preInit"] == "function") Module3["preInit"] = [Module3["preInit"]];
      while (Module3["preInit"].length > 0) {
        Module3["preInit"].pop()();
      }
    }
    run();
    return Module3.ready;
  };
})();
var MeshOptimizerModule_default = Module2;

// src/plugins/meshlets_v2/nv_cluster_lod_builder/meshoptimizer/Meshoptimizer.ts
var meshopt_SimplifyLockBorder = 1 << 0;
var meshopt_SimplifySparse = 1 << 1;
var meshopt_SimplifyErrorAbsolute = 1 << 2;
var Meshoptimizer2 = class _Meshoptimizer {
  static module;
  static isLoaded = false;
  static kMeshletMaxTriangles = 512;
  static async load() {
    if (!_Meshoptimizer.module) {
      _Meshoptimizer.module = await MeshOptimizerModule_default();
      this.isLoaded = true;
    }
  }
  // size_t meshopt_simplifyWithAttributes(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions_data, size_t vertex_count, size_t vertex_positions_stride, const float* vertex_attributes_data, size_t vertex_attributes_stride, const float* attribute_weights, size_t attribute_count, const unsigned char* vertex_lock, size_t target_index_count, float target_error, unsigned int options, float* out_result_error)
  static meshopt_simplifyWithAttributes(destination_length, indices, index_count, vertex_positions_data, vertex_count, vertex_positions_stride, vertex_attributes_data, vertex_attributes_stride, attribute_weights, attribute_count, vertex_lock, target_index_count, target_error, options) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer2(new Uint32Array(destination_length), "out");
    const result_error = new WASMPointer2(new Float32Array(1), "out");
    const ret = WASMHelper2.call(
      MeshOptmizer,
      "meshopt_simplifyWithAttributes",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer2(indices),
      // const unsigned int* indices,
      index_count,
      // size_t index_count,
      new WASMPointer2(vertex_positions_data),
      // const float* vertex_positions,
      vertex_count,
      // size_t vertex_count,
      vertex_positions_stride * Float32Array.BYTES_PER_ELEMENT,
      vertex_attributes_data !== null ? new WASMPointer2(vertex_attributes_data) : null,
      vertex_attributes_stride,
      attribute_weights !== null ? new WASMPointer2(attribute_weights) : null,
      attribute_count,
      new WASMPointer2(vertex_lock),
      target_index_count,
      // size_t target_index_count,
      target_error,
      // float target_error, Should be 0.01 but cant reach 128 triangles with it
      options,
      // unsigned int options, preserve borders
      result_error
      // float* result_error
    );
    return { ret, destination: destination.data, out_result_error: result_error.data[0] };
  }
  // void meshopt_generateShadowIndexBuffer(unsigned int* destination, const unsigned int* indices, size_t index_count, const void* vertices, size_t vertex_count, size_t vertex_size, size_t vertex_stride)
  static meshopt_generateShadowIndexBuffer(indices, index_count, vertices, vertex_count, vertex_size, vertex_stride) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer2(new Uint32Array(indices.length), "out");
    WASMHelper2.call(
      MeshOptmizer,
      "meshopt_generateShadowIndexBuffer",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer2(indices),
      // const unsigned int* indices,
      index_count,
      // size_t index_count,
      new WASMPointer2(vertices),
      // const float* vertex_positions,
      vertex_count,
      // size_t vertex_count,
      vertex_size * Float32Array.BYTES_PER_ELEMENT,
      vertex_stride * Float32Array.BYTES_PER_ELEMENT
    );
    return destination.data;
  }
};

// src/plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_common.ts
var Sphere2 = class {
  x = 0;
  y = 0;
  z = 0;
  radius = 0;
  constructor(x = 0, y = 0, z = 0, radius = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.radius = radius;
  }
};
var Result = /* @__PURE__ */ ((Result3) => {
  Result3[Result3["SUCCESS"] = 0] = "SUCCESS";
  Result3[Result3["ERROR_EMPTY_CLUSTER_GENERATING_GROUPS"] = 1] = "ERROR_EMPTY_CLUSTER_GENERATING_GROUPS";
  Result3[Result3["ERROR_CLUSTERING_FAILED"] = 2] = "ERROR_CLUSTERING_FAILED";
  Result3[Result3["ERROR_NODE_OVERFLOW"] = 3] = "ERROR_NODE_OVERFLOW";
  Result3[Result3["ERROR_LOD_OVERFLOW"] = 4] = "ERROR_LOD_OVERFLOW";
  Result3[Result3["ERROR_CLUSTER_COUNT_NOT_DECREASING"] = 5] = "ERROR_CLUSTER_COUNT_NOT_DECREASING";
  Result3[Result3["ERROR_INCONSISTENT_GENERATING_GROUPS"] = 6] = "ERROR_INCONSISTENT_GENERATING_GROUPS";
  Result3[Result3["ERROR_ADJACENCY_GENERATION_FAILED"] = 7] = "ERROR_ADJACENCY_GENERATION_FAILED";
  Result3[Result3["ERROR_OUTPUT_MESH_OVERFLOW"] = 8] = "ERROR_OUTPUT_MESH_OVERFLOW";
  Result3[Result3["ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH"] = 9] = "ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH";
  Result3[Result3["ERROR_EMPTY_ROOT_CLUSTER"] = 10] = "ERROR_EMPTY_ROOT_CLUSTER";
  Result3[Result3["ERROR_INCONSISTENT_BOUNDING_SPHERES"] = 11] = "ERROR_INCONSISTENT_BOUNDING_SPHERES";
  Result3[Result3["ERROR_HIERARCHY_GENERATION_FAILED"] = 12] = "ERROR_HIERARCHY_GENERATION_FAILED";
  Result3[Result3["ERROR_INVALID_ARGUMENT"] = 13] = "ERROR_INVALID_ARGUMENT";
  Result3[Result3["ERROR_UNSPECIFIED"] = 14] = "ERROR_UNSPECIFIED";
  return Result3;
})(Result || {});
function assert(condition) {
  if (condition === false) throw Error("Assert failed");
}
function resizeArray(arr, newSize, createDefaultValue) {
  if (newSize > arr.length) {
    return [...arr, ...Array.from({ length: newSize - arr.length }, createDefaultValue)];
  } else {
    return arr.slice(0, newSize);
  }
}
function createArrayView(arr, offset, length) {
  return new Proxy([], {
    get(target, prop, receiver) {
      if (prop === "length") {
        return length;
      }
      if (typeof prop === "symbol") {
        return Reflect.get(arr, prop, receiver);
      }
      if (prop === "slice") {
        return function(start, end) {
          let s = start ?? 0;
          let e = end ?? length;
          if (s < 0) s = length + s;
          if (e < 0) e = length + e;
          s = Math.max(0, s);
          e = Math.min(length, e);
          const newLength = Math.max(0, e - s);
          return createArrayView(arr, offset + s, newLength);
        };
      }
      if (prop === "sort") {
        return function(compareFn) {
          const subarray = [];
          for (let i2 = 0; i2 < length; i2++) {
            subarray[i2] = arr[offset + i2];
          }
          subarray.sort(compareFn);
          for (let i2 = 0; i2 < length; i2++) {
            arr[offset + i2] = subarray[i2];
          }
          return receiver;
        };
      }
      const index = Number(prop);
      if (!isNaN(index)) {
        return arr[offset + index];
      }
      return Reflect.get(arr, prop, receiver);
    },
    set(target, prop, value, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.set(arr, prop, value, receiver);
      }
      const index = Number(prop);
      if (!isNaN(index)) {
        arr[offset + index] = value;
        return true;
      }
      return Reflect.set(arr, prop, value, receiver);
    }
  });
}
function vec3_to_number(v) {
  let out = [];
  for (let i2 = 0; i2 < v.length; i2++) {
    out.push(v[i2].x, v[i2].y, v[i2].z);
  }
  return out;
}
function number_to_uvec3(array, count = 3) {
  let out = [];
  for (let i2 = 0; i2 < array.length; i2 += count) {
    out.push(new uvec3(array[i2 + 0], array[i2 + 1], array[i2 + 2]));
  }
  return out;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/clusterizer.ts
var SplitNodeTemporaries = class {
  // Identification of the side on which each element lies when splitting a node (left = 1, right = 0)
  partitionSides;
  // Bounding boxes of the left children of the currently processed node
  leftChildrenBoxes;
  // Bounding boxes of the right children of the currently processed node
  rightChildrenBoxes;
  deltaWeights;
  splitWeights;
  connectionIndicesInSortedElements;
  sortedElementIndicesPerAxis;
};
var Split = class {
  axis = -1;
  position = Number.MAX_VALUE;
  // index of first item in the right node
  cost = Number.MAX_VALUE;
  valid() {
    return this.axis !== -1;
  }
  lessThan(other) {
    return this.cost < other.cost;
  }
  copy(other) {
    this.axis = other.axis;
    this.position = other.position;
    this.cost = other.cost;
  }
};
function div_ceil(a, b) {
  return Math.floor((a + b - 1) / b);
}
function aabbSize(aabb, size) {
  for (let i2 = 0; i2 < 3; i2++) {
    size[i2] = aabb.bboxMax[i2] - aabb.bboxMin[i2];
  }
}
function aabbCombine(a, b) {
  let result = new AABB();
  for (let i2 = 0; i2 < 3; i2++) {
    result.bboxMin[i2] = a.bboxMin[i2] < b.bboxMin[i2] ? a.bboxMin[i2] : b.bboxMin[i2];
    result.bboxMax[i2] = a.bboxMax[i2] > b.bboxMax[i2] ? a.bboxMax[i2] : b.bboxMax[i2];
  }
  return result;
}
function aabbIntersect(a, b) {
  let result = new AABB();
  for (let i2 = 0; i2 < 3; i2++) {
    result.bboxMin[i2] = Math.max(a.bboxMin[i2], b.bboxMin[i2]);
    result.bboxMax[i2] = Math.min(a.bboxMax[i2], b.bboxMax[i2]);
  }
  for (let i2 = 0; i2 < 3; i2++) {
    let s = result.bboxMax[i2] - result.bboxMin[i2];
    s = s < 0 ? 0 : s;
    result.bboxMax[i2] = result.bboxMin[i2] + s;
  }
  return result;
}
function aabbEmpty() {
  let result = new AABB();
  for (let i2 = 0; i2 < 3; i2++) {
    result.bboxMin[i2] = Number.MAX_VALUE;
    result.bboxMax[i2] = -Number.MAX_VALUE;
  }
  return result;
}
function createCentroidComparator(axis, spatialElements) {
  const A0 = axis;
  const A1 = (axis + 1) % 3;
  const A2 = (axis + 2) % 3;
  return (itemA, itemB) => {
    const centroids = spatialElements.centroids;
    const indexA = itemA * 3;
    const indexB = itemB * 3;
    const a0 = centroids[indexA + A0];
    const b0 = centroids[indexB + A0];
    if (a0 < b0) return -1;
    if (a0 > b0) return 1;
    const a1 = centroids[indexA + A1];
    const b1 = centroids[indexB + A1];
    if (a1 < b1) return -1;
    if (a1 > b1) return 1;
    const a2 = centroids[indexA + A2];
    const b2 = centroids[indexB + A2];
    if (a2 < b2) return -1;
    if (a2 > b2) return 1;
    return 0;
  };
}
function stablePartitionInPlace(arr, predicate) {
  const truePart = [];
  const falsePart = [];
  for (const elem of arr) {
    if (predicate(elem)) {
      truePart.push(elem);
    } else {
      falsePart.push(elem);
    }
  }
  const totalLength = truePart.length + falsePart.length;
  for (let i2 = 0; i2 < truePart.length; i2++) {
    arr[i2] = truePart[i2];
  }
  for (let j = 0; j < falsePart.length; j++) {
    arr[truePart.length + j] = falsePart[j];
  }
  arr.length = totalLength;
}
function partitionAtSplit(sortedElementIndicesPerAxis, splitAxis, splitPosition, partitionSides) {
  const sortedThisAxis = sortedElementIndicesPerAxis[splitAxis];
  for (let i2 = 0; i2 < sortedThisAxis.length; i2++) {
    const idx = sortedThisAxis[i2];
    partitionSides[idx] = i2 < splitPosition ? 1 : 0;
  }
  for (let ax = 0; ax < 3; ax++) {
    if (ax == splitAxis) continue;
    const arr = sortedElementIndicesPerAxis[ax];
    stablePartitionInPlace(arr, (idx) => partitionSides[idx] !== 0);
  }
}
function splitAtMedianUntil(spatialElements, partitionSides, nodeSortedElementIndicesPerAxis, maxElementsPerNode, nodeStartIndex, perNodeElementRanges) {
  const nodeCount = nodeSortedElementIndicesPerAxis[0].length;
  if (nodeCount < maxElementsPerNode) {
    perNodeElementRanges.push(new Range(nodeStartIndex, nodeCount));
    return;
  }
  const aabb = new AABB();
  aabb.bboxMin = [
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0][0] + 0],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1][0] + 1],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2][0] + 2]
  ], aabb.bboxMax = [
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[0][nodeSortedElementIndicesPerAxis[0].length - 1] + 0],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[1][nodeSortedElementIndicesPerAxis[1].length - 1] + 1],
    spatialElements.centroids[3 * nodeSortedElementIndicesPerAxis[2][nodeSortedElementIndicesPerAxis[2].length - 1] + 2]
  ];
  let size = new Array(3).fill(0);
  aabbSize(aabb, size);
  const axis = size[0] > size[1] && size[0] > size[2] ? 0 : size[1] > size[2] ? 1 : 2;
  const splitPosition = nodeCount / 2;
  partitionAtSplit(nodeSortedElementIndicesPerAxis, axis, splitPosition, partitionSides);
  const left = [
    nodeSortedElementIndicesPerAxis[0].slice(0, splitPosition),
    nodeSortedElementIndicesPerAxis[1].slice(0, splitPosition),
    nodeSortedElementIndicesPerAxis[2].slice(0, splitPosition)
  ];
  const right = [
    nodeSortedElementIndicesPerAxis[0].slice(splitPosition),
    nodeSortedElementIndicesPerAxis[1].slice(splitPosition),
    nodeSortedElementIndicesPerAxis[2].slice(splitPosition)
  ];
  splitAtMedianUntil(spatialElements, partitionSides, left, maxElementsPerNode, nodeStartIndex, perNodeElementRanges);
  splitAtMedianUntil(spatialElements, partitionSides, right, maxElementsPerNode, nodeStartIndex + splitPosition, perNodeElementRanges);
}
function minSplitCost(a, b) {
  return b.lessThan(a) ? b : a;
}
function sahCost(aabb, elementCount) {
  const dx = aabb.bboxMax[0] - aabb.bboxMin[0];
  const dy = aabb.bboxMax[1] - aabb.bboxMin[1];
  const dz = aabb.bboxMax[2] - aabb.bboxMin[2];
  const halfArea = dx * (dy + dz) + dy * dz;
  return halfArea * elementCount;
}
function sumAdjacencyWeightsAtSplit(graph, connectionIndicesInSortedElements, node, elementIndexInNodeRange, elementIndex) {
  let result = 0;
  const elementConnectionRange = graph.nodes[elementIndex];
  for (let connectionIndexInRange = elementConnectionRange.offset; connectionIndexInRange < elementConnectionRange.offset + elementConnectionRange.count; ++connectionIndexInRange) {
    const connectedElementIndexInNodeRange = connectionIndicesInSortedElements[connectionIndexInRange] - node.offset;
    const connectingWeight = graph.connectionWeights[connectionIndexInRange];
    if (connectedElementIndexInNodeRange >= node.count)
      continue;
    result += elementIndexInNodeRange < connectedElementIndexInNodeRange ? connectingWeight : -connectingWeight;
  }
  return result;
}
function splitCost(AlignBoth, input, splitWeights, leftAabb, rightAabb, nodeSize, splitPositionFromLeft) {
  const acceptableRemainder = input.config.maxClusterSize - input.config.minClusterSize;
  const splitPositionFromRight = nodeSize - splitPositionFromLeft;
  const leftAlign = splitPositionFromLeft % input.config.minClusterSize <= splitPositionFromLeft / input.config.minClusterSize * acceptableRemainder;
  const rightAlign = splitPositionFromRight % input.config.minClusterSize <= splitPositionFromRight / input.config.minClusterSize * acceptableRemainder;
  let cost = Number.MAX_VALUE;
  if (leftAlign && (!AlignBoth || rightAlign)) {
    const leftCost = sahCost(leftAabb, splitPositionFromLeft);
    const rightCost = sahCost(rightAabb, splitPositionFromRight);
    cost = leftCost + rightCost;
    const leftItemCount = input.config.maxClusterSize * div_ceil(splitPositionFromLeft, input.config.maxClusterSize) - splitPositionFromLeft;
    const rightItemCount = input.config.maxClusterSize * div_ceil(splitPositionFromRight, input.config.maxClusterSize) - splitPositionFromRight;
    cost += sahCost(leftAabb, leftItemCount) * input.config.costUnderfill;
    cost += sahCost(rightAabb, rightItemCount) * input.config.costUnderfill;
    const intersection = aabbIntersect(leftAabb, rightAabb);
    cost += sahCost(intersection, nodeSize) * input.config.costOverlap;
    if (input.graph) {
      const normalizeCutWeights = nodeSize * nodeSize;
      const cutCost = splitWeights[splitPositionFromLeft];
      const ratioCutCost = cutCost / splitPositionFromLeft + cutCost / splitPositionFromRight;
      cost += ratioCutCost * normalizeCutWeights;
    }
  }
  return cost;
}
function findBestSplit(Axis, AlignBoth, input, node, sortedIndicesThisAxis, nodeLeftBoxes, nodeRightBoxes, connectionIndicesInSortedElements, deltaWeights, splitWeights, splitOut) {
  const elems = input.spatialElements;
  const N = node.count;
  if (N > 0) {
    nodeLeftBoxes[0] = aabbEmpty();
    for (let i2 = 1; i2 < N; i2++) {
      const prev = nodeLeftBoxes[i2 - 1];
      const box = elems.boundingBoxes[sortedIndicesThisAxis[i2 - 1]];
      nodeLeftBoxes[i2] = aabbCombine(prev, box);
    }
  }
  if (N > 0) {
    nodeRightBoxes[N - 1] = elems.boundingBoxes[sortedIndicesThisAxis[N - 1]];
    for (let i2 = N - 2; i2 >= 0; i2--) {
      const right = nodeRightBoxes[i2 + 1];
      const curr = elems.boundingBoxes[sortedIndicesThisAxis[i2]];
      nodeRightBoxes[i2] = aabbCombine(curr, right);
    }
  }
  if (input.graph) {
    for (let i2 = 0; i2 < N; i2++) {
      const elemIndex = sortedIndicesThisAxis[i2];
      deltaWeights[i2] = sumAdjacencyWeightsAtSplit(
        input.graph,
        connectionIndicesInSortedElements,
        node,
        i2,
        elemIndex
      );
    }
    let runningSum = 0;
    for (let i2 = 0; i2 < N; i2++) {
      splitWeights[i2] = runningSum;
      runningSum += deltaWeights[i2];
    }
    for (const w of splitWeights) {
      if (w >= 1e12)
        return 6 /* ERROR_WEIGHT_OVERFLOW */;
    }
  }
  let sumPosition = 0;
  let sumAxis = 0;
  let sumCost = 0;
  for (let i2 = 1; i2 < N; i2++) {
    const candidate = new Split();
    candidate.axis = Axis;
    candidate.position = i2;
    candidate.cost = splitCost(AlignBoth, input, splitWeights, nodeLeftBoxes[i2], nodeRightBoxes[i2], N, i2);
    splitOut.copy(minSplitCost(splitOut, candidate));
    sumAxis += candidate.axis;
    sumPosition += candidate.position;
    sumCost += candidate.cost;
  }
  return 0 /* SUCCESS */;
}
function splitNode(input, temporaries, node, outNodes, outNodesAlloc) {
  const nodeLeftBoxes = temporaries.leftChildrenBoxes.slice(node.offset, node.offset + node.count);
  const nodeRightBoxes = temporaries.rightChildrenBoxes.slice(node.offset, node.offset + node.count);
  const nodeDeltaWeights = input.graph ? temporaries.deltaWeights.slice(node.offset, node.offset + node.count) : [];
  const nodeSplitWeights = input.graph ? temporaries.splitWeights.slice(node.offset, node.offset + node.count) : [];
  const sortedElementIndicesPerAxis = [
    temporaries.sortedElementIndicesPerAxis[0].slice(node.offset, node.offset + node.count),
    temporaries.sortedElementIndicesPerAxis[1].slice(node.offset, node.offset + node.count),
    temporaries.sortedElementIndicesPerAxis[2].slice(node.offset, node.offset + node.count)
  ];
  let split = new Split();
  let splitResult;
  splitResult = findBestSplit(0, true, input, node, sortedElementIndicesPerAxis[0], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[0], nodeDeltaWeights, nodeSplitWeights, split);
  if (splitResult != 0 /* SUCCESS */) {
    return splitResult;
  }
  splitResult = findBestSplit(1, true, input, node, sortedElementIndicesPerAxis[1], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[1], nodeDeltaWeights, nodeSplitWeights, split);
  if (splitResult != 0 /* SUCCESS */) {
    return splitResult;
  }
  splitResult = findBestSplit(2, true, input, node, sortedElementIndicesPerAxis[2], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[2], nodeDeltaWeights, nodeSplitWeights, split);
  if (splitResult != 0 /* SUCCESS */) {
    return splitResult;
  }
  if (!split.valid()) {
    splitResult = findBestSplit(0, false, input, node, sortedElementIndicesPerAxis[0], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[0], nodeDeltaWeights, nodeSplitWeights, split);
    if (splitResult != 0 /* SUCCESS */) {
      return splitResult;
    }
    splitResult = findBestSplit(1, false, input, node, sortedElementIndicesPerAxis[1], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[1], nodeDeltaWeights, nodeSplitWeights, split);
    if (splitResult != 0 /* SUCCESS */) {
      return splitResult;
    }
    splitResult = findBestSplit(2, false, input, node, sortedElementIndicesPerAxis[2], nodeLeftBoxes, nodeRightBoxes, temporaries.connectionIndicesInSortedElements[2], nodeDeltaWeights, nodeSplitWeights, split);
    if (splitResult != 0 /* SUCCESS */) {
      return splitResult;
    }
  }
  if (split.position <= 0 || split.position >= sortedElementIndicesPerAxis[0].length || split.position >= node.count) {
    return 2 /* ERROR_INTERNAL */;
  }
  partitionAtSplit(sortedElementIndicesPerAxis, split.axis, split.position, temporaries.partitionSides);
  outNodes[outNodesAlloc.value + 0] = new Range(node.offset, split.position);
  outNodes[outNodesAlloc.value + 1] = new Range(node.offset + split.position, node.count - split.position);
  outNodesAlloc.value += 2;
  return 0 /* SUCCESS */;
}
function buildAdjacencyInSortedList(input, sortedElementIndices, connectionIndicesInSortedElements, backMapping) {
  for (let i2 = 0; i2 < sortedElementIndices.length; i2++) {
    const elem = sortedElementIndices[i2];
    backMapping[elem] = i2;
  }
  const g = input.graph;
  for (let i2 = 0; i2 < g.connectionCount; i2++) {
    const tgt = g.connectionTargets[i2];
    connectionIndicesInSortedElements[i2] = backMapping[tgt];
  }
}
function clusterize(input, clusters) {
  if (input.config.minClusterSize <= 0 || input.config.maxClusterSize <= 0 || input.config.minClusterSize > input.config.maxClusterSize) {
    return 3 /* ERROR_INVALID_CONFIG */;
  }
  if (!input.spatialElements || input.spatialElements.elementCount != clusters.clusteredElementIndexCount) {
    return 4 /* ERROR_INVALID_BOUNDS */;
  }
  const spatialElements = input.spatialElements;
  if (spatialElements.elementCount == 0) {
    return 0 /* SUCCESS */;
  }
  let outputSizes = new Requirements();
  outputSizes.maxClusterCount = 0;
  outputSizes.maxClusteredElementCount = spatialElements.elementCount;
  let partitionSides = new Array(spatialElements.elementCount).fill(0);
  let leftChildrenBoxes = new Array(spatialElements.elementCount).fill(null).map(() => new AABB());
  let rightChildrenBoxes = new Array(spatialElements.elementCount).fill(null).map(() => new AABB());
  let deltaWeights = [];
  let splitWeights = [];
  let connectionIndicesInSortedElements = new Array(3).fill(null).map(() => []);
  let sortedY = new Array(clusters.clusteredElementIndexCount).fill(0);
  let sortedZ = new Array(clusters.clusteredElementIndexCount).fill(0);
  for (let i2 = 0; i2 < clusters.clusteredElementIndexCount; i2++) {
    clusters.clusteredElementIndices[i2] = i2;
    sortedY[i2] = i2;
    sortedZ[i2] = i2;
  }
  const sortedElementIndicesPerAxis = [
    // clusters.clusteredElementIndices.slice(0, clusters.clusteredElementIndexCount),
    createArrayView(clusters.clusteredElementIndices, 0, clusters.clusteredElementIndexCount),
    sortedY,
    sortedZ
  ];
  {
    sortedElementIndicesPerAxis[0].sort(createCentroidComparator(0, spatialElements));
    sortedElementIndicesPerAxis[1].sort(createCentroidComparator(1, spatialElements));
    sortedElementIndicesPerAxis[2].sort(createCentroidComparator(2, spatialElements));
  }
  if (input.graph) {
    if (input.graph.nodeCount != spatialElements.elementCount) {
      return 5 /* ERROR_INVALID_GRAPH */;
    }
    resizeArray(deltaWeights, spatialElements.elementCount, () => 0);
    resizeArray(splitWeights, spatialElements.elementCount, () => 0);
    for (let axis = 0; axis < 3; ++axis) {
      resizeArray(connectionIndicesInSortedElements[axis], input.graph.connectionCount, () => 0);
    }
  }
  let perNodeElementIndexRanges = [[], []];
  let currentNodeRangeList = 0;
  let nextNodeRangeList = 1;
  let underflowClusters = 0;
  const sanitizedPreSplitThreshold = Math.max(input.config.preSplitThreshold, input.config.maxClusterSize * 2);
  if (input.config.preSplitThreshold == 0 || spatialElements.elementCount < sanitizedPreSplitThreshold) {
    perNodeElementIndexRanges[currentNodeRangeList].push(new Range(0, spatialElements.elementCount));
  } else {
    splitAtMedianUntil(input.spatialElements, partitionSides, sortedElementIndicesPerAxis, sanitizedPreSplitThreshold, 0, perNodeElementIndexRanges[currentNodeRangeList]);
  }
  let backmapping = new Array(3).fill(null).map(() => []);
  for (let i2 = 0; i2 < 3; i2++) {
    resizeArray(backmapping[i2], sortedElementIndicesPerAxis.length, () => 0);
  }
  while (perNodeElementIndexRanges[currentNodeRangeList].length !== 0) {
    if (input.graph != void 0) {
      for (let axis = 0; axis < 3; ++axis) {
        buildAdjacencyInSortedList(input, sortedElementIndicesPerAxis[axis], connectionIndicesInSortedElements[axis], backmapping[axis]);
      }
    }
    let nodesBAlloc = { value: 0 };
    resizeArray(perNodeElementIndexRanges[nextNodeRangeList], perNodeElementIndexRanges[nextNodeRangeList].length, () => new Range());
    const intermediates = new SplitNodeTemporaries();
    intermediates.partitionSides = createArrayView(partitionSides, 0, partitionSides.length);
    intermediates.leftChildrenBoxes = createArrayView(leftChildrenBoxes, 0, leftChildrenBoxes.length);
    intermediates.rightChildrenBoxes = createArrayView(rightChildrenBoxes, 0, rightChildrenBoxes.length);
    intermediates.deltaWeights = createArrayView(deltaWeights, 0, deltaWeights.length);
    intermediates.splitWeights = createArrayView(splitWeights, 0, splitWeights.length);
    intermediates.connectionIndicesInSortedElements = [
      createArrayView(connectionIndicesInSortedElements[0], 0, connectionIndicesInSortedElements[0].length),
      createArrayView(connectionIndicesInSortedElements[1], 0, connectionIndicesInSortedElements[1].length),
      createArrayView(connectionIndicesInSortedElements[2], 0, connectionIndicesInSortedElements[2].length)
    ];
    intermediates.sortedElementIndicesPerAxis = [
      createArrayView(sortedElementIndicesPerAxis[0], 0, sortedElementIndicesPerAxis[0].length),
      createArrayView(sortedElementIndicesPerAxis[1], 0, sortedElementIndicesPerAxis[1].length),
      createArrayView(sortedElementIndicesPerAxis[2], 0, sortedElementIndicesPerAxis[2].length)
    ];
    {
      let result = 0 /* SUCCESS */;
      for (let parallelItemIndex = 0; parallelItemIndex < perNodeElementIndexRanges[currentNodeRangeList].length; parallelItemIndex++) {
        if (result != 0 /* SUCCESS */) {
          break;
        }
        const node = perNodeElementIndexRanges[currentNodeRangeList][parallelItemIndex];
        if (node.count <= input.config.maxClusterSize) {
          if (node.count == 0) {
            result = 2 /* ERROR_INTERNAL */;
            break;
          }
          clusters.clusterRanges[outputSizes.maxClusterCount++] = node;
          if (node.count < input.config.minClusterSize) {
            underflowClusters++;
          }
        } else {
          let res = splitNode(input, intermediates, node, perNodeElementIndexRanges[nextNodeRangeList], nodesBAlloc);
          clusters.clusteredElementIndices[0] = intermediates.sortedElementIndicesPerAxis[0][0];
          clusters.clusteredElementIndices[1] = intermediates.sortedElementIndicesPerAxis[0][1];
          clusters.clusteredElementIndices[2] = intermediates.sortedElementIndicesPerAxis[0][2];
          clusters.clusteredElementIndices[3] = intermediates.sortedElementIndicesPerAxis[0][3];
          if (res != 0 /* SUCCESS */) {
            result = res;
            break;
          }
        }
      }
      if (result != 0 /* SUCCESS */) {
        return result;
      }
    }
    resizeArray(perNodeElementIndexRanges[nextNodeRangeList], nodesBAlloc.value, () => new Range());
    perNodeElementIndexRanges[currentNodeRangeList] = [];
    currentNodeRangeList = (currentNodeRangeList + 1) % 2;
    nextNodeRangeList = (nextNodeRangeList + 1) % 2;
  }
  if (input.config.preSplitThreshold == 0) {
    if (underflowClusters > 1) {
      return 2 /* ERROR_INTERNAL */;
    }
  } else {
    if (underflowClusters > div_ceil(spatialElements.elementCount, sanitizedPreSplitThreshold)) {
      return 2 /* ERROR_INTERNAL */;
    }
  }
  clusters.clusteredElementIndexCount = outputSizes.maxClusteredElementCount;
  clusters.clusterCount = outputSizes.maxClusterCount;
  return 0 /* SUCCESS */;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/nvcluster.ts
var Range = class {
  offset = 0;
  count = 0;
  constructor(offset = 0, count = 0) {
    this.offset = offset;
    this.count = count;
  }
};
var Config = class {
  // Minimum number of elements contained in a cluster
  minClusterSize = 1;
  // Maximum number of elements contained in a cluster
  maxClusterSize = ~0;
  // Cost penalty for under-filling clusters
  costUnderfill = 1;
  // Cost penalty for overlapping bounding boxes
  costOverlap = 0.01;
  // If nonzero the set of input elements will first be split along its median
  // until each subset contains at most preSplitThreshold elements prior to actual
  // clustering. This is an optimization intended to speed up clustering of large
  // sets of elements
  preSplitThreshold = 0;
};
var AABB = class {
  bboxMin = [Infinity, Infinity, Infinity];
  bboxMax = [-Infinity, -Infinity, -Infinity];
  constructor(bboxMin = [Infinity, Infinity, Infinity], bboxMax = [-Infinity, -Infinity, -Infinity]) {
    this.bboxMin = bboxMin;
    this.bboxMax = bboxMax;
  }
};
var SpatialElements2 = class {
  // Bounding boxes of elements to cluster
  boundingBoxes;
  // Center positions (xyz) of elements to cluster
  centroids;
  // Number of elements
  elementCount = 0;
};
var Graph2 = class {
  // Each node is defined by its connections to other nodes, stored at node.offset in connectionTargets. Each node has node.count connections
  nodes;
  // Total number of nodes in the graph
  nodeCount = 0;
  // Connection targets for the nodes, referenced by nodes
  connectionTargets;
  // Weight of each connection
  connectionWeights;
  // Total number of connections in the graph
  connectionCount = 0;
};
var Input2 = class {
  // Clustering configuration
  config = new Config();
  // Set of elements to cluster, required
  spatialElements = new SpatialElements2();
  // Optional graph defining the weighted connectivity between elements, used to optimize a cost function
  // when clustering
  graph;
};
var ClusterGetRequirementsSegmentedInfo = class {
  // Input elements to cluster
  input;
  // Each segment is defined by a range within the array of elements defined in input
  elementSegments;
  // Number of segments
  elementSegmentCount = 0;
};
var ClusterGetRequirementsInfo = class {
  // Input elements to cluster
  input;
};
var ClusterCreateSegmentedInfo = class {
  input;
  // Each segment is defined by a range within the array of elements defined in input
  elementSegments;
  // Number of segments
  elementSegmentCount = 0;
};
var Output2 = class {
  // Clusters defined by ranges of element indices, where each cluster starts at range.offset in clusteredElementIndices and contains range.count elements
  clusterRanges;
  // Indices of the elements, referenced by clusterRanges
  clusteredElementIndices;
  // Total number of clusters generated by the clustering (may be less than maxClusterCount)
  clusterCount = 0;
  // Total number of cluster element indices (FIXME why, shouldn't this be the same as the input?)
  clusteredElementIndexCount = 0;
};
var Requirements = class {
  // Maximum number of generated clusters
  maxClusterCount = 0;
  // Maximum total number of elements referenced by the clusters
  maxClusteredElementCount = 0;
};
var ClusterCreateInfo = class {
  // Input elements to cluster
  input;
};
function generateClusters(input, clusterStorage) {
  let info = new ClusterGetRequirementsInfo();
  info.input = input;
  let reqs = new Requirements();
  let result = nvclusterGetRequirements(info, reqs);
  if (result != 0 /* SUCCESS */) {
    return result;
  }
  resizeArray(clusterStorage.clusterRanges, reqs.maxClusterCount, () => new Range());
  resizeArray(clusterStorage.clusterItems, reqs.maxClusteredElementCount, () => 0);
  let createInfo = new ClusterCreateInfo();
  createInfo.input = input;
  let clusters = new Output2();
  clusters.clusteredElementIndices = clusterStorage.clusterItems;
  clusters.clusterRanges = clusterStorage.clusterRanges;
  clusters.clusterCount = reqs.maxClusterCount;
  clusters.clusteredElementIndexCount = reqs.maxClusteredElementCount;
  result = nvclusterCreate(createInfo, clusters);
  if (result == 0 /* SUCCESS */) {
    resizeArray(clusterStorage.clusterRanges, clusters.clusterCount, () => new Range());
    resizeArray(clusterStorage.clusterItems, clusters.clusteredElementIndexCount, () => 0);
  }
  return result;
}
function nvclusterGetRequirements(info, requirements) {
  if (requirements == void 0) {
    return 7 /* ERROR_INVALID_ARGUMENT */;
  }
  if (info.input.config.minClusterSize == 0 || info.input.config.maxClusterSize == 0) {
    requirements = new Requirements();
    return 3 /* ERROR_INVALID_CONFIG */;
  }
  const n = info.input.spatialElements.elementCount;
  const Ca = info.input.config.minClusterSize;
  const P = info.input.config.preSplitThreshold;
  const P_underfill = P == 0 ? 0 : (n + P - 1) / P;
  const maxClusters = (n + Ca - 1) / Ca + P_underfill;
  requirements.maxClusteredElementCount = Math.floor(n);
  requirements.maxClusterCount = Math.floor(maxClusters);
  return 0 /* SUCCESS */;
}
function nvclusterGetRequirementsSegmented(info, requirements) {
  if (requirements == void 0) {
    return 7 /* ERROR_INVALID_ARGUMENT */;
  }
  requirements.maxClusterCount = 0;
  requirements.maxClusteredElementCount = 0;
  for (let itemSegmentIndex = 0; itemSegmentIndex < info.elementSegmentCount; itemSegmentIndex++) {
    const range = info.elementSegments[itemSegmentIndex];
    let segmentInfo = new ClusterGetRequirementsInfo();
    let segmentInput = new Input2();
    let segmentBounds = new SpatialElements2();
    segmentInput.config = info.input.config;
    segmentBounds.elementCount = range.count;
    segmentInput.spatialElements = segmentBounds;
    segmentInfo.input = segmentInput;
    let segmentResult = new Requirements();
    let res = nvclusterGetRequirements(segmentInfo, segmentResult);
    if (res != 0 /* SUCCESS */) {
      return res;
    }
    requirements.maxClusterCount += segmentResult.maxClusterCount;
    requirements.maxClusteredElementCount += segmentResult.maxClusteredElementCount;
  }
  return 0 /* SUCCESS */;
}
function nvclusterCreate(info, clusters) {
  if (info == void 0 || info.input == void 0 || info.input.spatialElements == void 0) {
    return 1 /* ERROR_INVALID_CREATE_INFO */;
  }
  let result = clusterize(info.input, clusters);
  return result;
}
function nvclustersCreateSegmented(info, clusters, clusterSegments) {
  let sizes = new Requirements();
  for (let segmentIndex = 0; segmentIndex < info.elementSegmentCount; segmentIndex++) {
    const range = info.elementSegments[segmentIndex];
    let segmentInput = new Input2();
    let segmentBounds = new SpatialElements2();
    segmentBounds.boundingBoxes = info.input.spatialElements.boundingBoxes.slice(range.offset);
    segmentBounds.centroids = info.input.spatialElements.centroids.slice(3 * range.offset);
    segmentBounds.elementCount = range.count;
    segmentInput.spatialElements = segmentBounds;
    segmentInput.config = info.input.config;
    segmentInput.graph = info.input.graph;
    if (sizes.maxClusteredElementCount + range.count > clusters.clusteredElementIndexCount) {
      return 2 /* ERROR_INTERNAL */;
    }
    let segmentedOutput = new Output2();
    segmentedOutput.clusterRanges = createArrayView(clusters.clusterRanges, sizes.maxClusterCount, clusters.clusterCount - sizes.maxClusterCount);
    segmentedOutput.clusteredElementIndices = createArrayView(clusters.clusteredElementIndices, sizes.maxClusteredElementCount, clusters.clusteredElementIndexCount - sizes.maxClusteredElementCount);
    segmentedOutput.clusterCount = clusters.clusterCount - sizes.maxClusterCount;
    segmentedOutput.clusteredElementIndexCount = range.count;
    if (segmentInput.spatialElements == void 0) {
      return 4 /* ERROR_INVALID_BOUNDS */;
    }
    let result = clusterize(segmentInput, segmentedOutput);
    if (result != 0 /* SUCCESS */) {
      return result;
    }
    if (sizes.maxClusterCount + segmentedOutput.clusterCount > clusters.clusterCount) {
      return 2 /* ERROR_INTERNAL */;
    }
    for (let rangeIndex = 0; rangeIndex < segmentedOutput.clusterCount; rangeIndex++) {
      const clusterRange = segmentedOutput.clusterRanges[rangeIndex];
      clusterRange.offset += sizes.maxClusteredElementCount;
    }
    for (let itemIndex = 0; itemIndex < segmentedOutput.clusteredElementIndexCount; itemIndex++) {
      segmentedOutput.clusteredElementIndices[itemIndex] += range.offset;
    }
    clusterSegments[segmentIndex] = new Range(sizes.maxClusterCount, segmentedOutput.clusterCount);
    sizes.maxClusterCount += segmentedOutput.clusterCount;
    sizes.maxClusteredElementCount += segmentedOutput.clusteredElementIndexCount;
  }
  clusters.clusteredElementIndexCount = sizes.maxClusteredElementCount;
  clusters.clusterCount = sizes.maxClusterCount;
  return 0 /* SUCCESS */;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/nvcluster_storage.ts
var ClusterStorage = class {
  clusterRanges = [];
  clusterItems = [];
};
var SegmentedClusterStorage = class {
  clusterRangeSegments = [];
  clusterRanges = [];
  clusterItems = [];
};
function generateSegmentedClusters(input, itemSegments, itemSegmentCount, segmentedClusterStorage) {
  resizeArray(segmentedClusterStorage.clusterRangeSegments, itemSegmentCount, () => new Range());
  let info = new ClusterGetRequirementsSegmentedInfo();
  info.input = input;
  info.elementSegmentCount = itemSegmentCount;
  info.elementSegments = itemSegments;
  let reqs = new Requirements();
  let result = nvclusterGetRequirementsSegmented(info, reqs);
  if (result != 0 /* SUCCESS */) {
    return result;
  }
  resizeArray(segmentedClusterStorage.clusterRanges, reqs.maxClusterCount, () => new Range());
  resizeArray(segmentedClusterStorage.clusterItems, reqs.maxClusteredElementCount, () => 0);
  let createInfo = new ClusterCreateSegmentedInfo();
  createInfo.input = input;
  createInfo.elementSegmentCount = itemSegmentCount;
  createInfo.elementSegments = itemSegments;
  let clusters = new Output2();
  clusters.clusteredElementIndices = segmentedClusterStorage.clusterItems;
  clusters.clusterRanges = segmentedClusterStorage.clusterRanges;
  clusters.clusterCount = reqs.maxClusterCount;
  clusters.clusteredElementIndexCount = reqs.maxClusteredElementCount;
  result = nvclustersCreateSegmented(createInfo, clusters, segmentedClusterStorage.clusterRangeSegments);
  if (result == 0 /* SUCCESS */) {
    resizeArray(segmentedClusterStorage.clusterRanges, clusters.clusterCount, () => new Range());
    resizeArray(segmentedClusterStorage.clusterItems, clusters.clusteredElementIndexCount, () => 0);
  }
  return result;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_mesh.ts
var ORIGINAL_MESH_GROUP = 4294967295;
var NVLOD_MINIMAL_ADJACENCY_SIZE = 5;
var NVLOD_LOCKED_VERTEX_WEIGHT_MULTIPLIER = 10;
var NVLOD_VERTEX_WEIGHT_MULTIPLIER = 10;
var lodLevel = 0;
var MeshRequirements = class {
  // Maximum total number of triangles across LODs
  maxTriangleCount = 0;
  // Maximum total number of clusters across LODs
  maxClusterCount = 0;
  // Maximum total number of cluster groups across LODs
  maxGroupCount = 0;
  // Maximum number of LODs in the mesh
  maxLodLevelCount = 0;
};
var MeshInput = class {
  // Pointer to triangle definitions, 3 indices per triangle
  indices;
  // Number of indices in the mesh
  indexCount = 0;
  // Vertex data for the mesh, 3 floats per entry
  vertices;
  // Offset in vertices where the vertex data for the mesh starts, in float
  vertexOffset = 0;
  // Number of vertices in the mesh
  vertexCount = 0;
  // Stride in bytes between the beginning of two successive vertices (e.g. 12 bytes for densely packed positions)
  vertexStride = 0;
  // Configuration for the generation of triangle clusters
  clusterConfig = {
    minClusterSize: 96,
    maxClusterSize: 128,
    costUnderfill: 0.9,
    costOverlap: 0.5,
    preSplitThreshold: 1 << 17
  };
  // Configuration for the generation of cluster groups
  // Each LOD is comprised of a number of cluster groups
  groupConfig = {
    minClusterSize: 24,
    maxClusterSize: 32,
    costUnderfill: 0.5,
    costOverlap: 0,
    preSplitThreshold: 0
  };
  // Decimation factor applied between successive LODs
  decimationFactor = 0;
};
var MeshOutput = class {
  // Triangle clusters. Each Range represents one cluster covering range.count triangles in clusterTriangles, starting at range.offset
  clusterTriangleRanges;
  // Triangle data for the clusters, referenced by clusterTriangleRanges
  clusterTriangles;
  // Decimation takes the mesh at a given LOD represented by a number of cluster groups,
  // and generates a (smaller) number of cluster groups for the next coarser LOD. For each
  // generated cluster clusterGeneratingGroups stores the index of the group it was generated from.
  // For the clusters at the finest LOD (LOD 0) that index is ORIGINAL_MESH_GROUP
  clusterGeneratingGroups;
  // Bounding spheres of the clusters, may be nullptr
  clusterBoundingSpheres;
  // Error metric after decimating geometry in each group. Counter-intuitively,
  // not the error of the geometry in the group - that value does not exist
  // per-group but would be the group quadric error of the cluster's generating
  // group. This saves duplicating errors per cluster. The final LOD is just one
  // group, is not decimated, and has an error of zero.
  // TODO: shouldn't this be infinite error so it's always drawn?
  groupQuadricErrors;
  // Ranges of clusters contained in each group so that the clusters of a group are stored at range.offset in clusterTriangleRanges
  // and the group covers range.count clusters.
  groupClusterRanges;
  // Ranges of groups comprised in each LOD level, so that the groups for LOD n are stored at lodLevelGroupRanges[n].offset and the LOD
  // uses lodLevelGroupRanges[n].count groups. The finest LOD is at index 0, followed by the coarser LODs from finer to coarser
  lodLevelGroupRanges;
  // Number of triangles in the mesh across LODs
  triangleCount = 0;
  // Number of clusters in the mesh across LODs
  clusterCount = 0;
  // Number of cluster groups in the mesh across LODs
  groupCount = 0;
  // Number of LODs in the mesh
  lodLevelCount = 0;
};
var MeshGetRequirementsInfo = class {
  // Definition of the input geometry and clustering configuration
  input;
};
var MeshCreateInfo = class {
  // Definition of the input geometry and clustering configuration
  input;
};
var TriangleClusters = class {
  clustering = new SegmentedClusterStorage();
  // Bounding boxes for each cluster
  clusterAabbs = [];
  // Triangles are clustered from ranges of input geometry. The initial
  // clustering has one range - the whole mesh. Subsequent ranges come from
  // decimated cluster groups of the previous level. The generating group is
  // implicitly generatingGroupOffset plus the segment index.
  generatingGroupOffset;
  maxClusterItems;
};
var uvec3 = class {
  x = 0;
  y = 0;
  z = 0;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
};
Object.defineProperties(uvec3.prototype, {
  "0": {
    get() {
      return this.x;
    },
    set(value) {
      this.x = value;
    }
  },
  "1": {
    get() {
      return this.y;
    },
    set(value) {
      this.y = value;
    }
  },
  "2": {
    get() {
      return this.z;
    },
    set(value) {
      this.z = value;
    }
  }
});
var vec32 = class {
  x = 0;
  y = 0;
  z = 0;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
};
Object.defineProperties(vec32.prototype, {
  "0": {
    get() {
      return this.x;
    },
    set(value) {
      this.x = value;
    }
  },
  "1": {
    get() {
      return this.y;
    },
    set(value) {
      this.y = value;
    }
  },
  "2": {
    get() {
      return this.z;
    },
    set(value) {
      this.z = value;
    }
  }
});
var vec4 = class {
  x = 0;
  y = 0;
  z = 0;
  w = 0;
  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
};
Object.defineProperties(vec4.prototype, {
  "0": {
    get() {
      return this.x;
    },
    set(value) {
      this.x = value;
    }
  },
  "1": {
    get() {
      return this.y;
    },
    set(value) {
      this.y = value;
    }
  },
  "2": {
    get() {
      return this.z;
    },
    set(value) {
      this.z = value;
    }
  },
  "3": {
    get() {
      return this.w;
    },
    set(value) {
      this.w = value;
    }
  }
});
var AdjacencyVertexCount = class {
  vertexCount = 0;
  lockedCount = 0;
};
function getTriangle(mesh, index) {
  const startIndex = index * 3;
  return mesh.indices.subarray(startIndex, startIndex + 3);
}
function getVertex(mesh, index) {
  const floatStride = mesh.vertexStride;
  const startIndex = index * floatStride;
  return mesh.vertices.subarray(startIndex, startIndex + floatStride);
}
function centroidAABB(aabb) {
  let res = new vec32();
  res.x = (aabb.bboxMax[0] + aabb.bboxMin[0]) / 2;
  res.y = (aabb.bboxMax[1] + aabb.bboxMin[1]) / 2;
  res.z = (aabb.bboxMax[2] + aabb.bboxMin[2]) / 2;
  return res;
}
function emptyAABB() {
  let res = new AABB();
  res.bboxMin[0] = Number.MAX_VALUE;
  res.bboxMin[1] = Number.MAX_VALUE;
  res.bboxMin[2] = Number.MAX_VALUE;
  res.bboxMax[0] = -Number.MAX_VALUE;
  res.bboxMax[1] = -Number.MAX_VALUE;
  res.bboxMax[2] = -Number.MAX_VALUE;
  return res;
}
function addAABB(aabb, added) {
  for (let i2 = 0; i2 < 3; i2++) {
    aabb.bboxMin[i2] = Math.min(aabb.bboxMin[i2], added.bboxMin[i2]);
    aabb.bboxMax[i2] = Math.max(aabb.bboxMax[i2], added.bboxMax[i2]);
  }
}
var DecimatedClusterGroups = class {
  // Ranges of triangles. Initially there is just one range containing the input
  // mesh. In subsequent iterations each ranges is a group of decimated
  // triangles. Clusters of triangles are formed within each range.
  groupTriangleRanges = [];
  // Triangle indices and vertices. Triangles are grouped by
  // groupTriangleRanges. Vertices always point to the input mesh vertices.
  mesh = new MeshInput();
  // Storage for decimated triangles from the previous pass. Note that triangles
  // are written to the output in clusters, which are formed from these at the
  // start of each iteration.
  decimatedTriangleStorage = [];
  // Per-group quadric errors from decimation
  groupQuadricErrors = [];
  // Added to the groupTriangleRanges index for a global group index. This is
  // needed to write clusterGeneratingGroups.
  baseClusterGroupIndex = 0;
  // Boolean list of locked vertices from the previous pass. Used to encourage
  // connecting clusters with shared locked vertices by increasing adjacency
  // weights.
  globalLockedVertices = [];
};
var OutputWritePositions = class {
  clusterTriangleRange = 0;
  clusterTriangleVertex = 0;
  clusterParentGroup = 0;
  clusterBoundingSphere = 0;
  groupQuadricError = 0;
  groupCluster = 0;
  lodLevelGroup = 0;
};
function divCeil(a, b) {
  return Math.floor((a + b - 1) / b);
}
function nvclusterlodMeshGetRequirements(info) {
  const triangleCount = info.input.indexCount / 3;
  assert(triangleCount != 0);
  const lod0ClusterCount = divCeil(triangleCount, info.input.clusterConfig.maxClusterSize) + 1;
  const idealLevelCount = Math.ceil(-Math.log(lod0ClusterCount) / Math.log(info.input.decimationFactor));
  const idealClusterCount = lod0ClusterCount * idealLevelCount;
  const idealClusterGroupCount = divCeil(idealClusterCount, info.input.groupConfig.maxClusterSize);
  let result = new MeshRequirements();
  result.maxTriangleCount = idealClusterCount * info.input.clusterConfig.maxClusterSize;
  result.maxClusterCount = idealClusterCount;
  result.maxGroupCount = idealClusterGroupCount * 4;
  result.maxLodLevelCount = idealLevelCount * 2 + 1;
  return result;
}
function exclusive_scan_impl(input, init, op) {
  let sum = init;
  const output = [];
  for (const value of input) {
    output.push(sum);
    sum = op(sum, value);
  }
  return output;
}
function computeLockedVertices(inputMesh, triangleClusters, clusterGrouping) {
  const VERTEX_NOT_SEEN = 4294967295;
  const VERTEX_ADDED = 4294967294;
  let lockedVertices = new Array(inputMesh.vertexCount).fill(0);
  let vertexClusterGroups = new Array(inputMesh.vertexCount).fill(VERTEX_NOT_SEEN);
  for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGrouping.groups.clusterRanges.length; ++clusterGroupIndex) {
    const range = clusterGrouping.groups.clusterRanges[clusterGroupIndex];
    const clusterGroup = createArrayView(clusterGrouping.groups.clusterItems, range.offset, range.count);
    for (const clusterIndex of clusterGroup) {
      const clusterRange = triangleClusters.clustering.clusterRanges[clusterIndex];
      const cluster = createArrayView(triangleClusters.clustering.clusterItems, clusterRange.offset, clusterRange.count);
      for (const triangleIndex of cluster) {
        const tri = getTriangle(inputMesh, triangleIndex);
        for (let i2 = 0; i2 < 3; ++i2) {
          const vertexIndex = tri[i2];
          let vertexClusterGroup = vertexClusterGroups[vertexIndex];
          if (vertexClusterGroup == VERTEX_NOT_SEEN) {
            vertexClusterGroups[vertexIndex] = clusterGroupIndex;
          } else if (vertexClusterGroup != VERTEX_ADDED && vertexClusterGroup != clusterGroupIndex) {
            lockedVertices[vertexIndex] = 1;
            vertexClusterGroups[vertexIndex] = VERTEX_ADDED;
          }
        }
      }
    }
  }
  return lockedVertices;
}
function decimateClusterGroups(current, triangleClusters, clusterGrouping, lodLevelDecimationFactor) {
  const inputMesh = current.mesh;
  let result = new DecimatedClusterGroups();
  result.globalLockedVertices = computeLockedVertices(inputMesh, triangleClusters, clusterGrouping);
  result.decimatedTriangleStorage = resizeArray(result.decimatedTriangleStorage, clusterGrouping.totalTriangleCount, () => new uvec3());
  {
    result.mesh.indices = new Uint32Array(vec3_to_number(result.decimatedTriangleStorage));
  }
  result.groupTriangleRanges = resizeArray(result.groupTriangleRanges, clusterGrouping.groups.clusterRanges.length, () => new Range());
  result.groupQuadricErrors = resizeArray(result.groupQuadricErrors, clusterGrouping.groups.clusterRanges.length, () => 0);
  result.baseClusterGroupIndex = clusterGrouping.globalGroupOffset;
  let decimatedTriangleAlloc = 0;
  let success = 0 /* SUCCESS */;
  for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGrouping.groups.clusterRanges.length; clusterGroupIndex++) {
    if (success != 0 /* SUCCESS */) {
      break;
    }
    const clusterGroupRange = clusterGrouping.groups.clusterRanges[clusterGroupIndex];
    let clusterGroupTriangleVertices = [];
    for (let indexInRange = clusterGroupRange.offset; indexInRange < clusterGroupRange.offset + clusterGroupRange.count; indexInRange++) {
      const clusterIndex = clusterGrouping.groups.clusterItems[indexInRange];
      const clusterRange = triangleClusters.clustering.clusterRanges[clusterIndex];
      for (let index = clusterRange.offset; index < clusterRange.offset + clusterRange.count; index++) {
        const triangleIndex = triangleClusters.clustering.clusterItems[index];
        const triPtr = getTriangle(inputMesh, triangleIndex);
        clusterGroupTriangleVertices.push(new uvec3(triPtr[0], triPtr[1], triPtr[2]));
      }
    }
    let decimatedTriangleVertices = new Array(clusterGroupTriangleVertices.length).fill(null).map(() => new uvec3());
    const targetError = 34028234663852886e22;
    let absoluteError = 0;
    const options = meshopt_SimplifySparse | meshopt_SimplifyErrorAbsolute;
    const desiredTriangleCount = Math.floor(clusterGroupTriangleVertices.length * lodLevelDecimationFactor);
    const ret = Meshoptimizer2.meshopt_simplifyWithAttributes(
      decimatedTriangleVertices.length * 3,
      new Uint32Array(vec3_to_number(clusterGroupTriangleVertices)),
      clusterGroupTriangleVertices.length * 3,
      inputMesh.vertices,
      // getVertex(inputMesh, 0),
      inputMesh.vertexCount,
      inputMesh.vertexStride,
      null,
      0,
      null,
      0,
      new Uint8Array(result.globalLockedVertices),
      desiredTriangleCount * 3,
      targetError,
      options
    );
    let simplifiedTriangleCount = ret.ret / 3;
    decimatedTriangleVertices = number_to_uvec3(ret.destination);
    absoluteError = ret.out_result_error;
    if (desiredTriangleCount < simplifiedTriangleCount) {
      console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Retrying, ignoring topology`);
      let positionUniqueTriangleVertices = new Array(clusterGroupTriangleVertices.length).fill(null).map(() => new uvec3());
      const ret_shadowIndexBuffer = Meshoptimizer2.meshopt_generateShadowIndexBuffer(
        new Uint32Array(vec3_to_number(clusterGroupTriangleVertices)),
        clusterGroupTriangleVertices.length * 3,
        inputMesh.vertices,
        // getVertex(inputMesh, 0),
        inputMesh.vertexCount,
        3,
        // vertex_size, for interleaved this stays at 3 * 4
        inputMesh.vertexStride
      );
      positionUniqueTriangleVertices = number_to_uvec3(ret_shadowIndexBuffer);
      const ret2 = Meshoptimizer2.meshopt_simplifyWithAttributes(
        decimatedTriangleVertices.length * 3,
        new Uint32Array(vec3_to_number(positionUniqueTriangleVertices)),
        positionUniqueTriangleVertices.length * 3,
        inputMesh.vertices,
        // getVertex(inputMesh, 0),
        inputMesh.vertexCount,
        inputMesh.vertexStride,
        null,
        0,
        null,
        0,
        new Uint8Array(result.globalLockedVertices),
        desiredTriangleCount * 3,
        targetError,
        options
      );
      simplifiedTriangleCount = ret2.ret / 3;
      decimatedTriangleVertices = number_to_uvec3(ret2.destination);
      absoluteError = ret2.out_result_error;
      if (desiredTriangleCount < simplifiedTriangleCount) {
        console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Retrying, ignoring locked`);
        simplifiedTriangleCount = meshopt_simplifySloppy(
          decimatedTriangleVertices,
          positionUniqueTriangleVertices,
          positionUniqueTriangleVertices.length * 3,
          getVertex(inputMesh, 0),
          inputMesh.vertexCount,
          inputMesh.vertexStride,
          desiredTriangleCount * 3,
          targetError,
          absoluteError
          // &absoluteError
        ) / 3;
      }
    }
    if (desiredTriangleCount < simplifiedTriangleCount) {
      console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Discarding ${simplifiedTriangleCount - desiredTriangleCount} triangles`);
    }
    decimatedTriangleVertices = resizeArray(decimatedTriangleVertices, Math.min(desiredTriangleCount, simplifiedTriangleCount), () => new uvec3());
    const groupDecimatedTrianglesOffset = decimatedTriangleAlloc;
    decimatedTriangleAlloc += decimatedTriangleVertices.length;
    if (groupDecimatedTrianglesOffset + decimatedTriangleVertices.length > result.decimatedTriangleStorage.length) {
      success = 8 /* ERROR_OUTPUT_MESH_OVERFLOW */;
      break;
    }
    for (let i2 = 0; i2 < decimatedTriangleVertices.length; i2++) {
      result.decimatedTriangleStorage[groupDecimatedTrianglesOffset + i2] = decimatedTriangleVertices[i2];
    }
    result.groupTriangleRanges[clusterGroupIndex] = new Range(groupDecimatedTrianglesOffset, decimatedTriangleVertices.length);
    result.groupQuadricErrors[clusterGroupIndex] = absoluteError;
  }
  if (success != 0 /* SUCCESS */) {
    return success;
  }
  result.decimatedTriangleStorage = resizeArray(result.decimatedTriangleStorage, decimatedTriangleAlloc, () => new uvec3());
  result.mesh.indices = new Uint32Array(vec3_to_number(result.decimatedTriangleStorage));
  result.mesh.indexCount = result.decimatedTriangleStorage.length * 3;
  result.mesh.vertexCount = inputMesh.vertexCount;
  result.mesh.vertexOffset = inputMesh.vertexOffset;
  result.mesh.vertexStride = inputMesh.vertexStride;
  result.mesh.vertices = inputMesh.vertices;
  Object.assign(current, result);
  return 0 /* SUCCESS */;
}
function generateTriangleClusters(decimatedClusterGroups, clusterConfig, output) {
  const triangleCount = Math.floor(decimatedClusterGroups.mesh.indexCount) / 3;
  let triangleAabbs = new Array(triangleCount).fill(null).map(() => new AABB());
  let triangleCentroids = new Array(triangleCount).fill(null).map(() => new vec32());
  for (let i2 = 0; i2 < triangleCount; i2++) {
    const triangle = getTriangle(decimatedClusterGroups.mesh, i2);
    const a = getVertex(decimatedClusterGroups.mesh, triangle[0]);
    const b = getVertex(decimatedClusterGroups.mesh, triangle[1]);
    const c = getVertex(decimatedClusterGroups.mesh, triangle[2]);
    for (let coord = 0; coord < 3; coord++) {
      triangleAabbs[i2].bboxMin[coord] = Math.min(Math.min(a[coord], b[coord]), c[coord]);
      triangleAabbs[i2].bboxMax[coord] = Math.max(Math.max(a[coord], b[coord]), c[coord]);
    }
    triangleCentroids[i2] = centroidAABB(triangleAabbs[i2]);
  }
  let perTriangleElements = new SpatialElements2();
  perTriangleElements.boundingBoxes = triangleAabbs;
  perTriangleElements.centroids = triangleCentroids.map((v) => [v.x, v.y, v.z]).flat();
  perTriangleElements.elementCount = triangleAabbs.length;
  let triangleClusterInput = new Input2();
  triangleClusterInput.config = clusterConfig;
  triangleClusterInput.spatialElements = perTriangleElements;
  let clusteringResult = generateSegmentedClusters(
    triangleClusterInput,
    decimatedClusterGroups.groupTriangleRanges,
    decimatedClusterGroups.groupTriangleRanges.length,
    output.clustering
  );
  if (clusteringResult != 0 /* SUCCESS */) {
    return 2 /* ERROR_CLUSTERING_FAILED */;
  }
  if (output.clusterAabbs.length !== output.clustering.clusterRanges.length) {
    for (let i2 = 0; i2 < output.clustering.clusterRanges.length; i2++) {
      output.clusterAabbs.push(new AABB());
    }
  }
  for (let rangeIndex = 0; rangeIndex < output.clusterAabbs.length; rangeIndex++) {
    const range = output.clustering.clusterRanges[rangeIndex];
    let clusterAabb = emptyAABB();
    for (let index = range.offset; index < range.offset + range.count; index++) {
      const triangleIndex = output.clustering.clusterItems[index];
      addAABB(clusterAabb, triangleAabbs[triangleIndex]);
    }
    output.clusterAabbs[rangeIndex] = clusterAabb;
  }
  output.generatingGroupOffset = decimatedClusterGroups.baseClusterGroupIndex;
  output.maxClusterItems = clusterConfig.maxClusterSize;
  return 0 /* SUCCESS */;
}
var VertexAdjacency = class _VertexAdjacency extends Uint32Array {
  static Sentinel = 4294967295;
  constructor() {
    super(8);
    this.fill(_VertexAdjacency.Sentinel);
  }
};
function computeClusterAdjacency(decimatedClusterGroups, triangleClusters, result) {
  resizeArray(result, triangleClusters.clustering.clusterRanges.length, () => /* @__PURE__ */ new Map());
  if (result.length !== triangleClusters.clustering.clusterRanges.length) {
    for (let i2 = 0; i2 < triangleClusters.clustering.clusterRanges.length; i2++) {
      result.push(/* @__PURE__ */ new Map());
    }
  }
  const vertexClusterAdjacencies = new Array(decimatedClusterGroups.mesh.vertexCount).fill(null).map(() => new VertexAdjacency());
  for (let clusterIndex = 0; clusterIndex < triangleClusters.clustering.clusterRanges.length; ++clusterIndex) {
    const range = triangleClusters.clustering.clusterRanges[clusterIndex];
    const clusterTriangles = createArrayView(triangleClusters.clustering.clusterItems, range.offset, range.count);
    for (let indexInCluster = 0; indexInCluster < clusterTriangles.length; indexInCluster++) {
      const triangleIndex = clusterTriangles[indexInCluster];
      const tri = getTriangle(decimatedClusterGroups.mesh, triangleIndex);
      for (let i2 = 0; i2 < 3; ++i2) {
        const vertexClusterAdjacency = vertexClusterAdjacencies[tri[i2]];
        let seenSelf = false;
        for (let adjacencyIndex = 0; adjacencyIndex < vertexClusterAdjacency.length; adjacencyIndex++) {
          let adjacentClusterIndex = vertexClusterAdjacency[adjacencyIndex];
          if (adjacentClusterIndex == clusterIndex) {
            seenSelf = true;
            continue;
          }
          if (adjacentClusterIndex == VertexAdjacency.Sentinel) {
            if (!seenSelf) {
              adjacentClusterIndex = clusterIndex;
              vertexClusterAdjacency[adjacencyIndex] = adjacentClusterIndex;
            }
            if (vertexClusterAdjacency[vertexClusterAdjacency.length - 1] !== VertexAdjacency.Sentinel) {
              console.warn(`Warning: vertexClusterAdjacency[${tri[i2]}] is full`);
            }
            break;
          }
          if (adjacentClusterIndex >= clusterIndex) {
            return 7 /* ERROR_ADJACENCY_GENERATION_FAILED */;
          }
          let currentToAdjacent = result[clusterIndex].get(adjacentClusterIndex);
          let adjacentToCurrent = result[adjacentClusterIndex].get(clusterIndex);
          if (!currentToAdjacent) {
            currentToAdjacent = new AdjacencyVertexCount();
            result[clusterIndex].set(adjacentClusterIndex, currentToAdjacent);
          }
          if (!adjacentToCurrent) {
            adjacentToCurrent = new AdjacencyVertexCount();
            result[adjacentClusterIndex].set(clusterIndex, adjacentToCurrent);
          }
          currentToAdjacent.vertexCount += 1;
          adjacentToCurrent.vertexCount += 1;
          if (decimatedClusterGroups.globalLockedVertices[tri[i2]] != 0) {
            currentToAdjacent.lockedCount += 1;
            adjacentToCurrent.lockedCount += 1;
          }
        }
      }
    }
  }
  return 0 /* SUCCESS */;
}
function farthestPoint(mesh, start, farthest) {
  let result = void 0;
  let maxLengthSq = 0;
  for (let triangleIndex = 0; triangleIndex < mesh.indexCount / 3; triangleIndex++) {
    const triangle = getTriangle(mesh, triangleIndex);
    for (let i2 = 0; i2 < 3; ++i2) {
      const candidatePtr = getVertex(mesh, triangle[i2]);
      let sc = new Array(3);
      sc[0] = candidatePtr[0] - start[0];
      sc[1] = candidatePtr[1] - start[1];
      sc[2] = candidatePtr[2] - start[2];
      sc[0] = parseFloat(sc[0].toPrecision(5));
      sc[1] = parseFloat(sc[1].toPrecision(5));
      sc[2] = parseFloat(sc[2].toPrecision(5));
      const lengthSq = sc[0] * sc[0] + sc[1] * sc[1] + sc[2] * sc[2];
      if (lengthSq > maxLengthSq) {
        maxLengthSq = lengthSq;
        result = candidatePtr;
      }
    }
  }
  if (result !== void 0) {
    farthest[0] = result[0];
    farthest[1] = result[1];
    farthest[2] = result[2];
  }
}
function distance(x, y) {
  let result = 0;
  for (let i2 = 0; i2 < 3; i2++) {
    const d = x[i2] - y[i2];
    result += d * d;
  }
  return Math.sqrt(result);
}
function makeBoundingSphere(mesh, sphere) {
  const x = getVertex(mesh, 0);
  let y = new Array(3);
  let z = new Array(3);
  farthestPoint(mesh, Array.from(x), y);
  farthestPoint(mesh, y, z);
  let position = new Array(3).fill(0);
  for (let i2 = 0; i2 < 3; i2++) {
    position[i2] = (y[i2] + z[i2]) * 0.5;
  }
  let radius = distance(z, y) * 0.5;
  const f = new Array(3).fill(0);
  farthestPoint(mesh, position, f);
  radius = distance(f, position);
  if (isNaN(position[0]) || isNaN(position[1]) || isNaN(position[2]) || isNaN(radius)) {
    return 11 /* ERROR_INCONSISTENT_BOUNDING_SPHERES */;
  }
  sphere.x = position[0];
  sphere.y = position[1];
  sphere.z = position[2];
  sphere.radius = radius;
  return 0 /* SUCCESS */;
}
var ClusterGroups = class {
  groups = new ClusterStorage();
  groupTriangleCounts = [];
  // useful byproduct
  totalTriangleCount = 0;
  globalGroupOffset = 0;
};
function groupClusters(triangleClusters, clusterGroupConfig, globalGroupOffset, clusterAdjacency, result) {
  let adjacencySizes = new Array(clusterAdjacency.length).fill(0);
  {
    for (let i2 = 0; i2 < clusterAdjacency.length; i2++) {
      const adjacency = clusterAdjacency[i2];
      for (const key of Array.from(adjacency.keys())) {
        const count = adjacency.get(key);
        if (count && count.vertexCount < NVLOD_MINIMAL_ADJACENCY_SIZE) {
          adjacency.delete(key);
        }
      }
      adjacencySizes[i2] = adjacency.size;
    }
  }
  let adjacencyOffsets = new Array(clusterAdjacency.length).fill(0);
  {
    adjacencyOffsets = exclusive_scan_impl(adjacencySizes, 0, (sum, value) => sum + value);
  }
  const adjacencyItemCount = adjacencyOffsets.length === 0 ? 0 : adjacencyOffsets[adjacencyOffsets.length - 1] + clusterAdjacency[clusterAdjacency.length - 1].size;
  let adjacencyItems = new Array(adjacencyItemCount);
  let adjacencyWeights = new Array(adjacencyItemCount);
  let adjacencyRanges = new Array(adjacencyOffsets.length);
  let clusterCentroids = new Array(triangleClusters.clusterAabbs.length);
  {
    for (let clusterIndex = 0; clusterIndex < adjacencyOffsets.length; clusterIndex++) {
      let range = adjacencyRanges[clusterIndex];
      range = new Range(adjacencyOffsets[clusterIndex], 0);
      adjacencyRanges[clusterIndex] = range;
      for (const [adjacentClusterIndex, adjacencyVertexCounts] of clusterAdjacency[clusterIndex]) {
        const weight = 1 + adjacencyVertexCounts.vertexCount + adjacencyVertexCounts.lockedCount * NVLOD_LOCKED_VERTEX_WEIGHT_MULTIPLIER;
        adjacencyItems[range.offset + range.count] = adjacentClusterIndex;
        adjacencyWeights[range.offset + range.count] = Math.max(weight, 1) * NVLOD_VERTEX_WEIGHT_MULTIPLIER;
        range.count++;
      }
      clusterCentroids[clusterIndex] = centroidAABB(triangleClusters.clusterAabbs[clusterIndex]);
    }
  }
  const clusterElements = new SpatialElements2();
  clusterElements.boundingBoxes = triangleClusters.clusterAabbs;
  clusterElements.centroids = vec3_to_number(clusterCentroids);
  clusterElements.elementCount = triangleClusters.clusterAabbs.length;
  let graph = new Graph2();
  graph.nodes = adjacencyRanges;
  graph.nodeCount = adjacencyRanges.length;
  graph.connectionTargets = adjacencyItems;
  graph.connectionWeights = adjacencyWeights;
  graph.connectionCount = adjacencyItems.length;
  const inputTriangleClusters = new Input2();
  inputTriangleClusters.config = clusterGroupConfig;
  inputTriangleClusters.spatialElements = clusterElements;
  inputTriangleClusters.graph = graph;
  result.globalGroupOffset = globalGroupOffset;
  let clusterResult;
  {
    clusterResult = generateClusters(inputTriangleClusters, result.groups);
  }
  if (clusterResult != 0 /* SUCCESS */) {
    return 2 /* ERROR_CLUSTERING_FAILED */;
  }
  result.groupTriangleCounts = resizeArray(result.groupTriangleCounts, result.groups.clusterRanges.length, () => 0);
  {
    for (let rangeIndex = 0; rangeIndex < result.groups.clusterRanges.length; rangeIndex++) {
      const range = result.groups.clusterRanges[rangeIndex];
      for (let index = range.offset; index < range.offset + range.count; index++) {
        const clusterIndex = result.groups.clusterItems[index];
        const triangleClusterCount = triangleClusters.clustering.clusterRanges[clusterIndex].count;
        result.groupTriangleCounts[rangeIndex] += triangleClusterCount;
        result.totalTriangleCount += triangleClusterCount;
      }
    }
  }
  return 0 /* SUCCESS */;
}
function writeClusters(decimatedClusterGroups, clusterGroups, triangleClusters, meshOutput, outputWritePositions) {
  if (outputWritePositions.lodLevelGroup >= meshOutput.lodLevelCount) {
    return 8 /* ERROR_OUTPUT_MESH_OVERFLOW */;
  }
  const lodLevelGroupRange = meshOutput.lodLevelGroupRanges[outputWritePositions.lodLevelGroup];
  outputWritePositions.lodLevelGroup++;
  lodLevelGroupRange.offset = outputWritePositions.groupCluster;
  let clusterGeneratingGroups = [];
  for (let clusterLocalGroupIndex = 0; clusterLocalGroupIndex < triangleClusters.clustering.clusterRangeSegments.length; clusterLocalGroupIndex++) {
    const clusterGroupRange = triangleClusters.clustering.clusterRangeSegments[clusterLocalGroupIndex];
    const generatingGroupIndex = triangleClusters.generatingGroupOffset + clusterLocalGroupIndex;
    for (let i2 = 0; i2 < clusterGroupRange.count; i2++) {
      clusterGeneratingGroups.push(generatingGroupIndex);
    }
  }
  if (clusterGeneratingGroups.length != triangleClusters.clustering.clusterRanges.length) {
    return 9 /* ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH */;
  }
  for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGroups.groups.clusterRanges.length; ++clusterGroupIndex) {
    if (outputWritePositions.groupCluster >= meshOutput.groupCount) {
      return 8 /* ERROR_OUTPUT_MESH_OVERFLOW */;
    }
    const range = clusterGroups.groups.clusterRanges[clusterGroupIndex];
    const clusterGroup = createArrayView(clusterGroups.groups.clusterItems, range.offset, range.count);
    meshOutput.groupClusterRanges[outputWritePositions.groupCluster] = new Range(outputWritePositions.clusterTriangleRange, range.count);
    outputWritePositions.groupCluster++;
    clusterGroup.sort((a, b) => {
      return clusterGeneratingGroups[a] - clusterGeneratingGroups[b];
    });
    for (const clusterIndex of clusterGroup) {
      const clusterTriangleRange = triangleClusters.clustering.clusterRanges[clusterIndex];
      const clusterTriangles = createArrayView(triangleClusters.clustering.clusterItems, clusterTriangleRange.offset, clusterTriangleRange.count);
      const trianglesBegin = createArrayView(meshOutput.clusterTriangles, outputWritePositions.clusterTriangleVertex * 3, meshOutput.clusterTriangles.length);
      const trianglesBeginIndex = outputWritePositions.clusterTriangleVertex * 3;
      const clusterRange = new Range(outputWritePositions.clusterTriangleVertex, clusterTriangles.length);
      if (clusterRange.offset + clusterRange.count > meshOutput.triangleCount) {
        return 8 /* ERROR_OUTPUT_MESH_OVERFLOW */;
      }
      for (const triangleIndex of clusterTriangles) {
        const triangle = getTriangle(decimatedClusterGroups.mesh, triangleIndex);
        meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 0] = triangle[0];
        meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 1] = triangle[1];
        meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 2] = triangle[2];
        outputWritePositions.clusterTriangleVertex++;
      }
      meshOutput.clusterTriangleRanges[outputWritePositions.clusterTriangleRange] = clusterRange;
      outputWritePositions.clusterTriangleRange++;
      meshOutput.clusterGeneratingGroups[outputWritePositions.clusterParentGroup] = clusterGeneratingGroups[clusterIndex];
      outputWritePositions.clusterParentGroup++;
      if (outputWritePositions.clusterBoundingSphere < meshOutput.clusterCount) {
        let mesh = new MeshInput();
        mesh.indexCount = outputWritePositions.clusterTriangleVertex * 3 - trianglesBeginIndex;
        let indices = new Uint32Array(mesh.indexCount);
        for (let i2 = 0; i2 < mesh.indexCount; i2++) {
          indices[i2] = trianglesBegin[i2];
        }
        mesh.indices = indices;
        mesh.vertices = decimatedClusterGroups.mesh.vertices;
        mesh.vertexOffset = decimatedClusterGroups.mesh.vertexOffset;
        mesh.vertexStride = decimatedClusterGroups.mesh.vertexStride;
        mesh.vertexCount = decimatedClusterGroups.mesh.vertexCount;
        const result = makeBoundingSphere(mesh, meshOutput.clusterBoundingSpheres[outputWritePositions.clusterBoundingSphere]);
        if (result != 0 /* SUCCESS */) {
          return result;
        }
        outputWritePositions.clusterBoundingSphere++;
      }
    }
  }
  lodLevelGroupRange.count = outputWritePositions.groupCluster - lodLevelGroupRange.offset;
  return 0 /* SUCCESS */;
}
function nvclusterlodMeshCreate(info, output) {
  const input = info.input;
  let outputCounters = new OutputWritePositions();
  let decimatedClusterGroups = new DecimatedClusterGroups();
  decimatedClusterGroups.groupTriangleRanges = [new Range(0, Math.floor(input.indexCount / 3))];
  decimatedClusterGroups.mesh = input;
  decimatedClusterGroups.decimatedTriangleStorage = [];
  decimatedClusterGroups.groupQuadricErrors = [0];
  decimatedClusterGroups.baseClusterGroupIndex = ORIGINAL_MESH_GROUP;
  decimatedClusterGroups.globalLockedVertices = new Array(input.vertexCount).fill(0);
  console.log(`Initial clustering (${input.indexCount / 3} triangles)`);
  let lastTriangleCount = Infinity;
  let triangleCountCanary = 10;
  while (true) {
    const triangleClusters = new TriangleClusters();
    let success = generateTriangleClusters(decimatedClusterGroups, input.clusterConfig, triangleClusters);
    if (success != 0 /* SUCCESS */) {
      return success;
    }
    let clusterAdjacency = [];
    success = computeClusterAdjacency(decimatedClusterGroups, triangleClusters, clusterAdjacency);
    if (success != 0 /* SUCCESS */) {
      return success;
    }
    const globalGroupOffset = outputCounters.groupCluster;
    let clusterGroups = new ClusterGroups();
    success = groupClusters(triangleClusters, input.groupConfig, globalGroupOffset, clusterAdjacency, clusterGroups);
    if (success != 0 /* SUCCESS */) {
      return success;
    }
    success = writeClusters(decimatedClusterGroups, clusterGroups, triangleClusters, output, outputCounters);
    if (success != 0 /* SUCCESS */) {
      return success;
    }
    const clusterCount = triangleClusters.clustering.clusterRanges.length;
    if (clusterCount <= 1) {
      if (clusterCount != 1) {
        return 10 /* ERROR_EMPTY_ROOT_CLUSTER */;
      }
      break;
    }
    console.warn("Decimating lod %d (%d clusters)\n", lodLevel++, clusterCount);
    const maxDecimationFactor = (clusterCount - 1) / clusterCount;
    const decimationFactor = Math.min(maxDecimationFactor, input.decimationFactor);
    success = decimateClusterGroups(decimatedClusterGroups, triangleClusters, clusterGroups, decimationFactor);
    if (success != 0 /* SUCCESS */) {
      return success;
    }
    const triangleCount = decimatedClusterGroups.decimatedTriangleStorage.length;
    if (triangleCount == lastTriangleCount && --triangleCountCanary <= 0) {
      return 5 /* ERROR_CLUSTER_COUNT_NOT_DECREASING */;
    }
    lastTriangleCount = triangleCount;
    for (let i2 = 0; i2 < decimatedClusterGroups.groupQuadricErrors.length; i2++) {
      output.groupQuadricErrors[outputCounters.groupQuadricError] = decimatedClusterGroups.groupQuadricErrors[i2];
      outputCounters.groupQuadricError++;
    }
  }
  output.groupQuadricErrors[outputCounters.groupQuadricError] = 0;
  outputCounters.groupQuadricError++;
  output.clusterCount = outputCounters.clusterTriangleRange;
  output.groupCount = outputCounters.groupCluster;
  output.lodLevelCount = outputCounters.lodLevelGroup;
  output.triangleCount = outputCounters.clusterTriangleVertex;
  return 0 /* SUCCESS */;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_mesh_storage.ts
var LodMesh = class {
  resize(sizes) {
    this.triangleVertices = resizeArray(this.triangleVertices, Math.floor(sizes.maxTriangleCount) * 3, () => 0);
    this.clusterTriangleRanges = resizeArray(this.clusterTriangleRanges, Math.floor(sizes.maxClusterCount), () => new Range());
    this.clusterGeneratingGroups = resizeArray(this.clusterGeneratingGroups, Math.floor(sizes.maxClusterCount), () => 0);
    this.clusterBoundingSpheres = resizeArray(this.clusterBoundingSpheres, Math.floor(sizes.maxClusterCount), () => new Sphere2());
    this.groupQuadricErrors = resizeArray(this.groupQuadricErrors, Math.floor(sizes.maxGroupCount), () => 0);
    this.groupClusterRanges = resizeArray(this.groupClusterRanges, Math.floor(sizes.maxGroupCount), () => new Range());
    this.lodLevelGroupRanges = resizeArray(this.lodLevelGroupRanges, Math.floor(sizes.maxLodLevelCount), () => new Range());
  }
  triangleVertices = [];
  clusterTriangleRanges = [];
  clusterGeneratingGroups = [];
  clusterBoundingSpheres = [];
  groupQuadricErrors = [];
  groupClusterRanges = [];
  lodLevelGroupRanges = [];
};
var LocalizedLodMesh = class {
  lodMesh = new LodMesh();
  // contains cluster-local triangle indices
  clusterVertexRanges = [];
  vertexGlobalIndices = [];
};
function generateLodMesh(input, lodMesh) {
  let reqInfo = new MeshGetRequirementsInfo();
  reqInfo.input = input;
  let sizes = nvclusterlodMeshGetRequirements(reqInfo);
  lodMesh.resize(sizes);
  let lodOutput = new MeshOutput();
  lodOutput.clusterTriangleRanges = lodMesh.clusterTriangleRanges;
  lodOutput.clusterTriangles = lodMesh.triangleVertices;
  lodOutput.clusterGeneratingGroups = lodMesh.clusterGeneratingGroups;
  lodOutput.clusterBoundingSpheres = lodMesh.clusterBoundingSpheres;
  lodOutput.groupQuadricErrors = lodMesh.groupQuadricErrors;
  lodOutput.groupClusterRanges = lodMesh.groupClusterRanges;
  lodOutput.lodLevelGroupRanges = lodMesh.lodLevelGroupRanges;
  lodOutput.clusterCount = lodMesh.clusterTriangleRanges.length;
  lodOutput.groupCount = lodMesh.groupQuadricErrors.length;
  lodOutput.lodLevelCount = lodMesh.lodLevelGroupRanges.length;
  lodOutput.triangleCount = lodMesh.triangleVertices.length;
  let createInfo = new MeshCreateInfo();
  createInfo.input = input;
  let result = nvclusterlodMeshCreate(createInfo, lodOutput);
  if (result != 0 /* SUCCESS */) {
    lodOutput = new MeshOutput();
    return result;
  }
  sizes.maxClusterCount = lodOutput.clusterCount;
  sizes.maxGroupCount = lodOutput.groupCount;
  sizes.maxLodLevelCount = lodOutput.lodLevelCount;
  sizes.maxTriangleCount = lodOutput.triangleCount;
  lodMesh.resize(sizes);
  return 0 /* SUCCESS */;
}
function generateLocalizedLodMesh(input, localizedMesh) {
  let result = generateLodMesh(input, localizedMesh.lodMesh);
  if (result != 0 /* SUCCESS */) {
    return result;
  }
  for (let clusterTriangleRangeIndex = 0; clusterTriangleRangeIndex < localizedMesh.lodMesh.clusterTriangleRanges.length; clusterTriangleRangeIndex++) {
    const clusterTriangleRange = localizedMesh.lodMesh.clusterTriangleRanges[clusterTriangleRangeIndex];
    const globalTriangles = createArrayView(localizedMesh.lodMesh.triangleVertices, 3 * clusterTriangleRange.offset, clusterTriangleRange.count * 3);
    const localTriangles = createArrayView(localizedMesh.lodMesh.triangleVertices, 3 * clusterTriangleRange.offset, clusterTriangleRange.count * 3);
    let currentLocalTriangleIndex = 0;
    const vertexRange = new Range(localizedMesh.vertexGlobalIndices.length, 0);
    {
      const vertexCache = /* @__PURE__ */ new Map();
      for (let globalTriangleIndex = 0; globalTriangleIndex < globalTriangles.length / 3; globalTriangleIndex++) {
        const inputTriangle = globalTriangles.slice(3 * globalTriangleIndex);
        const outputTriangle = localTriangles.slice(3 * currentLocalTriangleIndex);
        currentLocalTriangleIndex++;
        for (let j = 0; j < 3; ++j) {
          const globalIndex = inputTriangle[j];
          let localIndex = vertexCache.get(globalIndex);
          if (localIndex === void 0) {
            localIndex = vertexCache.size;
            vertexCache.set(globalIndex, localIndex);
            localizedMesh.vertexGlobalIndices.push(globalIndex);
          }
          outputTriangle[j] = localIndex;
          if (outputTriangle[j] >= 256) {
            return 8 /* ERROR_OUTPUT_MESH_OVERFLOW */;
          }
        }
      }
      vertexRange.count = vertexCache.size;
    }
    localizedMesh.clusterVertexRanges.push(vertexRange);
  }
  return 0 /* SUCCESS */;
}
var GroupGeneratingGroups = class {
  ranges = [];
  // ranges of groups
  groups = [];
  // indices of generating groups
  //   // Accessors to view this struct as an array of arrays. This avoids having the
  //   // many heap allocations that a std::vector of vectors has.
  //   std::span<const uint32_t> operator[](size_t i) const
  //   {
  //     return std::span(groups.data() + ranges[i].offset, ranges[i].count);
  //   }
  size() {
    return this.ranges.length;
  }
  get(i2) {
    return createArrayView(this.groups, this.ranges[i2].offset, this.ranges[i2].count);
  }
};
function generateGroupGeneratingGroups(groupClusterRanges, clusterGeneratingGroups, groupGeneratingGroups) {
  let offset = 0;
  for (let groupIndex = 0; groupIndex < groupClusterRanges.length; groupIndex++) {
    const clusterRange = groupClusterRanges[groupIndex];
    if (clusterRange.count == 0) {
      return 1 /* ERROR_EMPTY_CLUSTER_GENERATING_GROUPS */;
    }
    const generatingGroups = createArrayView(clusterGeneratingGroups, clusterRange.offset, clusterRange.count);
    if (generatingGroups[0] == ORIGINAL_MESH_GROUP) {
      groupGeneratingGroups.ranges.push(new Range(offset, 0));
    } else {
      const uniqueGeneratingGroups = new Set(generatingGroups);
      const newGroupRange = new Range(offset, uniqueGeneratingGroups.size);
      groupGeneratingGroups.ranges.push(newGroupRange);
      for (const element of uniqueGeneratingGroups) {
        groupGeneratingGroups.groups.push(element);
      }
      offset += newGroupRange.count;
    }
  }
  return 0 /* SUCCESS */;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/nvcluster_hierarchy.ts
var HierarchyInput = class {
  // Decimation takes the mesh at a given LOD represented by a number of cluster groups,
  // and generates a (smaller) number of cluster groups for the next coarser LOD. For each
  // generated cluster clusterGeneratingGroups stores the index of the group it was generated from.
  // For the clusters at the finest LOD (LOD 0) that index is ORIGINAL_MESH_GROUP
  clusterGeneratingGroups;
  // Error metric after decimating geometry in each group
  groupQuadricErrors;
  // Ranges of clusters contained in each group so that the clusters of a group are stored at range.offset
  // and the group covers range.count clusters.
  groupClusterRanges;
  // Number of cluster groups
  groupCount = 0;
  // Bounding sphere for each cluster
  clusterBoundingSpheres;
  // Number of clusters
  clusterCount = 0;
  // Ranges of groups comprised in each LOD level, so that the groups for LOD n are stored at lodLevelGroupRanges[n].offset and the LOD
  // uses lodLevelGroupRanges[n].count groups. The finest LOD is at index 0, followed by the coarser LODs from finer to coarser
  lodLevelGroupRanges;
  // Number of LODs in the mesh
  lodLevelCount = 0;
  // Enforce a minimum LOD rate of change. This is the maximum sine of the error
  // angle threshold that will be used to compute LOD for a given camera
  // position. See Output::maxQuadricErrorOverDistance and
  // pixelErrorToQuadricErrorOverDistance(). Increase this if LOD levels
  // overlap.
  minQuadricErrorOverDistance = 1e-3;
  // Bounding spheres include the bounding spheres of generating groups. This
  // guarantees no overlaps regardless of the error over distance threshold.
  conservativeBoundingSpheres = true;
};
var InteriorNode = class {
  // Maximum number of children for the node
  static NODE_RANGE_MAX_SIZE = 32;
  // Either InteriorNode or LeafNode can be stored in Node, isLeafNode will be 0 for InteriorNode
  isLeafNode = 0;
  // Offset in FIXME where the children of the node can be found
  childOffset = 0;
  // Number of children for the node, minus one as the children list of an interior node contains at least a leaf node
  // representing its geometry at its corresponding LOD
  childCountMinusOne = 0;
};
var LeafNode = class {
  static CLUSTER_RANGE_MAX_SIZE = 256;
  // Either InteriorNode or LeafNode can be stored in Node, isLeafNode will be 1 for LeafNode
  isLeafNode = 1;
  // clusterGroupNode?
  // Index of the cluster group for the node
  group = 0;
  // Number of clusters in the group, minus one as a group always contains at least one cluster
  clusterCountMinusOne = 0;
};
var Node = class {
  // Node definition, either interior or leaf node
  //   union
  //   {
  //     InteriorNode children;
  //     LeafNode     clusters;
  //   };
  children;
  clusters;
  // Bounding sphere for the node
  boundingSphere = new Sphere2();
  // Maximum error due to the mesh decimation at the LOD of the node
  maxClusterQuadricError = 0;
};
var HierarchyOutput = class {
  // LOD DAG
  nodes;
  // Bounding sphere for each cluster group, encompassing all the clusters within the group
  groupCumulativeBoundingSpheres;
  // Quadric errors obtained by accumulating the quadric errors of the clusters within the group
  groupCumulativeQuadricError;
  // Number of nodes in the DAG
  nodeCount = 0;
};
var HierarchyGetRequirementsInfo = class {
  input;
};
var HierarchyRequirements = class {
  maxNodeCount = 0;
};
var HierarchyCreateInfo = class {
  input;
  constructor(input) {
    this.input = input;
  }
};
function U32_MASK(bitCount) {
  return (1 << bitCount) - 1;
}
function farthestSphere(spheres, start) {
  let result = start;
  let maxLength = 0;
  for (let sphereIndex = 0; sphereIndex < spheres.length; sphereIndex++) {
    const candidate = spheres[sphereIndex];
    const centerToCandidateVector = [candidate.x - start.x, candidate.y - start.y, candidate.z - start.z];
    const centerToCandidateDistance = Math.sqrt(centerToCandidateVector[0] * centerToCandidateVector[0] + centerToCandidateVector[1] * centerToCandidateVector[1] + centerToCandidateVector[2] * centerToCandidateVector[2]);
    const length = centerToCandidateDistance + candidate.radius + start.radius;
    if (!isFinite(length) || length > maxLength) {
      maxLength = length;
      result = candidate;
    }
  }
  return result;
}
function makeBoundingSphere2(spheres, sphere) {
  if (spheres.length === 0) {
    return 0 /* SUCCESS */;
  }
  const x = spheres[0];
  const y = farthestSphere(spheres, x);
  const z = farthestSphere(spheres, y);
  let yz = [z.x - y.x, z.y - y.y, z.z - y.z];
  const dist = Math.sqrt(yz[0] * yz[0] + yz[1] * yz[1] + yz[2] * yz[2]);
  const invDist = 1 / dist;
  yz[0] *= invDist;
  yz[1] *= invDist;
  yz[2] *= invDist;
  const resultRadius = (dist + y.radius + z.radius) * 0.5;
  const retSphere = new Sphere2(y.x, y.y, y.z, resultRadius);
  Object.assign(sphere, retSphere);
  if (dist > 1e-10) {
    const radiusDifference = resultRadius - y.radius;
    sphere.x += yz[0] * radiusDifference;
    sphere.y += yz[1] * radiusDifference;
    sphere.z += yz[2] * radiusDifference;
  }
  const f = farthestSphere(spheres, sphere);
  const sphereToFarthestVector = [f.x - sphere.x, f.y - sphere.y, f.z - sphere.z];
  const sphereToFarthestDistance = Math.sqrt(sphereToFarthestVector[0] * sphereToFarthestVector[0] + sphereToFarthestVector[1] * sphereToFarthestVector[1] + sphereToFarthestVector[2] * sphereToFarthestVector[2]);
  sphere.radius = sphereToFarthestDistance + f.radius;
  sphere.radius = sphere.radius + Number.EPSILON;
  sphere.radius = sphere.radius + Number.EPSILON;
  if (isNaN(sphere.x) || isNaN(sphere.y) || isNaN(sphere.z) || isNaN(sphere.radius)) {
    return 11 /* ERROR_INCONSISTENT_BOUNDING_SPHERES */;
  }
  for (let childIndex = 0; childIndex < spheres.length; childIndex++) {
    const child = spheres[childIndex];
    if (child.radius > sphere.radius) {
      return 11 /* ERROR_INCONSISTENT_BOUNDING_SPHERES */;
    }
  }
  return 0 /* SUCCESS */;
}
function clusterNodesSpatially(nodes, maxClusterItems, clusters) {
  let triangleClusterAabbs = new Array(nodes.length).fill(null).map(() => new AABB());
  let triangleClusterCentroids = new Array(nodes.length * 3).fill(0);
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
    const node = nodes[nodeIndex];
    const center = [node.boundingSphere.x, node.boundingSphere.y, node.boundingSphere.z];
    const aabb = triangleClusterAabbs[nodeIndex];
    for (let i2 = 0; i2 < 3; i2++) {
      aabb.bboxMin[i2] = center[i2] - node.boundingSphere.radius;
      aabb.bboxMax[i2] = center[i2] + node.boundingSphere.radius;
    }
    for (let i2 = 0; i2 < 3; i2++) {
      triangleClusterCentroids[3 * nodeIndex + i2] = (aabb.bboxMin[i2] + aabb.bboxMax[i2]) * 0.5;
    }
  }
  let clusterBounds = new SpatialElements2();
  clusterBounds.boundingBoxes = triangleClusterAabbs;
  clusterBounds.centroids = triangleClusterCentroids;
  clusterBounds.elementCount = triangleClusterAabbs.length;
  let clusterGroupInput = new Input2();
  clusterGroupInput.config.minClusterSize = maxClusterItems;
  clusterGroupInput.config.maxClusterSize = maxClusterItems;
  clusterGroupInput.spatialElements = clusterBounds;
  const result = generateClusters(clusterGroupInput, clusters);
  return result;
}
function nvclusterlodHierarchyGetRequirements(info) {
  let result = new HierarchyRequirements();
  result.maxNodeCount = info.input.clusterCount + 1;
  return result;
}
function nvclusterlodCreateHierarchy(info, output) {
  const input = info.input;
  let groupGeneratingGroups = new GroupGeneratingGroups();
  const groupClusterRanges = createArrayView(input.groupClusterRanges, 0, input.groupCount);
  const clusterGeneratingGroups = createArrayView(input.clusterGeneratingGroups, 0, input.clusterCount);
  let result = generateGroupGeneratingGroups(groupClusterRanges, clusterGeneratingGroups, groupGeneratingGroups);
  if (result != 0 /* SUCCESS */) {
    return result;
  }
  if (groupGeneratingGroups.ranges.length != input.groupCount) {
    return 6 /* ERROR_INCONSISTENT_GENERATING_GROUPS */;
  }
  if (groupGeneratingGroups.ranges[0].offset != 0) {
    return 6 /* ERROR_INCONSISTENT_GENERATING_GROUPS */;
  }
  let groupCumulativeBoundingSpheres = new Array(input.groupCount).fill(null).map(() => new Sphere2());
  let groupCumulativeQuadricErrors = new Array(input.groupCount).fill(0);
  for (let lodLevel2 = 0; lodLevel2 < input.lodLevelCount; ++lodLevel2) {
    const lodGroupRange = input.lodLevelGroupRanges[lodLevel2];
    for (let group = lodGroupRange.offset; group < lodGroupRange.offset + lodGroupRange.count; group++) {
      if (lodLevel2 == 0) {
        result = makeBoundingSphere2(createArrayView(input.clusterBoundingSpheres, groupClusterRanges[group].offset, groupClusterRanges[group].count), groupCumulativeBoundingSpheres[group]);
        if (result != 0 /* SUCCESS */) {
          return result;
        }
      } else {
        let generatingSpheres = [];
        const generatingGroupRange2 = groupGeneratingGroups.ranges[group];
        for (let indexInGeneratingGroups = generatingGroupRange2.offset; indexInGeneratingGroups < generatingGroupRange2.offset + generatingGroupRange2.count; indexInGeneratingGroups++) {
          const generatingGroup = groupGeneratingGroups.groups[indexInGeneratingGroups];
          generatingSpheres.push(groupCumulativeBoundingSpheres[generatingGroup]);
        }
        result = makeBoundingSphere2(generatingSpheres, groupCumulativeBoundingSpheres[group]);
        if (result != 0 /* SUCCESS */) {
          return result;
        }
      }
      let maxGeneratingGroupQuadricError = 0;
      const generatingGroupRange = groupGeneratingGroups.ranges[group];
      for (let indexInGeneratingGroups = generatingGroupRange.offset; indexInGeneratingGroups < generatingGroupRange.offset + generatingGroupRange.count; indexInGeneratingGroups++) {
        const generatingGroup = groupGeneratingGroups.groups[indexInGeneratingGroups];
        maxGeneratingGroupQuadricError = Math.max(maxGeneratingGroupQuadricError, groupCumulativeQuadricErrors[generatingGroup]);
      }
      groupCumulativeQuadricErrors[group] = maxGeneratingGroupQuadricError + input.groupQuadricErrors[group];
    }
  }
  for (let i2 = 0; i2 < groupCumulativeBoundingSpheres.length; i2++) {
    output.groupCumulativeBoundingSpheres[i2] = groupCumulativeBoundingSpheres[i2];
  }
  for (let i2 = 0; i2 < groupCumulativeQuadricErrors.length; i2++) {
    output.groupCumulativeQuadricError[i2] = groupCumulativeQuadricErrors[i2];
  }
  let lodCount = input.lodLevelCount;
  if (lodCount >= InteriorNode.NODE_RANGE_MAX_SIZE) {
    return 4 /* ERROR_LOD_OVERFLOW */;
  }
  let rootNode = output.nodes[0];
  let currentNodeIndex = 1;
  let lodNodes = [];
  for (let lodIndex = 0; lodIndex < lodCount; ++lodIndex) {
    let nodes = [];
    const lodGroupRange = input.lodLevelGroupRanges[lodIndex];
    for (let groupIndex = lodGroupRange.offset; groupIndex < lodGroupRange.offset + lodGroupRange.count; groupIndex++) {
      if (input.groupClusterRanges[groupIndex].count > LeafNode.CLUSTER_RANGE_MAX_SIZE) {
        return 12 /* ERROR_HIERARCHY_GENERATION_FAILED */;
      }
      let clusterRange = new LeafNode();
      clusterRange.isLeafNode = 1;
      clusterRange.group = groupIndex & U32_MASK(23);
      clusterRange.clusterCountMinusOne = input.groupClusterRanges[groupIndex].count - 1 & U32_MASK(8);
      if (clusterRange.clusterCountMinusOne + 1 != input.groupClusterRanges[groupIndex].count) {
        return 12 /* ERROR_HIERARCHY_GENERATION_FAILED */;
      }
      const node = new Node();
      node.clusters = clusterRange;
      node.boundingSphere = groupCumulativeBoundingSpheres[groupIndex];
      node.maxClusterQuadricError = groupCumulativeQuadricErrors[groupIndex];
      nodes.push(node);
    }
    while (nodes.length > 1) {
      let nodeClusters = new ClusterStorage();
      let clusterResult = clusterNodesSpatially(nodes, InteriorNode.NODE_RANGE_MAX_SIZE, nodeClusters);
      if (clusterResult != 0 /* SUCCESS */) {
        return 2 /* ERROR_CLUSTERING_FAILED */;
      }
      let newNodes = [];
      for (let rangeIndex = 0; rangeIndex < nodeClusters.clusterRanges.length; rangeIndex++) {
        const range = nodeClusters.clusterRanges[rangeIndex];
        const group = createArrayView(createArrayView(nodeClusters.clusterItems, 0, nodeClusters.clusterItems.length), range.offset, range.count);
        if (group.length === 0 || group.length > InteriorNode.NODE_RANGE_MAX_SIZE) {
          return 12 /* ERROR_HIERARCHY_GENERATION_FAILED */;
        }
        let maxClusterQuadricError = 0;
        let boundingSpheres = [];
        for (const nodeIndex of group) {
          boundingSpheres.push(nodes[nodeIndex].boundingSphere);
          maxClusterQuadricError = Math.max(maxClusterQuadricError, nodes[nodeIndex].maxClusterQuadricError);
        }
        let nodeRange = new InteriorNode();
        nodeRange.isLeafNode = 0;
        nodeRange.childOffset = currentNodeIndex & U32_MASK(26);
        nodeRange.childCountMinusOne = group.length - 1 & U32_MASK(5);
        let boundingSphere = new Sphere2();
        result = makeBoundingSphere2(boundingSpheres, boundingSphere);
        if (result != 0 /* SUCCESS */) {
          return result;
        }
        const node = new Node();
        node.children = nodeRange;
        node.boundingSphere = boundingSphere;
        node.maxClusterQuadricError = maxClusterQuadricError;
        newNodes.push(node);
        for (const nodeIndex of group) {
          output.nodes[currentNodeIndex] = nodes[nodeIndex];
          currentNodeIndex++;
        }
      }
      [nodes, newNodes] = [newNodes, nodes];
    }
    if (nodes.length != 1) {
      return 12 /* ERROR_HIERARCHY_GENERATION_FAILED */;
    }
    if (lodIndex == lodCount - 1) {
      nodes[0].boundingSphere = new Sphere2(0, 0, 0, Number.MAX_VALUE);
    }
    for (let i2 = 0; i2 < nodes.length; i2++) {
      lodNodes.push(nodes[i2]);
    }
  }
  {
    let maxClusterQuadricError = 0;
    for (const node of lodNodes)
      maxClusterQuadricError = Math.max(maxClusterQuadricError, node.maxClusterQuadricError);
    let nodeRange = new InteriorNode();
    nodeRange.isLeafNode = 0;
    nodeRange.childOffset = currentNodeIndex & U32_MASK(26);
    nodeRange.childCountMinusOne = lodNodes.length - 1 & U32_MASK(5);
    if (nodeRange.childCountMinusOne + 1 != lodNodes.length) {
      return 3 /* ERROR_NODE_OVERFLOW */;
    }
    rootNode = new Node();
    rootNode.children = nodeRange;
    rootNode.boundingSphere = new Sphere2(0, 0, 0, Number.MAX_VALUE);
    rootNode.maxClusterQuadricError = maxClusterQuadricError;
    output.nodes[0] = rootNode;
    for (let nodeIndex = 0; nodeIndex < lodNodes.length; nodeIndex++) {
      const node = lodNodes[nodeIndex];
      if (currentNodeIndex >= output.nodeCount) {
        return 12 /* ERROR_HIERARCHY_GENERATION_FAILED */;
      }
      output.nodes[currentNodeIndex] = node;
      currentNodeIndex++;
    }
  }
  output.nodeCount = currentNodeIndex;
  return 0 /* SUCCESS */;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_hierarchy_storage.ts
var LodHierarchy = class {
  nodes = [];
  groupCumulativeBoundingSpheres = [];
  groupCumulativeQuadricError = [];
};
function generateLodHierarchy(input, hierarchy) {
  let reqInfo = new HierarchyGetRequirementsInfo();
  reqInfo.input = input;
  const sizes = nvclusterlodHierarchyGetRequirements(reqInfo);
  hierarchy.nodes = resizeArray(hierarchy.nodes, sizes.maxNodeCount, () => new Node());
  hierarchy.groupCumulativeBoundingSpheres = resizeArray(hierarchy.groupCumulativeBoundingSpheres, input.groupCount, () => new Sphere2());
  hierarchy.groupCumulativeQuadricError = resizeArray(hierarchy.groupCumulativeQuadricError, input.groupCount, () => 0);
  let output = new HierarchyOutput();
  output.groupCumulativeBoundingSpheres = hierarchy.groupCumulativeBoundingSpheres;
  output.groupCumulativeQuadricError = hierarchy.groupCumulativeQuadricError;
  output.nodeCount = sizes.maxNodeCount;
  output.nodes = hierarchy.nodes;
  let createInfo = new HierarchyCreateInfo(input);
  let result = nvclusterlodCreateHierarchy(createInfo, output);
  if (result != 0 /* SUCCESS */) {
    Object.assign(hierarchy, new LodHierarchy());
    return result;
  }
  hierarchy.nodes = resizeArray(hierarchy.nodes, output.nodeCount, () => new Node());
  return 0 /* SUCCESS */;
}

// src/plugins/meshlets_v2/nv_cluster_lod_builder/lib.ts
var NV_Cluster = class {
  static async Build(input) {
    let mesh = new LocalizedLodMesh();
    await Meshoptimizer2.load();
    let result = generateLocalizedLodMesh(input, mesh);
    if (result !== 0 /* SUCCESS */) {
      throw Error("Error: " + Result[result]);
    }
    const hierarchyInput = new HierarchyInput();
    hierarchyInput.clusterGeneratingGroups = mesh.lodMesh.clusterGeneratingGroups;
    hierarchyInput.groupQuadricErrors = mesh.lodMesh.groupQuadricErrors;
    hierarchyInput.groupClusterRanges = mesh.lodMesh.groupClusterRanges;
    hierarchyInput.groupCount = mesh.lodMesh.groupClusterRanges.length;
    hierarchyInput.clusterBoundingSpheres = mesh.lodMesh.clusterBoundingSpheres;
    hierarchyInput.clusterCount = mesh.lodMesh.clusterBoundingSpheres.length;
    hierarchyInput.lodLevelGroupRanges = mesh.lodMesh.lodLevelGroupRanges;
    hierarchyInput.lodLevelCount = mesh.lodMesh.lodLevelGroupRanges.length;
    let hierarchy = new LodHierarchy();
    result = generateLodHierarchy(hierarchyInput, hierarchy);
    const groupLodLevels = new Array(mesh.lodMesh.groupClusterRanges.length).fill(0);
    for (let level = 0; level < mesh.lodMesh.lodLevelGroupRanges.length; level++) {
      const groupRange = mesh.lodMesh.lodLevelGroupRanges[level];
      for (let g = groupRange.offset; g < groupRange.offset + groupRange.count; g++) {
        groupLodLevels[g] = level;
      }
    }
    let output = /* @__PURE__ */ new Map();
    for (let lod = 0; lod < mesh.lodMesh.lodLevelGroupRanges.length; lod++) {
      const lodLevelGroupRange = mesh.lodMesh.lodLevelGroupRanges[lod];
      for (let groupIndex = lodLevelGroupRange.offset; groupIndex < lodLevelGroupRange.offset + lodLevelGroupRange.count; groupIndex++) {
        const groupClusterRange = mesh.lodMesh.groupClusterRanges[groupIndex];
        for (let clusterIndex = groupClusterRange.offset; clusterIndex < groupClusterRange.offset + groupClusterRange.count; clusterIndex++) {
          const clusterTriangleRange = mesh.lodMesh.clusterTriangleRanges[clusterIndex];
          const clusterVertexRange = mesh.clusterVertexRanges[clusterIndex];
          const clusterVertexGlobalIndices = mesh.vertexGlobalIndices.slice(clusterVertexRange.offset);
          let clusterIndices = [];
          for (let triangleIndex = clusterTriangleRange.offset; triangleIndex < clusterTriangleRange.offset + clusterTriangleRange.count; triangleIndex++) {
            const localIndex0 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 0];
            const localIndex1 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 1];
            const localIndex2 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 2];
            const globalIndex0 = clusterVertexGlobalIndices[localIndex0];
            const globalIndex1 = clusterVertexGlobalIndices[localIndex1];
            const globalIndex2 = clusterVertexGlobalIndices[localIndex2];
            clusterIndices.push(globalIndex0 + 1);
            clusterIndices.push(globalIndex1 + 1);
            clusterIndices.push(globalIndex2 + 1);
          }
          const clusterGeneratingGroup = mesh.lodMesh.clusterGeneratingGroups[clusterIndex];
          const lodMeshletsArray = output.get(lod) || [];
          const boundingSphere = hierarchy.groupCumulativeBoundingSpheres[groupIndex];
          const error = hierarchy.groupCumulativeQuadricError[groupIndex];
          let parentBoundingSphere = hierarchy.groupCumulativeBoundingSpheres[clusterGeneratingGroup];
          let parentError = hierarchy.groupCumulativeQuadricError[clusterGeneratingGroup];
          if (!parentBoundingSphere) parentBoundingSphere = new Sphere2(0, 0, 0, 0);
          if (!parentError) parentError = 0;
          lodMeshletsArray.push({
            vertices: input.vertices,
            indices: new Uint32Array(clusterIndices),
            boundingSphere,
            error,
            parentBoundingSphere,
            parentError
          });
          output.set(lod, lodMeshletsArray);
          console.log(`Processed: lod: ${lod}, groupIndex: ${groupIndex}, clusterIndex: ${clusterIndex}, vertexCount: ${input.vertices.length}, indexCount: ${clusterIndices.length}`);
        }
      }
    }
    return output;
  }
};

// src/plugins/meshlets_v2/MeshletMesh.ts
var meshletsCache = /* @__PURE__ */ new Map();
var MeshletMesh = class extends Mesh {
  meshlets = [];
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(MeshletEvents.Updated, this);
    });
  }
  async SetGeometry(geometry, clusterize2 = true) {
    this.geometry = geometry;
    let cached = meshletsCache.get(geometry);
    if (cached) {
      cached.instanceCount++;
      meshletsCache.set(geometry, cached);
      this.meshlets.push(...cached.meshlets);
      return;
    }
    const pa = geometry.attributes.get("position");
    const na = geometry.attributes.get("normal");
    const ua = geometry.attributes.get("uv");
    const ia = geometry.index;
    if (!pa || !na || !ua || !ia) throw Error("To create meshlets need indices, position, normal and uv attributes");
    const p = pa.array;
    const n = na.array;
    const u = ua.array;
    const indices = ia.array;
    const interleavedBufferAttribute = InterleavedVertexAttribute.fromArrays([p, n, u], [3, 3, 2]);
    const interleavedVertices = interleavedBufferAttribute.array;
    await Meshoptimizer2.load();
    const meshInput = new MeshInput();
    meshInput.indices = indices;
    meshInput.indexCount = indices.length;
    meshInput.vertices = interleavedVertices;
    meshInput.vertexOffset = 0;
    meshInput.vertexCount = interleavedVertices.length / 8;
    meshInput.vertexStride = 3 + 3 + 2;
    meshInput.clusterConfig = {
      minClusterSize: 128,
      maxClusterSize: 128,
      costUnderfill: 0.9,
      costOverlap: 0.5,
      preSplitThreshold: 1 << 17
    };
    meshInput.groupConfig = {
      minClusterSize: 32,
      maxClusterSize: 32,
      costUnderfill: 0.5,
      costOverlap: 0,
      preSplitThreshold: 0
    };
    meshInput.decimationFactor = 0.5;
    const outputMeshes = await NV_Cluster.Build(meshInput);
    console.log(outputMeshes);
    let meshlets = [];
    for (const [lod, meshes] of outputMeshes) {
      for (const cluster of meshes) {
        const clusterIndicesZeroIndexed = cluster.indices.map((i2) => i2 - 1);
        const meshlet = new Meshlet(cluster.vertices, clusterIndicesZeroIndexed);
        meshlet.clusterError = cluster.error;
        meshlet.parentError = cluster.parentError;
        meshlet.boundingVolume = new Sphere(
          new Vector3(cluster.boundingSphere.x, cluster.boundingSphere.y, cluster.boundingSphere.z),
          cluster.boundingSphere.radius
        );
        meshlet.parentBoundingVolume = new Sphere(
          new Vector3(cluster.parentBoundingSphere.x, cluster.parentBoundingSphere.y, cluster.parentBoundingSphere.z),
          cluster.parentBoundingSphere.radius
        );
        meshlet.lod = lod;
        meshlets.push(meshlet);
      }
    }
    if (meshlets.length === 1) {
      meshlets[0].clusterError = 0.1;
    }
    {
      this.meshlets = meshlets;
      console.log("allMeshlets", meshlets);
    }
    meshletsCache.set(geometry, { meshlets: this.meshlets, instanceCount: 0 });
  }
};

// src/renderer/Material.ts
var Material = class {
  shader;
  params;
  async createShader() {
    throw Error("Not implemented");
  }
  constructor(params) {
    const defaultParams = {
      isDeferred: false
    };
    this.params = Object.assign({}, defaultParams, params);
  }
};
var PBRMaterial = class extends Material {
  id = Utils.UUID();
  initialParams;
  constructor(params) {
    super(params);
    this.initialParams = params;
    const defaultParams = {
      albedoColor: new Color(1, 1, 1, 1),
      emissiveColor: new Color(0, 0, 0, 0),
      roughness: 0,
      metalness: 0,
      albedoMap: void 0,
      normalMap: void 0,
      heightMap: void 0,
      metalnessMap: void 0,
      emissiveMap: void 0,
      aoMap: void 0,
      doubleSided: false,
      alphaCutoff: 0,
      unlit: false,
      wireframe: false,
      isDeferred: true
    };
    this.params = Object.assign({}, defaultParams, params);
  }
  async createShader() {
    const DEFINES = {
      USE_ALBEDO_MAP: this.initialParams?.albedoMap ? true : false,
      USE_NORMAL_MAP: this.initialParams?.normalMap ? true : false,
      USE_HEIGHT_MAP: this.initialParams?.heightMap ? true : false,
      USE_METALNESS_MAP: this.initialParams?.metalnessMap ? true : false,
      USE_EMISSIVE_MAP: this.initialParams?.emissiveMap ? true : false,
      USE_AO_MAP: this.initialParams?.aoMap ? true : false
    };
    let shaderParams = {
      code: await ShaderLoader.Draw,
      defines: DEFINES,
      colorOutputs: [
        { format: "rgba16float" },
        { format: "rgba16float" },
        { format: "rgba16float" }
      ],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        viewMatrix: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 0, binding: 2, type: "storage" },
        material: { group: 0, binding: 3, type: "storage" },
        TextureSampler: { group: 0, binding: 4, type: "sampler" },
        AlbedoMap: { group: 0, binding: 5, type: "texture" },
        NormalMap: { group: 0, binding: 6, type: "texture" },
        HeightMap: { group: 0, binding: 7, type: "texture" },
        MetalnessMap: { group: 0, binding: 8, type: "texture" },
        EmissiveMap: { group: 0, binding: 9, type: "texture" },
        AOMap: { group: 0, binding: 10, type: "texture" },
        cameraPosition: { group: 0, binding: 11, type: "storage" }
      },
      cullMode: this.params.doubleSided ? "none" : void 0
    };
    shaderParams = Object.assign({}, shaderParams, this.params);
    const shader = await Shader.Create(shaderParams);
    if (DEFINES.USE_ALBEDO_MAP || DEFINES.USE_NORMAL_MAP || DEFINES.USE_HEIGHT_MAP || DEFINES.USE_METALNESS_MAP || DEFINES.USE_EMISSIVE_MAP || DEFINES.USE_AO_MAP) {
      const textureSampler = TextureSampler.Create();
      shader.SetSampler("TextureSampler", textureSampler);
    }
    shader.SetArray("material", new Float32Array([
      this.params.albedoColor.r,
      this.params.albedoColor.g,
      this.params.albedoColor.b,
      this.params.albedoColor.a,
      this.params.emissiveColor.r,
      this.params.emissiveColor.g,
      this.params.emissiveColor.b,
      this.params.emissiveColor.a,
      this.params.roughness,
      this.params.metalness,
      +this.params.unlit,
      this.params.alphaCutoff,
      +this.params.wireframe,
      0,
      0,
      0
    ]));
    if (DEFINES.USE_ALBEDO_MAP === true && this.params.albedoMap) shader.SetTexture("AlbedoMap", this.params.albedoMap);
    if (DEFINES.USE_NORMAL_MAP === true && this.params.normalMap) shader.SetTexture("NormalMap", this.params.normalMap);
    if (DEFINES.USE_HEIGHT_MAP === true && this.params.heightMap) shader.SetTexture("HeightMap", this.params.heightMap);
    if (DEFINES.USE_METALNESS_MAP === true && this.params.metalnessMap) shader.SetTexture("MetalnessMap", this.params.metalnessMap);
    if (DEFINES.USE_EMISSIVE_MAP === true && this.params.emissiveMap) shader.SetTexture("EmissiveMap", this.params.emissiveMap);
    if (DEFINES.USE_AO_MAP === true && this.params.aoMap) shader.SetTexture("AOMap", this.params.aoMap);
    this.shader = shader;
    return shader;
  }
};

// src/plugins/meshlets_v2/passes/PrepareSceneData.ts
var PrepareSceneData = class extends RenderPass {
  name = "PrepareSceneData";
  objectInfoBuffer;
  vertexBuffer;
  meshMaterialInfo;
  meshMatrixInfoBuffer;
  meshletInfoBuffer;
  currentMeshCount = 0;
  currentMeshletsCount = 0;
  materialIndexCache = /* @__PURE__ */ new Map();
  albedoMaps = [];
  normalMaps = [];
  heightMaps = [];
  metalnessMaps = [];
  emissiveMaps = [];
  textureMaps;
  materialMaps = /* @__PURE__ */ new Map();
  dummyTexture;
  constructor() {
    super({
      outputs: [
        MeshletPassParams.indirectVertices,
        MeshletPassParams.indirectMeshInfo,
        MeshletPassParams.indirectMeshletInfo,
        MeshletPassParams.indirectObjectInfo,
        MeshletPassParams.indirectMeshMatrixInfo,
        MeshletPassParams.meshletsCount,
        MeshletPassParams.textureMaps
      ]
    });
  }
  async init(resources) {
    const bufferSize = 1024 * 100 * 1;
    this.meshMatrixInfoBuffer = new DynamicBufferMemoryAllocator(bufferSize);
    this.meshMaterialInfo = new DynamicBufferMemoryAllocator(bufferSize);
    this.meshletInfoBuffer = new DynamicBufferMemoryAllocator(bufferSize);
    this.vertexBuffer = new DynamicBufferMemoryAllocator(3072 * 10, 3072 * 10);
    this.objectInfoBuffer = new DynamicBufferMemoryAllocator(bufferSize);
    EventSystem.on(MeshletEvents.Updated, (meshlet) => {
      if (this.meshMatrixInfoBuffer.has(meshlet.id)) {
        this.meshMatrixInfoBuffer.set(meshlet.id, meshlet.transform.localToWorldMatrix.elements);
      }
    });
    this.dummyTexture = TextureArray.Create(1, 1, 1);
    this.initialized = true;
  }
  getVertexInfo(meshlet) {
    return meshlet.vertices_gpu;
  }
  getMeshletInfo(meshlet) {
    const bv = meshlet.boundingVolume;
    const pbv = meshlet.parentBoundingVolume;
    return new Float32Array([
      ...meshlet.coneBounds.cone_apex.elements,
      0,
      ...meshlet.coneBounds.cone_axis.elements,
      0,
      meshlet.coneBounds.cone_cutoff,
      0,
      0,
      0,
      bv.center.x,
      bv.center.y,
      bv.center.z,
      bv.radius,
      pbv.center.x,
      pbv.center.y,
      pbv.center.z,
      pbv.radius,
      meshlet.clusterError,
      0,
      0,
      0,
      meshlet.parentError,
      0,
      0,
      0,
      meshlet.lod,
      0,
      0,
      0,
      ...meshlet.bounds.min.elements,
      0,
      ...meshlet.bounds.max.elements,
      0
    ]);
  }
  getMeshMaterialInfo(mesh) {
    let materials = mesh.GetMaterials(PBRMaterial);
    if (materials.length === 0) return null;
    if (materials.length > 1) throw Error("Multiple materials not supported");
    const material = materials[0];
    const albedoIndex = this.processMaterialMap(material.params.albedoMap, "albedo");
    const normalIndex = this.processMaterialMap(material.params.normalMap, "normal");
    const heightIndex = this.processMaterialMap(material.params.heightMap, "height");
    const metalnessIndex = this.processMaterialMap(material.params.metalnessMap, "metalness");
    const emissiveIndex = this.processMaterialMap(material.params.emissiveMap, "emissive");
    const albedoColor = material.params.albedoColor;
    const emissiveColor = material.params.emissiveColor;
    const roughness = material.params.roughness;
    const metalness = material.params.metalness;
    const unlit = material.params.unlit;
    const wireframe = material.params.wireframe;
    return new Float32Array([
      albedoIndex,
      normalIndex,
      heightIndex,
      metalnessIndex,
      emissiveIndex,
      0,
      0,
      0,
      ...albedoColor.elements,
      ...emissiveColor.elements,
      roughness,
      metalness,
      +unlit,
      +wireframe
    ]);
  }
  processMaterialMap(materialMap, type) {
    if (materialMap) {
      let materialIndexCached = this.materialIndexCache.get(materialMap.id);
      if (materialIndexCached === void 0) {
        materialIndexCached = this.materialIndexCache.size;
        this.materialIndexCache.set(materialMap.id, materialIndexCached);
        if (type === "albedo") this.albedoMaps.push(materialMap);
        else if (type === "normal") this.normalMaps.push(materialMap);
        else if (type === "height") this.heightMaps.push(materialMap);
        else if (type === "metalness") this.metalnessMaps.push(materialMap);
        else if (type === "emissive") this.emissiveMaps.push(materialMap);
      }
      return materialIndexCached;
    }
    return -1;
  }
  createMaterialMap(textures, type) {
    if (textures.length === 0) return this.dummyTexture;
    const w = textures[0].width;
    const h = textures[0].height;
    let materialMap = this.materialMaps.get(type);
    if (materialMap === void 0) {
      materialMap = TextureArray.Create(w, h, textures.length);
      materialMap.SetActiveLayer(0);
      this.materialMaps.set(type, materialMap);
    }
    for (let i2 = 0; i2 < textures.length; i2++) {
      if (textures[i2].width !== w || textures[i2].height !== h) {
        console.warn(`Creating blank texture because dimensions dont match`, w, h, textures[i2].width, textures[i2].height);
        const t = RenderTexture.Create(w, h);
        RendererContext.CopyTextureToTextureV2(t, materialMap, 0, 0, [w, h, 1], i2);
        continue;
      }
      RendererContext.CopyTextureToTextureV2(textures[i2], materialMap, 0, 0, [w, h, 1], i2);
    }
    return materialMap;
  }
  // // At start, create buffers/texture
  // public init(resources: ResourcePool) {}
  // // Before render/compute. Fill buffers/textures. No buffer/texture creation is allowed.
  // public preExecute(resources: ResourcePool) {}
  // // Render/compute. No buffer/texture creation of filling is allowed.
  // public execute(resources: ResourcePool) {}
  execute(resources) {
    const mainCamera = Camera.mainCamera;
    const scene = mainCamera.gameObject.scene;
    const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];
    if (this.currentMeshCount !== sceneMeshlets.length) {
      const meshlets = [];
      for (const meshlet of sceneMeshlets) {
        for (const geometry of meshlet.meshlets) {
          meshlets.push({ mesh: meshlet, geometry });
        }
      }
      const indexedCache = /* @__PURE__ */ new Map();
      const meshMatrixCache = /* @__PURE__ */ new Map();
      const meshMaterialCache = /* @__PURE__ */ new Map();
      for (const mesh of sceneMeshlets) {
        let materialIndex = -1;
        for (const material of mesh.GetMaterials(PBRMaterial)) {
          if (!this.meshMaterialInfo.has(material.id)) {
            const meshMaterialInfo = this.getMeshMaterialInfo(mesh);
            if (meshMaterialInfo !== null) {
              this.meshMaterialInfo.set(material.id, meshMaterialInfo);
              meshMaterialCache.set(material.id, meshMaterialCache.size);
            }
          }
          let mc = meshMaterialCache.get(material.id);
          if (mc !== void 0) materialIndex = mc;
        }
        if (!this.meshMatrixInfoBuffer.has(mesh.id)) {
          this.meshMatrixInfoBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
        }
        let meshMatrixIndex = meshMatrixCache.get(mesh.id);
        if (meshMatrixIndex === void 0) {
          meshMatrixIndex = meshMatrixCache.size;
          meshMatrixCache.set(mesh.id, meshMatrixIndex);
        }
        for (const meshlet of mesh.meshlets) {
          if (!this.meshletInfoBuffer.has(meshlet.id)) this.meshletInfoBuffer.set(meshlet.id, this.getMeshletInfo(meshlet));
          if (!this.vertexBuffer.has(meshlet.id)) {
            console.log("Setting vertices");
            this.vertexBuffer.set(meshlet.id, this.getVertexInfo(meshlet));
          }
          let geometryIndex = indexedCache.get(meshlet.crc);
          if (geometryIndex === void 0) {
            geometryIndex = indexedCache.size;
            indexedCache.set(meshlet.crc, geometryIndex);
          }
          this.objectInfoBuffer.set(`${mesh.id}-${meshlet.id}`, new Float32Array([meshMatrixIndex, geometryIndex, materialIndex, 0]));
        }
      }
      this.textureMaps = {
        albedo: this.createMaterialMap(this.albedoMaps, "albedo"),
        normal: this.createMaterialMap(this.normalMaps, "normal"),
        height: this.createMaterialMap(this.heightMaps, "height"),
        metalness: this.createMaterialMap(this.metalnessMaps, "metalness"),
        emissive: this.createMaterialMap(this.emissiveMaps, "emissive")
      };
      this.currentMeshCount = sceneMeshlets.length;
      this.currentMeshletsCount = meshlets.length;
      MeshletDebug.totalMeshlets.SetValue(meshlets.length);
    }
    resources.setResource(MeshletPassParams.indirectVertices, this.vertexBuffer.getBuffer());
    resources.setResource(MeshletPassParams.indirectMeshInfo, this.meshMaterialInfo.getBuffer());
    resources.setResource(MeshletPassParams.indirectMeshletInfo, this.meshletInfoBuffer.getBuffer());
    resources.setResource(MeshletPassParams.indirectObjectInfo, this.objectInfoBuffer.getBuffer());
    resources.setResource(MeshletPassParams.indirectMeshMatrixInfo, this.meshMatrixInfoBuffer.getBuffer());
    resources.setResource(MeshletPassParams.meshletsCount, this.currentMeshletsCount);
    resources.setResource(MeshletPassParams.textureMaps, this.textureMaps);
  }
};

// src/plugins/meshlets_v2/passes/MeshletDraw.ts
var MeshletPassParams = {
  indirectVertices: "indirectVertices",
  indirectMeshInfo: "indirectMeshInfo",
  indirectMeshletInfo: "indirectMeshletInfo",
  indirectObjectInfo: "indirectObjectInfo",
  indirectMeshMatrixInfo: "indirectMeshMatrixInfo",
  indirectInstanceInfo: "indirectInstanceInfo",
  indirectDrawBuffer: "indirectDrawBuffer",
  meshletsCount: "meshletsCount",
  textureMaps: "textureMaps",
  meshletSettings: "meshletSettings",
  isCullingPrepass: "isCullingPrepass"
};
var MeshletDraw = class extends RenderPass {
  name = "MeshletDraw";
  prepareSceneData;
  cullingPass;
  HiZ;
  indirectRender;
  constructor() {
    super({
      inputs: [
        PassParams.depthTexture,
        PassParams.depthTexturePyramid,
        PassParams.DebugSettings,
        PassParams.depthTexture,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth
      ],
      outputs: [
        MeshletPassParams.meshletSettings
      ]
    });
  }
  async init(resources) {
    this.prepareSceneData = new PrepareSceneData();
    this.cullingPass = new CullingPass();
    this.HiZ = new HiZPass();
    this.indirectRender = new IndirectGBufferPass();
    await this.prepareSceneData.init(resources);
    await this.cullingPass.init(resources);
    await this.HiZ.init(resources);
    await this.indirectRender.init(resources);
    this.initialized = true;
  }
  execute(resources) {
    this.prepareSceneData.execute(resources);
    const settings = new Float32Array([
      +MeshletDebug.isFrustumCullingEnabled,
      +MeshletDebug.isBackFaceCullingEnabled,
      +MeshletDebug.isOcclusionCullingEnabled,
      +MeshletDebug.isSmallFeaturesCullingEnabled,
      MeshletDebug.staticLODValue,
      MeshletDebug.dynamicLODErrorThresholdValue,
      +MeshletDebug.isDynamicLODEnabled,
      MeshletDebug.meshletsViewType,
      Meshlet.max_triangles
    ]);
    resources.setResource(MeshletPassParams.meshletSettings, settings);
    this.cullingPass.execute(resources);
    this.indirectRender.execute(resources);
  }
};

// src/renderer/passes/DeferredGBufferPass.ts
var DeferredGBufferPass = class extends RenderPass {
  name = "DeferredMeshRenderPass";
  constructor() {
    super({
      inputs: [
        PassParams.MainCamera,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth
      ],
      outputs: []
    });
  }
  async init(resources) {
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    const meshes = scene.GetComponents(Mesh);
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    if (meshes.length === 0 && instancedMeshes.length === 0) return;
    const inputCamera = Camera.mainCamera;
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const backgroundColor = inputCamera.backgroundColor;
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    RendererContext.BeginRenderPass(
      this.name,
      [
        { target: inputGBufferAlbedo, clear: false, color: backgroundColor },
        { target: inputGBufferNormal, clear: false, color: backgroundColor },
        { target: inputGBufferERMO, clear: false, color: backgroundColor }
      ],
      { target: inputGBufferDepth, clear: false },
      true
    );
    const projectionMatrix = inputCamera.projectionMatrix;
    const viewMatrix = inputCamera.viewMatrix;
    for (const mesh of meshes) {
      if (!mesh.enabled) continue;
      const geometry = mesh.GetGeometry();
      const materials = mesh.GetMaterials();
      for (const material of materials) {
        if (material.params.isDeferred === false) continue;
        if (!material.shader) {
          material.createShader().then((shader2) => {
          });
          continue;
        }
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        RendererContext.DrawGeometry(geometry, shader, 1);
        if (geometry.index) {
          RendererDebug.IncrementTriangleCount(geometry.index.array.length / 3);
        }
      }
    }
    for (const instancedMesh of instancedMeshes) {
      const geometry = instancedMesh.GetGeometry();
      const materials = instancedMesh.GetMaterials();
      for (const material of materials) {
        if (material.params.isDeferred === false) continue;
        if (!material.shader) {
          material.createShader().then((shader2) => {
          });
          continue;
        }
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount + 1);
        if (geometry.index) {
          RendererDebug.IncrementTriangleCount(geometry.index.array.length / 3 * (instancedMesh.instanceCount + 1));
        } else {
          RendererDebug.IncrementTriangleCount(geometry.attributes.get("position").array.length / 3 / 3 * (instancedMesh.instanceCount + 1));
        }
      }
    }
    resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
    resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
    resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
    resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);
    RendererContext.EndRenderPass();
  }
};

// src/TEST/Water.ts
var canvas = document.createElement("canvas");
var aspectRatio = 1;
canvas.width = window.innerWidth * aspectRatio;
canvas.height = window.innerHeight * aspectRatio;
canvas.style.width = `${window.innerWidth}px`;
canvas.style.height = `${window.innerHeight}px`;
document.body.appendChild(canvas);
async function Application() {
  const renderer = Renderer.Create(canvas, "webgpu");
  const scene = new Scene(renderer);
  const mainCameraGameObject = new GameObject(scene);
  mainCameraGameObject.transform.position.set(0, 0, 20);
  mainCameraGameObject.name = "MainCamera";
  const camera = mainCameraGameObject.AddComponent(Camera);
  camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 512);
  const controls = new OrbitControls(canvas, camera);
  {
    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.color.set(1, 1, 1, 1);
    light.castShadows = false;
  }
  {
    const planeGO = new GameObject(scene);
    planeGO.transform.position.set(0, 6, -5);
    planeGO.transform.scale.set(3, 3, 3);
    const sphereMesh = planeGO.AddComponent(Mesh);
    await sphereMesh.SetGeometry(Geometry.Cube());
    sphereMesh.AddMaterial(new PBRMaterial());
  }
  {
    const planeGO = new GameObject(scene);
    planeGO.transform.position.set(0, 1, -5);
    const sphereMesh = planeGO.AddComponent(Mesh);
    await sphereMesh.SetGeometry(Geometry.Sphere());
    sphereMesh.AddMaterial(new PBRMaterial());
  }
  {
    const waterGameObject = new GameObject(scene);
    waterGameObject.transform.eulerAngles.x = -90;
    waterGameObject.transform.position.y = 5;
    const water = waterGameObject.AddComponent(Water);
    const waterSettingsFolder = new UIFolder(Debugger.ui, "Water");
    new UISliderStat(waterSettingsFolder, "Wave speed:", -1, 1, 0.01, water.settings.get("wave_speed")[0], (value) => water.settings.set("wave_speed", [value, 0, 0, 0]));
    new UISliderStat(waterSettingsFolder, "Beers law:", -2, 20, 0.01, water.settings.get("beers_law")[0], (value) => water.settings.set("beers_law", [value, 0, 0, 0]));
    new UISliderStat(waterSettingsFolder, "Depth offset:", -1, 1, 0.01, water.settings.get("depth_offset")[0], (value) => water.settings.set("depth_offset", [value, 0, 0, 0]));
    new UISliderStat(waterSettingsFolder, "Refraction:", -1, 1, 0.01, water.settings.get("refraction")[0], (value) => water.settings.set("refraction", [value, 0, 0, 0]));
    new UISliderStat(waterSettingsFolder, "Foam level:", -10, 10, 0.01, water.settings.get("foam_level")[0], (value) => water.settings.set("foam_level", [value, 0, 0, 0]));
    new UIColorStat(waterSettingsFolder, "Color deep:", new Color(...water.settings.get("color_deep")).toHex().slice(0, 7), (value) => {
      const c = Color.fromHex(parseInt(value.slice(1, value.length), 16));
      water.settings.set("color_deep", [c.r, c.g, c.b, c.a]);
    });
    new UIColorStat(waterSettingsFolder, "Color shallow:", new Color(...water.settings.get("color_shallow")).toHex().slice(0, 7), (value) => {
      const c = Color.fromHex(parseInt(value.slice(1, value.length), 16));
      water.settings.set("color_shallow", [c.r, c.g, c.b, c.a]);
    });
    waterSettingsFolder.Open();
  }
  scene.renderPipeline.AddPass(new MeshletDraw(), 0 /* BeforeGBuffer */);
  scene.renderPipeline.AddPass(new DeferredGBufferPass(), 0 /* BeforeGBuffer */);
  scene.Start();
}
Application();
