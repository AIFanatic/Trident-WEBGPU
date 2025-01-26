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
      console.warn("init", pass.name, pass.initialized, pass.initializing);
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
    if (cached) {
      return cached;
    }
    return fetch(url).then((response) => {
      if (!response.ok) throw Error(`File not found ${url}`);
      if (type === "json") return response.json();
      else if (type === "text") return response.text();
      else if (type === "binary") return response.arrayBuffer();
    }).then((result) => {
      _Assets.cache.set(url, result);
      return result;
    });
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
  }
  SetValue(value) {
    if (this.rolling === true) {
      value = this.previousValue * 0.95 + value * 0.05;
    }
    const valueStr = this.precision === 0 ? value.toString() : value.toFixed(this.precision);
    this.textElement.textContent = valueStr + this.unit;
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
  constructor() {
    const container = document.createElement("div");
    container.classList.add("stats-panel");
    document.body.append(container);
    this.ui = new UIFolder(container, "Debugger");
    this.ui.Open();
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
  gpuTime;
  gpuBufferSizeStat;
  gpuTextureSizeStat;
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
    this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
    this.gpuBufferSizeStat = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
    this.gpuTextureSizeStat = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 2);
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
  SetTriangleCount(count) {
    this.triangleCount.SetValue(count);
  }
  IncrementTriangleCount(count) {
    this.triangleCount.SetValue(this.triangleCount.GetValue() + count);
  }
  SetVisibleTriangleCount(count) {
    this.visibleTriangles.SetValue(count);
  }
  SetFPS(count) {
    this.fps.SetValue(count);
    let totalGPUTime = 0;
    for (const [_, framePass] of this.framePassesStats) {
      totalGPUTime += framePass.GetValue();
    }
    this.gpuTime.SetValue(totalGPUTime);
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
var DynamicBuffer2 = class {
  size;
  minBindingSize;
  dynamicOffset = 0;
  constructor() {
  }
  static Create(size, type, minBindingSize) {
    if (size === 0) throw Error("Tried to create a buffer with size 0");
    if (Renderer.type === "webgpu") return new WEBGPUDynamicBuffer(size, type, minBindingSize);
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
    this.buffer = WEBGPURenderer.device.createTexture({
      size: [width, height, depth],
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
  // Format and types are very limited for now
  // https://github.com/gpuweb/gpuweb/issues/2322
  static FromImageBitmap(imageBitmap, width, height, format, flipY) {
    const texture = new _WEBGPUTexture(width, height, 1, format, 2 /* RENDER_TARGET */, "2d", 1);
    WEBGPURenderer.device.queue.copyExternalImageToTexture(
      { source: imageBitmap, flipY },
      { texture: texture.GetBuffer() },
      [imageBitmap.width, imageBitmap.height]
    );
    return texture;
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
var InterleavedVertexAttribute = class _InterleavedVertexAttribute {
  constructor(array, stride) {
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
    shader.OnPreRender();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
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
    shader.OnPreRender();
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
  static CopyTextureToTexture(source, destination, srcMip = 0, dstMip = 0, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTexture(source, destination, srcMip, dstMip, size);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToBuffer(source, destination, srcMip, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToBuffer(source, destination, srcMip, size);
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
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 0 /* IMAGE */, "2d", mipLevels);
    throw Error("Renderer type invalid");
  }
  static async Load(url, format = Renderer.SwapChainFormat, flipY = false) {
    const response = await fetch(url);
    const imageBitmap = await createImageBitmap(await response.blob());
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
    throw Error("Renderer type invalid");
  }
  static async LoadImageSource(imageSource, format = Renderer.SwapChainFormat, flipY = false) {
    const imageBitmap = await createImageBitmap(imageSource);
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
var DepthTextureArray = class extends Texture2 {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 1);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d-array", mipLevels);
    throw Error("Renderer type invalid");
  }
};

// src/renderer/webgpu/WEBGPUBaseShader.ts
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
  constructor(params) {
    const code = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
    this.params = params;
    this.module = WEBGPURenderer.device.createShaderModule({ code });
    if (this.params.uniforms) this.uniformMap = new Map(Object.entries(this.params.uniforms));
  }
  BuildBindGroupLayouts() {
    const bindGroupsInfo = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!bindGroupsInfo[uniform.group]) bindGroupsInfo[uniform.group] = { layoutEntries: [], entries: [], buffers: [] };
      const group = bindGroupsInfo[uniform.group];
      if (uniform.buffer instanceof WEBGPUBuffer) {
        const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        group.layoutEntries.push({ binding: uniform.binding, visibility, buffer: { type: UniformTypeToWGSL[uniform.type] } });
        group.entries.push({ binding: uniform.binding, resource: { buffer: uniform.buffer.GetBuffer() } });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
        const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        group.layoutEntries.push({
          binding: uniform.binding,
          visibility,
          buffer: {
            type: UniformTypeToWGSL[uniform.type],
            hasDynamicOffset: true,
            minBindingSize: uniform.buffer.minBindingSize
          }
        });
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
        let sampleType = uniform.type === "depthTexture" ? "depth" : "float";
        if (uniform.buffer.format === "r32float") sampleType = "unfilterable-float";
        if (uniform.buffer.type === 3 /* RENDER_TARGET_STORAGE */) {
          group.layoutEntries.push({
            binding: uniform.binding,
            visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
            storageTexture: {
              format: uniform.buffer.format,
              viewDimension: uniform.buffer.dimension,
              access: "read-write"
            }
          });
        } else {
          group.layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: { sampleType, viewDimension: uniform.buffer.dimension } });
        }
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
        let type = void 0;
        if (uniform.type === "sampler") type = "filtering";
        else if (uniform.type === "sampler-compare") type = "comparison";
        else if (uniform.type === "sampler-non-filterable") type = "non-filtering";
        group.layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, sampler: { type } });
        group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer() });
        group.buffers.push(uniform.buffer);
      }
    }
    return bindGroupsInfo;
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
  SetVector3(name, vector) {
    this.SetUniformDataFromArray(name, vector.elements);
  }
  SetVector2(name, vector) {
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
  RebuildDescriptors() {
  }
  OnPreRender() {
    if (this.needsUpdate || !this.pipeline || !this.bindGroups) {
      this.RebuildDescriptors();
    }
  }
};

// src/renderer/webgpu/WEBGPUComputeShader.ts
var WEBGPUComputeShader = class extends WEBGPUBaseShader {
  computeEntrypoint;
  params;
  _pipeline = null;
  get pipeline() {
    return this._pipeline;
  }
  constructor(params) {
    super(params);
    this.params = params;
    this.computeEntrypoint = params.computeEntrypoint;
  }
  RebuildDescriptors() {
    console.log("%c Compiling shader", "color: #3498db");
    this._bindGroupsInfo = this.BuildBindGroupLayouts();
    const bindGroupLayouts = [];
    this._bindGroups = [];
    for (const bindGroupInfo of this._bindGroupsInfo) {
      const bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({ entries: bindGroupInfo.layoutEntries });
      bindGroupLayouts.push(bindGroupLayout);
      const bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
      this._bindGroups.push(bindGroup);
    }
    const pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
      bindGroupLayouts
      // Array of all bind group layouts used
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
var WGSLShaderAttributeFormat = {
  vec2: "float32x2",
  vec3: "float32x3",
  vec4: "float32x4"
};
var WEBGPUShader = class extends WEBGPUBaseShader {
  vertexEntrypoint;
  fragmentEntrypoint;
  params;
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
  RebuildDescriptors() {
    console.log("%c Compiling shader", "color: #3498db");
    this._bindGroupsInfo = this.BuildBindGroupLayouts();
    const bindGroupLayouts = [];
    this._bindGroups = [];
    for (const bindGroupInfo of this._bindGroupsInfo) {
      const bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({ entries: bindGroupInfo.layoutEntries });
      bindGroupLayouts.push(bindGroupLayout);
      const bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
      this._bindGroups.push(bindGroup);
    }
    const pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
      bindGroupLayouts
      // Array of all bind group layouts used
    });
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
    if (this.params.depthOutput) pipelineDescriptor.depthStencil = {
      depthWriteEnabled: true,
      depthCompare: this.params.depthCompare ? this.params.depthCompare : "less",
      depthBias: this.params.depthBias ? this.params.depthBias : void 0,
      depthBiasSlopeScale: this.params.depthBiasSlopeScale ? this.params.depthBiasSlopeScale : void 0,
      depthBiasClamp: this.params.depthBiasClamp ? this.params.depthBiasClamp : void 0,
      format: this.params.depthOutput
    };
    const buffers = [];
    for (const [_, attribute] of this.attributeMap) {
      buffers.push({ arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] });
    }
    pipelineDescriptor.vertex.buffers = buffers;
    this._pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
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
  }
};
var Shader = class extends BaseShader {
  id;
  params;
  static async Create(params) {
    params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
    if (Renderer.type === "webgpu") return new WEBGPUShader(params);
    throw Error("Unknown api");
  }
};
var Compute = class extends BaseShader {
  params;
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

// src/renderer/RenderCache.ts
var RenderCache = class {
  static renderableMeshes = [];
  static Reset() {
    this.renderableMeshes = [];
  }
};

// src/renderer/passes/DeferredShadowMapPass.ts
var lightsCSMProjectionMatrix = [];
var cascadeSplits = new Vector4();
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
var DeferredShadowMapPass = class extends RenderPass {
  name = "DeferredShadowMapPass";
  drawInstancedShadowShader;
  drawShadowShader;
  lightProjectionMatrixBuffer;
  lightProjectionViewMatricesBuffer;
  modelMatrices;
  cascadeIndexBuffers = [];
  cascadeCurrentIndexBuffer;
  needsUpdate = false;
  constructor() {
    super({
      inputs: [
        PassParams.MainCamera,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth
      ],
      outputs: [
        PassParams.ShadowPassDepth
      ]
    });
  }
  async init(resources) {
    const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIdx : u32, 
            @location(0) position : vec3<f32>,
            @location(1) normal : vec3<f32>,
            @location(2) uv : vec2<f32>,
        };
        
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };
        
        @group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
        @group(0) @binding(1) var<storage, read> cascadeIndex: f32;
        
        @group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;
        
        @vertex
        fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
            var output : VertexOutput;

            let modelMatrixInstance = modelMatrix[input.instanceIdx];
            let lightProjectionViewMatrix = projectionMatrix[u32(cascadeIndex)];
        
            return lightProjectionViewMatrix * modelMatrixInstance * vec4(input.position, 1.0);
        }
        
        @fragment
        fn fragmentMain() -> @location(0) vec4<f32> {
            return vec4(1.0);
        }
        `;
    this.drawShadowShader = await Shader.Create({
      code,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        cascadeIndex: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 1, binding: 0, type: "storage" }
      },
      colorOutputs: [],
      depthOutput: "depth24plus",
      // depthBias: 2,              // Constant bias
      // depthBiasSlopeScale: 3.0,  // Slope-scale bias
      // depthBiasClamp: 0.0,       // Max clamp for the bias
      cullMode: "front"
    });
    this.drawInstancedShadowShader = await Shader.Create({
      code,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        cascadeIndex: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 1, binding: 0, type: "storage" }
      },
      colorOutputs: [],
      depthOutput: "depth24plus",
      cullMode: "front"
    });
    this.initialized = true;
  }
  getCornersForCascade(camera, cascadeNear, cascadeFar) {
    const projectionMatrix = new Matrix4().perspectiveWGPUMatrix(camera.fov * (Math.PI / 180), camera.aspect, cascadeNear, cascadeFar);
    let frustumCorners = [
      new Vector3(-1, 1, 0),
      new Vector3(1, 1, 0),
      new Vector3(1, -1, 0),
      new Vector3(-1, -1, 0),
      new Vector3(-1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, -1, 1),
      new Vector3(-1, -1, 1)
    ];
    const invViewProj = projectionMatrix.clone().mul(camera.viewMatrix).invert();
    for (let i2 = 0; i2 < 8; i2++) {
      frustumCorners[i2].applyMatrix4(invViewProj);
    }
    return frustumCorners;
  }
  getCascades(camera, cascadeCount, light) {
    const CASCADE_PERCENTAGES = [0.05, 0.15, 0.5, 1];
    const CASCADE_DISTANCES = [
      CASCADE_PERCENTAGES[0] * camera.far,
      CASCADE_PERCENTAGES[1] * camera.far,
      CASCADE_PERCENTAGES[2] * camera.far,
      CASCADE_PERCENTAGES[3] * camera.far
    ];
    let cascades = [];
    for (let i2 = 0; i2 < cascadeCount; i2++) {
      const cascadeNear = i2 === 0 ? camera.near : CASCADE_DISTANCES[i2 - 1];
      const cascadeFar = CASCADE_DISTANCES[i2];
      const frustumCorners = this.getCornersForCascade(camera, cascadeNear, cascadeFar);
      const frustumCenter = new Vector3(0, 0, 0);
      for (let i3 = 0; i3 < frustumCorners.length; i3++) {
        frustumCenter.add(frustumCorners[i3]);
      }
      frustumCenter.mul(1 / frustumCorners.length);
      const lightDirection = light.transform.position.clone().normalize();
      const radius = frustumCorners[0].clone().sub(frustumCorners[6]).length() / 2;
      if (DeferredShadowMapPassDebug.roundToPixelSizeValue === true) {
        const shadowMapSize = 4096;
        const texelsPerUnit = shadowMapSize / (radius * 2);
        const scalar = new Matrix4().makeScale(new Vector3(texelsPerUnit, texelsPerUnit, texelsPerUnit));
        const baseLookAt = new Vector3(-lightDirection.x, -lightDirection.y, -lightDirection.z);
        const lookAt = new Matrix4().lookAt(new Vector3(0, 0, 0), baseLookAt, new Vector3(0, 1, 0)).mul(scalar);
        const lookAtInv = lookAt.clone().invert();
        frustumCenter.transformDirection(lookAt);
        frustumCenter.x = Math.floor(frustumCenter.x);
        frustumCenter.y = Math.floor(frustumCenter.y);
        frustumCenter.transformDirection(lookAtInv);
      }
      const eye = frustumCenter.clone().sub(lightDirection.clone().mul(radius * 2));
      const lightViewMatrix = new Matrix4();
      lightViewMatrix.lookAt(
        eye,
        frustumCenter,
        new Vector3(0, 1, 0)
      );
      const lightProjMatrix = new Matrix4().orthoZO(-radius, radius, -radius, radius, -radius * 6, radius * 6);
      const out = lightProjMatrix.mul(lightViewMatrix);
      cascades.push({
        viewProjMatrix: out,
        splitDepth: cascadeFar
      });
    }
    return cascades;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
    if (lights.length === 0) {
      return;
    }
    const meshes = scene.GetComponents(Mesh);
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    if (meshes.length === 0 && instancedMeshes.length === 0) return;
    const numOfCascades = 4;
    if (!this.lightProjectionMatrixBuffer) {
      this.lightProjectionMatrixBuffer = Buffer3.Create(lights.length * 4 * 4 * 16, 0 /* STORAGE */);
      this.drawShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
      this.drawInstancedShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
    }
    if (!this.modelMatrices || this.modelMatrices.size / 256 !== meshes.length) {
      this.modelMatrices = DynamicBuffer2.Create(meshes.length * 256, 0 /* STORAGE */, 256);
    }
    if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
      this.lightProjectionViewMatricesBuffer = Buffer3.Create(lights.length * numOfCascades * 4 * 16, 0 /* STORAGE */);
    }
    if (!this.cascadeCurrentIndexBuffer) {
      this.cascadeCurrentIndexBuffer = Buffer3.Create(4, 0 /* STORAGE */);
    }
    if (this.cascadeIndexBuffers.length === 0) {
      for (let i2 = 0; i2 < numOfCascades; i2++) {
        const buffer = Buffer3.Create(4, 0 /* STORAGE */);
        buffer.SetArray(new Float32Array([i2]));
        this.cascadeIndexBuffers.push(buffer);
      }
    }
    lightsCSMProjectionMatrix = [];
    for (let i2 = 0; i2 < lights.length; i2++) {
      const light = lights[i2];
      EventSystemLocal.emit(TransformEvents.Updated, light.transform);
      let lightData = [];
      const cascades = this.getCascades(Camera.mainCamera, numOfCascades, light);
      lightData = [];
      for (const cascade of cascades) {
        lightData.push(cascade.viewProjMatrix);
      }
      cascadeSplits.x = cascades[0].splitDepth;
      cascadeSplits.y = cascades[1].splitDepth;
      cascadeSplits.z = cascades[2].splitDepth;
      cascadeSplits.w = cascades[3].splitDepth;
      const ld = new Float32Array(lightData.flatMap((v) => v.elements).flatMap((v) => [...v]));
      this.lightProjectionViewMatricesBuffer.SetArray(ld, i2 * numOfCascades * 4 * 16);
      lightsCSMProjectionMatrix.push(ld);
    }
    for (let i2 = 0; i2 < meshes.length; i2++) {
      const mesh = meshes[i2];
      if (!mesh.enableShadows) continue;
      this.modelMatrices.SetArray(mesh.transform.localToWorldMatrix.elements, i2 * 256);
    }
    this.drawShadowShader.SetBuffer("modelMatrix", this.modelMatrices);
    const shadowOutput = resources.getResource(PassParams.ShadowPassDepth);
    shadowOutput.SetActiveLayer(0);
    this.drawShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    this.drawInstancedShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    for (let i2 = 0; i2 < lights.length; i2++) {
      RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, i2 * numOfCascades * 4 * 16, 0, numOfCascades * 4 * 16);
      for (let cascadePass = 0; cascadePass < numOfCascades; cascadePass++) {
        RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer);
        RendererContext.BeginRenderPass("ShadowPass", [], { target: shadowOutput, clear: cascadePass === 0 ? true : false }, true);
        const width = shadowOutput.width / 2;
        const height = shadowOutput.height / 2;
        let x = 0;
        let y = 0;
        if (cascadePass >= 2) x += width;
        if (cascadePass % 2 !== 0) y += height;
        RendererContext.SetViewport(x, y, width, height, 0, 1);
        let meshCount = 0;
        for (const renderableMesh of RenderCache.renderableMeshes) {
          if (renderableMesh.shader.params.topology === "line-list" /* Lines */) continue;
          if (renderableMesh.type === "Draw") {
            if (renderableMesh.mesh.enableShadows) {
              const uniform_offset = meshCount * 256;
              this.modelMatrices.dynamicOffset = uniform_offset;
              RendererContext.DrawGeometry(renderableMesh.geometry, this.drawShadowShader, 1);
            }
            ;
            meshCount++;
          } else if (renderableMesh.type === "DrawInstanced") {
            if (renderableMesh.instances === 0) continue;
            if (!renderableMesh.instancedMesh.enableShadows) continue;
            this.drawInstancedShadowShader.SetBuffer("modelMatrix", renderableMesh.instancedMesh.matricesBuffer);
            RendererContext.DrawGeometry(renderableMesh.geometry, this.drawInstancedShadowShader, renderableMesh.instances);
          }
        }
        RendererContext.EndRenderPass();
      }
      shadowOutput.SetActiveLayer(shadowOutput.GetActiveLayer() + 1);
    }
    shadowOutput.SetActiveLayer(0);
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
  needsUpdate = false;
  initialized = false;
  // constructor(inputGBufferAlbedo: string, inputGBufferNormal: string, inputGbufferERMO: string, inputGBufferDepth: string, inputShadowPassDepth: string, outputLightingPass: string) {
  constructor() {
    super({
      inputs: [
        PassParams.DebugSettings,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth,
        PassParams.ShadowPassDepth
      ],
      outputs: [PassParams.LightingPassOutput]
    });
    this.init();
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
        lights: { group: 0, binding: 6, type: "storage" },
        lightCount: { group: 0, binding: 7, type: "storage" },
        view: { group: 0, binding: 8, type: "storage" },
        shadowSamplerComp: { group: 0, binding: 9, type: "sampler-compare" },
        settings: { group: 0, binding: 10, type: "storage" }
      },
      colorOutputs: [{ format: Renderer.SwapChainFormat }]
    });
    this.sampler = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    this.shader.SetSampler("textureSampler", this.sampler);
    const shadowSamplerComp = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", compare: "less" });
    this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);
    this.quadGeometry = Geometry.Plane();
    this.lightsCountBuffer = Buffer3.Create(1 * 4, 0 /* STORAGE */);
    this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height);
    EventSystem.on(LightEvents.Updated, (component) => {
      this.needsUpdate = true;
    });
    this.initialized = true;
  }
  updateLightsBuffer() {
    const scene = Camera.mainCamera.gameObject.scene;
    const lights = [...scene.GetComponents(Light), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
    const lightBuffer = [];
    for (let i2 = 0; i2 < lights.length; i2++) {
      const light = lights[i2];
      const params1 = new Float32Array([light.intensity, light.range, 0, 0]);
      const params2 = new Float32Array(4);
      if (light instanceof DirectionalLight) {
        params2.set(light.direction.elements);
      } else if (light instanceof SpotLight) {
        params1.set([light.intensity, light.range, light.angle, 0]);
        params2.set(light.direction.elements);
      }
      let lightType = 0 /* SPOT_LIGHT */;
      if (light instanceof SpotLight) lightType = 0 /* SPOT_LIGHT */;
      else if (light instanceof DirectionalLight) lightType = 1 /* DIRECTIONAL_LIGHT */;
      else if (light instanceof PointLight) lightType = 2 /* POINT_LIGHT */;
      else if (light instanceof AreaLight) lightType = 3 /* AREA_LIGHT */;
      lightBuffer.push(
        light.transform.position.x,
        light.transform.position.y,
        light.transform.position.z,
        1,
        ...light.camera.projectionMatrix.elements,
        ...lightsCSMProjectionMatrix[i2].slice(0, 16),
        ...lightsCSMProjectionMatrix[i2].slice(16, 32),
        ...lightsCSMProjectionMatrix[i2].slice(32, 48),
        ...lightsCSMProjectionMatrix[i2].slice(48, 64),
        ...cascadeSplits.elements,
        ...light.camera.viewMatrix.elements,
        ...light.camera.viewMatrix.clone().invert().elements,
        light.color.r,
        light.color.g,
        light.color.b,
        lightType,
        ...params1,
        ...params2
      );
    }
    const lightsLength = Math.max(lights.length, 1);
    if (!this.lightsBuffer || this.lightsBuffer.size !== lightBuffer.length * 4) {
      this.lightsBuffer = Buffer3.Create(lightsLength * lightBuffer.length * 4, 0 /* STORAGE */);
      this.lightsCountBuffer = Buffer3.Create(1 * 4, 0 /* STORAGE */);
    }
    this.lightsBuffer.SetArray(new Float32Array(lightBuffer));
    this.lightsCountBuffer.SetArray(new Uint32Array([lights.length]));
    this.shader.SetBuffer("lights", this.lightsBuffer);
    this.shader.SetBuffer("lightCount", this.lightsCountBuffer);
    this.needsUpdate = false;
    console.log("Updating light buffer");
  }
  execute(resources) {
    if (!this.initialized) return;
    const camera = Camera.mainCamera;
    if (!this.lightsBuffer || !this.lightsCountBuffer || this.needsUpdate) {
      this.updateLightsBuffer();
    }
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    const inputShadowPassDepth = resources.getResource(PassParams.ShadowPassDepth);
    RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: true }], void 0, true);
    this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
    this.shader.SetTexture("normalTexture", inputGBufferNormal);
    this.shader.SetTexture("ermoTexture", inputGbufferERMO);
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);
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
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            return vec4(textureSampleLevel(texture, textureSampler, uv, 0));
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
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass("TextureViewer", [{ clear: false }], void 0, true);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
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
        assert(typeof data == "object");
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
    assert(typeof Module3["memoryInitializerPrefixURL"] == "undefined", "Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module3["pthreadMainPrefixURL"] == "undefined", "Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module3["cdInitializerPrefixURL"] == "undefined", "Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module3["filePackagePrefixURL"] == "undefined", "Module.filePackagePrefixURL option was removed, use Module.locateFile instead");
    assert(typeof Module3["read"] == "undefined", "Module.read option was removed (modify read_ in JS)");
    assert(typeof Module3["readAsync"] == "undefined", "Module.readAsync option was removed (modify readAsync in JS)");
    assert(typeof Module3["readBinary"] == "undefined", "Module.readBinary option was removed (modify readBinary in JS)");
    assert(typeof Module3["setWindowTitle"] == "undefined", "Module.setWindowTitle option was removed (modify setWindowTitle in JS)");
    assert(typeof Module3["TOTAL_MEMORY"] == "undefined", "Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY");
    legacyModuleProp("read", "read_");
    legacyModuleProp("readAsync", "readAsync");
    legacyModuleProp("readBinary", "readBinary");
    legacyModuleProp("setWindowTitle", "setWindowTitle");
    assert(!ENVIRONMENT_IS_WORKER, "worker environment detected but not enabled at build time.  Add 'worker' to `-sENVIRONMENT` to enable.");
    assert(!ENVIRONMENT_IS_NODE, "node environment detected but not enabled at build time.  Add 'node' to `-sENVIRONMENT` to enable.");
    assert(!ENVIRONMENT_IS_SHELL, "shell environment detected but not enabled at build time.  Add 'shell' to `-sENVIRONMENT` to enable.");
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
    function assert(condition, text) {
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
      assert(typeof maxBytesToWrite == "number", "stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!");
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
    if (Module3["TOTAL_STACK"]) assert(TOTAL_STACK === Module3["TOTAL_STACK"], "the stack size can no longer be determined at runtime");
    var INITIAL_MEMORY = Module3["INITIAL_MEMORY"] || 16777216;
    legacyModuleProp("INITIAL_MEMORY", "INITIAL_MEMORY");
    assert(INITIAL_MEMORY >= TOTAL_STACK, "INITIAL_MEMORY should be larger than TOTAL_STACK, was " + INITIAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
    assert(typeof Int32Array != "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype.subarray != void 0 && Int32Array.prototype.set != void 0, "JS engine does not provide full typed array support");
    assert(!Module3["wasmMemory"], "Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally");
    assert(INITIAL_MEMORY == 16777216, "Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically");
    var wasmTable;
    function writeStackCookie() {
      var max = _emscripten_stack_get_end();
      assert((max & 3) == 0);
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
      assert(!runtimeInitialized);
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
    assert(Math.imul, "This browser does not support Math.imul(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert(Math.fround, "This browser does not support Math.fround(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert(Math.clz32, "This browser does not support Math.clz32(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
    assert(Math.trunc, "This browser does not support Math.trunc(), build with LEGACY_VM_SUPPORT or POLYFILL_OLD_MATH_FUNCTIONS to add in a polyfill");
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
        assert(!runDependencyTracking[id]);
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
        assert(runDependencyTracking[id]);
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
        assert(runtimeInitialized, "native function `" + displayName + "` called before runtime initialization");
        if (!asm2[name]) {
          assert(asm2[name], "exported native function `" + displayName + "` not found");
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
        assert(wasmMemory, "memory not found in wasm exports");
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module3["asm"]["__indirect_function_table"];
        assert(wasmTable, "table not found in wasm exports");
        addOnInit(Module3["asm"]["__wasm_call_ctors"]);
        removeRunDependency("wasm-instantiate");
      }
      addRunDependency("wasm-instantiate");
      var trueModule = Module3;
      function receiveInstantiationResult(result) {
        assert(Module3 === trueModule, "the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?");
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
      assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
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
      assert(requestedSize > oldSize);
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
      assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
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
      assert(returnType !== "array", 'Return type should not be "array".');
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
        assert(!Module3["_main"], 'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]');
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
    return new Meshlet(new Float32Array(vertices_remapped.data), new Uint32Array(indices_remapped.data));
  }
  static meshopt_simplify(meshlet, target_count, target_error = 1) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
    const meshopt_SimplifyLockBorder = 1 << 0;
    const meshopt_SimplifySparse = 1 << 1;
    const meshopt_SimplifyErrorAbsolute = 1 << 2;
    const options = meshopt_SimplifyLockBorder | meshopt_SimplifySparse;
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
      meshlet: new Meshlet(meshlet.vertices, destination_resized)
    };
  }
  static meshopt_simplifyWithAttributes(meshlet, vertex_lock_array, target_count, target_error = 1) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
    const meshopt_SimplifyLockBorder = 1 << 0;
    const meshopt_SimplifySparse = 1 << 1;
    const meshopt_SimplifyErrorAbsolute = 1 << 2;
    const options = meshopt_SimplifySparse;
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
      meshlet: new Meshlet(meshlet.vertices, destination_resized)
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

// src/plugins/meshlets/passes/MeshletDebug.ts
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

// src/renderer/passes/PrepareGBuffers.ts
var PrepareGBuffers = class extends RenderPass {
  name = "PrepareGBuffers";
  gBufferAlbedoRT;
  gBufferNormalRT;
  gBufferERMORT;
  depthTexture;
  shadowOutput;
  shadowWidth = 4096;
  shadowHeight = 4096;
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
    this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.shadowOutput = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, 1);
    this.initialized = true;
  }
  execute(resources) {
    const colorTargets = [
      { target: this.gBufferAlbedoRT, clear: true },
      { target: this.gBufferNormalRT, clear: true },
      { target: this.gBufferERMORT, clear: true }
    ];
    RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, { target: this.depthTexture, clear: true }, true);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.depthTexture, this.depthTexture);
    resources.setResource(PassParams.GBufferDepth, this.depthTexture);
    resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
    resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
    resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);
    const settings = new Float32Array([
      +Debugger.isDebugDepthPassEnabled,
      Debugger.debugDepthMipLevel,
      Debugger.debugDepthExposure,
      +MeshletDebug.isFrustumCullingEnabled,
      +MeshletDebug.isBackFaceCullingEnabled,
      +MeshletDebug.isOcclusionCullingEnabled,
      +MeshletDebug.isSmallFeaturesCullingEnabled,
      MeshletDebug.staticLODValue,
      MeshletDebug.dynamicLODErrorThresholdValue,
      +MeshletDebug.isDynamicLODEnabled,
      RendererDebug.viewTypeValue,
      MeshletDebug.meshletsViewType,
      +RendererDebug.useHeightMapValue,
      Debugger.heightScale,
      Meshlet.max_triangles,
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
    const scene = Camera.mainCamera.gameObject.scene;
    const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
    if (lights.length === 0) {
      resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
      return;
    }
    if (lights.length !== this.shadowOutput.depth) {
      this.shadowOutput = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, lights.length);
    }
    RendererContext.BeginRenderPass(`PrepareGBuffers - Shadow clear`, [], { target: this.shadowOutput, clear: true }, true);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
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
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass("DebuggerTextureViewer", [{ clear: false }], void 0, true);
    RendererContext.SetViewport(Renderer.width - 500, 0, 200, 200);
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
  GBufferNormal: "GBufferNormal",
  GBufferERMO: "GBufferERMO",
  GBufferDepth: "GBufferDepth",
  ShadowPassDepth: "ShadowPassDepth",
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
  renderPasses = [];
  constructor(renderer) {
    this.renderer = renderer;
    console.warn("this sucks");
    this.renderGraph = new RenderGraph();
    this.beforeGBufferPasses = [
      new PrepareGBuffers()
      // new DeferredGBufferPass(),
    ];
    this.afterGBufferPasses = [
      new DeferredShadowMapPass()
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
    RenderCache.Reset();
    RendererDebug.SetTriangleCount(0);
    Renderer.BeginRenderFrame();
    this.renderGraph.execute();
    Renderer.EndRenderFrame();
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
    for (const [component, _] of this.toUpdate) component.Update();
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
    const distance = this._camera.transform.position.distanceTo(this.center);
    this.x -= deltaX * this.orbitSpeed;
    this.y -= deltaY * this.orbitSpeed;
    const rotation = new Quaternion().fromEuler(new Vector3(this.y, this.x, 0));
    const position = new Vector3(0, 0, distance).applyQuaternion(rotation).add(this.center);
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

// src/renderer/Material.ts
var Material = class {
  shader;
  async createShader() {
    throw Error("Not implemented");
  }
};
var PBRMaterial = class extends Material {
  id = Utils.UUID();
  initialParams;
  params;
  constructor(params) {
    super();
    this.initialParams = params;
    this.params = {
      albedoColor: params?.albedoColor ? params.albedoColor : new Color(1, 1, 1, 1),
      emissiveColor: params?.emissiveColor ? params.emissiveColor : new Color(0, 0, 0, 0),
      roughness: params?.roughness ? params.roughness : 0,
      metalness: params?.metalness ? params.metalness : 0,
      albedoMap: params?.albedoMap ? params.albedoMap : void 0,
      normalMap: params?.normalMap ? params.normalMap : void 0,
      heightMap: params?.heightMap ? params.heightMap : void 0,
      metalnessMap: params?.metalnessMap ? params.metalnessMap : void 0,
      emissiveMap: params?.emissiveMap ? params.emissiveMap : void 0,
      aoMap: params?.aoMap ? params.aoMap : void 0,
      unlit: params?.unlit ? params.unlit : false
    };
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
      }
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

// src/plugins/meshlets/metis-5.2.1/Metis.js
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
    var moduleOverrides = Object.assign({}, Module3);
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = (status, toThrow) => {
      throw toThrow;
    };
    var ENVIRONMENT_IS_WEB = true;
    var ENVIRONMENT_IS_WORKER = false;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module3["locateFile"]) {
        return Module3["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    var read_, readAsync, readBinary, setWindowTitle;
    if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
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
    }
    var out = Module3["print"] || console.log.bind(console);
    var err = Module3["printErr"] || console.warn.bind(console);
    Object.assign(Module3, moduleOverrides);
    moduleOverrides = null;
    if (Module3["arguments"]) arguments_ = Module3["arguments"];
    if (Module3["thisProgram"]) thisProgram = Module3["thisProgram"];
    if (Module3["quit"]) quit_ = Module3["quit"];
    var wasmBinary;
    if (Module3["wasmBinary"]) wasmBinary = Module3["wasmBinary"];
    var noExitRuntime = Module3["noExitRuntime"] || true;
    if (typeof WebAssembly != "object") {
      abort("no native wasm support detected");
    }
    var wasmMemory;
    var ABORT = false;
    var EXITSTATUS;
    function assert(condition, text) {
      if (!condition) {
        abort(text);
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
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    }
    function lengthBytesUTF8(str) {
      var len = 0;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var c = str.charCodeAt(i2);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i2;
        } else {
          len += 3;
        }
      }
      return len;
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
    var INITIAL_MEMORY = Module3["INITIAL_MEMORY"] || 16777216;
    var wasmTable;
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
      runtimeInitialized = true;
      if (!Module3["noFSInit"] && !FS.init.initialized) FS.init();
      FS.ignorePermissions = false;
      TTY.init();
      callRuntimeCallbacks(__ATINIT__);
    }
    function postRun() {
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
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function getUniqueRunDependency(id) {
      return id;
    }
    function addRunDependency(id) {
      runDependencies++;
      if (Module3["monitorRunDependencies"]) {
        Module3["monitorRunDependencies"](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module3["monitorRunDependencies"]) {
        Module3["monitorRunDependencies"](runDependencies);
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
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject(e);
      throw e;
    }
    var dataURIPrefix = "data:application/octet-stream;base64,";
    function isDataURI(filename) {
      return filename.startsWith(dataURIPrefix);
    }
    var wasmBinaryFile;
    if (Module3["locateFile"]) {
      wasmBinaryFile = "Metis.wasm";
      if (!isDataURI(wasmBinaryFile)) {
        wasmBinaryFile = locateFile(wasmBinaryFile);
      }
    } else {
      wasmBinaryFile = new URL("Metis.wasm", import.meta.url).toString();
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
      var info = { "a": asmLibraryArg };
      function receiveInstance(instance, module) {
        var exports2 = instance.exports;
        Module3["asm"] = exports2;
        wasmMemory = Module3["asm"]["x"];
        updateGlobalBufferAndViews(wasmMemory.buffer);
        wasmTable = Module3["asm"]["z"];
        addOnInit(Module3["asm"]["y"]);
        removeRunDependency("wasm-instantiate");
      }
      addRunDependency("wasm-instantiate");
      function receiveInstantiationResult(result) {
        receiveInstance(result["instance"]);
      }
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise().then(function(binary) {
          return WebAssembly.instantiate(binary, info);
        }).then(function(instance) {
          return instance;
        }).then(receiver, function(reason) {
          err("failed to asynchronously prepare wasm: " + reason);
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
    function writeArrayToMemory(array, buffer2) {
      HEAP8.set(array, buffer2);
    }
    function ___assert_fail(condition, filename, line, func) {
      abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function"]);
    }
    var wasmTableMirror = [];
    function getWasmTableEntry(funcPtr) {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        if (funcPtr >= wasmTableMirror.length) wasmTableMirror.length = funcPtr + 1;
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      return func;
    }
    function ___call_sighandler(fp, sig) {
      getWasmTableEntry(fp)(sig);
    }
    function setErrNo(value) {
      HEAP32[___errno_location() >> 2] = value;
      return value;
    }
    var PATH = { isAbs: (path) => path.charAt(0) === "/", splitPath: (filename) => {
      var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
      return splitPathRe.exec(filename).slice(1);
    }, normalizeArray: (parts, allowAboveRoot) => {
      var up = 0;
      for (var i2 = parts.length - 1; i2 >= 0; i2--) {
        var last = parts[i2];
        if (last === ".") {
          parts.splice(i2, 1);
        } else if (last === "..") {
          parts.splice(i2, 1);
          up++;
        } else if (up) {
          parts.splice(i2, 1);
          up--;
        }
      }
      if (allowAboveRoot) {
        for (; up; up--) {
          parts.unshift("..");
        }
      }
      return parts;
    }, normalize: (path) => {
      var isAbsolute = PATH.isAbs(path), trailingSlash = path.substr(-1) === "/";
      path = PATH.normalizeArray(path.split("/").filter((p) => !!p), !isAbsolute).join("/");
      if (!path && !isAbsolute) {
        path = ".";
      }
      if (path && trailingSlash) {
        path += "/";
      }
      return (isAbsolute ? "/" : "") + path;
    }, dirname: (path) => {
      var result = PATH.splitPath(path), root = result[0], dir = result[1];
      if (!root && !dir) {
        return ".";
      }
      if (dir) {
        dir = dir.substr(0, dir.length - 1);
      }
      return root + dir;
    }, basename: (path) => {
      if (path === "/") return "/";
      path = PATH.normalize(path);
      path = path.replace(/\/$/, "");
      var lastSlash = path.lastIndexOf("/");
      if (lastSlash === -1) return path;
      return path.substr(lastSlash + 1);
    }, join: function() {
      var paths = Array.prototype.slice.call(arguments);
      return PATH.normalize(paths.join("/"));
    }, join2: (l, r) => {
      return PATH.normalize(l + "/" + r);
    } };
    function getRandomDevice() {
      if (typeof crypto == "object" && typeof crypto["getRandomValues"] == "function") {
        var randomBuffer = new Uint8Array(1);
        return () => {
          crypto.getRandomValues(randomBuffer);
          return randomBuffer[0];
        };
      } else return () => abort("randomDevice");
    }
    var PATH_FS = { resolve: function() {
      var resolvedPath = "", resolvedAbsolute = false;
      for (var i2 = arguments.length - 1; i2 >= -1 && !resolvedAbsolute; i2--) {
        var path = i2 >= 0 ? arguments[i2] : FS.cwd();
        if (typeof path != "string") {
          throw new TypeError("Arguments to path.resolve must be strings");
        } else if (!path) {
          return "";
        }
        resolvedPath = path + "/" + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((p) => !!p), !resolvedAbsolute).join("/");
      return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
    }, relative: (from, to) => {
      from = PATH_FS.resolve(from).substr(1);
      to = PATH_FS.resolve(to).substr(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== "") break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== "") break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split("/"));
      var toParts = trim(to.split("/"));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i2 = 0; i2 < length; i2++) {
        if (fromParts[i2] !== toParts[i2]) {
          samePartsLength = i2;
          break;
        }
      }
      var outputParts = [];
      for (var i2 = samePartsLength; i2 < fromParts.length; i2++) {
        outputParts.push("..");
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join("/");
    } };
    function intArrayFromString(stringy, dontAddNull, length) {
      var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    }
    var TTY = { ttys: [], init: function() {
    }, shutdown: function() {
    }, register: function(dev, ops) {
      TTY.ttys[dev] = { input: [], output: [], ops };
      FS.registerDevice(dev, TTY.stream_ops);
    }, stream_ops: { open: function(stream) {
      var tty = TTY.ttys[stream.node.rdev];
      if (!tty) {
        throw new FS.ErrnoError(43);
      }
      stream.tty = tty;
      stream.seekable = false;
    }, close: function(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, fsync: function(stream) {
      stream.tty.ops.fsync(stream.tty);
    }, read: function(stream, buffer2, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.get_char) {
        throw new FS.ErrnoError(60);
      }
      var bytesRead = 0;
      for (var i2 = 0; i2 < length; i2++) {
        var result;
        try {
          result = stream.tty.ops.get_char(stream.tty);
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
        if (result === void 0 && bytesRead === 0) {
          throw new FS.ErrnoError(6);
        }
        if (result === null || result === void 0) break;
        bytesRead++;
        buffer2[offset + i2] = result;
      }
      if (bytesRead) {
        stream.node.timestamp = Date.now();
      }
      return bytesRead;
    }, write: function(stream, buffer2, offset, length, pos) {
      if (!stream.tty || !stream.tty.ops.put_char) {
        throw new FS.ErrnoError(60);
      }
      try {
        for (var i2 = 0; i2 < length; i2++) {
          stream.tty.ops.put_char(stream.tty, buffer2[offset + i2]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.timestamp = Date.now();
      }
      return i2;
    } }, default_tty_ops: { get_char: function(tty) {
      if (!tty.input.length) {
        var result = null;
        if (typeof window != "undefined" && typeof window.prompt == "function") {
          result = window.prompt("Input: ");
          if (result !== null) {
            result += "\n";
          }
        } else if (typeof readline == "function") {
          result = readline();
          if (result !== null) {
            result += "\n";
          }
        }
        if (!result) {
          return null;
        }
        tty.input = intArrayFromString(result, true);
      }
      return tty.input.shift();
    }, put_char: function(tty, val) {
      if (val === null || val === 10) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, fsync: function(tty) {
      if (tty.output && tty.output.length > 0) {
        out(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      }
    } }, default_tty1_ops: { put_char: function(tty, val) {
      if (val === null || val === 10) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      } else {
        if (val != 0) tty.output.push(val);
      }
    }, fsync: function(tty) {
      if (tty.output && tty.output.length > 0) {
        err(UTF8ArrayToString(tty.output, 0));
        tty.output = [];
      }
    } } };
    function mmapAlloc(size) {
      abort();
    }
    var MEMFS = { ops_table: null, mount: function(mount) {
      return MEMFS.createNode(null, "/", 16384 | 511, 0);
    }, createNode: function(parent, name, mode, dev) {
      if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
        throw new FS.ErrnoError(63);
      }
      if (!MEMFS.ops_table) {
        MEMFS.ops_table = { dir: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, lookup: MEMFS.node_ops.lookup, mknod: MEMFS.node_ops.mknod, rename: MEMFS.node_ops.rename, unlink: MEMFS.node_ops.unlink, rmdir: MEMFS.node_ops.rmdir, readdir: MEMFS.node_ops.readdir, symlink: MEMFS.node_ops.symlink }, stream: { llseek: MEMFS.stream_ops.llseek } }, file: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: { llseek: MEMFS.stream_ops.llseek, read: MEMFS.stream_ops.read, write: MEMFS.stream_ops.write, allocate: MEMFS.stream_ops.allocate, mmap: MEMFS.stream_ops.mmap, msync: MEMFS.stream_ops.msync } }, link: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr, readlink: MEMFS.node_ops.readlink }, stream: {} }, chrdev: { node: { getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr }, stream: FS.chrdev_stream_ops } };
      }
      var node = FS.createNode(parent, name, mode, dev);
      if (FS.isDir(node.mode)) {
        node.node_ops = MEMFS.ops_table.dir.node;
        node.stream_ops = MEMFS.ops_table.dir.stream;
        node.contents = {};
      } else if (FS.isFile(node.mode)) {
        node.node_ops = MEMFS.ops_table.file.node;
        node.stream_ops = MEMFS.ops_table.file.stream;
        node.usedBytes = 0;
        node.contents = null;
      } else if (FS.isLink(node.mode)) {
        node.node_ops = MEMFS.ops_table.link.node;
        node.stream_ops = MEMFS.ops_table.link.stream;
      } else if (FS.isChrdev(node.mode)) {
        node.node_ops = MEMFS.ops_table.chrdev.node;
        node.stream_ops = MEMFS.ops_table.chrdev.stream;
      }
      node.timestamp = Date.now();
      if (parent) {
        parent.contents[name] = node;
        parent.timestamp = node.timestamp;
      }
      return node;
    }, getFileDataAsTypedArray: function(node) {
      if (!node.contents) return new Uint8Array(0);
      if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
      return new Uint8Array(node.contents);
    }, expandFileStorage: function(node, newCapacity) {
      var prevCapacity = node.contents ? node.contents.length : 0;
      if (prevCapacity >= newCapacity) return;
      var CAPACITY_DOUBLING_MAX = 1024 * 1024;
      newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
      if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
      var oldContents = node.contents;
      node.contents = new Uint8Array(newCapacity);
      if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
    }, resizeFileStorage: function(node, newSize) {
      if (node.usedBytes == newSize) return;
      if (newSize == 0) {
        node.contents = null;
        node.usedBytes = 0;
      } else {
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize);
        if (oldContents) {
          node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
        }
        node.usedBytes = newSize;
      }
    }, node_ops: { getattr: function(node) {
      var attr = {};
      attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
      attr.ino = node.id;
      attr.mode = node.mode;
      attr.nlink = 1;
      attr.uid = 0;
      attr.gid = 0;
      attr.rdev = node.rdev;
      if (FS.isDir(node.mode)) {
        attr.size = 4096;
      } else if (FS.isFile(node.mode)) {
        attr.size = node.usedBytes;
      } else if (FS.isLink(node.mode)) {
        attr.size = node.link.length;
      } else {
        attr.size = 0;
      }
      attr.atime = new Date(node.timestamp);
      attr.mtime = new Date(node.timestamp);
      attr.ctime = new Date(node.timestamp);
      attr.blksize = 4096;
      attr.blocks = Math.ceil(attr.size / attr.blksize);
      return attr;
    }, setattr: function(node, attr) {
      if (attr.mode !== void 0) {
        node.mode = attr.mode;
      }
      if (attr.timestamp !== void 0) {
        node.timestamp = attr.timestamp;
      }
      if (attr.size !== void 0) {
        MEMFS.resizeFileStorage(node, attr.size);
      }
    }, lookup: function(parent, name) {
      throw FS.genericErrors[44];
    }, mknod: function(parent, name, mode, dev) {
      return MEMFS.createNode(parent, name, mode, dev);
    }, rename: function(old_node, new_dir, new_name) {
      if (FS.isDir(old_node.mode)) {
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
        }
        if (new_node) {
          for (var i2 in new_node.contents) {
            throw new FS.ErrnoError(55);
          }
        }
      }
      delete old_node.parent.contents[old_node.name];
      old_node.parent.timestamp = Date.now();
      old_node.name = new_name;
      new_dir.contents[new_name] = old_node;
      new_dir.timestamp = old_node.parent.timestamp;
      old_node.parent = new_dir;
    }, unlink: function(parent, name) {
      delete parent.contents[name];
      parent.timestamp = Date.now();
    }, rmdir: function(parent, name) {
      var node = FS.lookupNode(parent, name);
      for (var i2 in node.contents) {
        throw new FS.ErrnoError(55);
      }
      delete parent.contents[name];
      parent.timestamp = Date.now();
    }, readdir: function(node) {
      var entries = [".", ".."];
      for (var key in node.contents) {
        if (!node.contents.hasOwnProperty(key)) {
          continue;
        }
        entries.push(key);
      }
      return entries;
    }, symlink: function(parent, newname, oldpath) {
      var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
      node.link = oldpath;
      return node;
    }, readlink: function(node) {
      if (!FS.isLink(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      return node.link;
    } }, stream_ops: { read: function(stream, buffer2, offset, length, position) {
      var contents = stream.node.contents;
      if (position >= stream.node.usedBytes) return 0;
      var size = Math.min(stream.node.usedBytes - position, length);
      if (size > 8 && contents.subarray) {
        buffer2.set(contents.subarray(position, position + size), offset);
      } else {
        for (var i2 = 0; i2 < size; i2++) buffer2[offset + i2] = contents[position + i2];
      }
      return size;
    }, write: function(stream, buffer2, offset, length, position, canOwn) {
      if (buffer2.buffer === HEAP8.buffer) {
        canOwn = false;
      }
      if (!length) return 0;
      var node = stream.node;
      node.timestamp = Date.now();
      if (buffer2.subarray && (!node.contents || node.contents.subarray)) {
        if (canOwn) {
          node.contents = buffer2.subarray(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (node.usedBytes === 0 && position === 0) {
          node.contents = buffer2.slice(offset, offset + length);
          node.usedBytes = length;
          return length;
        } else if (position + length <= node.usedBytes) {
          node.contents.set(buffer2.subarray(offset, offset + length), position);
          return length;
        }
      }
      MEMFS.expandFileStorage(node, position + length);
      if (node.contents.subarray && buffer2.subarray) {
        node.contents.set(buffer2.subarray(offset, offset + length), position);
      } else {
        for (var i2 = 0; i2 < length; i2++) {
          node.contents[position + i2] = buffer2[offset + i2];
        }
      }
      node.usedBytes = Math.max(node.usedBytes, position + length);
      return length;
    }, llseek: function(stream, offset, whence) {
      var position = offset;
      if (whence === 1) {
        position += stream.position;
      } else if (whence === 2) {
        if (FS.isFile(stream.node.mode)) {
          position += stream.node.usedBytes;
        }
      }
      if (position < 0) {
        throw new FS.ErrnoError(28);
      }
      return position;
    }, allocate: function(stream, offset, length) {
      MEMFS.expandFileStorage(stream.node, offset + length);
      stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
    }, mmap: function(stream, length, position, prot, flags) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      var ptr;
      var allocated;
      var contents = stream.node.contents;
      if (!(flags & 2) && contents.buffer === buffer) {
        allocated = false;
        ptr = contents.byteOffset;
      } else {
        if (position > 0 || position + length < contents.length) {
          if (contents.subarray) {
            contents = contents.subarray(position, position + length);
          } else {
            contents = Array.prototype.slice.call(contents, position, position + length);
          }
        }
        allocated = true;
        ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        HEAP8.set(contents, ptr);
      }
      return { ptr, allocated };
    }, msync: function(stream, buffer2, offset, length, mmapFlags) {
      MEMFS.stream_ops.write(stream, buffer2, 0, length, offset, false);
      return 0;
    } } };
    function asyncLoad(url, onload, onerror, noRunDep) {
      var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
      readAsync(url, (arrayBuffer) => {
        assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
        onload(new Uint8Array(arrayBuffer));
        if (dep) removeRunDependency(dep);
      }, (event) => {
        if (onerror) {
          onerror();
        } else {
          throw 'Loading data file "' + url + '" failed.';
        }
      });
      if (dep) addRunDependency(dep);
    }
    var FS = { root: null, mounts: [], devices: {}, streams: [], nextInode: 1, nameTable: null, currentPath: "/", initialized: false, ignorePermissions: true, ErrnoError: null, genericErrors: {}, filesystems: null, syncFSRequests: 0, lookupPath: (path, opts = {}) => {
      path = PATH_FS.resolve(FS.cwd(), path);
      if (!path) return { path: "", node: null };
      var defaults = { follow_mount: true, recurse_count: 0 };
      opts = Object.assign(defaults, opts);
      if (opts.recurse_count > 8) {
        throw new FS.ErrnoError(32);
      }
      var parts = PATH.normalizeArray(path.split("/").filter((p) => !!p), false);
      var current = FS.root;
      var current_path = "/";
      for (var i2 = 0; i2 < parts.length; i2++) {
        var islast = i2 === parts.length - 1;
        if (islast && opts.parent) {
          break;
        }
        current = FS.lookupNode(current, parts[i2]);
        current_path = PATH.join2(current_path, parts[i2]);
        if (FS.isMountpoint(current)) {
          if (!islast || islast && opts.follow_mount) {
            current = current.mounted.root;
          }
        }
        if (!islast || opts.follow) {
          var count = 0;
          while (FS.isLink(current.mode)) {
            var link = FS.readlink(current_path);
            current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
            var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count + 1 });
            current = lookup.node;
            if (count++ > 40) {
              throw new FS.ErrnoError(32);
            }
          }
        }
      }
      return { path: current_path, node: current };
    }, getPath: (node) => {
      var path;
      while (true) {
        if (FS.isRoot(node)) {
          var mount = node.mount.mountpoint;
          if (!path) return mount;
          return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
        }
        path = path ? node.name + "/" + path : node.name;
        node = node.parent;
      }
    }, hashName: (parentid, name) => {
      var hash = 0;
      for (var i2 = 0; i2 < name.length; i2++) {
        hash = (hash << 5) - hash + name.charCodeAt(i2) | 0;
      }
      return (parentid + hash >>> 0) % FS.nameTable.length;
    }, hashAddNode: (node) => {
      var hash = FS.hashName(node.parent.id, node.name);
      node.name_next = FS.nameTable[hash];
      FS.nameTable[hash] = node;
    }, hashRemoveNode: (node) => {
      var hash = FS.hashName(node.parent.id, node.name);
      if (FS.nameTable[hash] === node) {
        FS.nameTable[hash] = node.name_next;
      } else {
        var current = FS.nameTable[hash];
        while (current) {
          if (current.name_next === node) {
            current.name_next = node.name_next;
            break;
          }
          current = current.name_next;
        }
      }
    }, lookupNode: (parent, name) => {
      var errCode = FS.mayLookup(parent);
      if (errCode) {
        throw new FS.ErrnoError(errCode, parent);
      }
      var hash = FS.hashName(parent.id, name);
      for (var node = FS.nameTable[hash]; node; node = node.name_next) {
        var nodeName = node.name;
        if (node.parent.id === parent.id && nodeName === name) {
          return node;
        }
      }
      return FS.lookup(parent, name);
    }, createNode: (parent, name, mode, rdev) => {
      var node = new FS.FSNode(parent, name, mode, rdev);
      FS.hashAddNode(node);
      return node;
    }, destroyNode: (node) => {
      FS.hashRemoveNode(node);
    }, isRoot: (node) => {
      return node === node.parent;
    }, isMountpoint: (node) => {
      return !!node.mounted;
    }, isFile: (mode) => {
      return (mode & 61440) === 32768;
    }, isDir: (mode) => {
      return (mode & 61440) === 16384;
    }, isLink: (mode) => {
      return (mode & 61440) === 40960;
    }, isChrdev: (mode) => {
      return (mode & 61440) === 8192;
    }, isBlkdev: (mode) => {
      return (mode & 61440) === 24576;
    }, isFIFO: (mode) => {
      return (mode & 61440) === 4096;
    }, isSocket: (mode) => {
      return (mode & 49152) === 49152;
    }, flagModes: { "r": 0, "r+": 2, "w": 577, "w+": 578, "a": 1089, "a+": 1090 }, modeStringToFlags: (str) => {
      var flags = FS.flagModes[str];
      if (typeof flags == "undefined") {
        throw new Error("Unknown file open mode: " + str);
      }
      return flags;
    }, flagsToPermissionString: (flag) => {
      var perms = ["r", "w", "rw"][flag & 3];
      if (flag & 512) {
        perms += "w";
      }
      return perms;
    }, nodePermissions: (node, perms) => {
      if (FS.ignorePermissions) {
        return 0;
      }
      if (perms.includes("r") && !(node.mode & 292)) {
        return 2;
      } else if (perms.includes("w") && !(node.mode & 146)) {
        return 2;
      } else if (perms.includes("x") && !(node.mode & 73)) {
        return 2;
      }
      return 0;
    }, mayLookup: (dir) => {
      var errCode = FS.nodePermissions(dir, "x");
      if (errCode) return errCode;
      if (!dir.node_ops.lookup) return 2;
      return 0;
    }, mayCreate: (dir, name) => {
      try {
        var node = FS.lookupNode(dir, name);
        return 20;
      } catch (e) {
      }
      return FS.nodePermissions(dir, "wx");
    }, mayDelete: (dir, name, isdir) => {
      var node;
      try {
        node = FS.lookupNode(dir, name);
      } catch (e) {
        return e.errno;
      }
      var errCode = FS.nodePermissions(dir, "wx");
      if (errCode) {
        return errCode;
      }
      if (isdir) {
        if (!FS.isDir(node.mode)) {
          return 54;
        }
        if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
          return 10;
        }
      } else {
        if (FS.isDir(node.mode)) {
          return 31;
        }
      }
      return 0;
    }, mayOpen: (node, flags) => {
      if (!node) {
        return 44;
      }
      if (FS.isLink(node.mode)) {
        return 32;
      } else if (FS.isDir(node.mode)) {
        if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
          return 31;
        }
      }
      return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
    }, MAX_OPEN_FDS: 4096, nextfd: (fd_start = 0, fd_end = FS.MAX_OPEN_FDS) => {
      for (var fd = fd_start; fd <= fd_end; fd++) {
        if (!FS.streams[fd]) {
          return fd;
        }
      }
      throw new FS.ErrnoError(33);
    }, getStream: (fd) => FS.streams[fd], createStream: (stream, fd_start, fd_end) => {
      if (!FS.FSStream) {
        FS.FSStream = function() {
          this.shared = {};
        };
        FS.FSStream.prototype = {};
        Object.defineProperties(FS.FSStream.prototype, { object: { get: function() {
          return this.node;
        }, set: function(val) {
          this.node = val;
        } }, isRead: { get: function() {
          return (this.flags & 2097155) !== 1;
        } }, isWrite: { get: function() {
          return (this.flags & 2097155) !== 0;
        } }, isAppend: { get: function() {
          return this.flags & 1024;
        } }, flags: { get: function() {
          return this.shared.flags;
        }, set: function(val) {
          this.shared.flags = val;
        } }, position: { get: function() {
          return this.shared.position;
        }, set: function(val) {
          this.shared.position = val;
        } } });
      }
      stream = Object.assign(new FS.FSStream(), stream);
      var fd = FS.nextfd(fd_start, fd_end);
      stream.fd = fd;
      FS.streams[fd] = stream;
      return stream;
    }, closeStream: (fd) => {
      FS.streams[fd] = null;
    }, chrdev_stream_ops: { open: (stream) => {
      var device2 = FS.getDevice(stream.node.rdev);
      stream.stream_ops = device2.stream_ops;
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
    }, llseek: () => {
      throw new FS.ErrnoError(70);
    } }, major: (dev) => dev >> 8, minor: (dev) => dev & 255, makedev: (ma, mi) => ma << 8 | mi, registerDevice: (dev, ops) => {
      FS.devices[dev] = { stream_ops: ops };
    }, getDevice: (dev) => FS.devices[dev], getMounts: (mount) => {
      var mounts = [];
      var check = [mount];
      while (check.length) {
        var m = check.pop();
        mounts.push(m);
        check.push.apply(check, m.mounts);
      }
      return mounts;
    }, syncfs: (populate, callback) => {
      if (typeof populate == "function") {
        callback = populate;
        populate = false;
      }
      FS.syncFSRequests++;
      if (FS.syncFSRequests > 1) {
        err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work");
      }
      var mounts = FS.getMounts(FS.root.mount);
      var completed = 0;
      function doCallback(errCode) {
        FS.syncFSRequests--;
        return callback(errCode);
      }
      function done(errCode) {
        if (errCode) {
          if (!done.errored) {
            done.errored = true;
            return doCallback(errCode);
          }
          return;
        }
        if (++completed >= mounts.length) {
          doCallback(null);
        }
      }
      mounts.forEach((mount) => {
        if (!mount.type.syncfs) {
          return done(null);
        }
        mount.type.syncfs(mount, populate, done);
      });
    }, mount: (type, opts, mountpoint) => {
      var root = mountpoint === "/";
      var pseudo = !mountpoint;
      var node;
      if (root && FS.root) {
        throw new FS.ErrnoError(10);
      } else if (!root && !pseudo) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
        mountpoint = lookup.path;
        node = lookup.node;
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        if (!FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
      }
      var mount = { type, opts, mountpoint, mounts: [] };
      var mountRoot = type.mount(mount);
      mountRoot.mount = mount;
      mount.root = mountRoot;
      if (root) {
        FS.root = mountRoot;
      } else if (node) {
        node.mounted = mount;
        if (node.mount) {
          node.mount.mounts.push(mount);
        }
      }
      return mountRoot;
    }, unmount: (mountpoint) => {
      var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
      if (!FS.isMountpoint(lookup.node)) {
        throw new FS.ErrnoError(28);
      }
      var node = lookup.node;
      var mount = node.mounted;
      var mounts = FS.getMounts(mount);
      Object.keys(FS.nameTable).forEach((hash) => {
        var current = FS.nameTable[hash];
        while (current) {
          var next = current.name_next;
          if (mounts.includes(current.mount)) {
            FS.destroyNode(current);
          }
          current = next;
        }
      });
      node.mounted = null;
      var idx = node.mount.mounts.indexOf(mount);
      node.mount.mounts.splice(idx, 1);
    }, lookup: (parent, name) => {
      return parent.node_ops.lookup(parent, name);
    }, mknod: (path, mode, dev) => {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      if (!name || name === "." || name === "..") {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.mayCreate(parent, name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.mknod) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.mknod(parent, name, mode, dev);
    }, create: (path, mode) => {
      mode = mode !== void 0 ? mode : 438;
      mode &= 4095;
      mode |= 32768;
      return FS.mknod(path, mode, 0);
    }, mkdir: (path, mode) => {
      mode = mode !== void 0 ? mode : 511;
      mode &= 511 | 512;
      mode |= 16384;
      return FS.mknod(path, mode, 0);
    }, mkdirTree: (path, mode) => {
      var dirs = path.split("/");
      var d = "";
      for (var i2 = 0; i2 < dirs.length; ++i2) {
        if (!dirs[i2]) continue;
        d += "/" + dirs[i2];
        try {
          FS.mkdir(d, mode);
        } catch (e) {
          if (e.errno != 20) throw e;
        }
      }
    }, mkdev: (path, mode, dev) => {
      if (typeof dev == "undefined") {
        dev = mode;
        mode = 438;
      }
      mode |= 8192;
      return FS.mknod(path, mode, dev);
    }, symlink: (oldpath, newpath) => {
      if (!PATH_FS.resolve(oldpath)) {
        throw new FS.ErrnoError(44);
      }
      var lookup = FS.lookupPath(newpath, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var newname = PATH.basename(newpath);
      var errCode = FS.mayCreate(parent, newname);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.symlink) {
        throw new FS.ErrnoError(63);
      }
      return parent.node_ops.symlink(parent, newname, oldpath);
    }, rename: (old_path, new_path) => {
      var old_dirname = PATH.dirname(old_path);
      var new_dirname = PATH.dirname(new_path);
      var old_name = PATH.basename(old_path);
      var new_name = PATH.basename(new_path);
      var lookup, old_dir, new_dir;
      lookup = FS.lookupPath(old_path, { parent: true });
      old_dir = lookup.node;
      lookup = FS.lookupPath(new_path, { parent: true });
      new_dir = lookup.node;
      if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
      if (old_dir.mount !== new_dir.mount) {
        throw new FS.ErrnoError(75);
      }
      var old_node = FS.lookupNode(old_dir, old_name);
      var relative = PATH_FS.relative(old_path, new_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(28);
      }
      relative = PATH_FS.relative(new_path, old_dirname);
      if (relative.charAt(0) !== ".") {
        throw new FS.ErrnoError(55);
      }
      var new_node;
      try {
        new_node = FS.lookupNode(new_dir, new_name);
      } catch (e) {
      }
      if (old_node === new_node) {
        return;
      }
      var isdir = FS.isDir(old_node.mode);
      var errCode = FS.mayDelete(old_dir, old_name, isdir);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!old_dir.node_ops.rename) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
        throw new FS.ErrnoError(10);
      }
      if (new_dir !== old_dir) {
        errCode = FS.nodePermissions(old_dir, "w");
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      FS.hashRemoveNode(old_node);
      try {
        old_dir.node_ops.rename(old_node, new_dir, new_name);
      } catch (e) {
        throw e;
      } finally {
        FS.hashAddNode(old_node);
      }
    }, rmdir: (path) => {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, true);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.rmdir) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.rmdir(parent, name);
      FS.destroyNode(node);
    }, readdir: (path) => {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      if (!node.node_ops.readdir) {
        throw new FS.ErrnoError(54);
      }
      return node.node_ops.readdir(node);
    }, unlink: (path) => {
      var lookup = FS.lookupPath(path, { parent: true });
      var parent = lookup.node;
      if (!parent) {
        throw new FS.ErrnoError(44);
      }
      var name = PATH.basename(path);
      var node = FS.lookupNode(parent, name);
      var errCode = FS.mayDelete(parent, name, false);
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      if (!parent.node_ops.unlink) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isMountpoint(node)) {
        throw new FS.ErrnoError(10);
      }
      parent.node_ops.unlink(parent, name);
      FS.destroyNode(node);
    }, readlink: (path) => {
      var lookup = FS.lookupPath(path);
      var link = lookup.node;
      if (!link) {
        throw new FS.ErrnoError(44);
      }
      if (!link.node_ops.readlink) {
        throw new FS.ErrnoError(28);
      }
      return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
    }, stat: (path, dontFollow) => {
      var lookup = FS.lookupPath(path, { follow: !dontFollow });
      var node = lookup.node;
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (!node.node_ops.getattr) {
        throw new FS.ErrnoError(63);
      }
      return node.node_ops.getattr(node);
    }, lstat: (path) => {
      return FS.stat(path, true);
    }, chmod: (path, mode, dontFollow) => {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, { mode: mode & 4095 | node.mode & ~4095, timestamp: Date.now() });
    }, lchmod: (path, mode) => {
      FS.chmod(path, mode, true);
    }, fchmod: (fd, mode) => {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      FS.chmod(stream.node, mode);
    }, chown: (path, uid, gid, dontFollow) => {
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      node.node_ops.setattr(node, { timestamp: Date.now() });
    }, lchown: (path, uid, gid) => {
      FS.chown(path, uid, gid, true);
    }, fchown: (fd, uid, gid) => {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      FS.chown(stream.node, uid, gid);
    }, truncate: (path, len) => {
      if (len < 0) {
        throw new FS.ErrnoError(28);
      }
      var node;
      if (typeof path == "string") {
        var lookup = FS.lookupPath(path, { follow: true });
        node = lookup.node;
      } else {
        node = path;
      }
      if (!node.node_ops.setattr) {
        throw new FS.ErrnoError(63);
      }
      if (FS.isDir(node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!FS.isFile(node.mode)) {
        throw new FS.ErrnoError(28);
      }
      var errCode = FS.nodePermissions(node, "w");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      node.node_ops.setattr(node, { size: len, timestamp: Date.now() });
    }, ftruncate: (fd, len) => {
      var stream = FS.getStream(fd);
      if (!stream) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(28);
      }
      FS.truncate(stream.node, len);
    }, utime: (path, atime, mtime) => {
      var lookup = FS.lookupPath(path, { follow: true });
      var node = lookup.node;
      node.node_ops.setattr(node, { timestamp: Math.max(atime, mtime) });
    }, open: (path, flags, mode) => {
      if (path === "") {
        throw new FS.ErrnoError(44);
      }
      flags = typeof flags == "string" ? FS.modeStringToFlags(flags) : flags;
      mode = typeof mode == "undefined" ? 438 : mode;
      if (flags & 64) {
        mode = mode & 4095 | 32768;
      } else {
        mode = 0;
      }
      var node;
      if (typeof path == "object") {
        node = path;
      } else {
        path = PATH.normalize(path);
        try {
          var lookup = FS.lookupPath(path, { follow: !(flags & 131072) });
          node = lookup.node;
        } catch (e) {
        }
      }
      var created = false;
      if (flags & 64) {
        if (node) {
          if (flags & 128) {
            throw new FS.ErrnoError(20);
          }
        } else {
          node = FS.mknod(path, mode, 0);
          created = true;
        }
      }
      if (!node) {
        throw new FS.ErrnoError(44);
      }
      if (FS.isChrdev(node.mode)) {
        flags &= ~512;
      }
      if (flags & 65536 && !FS.isDir(node.mode)) {
        throw new FS.ErrnoError(54);
      }
      if (!created) {
        var errCode = FS.mayOpen(node, flags);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
      }
      if (flags & 512 && !created) {
        FS.truncate(node, 0);
      }
      flags &= ~(128 | 512 | 131072);
      var stream = FS.createStream({ node, path: FS.getPath(node), flags, seekable: true, position: 0, stream_ops: node.stream_ops, ungotten: [], error: false });
      if (stream.stream_ops.open) {
        stream.stream_ops.open(stream);
      }
      if (Module3["logReadFiles"] && !(flags & 1)) {
        if (!FS.readFiles) FS.readFiles = {};
        if (!(path in FS.readFiles)) {
          FS.readFiles[path] = 1;
        }
      }
      return stream;
    }, close: (stream) => {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (stream.getdents) stream.getdents = null;
      try {
        if (stream.stream_ops.close) {
          stream.stream_ops.close(stream);
        }
      } catch (e) {
        throw e;
      } finally {
        FS.closeStream(stream.fd);
      }
      stream.fd = null;
    }, isClosed: (stream) => {
      return stream.fd === null;
    }, llseek: (stream, offset, whence) => {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (!stream.seekable || !stream.stream_ops.llseek) {
        throw new FS.ErrnoError(70);
      }
      if (whence != 0 && whence != 1 && whence != 2) {
        throw new FS.ErrnoError(28);
      }
      stream.position = stream.stream_ops.llseek(stream, offset, whence);
      stream.ungotten = [];
      return stream.position;
    }, read: (stream, buffer2, offset, length, position) => {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.read) {
        throw new FS.ErrnoError(28);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesRead = stream.stream_ops.read(stream, buffer2, offset, length, position);
      if (!seeking) stream.position += bytesRead;
      return bytesRead;
    }, write: (stream, buffer2, offset, length, position, canOwn) => {
      if (length < 0 || position < 0) {
        throw new FS.ErrnoError(28);
      }
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(31);
      }
      if (!stream.stream_ops.write) {
        throw new FS.ErrnoError(28);
      }
      if (stream.seekable && stream.flags & 1024) {
        FS.llseek(stream, 0, 2);
      }
      var seeking = typeof position != "undefined";
      if (!seeking) {
        position = stream.position;
      } else if (!stream.seekable) {
        throw new FS.ErrnoError(70);
      }
      var bytesWritten = stream.stream_ops.write(stream, buffer2, offset, length, position, canOwn);
      if (!seeking) stream.position += bytesWritten;
      return bytesWritten;
    }, allocate: (stream, offset, length) => {
      if (FS.isClosed(stream)) {
        throw new FS.ErrnoError(8);
      }
      if (offset < 0 || length <= 0) {
        throw new FS.ErrnoError(28);
      }
      if ((stream.flags & 2097155) === 0) {
        throw new FS.ErrnoError(8);
      }
      if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (!stream.stream_ops.allocate) {
        throw new FS.ErrnoError(138);
      }
      stream.stream_ops.allocate(stream, offset, length);
    }, mmap: (stream, length, position, prot, flags) => {
      if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
        throw new FS.ErrnoError(2);
      }
      if ((stream.flags & 2097155) === 1) {
        throw new FS.ErrnoError(2);
      }
      if (!stream.stream_ops.mmap) {
        throw new FS.ErrnoError(43);
      }
      return stream.stream_ops.mmap(stream, length, position, prot, flags);
    }, msync: (stream, buffer2, offset, length, mmapFlags) => {
      if (!stream.stream_ops.msync) {
        return 0;
      }
      return stream.stream_ops.msync(stream, buffer2, offset, length, mmapFlags);
    }, munmap: (stream) => 0, ioctl: (stream, cmd, arg) => {
      if (!stream.stream_ops.ioctl) {
        throw new FS.ErrnoError(59);
      }
      return stream.stream_ops.ioctl(stream, cmd, arg);
    }, readFile: (path, opts = {}) => {
      opts.flags = opts.flags || 0;
      opts.encoding = opts.encoding || "binary";
      if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
        throw new Error('Invalid encoding type "' + opts.encoding + '"');
      }
      var ret;
      var stream = FS.open(path, opts.flags);
      var stat = FS.stat(path);
      var length = stat.size;
      var buf = new Uint8Array(length);
      FS.read(stream, buf, 0, length, 0);
      if (opts.encoding === "utf8") {
        ret = UTF8ArrayToString(buf, 0);
      } else if (opts.encoding === "binary") {
        ret = buf;
      }
      FS.close(stream);
      return ret;
    }, writeFile: (path, data, opts = {}) => {
      opts.flags = opts.flags || 577;
      var stream = FS.open(path, opts.flags, opts.mode);
      if (typeof data == "string") {
        var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
        var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
        FS.write(stream, buf, 0, actualNumBytes, void 0, opts.canOwn);
      } else if (ArrayBuffer.isView(data)) {
        FS.write(stream, data, 0, data.byteLength, void 0, opts.canOwn);
      } else {
        throw new Error("Unsupported data type");
      }
      FS.close(stream);
    }, cwd: () => FS.currentPath, chdir: (path) => {
      var lookup = FS.lookupPath(path, { follow: true });
      if (lookup.node === null) {
        throw new FS.ErrnoError(44);
      }
      if (!FS.isDir(lookup.node.mode)) {
        throw new FS.ErrnoError(54);
      }
      var errCode = FS.nodePermissions(lookup.node, "x");
      if (errCode) {
        throw new FS.ErrnoError(errCode);
      }
      FS.currentPath = lookup.path;
    }, createDefaultDirectories: () => {
      FS.mkdir("/tmp");
      FS.mkdir("/home");
      FS.mkdir("/home/web_user");
    }, createDefaultDevices: () => {
      FS.mkdir("/dev");
      FS.registerDevice(FS.makedev(1, 3), { read: () => 0, write: (stream, buffer2, offset, length, pos) => length });
      FS.mkdev("/dev/null", FS.makedev(1, 3));
      TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
      TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
      FS.mkdev("/dev/tty", FS.makedev(5, 0));
      FS.mkdev("/dev/tty1", FS.makedev(6, 0));
      var random_device = getRandomDevice();
      FS.createDevice("/dev", "random", random_device);
      FS.createDevice("/dev", "urandom", random_device);
      FS.mkdir("/dev/shm");
      FS.mkdir("/dev/shm/tmp");
    }, createSpecialDirectories: () => {
      FS.mkdir("/proc");
      var proc_self = FS.mkdir("/proc/self");
      FS.mkdir("/proc/self/fd");
      FS.mount({ mount: () => {
        var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
        node.node_ops = { lookup: (parent, name) => {
          var fd = +name;
          var stream = FS.getStream(fd);
          if (!stream) throw new FS.ErrnoError(8);
          var ret = { parent: null, mount: { mountpoint: "fake" }, node_ops: { readlink: () => stream.path } };
          ret.parent = ret;
          return ret;
        } };
        return node;
      } }, {}, "/proc/self/fd");
    }, createStandardStreams: () => {
      if (Module3["stdin"]) {
        FS.createDevice("/dev", "stdin", Module3["stdin"]);
      } else {
        FS.symlink("/dev/tty", "/dev/stdin");
      }
      if (Module3["stdout"]) {
        FS.createDevice("/dev", "stdout", null, Module3["stdout"]);
      } else {
        FS.symlink("/dev/tty", "/dev/stdout");
      }
      if (Module3["stderr"]) {
        FS.createDevice("/dev", "stderr", null, Module3["stderr"]);
      } else {
        FS.symlink("/dev/tty1", "/dev/stderr");
      }
      var stdin = FS.open("/dev/stdin", 0);
      var stdout = FS.open("/dev/stdout", 1);
      var stderr = FS.open("/dev/stderr", 1);
    }, ensureErrnoError: () => {
      if (FS.ErrnoError) return;
      FS.ErrnoError = function ErrnoError(errno, node) {
        this.node = node;
        this.setErrno = function(errno2) {
          this.errno = errno2;
        };
        this.setErrno(errno);
        this.message = "FS error";
      };
      FS.ErrnoError.prototype = new Error();
      FS.ErrnoError.prototype.constructor = FS.ErrnoError;
      [44].forEach((code) => {
        FS.genericErrors[code] = new FS.ErrnoError(code);
        FS.genericErrors[code].stack = "<generic error, no stack>";
      });
    }, staticInit: () => {
      FS.ensureErrnoError();
      FS.nameTable = new Array(4096);
      FS.mount(MEMFS, {}, "/");
      FS.createDefaultDirectories();
      FS.createDefaultDevices();
      FS.createSpecialDirectories();
      FS.filesystems = { "MEMFS": MEMFS };
    }, init: (input, output, error) => {
      FS.init.initialized = true;
      FS.ensureErrnoError();
      Module3["stdin"] = input || Module3["stdin"];
      Module3["stdout"] = output || Module3["stdout"];
      Module3["stderr"] = error || Module3["stderr"];
      FS.createStandardStreams();
    }, quit: () => {
      FS.init.initialized = false;
      for (var i2 = 0; i2 < FS.streams.length; i2++) {
        var stream = FS.streams[i2];
        if (!stream) {
          continue;
        }
        FS.close(stream);
      }
    }, getMode: (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    }, findObject: (path, dontResolveLastLink) => {
      var ret = FS.analyzePath(path, dontResolveLastLink);
      if (!ret.exists) {
        return null;
      }
      return ret.object;
    }, analyzePath: (path, dontResolveLastLink) => {
      try {
        var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        path = lookup.path;
      } catch (e) {
      }
      var ret = { isRoot: false, exists: false, error: 0, name: null, path: null, object: null, parentExists: false, parentPath: null, parentObject: null };
      try {
        var lookup = FS.lookupPath(path, { parent: true });
        ret.parentExists = true;
        ret.parentPath = lookup.path;
        ret.parentObject = lookup.node;
        ret.name = PATH.basename(path);
        lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
        ret.exists = true;
        ret.path = lookup.path;
        ret.object = lookup.node;
        ret.name = lookup.node.name;
        ret.isRoot = lookup.path === "/";
      } catch (e) {
        ret.error = e.errno;
      }
      return ret;
    }, createPath: (parent, path, canRead, canWrite) => {
      parent = typeof parent == "string" ? parent : FS.getPath(parent);
      var parts = path.split("/").reverse();
      while (parts.length) {
        var part = parts.pop();
        if (!part) continue;
        var current = PATH.join2(parent, part);
        try {
          FS.mkdir(current);
        } catch (e) {
        }
        parent = current;
      }
      return current;
    }, createFile: (parent, name, properties, canRead, canWrite) => {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(canRead, canWrite);
      return FS.create(path, mode);
    }, createDataFile: (parent, name, data, canRead, canWrite, canOwn) => {
      var path = name;
      if (parent) {
        parent = typeof parent == "string" ? parent : FS.getPath(parent);
        path = name ? PATH.join2(parent, name) : parent;
      }
      var mode = FS.getMode(canRead, canWrite);
      var node = FS.create(path, mode);
      if (data) {
        if (typeof data == "string") {
          var arr = new Array(data.length);
          for (var i2 = 0, len = data.length; i2 < len; ++i2) arr[i2] = data.charCodeAt(i2);
          data = arr;
        }
        FS.chmod(node, mode | 146);
        var stream = FS.open(node, 577);
        FS.write(stream, data, 0, data.length, 0, canOwn);
        FS.close(stream);
        FS.chmod(node, mode);
      }
      return node;
    }, createDevice: (parent, name, input, output) => {
      var path = PATH.join2(typeof parent == "string" ? parent : FS.getPath(parent), name);
      var mode = FS.getMode(!!input, !!output);
      if (!FS.createDevice.major) FS.createDevice.major = 64;
      var dev = FS.makedev(FS.createDevice.major++, 0);
      FS.registerDevice(dev, { open: (stream) => {
        stream.seekable = false;
      }, close: (stream) => {
        if (output && output.buffer && output.buffer.length) {
          output(10);
        }
      }, read: (stream, buffer2, offset, length, pos) => {
        var bytesRead = 0;
        for (var i2 = 0; i2 < length; i2++) {
          var result;
          try {
            result = input();
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (result === void 0 && bytesRead === 0) {
            throw new FS.ErrnoError(6);
          }
          if (result === null || result === void 0) break;
          bytesRead++;
          buffer2[offset + i2] = result;
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now();
        }
        return bytesRead;
      }, write: (stream, buffer2, offset, length, pos) => {
        for (var i2 = 0; i2 < length; i2++) {
          try {
            output(buffer2[offset + i2]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.timestamp = Date.now();
        }
        return i2;
      } });
      return FS.mkdev(path, mode, dev);
    }, forceLoadFile: (obj) => {
      if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
      if (typeof XMLHttpRequest != "undefined") {
        throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
      } else if (read_) {
        try {
          obj.contents = intArrayFromString(read_(obj.url), true);
          obj.usedBytes = obj.contents.length;
        } catch (e) {
          throw new FS.ErrnoError(29);
        }
      } else {
        throw new Error("Cannot load without read() or XMLHttpRequest.");
      }
    }, createLazyFile: (parent, name, url, canRead, canWrite) => {
      function LazyUint8Array() {
        this.lengthKnown = false;
        this.chunks = [];
      }
      LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
        if (idx > this.length - 1 || idx < 0) {
          return void 0;
        }
        var chunkOffset = idx % this.chunkSize;
        var chunkNum = idx / this.chunkSize | 0;
        return this.getter(chunkNum)[chunkOffset];
      };
      LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
        this.getter = getter;
      };
      LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
        var xhr = new XMLHttpRequest();
        xhr.open("HEAD", url, false);
        xhr.send(null);
        if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
        var datalength = Number(xhr.getResponseHeader("Content-length"));
        var header;
        var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
        var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
        var chunkSize = 1024 * 1024;
        if (!hasByteServing) chunkSize = datalength;
        var doXHR = (from, to) => {
          if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
          if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
          var xhr2 = new XMLHttpRequest();
          xhr2.open("GET", url, false);
          if (datalength !== chunkSize) xhr2.setRequestHeader("Range", "bytes=" + from + "-" + to);
          xhr2.responseType = "arraybuffer";
          if (xhr2.overrideMimeType) {
            xhr2.overrideMimeType("text/plain; charset=x-user-defined");
          }
          xhr2.send(null);
          if (!(xhr2.status >= 200 && xhr2.status < 300 || xhr2.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr2.status);
          if (xhr2.response !== void 0) {
            return new Uint8Array(xhr2.response || []);
          }
          return intArrayFromString(xhr2.responseText || "", true);
        };
        var lazyArray2 = this;
        lazyArray2.setDataGetter((chunkNum) => {
          var start = chunkNum * chunkSize;
          var end = (chunkNum + 1) * chunkSize - 1;
          end = Math.min(end, datalength - 1);
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") {
            lazyArray2.chunks[chunkNum] = doXHR(start, end);
          }
          if (typeof lazyArray2.chunks[chunkNum] == "undefined") throw new Error("doXHR failed!");
          return lazyArray2.chunks[chunkNum];
        });
        if (usesGzip || !datalength) {
          chunkSize = datalength = 1;
          datalength = this.getter(0).length;
          chunkSize = datalength;
          out("LazyFiles on gzip forces download of the whole file when length is accessed");
        }
        this._length = datalength;
        this._chunkSize = chunkSize;
        this.lengthKnown = true;
      };
      if (typeof XMLHttpRequest != "undefined") {
        if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
        var lazyArray = new LazyUint8Array();
        Object.defineProperties(lazyArray, { length: { get: function() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._length;
        } }, chunkSize: { get: function() {
          if (!this.lengthKnown) {
            this.cacheLength();
          }
          return this._chunkSize;
        } } });
        var properties = { isDevice: false, contents: lazyArray };
      } else {
        var properties = { isDevice: false, url };
      }
      var node = FS.createFile(parent, name, properties, canRead, canWrite);
      if (properties.contents) {
        node.contents = properties.contents;
      } else if (properties.url) {
        node.contents = null;
        node.url = properties.url;
      }
      Object.defineProperties(node, { usedBytes: { get: function() {
        return this.contents.length;
      } } });
      var stream_ops = {};
      var keys = Object.keys(node.stream_ops);
      keys.forEach((key) => {
        var fn = node.stream_ops[key];
        stream_ops[key] = function forceLoadLazyFile() {
          FS.forceLoadFile(node);
          return fn.apply(null, arguments);
        };
      });
      function writeChunks(stream, buffer2, offset, length, position) {
        var contents = stream.node.contents;
        if (position >= contents.length) return 0;
        var size = Math.min(contents.length - position, length);
        if (contents.slice) {
          for (var i2 = 0; i2 < size; i2++) {
            buffer2[offset + i2] = contents[position + i2];
          }
        } else {
          for (var i2 = 0; i2 < size; i2++) {
            buffer2[offset + i2] = contents.get(position + i2);
          }
        }
        return size;
      }
      stream_ops.read = (stream, buffer2, offset, length, position) => {
        FS.forceLoadFile(node);
        return writeChunks(stream, buffer2, offset, length, position);
      };
      stream_ops.mmap = (stream, length, position, prot, flags) => {
        FS.forceLoadFile(node);
        var ptr = mmapAlloc(length);
        if (!ptr) {
          throw new FS.ErrnoError(48);
        }
        writeChunks(stream, HEAP8, ptr, length, position);
        return { ptr, allocated: true };
      };
      node.stream_ops = stream_ops;
      return node;
    }, createPreloadedFile: (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency("cp " + fullname);
      function processData(byteArray) {
        function finish(byteArray2) {
          if (preFinish) preFinish();
          if (!dontCreateFile) {
            FS.createDataFile(parent, name, byteArray2, canRead, canWrite, canOwn);
          }
          if (onload) onload();
          removeRunDependency(dep);
        }
        if (Browser.handledByPreloadPlugin(byteArray, fullname, finish, () => {
          if (onerror) onerror();
          removeRunDependency(dep);
        })) {
          return;
        }
        finish(byteArray);
      }
      addRunDependency(dep);
      if (typeof url == "string") {
        asyncLoad(url, (byteArray) => processData(byteArray), onerror);
      } else {
        processData(url);
      }
    }, indexedDB: () => {
      return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    }, DB_NAME: () => {
      return "EM_FS_" + window.location.pathname;
    }, DB_VERSION: 20, DB_STORE_NAME: "FILE_DATA", saveFilesToDB: (paths, onload, onerror) => {
      onload = onload || (() => {
      });
      onerror = onerror || (() => {
      });
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
      } catch (e) {
        return onerror(e);
      }
      openRequest.onupgradeneeded = () => {
        out("creating db");
        var db = openRequest.result;
        db.createObjectStore(FS.DB_STORE_NAME);
      };
      openRequest.onsuccess = () => {
        var db = openRequest.result;
        var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0, fail = 0, total = paths.length;
        function finish() {
          if (fail == 0) onload();
          else onerror();
        }
        paths.forEach((path) => {
          var putRequest = files.put(FS.analyzePath(path).object.contents, path);
          putRequest.onsuccess = () => {
            ok++;
            if (ok + fail == total) finish();
          };
          putRequest.onerror = () => {
            fail++;
            if (ok + fail == total) finish();
          };
        });
        transaction.onerror = onerror;
      };
      openRequest.onerror = onerror;
    }, loadFilesFromDB: (paths, onload, onerror) => {
      onload = onload || (() => {
      });
      onerror = onerror || (() => {
      });
      var indexedDB = FS.indexedDB();
      try {
        var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
      } catch (e) {
        return onerror(e);
      }
      openRequest.onupgradeneeded = onerror;
      openRequest.onsuccess = () => {
        var db = openRequest.result;
        try {
          var transaction = db.transaction([FS.DB_STORE_NAME], "readonly");
        } catch (e) {
          onerror(e);
          return;
        }
        var files = transaction.objectStore(FS.DB_STORE_NAME);
        var ok = 0, fail = 0, total = paths.length;
        function finish() {
          if (fail == 0) onload();
          else onerror();
        }
        paths.forEach((path) => {
          var getRequest = files.get(path);
          getRequest.onsuccess = () => {
            if (FS.analyzePath(path).exists) {
              FS.unlink(path);
            }
            FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
            ok++;
            if (ok + fail == total) finish();
          };
          getRequest.onerror = () => {
            fail++;
            if (ok + fail == total) finish();
          };
        });
        transaction.onerror = onerror;
      };
      openRequest.onerror = onerror;
    } };
    var SYSCALLS = { DEFAULT_POLLMASK: 5, calculateAt: function(dirfd, path, allowEmpty) {
      if (PATH.isAbs(path)) {
        return path;
      }
      var dir;
      if (dirfd === -100) {
        dir = FS.cwd();
      } else {
        var dirstream = SYSCALLS.getStreamFromFD(dirfd);
        dir = dirstream.path;
      }
      if (path.length == 0) {
        if (!allowEmpty) {
          throw new FS.ErrnoError(44);
        }
        return dir;
      }
      return PATH.join2(dir, path);
    }, doStat: function(func, path, buf) {
      try {
        var stat = func(path);
      } catch (e) {
        if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
          return -54;
        }
        throw e;
      }
      HEAP32[buf >> 2] = stat.dev;
      HEAP32[buf + 8 >> 2] = stat.ino;
      HEAP32[buf + 12 >> 2] = stat.mode;
      HEAPU32[buf + 16 >> 2] = stat.nlink;
      HEAP32[buf + 20 >> 2] = stat.uid;
      HEAP32[buf + 24 >> 2] = stat.gid;
      HEAP32[buf + 28 >> 2] = stat.rdev;
      tempI64 = [stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 40 >> 2] = tempI64[0], HEAP32[buf + 44 >> 2] = tempI64[1];
      HEAP32[buf + 48 >> 2] = 4096;
      HEAP32[buf + 52 >> 2] = stat.blocks;
      tempI64 = [Math.floor(stat.atime.getTime() / 1e3) >>> 0, (tempDouble = Math.floor(stat.atime.getTime() / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 56 >> 2] = tempI64[0], HEAP32[buf + 60 >> 2] = tempI64[1];
      HEAPU32[buf + 64 >> 2] = 0;
      tempI64 = [Math.floor(stat.mtime.getTime() / 1e3) >>> 0, (tempDouble = Math.floor(stat.mtime.getTime() / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 72 >> 2] = tempI64[0], HEAP32[buf + 76 >> 2] = tempI64[1];
      HEAPU32[buf + 80 >> 2] = 0;
      tempI64 = [Math.floor(stat.ctime.getTime() / 1e3) >>> 0, (tempDouble = Math.floor(stat.ctime.getTime() / 1e3), +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 88 >> 2] = tempI64[0], HEAP32[buf + 92 >> 2] = tempI64[1];
      HEAPU32[buf + 96 >> 2] = 0;
      tempI64 = [stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[buf + 104 >> 2] = tempI64[0], HEAP32[buf + 108 >> 2] = tempI64[1];
      return 0;
    }, doMsync: function(addr, stream, len, flags, offset) {
      if (!FS.isFile(stream.node.mode)) {
        throw new FS.ErrnoError(43);
      }
      if (flags & 2) {
        return 0;
      }
      var buffer2 = HEAPU8.slice(addr, addr + len);
      FS.msync(stream, buffer2, offset, len, flags);
    }, varargs: void 0, get: function() {
      SYSCALLS.varargs += 4;
      var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
      return ret;
    }, getStr: function(ptr) {
      var ret = UTF8ToString(ptr);
      return ret;
    }, getStreamFromFD: function(fd) {
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(8);
      return stream;
    } };
    function ___syscall_fcntl64(fd, cmd, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (cmd) {
          case 0: {
            var arg = SYSCALLS.get();
            if (arg < 0) {
              return -28;
            }
            var newStream;
            newStream = FS.createStream(stream, arg);
            return newStream.fd;
          }
          case 1:
          case 2:
            return 0;
          case 3:
            return stream.flags;
          case 4: {
            var arg = SYSCALLS.get();
            stream.flags |= arg;
            return 0;
          }
          case 5: {
            var arg = SYSCALLS.get();
            var offset = 0;
            HEAP16[arg + offset >> 1] = 2;
            return 0;
          }
          case 6:
          case 7:
            return 0;
          case 16:
          case 8:
            return -28;
          case 9:
            setErrNo(28);
            return -1;
          default: {
            return -28;
          }
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno;
      }
    }
    function ___syscall_ioctl(fd, op, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        switch (op) {
          case 21509:
          case 21505: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21510:
          case 21511:
          case 21512:
          case 21506:
          case 21507:
          case 21508: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21519: {
            if (!stream.tty) return -59;
            var argp = SYSCALLS.get();
            HEAP32[argp >> 2] = 0;
            return 0;
          }
          case 21520: {
            if (!stream.tty) return -59;
            return -28;
          }
          case 21531: {
            var argp = SYSCALLS.get();
            return FS.ioctl(stream, op, argp);
          }
          case 21523: {
            if (!stream.tty) return -59;
            return 0;
          }
          case 21524: {
            if (!stream.tty) return -59;
            return 0;
          }
          default:
            return -28;
        }
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno;
      }
    }
    function ___syscall_openat(dirfd, path, flags, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        path = SYSCALLS.getStr(path);
        path = SYSCALLS.calculateAt(dirfd, path);
        var mode = varargs ? SYSCALLS.get() : 0;
        return FS.open(path, flags, mode).fd;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return -e.errno;
      }
    }
    function __emscripten_throw_longjmp() {
      throw Infinity;
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
      }
    }
    function _emscripten_resize_heap(requestedSize) {
      var oldSize = HEAPU8.length;
      requestedSize = requestedSize >>> 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
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
      return false;
    }
    function _proc_exit(code) {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        if (Module3["onExit"]) Module3["onExit"](code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    }
    function exitJS(status, implicit) {
      EXITSTATUS = status;
      _proc_exit(status);
    }
    var _exit = exitJS;
    function _fd_close(fd) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.close(stream);
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function doReadv(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i2 = 0; i2 < iovcnt; i2++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break;
      }
      return ret;
    }
    function _fd_read(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doReadv(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function convertI32PairToI53Checked(lo, hi) {
      return hi + 2097152 >>> 0 < 4194305 - !!lo ? (lo >>> 0) + hi * 4294967296 : NaN;
    }
    function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
      try {
        var offset = convertI32PairToI53Checked(offset_low, offset_high);
        if (isNaN(offset)) return 61;
        var stream = SYSCALLS.getStreamFromFD(fd);
        FS.llseek(stream, offset, whence);
        tempI64 = [stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[newOffset >> 2] = tempI64[0], HEAP32[newOffset + 4 >> 2] = tempI64[1];
        if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function doWritev(stream, iov, iovcnt, offset) {
      var ret = 0;
      for (var i2 = 0; i2 < iovcnt; i2++) {
        var ptr = HEAPU32[iov >> 2];
        var len = HEAPU32[iov + 4 >> 2];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
      }
      return ret;
    }
    function _fd_write(fd, iov, iovcnt, pnum) {
      try {
        var stream = SYSCALLS.getStreamFromFD(fd);
        var num = doWritev(stream, iov, iovcnt);
        HEAPU32[pnum >> 2] = num;
        return 0;
      } catch (e) {
        if (typeof FS == "undefined" || !(e instanceof FS.ErrnoError)) throw e;
        return e.errno;
      }
    }
    function _system(command) {
      if (!command) return 0;
      setErrNo(52);
      return -1;
    }
    function getCFunc(ident) {
      var func = Module3["_" + ident];
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
      argTypes = argTypes || [];
      var numericArgs = argTypes.every((type) => type === "number" || type === "boolean");
      var numericRet = returnType !== "string";
      if (numericRet && numericArgs && !opts) {
        return getCFunc(ident);
      }
      return function() {
        return ccall(ident, returnType, argTypes, arguments, opts);
      };
    }
    var FSNode = function(parent, name, mode, rdev) {
      if (!parent) {
        parent = this;
      }
      this.parent = parent;
      this.mount = parent.mount;
      this.mounted = null;
      this.id = FS.nextInode++;
      this.name = name;
      this.mode = mode;
      this.node_ops = {};
      this.stream_ops = {};
      this.rdev = rdev;
    };
    var readMode = 292 | 73;
    var writeMode = 146;
    Object.defineProperties(FSNode.prototype, { read: { get: function() {
      return (this.mode & readMode) === readMode;
    }, set: function(val) {
      val ? this.mode |= readMode : this.mode &= ~readMode;
    } }, write: { get: function() {
      return (this.mode & writeMode) === writeMode;
    }, set: function(val) {
      val ? this.mode |= writeMode : this.mode &= ~writeMode;
    } }, isFolder: { get: function() {
      return FS.isDir(this.mode);
    } }, isDevice: { get: function() {
      return FS.isChrdev(this.mode);
    } } });
    FS.FSNode = FSNode;
    FS.staticInit();
    var asmLibraryArg = { "a": ___assert_fail, "r": ___call_sighandler, "j": ___syscall_fcntl64, "t": ___syscall_ioctl, "u": ___syscall_openat, "o": __emscripten_throw_longjmp, "v": _emscripten_memcpy_big, "p": _emscripten_resize_heap, "w": _exit, "h": _fd_close, "s": _fd_read, "n": _fd_seek, "i": _fd_write, "d": invoke_d, "b": invoke_i, "l": invoke_iii, "k": invoke_iiii, "e": invoke_iiiiiii, "g": invoke_iiiiiiiii, "c": invoke_vi, "f": invoke_vii, "m": invoke_viii, "q": _system };
    var asm = createWasm();
    var ___wasm_call_ctors = Module3["___wasm_call_ctors"] = function() {
      return (___wasm_call_ctors = Module3["___wasm_call_ctors"] = Module3["asm"]["y"]).apply(null, arguments);
    };
    var _malloc = Module3["_malloc"] = function() {
      return (_malloc = Module3["_malloc"] = Module3["asm"]["A"]).apply(null, arguments);
    };
    var _METIS_PartGraphRecursive = Module3["_METIS_PartGraphRecursive"] = function() {
      return (_METIS_PartGraphRecursive = Module3["_METIS_PartGraphRecursive"] = Module3["asm"]["B"]).apply(null, arguments);
    };
    var _METIS_PartGraphKway = Module3["_METIS_PartGraphKway"] = function() {
      return (_METIS_PartGraphKway = Module3["_METIS_PartGraphKway"] = Module3["asm"]["C"]).apply(null, arguments);
    };
    var ___errno_location = Module3["___errno_location"] = function() {
      return (___errno_location = Module3["___errno_location"] = Module3["asm"]["D"]).apply(null, arguments);
    };
    var _setThrew = Module3["_setThrew"] = function() {
      return (_setThrew = Module3["_setThrew"] = Module3["asm"]["E"]).apply(null, arguments);
    };
    var stackSave = Module3["stackSave"] = function() {
      return (stackSave = Module3["stackSave"] = Module3["asm"]["F"]).apply(null, arguments);
    };
    var stackRestore = Module3["stackRestore"] = function() {
      return (stackRestore = Module3["stackRestore"] = Module3["asm"]["G"]).apply(null, arguments);
    };
    var stackAlloc = Module3["stackAlloc"] = function() {
      return (stackAlloc = Module3["stackAlloc"] = Module3["asm"]["H"]).apply(null, arguments);
    };
    function invoke_i(index) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiii(index, a1, a2, a3, a4, a5, a6) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_viii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiiiiiiii(index, a1, a2, a3, a4, a5, a6, a7, a8) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3, a4, a5, a6, a7, a8);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vii(index, a1, a2) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iii(index, a1, a2) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_vi(index, a1) {
      var sp = stackSave();
      try {
        getWasmTableEntry(index)(a1);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_d(index) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)();
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    function invoke_iiii(index, a1, a2, a3) {
      var sp = stackSave();
      try {
        return getWasmTableEntry(index)(a1, a2, a3);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
      }
    }
    Module3["ccall"] = ccall;
    Module3["cwrap"] = cwrap;
    var calledRun;
    dependenciesFulfilled = function runCaller() {
      if (!calledRun) run();
      if (!calledRun) dependenciesFulfilled = runCaller;
    };
    function run(args) {
      args = args || arguments_;
      if (runDependencies > 0) {
        return;
      }
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
var Metis_default = Module2;

// src/plugins/meshlets/Metis.ts
var Metis = class _Metis {
  static METIS;
  static isLoaded = false;
  static async load() {
    if (!_Metis.METIS) {
      _Metis.METIS = await Metis_default();
      this.isLoaded = true;
    }
  }
  static partition(groups, nparts) {
    if (!this.isLoaded) throw Error("Metis library not loaded");
    function _prepare_graph(adjacency) {
      function assert(condition) {
        if (!condition) throw Error("assert");
      }
      let xadj = [0];
      let adjncy = [];
      for (let i2 = 0; i2 < adjacency.length; i2++) {
        let adj = adjacency[i2];
        if (adj !== null && adj.length) {
          assert(Math.max(...adj) < adjacency.length);
        }
        adjncy.push(...adj);
        xadj.push(adjncy.length);
      }
      return [xadj, adjncy];
    }
    const [_xadj, _adjncy] = _prepare_graph(groups);
    const objval = new WASMPointer(new Uint32Array(1), "out");
    const parts = new WASMPointer(new Uint32Array(_xadj.length - 1), "out");
    const options_array = new Int32Array(40);
    options_array.fill(-1);
    options_array[16 /* METIS_OPTION_UFACTOR */] = 200;
    WASMHelper.call(
      _Metis.METIS,
      "METIS_PartGraphKway",
      "number",
      new WASMPointer(new Int32Array([_xadj.length - 1])),
      // nvtxs
      new WASMPointer(new Int32Array([1])),
      // ncon
      new WASMPointer(new Int32Array(_xadj)),
      // xadj
      new WASMPointer(new Int32Array(_adjncy)),
      // adjncy
      null,
      // vwgt
      null,
      // vsize
      null,
      // adjwgt
      new WASMPointer(new Int32Array([nparts])),
      // nparts
      null,
      // tpwgts
      null,
      // ubvec
      new WASMPointer(options_array),
      // options
      objval,
      // objval
      parts
      // part
    );
    const part_num = Math.max(...parts.data);
    const parts_out = [];
    for (let i2 = 0; i2 <= part_num; i2++) {
      const part = [];
      for (let j = 0; j < parts.data.length; j++) {
        if (parts.data[j] === i2) {
          part.push(j);
        }
      }
      if (part.length > 0) parts_out.push(part);
    }
    return parts_out;
  }
  static rebuildMeshletsFromGroupIndices(meshlets, groups) {
    let groupedMeshlets = [];
    for (let i2 = 0; i2 < groups.length; i2++) {
      if (!groupedMeshlets[i2]) groupedMeshlets[i2] = [];
      for (let j = 0; j < groups[i2].length; j++) {
        const meshletId = groups[i2][j];
        const meshlet = meshlets[meshletId];
        groupedMeshlets[i2].push(meshlet);
      }
    }
    return groupedMeshlets;
  }
  static group(adj, nparts) {
    const groups = this.partition(adj, nparts);
    return groups;
  }
  // METIS_API(int) METIS_PartGraphRecursive(idx_t *nvtxs, idx_t *ncon, idx_t *xadj, 
  //     idx_t *adjncy, idx_t *vwgt, idx_t *vsize, idx_t *adjwgt, 
  //     idx_t *nparts, real_t *tpwgts, real_t *ubvec, idx_t *options, 
  //     idx_t *edgecut, idx_t *part);
  static METIS_PartGraphRecursive(nvtxs, ncon, xadj, adjncy, vwgt, vsize, adjwgt, nparts, tpwgts, ubvec, options, edgecut, part) {
    const parts = new WASMPointer(new Int32Array([...part]), "out");
    const r = WASMHelper.call(
      _Metis.METIS,
      "METIS_PartGraphRecursive",
      "number",
      nvtxs ? new WASMPointer(new Int32Array([nvtxs])) : null,
      // nvtxs
      ncon ? new WASMPointer(new Int32Array([ncon])) : null,
      // ncon
      xadj ? new WASMPointer(new Int32Array([...xadj])) : null,
      // xadj
      adjncy ? new WASMPointer(new Int32Array([...adjncy])) : null,
      // adjncy
      vwgt ? new WASMPointer(new Int32Array([vwgt])) : null,
      // vwgt
      vsize ? new WASMPointer(new Int32Array([vsize])) : null,
      // vsize
      adjwgt ? new WASMPointer(new Int32Array([...adjwgt])) : null,
      // adjwgt
      nparts ? new WASMPointer(new Int32Array([nparts])) : null,
      // nparts
      tpwgts ? new WASMPointer(new Float32Array([...tpwgts])) : null,
      // tpwgts
      ubvec ? new WASMPointer(new Int32Array([ubvec])) : null,
      // ubvec
      options ? new WASMPointer(new Int32Array([...options])) : null,
      // options
      edgecut ? new WASMPointer(new Int32Array([edgecut])) : null,
      // objval
      parts
      // part
    );
    for (let i2 = 0; i2 < parts.data.length; i2++) part[i2] = parts.data[i2];
    return r;
  }
};

// src/plugins/meshlets/utils/MeshletCreator.ts
var MeshletCreator = class _MeshletCreator {
  static cone_weight = 0;
  static buildMeshletsFromBuildOutput(vertices, output) {
    let meshlets = [];
    for (let i2 = 0; i2 < output.meshlets_count; i2++) {
      const meshlet = output.meshlets_result[i2];
      let meshlet_positions = [];
      let meshlet_indices = [];
      for (let v = 0; v < meshlet.vertex_count; ++v) {
        const o = attribute_size * output.meshlet_vertices_result[meshlet.vertex_offset + v];
        const vx = vertices[o + 0];
        const vy = vertices[o + 1];
        const vz = vertices[o + 2];
        const nx = vertices[o + 3];
        const ny = vertices[o + 4];
        const nz = vertices[o + 5];
        const uvx = vertices[o + 6];
        const uvy = vertices[o + 7];
        meshlet_positions.push(vx, vy, vz);
        if (attribute_size === 8) {
          meshlet_positions.push(nx, ny, nz);
          meshlet_positions.push(uvx, uvy);
        }
      }
      for (let t = 0; t < meshlet.triangle_count; ++t) {
        const o = meshlet.triangle_offset + 3 * t;
        meshlet_indices.push(output.meshlet_triangles_result[o + 0]);
        meshlet_indices.push(output.meshlet_triangles_result[o + 1]);
        meshlet_indices.push(output.meshlet_triangles_result[o + 2]);
      }
      meshlets.push(new Meshlet(new Float32Array(meshlet_positions), new Uint32Array(meshlet_indices)));
    }
    return meshlets;
  }
  static build(vertices, indices, max_vertices, max_triangles) {
    const cone_weight = _MeshletCreator.cone_weight;
    const output = Meshoptimizer.meshopt_buildMeshlets(vertices, indices, max_vertices, max_triangles, cone_weight);
    const m = {
      meshlets_count: output.meshlets_count,
      meshlets_result: output.meshlets_result.slice(0, output.meshlets_count),
      meshlet_vertices_result: output.meshlet_vertices_result,
      meshlet_triangles_result: output.meshlet_triangles_result
    };
    const meshlets = _MeshletCreator.buildMeshletsFromBuildOutput(vertices, m);
    return meshlets;
  }
};

// src/plugins/meshlets/utils/MeshletGrouper.ts
var MeshletGrouper = class _MeshletGrouper {
  static adjacencyList(meshlets) {
    let vertexHashToMeshletMap = /* @__PURE__ */ new Map();
    for (let i2 = 0; i2 < meshlets.length; i2++) {
      const meshlet = meshlets[i2];
      for (let j = 0; j < meshlet.vertices.length; j += attribute_size) {
        const hash = `${meshlet.vertices[j + 0].toPrecision(6)},${meshlet.vertices[j + 1].toPrecision(6)},${meshlet.vertices[j + 2].toPrecision(6)}`;
        let meshletList = vertexHashToMeshletMap.get(hash);
        if (!meshletList) meshletList = /* @__PURE__ */ new Set();
        meshletList.add(i2);
        vertexHashToMeshletMap.set(hash, meshletList);
      }
    }
    const adjacencyList = /* @__PURE__ */ new Map();
    for (let [_, indices] of vertexHashToMeshletMap) {
      if (indices.size === 1) continue;
      for (let index of indices) {
        if (!adjacencyList.has(index)) {
          adjacencyList.set(index, /* @__PURE__ */ new Set());
        }
        for (let otherIndex of indices) {
          if (otherIndex !== index) {
            adjacencyList.get(index).add(otherIndex);
          }
        }
      }
    }
    let adjacencyListArray = new Array(meshlets.length).fill(0).map((v) => []);
    for (let [key, adjacents] of adjacencyList) {
      if (!adjacencyListArray[key]) adjacencyListArray[key] = [];
      adjacencyListArray[key].push(...Array.from(adjacents));
    }
    return adjacencyListArray;
  }
  static rebuildMeshletsFromGroupIndices(meshlets, groups) {
    let groupedMeshlets = [];
    for (let i2 = 0; i2 < groups.length; i2++) {
      if (!groupedMeshlets[i2]) groupedMeshlets[i2] = [];
      for (let j = 0; j < groups[i2].length; j++) {
        const meshletId = groups[i2][j];
        const meshlet = meshlets[meshletId];
        groupedMeshlets[i2].push(meshlet);
      }
    }
    return groupedMeshlets;
  }
  static group(meshlets, nparts) {
    function split(meshlet, parts) {
      const adj = _MeshletGrouper.adjacencyList(meshlet);
      const groups = Metis.partition(adj, parts);
      return _MeshletGrouper.rebuildMeshletsFromGroupIndices(meshlet, groups);
    }
    function splitRec(input, partsNeeded) {
      if (partsNeeded === 1) {
        return [input];
      } else {
        const partsLeft = Math.ceil(partsNeeded / 2);
        const partsRight = Math.floor(partsNeeded / 2);
        const [leftInput, rightInput] = split(input, 2);
        const leftResult = splitRec(leftInput, partsLeft);
        const rightResult = splitRec(rightInput, partsRight);
        return [...leftResult, ...rightResult];
      }
    }
    return splitRec(meshlets, nparts);
  }
  static groupV2(meshlets, nparts) {
    const adj = _MeshletGrouper.adjacencyList(meshlets);
    let adjancecy = /* @__PURE__ */ new Map();
    for (const arr of adj) {
      for (let i2 = 0; i2 < arr.length; i2++) {
        const f = arr[i2];
        let adjacents = adjancecy.get(f) || [];
        for (let j = i2 + 1; j < arr.length; j++) {
          const t = arr[j];
          if (!adjacents.includes(t)) adjacents.push(t);
        }
        adjancecy.set(f, adjacents);
      }
    }
    console.log(adjancecy);
    console.log(adj);
  }
  static buildMetisAdjacencyList(vertices, indices) {
    let adjacencyList = new Array(vertices.length / attribute_size);
    for (let i2 = 0; i2 < adjacencyList.length; i2++) {
      adjacencyList[i2] = /* @__PURE__ */ new Set();
    }
    for (let i2 = 0; i2 < indices.length; i2 += 3) {
      const v1 = indices[i2];
      const v2 = indices[i2 + 1];
      const v3 = indices[i2 + 2];
      adjacencyList[v1].add(v2);
      adjacencyList[v1].add(v3);
      adjacencyList[v2].add(v1);
      adjacencyList[v2].add(v3);
      adjacencyList[v3].add(v1);
      adjacencyList[v3].add(v2);
    }
    return adjacencyList.map((set) => Array.from(set));
  }
  static partitionMeshByMetisOutput(vertices, indices, metisPartitions) {
    const attribute_size2 = 8;
    const numPartitions = metisPartitions.length;
    const vertexToPartitions = /* @__PURE__ */ new Map();
    metisPartitions.forEach((partition, index) => {
      partition.forEach((vertex) => {
        if (!vertexToPartitions.has(vertex)) {
          vertexToPartitions.set(vertex, []);
        }
        vertexToPartitions.get(vertex).push(index);
      });
    });
    const partitionedData = Array.from({ length: numPartitions }, () => ({
      vertexMap: /* @__PURE__ */ new Map(),
      vertices: [],
      indices: []
    }));
    for (let i2 = 0; i2 < indices.length; i2 += 3) {
      const v1 = indices[i2];
      const v2 = indices[i2 + 1];
      const v3 = indices[i2 + 2];
      const v1Parts = vertexToPartitions.get(v1);
      const v2Parts = vertexToPartitions.get(v2);
      const v3Parts = vertexToPartitions.get(v3);
      const commonPartitions = v1Parts.filter(
        (part) => v2Parts.includes(part) && v3Parts.includes(part)
      );
      let assignedPartition;
      if (commonPartitions.length > 0) {
        assignedPartition = commonPartitions[0];
      } else {
        const vertexPartitions = [
          { vertex: v1, partitions: v1Parts },
          { vertex: v2, partitions: v2Parts },
          { vertex: v3, partitions: v3Parts }
        ];
        vertexPartitions.sort((a, b) => a.vertex - b.vertex);
        assignedPartition = vertexPartitions[0].partitions[0];
      }
      const partData = partitionedData[assignedPartition];
      [v1, v2, v3].forEach((vertex) => {
        if (!partData.vertexMap.has(vertex)) {
          const newVertexIndex = partData.vertices.length / attribute_size2;
          partData.vertexMap.set(vertex, newVertexIndex);
          for (let j = 0; j < attribute_size2; j++) {
            partData.vertices.push(vertices[vertex * attribute_size2 + j]);
          }
        }
      });
      partData.indices.push(
        partData.vertexMap.get(v1),
        partData.vertexMap.get(v2),
        partData.vertexMap.get(v3)
      );
    }
    const meshlets = partitionedData.filter((part) => part.vertices.length > 0).map((part) => new Meshlet(new Float32Array(part.vertices), new Uint32Array(part.indices)));
    return meshlets;
  }
  static split(meshlet, nparts) {
    function removeSelfLoops(adjacencyList) {
      return adjacencyList.map((neighbors) => {
        return neighbors.filter((neighbor) => neighbor !== adjacencyList.indexOf(neighbors));
      });
    }
    const adj = this.buildMetisAdjacencyList(meshlet.vertices, meshlet.indices);
    const groups = Metis.partition(removeSelfLoops(adj), nparts);
    return this.partitionMeshByMetisOutput(meshlet.vertices, meshlet.indices, groups);
  }
};

// src/plugins/meshlets/utils/MeshletMerger.ts
var Vertex = class {
  position;
  normal;
  uv;
  constructor(position, normal, uv) {
    this.position = position;
    this.normal = normal;
    this.uv = uv;
  }
};
var MeshletMerger = class {
  static removeDuplicateVertices(vertexData, indexData) {
    const vertexMap = /* @__PURE__ */ new Map();
    const uniqueVertices = [];
    const newIndices = [];
    var precisionPoints = 4;
    var precision = Math.pow(10, precisionPoints);
    for (let i2 = 0; i2 < indexData.length; i2++) {
      const index = indexData[i2];
      const pos = vertexData.subarray(index * attribute_size, index * attribute_size + 3);
      const norm = vertexData.subarray(index * attribute_size + 3, index * attribute_size + 6);
      const uv = vertexData.subarray(index * attribute_size + 6, index * attribute_size + 8);
      const vertex = new Vertex(Array.from(pos), Array.from(norm), Array.from(uv));
      const vertexKey = Math.round(vertex.position[0] * precision) + "_" + Math.round(vertex.position[1] * precision) + "_" + Math.round(vertex.position[2] * precision);
      if (vertexMap.has(vertexKey)) {
        newIndices.push(vertexMap.get(vertexKey));
      } else {
        const newIndex = uniqueVertices.length;
        uniqueVertices.push(vertex);
        vertexMap.set(vertexKey, newIndex);
        newIndices.push(newIndex);
      }
    }
    const newVertexData = new Float32Array(uniqueVertices.length * attribute_size);
    uniqueVertices.forEach((v, index) => {
      newVertexData.set([...v.position, ...v.normal, ...v.uv], index * attribute_size);
    });
    return {
      vertices: newVertexData,
      indices: new Uint32Array(newIndices)
    };
  }
  static merge(meshlets) {
    const vertices = [];
    const indices = [];
    let indexOffset = 0;
    for (let i2 = 0; i2 < meshlets.length; ++i2) {
      const indices2 = meshlets[i2].indices;
      for (let j = 0; j < indices2.length; j++) {
        indices.push(indices2[j] + indexOffset);
      }
      indexOffset += meshlets[i2].vertices.length / attribute_size;
    }
    for (let i2 = 0; i2 < meshlets.length; ++i2) vertices.push(...meshlets[i2].vertices);
    const { vertices: newVertices, indices: newIndices } = this.removeDuplicateVertices(new Float32Array(vertices), new Uint32Array(indices));
    return new Meshlet(newVertices, newIndices);
  }
  static mergeV2(meshlets) {
    let vertices = [];
    let indices = [];
    let indicesOffset = 0;
    for (const meshlet of meshlets) {
      for (const vertex of meshlet.vertices) vertices.push(vertex);
      for (const index of meshlet.indices) indices.push(index + indicesOffset);
      indicesOffset += meshlet.vertices.length / 3;
    }
    return new Meshlet(new Float32Array(vertices), new Uint32Array(indices));
  }
};

// src/plugins/meshlets/utils/MeshletBorder.ts
var MeshletBorder = class {
  // Returns an array with the shared vertices between meshes
  static GetSharedVertices(meshes, attribute_size2) {
    function VertexEncode(vertex) {
      return `${vertex[0].toPrecision(4)},${vertex[1].toPrecision(4)},${vertex[2].toPrecision(4)}`;
    }
    function VertexDecode(vertexKey) {
      const vertex = vertexKey.split(",");
      return [parseFloat(vertex[0]), parseFloat(vertex[1]), parseFloat(vertex[2])];
    }
    let vertexCountMap = /* @__PURE__ */ new Map();
    for (const mesh of meshes) {
      for (let i2 = 0; i2 < mesh.vertices.length; i2 += attribute_size2) {
        const vKey = VertexEncode([mesh.vertices[i2 + 0], mesh.vertices[i2 + 1], mesh.vertices[i2 + 2]]);
        let vCounts = vertexCountMap.get(vKey) || 0;
        vertexCountMap.set(vKey, ++vCounts);
      }
    }
    let sharedVertices = [];
    for (const [key, vCount] of vertexCountMap) {
      if (vCount > 1) {
        sharedVertices.push(VertexDecode(key));
      }
    }
    return sharedVertices;
  }
  static getVertexIndicesForVertexKeys(vertexKeys, vertices, attribute_size2) {
    let matches = [];
    for (let i2 = 0; i2 < vertexKeys.length; i2++) {
      const v = vertexKeys[i2];
      for (let j = 0; j < vertices.length; j += attribute_size2) {
        const EPS = 1e-3;
        if (Math.abs(v[0] - vertices[j + 0]) < EPS && Math.abs(v[1] - vertices[j + 1]) < EPS && Math.abs(v[2] - vertices[j + 2]) < EPS) {
          matches.push(j);
        }
      }
    }
    return matches;
  }
  // For a given mesh returns an array with locked vertices that match sharedVertices
  static SharedVerticesToLockedArray(sharedVertices, mesh, attribute_size2) {
    const mergedGroupLockedVertexIds = this.getVertexIndicesForVertexKeys(sharedVertices, mesh.vertices, attribute_size2);
    const lockedArray = new Uint8Array(mesh.vertices.length).fill(0);
    for (const lockedVertex of mergedGroupLockedVertexIds) {
      lockedArray[lockedVertex] = 1;
    }
    return lockedArray;
  }
};

// src/plugins/meshlets/Meshletizer.ts
var Meshletizer = class _Meshletizer {
  static MaxLOD = 25;
  static step(meshlets, lod, previousMeshlets) {
    if (meshlets.length === 1 && meshlets[0].vertices.length < Meshlet.max_triangles * 8) return meshlets;
    let nparts = Math.ceil(meshlets.length / 8);
    if (nparts > 8) nparts = 8;
    let grouped = [meshlets];
    if (nparts > 1) {
      grouped = MeshletGrouper.group(meshlets, nparts);
    }
    let splitOutputs = [];
    for (let i2 = 0; i2 < grouped.length; i2++) {
      const group = grouped[i2];
      const mergedGroup = MeshletMerger.merge(group);
      const cleanedMergedGroup = Meshoptimizer.clean(mergedGroup);
      const tLod = (lod + 1) / _Meshletizer.MaxLOD;
      const targetError = 0.1 * tLod + 0.01 * (1 - tLod);
      let target_count = cleanedMergedGroup.indices.length / 2;
      const sharedVertices = MeshletBorder.GetSharedVertices(group, attribute_size);
      const lockedArray = MeshletBorder.SharedVerticesToLockedArray(sharedVertices, mergedGroup, attribute_size);
      const simplified = Meshoptimizer.meshopt_simplifyWithAttributes(mergedGroup, lockedArray, target_count, targetError);
      const localScale = Meshoptimizer.meshopt_simplifyScale(simplified.meshlet);
      let meshSpaceError = simplified.error * localScale;
      let childrenError = 0;
      for (let m of group) {
        const previousMeshlet = previousMeshlets.get(m.id);
        if (!previousMeshlet) throw Error("Could not find previous meshler");
        childrenError = Math.max(childrenError, previousMeshlet.clusterError);
      }
      meshSpaceError += childrenError;
      let splits = MeshletCreator.build(simplified.meshlet.vertices, simplified.meshlet.indices, Meshlet.max_vertices, Meshlet.max_triangles);
      for (let split of splits) {
        split.clusterError = meshSpaceError;
        split.boundingVolume = simplified.meshlet.boundingVolume;
        split.lod = lod + 1;
        previousMeshlets.set(split.id, split);
        splitOutputs.push(split);
        split.parents.push(...group);
      }
      for (let m of group) {
        m.children.push(...splits);
        const previousMeshlet = previousMeshlets.get(m.id);
        if (!previousMeshlet) throw Error("Could not find previous meshlet");
        previousMeshlet.parentError = meshSpaceError;
        previousMeshlet.parentBoundingVolume = simplified.meshlet.boundingVolume;
      }
    }
    return splitOutputs;
  }
  static async Build(vertices, indices) {
    await Meshoptimizer.load();
    await Metis.load();
    const meshlets = MeshletCreator.build(vertices, indices, Meshlet.max_vertices, Meshlet.max_triangles);
    console.log(`starting with ${meshlets.length} meshlets`);
    let inputs = meshlets;
    let rootMeshlet = null;
    let previousMeshlets = /* @__PURE__ */ new Map();
    for (let m of meshlets) previousMeshlets.set(m.id, m);
    for (let lod = 0; lod < _Meshletizer.MaxLOD; lod++) {
      const outputs = this.step(inputs, lod, previousMeshlets);
      const inputTriangleArray = inputs.map((m) => m.indices.length / 3);
      const outputTriangleArray = outputs.map((m) => m.indices.length / 3);
      const inputTriangleCount = inputTriangleArray.reduce((a, b) => a + b);
      const outputTriangleCount = outputTriangleArray.reduce((a, b) => a + b);
      console.log(`LOD: ${lod}: input: [meshlets: ${inputTriangleArray.length}, triangles: ${inputTriangleCount}] -> output: [meshlets: ${outputTriangleArray.length}, triangles: ${outputTriangleCount}]`);
      if (outputTriangleCount >= inputTriangleCount) {
        for (const input of inputs) {
          if (input.indices.length / 3 > Meshlet.max_triangles) {
            throw Error(`Output meshlet triangle count ${inputTriangleCount} >= input triangle count ${inputTriangleCount}`);
          }
        }
        break;
      }
      inputs = outputs;
      if (outputs.length === 1 && outputs[0].indices.length / 3 <= 128) {
        console.log("WE are done at lod", lod);
        rootMeshlet = outputs[0];
        rootMeshlet.lod = lod + 1;
        rootMeshlet.parentBoundingVolume = rootMeshlet.boundingVolume;
        break;
      }
    }
    if (rootMeshlet === null) throw Error("Root meshlet is invalid!");
    let meshletsOut = [];
    for (const [_, meshlet] of previousMeshlets) {
      meshletsOut.push(meshlet);
    }
    return meshletsOut;
  }
};

// src/plugins/meshlets/MeshletEvents.ts
var MeshletEvents = class {
  static Updated = (meshlet) => {
  };
};

// src/plugins/meshlets/MeshletMesh.ts
var meshletsCache = /* @__PURE__ */ new Map();
var MeshletMesh = class extends Mesh {
  meshlets = [];
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(MeshletEvents.Updated, this);
    });
  }
  async SetGeometry(geometry, clusterize = true) {
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
    await Meshoptimizer.load();
    if (indices.length / 3 <= Meshlet.max_triangles) {
      this.meshlets.push(new Meshlet(interleavedVertices, indices));
    } else {
      if (clusterize) {
        const allMeshlets = await Meshletizer.Build(interleavedVertices, indices);
        this.meshlets = allMeshlets;
      } else {
        const allMeshlets = MeshletCreator.build(interleavedVertices, indices, Meshlet.max_vertices, Meshlet.max_triangles);
        this.meshlets = allMeshlets;
      }
    }
    meshletsCache.set(geometry, { meshlets: this.meshlets, instanceCount: 0 });
  }
};

// src/plugins/OBJLoader.ts
var OBJLoaderIndexed = class _OBJLoaderIndexed {
  static *triangulate(elements) {
    if (elements.length <= 3) {
      yield elements;
    } else if (elements.length === 4) {
      yield [elements[0], elements[1], elements[2]];
      yield [elements[2], elements[3], elements[0]];
    } else {
      for (let i2 = 1; i2 < elements.length - 1; i2++) {
        yield [elements[0], elements[i2], elements[i2 + 1]];
      }
    }
  }
  static async load(url) {
    const contents = await fetch(url).then((response) => response.text());
    const objMesh = _OBJLoaderIndexed.parse(contents);
    return [{
      geometry: this.toGeometry(objMesh),
      material: new PBRMaterial(),
      children: [],
      localMatrix: new Matrix4()
    }];
  }
  static parse(contents) {
    const indices = [];
    const verts = [];
    const vertNormals = [];
    const uvs = [];
    let currentMaterialIndex = -1;
    let currentObjectByMaterialIndex = 0;
    const unpacked = {
      verts: [],
      norms: [],
      uvs: [],
      hashindices: {},
      indices: [[]],
      index: 0
    };
    const VERTEX_RE = /^v\s/;
    const NORMAL_RE = /^vn\s/;
    const UV_RE = /^vt\s/;
    const FACE_RE = /^f\s/;
    const WHITESPACE_RE = /\s+/;
    const lines = contents.split("\n");
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const elements = line.split(WHITESPACE_RE);
      elements.shift();
      if (VERTEX_RE.test(line)) {
        verts.push(...elements);
      } else if (NORMAL_RE.test(line)) {
        vertNormals.push(...elements);
      } else if (UV_RE.test(line)) {
        uvs.push(...elements);
      } else if (FACE_RE.test(line)) {
        const triangles = _OBJLoaderIndexed.triangulate(elements);
        for (const triangle of triangles) {
          for (let j = 0, eleLen = triangle.length; j < eleLen; j++) {
            const hash = triangle[j] + "," + currentMaterialIndex;
            if (hash in unpacked.hashindices) {
              unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);
            } else {
              const vertex = triangle[j].split("/");
              unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 0]);
              unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 1]);
              unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 2]);
              if (vertNormals.length > 0) {
                unpacked.norms.push(+vertNormals[(+vertex[2] - 1) * 3 + 0]);
                unpacked.norms.push(+vertNormals[(+vertex[2] - 1) * 3 + 1]);
                unpacked.norms.push(+vertNormals[(+vertex[2] - 1) * 3 + 2]);
              }
              if (uvs.length > 0) {
                unpacked.uvs.push(+uvs[(+vertex[1] - 1) * 2 + 0]);
                unpacked.uvs.push(+uvs[(+vertex[1] - 1) * 2 + 1]);
              }
              unpacked.hashindices[hash] = unpacked.index;
              unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);
              unpacked.index += 1;
            }
          }
        }
      }
    }
    return {
      vertices: new Float32Array(unpacked.verts),
      normals: new Float32Array(unpacked.norms),
      uvs: new Float32Array(unpacked.uvs),
      indices: new Uint32Array(unpacked.indices[currentObjectByMaterialIndex])
    };
  }
  static toGeometry(objMesh) {
    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(objMesh.vertices));
    if (objMesh.normals) geometry.attributes.set("normal", new VertexAttribute(objMesh.normals));
    if (objMesh.uvs) geometry.attributes.set("uv", new VertexAttribute(objMesh.uvs));
    if (objMesh.indices) geometry.index = new IndexAttribute(new Uint32Array(objMesh.indices));
    return geometry;
  }
};

// src/plugins/PostProcessing/PostProcessingPass.ts
var PostProcessingPass = class extends RenderPass {
  name = "PostProcessingPass";
  effects = [];
  constructor() {
    super({
      inputs: [
        PassParams.LightingPassOutput
      ],
      outputs: [
        PassParams.LightingPassOutput
      ]
    });
  }
  async init(resources) {
    for (const effect of this.effects) {
      await effect.init(resources);
    }
    this.initialized = true;
  }
  async execute(resources) {
    if (this.initialized === false) return;
    for (const effect of this.effects) {
      if (!effect.initialized) {
        await effect.init(resources);
        continue;
      }
      effect.execute(resources);
    }
    resources.setResource;
  }
};

// src/plugins/PostProcessing/effects/FXAA.ts
var PostProcessingFXAA = class extends RenderPass {
  name = "PostProcessingFXAA";
  shader;
  quadGeometry;
  renderTarget;
  constructor() {
    super({ inputs: [
      PassParams.LightingPassOutput
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
        @group(0) @binding(2) var<storage, read> resolutionInv: vec2<f32>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        // Ported from: https://github.com/mrdoob/three.js/blob/master/examples/jsm/shaders/FXAAShader.js
        const EDGE_STEP_COUNT: i32 = 6;
        const EDGE_GUESS: f32 = 8.0;
        const edgeSteps: array<f32, EDGE_STEP_COUNT> = array(1.0, 1.5, 2.0, 2.0, 2.0, 4.0);

		const _ContrastThreshold = 0.0312;
		const _RelativeThreshold = 0.063;
		const _SubpixelBlending = 1.0;


		fn Sample(tex2D: texture_2d<f32>, uv: vec2f) -> vec4f {
			return textureSampleLevel( tex2D, textureSampler, uv, 0);
		}

		fn SampleLuminance1(tex2D: texture_2d<f32>, uv: vec2f ) -> f32 {
			return dot( Sample( tex2D, uv ).rgb, vec3( 0.3, 0.59, 0.11 ) );
		}

		fn SampleLuminance2(tex2D: texture_2d<f32>, texSize: vec2f, uv: vec2f, uOffset: f32, vOffset: f32 ) -> f32 {
			let _uv = uv + texSize * vec2(uOffset, vOffset);
			return SampleLuminance1(tex2D, _uv);
		}

		struct LuminanceData {
			m: f32, n: f32, e: f32, s: f32, w: f32,
			ne: f32, nw: f32, se: f32, sw: f32,
			highest: f32, lowest: f32, contrast: f32
		};

		fn SampleLuminanceNeighborhood(tex2D: texture_2d<f32>, texSize: vec2f, uv: vec2f ) -> LuminanceData {
			var l: LuminanceData;
			l.m = SampleLuminance1( tex2D, uv );
			l.n = SampleLuminance2( tex2D, texSize, uv,  0.0,  1.0 );
			l.e = SampleLuminance2( tex2D, texSize, uv,  1.0,  0.0 );
			l.s = SampleLuminance2( tex2D, texSize, uv,  0.0, -1.0 );
			l.w = SampleLuminance2( tex2D, texSize, uv, -1.0,  0.0 );

			l.ne = SampleLuminance2( tex2D, texSize, uv,  1.0,  1.0 );
			l.nw = SampleLuminance2( tex2D, texSize, uv, -1.0,  1.0 );
			l.se = SampleLuminance2( tex2D, texSize, uv,  1.0, -1.0 );
			l.sw = SampleLuminance2( tex2D, texSize, uv, -1.0, -1.0 );

			l.highest = max( max( max( max( l.n, l.e ), l.s ), l.w ), l.m );
			l.lowest = min( min( min( min( l.n, l.e ), l.s ), l.w ), l.m );
			l.contrast = l.highest - l.lowest;
			return l;
		}

		fn ShouldSkipPixel(l: LuminanceData) -> bool {
			let threshold = max( _ContrastThreshold, _RelativeThreshold * l.highest );
			return l.contrast < threshold;
		}

		fn DeterminePixelBlendFactor( l: LuminanceData) -> f32 {
			var f = 2.0 * ( l.n + l.e + l.s + l.w );
			f += l.ne + l.nw + l.se + l.sw;
			f *= 1.0 / 12.0;
			f = abs( f - l.m );
			f = clamp( f / l.contrast, 0.0, 1.0 );

			let blendFactor = smoothstep( 0.0, 1.0, f );
			return blendFactor * blendFactor * _SubpixelBlending;
		}

		struct EdgeData {
			isHorizontal: bool,
			pixelStep: f32,
			oppositeLuminance: f32, gradient: f32
		};

		fn DetermineEdge(texSize: vec2f, l: LuminanceData) -> EdgeData {
			var e: EdgeData;
			let horizontal =
				abs( l.n + l.s - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.se - 2.0 * l.e ) +
				abs( l.nw + l.sw - 2.0 * l.w );
			let vertical =
				abs( l.e + l.w - 2.0 * l.m ) * 2.0 +
				abs( l.ne + l.nw - 2.0 * l.n ) +
				abs( l.se + l.sw - 2.0 * l.s );
			e.isHorizontal = horizontal >= vertical;

			let pLuminance = select(l.e, l.n, e.isHorizontal);
			let nLuminance = select(l.w, l.s, e.isHorizontal);
			let pGradient = abs( pLuminance - l.m );
			let nGradient = abs( nLuminance - l.m );

			e.pixelStep = select(texSize.x, texSize.y, e.isHorizontal);
			
			if (pGradient < nGradient) {
				e.pixelStep = -e.pixelStep;
				e.oppositeLuminance = nLuminance;
				e.gradient = nGradient;
			} else {
				e.oppositeLuminance = pLuminance;
				e.gradient = pGradient;
			}

			return e;
		}
        
        fn DetermineEdgeBlendFactor(tex2D: texture_2d<f32>, texSize: vec2f, l: LuminanceData, e: EdgeData, uv: vec2f ) -> f32 {
			var uvEdge: vec2f = uv;
			var edgeStep: vec2f;
			if (e.isHorizontal) {
				uvEdge.y += e.pixelStep * 0.5;
				edgeStep = vec2( texSize.x, 0.0 );
			} else {
				uvEdge.x += e.pixelStep * 0.5;
				edgeStep = vec2( 0.0, texSize.y );
			}

			let edgeLuminance: f32 = ( l.m + e.oppositeLuminance ) * 0.5;
			let gradientThreshold: f32 = e.gradient * 0.25;

			var puv: vec2f = uvEdge + edgeStep * edgeSteps[0];
			var pLuminanceDelta: f32 = SampleLuminance1( tex2D, puv ) - edgeLuminance;
			var pAtEnd: bool = abs( pLuminanceDelta ) >= gradientThreshold;

			for (var i = 1; i < EDGE_STEP_COUNT && !pAtEnd; i++) {
				puv += edgeStep * edgeSteps[i];
				pLuminanceDelta = SampleLuminance1( tex2D, puv ) - edgeLuminance;
				pAtEnd = abs( pLuminanceDelta ) >= gradientThreshold;
			}

			if ( !pAtEnd ) {
				puv += edgeStep * EDGE_GUESS;
			}

			var nuv: vec2f = uvEdge - edgeStep * edgeSteps[0];
			var nLuminanceDelta: f32 = SampleLuminance1( tex2D, nuv ) - edgeLuminance;
			var nAtEnd: bool = abs( nLuminanceDelta ) >= gradientThreshold;

			for (var i = 1; i < EDGE_STEP_COUNT && !nAtEnd; i++) {
				nuv -= edgeStep * edgeSteps[i];
				nLuminanceDelta = SampleLuminance1( tex2D, nuv ) - edgeLuminance;
				nAtEnd = abs( nLuminanceDelta ) >= gradientThreshold;
			}

			if ( !nAtEnd ) {
				nuv -= edgeStep * EDGE_GUESS;
			}

			var pDistance: f32;
            var nDistance: f32;
			if ( e.isHorizontal ) {
				pDistance = puv.x - uv.x;
				nDistance = uv.x - nuv.x;
			} else {
				pDistance = puv.y - uv.y;
				nDistance = uv.y - nuv.y;
			}

			var shortestDistance: f32;
			var deltaSign: bool;
			if ( pDistance <= nDistance ) {
				shortestDistance = pDistance;
				deltaSign = pLuminanceDelta >= 0.0;
			} else {
				shortestDistance = nDistance;
				deltaSign = nLuminanceDelta >= 0.0;
			}

			if (deltaSign == ( l.m - edgeLuminance >= 0.0 )) {
				return 0.0;
			}

			return 0.5 - shortestDistance / ( pDistance + nDistance );
		}

		fn ApplyFXAA(tex2D: texture_2d<f32>, texSize: vec2f, _uv: vec2f ) -> vec4f {
            var uv: vec2f = _uv;
			let luminance: LuminanceData = SampleLuminanceNeighborhood(tex2D, texSize, uv);
			if ( ShouldSkipPixel( luminance ) ) {
				return Sample( tex2D, uv );
			}

			let pixelBlend: f32 = DeterminePixelBlendFactor( luminance );
			let edge: EdgeData = DetermineEdge( texSize, luminance );
			let edgeBlend: f32 = DetermineEdgeBlendFactor( tex2D, texSize, luminance, edge, uv );
			let finalBlend: f32 = max( pixelBlend, edgeBlend );

			if (edge.isHorizontal) {
				uv.y += edge.pixelStep * finalBlend;
			} else {
				uv.x += edge.pixelStep * finalBlend;
			}

			return Sample(tex2D, uv);
		}

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            return ApplyFXAA(texture, resolutionInv, input.vUv );
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
        texture: { group: 0, binding: 1, type: "texture" },
        resolutionInv: { group: 0, binding: 2, type: "storage" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    const sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", sampler);
    this.shader.SetVector2("resolutionInv", new Vector2(1 / Renderer.width, 1 / Renderer.height));
    this.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height);
    this.initialized = true;
  }
  execute(resources) {
    if (this.initialized === false) return;
    const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
    if (!LightingPassOutputTexture) return;
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass(this.name, [{ clear: false, target: this.renderTarget }], void 0, true);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
    RendererContext.CopyTextureToTexture(this.renderTarget, LightingPassOutputTexture);
    resources.setResource(PassParams.LightingPassOutput, LightingPassOutputTexture);
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
  depthLevels;
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
    this.depthLevels = level;
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

// src/plugins/meshlets/passes/CullingPass.ts
var CullingPass = class extends RenderPass {
  name = "CullingPass";
  drawIndirectBuffer;
  compute;
  cullData;
  frustum = new Frustum();
  currentPassBuffer;
  visibleBuffer;
  nonVisibleBuffer;
  visibilityBuffer;
  instanceInfoBuffer;
  isPrePass = true;
  debugBuffer;
  constructor() {
    super({
      inputs: [
        PassParams.DebugSettings,
        MeshletPassParams.indirectMeshletInfo,
        MeshletPassParams.indirectObjectInfo,
        MeshletPassParams.indirectMeshMatrixInfo,
        MeshletPassParams.meshletsCount
      ],
      outputs: [
        MeshletPassParams.indirectDrawBuffer,
        MeshletPassParams.indirectInstanceInfo,
        MeshletPassParams.isCullingPrepass,
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
        settings: { group: 0, binding: 10, type: "storage" }
      }
    });
    this.drawIndirectBuffer = Buffer3.Create(4 * 4, 5 /* INDIRECT */);
    this.drawIndirectBuffer.name = "drawIndirectBuffer";
    this.compute.SetBuffer("drawBuffer", this.drawIndirectBuffer);
    this.currentPassBuffer = Buffer3.Create(1 * 4, 0 /* STORAGE */);
    const sampler = TextureSampler.Create({ magFilter: "nearest", minFilter: "nearest" });
    this.compute.SetSampler("textureSampler", sampler);
    this.visibleBuffer = Buffer3.Create(4, 0 /* STORAGE */);
    this.visibleBuffer.SetArray(new Float32Array([1]));
    this.nonVisibleBuffer = Buffer3.Create(4, 0 /* STORAGE */);
    this.nonVisibleBuffer.SetArray(new Float32Array([0]));
    this.debugBuffer = Buffer3.Create(4 * 4, 0 /* STORAGE */);
  }
  execute(resources) {
    const depthTexturePyramid = resources.getResource(PassParams.depthTexturePyramid);
    if (!depthTexturePyramid) return;
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
    const settings = resources.getResource(PassParams.DebugSettings);
    this.compute.SetArray("settings", settings);
    this.compute.SetTexture("depthTexture", depthTexturePyramid);
    this.compute.SetBuffer("bPrepass", this.currentPassBuffer);
    RendererContext.CopyBufferToBuffer(this.drawIndirectBuffer, this.debugBuffer);
    RendererContext.ClearBuffer(this.drawIndirectBuffer);
    if (this.isPrePass === true) RendererContext.CopyBufferToBuffer(this.visibleBuffer, this.currentPassBuffer);
    else RendererContext.CopyBufferToBuffer(this.nonVisibleBuffer, this.currentPassBuffer);
    const dispatchSizeX = Math.ceil(Math.cbrt(meshletCount) / 4);
    const dispatchSizeY = Math.ceil(Math.cbrt(meshletCount) / 4);
    const dispatchSizeZ = Math.ceil(Math.cbrt(meshletCount) / 4);
    ComputeContext.BeginComputePass(`Culling - prepass: ${+this.isPrePass}`, true);
    ComputeContext.Dispatch(this.compute, dispatchSizeX, dispatchSizeY, dispatchSizeZ);
    ComputeContext.EndComputePass();
    resources.setResource(MeshletPassParams.isCullingPrepass, this.isPrePass);
    this.isPrePass = !this.isPrePass;
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

// src/plugins/meshlets/passes/IndirectGBufferPass.ts
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
        MeshletPassParams.isCullingPrepass
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
        emissiveMaps: { group: 0, binding: 13, type: "texture" }
      }
    });
    this.geometry = new Geometry();
    this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(Meshlet.max_triangles * 3)));
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
    let inputIsCullingPrepass = resources.getResource(MeshletPassParams.isCullingPrepass);
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
    const settings = resources.getResource(PassParams.DebugSettings);
    this.shader.SetArray("settings", settings);
    const gBufferAlbedoRT = resources.getResource(PassParams.GBufferAlbedo);
    const gBufferNormalRT = resources.getResource(PassParams.GBufferNormal);
    const gBufferERMORT = resources.getResource(PassParams.GBufferERMO);
    const gBufferDepthRT = resources.getResource(PassParams.GBufferDepth);
    const colorTargets = [
      { target: gBufferAlbedoRT, clear: inputIsCullingPrepass },
      { target: gBufferNormalRT, clear: inputIsCullingPrepass },
      { target: gBufferERMORT, clear: inputIsCullingPrepass }
    ];
    RendererContext.BeginRenderPass(`IGBuffer - prepass: ${+inputIsCullingPrepass}`, colorTargets, { target: gBufferDepthRT, clear: inputIsCullingPrepass }, true);
    RendererContext.DrawIndirect(this.geometry, this.shader, inputIndirectDrawBuffer);
    RendererContext.EndRenderPass();
  }
};

// src/renderer/webgpu/shaders/deferred/DrawIndirectShadows.wgsl
var DrawIndirectShadows_default = "./resources/renderer/webgpu/shaders/deferred/DrawIndirectShadows.wgsl";

// src/plugins/meshlets/passes/MeshletsShadowMapPass.ts
var lightsCSMProjectionMatrix2 = [];
var getWorldSpaceCorners = (camera, zNearPercentage, zFarPercentage) => {
  const invViewProj = camera.projectionMatrix.clone().mul(camera.viewMatrix).invert();
  const result = [];
  const lerp = (a, b, t) => a + (b - a) * t;
  const viewSpaceZFarPercentage = new Vector4(0, 0, -lerp(camera.near, camera.far, zFarPercentage), 1).applyMatrix4(camera.projectionMatrix);
  const scaleFarZ = viewSpaceZFarPercentage.z / viewSpaceZFarPercentage.w;
  const viewSpaceZNearPercentage = new Vector4(0, 0, -lerp(camera.near, camera.far, zNearPercentage), 1).applyMatrix4(camera.projectionMatrix);
  const scaleNearZ = viewSpaceZNearPercentage.z / viewSpaceZNearPercentage.w;
  for (let x = -1; x <= 1; x += 2) {
    for (let y = -1; y <= 1; y += 2) {
      for (let z = 0; z <= 1; z += 1) {
        let corner = new Vector4(x, y, z === 0 ? scaleNearZ : scaleFarZ, 1).applyMatrix4(invViewProj);
        let v3corner = new Vector3(corner.x / corner.w, corner.y / corner.w, corner.z / corner.w);
        result.push(v3corner);
      }
    }
  }
  return result;
};
var getLightViewProjections = (camera, lightDirection, numOfCascades, assignmentExponent, shadowDepthPercentage, zMult) => {
  if (camera == null) {
    return [new Matrix4()];
  }
  let f = (x) => Math.pow(x, assignmentExponent);
  const cascadesViewProjections = [];
  for (let i2 = 0; i2 < numOfCascades; ++i2) {
    let corners = getWorldSpaceCorners(camera, shadowDepthPercentage * f(i2 / (numOfCascades - 1)), shadowDepthPercentage * f((i2 + 1) / (numOfCascades - 1)));
    const center = corners[0].clone();
    for (let i3 = 1; i3 < 8; ++i3) {
      center.add(corners[i3]);
    }
    center.mul(1 / 8);
    const viewPos = center.clone().add(lightDirection);
    const viewMatrix = new Matrix4().lookAt(center, viewPos, new Vector3(0, 1, 0));
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i3 = 0; i3 < 8; ++i3) {
      const viewSpaceCorner = corners[i3].clone().applyMatrix4(viewMatrix);
      minX = Math.min(viewSpaceCorner.x, minX);
      minY = Math.min(viewSpaceCorner.y, minY);
      minZ = Math.min(viewSpaceCorner.z, minZ);
      maxX = Math.max(viewSpaceCorner.x, maxX);
      maxY = Math.max(viewSpaceCorner.y, maxY);
      maxZ = Math.max(viewSpaceCorner.z, maxZ);
    }
    if (minZ < 0) minZ *= zMult;
    else minZ /= zMult;
    if (maxZ < 0) maxZ /= zMult;
    else maxZ *= zMult;
    const projMatrix = new Matrix4().orthoZO(minX, maxX, minY, maxY, minZ, maxZ);
    const result = projMatrix.clone().mul(viewMatrix);
    cascadesViewProjections.push(result);
  }
  return cascadesViewProjections;
};
var MeshletsShadowMapPass = class extends RenderPass {
  name = "MeshletsShadowMapPass";
  drawIndirectShadowShader;
  lightProjectionMatrixBuffer;
  lightProjectionViewMatricesBuffer;
  cascadeIndexBuffers = [];
  cascadeCurrentIndexBuffer;
  meshletGeometry;
  constructor() {
    super({
      inputs: [
        PassParams.MainCamera,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth,
        PassParams.ShadowPassDepth
      ],
      outputs: []
    });
  }
  async init(resources) {
    this.drawIndirectShadowShader = await Shader.Create({
      code: await ShaderLoader.Load(DrawIndirectShadows_default),
      colorOutputs: [],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 1, type: "storage" },
        instanceInfo: { group: 0, binding: 2, type: "storage" },
        meshMatrixInfo: { group: 0, binding: 4, type: "storage" },
        objectInfo: { group: 0, binding: 5, type: "storage" },
        vertices: { group: 0, binding: 7, type: "storage" },
        cascadeIndex: { group: 0, binding: 8, type: "storage" }
      },
      cullMode: "none"
    });
    this.meshletGeometry = new Geometry();
    this.meshletGeometry.attributes.set("position", new VertexAttribute(new Float32Array(Meshlet.max_triangles * 3)));
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    const meshlets = scene.GetComponents(MeshletMesh);
    if (meshlets.length === 0) return;
    const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
    if (lights.length === 0) {
      return;
    }
    const numOfCascades = 4;
    const assignmentExponent = 2.5;
    const shadowDepthPercentage = 1;
    const zMult = 10;
    if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
      this.lightProjectionViewMatricesBuffer = Buffer3.Create(lights.length * numOfCascades * 4 * 16, 0 /* STORAGE */);
    }
    if (!this.cascadeCurrentIndexBuffer) {
      this.cascadeCurrentIndexBuffer = Buffer3.Create(4, 0 /* STORAGE */);
    }
    if (this.cascadeIndexBuffers.length === 0) {
      for (let i2 = 0; i2 < numOfCascades; i2++) {
        const buffer = Buffer3.Create(4, 0 /* STORAGE */);
        buffer.SetArray(new Float32Array([i2]));
        this.cascadeIndexBuffers.push(buffer);
      }
    }
    lightsCSMProjectionMatrix2 = [];
    if (!this.lightProjectionMatrixBuffer) {
      this.lightProjectionMatrixBuffer = Buffer3.Create(lights.length * 4 * 4 * 16, 0 /* STORAGE */);
      this.drawIndirectShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
    }
    if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
      this.lightProjectionViewMatricesBuffer = Buffer3.Create(lights.length * 4 * 4 * 16, 0 /* STORAGE */);
    }
    for (let i2 = 0; i2 < lights.length; i2++) {
      const lightViewMatrixInverse = lights[i2].camera.viewMatrix.clone().invert();
      const lightDirection = new Vector3(0, 1, 0).applyMatrix4(lightViewMatrixInverse).mul(-1).normalize();
      const lightData = getLightViewProjections(Camera.mainCamera, lightDirection, numOfCascades, assignmentExponent, shadowDepthPercentage, zMult);
      const ld = new Float32Array(lightData.flatMap((v) => v.elements).flatMap((v) => [...v]));
      this.lightProjectionViewMatricesBuffer.SetArray(ld, i2 * numOfCascades * 4 * 16);
      lightsCSMProjectionMatrix2.push(ld);
    }
    const shadowOutput = resources.getResource(PassParams.ShadowPassDepth);
    shadowOutput.SetActiveLayer(0);
    this.drawIndirectShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    for (let i2 = 0; i2 < lights.length; i2++) {
      RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, i2 * numOfCascades * 4 * 16, 0, numOfCascades * 4 * 16);
      for (let cascadePass = 0; cascadePass < numOfCascades; cascadePass++) {
        RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer);
        RendererContext.BeginRenderPass("ShadowPass", [], { target: shadowOutput, clear: cascadePass === 0 ? true : false });
        const width = shadowOutput.width / 2;
        const height = shadowOutput.height / 2;
        let x = 0;
        let y = 0;
        if (cascadePass >= 2) x += width;
        if (cascadePass % 2 !== 0) y += height;
        RendererContext.SetViewport(x, y, width, height, 0, 1);
        const inputIndirectVertices = resources.getResource(MeshletPassParams.indirectVertices);
        const inputIndirectObjectInfo = resources.getResource(MeshletPassParams.indirectObjectInfo);
        const inputIndirectMeshMatrixInfo = resources.getResource(MeshletPassParams.indirectMeshMatrixInfo);
        const inputIndirectInstanceInfo = resources.getResource(MeshletPassParams.indirectInstanceInfo);
        const inputIndirectDrawBuffer = resources.getResource(MeshletPassParams.indirectDrawBuffer);
        this.drawIndirectShadowShader.SetBuffer("vertices", inputIndirectVertices);
        this.drawIndirectShadowShader.SetBuffer("objectInfo", inputIndirectObjectInfo);
        this.drawIndirectShadowShader.SetBuffer("meshMatrixInfo", inputIndirectMeshMatrixInfo);
        this.drawIndirectShadowShader.SetBuffer("instanceInfo", inputIndirectInstanceInfo);
        RendererContext.DrawIndirect(this.meshletGeometry, this.drawIndirectShadowShader, inputIndirectDrawBuffer);
        RendererContext.EndRenderPass();
      }
      shadowOutput.SetActiveLayer(shadowOutput.GetActiveLayer() + 1);
    }
    shadowOutput.SetActiveLayer(0);
  }
};

// src/plugins/meshlets/passes/PrepareSceneData.ts
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
    this.initialized = true;
  }
  getVertexInfo(meshlet) {
    return meshlet.vertices_gpu;
  }
  getMeshletInfo(meshlet) {
    const bv = meshlet.boundingVolume;
    const pbv = meshlet.boundingVolume;
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
      0
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
    if (textures.length === 0) return TextureArray.Create(1, 1, 1);
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

// src/plugins/meshlets/passes/MeshletDraw.ts
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
  isCullingPrepass: "isCullingPrepass"
};
var MeshletDraw = class extends RenderPass {
  name = "MeshletDraw";
  prepareSceneData;
  cullingPass;
  HiZ;
  indirectRender;
  shadows;
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
      outputs: []
    });
  }
  async init(resources) {
    this.prepareSceneData = new PrepareSceneData();
    this.cullingPass = new CullingPass();
    this.HiZ = new HiZPass();
    this.indirectRender = new IndirectGBufferPass();
    this.shadows = new MeshletsShadowMapPass();
    await this.prepareSceneData.init(resources);
    await this.cullingPass.init(resources);
    await this.HiZ.init(resources);
    await this.indirectRender.init(resources);
    await this.shadows.init(resources);
    this.initialized = true;
  }
  execute(resources) {
    this.prepareSceneData.execute(resources);
    this.cullingPass.execute(resources);
    this.indirectRender.execute(resources);
    const depthTexture = resources.getResource(PassParams.depthTexture);
    const outputDepthTexturePyramid = PassParams.depthTexturePyramid;
    this.HiZ.execute(resources, depthTexture, outputDepthTexturePyramid);
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
      "DeferredMeshRenderPass",
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
      const geometry = mesh.GetGeometry();
      const materials = mesh.GetMaterials();
      for (const material of materials) {
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
        RenderCache.renderableMeshes.push({
          type: "Draw",
          shader,
          geometry,
          mesh
        });
      }
    }
    for (const instancedMesh of instancedMeshes) {
      const geometry = instancedMesh.GetGeometry();
      const materials = instancedMesh.GetMaterials();
      for (const material of materials) {
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
        }
        RenderCache.renderableMeshes.push({
          type: "DrawInstanced",
          shader,
          geometry,
          instances: instancedMesh.instanceCount + 1,
          instancedMesh
        });
      }
    }
    resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
    resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
    resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
    resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);
    RendererContext.EndRenderPass();
  }
};

// src/TEST/Shadows.ts
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
  mainCameraGameObject.transform.position.set(0, 0, -15);
  mainCameraGameObject.name = "MainCamera";
  const camera = mainCameraGameObject.AddComponent(Camera);
  camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);
  mainCameraGameObject.transform.position.set(0, 0, 20);
  mainCameraGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
  const controls = new OrbitControls(canvas, camera);
  {
    const lightGameObject = new GameObject(scene);
    lightGameObject.transform.position.set(-4, 4, -4);
    lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    const light = lightGameObject.AddComponent(DirectionalLight);
    light.intensity = 1;
    light.color.set(1, 1, 1, 1);
    const sphereMesh = lightGameObject.AddComponent(Mesh);
    sphereMesh.enableShadows = false;
    await sphereMesh.SetGeometry(Geometry.Sphere());
    sphereMesh.AddMaterial(new PBRMaterial({ unlit: true }));
    const lightPositionDebug = new UIFolder(Debugger.ui, "Light position");
    const lightPositionDebugX = new UISliderStat(lightPositionDebug, "X:", -10, 10, 1, 0, (value) => {
      lightGameObject.transform.position.x = value;
    });
    const lightPositionDebugY = new UISliderStat(lightPositionDebug, "Y:", -10, 10, 1, 0, (value) => {
      lightGameObject.transform.position.y = value;
    });
    const lightPositionDebugZ = new UISliderStat(lightPositionDebug, "Z:", -10, 10, 1, 0, (value) => {
      lightGameObject.transform.position.z = value;
    });
    lightPositionDebug.Open();
    setInterval(() => {
      lightGameObject.transform.LookAtV1(new Vector3(0, 0, 0));
    }, 100);
  }
  {
    const planeGO = new GameObject(scene);
    planeGO.transform.scale.set(100, 100, 1);
    planeGO.transform.eulerAngles.x = -90;
    const sphereMesh = planeGO.AddComponent(Mesh);
    await sphereMesh.SetGeometry(Geometry.Plane());
    sphereMesh.AddMaterial(new PBRMaterial());
  }
  {
    const sphereGO = new GameObject(scene);
    sphereGO.transform.position.y = 2;
    const sphereMesh = sphereGO.AddComponent(Mesh);
    await sphereMesh.SetGeometry(Geometry.Sphere());
    sphereMesh.AddMaterial(new PBRMaterial());
  }
  {
    const sphereGO = new GameObject(scene);
    sphereGO.transform.position.x = -2;
    sphereGO.transform.position.y = 1;
    const sphereMesh = sphereGO.AddComponent(Mesh);
    await sphereMesh.SetGeometry(Geometry.Cube());
    sphereMesh.AddMaterial(new PBRMaterial());
  }
  const pinesGO = new GameObject(scene);
  const instancedMesh = pinesGO.AddComponent(InstancedMesh);
  await instancedMesh.SetGeometry(Geometry.Sphere());
  instancedMesh.AddMaterial(new PBRMaterial());
  const m = new Matrix4();
  const p = new Vector3();
  const q = new Quaternion();
  const s = new Vector3(1, 1, 1);
  let instances = 0;
  const count = 2;
  for (let x = 0; x < count; x++) {
    for (let z = 0; z < count; z++) {
      p.set(x, 2, z);
      m.compose(p, q, s);
      instancedMesh.SetMatrixAt(instances, m);
      instances++;
    }
  }
  scene.renderPipeline.AddPass(new MeshletDraw(), 0 /* BeforeGBuffer */);
  scene.renderPipeline.AddPass(new DeferredGBufferPass(), 0 /* BeforeGBuffer */);
  {
    const bunnyGeometry = await OBJLoaderIndexed.load("./assets/bunny.obj");
    const pinesGO2 = new GameObject(scene);
    pinesGO2.transform.position.set(4, 1, 0);
    pinesGO2.transform.scale.set(0.01, 0.01, 0.01);
    const instancedMesh2 = pinesGO2.AddComponent(MeshletMesh);
    await instancedMesh2.SetGeometry(bunnyGeometry[0].geometry);
    instancedMesh2.AddMaterial(bunnyGeometry[0].material);
  }
  const postProcessing = new PostProcessingPass();
  postProcessing.effects.push(new PostProcessingFXAA());
  scene.renderPipeline.AddPass(postProcessing, 3 /* AfterLighting */);
  scene.Start();
}
Application();
