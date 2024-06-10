// src/Events.ts
var EventSystem = class {
  static events = {};
  static on(event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
  }
  static emit(event, ...args) {
    const callbacks = this.events[event];
    if (!callbacks) return;
    for (let i = 0; i < callbacks.length; i++) {
      callbacks[i](...args);
    }
  }
};

// src/Utils.ts
var Utils = class {
  static UUID() {
    return Math.floor(Math.random() * 1e6).toString();
  }
};

// src/components/Component.ts
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
    if (this.constructor.prototype.Update !== _Component.prototype.Update) EventSystem.emit("CallUpdate", this, true);
    EventSystem.emit("AddedComponent", this, this.gameObject.scene);
  }
  Start() {
  }
  Update() {
  }
  LateUpdate() {
  }
};

// src/components/Mesh.ts
var Mesh = class extends Component {
  geometry;
  materials = [];
  AddMaterial(material) {
    if (this.materials.includes(material)) return;
    this.materials.push(material);
    EventSystem.emit("MeshUpdated", this, "shader");
  }
  GetMaterials() {
    return this.materials;
  }
  SetGeometry(geometry) {
    this.geometry = geometry;
    EventSystem.emit("MeshUpdated", this, "geometry");
  }
  GetGeometry() {
    return this.geometry;
  }
};

// src/math/Matrix4.ts
var Matrix4 = class {
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
  mul(m) {
    return this.multiplyMatrices(this, m);
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
    const fovRad = fov * (Math.PI / 180);
    const f = 1 / Math.tan(fovRad / 2);
    const depth = 1 / (near - far);
    return this.set(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * depth, -1, 0, 0, 2 * far * near * depth, 0);
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
  normalize() {
    return this.div(this.length() || 1);
  }
  distanceTo(v) {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  cross(v) {
    return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
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
    this._x = value;
    if (this.onChange) this.onChange();
  }
  set y(value) {
    this._y = value;
    if (this.onChange) this.onChange();
  }
  set z(value) {
    this._z = value;
    if (this.onChange) this.onChange();
  }
  constructor(onChange, x = 0, y = 0, z = 0) {
    super(x, y, z);
    this.onChange = onChange;
  }
};

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
    this._x = value;
    if (this.onChange) this.onChange();
  }
  set y(value) {
    this._y = value;
    if (this.onChange) this.onChange();
  }
  set z(value) {
    this._z = value;
    if (this.onChange) this.onChange();
  }
  set w(value) {
    this._w = value;
    if (this.onChange) this.onChange();
  }
  constructor(onChange, x = 0, y = 0, z = 0, w = 1) {
    super(x, y, z, w);
    this.onChange = onChange;
  }
};

// src/components/Transform.ts
var Transform = class extends Component {
  up = new Vector3(0, 1, 0);
  forward = new Vector3(0, 0, 1);
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
  onEulerChanged() {
    this._rotation.fromEuler(this._eulerAngles, true);
    EventSystem.emit("CallUpdate", this, true);
  }
  onRotationChanged() {
    const c = this._rotation.toEuler(void 0, true);
    this._eulerAngles = new ObservableVector3(() => {
      this.onEulerChanged();
    }, c.x, c.y, c.z);
    EventSystem.emit("CallUpdate", this, true);
  }
  onChanged() {
    EventSystem.emit("CallUpdate", this, true);
  }
  UpdateMatrices() {
    this._localToWorldMatrix.compose(this.position, this.rotation, this.scale);
    this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();
  }
  Update() {
    this.UpdateMatrices();
    EventSystem.emit("CallUpdate", this, false);
  }
  LookAt(target) {
    this.rotation.lookAt(this.position, target, this.up);
    this.onChanged();
  }
};

// src/math/Color.ts
var Color = class {
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
};

// src/renderer/webgpu/WEBGPURenderer.ts
var adapter = navigator ? await navigator.gpu.requestAdapter() : null;
var device = adapter ? await adapter.requestDevice() : null;
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
  BeginRenderFrame() {
    if (_WEBGPURenderer.activeCommandEncoder !== null) {
      console.warn("Only one active encoder pipeline is allowed.");
      return;
    }
    _WEBGPURenderer.activeCommandEncoder = _WEBGPURenderer.device.createCommandEncoder();
  }
  EndRenderFrame() {
    if (_WEBGPURenderer.activeCommandEncoder === null) {
      console.log("There is no active render pass.");
      return;
    }
    _WEBGPURenderer.device.queue.submit([_WEBGPURenderer.activeCommandEncoder.finish()]);
    _WEBGPURenderer.activeCommandEncoder = null;
  }
};

// src/renderer/Renderer.ts
var Renderer = class _Renderer {
  static type;
  static width;
  static height;
  static Create(canvas2, type) {
    _Renderer.type = type;
    _Renderer.width = canvas2.width;
    _Renderer.height = canvas2.height;
    if (type === "webgpu") return new WEBGPURenderer(canvas2);
    throw Error("Unknown render api type.");
  }
  static get SwapChainFormat() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.presentationFormat;
    throw Error("Unknown render api type.");
  }
  BeginRenderFrame() {
  }
  EndRenderFrame() {
  }
};

// src/renderer/webgpu/WEBGPUTexture.ts
var WEBGPUTexture = class _WEBGPUTexture {
  id = Utils.UUID();
  width;
  height;
  type;
  buffer;
  view;
  constructor(width, height, format, type) {
    this.type = type;
    let textureUsage = GPUTextureUsage.COPY_DST;
    let textureType = GPUTextureUsage.TEXTURE_BINDING;
    if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
    else if (type === 1 /* DEPTH */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    else if (type === 2 /* RENDER_TARGET */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    else throw Error(`Unknown texture format ${format}`);
    this.buffer = WEBGPURenderer.device.createTexture({
      size: [width, height],
      format,
      usage: textureUsage | textureType
    });
    this.width = width;
    this.height = height;
  }
  GetBuffer() {
    return this.buffer;
  }
  GetView() {
    if (!this.view) this.view = this.buffer.createView();
    return this.view;
  }
  // Format and types are very limited for now
  // https://github.com/gpuweb/gpuweb/issues/2322
  static FromImageBitmap(imageBitmap, width, height) {
    const texture = new _WEBGPUTexture(width, height, Renderer.SwapChainFormat, 2 /* RENDER_TARGET */);
    WEBGPURenderer.device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: texture.GetBuffer() },
      [imageBitmap.width, imageBitmap.height]
    );
    return texture;
  }
};

// src/renderer/Texture.ts
var Texture2 = class {
  id;
  width;
  height;
  static Create(width, height, format = "rgba32uint") {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, 0 /* IMAGE */);
    throw Error("Renderer type invalid");
  }
  static async Load(url) {
    const response = await fetch(url);
    const imageBitmap = await createImageBitmap(await response.blob());
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height);
    throw Error("Renderer type invalid");
  }
};
var DepthTexture = class extends Texture2 {
  static Create(width, height, format = "depth24plus") {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, 1 /* DEPTH */);
    throw Error("Renderer type invalid");
  }
};
var RenderTexture = class extends Texture2 {
  static Create(width, height, format = "rgba32uint") {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, 2 /* RENDER_TARGET */);
    throw Error("Renderer type invalid");
  }
};

// src/components/Camera.ts
var Camera = class _Camera extends Component {
  renderTarget = null;
  depthTarget = null;
  backgroundColor = new Color(0.2, 0.2, 0.2, 1);
  fov = 60;
  aspect = 1;
  near = 0.3;
  far = 1e5;
  projectionMatrix = new Matrix4();
  viewMatrix = new Matrix4();
  static mainCamera;
  Start() {
    if (_Camera.mainCamera === this) this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
  }
  Update() {
    this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far).transpose();
    this.viewMatrix.copy(this.transform.worldToLocalMatrix);
  }
};

// src/GameObject.ts
var GameObject = class {
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
  // TODO: Fix: A extends B, B extends Component, GetComponent(A) wont work
  AddComponent(component) {
    try {
      let componentInstance = new component(this);
      if (!(componentInstance instanceof Component)) throw Error("Invalid component");
      if (componentInstance instanceof Transform) throw Error("A GameObject can only have one Transform");
      if (!this.componentsMapped.has(component.name)) this.componentsMapped.set(component.name, []);
      this.componentsMapped.get(component.name)?.push(componentInstance);
      this.componentsArray.push(componentInstance);
      if (componentInstance instanceof Camera && !Camera.mainCamera) Camera.mainCamera = componentInstance;
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
};

// src/renderer/RenderGraph.ts
var RenderPass = class {
  name;
  inputs = [];
  outputs = [];
  constructor(params) {
    if (params.inputs) this.inputs = params.inputs;
    if (params.outputs) this.outputs = params.outputs;
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
  execute() {
    const sortedPasses = this.topologicalSort();
    for (const pass of sortedPasses) {
      const inputs = pass.inputs.map((value) => this.resourcePool.getResource(value));
      pass.execute(this.resourcePool, ...inputs, ...pass.outputs);
    }
  }
  topologicalSort() {
    const order = [];
    const visited = {};
    const tempMark = {};
    const visit = (pass) => {
      if (tempMark[pass.name]) {
        throw new Error("Cycle detected in graph");
      }
      if (!visited[pass.name]) {
        tempMark[pass.name] = true;
        this.passes.filter(
          (p) => {
            return pass.outputs && p.inputs?.some((input) => pass.outputs.includes(input));
          }
        ).forEach(visit);
        visited[pass.name] = true;
        tempMark[pass.name] = false;
        order.unshift(pass);
      }
    };
    this.passes.forEach((pass) => {
      if (!visited[pass.name]) {
        visit(pass);
      }
    });
    return order;
  }
};

// src/renderer/webgpu/WEBGPUBuffer.ts
var WEBGPUBuffer = class {
  buffer;
  data;
  size;
  constructor(sizeInBytes, type) {
    let usage = GPUBufferUsage.STORAGE;
    if (type == 1 /* VERTEX */) usage = GPUBufferUsage.VERTEX;
    else if (type == 2 /* INDEX */) usage = GPUBufferUsage.INDEX;
    this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage: usage | GPUBufferUsage.COPY_DST });
    this.size = sizeInBytes;
  }
  GetBuffer() {
    return this.buffer;
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
    this.data = array;
    WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
  }
};

// src/renderer/Buffer.ts
var Buffer2 = class {
  data;
  size;
  static Create(size, type) {
    if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type);
    else throw Error("Renderer type invalid");
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
  }
};

// src/renderer/passes/MeshRenderCache.ts
var MeshRenderCache = class {
  static renderable = [];
  static renderableInstanced = /* @__PURE__ */ new Map();
  static transformMap = /* @__PURE__ */ new Map();
  static GetRenderable() {
    return this.renderable;
  }
  static GetRenderableInstanced() {
    return this.renderableInstanced;
  }
  static MAX_INSTANCE_COUNT = 1e6;
  static AddRenderable(transform, geometry, shader) {
    const renderable = { transform, geometry, shader, modelMatrixBuffer: Buffer2.Create(4 * 16, 0 /* STORAGE */) };
    this.renderable.push(renderable);
    this.transformMap.set(transform, { buffer: renderable.modelMatrixBuffer, index: -1 });
  }
  static AddRenderableInstanced(transform, geometry, shader) {
    const key = `${geometry.id}-${shader.id}`;
    let renderableInstanced = this.renderableInstanced.get(key);
    if (!renderableInstanced) {
      renderableInstanced = {
        transform: [],
        geometry,
        shader,
        modelMatrixBuffer: Buffer2.Create(this.MAX_INSTANCE_COUNT * 4 * 16, 0 /* STORAGE */)
      };
    }
    if (renderableInstanced.transform.length > this.MAX_INSTANCE_COUNT) {
      console.warn("Cannot exceed MAX_INSTANCE_COUNT.");
      return;
    }
    renderableInstanced.transform.push(transform);
    this.renderableInstanced.set(key, renderableInstanced);
    this.transformMap.set(transform, { buffer: renderableInstanced.modelMatrixBuffer, index: renderableInstanced.transform.length - 1 });
  }
  static AddMesh(mesh) {
    const geometry = mesh.GetGeometry();
    const materials = mesh.GetMaterials();
    if (!geometry || !geometry.attributes.get("position")) return;
    if (!materials || materials.length === 0) return;
    const transform = mesh.transform;
    for (const material of materials) {
      if (material.shader.autoInstancing) this.AddRenderableInstanced(transform, geometry, material.shader);
      else this.AddRenderable(transform, geometry, material.shader);
    }
  }
  static UpdateTransform(transform) {
    const transformMap = this.transformMap.get(transform);
    if (!transformMap) return;
    if (transformMap.index === -1) transformMap.buffer.SetArray(transform.localToWorldMatrix.elements);
    else transformMap.buffer.SetArray(transform.localToWorldMatrix.elements, 4 * 16 * transformMap.index);
  }
};

// src/renderer/webgpu/WEBGPUShader.ts
var WGSLShaderAttributeFormat = {
  vec2: "float32x2",
  vec3: "float32x3",
  vec4: "float32x4"
};
var WEBGPUShader = class {
  id = Utils.UUID();
  autoInstancing = false;
  needsUpdate = false;
  vertexEntrypoint;
  fragmentEntrypoint;
  module;
  params;
  attributeMap = /* @__PURE__ */ new Map();
  uniformMap = /* @__PURE__ */ new Map();
  valueArray = new Float32Array(1);
  _pipeline = null;
  _bindGroup = null;
  get pipeline() {
    return this._pipeline;
  }
  get bindGroup() {
    return this._bindGroup;
  }
  constructor(params) {
    this.params = params;
    this.module = WEBGPURenderer.device.createShaderModule({ code: this.params.code });
    this.vertexEntrypoint = this.params.vertexEntrypoint;
    this.fragmentEntrypoint = this.params.fragmentEntrypoint;
    if (this.params.attributes) this.attributeMap = new Map(Object.entries(this.params.attributes));
    if (this.params.uniforms) this.uniformMap = new Map(Object.entries(this.params.uniforms));
  }
  RebuildDescriptors() {
    console.warn("building");
    let targets = [];
    for (const output of this.params.colorOutputs) targets.push({ format: output.format });
    const pipelineDescriptor = {
      layout: "auto",
      vertex: { module: this.module, entryPoint: this.vertexEntrypoint },
      fragment: { module: this.module, entryPoint: this.fragmentEntrypoint, targets },
      primitive: {
        topology: this.params.topology ? this.params.topology : "triangle-list",
        frontFace: this.params.frontFace ? this.params.frontFace : "ccw",
        cullMode: this.params.cullMode ? this.params.cullMode : "back"
      }
    };
    if (this.params.depthOutput) pipelineDescriptor.depthStencil = { depthWriteEnabled: true, depthCompare: "less", format: this.params.depthOutput };
    const buffers = [];
    for (const [_, attribute] of this.attributeMap) {
      buffers.push({ arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] });
    }
    pipelineDescriptor.vertex.buffers = buffers;
    this._pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
    const bindGroupEntries = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!uniform.buffer) continue;
      if (uniform.buffer instanceof GPUBuffer) bindGroupEntries.push({ binding: uniform.location, resource: { buffer: uniform.buffer } });
      else if (uniform.buffer instanceof GPUTexture) bindGroupEntries.push({ binding: uniform.location, resource: uniform.buffer.createView() });
      else if (uniform.buffer instanceof GPUSampler) bindGroupEntries.push({ binding: uniform.location, resource: uniform.buffer });
    }
    this._bindGroup = WEBGPURenderer.device.createBindGroup({
      layout: this._pipeline.getBindGroupLayout(0),
      entries: bindGroupEntries
    });
    this.needsUpdate = false;
  }
  GetAttributeSlot(name) {
    return this.attributeMap.get(name)?.location;
  }
  GetValidUniform(name) {
    const uniform = this.uniformMap.get(name);
    if (!uniform) throw Error(`Shader does not have a parameter named ${name}`);
    return uniform;
  }
  SetUniformDataFromArray(name, data, dataOffset, bufferOffset = 0, size) {
    const uniform = this.GetValidUniform(name);
    if (!uniform.buffer) {
      let usage = GPUBufferUsage.COPY_DST;
      if (uniform.type === "uniform") usage |= GPUBufferUsage.UNIFORM;
      else if (uniform.type === "storage") usage |= GPUBufferUsage.STORAGE;
      uniform.buffer = WEBGPURenderer.device.createBuffer({ size: data.byteLength, usage });
      this.needsUpdate = true;
    }
    WEBGPURenderer.device.queue.writeBuffer(uniform.buffer, bufferOffset, data, dataOffset, size);
  }
  SetUniformDataFromBuffer(name, data) {
    const binding = this.GetValidUniform(name);
    if (!binding.buffer || binding.buffer !== data.GetBuffer()) {
      binding.buffer = data.GetBuffer();
      this.needsUpdate = true;
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
  OnPreRender(geometry) {
    if (this.needsUpdate || !this.pipeline || !this.bindGroup) this.RebuildDescriptors();
  }
};

// src/renderer/webgpu/shaders/BasicShader.wgsl
var BasicShader_default = "struct VertexInput {\n    @location(0) position : vec3<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vPosition : vec3<f32>,\n    @location(1) vNormal : vec3<f32>,\n    @location(2) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n\n@group(0) @binding(3) var albedoSampler: sampler;\n@group(0) @binding(4) var albedoMap: texture_2d<f32>;\n@group(0) @binding(5) var<storage, read> albedoColor: vec4f;\n@group(0) @binding(6) var<storage> useAlbedoMap: u32;\n\n@vertex\nfn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {\n    var output : VertexOutput;\n\n    var modelMatrixInstance = modelMatrix[instanceIdx];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n\n    output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);\n    \n    // let worldPosition = (modelMatrixInstance * vec4(input.position, 1.0)).xyz;\n    output.vPosition = (modelMatrixInstance * vec4(input.position, 1.0)).xyz;\n    output.vNormal = normalize((modelMatrixInstance * vec4(input.normal, 0.0)).xyz);\n    output.vUv = input.uv;\n    \n    // output.vPosition = input.position;\n    // output.vNormal = input.normal;\n\n    return output;\n}\n\nstruct FragmentOutput {\n    @location(0) position : vec4f,\n    @location(1) albedo : vec4f,\n    @location(2) normal : vec4f,\n};\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> FragmentOutput {\n    var output: FragmentOutput;\n    output.position = vec4(input.vPosition, 1.0);\n    output.normal = normalize(vec4(input.vNormal, 1.0));\n\n    var albedo = albedoColor;\n    if (useAlbedoMap > 0) {\n        albedo *= textureSample(albedoMap, albedoSampler, input.vUv);\n        // albedo *= textureLoad(albedoMap, vec2i(floor(input.position.xy)), 0);\n    }\n    \n    output.albedo = albedo;\n    return output;\n}";

// src/renderer/webgpu/shaders/WireframeShader.wgsl
var WireframeShader_default = "struct VertexInput {\n    @builtin(instance_index) instanceID : u32,\n	@builtin(vertex_index) vertexID : u32,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n@group(0) @binding(3) var<storage, read> indices: array<u32>;\n@group(0) @binding(4) var<storage, read> positions: array<f32>;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n	var localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);\n\n	var triangleIndex = input.vertexID / 6u;\n	var localVertexIndex = input.vertexID % 6u;\n\n	var elementIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];\n	var elementIndex = indices[elementIndexIndex];\n\n	var position = vec4<f32>(\n		positions[3u * elementIndex + 0u],\n		positions[3u * elementIndex + 1u],\n		positions[3u * elementIndex + 2u],\n		1.0\n	);\n\n	var output : VertexOutput;\n    var modelMatrixInstance = modelMatrix[input.instanceID];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n	output.position = projectionMatrix * modelViewMatrix * position;\n\n	return output;\n}\n\n@fragment\nfn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {\n    return vec4(1.0, 0.0, 0.0, 1.0);\n}";

// src/renderer/webgpu/shaders/WEBGPUShaders.ts
var WEBGPUShaders = class {
  static BasicShaderCode = BasicShader_default;
  static WireframeShaderCode = WireframeShader_default;
};

// src/renderer/Shader.ts
var Shader = class {
  id;
  params;
  autoInstancing = false;
  static Create(params) {
    if (Renderer.type === "webgpu") return new WEBGPUShader(params);
    throw Error("Unknown api");
  }
  SetValue(name, value) {
  }
  SetMatrix4(name, matrix) {
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
var ShaderCode = class {
  static MeshBasicMaterial() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.BasicShaderCode;
    throw Error("Unknown api");
  }
};

// src/renderer/webgpu/WEBGPURendererContext.ts
var WEBGPURendererContext = class {
  static activeRenderPass = null;
  static BeginRenderPass(name, renderTargets, depthTarget) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.activeRenderPass) throw Error("There is already an active render pass");
    const renderPassDescriptor = { colorAttachments: [], label: "RenderPassDescriptor: " + name };
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
  }
  static DrawGeometry(geometry, shader, instanceCount = 1) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    shader.OnPreRender(geometry);
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    this.activeRenderPass.setPipeline(shader.pipeline);
    if (shader.bindGroup) this.activeRenderPass.setBindGroup(0, shader.bindGroup);
    for (const [name, attribute] of geometry.attributes) {
      const attributeSlot = shader.GetAttributeSlot(name);
      if (attributeSlot === void 0) continue;
      const attributeBuffer = attribute.buffer;
      this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
    }
    if (!shader.params.topology || shader.params.topology === "triangle-list" /* Triangles */) {
      if (!geometry.index) throw Error("Drawing without indices is not supported yet");
      const indexBuffer = geometry.index.buffer;
      this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
      this.activeRenderPass.drawIndexed(indexBuffer.size / 4, instanceCount);
    } else if (shader.params.topology === "line-list" /* Lines */) {
      if (!geometry.index) throw Error("Cannot draw lines without index buffer");
      const numTriangles = geometry.index.array.length / 3;
      this.activeRenderPass.draw(6 * numTriangles, instanceCount);
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
};

// src/renderer/RendererContext.ts
var RendererContext = class {
  static BeginRenderPass(name, renderTargets, depthTarget) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.BeginRenderPass(name, renderTargets, depthTarget);
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
};

// src/renderer/passes/MeshRenderPass.ts
var MeshRenderPass = class extends RenderPass {
  name = "MeshRenderPass";
  gbufferPositionRT;
  gbufferAlbedoRT;
  gbufferNormalRT;
  gbufferDepthDT;
  constructor(inputCamera, outputGBufferPosition, outputGBufferAlbedo, outputGBufferNormal, outputGBufferDepth) {
    super({ inputs: [inputCamera], outputs: [outputGBufferPosition, outputGBufferAlbedo, outputGBufferNormal, outputGBufferDepth] });
    EventSystem.on("MeshUpdated", (mesh, type) => {
      MeshRenderCache.AddMesh(mesh);
    });
    EventSystem.on("CallUpdate", (component, flag) => {
      if (flag === false && component instanceof Transform) MeshRenderCache.UpdateTransform(component);
    });
    this.gbufferPositionRT = RenderTexture.Create(Renderer.width, Renderer.height, "rgba16float");
    this.gbufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, "rgba16float");
    this.gbufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, "rgba16float");
    this.gbufferDepthDT = DepthTexture.Create(Renderer.width, Renderer.height);
  }
  execute(resources, inputCamera, outputGBufferPosition, outputGBufferAlbedo, outputGBufferNormal, outputGBufferDepth) {
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const renderTarget = inputCamera.renderTarget;
    const depthTarget = inputCamera.depthTarget;
    const backgroundColor = inputCamera.backgroundColor;
    const projectionMatrix = inputCamera.projectionMatrix;
    const viewMatrix = inputCamera.viewMatrix;
    RendererContext.BeginRenderPass(
      "MeshRenderPass",
      [
        { target: this.gbufferPositionRT, clear: true, color: backgroundColor },
        { target: this.gbufferAlbedoRT, clear: true, color: backgroundColor },
        { target: this.gbufferNormalRT, clear: true, color: backgroundColor }
      ],
      { target: this.gbufferDepthDT, clear: true }
    );
    for (const renderable of MeshRenderCache.GetRenderable()) {
      const geometry = renderable.geometry;
      const shader = renderable.shader;
      shader.SetMatrix4("projectionMatrix", projectionMatrix);
      shader.SetMatrix4("viewMatrix", viewMatrix);
      shader.SetBuffer("modelMatrix", renderable.modelMatrixBuffer);
      RendererContext.DrawGeometry(geometry, shader, 1);
    }
    for (const [_, renderableInstanced] of MeshRenderCache.GetRenderableInstanced()) {
      const geometry = renderableInstanced.geometry;
      const shader = renderableInstanced.shader;
      shader.SetMatrix4("projectionMatrix", projectionMatrix);
      shader.SetMatrix4("viewMatrix", viewMatrix);
      shader.SetBuffer("modelMatrix", renderableInstanced.modelMatrixBuffer);
      RendererContext.DrawGeometry(geometry, shader, renderableInstanced.transform.length);
    }
    RendererContext.EndRenderPass();
    resources.setResource(outputGBufferPosition, this.gbufferPositionRT);
    resources.setResource(outputGBufferAlbedo, this.gbufferAlbedoRT);
    resources.setResource(outputGBufferNormal, this.gbufferNormalRT);
    resources.setResource(outputGBufferDepth, this.gbufferDepthDT);
  }
};

// src/Geometry.ts
var GeometryAttribute = class {
  array;
  buffer;
  constructor(array, type) {
    this.array = array;
    this.buffer = Buffer2.Create(array.byteLength, type);
    this.buffer.SetArray(this.array);
  }
  GetBuffer() {
    return this.buffer;
  }
};
var VertexAttribute = class extends GeometryAttribute {
  constructor(array) {
    super(array, 1 /* VERTEX */);
  }
};
var IndexAttribute = class extends GeometryAttribute {
  constructor(array) {
    super(array, 2 /* INDEX */);
  }
};
var Geometry = class _Geometry {
  id = Utils.UUID();
  index;
  attributes = /* @__PURE__ */ new Map();
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
    for (let i = 0; i < trianglesCount; i++) {
      let index1 = indexAttrData[i * 3];
      let index2 = indexAttrData[i * 3 + 1];
      let index3 = indexAttrData[i * 3 + 2];
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
  static Cube() {
    const vertices = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5]);
    const indices = new Uint32Array([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22, 21, 22, 23, 21]);
    const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0]);
    const geometry = new _Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.index = new IndexAttribute(indices);
    geometry.ComputeNormals();
    return geometry;
  }
  static Plane() {
    const vertices = new Float32Array([
      -1,
      1,
      0,
      // Top-left
      1,
      1,
      0,
      // Top-right
      -1,
      -1,
      0,
      // Bottom-left
      1,
      -1,
      0
      // Bottom-right
    ]);
    const indices = new Uint32Array([
      0,
      2,
      1,
      // First triangle
      2,
      3,
      1
      // Second triangle
    ]);
    const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    const geometry = new _Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.index = new IndexAttribute(indices);
    geometry.ComputeNormals();
    return geometry;
  }
};

// src/renderer/webgpu/WEBGPUTextureSampler.ts
var WEBGPUTextureSampler = class {
  sampler;
  constructor() {
    this.sampler = WEBGPURenderer.device.createSampler({
      magFilter: "linear",
      minFilter: "linear"
    });
  }
  GetBuffer() {
    return this.sampler;
  }
};

// src/renderer/TextureSampler.ts
var TextureSampler = class {
  static Create() {
    if (Renderer.type === "webgpu") return new WEBGPUTextureSampler();
    throw Error("Renderer type invalid");
  }
};

// src/components/Light.ts
var Light = class extends Component {
  camera;
  color = new Color(1, 1, 1);
  intensity = 1;
  radius = 1;
  Start() {
    this.camera = this.gameObject.AddComponent(Camera);
    this.camera.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height);
    this.camera.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
  }
};

// src/renderer/passes/LightingPass.ts
var LightingPass = class extends RenderPass {
  name = "LightingPass";
  shader;
  sampler;
  quadGeometry;
  constructor(inputGBufferPosition, inputGBufferAlbedo, inputGBufferNormal, inputGBufferDepth) {
    super({ inputs: [inputGBufferPosition, inputGBufferAlbedo, inputGBufferNormal, inputGBufferDepth] });
    const code = `
        @group(0) @binding(0) var textureSampler: sampler;

        @group(0) @binding(1) var positionTexture: texture_2d<f32>;
        @group(0) @binding(2) var albedoTexture: texture_2d<f32>;
        @group(0) @binding(3) var normalTexture: texture_2d<f32>;
        @group(0) @binding(4) var depthTexture: texture_depth_2d;

        struct Light {
            position: vec4<f32>,
            color: vec4<f32>,
        };

        @group(0) @binding(5) var<storage, read> lights: array<Light>;
        @group(0) @binding(6) var<storage, read> lightCount: u32;
        
        @vertex
        fn vertexMain(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
            return vec4(position, 1.0);
        }
        
        @fragment
        fn fragmentMain(@builtin(position) position : vec4<f32>) -> @location(0) vec4<f32> {
            let uv = position.xy / vec2<f32>(textureDimensions(albedoTexture));
            var positionA = textureSample(positionTexture, textureSampler, uv).xyz;
            var albedo = textureSample(albedoTexture, textureSampler, uv).rgb;
            var normal = textureSample(normalTexture, textureSampler, uv).xyz;
            var depth = vec3(textureSample(depthTexture, textureSampler, uv));

            var lighting = albedo.rgb * 0.1;
            for (var i = 0u; i < lightCount; i++) {
                var lightPosition = lights[i].position.xyz;
                var lightColor = lights[i].color.rgb;
                var radius = lights[i].color.a;

                let L = lightPosition - positionA;
                let distance = length(L);
                if (distance > radius) { continue; }
                let lambert = max(dot(normal, normalize(L)), 0.0);
                lighting += vec3f(lambert * pow(1.0 - distance / radius, 2.0) * lightColor * albedo);
            }

            return vec4(lighting, 1.0);
            // return vec4(normal * 0.5 + 0.5, 1.0); // Normal visualization
            // return vec4(normal, 1.0);
            // return vec4(positionA, 1.0);
        }
        `;
    this.shader = Shader.Create({
      code,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" }
      },
      uniforms: {
        textureSampler: { location: 0, type: "storage" },
        positionTexture: { location: 1, type: "storage" },
        albedoTexture: { location: 2, type: "storage" },
        normalTexture: { location: 3, type: "storage" },
        depthTexture: { location: 4, type: "storage" },
        lights: { location: 5, type: "storage" },
        lightCount: { location: 6, type: "storage" }
      },
      colorOutputs: [{ format: Renderer.SwapChainFormat }]
    });
    this.sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", this.sampler);
    this.quadGeometry = Geometry.Plane();
  }
  execute(resources, inputGBufferPosition, inputGBufferAlbedo, inputGBufferNormal, inputGBufferDepth) {
    const camera = Camera.mainCamera;
    const renderTarget = camera.renderTarget;
    const backgroundColor = camera.backgroundColor;
    RendererContext.BeginRenderPass("LightingPass", [{ clear: true, color: backgroundColor }]);
    this.shader.SetTexture("positionTexture", inputGBufferPosition);
    this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
    this.shader.SetTexture("normalTexture", inputGBufferNormal);
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    const lights = Camera.mainCamera.gameObject.scene.GetComponents(Light);
    const lightBuffer = new Float32Array(lights.length * (4 + 4));
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      lightBuffer.set([
        light.transform.position.x,
        light.transform.position.y,
        light.transform.position.z,
        light.intensity,
        light.color.r,
        light.color.g,
        light.color.b,
        light.radius
      ], i * (4 + 4));
    }
    this.shader.SetArray("lights", lightBuffer);
    this.shader.SetArray("lightCount", new Uint32Array([lights.length]));
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
  }
};

// src/renderer/RenderingPipeline.ts
var SetMeshRenderCameraPass = class extends RenderPass {
  name = "SetMeshRenderCameraPass";
  execute(resources, cameraOutput) {
    resources.setResource(cameraOutput, Camera.mainCamera);
  }
};
var RenderingPipeline = class {
  renderer;
  renderGraph;
  passes = {
    SetMainCamera: new SetMeshRenderCameraPass({ outputs: ["MainCamera" /* MainCamera */] }),
    MeshRenderPass: new MeshRenderPass("MainCamera" /* MainCamera */, "GBufferPosition" /* GBufferPosition */, "GBufferAlbedo" /* GBufferAlbedo */, "GBufferNormal" /* GBufferNormal */, "GBufferDepth" /* GBufferDepth */),
    LightingPass: new LightingPass("GBufferPosition" /* GBufferPosition */, "GBufferAlbedo" /* GBufferAlbedo */, "GBufferNormal" /* GBufferNormal */, "GBufferDepth" /* GBufferDepth */)
  };
  constructor(renderer) {
    this.renderer = renderer;
    this.renderGraph = new RenderGraph();
    for (const pass of Object.keys(this.passes)) {
      this.renderGraph.addPass(this.passes[pass]);
    }
  }
  Render(scene) {
    this.renderer.BeginRenderFrame();
    this.renderGraph.execute();
    this.renderer.EndRenderFrame();
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
    EventSystem.on("CallUpdate", (component, flag) => {
      if (flag) this.toUpdate.set(component, true);
      else this.toUpdate.delete(component);
    });
    EventSystem.on("AddedComponent", (component, scene) => {
      if (scene !== this) return;
      let componentsArray = this.componentsByType.get(component.name) || [];
      componentsArray.push(component);
      this.componentsByType.set(component.name, componentsArray);
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
  /** The center point to orbit around. Default is `0, 0, 0` */
  center = new Vector3();
  orbitSpeed = 1;
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
  _element = null;
  _pointers = /* @__PURE__ */ new Map();
  get _focused() {
    return document.activeElement === this._element;
  }
  constructor(camera) {
    this._camera = camera;
    this._camera.transform.LookAt(this.center);
    const properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    for (const property of properties) {
      if (typeof this[property] === "function") this[property] = this[property].bind(this);
    }
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
  orbit(deltaX, deltaY) {
    const offset = this._camera.transform.position.sub(this.center);
    const radius = offset.length();
    const deltaPhi = deltaY * (this.orbitSpeed / this._element.clientHeight);
    const deltaTheta = deltaX * (this.orbitSpeed / this._element.clientHeight);
    const phi = Math.min(this.maxPhi, Math.max(this.minPhi, Math.acos(offset.y / radius) - deltaPhi)) || Number.EPSILON;
    const theta = Math.min(this.maxTheta, Math.max(this.minTheta, Math.atan2(offset.z, offset.x) + deltaTheta)) || Number.EPSILON;
    this._camera.transform.position.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).mul(radius);
    this._camera.transform.position.add(this.center);
    this._camera.transform.LookAt(this.center);
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
    if (!this.enableZoom || !this._focused) return;
    this.zoom(1 + event.deltaY / 720);
  }
  _onPointerMove(event) {
    if (!this._focused) return;
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
    } else if (event.pointerType !== "touch") {
      this._element.setPointerCapture(event.pointerId);
    }
    this._pointers.set(event.pointerId, event);
  }
  _onPointerUp(event) {
    this._element.style.cursor = "grab";
    this._element.style.touchAction = this.enableZoom || this.enablePan ? "none" : "pinch-zoom";
    if (event.pointerType !== "touch") this._element.releasePointerCapture(event.pointerId);
    this._pointers.delete(event.pointerId);
  }
  /**
   * Connects controls' event handlers, enabling interaction.
   */
  connect(element) {
    element.addEventListener("contextmenu", this._onContextMenu);
    element.addEventListener("wheel", this._onScroll, { passive: true });
    element.addEventListener("pointermove", this._onPointerMove);
    element.addEventListener("pointerup", this._onPointerUp);
    element.tabIndex = 0;
    this._element = element;
    this._element.style.cursor = "grab";
  }
};

// src/renderer/Material.ts
var Material = class {
  shader;
};
var MeshBasicMaterial = class extends Material {
  constructor(params) {
    super();
    const shaderParams = {
      code: ShaderCode.MeshBasicMaterial(),
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
        projectionMatrix: { location: 0, type: "storage" },
        viewMatrix: { location: 1, type: "storage" },
        modelMatrix: { location: 2, type: "storage" },
        albedoSampler: { location: 3, type: "sampler" },
        albedoMap: { location: 4, type: "texture" },
        albedoColor: { location: 5, type: "storage" },
        useAlbedoMap: { location: 6, type: "storage" }
      }
    };
    this.shader = Shader.Create(shaderParams);
    const albedoColor = params?.albedoColor ? params.albedoColor : new Color(1, 1, 1, 1);
    const albedoMap = params?.albedoMap ? params.albedoMap : Texture2.Create(10, 10, Renderer.SwapChainFormat);
    const useAlbedoMap = params?.albedoMap ? 1 : 0;
    const albedoSampler = TextureSampler.Create();
    this.shader.SetArray("albedoColor", albedoColor.elements);
    this.shader.SetTexture("albedoMap", albedoMap);
    this.shader.SetSampler("albedoSampler", albedoSampler);
    this.shader.SetValue("useAlbedoMap", useAlbedoMap);
  }
};

// src/TEST/assets/textures/Di-3d.png
var Di_3d_default = "./Di-3d-XIYZCAFA.png";

// src/TEST/Cornell.ts
var canvas = document.createElement("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
document.body.appendChild(canvas);
async function Application() {
  const renderer = Renderer.Create(canvas, "webgpu");
  const scene = new Scene(renderer);
  const mainCameraGameObject = new GameObject(scene);
  mainCameraGameObject.transform.position.z = 10;
  mainCameraGameObject.name = "MainCamera";
  const camera = mainCameraGameObject.AddComponent(Camera);
  camera.aspect = canvas.width / canvas.height;
  const controls = new OrbitControls(camera);
  controls.connect(canvas);
  const planeGeometry = Geometry.Plane();
  const cubeGeometry = Geometry.Cube();
  const lightGameObject = new GameObject(scene);
  lightGameObject.transform.position.set(-2, 0, 0);
  const light = lightGameObject.AddComponent(Light);
  light.radius = 10;
  light.color.set(0, 1, 0, 1);
  {
    const lightGameObject2 = new GameObject(scene);
    lightGameObject2.transform.position.set(2, 0, 0);
    const light2 = lightGameObject2.AddComponent(Light);
    light2.radius = 10;
    light2.color.set(1, 0, 0, 1);
  }
  const floor = new GameObject(scene);
  floor.transform.scale.set(5, 5, 5);
  floor.transform.position.y = -5;
  floor.transform.eulerAngles.x = -90;
  const meshbottom = floor.AddComponent(Mesh);
  meshbottom.SetGeometry(planeGeometry);
  meshbottom.AddMaterial(new MeshBasicMaterial());
  const left = new GameObject(scene);
  left.transform.scale.set(5, 5, 5);
  left.transform.position.x = -5;
  left.transform.eulerAngles.y = 90;
  const meshleft = left.AddComponent(Mesh);
  meshleft.SetGeometry(planeGeometry);
  meshleft.AddMaterial(new MeshBasicMaterial());
  const right = new GameObject(scene);
  right.transform.scale.set(5, 5, 5);
  right.transform.position.x = 5;
  right.transform.eulerAngles.y = -90;
  const meshright = right.AddComponent(Mesh);
  meshright.SetGeometry(planeGeometry);
  meshright.AddMaterial(new MeshBasicMaterial());
  const back = new GameObject(scene);
  back.transform.scale.set(5, 5, 5);
  back.transform.position.z = -5;
  const meshback = back.AddComponent(Mesh);
  meshback.SetGeometry(planeGeometry);
  meshback.AddMaterial(new MeshBasicMaterial());
  const top = new GameObject(scene);
  top.transform.scale.set(5, 5, 5);
  top.transform.position.y = 5;
  top.transform.eulerAngles.x = 90;
  const meshtop = top.AddComponent(Mesh);
  meshtop.SetGeometry(planeGeometry);
  meshtop.AddMaterial(new MeshBasicMaterial());
  Texture2.Load(Di_3d_default).then((texture) => {
    const cube = new GameObject(scene);
    cube.transform.scale.set(2, 2, 2);
    cube.transform.position.y = -4;
    const cubeMesh = cube.AddComponent(Mesh);
    console.log(cubeGeometry);
    cubeMesh.SetGeometry(cubeGeometry);
    cubeMesh.AddMaterial(new MeshBasicMaterial({ albedoMap: texture }));
  });
  scene.Start();
}
Application();
