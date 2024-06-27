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
  materialsMapped = /* @__PURE__ */ new Map();
  enableShadows = true;
  Start() {
    EventSystem.on("TransformUpdated", (transform) => {
      if (this.transform === transform) {
        EventSystem.emit("MeshUpdated", this);
      }
    });
  }
  AddMaterial(material) {
    if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
    this.materialsMapped.get(material.constructor.name)?.push(material);
  }
  GetMaterials(type) {
    return this.materialsMapped.get(type.name) || [];
  }
  SetGeometry(geometry) {
    this.geometry = geometry;
  }
  GetGeometry() {
    return this.geometry;
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
  perspectiveZO(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy * (Math.PI / 180) / 2);
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
  orthogonal(left, right, bottom, top, near, far) {
    const horizontal = 1 / (left - right);
    const vertical = 1 / (bottom - top);
    const depth = 1 / (near - far);
    return this.set(-2 * horizontal, 0, 0, 0, 0, -2 * vertical, 0, 0, 0, 0, 2 * depth, 0, (left + right) * horizontal, (top + bottom) * vertical, (far + near) * depth, 1);
  }
  // public orthoZO(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
  // 	const horizontal = 1 / (left - right);
  // 	const vertical = 1 / (bottom - top);
  // 	const depth = 1 / (near - far);
  // 	return this.set(-2 * horizontal, 0, 0, 0, 0, -2 * vertical, 0, 0, 0, 0, depth, 0, (left + right) * horizontal, (top + bottom) * vertical, near * depth, 1);
  // }
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
  lookAt(eye, center, up) {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    let eyex = eye.x;
    let eyey = eye.y;
    let eyez = eye.z;
    let upx = up.x;
    let upy = up.y;
    let upz = up.z;
    let centerx = center.x;
    let centery = center.y;
    let centerz = center.z;
    const EPSILON2 = 1e-6;
    if (Math.abs(eyex - centerx) < EPSILON2 && Math.abs(eyey - centery) < EPSILON2 && Math.abs(eyez - centerz) < EPSILON2) {
      return this.identity();
    }
    z0 = eyex - centerx;
    z1 = eyey - centery;
    z2 = eyez - centerz;
    len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
    z0 *= len;
    z1 *= len;
    z2 *= len;
    x0 = upy * z2 - upz * z1;
    x1 = upz * z0 - upx * z2;
    x2 = upx * z1 - upy * z0;
    len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
    if (!len) {
      x0 = 0;
      x1 = 0;
      x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
    if (!len) {
      y0 = 0;
      y1 = 0;
      y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len;
      y1 *= len;
      y2 *= len;
    }
    this.elements[0] = x0;
    this.elements[1] = y0;
    this.elements[2] = z0;
    this.elements[3] = 0;
    this.elements[4] = x1;
    this.elements[5] = y1;
    this.elements[6] = z1;
    this.elements[7] = 0;
    this.elements[8] = x2;
    this.elements[9] = y2;
    this.elements[10] = z2;
    this.elements[11] = 0;
    this.elements[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    this.elements[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    this.elements[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    this.elements[15] = 1;
    return this;
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
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
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
  onChanged() {
    EventSystem.emit("CallUpdate", this, true);
    EventSystem.emit("TransformUpdated", this);
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
    this.rotation.lookAt(this.position, target.add(1e-7), this.up);
    this.UpdateMatrices();
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

// src/renderer/webgpu/shader/wgsl/DeferredMeshShader.wgsl
var DeferredMeshShader_default = 'struct VertexInput {\n    @builtin(instance_index) instanceIdx : u32, \n    @location(0) position : vec3<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vPosition : vec3<f32>,\n    @location(1) vNormal : vec3<f32>,\n    @location(2) vUv : vec2<f32>,\n    @location(3) @interpolate(flat) instance : u32,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n\n@group(0) @binding(4) var TextureSampler: sampler;\n\n// These get optimized out based on "USE*" defines\n@group(0) @binding(5) var AlbedoMap: texture_2d<f32>;\n@group(0) @binding(6) var NormalMap: texture_2d<f32>;\n@group(0) @binding(7) var HeightMap: texture_2d<f32>;\n@group(0) @binding(8) var RoughnessMap: texture_2d<f32>;\n@group(0) @binding(9) var MetalnessMap: texture_2d<f32>;\n@group(0) @binding(10) var EmissiveMap: texture_2d<f32>;\n@group(0) @binding(11) var AOMap: texture_2d<f32>;\n\n\n@group(0) @binding(12) var<storage, read> cameraPosition: vec3<f32>;\n\n\nstruct Material {\n    AlbedoColor: vec4<f32>,\n    EmissiveColor: vec4<f32>,\n    Roughness: f32,\n    Metalness: f32,\n    Unlit: f32\n};\n@group(0) @binding(3) var<storage, read> material: Material;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output : VertexOutput;\n\n    var modelMatrixInstance = modelMatrix[input.instanceIdx];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n\n    output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);\n    \n    output.vPosition = input.position;\n    output.vNormal = input.normal;\n    output.vUv = input.uv;\n\n    output.instance = input.instanceIdx;\n\n    return output;\n}\n\nstruct FragmentOutput {\n    @location(0) albedo : vec4f,\n    @location(1) normal : vec4f,\n    @location(2) RMO : vec4f,\n};\n\nfn inversesqrt(v: f32) -> f32 {\n    return 1.0 / sqrt(v);\n}\n\nfn getNormalFromMap(N: vec3f, p: vec3f, uv: vec2f ) -> mat3x3<f32> {\n    // get edge vectors of the pixel triangle\n    let dp1 = dpdx( p );\n    let dp2 = dpdy( p );\n    let duv1 = dpdx( uv );\n    let duv2 = dpdy( uv );\n\n    // solve the linear system\n    let dp2perp = cross( dp2, N );\n    let dp1perp = cross( N, dp1 );\n    let T = dp2perp * duv1.x + dp1perp * duv2.x;\n    let B = dp2perp * duv1.y + dp1perp * duv2.y;\n\n    // construct a scale-invariant frame \n    let invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );\n    return mat3x3( T * invmax, B * invmax, N );\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> FragmentOutput {\n    var output: FragmentOutput;\n\n    let mat = material;\n\n    var uv = input.vUv;// * vec2(4.0, 2.0);\n    let tbn = getNormalFromMap(input.vNormal, input.vPosition, uv);\n    var modelMatrixInstance = modelMatrix[input.instance];\n\n    #if USE_HEIGHT_MAP\n        var viewDirection = normalize(cameraPosition - (modelMatrixInstance * vec4(input.vPosition, 1.0)).xyz);\n        // var viewDirection = normalize(cameraPosition - input.vPosition);\n\n        // Variables that control parallax occlusion mapping quality\n        let heightScale = 0.05;\n        let minLayers = 8.0;\n        let maxLayers = 64.0;\n        let numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 1.0, 0.0), viewDirection)));\n        let layerDepth = 1.0f / numLayers;\n        var currentLayerDepth = 0.0;\n        \n        // Remove the z division if you want less aberated results\n        let S = viewDirection.xz  * heightScale; \n        let deltaUVs = S / numLayers;\n        \n        var UVs = uv;\n        var currentDepthMapValue = 1.0 - textureSample(HeightMap, TextureSampler, UVs).r;\n        \n        // Loop till the point on the heightmap is "hit"\n        while(currentLayerDepth < currentDepthMapValue) {\n            UVs -= deltaUVs;\n            currentDepthMapValue = 1.0 - textureSampleLevel(HeightMap, TextureSampler, UVs, 0).r;\n            currentLayerDepth += layerDepth;\n        }\n\n\n        // Apply Occlusion (interpolation with prev value)\n        let prevTexCoords = UVs + deltaUVs;\n        let afterDepth  = currentDepthMapValue - currentLayerDepth;\n        let beforeDepth = 1.0 - textureSample(HeightMap, TextureSampler, prevTexCoords).r - currentLayerDepth + layerDepth;\n        let weight = afterDepth / (afterDepth - beforeDepth);\n        // UVs = prevTexCoords * weight + UVs * (1.0f - weight);\n        UVs = mix(UVs, prevTexCoords, weight);\n\n        // // Get rid of anything outside the normal range\n        // if(UVs.x > 1.0 || UVs.y > 1.0 || UVs.x < 0.0 || UVs.y < 0.0) {\n        //     discard;\n        // }\n        uv = UVs;\n\n\n        // // Parallax occlusion mapping\n        // let prev_uv = UVs + deltaUVs;\n        // let next = currentDepthMapValue - currentLayerDepth;\n        // let prev = textureSampleLevel(HeightMap, TextureSampler, prevTexCoords, 0).r - currentLayerDepth\n        //                 + layer_depth;\n        // let weight = next / (next - prev);\n        // uv = mix(UVs, prev_uv, weight);\n\n        // uv = parallax_uv(uv, viewDirection, 3);\n            \n    #endif\n    \n\n    var albedo = mat.AlbedoColor;\n    var roughness = mat.Roughness;\n    var metalness = mat.Metalness;\n    var occlusion = 1.0;\n    var unlit = mat.Unlit;\n\n    // var albedo = mat.AlbedoColor;\n    #if USE_ALBEDO_MAP\n        albedo *= textureSample(AlbedoMap, TextureSampler, uv);\n    #endif\n\n    var normal: vec3f = input.vNormal;\n    #if USE_NORMAL_MAP\n        let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;\n        normal = tbn * normalSample;\n\n        // let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;\n        // normal = normalSample.xyz;\n    #endif\n    // Should be normal matrix\n    normal = normalize(modelMatrixInstance * vec4(vec3(normal), 0.0)).xyz;\n\n    #if USE_ROUGHNESS_MAP\n        roughness *= textureSample(RoughnessMap, TextureSampler, uv).r;\n    #endif\n\n    #if USE_METALNESS_MAP\n        metalness *= textureSample(MetalnessMap, TextureSampler, uv).r;\n    #endif\n\n    var emissive = mat.EmissiveColor;\n    #if USE_EMISSIVE_MAP\n        emissive *= textureSample(EmissiveMap, TextureSampler, uv);\n    #endif\n\n    #if USE_AO_MAP\n        occlusion = textureSample(AOMap, TextureSampler, uv).r;\n        occlusion = 1.0;\n    #endif\n\n    output.normal = vec4(normal, 1.0);\n    output.albedo = albedo;\n    output.RMO = vec4(roughness, metalness, occlusion, unlit);\n    \n    output.albedo = vec4(albedo.rgb, roughness);\n    output.normal = vec4(normal.xyz, metalness);\n    output.RMO = vec4(emissive.rgb, unlit);\n\n    return output;\n}';

// src/renderer/webgpu/shader/wgsl/WireframeShader.wgsl
var WireframeShader_default = "struct VertexInput {\n    @builtin(instance_index) instanceID : u32,\n	@builtin(vertex_index) vertexID : u32,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n@group(0) @binding(3) var<storage, read> indices: array<u32>;\n@group(0) @binding(4) var<storage, read> positions: array<f32>;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n	var localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);\n\n	var triangleIndex = input.vertexID / 6u;\n	var localVertexIndex = input.vertexID % 6u;\n\n	var elementIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];\n	var elementIndex = indices[elementIndexIndex];\n\n	var position = vec4<f32>(\n		positions[3u * elementIndex + 0u],\n		positions[3u * elementIndex + 1u],\n		positions[3u * elementIndex + 2u],\n		1.0\n	);\n\n	var output : VertexOutput;\n    var modelMatrixInstance = modelMatrix[input.instanceID];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n	output.position = projectionMatrix * modelViewMatrix * position;\n\n	return output;\n}\n\n@fragment\nfn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {\n    return vec4(1.0, 0.0, 0.0, 1.0);\n}";

// src/renderer/webgpu/shader/wgsl/DeferredLightingPBRShader.wgsl
var DeferredLightingPBRShader_default = 'struct VertexInput {\n    @location(0) position : vec2<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var textureSampler: sampler;\n\n@group(0) @binding(1) var albedoTexture: texture_2d<f32>;\n@group(0) @binding(2) var normalTexture: texture_2d<f32>;\n@group(0) @binding(3) var ermoTexture: texture_2d<f32>;\n@group(0) @binding(4) var depthTexture: texture_depth_2d;\n// @group(0) @binding(5) var shadowPassDepth: texture_depth_2d;\n\n@group(0) @binding(5) var shadowPassDepth: texture_depth_2d_array;\n\n\n\nstruct Light {\n    position: vec4<f32>,\n    projectionMatrix: mat4x4<f32>,\n    csmProjectionMatrix: array<mat4x4<f32>, numCascades>,\n    viewMatrix: mat4x4<f32>,\n    viewMatrixInverse: mat4x4<f32>,\n    color: vec4<f32>,\n    params1: vec4<f32>,\n    params2: vec4<f32>,\n};\n\n@group(0) @binding(6) var<storage, read> lights: array<Light>;\n@group(0) @binding(7) var<storage, read> lightCount: u32;\n\n\n\n\n\n\nstruct View {\n    projectionOutputSize: vec4<f32>,\n    viewPosition: vec4<f32>,\n    projectionInverseMatrix: mat4x4<f32>,\n    viewInverseMatrix: mat4x4<f32>,\n};\n@group(0) @binding(8) var<storage, read> view: View;\n\n\n@group(0) @binding(9) var shadowSampler: sampler;\n\n\n\n\n\n\nconst numCascades = 4;\nconst debug_cascadeColors = array<vec4<f32>, 5>(\n    vec4<f32>(1.0, 0.0, 0.0, 1.0),\n    vec4<f32>(0.0, 1.0, 0.0, 1.0),\n    vec4<f32>(0.0, 0.0, 1.0, 1.0),\n    vec4<f32>(1.0, 1.0, 0.0, 1.0),\n    vec4<f32>(0.0, 0.0, 0.0, 1.0)\n);\n@group(0) @binding(10) var shadowSamplerComp: sampler_comparison;\n\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output: VertexOutput;\n    output.position = vec4(input.position, 0.0, 1.0);\n    output.vUv = input.uv;\n    return output;\n}\nconst PI = 3.141592653589793;\n\nconst SPOT_LIGHT = 0;\nconst DIRECTIONAL_LIGHT = 1;\nconst POINT_LIGHT = 2;\nconst AREA_LIGHT = 3;\n\nstruct SpotLight {\n    pointToLight: vec3<f32>,\n    color: vec3<f32>,\n    direction: vec3<f32>,\n    range: f32,\n    intensity: f32,\n    angle: f32,\n}\n\nstruct DirectionalLight {\n    direction: vec3<f32>,\n    color: vec3<f32>,\n}\n\nstruct PointLight {\n    pointToLight: vec3<f32>,\n    color: vec3<f32>,\n    range: f32,\n    intensity: f32,\n}\n\nstruct AreaLight {\n    pointToLight: vec3<f32>,\n    direction: vec3<f32>,\n    color: vec3<f32>,\n    range: f32,\n    intensity: f32,\n}\n\nstruct Surface {\n    albedo: vec3<f32>,\n    emissive: vec3<f32>,\n    metallic: f32,\n    roughness: f32,\n    occlusion: f32,\n    worldPosition: vec3<f32>,\n    N: vec3<f32>,\n    F0: vec3<f32>,\n    V: vec3<f32>,\n};\n\nfn reconstructWorldPosFromZ(\n    coords: vec2<f32>,\n    size: vec2<f32>,\n    depthTexture: texture_depth_2d,\n    projInverse: mat4x4<f32>,\n    viewInverse: mat4x4<f32>\n    ) -> vec4<f32> {\n    let uv = coords.xy / size;\n    var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);\n        let x = uv.x * 2.0 - 1.0;\n        let y = (1.0 - uv.y) * 2.0 - 1.0;\n        let projectedPos = vec4(x, y, depth, 1.0);\n        var worldPosition = projInverse * projectedPos;\n        worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);\n        worldPosition = viewInverse * worldPosition;\n    return worldPosition;\n}\n\nfn DistributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {\n    let a      = roughness*roughness;\n    let a2     = a*a;\n    let NdotH  = max(dot(N, H), 0.0);\n    let NdotH2 = NdotH*NdotH;\n\n    let num   = a2;\n    var denom = (NdotH2 * (a2 - 1.0) + 1.0);\n    denom = PI * denom * denom;\n    return num / denom;\n}\n\nfn GeometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {\n    let r = (roughness + 1.0);\n    let k = (r*r) / 8.0;\n\n    let num   = NdotV;\n    let denom = NdotV * (1.0 - k) + k;\n\n    return num / denom;\n}\n\nfn GeometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {\n    let NdotV = max(dot(N, V), 0.0);\n    let NdotL = max(dot(N, L), 0.0);\n    let ggx2  = GeometrySchlickGGX(NdotV, roughness);\n    let ggx1  = GeometrySchlickGGX(NdotL, roughness);\n\n    return ggx1 * ggx2;\n}\n\nfn FresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {\n    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);\n} \n\nfn rangeAttenuation(range : f32, distance : f32) -> f32 {\n    if (range <= 0.0) {\n        // Negative range means no cutoff\n        return 1.0 / pow(distance, 2.0);\n    }\n    return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);\n}\n\nfn CalculateBRDF(surface: Surface, pointToLight: vec3<f32>) -> vec3<f32> {\n    // cook-torrance brdf\n    let L = normalize(pointToLight);\n    let H = normalize(surface.V + L);\n    let distance = length(pointToLight);\n\n    let NDF = DistributionGGX(surface.N, H, surface.roughness);\n    let G = GeometrySmith(surface.N, surface.V, L, surface.roughness);\n    let F = FresnelSchlick(max(dot(H, surface.V), 0.0), surface.F0);\n\n    let kD = (vec3(1.0, 1.0, 1.0) - F) * (1.0 - surface.metallic);\n\n    let NdotL = max(dot(surface.N, L), 0.0);\n\n    let numerator = NDF * G * F;\n    let denominator = max(4.0 * max(dot(surface.N, surface.V), 0.0) * NdotL, 0.001);\n    let specular = numerator / vec3(denominator, denominator, denominator);\n\n    return (kD * surface.albedo.rgb / vec3(PI, PI, PI) + specular) * NdotL;\n}\n\nfn PointLightRadiance(light : PointLight, surface : Surface) -> vec3<f32> {\n    let distance = length(light.pointToLight);\n    let attenuation = rangeAttenuation(light.range, distance);\n    let radiance = CalculateBRDF(surface, light.pointToLight) * light.color * light.intensity * attenuation;\n    return radiance;\n}\n\nfn DirectionalLightRadiance(light: DirectionalLight, surface : Surface) -> vec3<f32> {\n    return CalculateBRDF(surface, light.direction) * light.color;\n}\n\nfn SpotLightRadiance(light : SpotLight, surface : Surface) -> vec3<f32> {\n    let L = normalize(light.pointToLight);\n    let distance = length(light.pointToLight);\n\n    let angle = acos(dot(light.direction, L));\n\n    // Check if the point is within the light cone\n    if angle > light.angle {\n        return vec3(0.0, 0.0, 0.0); // Outside the outer cone\n    }\n\n    let intensity = smoothstep(light.angle, 0.0, angle);\n    let attenuation = rangeAttenuation(light.range, distance) * intensity;\n\n    let radiance = CalculateBRDF(surface, light.pointToLight) * light.color * light.intensity * attenuation;\n    return radiance;\n}\n\nfn Tonemap_ACES(x: vec3f) -> vec3f {\n    // Narkowicz 2015, "ACES Filmic Tone Mapping Curve"\n    let a = 2.51;\n    let b = 0.03;\n    let c = 2.43;\n    let d = 0.59;\n    let e = 0.14;\n    return (x * (a * x + b)) / (x * (c * x + d) + e);\n}\n\nfn OECF_sRGBFast(linear: vec3f) -> vec3f {\n    return pow(linear, vec3(0.454545));\n}\n\nfn CalculateShadow(worldPosition: vec3f, normal: vec3f, light: Light, lightIndex: u32) -> f32 {\n    var posFromLight = light.projectionMatrix * light.viewMatrix * vec4(worldPosition, 1.0);\n    posFromLight = vec4(posFromLight.xyz / posFromLight.w, 1.0);\n    let shadowPos = vec3(posFromLight.xy * vec2(0.5,-0.5) + vec2(0.5, 0.5), posFromLight.z);\n    // let inRange = shadowPos.x >= 0.0 && shadowPos.x <= 1.0 && shadowPos.y >= 0.0 && shadowPos.y <= 1.0 && shadowPos.z >= 0.0 && shadowPos.z <= 1.0;\n    var visibility = 0.0;\n\n    let shadowIndex = lightIndex;\n\n    let lightDirection = normalize(light.position.xyz - worldPosition);\n    \n    if (shadowPos.z <= 1.0) {\n        let sampleRadius = 2.0;\n        let pixelSize = 1.0 / vec2f(textureDimensions(shadowPassDepth));\n        // let pixelSize = 1.0 / vec2f(1024);\n\n		let bias = max(0.00025 * (1.0 - dot(normal, lightDirection)), 0.00009);\n        // let bias = 0.0009;\n\n        // // Naive Soft shadows\n        // for (var y = -sampleRadius; y <= sampleRadius; y+=1.0) {\n        //     for (var x = -sampleRadius; x <= sampleRadius; x+=1.0) {\n        //         let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy + vec2(x,y) * pixelSize, shadowIndex, 0);\n        //         // if (projectedDepth <= posFromLight.z - bias) {\n        //         if (posFromLight.z > projectedDepth + bias) {\n        //             visibility += 1.0;\n        //         }\n        //     }\n        // }\n        // visibility /= pow((sampleRadius * 2.0 + 1.0), 2.0);\n        \n        // Hard shadows\n        let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);\n        if (posFromLight.z > projectedDepth + bias) {\n            visibility = 1.0;\n        }\n    }\n    \n    return visibility;\n}\n\nfn CalculateDirectionalLightShadow(worldPosition: vec3<f32>, normal: vec3<f32>, light: Light, directionalLight: DirectionalLight, lightIndex: u32) -> f32 {\n    var posFromLight = light.projectionMatrix * light.viewMatrix * vec4(worldPosition, 1.0);\n    posFromLight = vec4(posFromLight.xyz / posFromLight.w, 1.0);\n    let shadowPos = vec3(posFromLight.xy * vec2(0.5,-0.5) + vec2(0.5, 0.5), posFromLight.z);\n    var visibility = 0.0;\n\n    let lightDirection = normalize(light.position.xyz - worldPosition);\n    // let bias = max(0.00025 * (1.0 - dot(normal, directionalLight.direction)), 0.00009);\n    let bias = 0.00009;\n    // Hard shadows\n    let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);\n    if (posFromLight.z > projectedDepth + bias) {\n        visibility = 1.0;\n    }\n    \n    return visibility;\n}\n\nstruct ShadowCSM {\n    visibility: f32,\n    selectedCascade: i32\n};\n\nfn CalculateShadowCSM(surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {\n    var selectedCascade = numCascades;\n    var hasNextCascade = false;\n    var shadowMapCoords = vec3<f32>(-1.0);\n    for (var i = 0; i < numCascades; i += 1) {\n        // ideally these operations should be performed in the vs\n        var csmShadowMapCoords = light.csmProjectionMatrix[i] * vec4(surface.worldPosition, 1.0);\n        csmShadowMapCoords = csmShadowMapCoords / csmShadowMapCoords.w;\n        shadowMapCoords = vec3<f32>(csmShadowMapCoords.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), csmShadowMapCoords.z);\n\n        if (all(shadowMapCoords > vec3<f32>(0.0)) && all(shadowMapCoords < vec3<f32>(1.0))) {\n            selectedCascade = i;\n            if (i < numCascades - 1) {\n                var nextShadowCoords = light.csmProjectionMatrix[i + 1] * vec4(surface.worldPosition, 1.0);\n                nextShadowCoords = nextShadowCoords / nextShadowCoords.w;\n                let uvShadowMapCoords = vec3<f32>(csmShadowMapCoords.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), csmShadowMapCoords.z);\n                hasNextCascade = all(uvShadowMapCoords > vec3<f32>(0.0)) && all(uvShadowMapCoords < vec3<f32>(1.0));\n            }\n            break;\n        }\n    }\n\n    let lightViewInverse = light.viewMatrixInverse;\n    let lightDirection = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n    \n    let pcfResolution = 2;\n    let minBias = 0.0005;\n    let maxBias = 0.001;\n\n    let bias = max(minBias, maxBias * (1.0 - dot(lightDirection, surface.N)));\n    \n    let threshold = vec3<f32>(0.2);\n    var edgeAdditionalVisibility = clamp((shadowMapCoords.xyz - (1.0 - threshold)) / threshold, vec3<f32>(0.0), vec3<f32>(1.0));\n    edgeAdditionalVisibility = max(edgeAdditionalVisibility, 1.0 - clamp(shadowMapCoords.xyz / threshold, vec3<f32>(0.0), vec3<f32>(1.0)));\n    \n    var cascadeShadowMapCoords = shadowMapCoords;\n\n    if (selectedCascade >= 2) {\n        cascadeShadowMapCoords.x = cascadeShadowMapCoords.x + 1.0;\n    }\n    if (selectedCascade % 2 != 0) {\n        cascadeShadowMapCoords.y = cascadeShadowMapCoords.y + 1.0;\n    }\n    cascadeShadowMapCoords.x = cascadeShadowMapCoords.x / 2.0;\n    cascadeShadowMapCoords.y = cascadeShadowMapCoords.y / 2.0;\n\n\n    // PCF\n    var visibility: f32 = 0.0;\n    let offset = 1.0 / vec2<f32>(textureDimensions(shadowPassDepth));\n    for (var i = -pcfResolution; i <= pcfResolution; i = i + 1) {\n        for (var j = -pcfResolution; j <= pcfResolution; j = j + 1) {\n            visibility = visibility + textureSampleCompareLevel(\n                shadowPassDepth,\n                shadowSamplerComp,\n                cascadeShadowMapCoords.xy + vec2<f32>(f32(i), f32(j)) * offset, lightIndex, cascadeShadowMapCoords.z - bias\n            );\n        }\n    }\n\n    let fadeOut = select(max(max(edgeAdditionalVisibility.x, edgeAdditionalVisibility.y), edgeAdditionalVisibility.z), 0.0, hasNextCascade);\n    visibility = visibility / f32((pcfResolution + pcfResolution + 1) * (pcfResolution + pcfResolution + 1)) + fadeOut;\n\n    var shadow: ShadowCSM;\n    shadow.visibility = clamp(visibility, 0.0, 1.0);\n    shadow.selectedCascade = selectedCascade;\n    \n    return shadow;\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    let uv = input.vUv;\n    let albedo = textureSample(albedoTexture, textureSampler, uv);\n    let normal = textureSample(normalTexture, textureSampler, uv);\n    let ermo = textureSample(ermoTexture, textureSampler, uv);\n\n    let cutoff = 0.0001;\n    let albedoSum = albedo.r + albedo.g + albedo.b;\n    if (albedoSum < cutoff) {\n        discard;\n    }\n\n    var color: vec3f = vec3(0);\n\n    let worldPosition = reconstructWorldPosFromZ(\n        input.position.xy,\n        view.projectionOutputSize.xy,\n        depthTexture,\n        view.projectionInverseMatrix,\n        view.viewInverseMatrix\n    );\n\n    var surface: Surface;\n    surface.albedo = albedo.rgb;\n    surface.roughness = albedo.a;\n    surface.metallic = normal.a;\n    surface.emissive = ermo.rgb;\n    surface.occlusion = 1.0;\n    surface.worldPosition = worldPosition.xyz;\n    surface.N = normalize(normal.rgb);\n    surface.F0 = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));\n    surface.V = normalize(view.viewPosition.xyz - surface.worldPosition);\n\n    if (ermo.w > 0.5) {\n        return vec4(surface.albedo.rgb, 1.0);\n    }\n    \n    var selectedCascade = 0;\n    var Lo = vec3(0.0);\n    for (var i : u32 = 0u; i < lightCount; i = i + 1u) {\n        let light = lights[i];\n        let lightType = light.color.a;\n\n        if (lightType == SPOT_LIGHT) {\n            var spotLight: SpotLight;\n            \n            let lightViewInverse = light.viewMatrixInverse; // Assuming you can calculate or pass this\n            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n\n            spotLight.pointToLight = light.position.xyz - surface.worldPosition;\n            spotLight.color = light.color.rgb;\n            spotLight.intensity = light.params1.r;\n            spotLight.range = light.params1.g;\n            spotLight.direction = lightDir;\n            spotLight.angle = light.params1.b;\n\n            let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);\n            Lo += (1.0 - shadow) * SpotLightRadiance(spotLight, surface);\n        }\n        else if (lightType == POINT_LIGHT) {\n            var pointLight: PointLight;\n            \n            pointLight.pointToLight = light.position.xyz - surface.worldPosition;\n            pointLight.color = light.color.rgb;\n            pointLight.intensity = light.params1.x;\n            pointLight.range = light.params1.y;\n\n            let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);\n            Lo += (1.0 - shadow) * PointLightRadiance(pointLight, surface);\n        }\n        else if (lightType == DIRECTIONAL_LIGHT) {\n            var directionalLight: DirectionalLight;\n            let lightViewInverse = light.viewMatrixInverse; // Assuming you can calculate or pass this\n            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n            directionalLight.direction = lightDir;\n            directionalLight.color = light.color.rgb;\n\n            // var shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);\n            let shadowCSM = CalculateShadowCSM(surface, light, i);\n            let shadow = shadowCSM.visibility;\n            selectedCascade = shadowCSM.selectedCascade;\n\n            Lo += (shadow) * DirectionalLightRadiance(directionalLight, surface);\n\n            // let finalColor = shadow * DirectionalLightRadiance(directionalLight, surface);\n            // Lo += mix(finalColor, debug_cascadeColors[selectedCascade].rgb, 0.01);\n        }\n    }\n\n\n    let ambientColor = vec3(0.01);\n    color = ambientColor * surface.albedo + Lo * surface.occlusion;\n\n    // color += debug_cascadeColors[selectedCascade].rgb * 0.05;\n    color += surface.emissive;\n\n    color = Tonemap_ACES(color);\n    color = OECF_sRGBFast(color);\n\n\n    return vec4(color, 1.0);\n    // return vec4(pow(projectedDepth, 20.0));\n    // return vec4(shadowPos, 1.0);\n    // return vec4(Lo, 1.0);\n    // return vec4(surface.albedo.rgb, 1.0);\n    // return vec4(worldPosition.xyz, 1.0);\n    // return vec4(surface.N, 1.0);\n}';

// src/renderer/webgpu/shader/wgsl/QuadShader.wgsl
var QuadShader_default = "struct VSOutput {\n    @builtin(position) position: vec4f,\n    @location(0) texcoord: vec2f,\n};\n\n@vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VSOutput {\n    const pos = array(\n        vec2f( 0.0,  0.0),  // center\n        vec2f( 1.0,  0.0),  // right, center\n        vec2f( 0.0,  1.0),  // center, top\n\n        // 2st triangle\n        vec2f( 0.0,  1.0),  // center, top\n        vec2f( 1.0,  0.0),  // right, center\n        vec2f( 1.0,  1.0),  // right, top\n    );\n\n    var vsOutput: VSOutput;\n    let xy = pos[vertexIndex];\n    vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);\n    vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);\n    return vsOutput;\n}\n\n@group(0) @binding(0) var ourSampler: sampler;\n@group(0) @binding(1) var ourTexture: texture_2d<f32>;\n\n@fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {\n    return textureSample(ourTexture, ourSampler, fsInput.texcoord);\n}";

// src/renderer/webgpu/shader/wgsl/ShadowPass.wgsl
var ShadowPass_default = "struct VertexInput {\n    @builtin(instance_index) instanceIdx : u32, \n    @location(0) position : vec3<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;\n@group(0) @binding(1) var<storage, read> cascadeIndex: f32;\n\n@group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n\n\nconst numCascades = 4;\n\n@vertex\nfn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {\n    var output : VertexOutput;\n\n    let modelMatrixInstance = modelMatrix[input.instanceIdx];\n    let lightProjectionViewMatrix = projectionMatrix[u32(cascadeIndex)];\n\n    return lightProjectionViewMatrix * modelMatrixInstance * vec4(input.position, 1.0);\n}\n\n@fragment\nfn fragmentMain() -> @location(0) vec4<f32> {\n    return vec4(1.0);\n}";

// src/renderer/webgpu/shader/wgsl/SSGI.wgsl
var SSGI_default = "struct VertexInput {\n    @location(0) position : vec2<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var lightingTexture: texture_2d<f32>;\n@group(0) @binding(1) var albedoTexture: texture_2d<f32>;\n@group(0) @binding(2) var normalTexture: texture_2d<f32>;\n@group(0) @binding(3) var depthTexture: texture_depth_2d;\n@group(0) @binding(4) var lightingSampler: sampler;\n@group(0) @binding(5) var lastFrameTexture: texture_2d<f32>;\n\nstruct View {\n    projectionOutputSize: vec4<f32>,\n    viewPosition: vec4<f32>,\n    projectionMatrix: mat4x4<f32>,\n    projectionInverseMatrix: mat4x4<f32>,\n    viewMatrix: mat4x4<f32>,\n    viewInverseMatrix: mat4x4<f32>,\n};\n@group(0) @binding(6) var<storage, read> view: View;\n\n@group(0) @binding(7) var<storage, read> hasLastFrame: f32;\n@group(0) @binding(8) var<storage, read> frame: f32;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output: VertexOutput;\n    output.position = vec4(input.position, 0.0, 1.0);\n    output.vUv = input.uv;\n    return output;\n}\n\nfn GetPerpendicularVector(v: vec3f) -> vec3f {\n    let epsilon = 0.00000001; // For float equality checks\n\n    // if (v == Vector3.zero) {\n    //     return Vector3.zero;\n    // }\n    if (abs(v.x) < epsilon) {\n        return vec3f(1, 0, 0);\n    }\n    else if (abs(v.y) < epsilon) {\n        return vec3f(0, 1, 0);\n    }\n    else if (abs(v.z) < epsilon) {\n        return vec3f(0, 0, 1);\n    }\n    else {\n        return vec3f(1, 1, -(v.x + v.y) / v.z);\n    }\n}\n\n// Get a cosine-weighted random vector centered around a specified normal direction.\nfn GetCosHemisphereSample(rand1 : f32, rand2 : f32, hitNorm : vec3<f32>) -> vec3<f32> {\n    // Get 2 random numbers to select our sample with\n    let randVal = vec2<f32>(rand1, rand2);\n\n    // Cosine weighted hemisphere sample from RNG\n    let bitangent = GetPerpendicularVector(hitNorm);\n    let tangent = cross(bitangent, hitNorm);\n    let r = sqrt(randVal.x);\n    let phi = 2.0 * 3.14159265 * randVal.y;\n\n    // Get our cosine-weighted hemisphere lobe sample direction\n    return tangent * (r * cos(phi)) + bitangent * (r * sin(phi)) + hitNorm * sqrt(max(0.0, 1.0 - randVal.x));\n}\n\nfn GetNormal(uv: vec2f) -> vec3f {\n    return textureSample(normalTexture, lightingSampler, uv).rgb;\n}\nconst frameCount = 1;\n\nfn IGN(x: f32, y: f32, t: u32) -> f32 {\n    let frame = t;\n    \n    //frame += WellonsHash2(WeylHash(uvec2(uv)/4u)) % 4u;\n    \n    var uv = vec2f(x, y);\n    if((frame & 2u) != 0u) {\n        uv = vec2(-uv.y, uv.x);\n    }\n    if((frame & 1u) != 0u) {\n        uv.x = -uv.x;\n    }\n\n    //return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))) + float(frame)*0.41421356);\n    //return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))));\n    //return fract(IGN(uv)+float(frame)*0.41421356*1.0);\n    \n    // http://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/#dither\n    return fract(uv.x*0.7548776662 + uv.y*0.56984029 + f32(frame)*0.41421356*1.0);\n}\n\n\nfn reconstructWorldPosFromZ(coords: vec2<f32>) -> vec4<f32> {\n    let uv = coords.xy / vec2f(textureDimensions(depthTexture).xy);\n    var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);\n        let x = uv.x * 2.0 - 1.0;\n        let y = (1.0 - uv.y) * 2.0 - 1.0;\n        let projectedPos = vec4(x, y, depth, 1.0);\n        var worldPosition = view.projectionInverseMatrix * projectedPos;\n        worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);\n        worldPosition = view.viewInverseMatrix * worldPosition;\n    return worldPosition;\n}\n\nfn hash(b: vec3f) -> vec3f {\n    var a = b;\n    a = fract(a * vec3(.8) );\n    a += dot(a, a.yxz + 19.19);\n    return fract((a.xxy + a.yxx)*a.zyx);\n}\n\nstruct BinarySearchOutput {\n    dir: vec3f,\n    hitCoord: vec3f,\n    output: vec3f,\n    depth: f32\n};\n\nfn ProjectedCoordThingy(iprojectedCoord: vec4f) -> vec4f {\n    var projectedCoord = iprojectedCoord;\n    projectedCoord.x /= projectedCoord.w;\n    projectedCoord.y /= projectedCoord.w;\n    projectedCoord.x = projectedCoord.x * 0.5 + 0.5;\n    projectedCoord.y = projectedCoord.y * 0.5 + 0.5;\n    return projectedCoord;\n}\n\nfn BinarySearch(idir: vec3f, ihitCoord: vec3f) -> BinarySearchOutput {\n    var output: BinarySearchOutput;\n    output.dir = idir;\n    output.hitCoord = ihitCoord;\n    let SEARCH_STEPS = 7;\n\n    var projectedCoord = vec4f(0.0);\n    let Q = SEARCH_STEPS;\n    var depth = 0.0;\n\n    for(var i = 0; i < Q; i++){\n        projectedCoord = view.projectionMatrix * vec4(output.hitCoord, 1.0);\n        projectedCoord = ProjectedCoordThingy(projectedCoord);\n\n        depth = getViewPos(projectedCoord.xy).z;\n        \n        output.depth = output.hitCoord.z - depth;\n        if(output.depth > 0.0) {\n            output.hitCoord += output.dir;\n        }\n        else {\n            output.hitCoord -= output.dir;\n        }\n    }\n\n    projectedCoord = view.projectionMatrix * vec4(output.hitCoord, 1.0);\n    projectedCoord = ProjectedCoordThingy(projectedCoord);\n\n    output.output = vec3(projectedCoord.xy, depth);\n    return output;\n}\n\nstruct Ray {\n    hitCoord: vec3f,\n    dir: vec3f,\n    coords: vec4f\n};\n\nfn RayMarch(maxSteps: i32, idir: vec3f, ihitCoord: vec3f, stepSize: f32) -> Ray {\n    var ray: Ray;\n    var depth = 0.0;\n    var steps = 0;\n    var projectedCoord: vec4f = vec4f(0.0);\n\n    ray.hitCoord = ihitCoord;\n    ray.dir = idir * stepSize;\n\n    var raymarcherDepth = 0.0;\n\n    for(var i = 0; i < maxSteps; i++)   {\n        ray.hitCoord += ray.dir;\n        projectedCoord = view.projectionMatrix * vec4(ray.hitCoord, 1.0);\n        projectedCoord = ProjectedCoordThingy(projectedCoord);\n\n        // depth = getViewPosition(projectedCoord.xy, quadUV).z;\n        depth = getViewPos(projectedCoord.xy).z;\n        if(depth > 1000.0) {\n            continue;\n        }\n\n        raymarcherDepth = ray.hitCoord.z - depth;\n        if((ray.dir.z - raymarcherDepth) < 1.2) {\n            if(raymarcherDepth <= 0.0) {\n                let ResultBinSearch = BinarySearch(ray.dir, ray.hitCoord);\n\n                ray.coords = vec4(ResultBinSearch.output, 1.0);\n                ray.hitCoord = ResultBinSearch.hitCoord;\n                ray.dir = ResultBinSearch.dir;\n                raymarcherDepth = ResultBinSearch.depth;\n                return ray;\n            }\n        }\n        steps++;\n    }\n\n    ray.coords = vec4(projectedCoord.xy, depth, 0.0);\n    return ray;\n}\n\nfn getViewPos(coord: vec2f) -> vec3f {\n	let depth = textureSampleLevel(depthTexture, lightingSampler, coord, 0);\n	\n	//Turn the current pixel from ndc to world coordinates\n	let pixel_pos_ndc = vec3(coord*2.0-1.0, depth*2.0-1.0); \n    let pixel_pos_clip = view.projectionInverseMatrix * vec4(pixel_pos_ndc,1.0);\n    let pixel_pos_cam = pixel_pos_clip.xyz / pixel_pos_clip.w;\n	return pixel_pos_cam;\n}\n\nfn getViewNormal(coord: vec2f) -> vec3f {\n    let texSize = textureDimensions(depthTexture, 0);\n\n    let pW = 1.0/f32(texSize.x);\n    let pH = 1.0/f32(texSize.y);\n    \n    let p1 = getViewPos(coord+vec2(pW,0.0)).xyz;\n    let p2 = getViewPos(coord+vec2(0.0,pH)).xyz;\n    let p3 = getViewPos(coord+vec2(-pW,0.0)).xyz;\n    let p4 = getViewPos(coord+vec2(0.0,-pH)).xyz;\n\n    let vP = getViewPos(coord);\n    \n    var dx = vP-p1;\n    var dy = p2-vP;\n    let dx2 = p3-vP;\n    let dy2 = vP-p4;\n    \n    // if(length(dx2) < length(dx) && coord.x - pW >= 0.0 || coord.x + pW > 1.0) {\n    //     dx = dx2;\n    // }\n    // if(length(dy2) < length(dy) && coord.y - pH >= 0.0 || coord.y + pH > 1.0) {\n    //     dy = dy2;\n    // }\n    if(length(dx2) < length(dx) && (coord.x - pW >= 0.0 || coord.x + pW > 1.0)) {\n        dx = dx2;\n    }\n    if(length(dy2) < length(dy) && (coord.y - pH >= 0.0 || coord.y + pH > 1.0)) {\n        dy = dy2;\n    }\n    \n    return normalize(-cross( dx , dy ).xyz);\n}\n\nfn getLogDepth(uv: vec2f) -> f32 {\n    return textureSampleLevel(depthTexture, lightingSampler, uv, 0);\n}\n\nfn viewSpacePositionFromDepth(logarithimicDepth: f32, texCoords: vec2f) -> vec3f {\n    let z = logarithimicDepth * 2.0 - 1.0;\n\n    let clipSpacePosition = vec4(texCoords * 2.0 - 1.0, z, 1.0);\n    var viewSpacePosition = view.projectionInverseMatrix * clipSpacePosition;\n    viewSpacePosition /= viewSpacePosition.w;\n\n    return viewSpacePosition.rgb;\n}\n\nfn normalFromDepth(logarithimicDepth: f32, texCoords: vec2f) -> vec3f {\n    let bufferResolution = vec2f(textureDimensions(depthTexture, 0));\n    let texelSize = 1. / bufferResolution;\n    let texCoords1 = texCoords + vec2(0., 1.) * texelSize;\n    let texCoords2 = texCoords + vec2(1., 0.) * texelSize;\n\n    let depth1 = getLogDepth(texCoords1);\n    let depth2 = getLogDepth(texCoords2);\n\n    let P0 = viewSpacePositionFromDepth(logarithimicDepth, texCoords);\n    let P1 = viewSpacePositionFromDepth(depth1, texCoords1);\n    let P2 = viewSpacePositionFromDepth(depth2, texCoords2);\n\n    return normalize(cross(P2 - P0, P1 - P0));\n}\n\nfn getViewPosition(coords: vec2f, quadUV: vec2f) -> vec3f {\n    let depth = getLogDepth(coords);\n    return viewSpacePositionFromDepth(depth, quadUV);\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    let uv = input.vUv;\n    let pixelDepth = getLogDepth(uv);\n    if (pixelDepth == 0.) {\n        discard;\n    }\n\n\n    let worldNormal = GetNormal(uv);\n\n\n\n    let screenResolution = vec2f(960, 609);\n    let pos = uv * screenResolution;\n    let normalLength : f32 = length(worldNormal);\n\n    let noise : f32 = IGN(pos.x, pos.y, frameCount); // Animated Interleaved Gradient Noise\n    var stochasticNormal = GetCosHemisphereSample(noise, noise, worldNormal);\n    stochasticNormal = normalize(stochasticNormal);\n\n\n\n    let viewPos = getViewPos(uv).xyz;\n    let viewDir = stochasticNormal;\n    let dir = normalize(vec4(viewDir, 1.0) * view.viewMatrix).xyz;\n\n    let stepSize = 1.0;\n    let maxSteps = 10;\n    let intensity = 1.0;\n    var jitt = vec3(hash(viewPos));\n    let step = stepSize * (clamp(jitt.x, 0., 1.) + clamp(jitt.y, 0., 1.)) + stepSize;\n\n    let ray = RayMarch(maxSteps, dir, viewPos, step);\n\n    var tracedAlbedo = textureSample(albedoTexture, lightingSampler, ray.coords.xy); // previousFrame\n\n    let CLAMP_MIN = 0.1;\n    let CLAMP_MAX = 0.9;\n    let dCoords = smoothstep(vec2(CLAMP_MIN), vec2(CLAMP_MAX), abs(vec2(0.5) - ray.coords.xy));\n    let screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);\n\n    let reflected = normalize(reflect(normalize(ray.hitCoord), ray.dir));\n    let reflectionMultiplier = screenEdgefactor * -reflected.z;\n\n    var color = vec4(tracedAlbedo.rgb * clamp(reflectionMultiplier, 0.0, 1.) * intensity, 1.);\n\n    if (hasLastFrame > 0.5) {\n        let lf = textureSample(lastFrameTexture, lightingSampler, uv);\n        color = mix(color, lf, 1.0 - fract(frame * 0.001));\n    }\n    return color;\n\n    // return textureSample(albedoTexture, lightingSampler, uv);\n    // return vec4(viewPos.xyz, 1.0);\n}";

// src/renderer/webgpu/shader/wgsl/DownSample.wgsl
var DownSample_default = "struct VertexInput {\n    @location(0) position : vec2<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var texture: texture_2d<f32>;\n@group(0) @binding(1) var textureSampler: sampler;\n@group(0) @binding(2) var<storage, read> multiplier: f32;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output: VertexOutput;\n    output.position = vec4(input.position, 0.0, 1.0);\n    output.vUv = input.uv;\n    return output;\n}\n\nfn texture2D_bilinear(t: texture_2d<f32>, uv: vec2f, textureSize: vec2f, texelSize: vec2f) -> vec4f {\n    let tl = textureSample(t, textureSampler, uv);\n    let tr = textureSample(t, textureSampler, uv + vec2(texelSize.x, 0.0));\n    let bl = textureSample(t, textureSampler, uv + vec2(0.0, texelSize.y));\n    let br = textureSample(t, textureSampler, uv + vec2(texelSize.x, texelSize.y));\n    let f = fract( uv * textureSize );\n    let tA = mix( tl, tr, f.x );\n    let tB = mix( bl, br, f.x );\n    return mix( tA, tB, f.y );\n}\n\nfn texture2D_bilinear_v2(t: texture_2d<f32>, iuv: vec2f, textureSize: vec2f, texelSize: vec2f) -> vec4f {\n    var uv = iuv;\n    let f = fract( uv * textureSize );\n    uv += ( .5 - f ) * texelSize;    // move uv to texel centre\n    let tl = textureSample(t, textureSampler, uv);\n    let tr = textureSample(t, textureSampler, uv + vec2(texelSize.x, 0.0));\n    let bl = textureSample(t, textureSampler, uv + vec2(0.0, texelSize.y));\n    let br = textureSample(t, textureSampler, uv + vec2(texelSize.x, texelSize.y));\n    let tA = mix( tl, tr, f.x );\n    let tB = mix( bl, br, f.x );\n    return mix( tA, tB, f.y );\n}\n\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    let uv = input.vUv;\n    let color = textureSample(texture, textureSampler, uv);\n    return color;\n\n    // let res = vec2f(textureDimensions(texture, 0)) * 2.0;\n\n    // var col = textureSample(texture, textureSampler, uv).rgb / 2.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(1., 1.) / res).rgb / 8.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(1., -1.) / res).rgb / 8.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(-1., 1.) / res).rgb / 8.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(-1., -1.) / res).rgb / 8.0;\n    // return vec4(col, 1.0);\n\n    // let dim = vec2f(textureDimensions(texture));\n    // let texelSize = 1.0 / dim;\n    // return texture2D_bilinear_v2(texture, uv, dim, texelSize);\n}";

// src/renderer/webgpu/shader/wgsl/UpSample.wgsl
var UpSample_default = "struct VertexInput {\n    @location(0) position : vec2<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var texture: texture_2d<f32>;\n@group(0) @binding(1) var textureSampler: sampler;\n@group(0) @binding(2) var<storage, read> multiplier: f32;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output: VertexOutput;\n    output.position = vec4(input.position, 0.0, 1.0);\n    output.vUv = input.uv;\n    return output;\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    let uv = input.vUv;\n    // let color = textureSample(texture, textureSampler, uv);\n\n    // let res = vec2f(textureDimensions(texture, 0)) * multiplier;\n\n    // var col = textureSample(texture, textureSampler, uv).rgb / 2.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(1., 1.) / res).rgb / 8.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(1., -1.) / res).rgb / 8.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(-1., 1.) / res).rgb / 8.0;\n    // col += textureSample(texture, textureSampler, uv + vec2(-1., -1.) / res).rgb / 8.0;\n\n    // return vec4(col, 1.0);\n\n\n    let sampleScale = 2.0;\n\n    let texelSize = 1.0 / vec2f(textureDimensions(texture, 0));\n    let d = texelSize.xyxy * vec4f(-1, -1, 1, 1);\n\n    var s = vec4f(0);\n    s = textureSample(texture, textureSampler, uv + d.xy);\n    s += textureSample(texture, textureSampler, uv + d.zy);\n    s += textureSample(texture, textureSampler, uv + d.xw);\n    s += textureSample(texture, textureSampler, uv + d.zw);\n\n    return vec4(vec3(s.rgb * 0.25), 1.0);\n}";

// src/renderer/webgpu/shader/wgsl/Blur.wgsl
var Blur_default = "struct VertexInput {\n    @builtin(vertex_index) VertexIndex : u32,\n    @location(0) position : vec2<f32>,\n};\n\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var textureSampler: sampler;\n\nstruct View {\n    gProj: mat4x4<f32>\n};\n\n@group(0) @binding(1) var<storage, read> view: View;\n\n@group(0) @binding(2) var<storage, read> gBlurWeights: array<vec4f, 3>;\n@group(0) @binding(3) var<storage, read> gInvRenderTargetSize: vec2<f32>;\n\n\n@group(0) @binding(4) var gNormalMap: texture_2d<f32>;\n@group(0) @binding(5) var gDepthMap: texture_depth_2d;\n@group(0) @binding(6) var gInputMap: texture_2d<f32>;\n\n@group(0) @binding(7) var<storage, read> blurHorizontal: f32;\n@group(0) @binding(8) var<storage, read> blurRadius: f32;\n\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    let gTexCoords = array<vec2f, 6>(\n        vec2(0.0, 1.0),\n        vec2(0.0, 0.0),\n        vec2(1.0, 0.0),\n        vec2(0.0, 1.0),\n        vec2(1.0, 0.0),\n        vec2(1.0, 1.0)\n    );\n\n    var output: VertexOutput;\n    // output.vUv = input.uv;\n    output.vUv = vec2(gTexCoords[input.VertexIndex].x, 1.0 - gTexCoords[input.VertexIndex].y);\n    // output.position = vec4(2.0 * output.vUv.x - 1.0, 1.0 - 2.0 * output.vUv.y, 0.0, 1.0);\n    output.position = vec4(2 * output.vUv.x - 1.0, 1.0 - 2 * output.vUv.y, 0.0, 1.0);\n    return output;\n}\n\nfn NdcDepthToViewDepth(z_ndc: f32) -> f32 {\n    // z_ndc = A + B/viewZ, where gProj[2,2]=A and gProj[3,2]=B.\n    let viewZ = view.gProj[3][2] / (z_ndc - view.gProj[2][2]);\n    return viewZ;\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    // return vec4f(1.0);\n    let uv = input.vUv;\n\n\n    // unpack into float array.\n    let blurWeights = array<f32, 12>(\n        gBlurWeights[0].x, gBlurWeights[0].y, gBlurWeights[0].z, gBlurWeights[0].w,\n        gBlurWeights[1].x, gBlurWeights[1].y, gBlurWeights[1].z, gBlurWeights[1].w,\n        gBlurWeights[2].x, gBlurWeights[2].y, gBlurWeights[2].z, gBlurWeights[2].w,\n    );\n\n    let gBlurRadius = i32(blurRadius);\n    let gHorizontalBlur = bool(blurHorizontal);\n\n    var texOffset = vec2f(0);\n    if(gHorizontalBlur) {\n        texOffset = vec2f(gInvRenderTargetSize.x, 0.0);\n    }\n    else {\n        texOffset = vec2f(0.0, gInvRenderTargetSize.y);\n    }\n\n    let TexC = input.vUv;\n    var color = blurWeights[gBlurRadius] * textureSample(gInputMap, textureSampler, TexC);\n    var totalWeight = blurWeights[gBlurRadius];\n\n    let centerNormal = textureSample(gNormalMap, textureSampler, TexC).xyz;\n    let centerDepth = NdcDepthToViewDepth(textureSample(gDepthMap, textureSampler, TexC));\n    // let centerDepth = textureSample(gDepthMap, textureSampler, TexC);\n\n    for(var i = -gBlurRadius; i <=gBlurRadius; i++) {\n        // We already added in the center weight.\n        if( i == 0 ) {\n            continue;\n        }\n\n        let tex = TexC + f32(i) * texOffset;\n\n        let neighborNormal = textureSample(gNormalMap, textureSampler, tex).xyz;\n        let neighborDepth = NdcDepthToViewDepth(textureSample(gDepthMap, textureSampler, tex));\n        // let neighborDepth = textureSample(gDepthMap, textureSampler, tex);\n\n        //\n        // If the center value and neighbor values differ too much (either in\n        // normal or depth), then we assume we are sampling across a discontinuity.\n        // We discard such samples from the blur.\n        //\n        if( dot(neighborNormal, centerNormal) >= 0.8f &&\n            abs(neighborDepth - centerDepth) <= 0.2f )\n        {\n            let weight = blurWeights[i + gBlurRadius];\n\n            // Add neighbor pixel to blur.\n            color += weight * textureSampleLevel(gInputMap, textureSampler, tex, 0);\n\n            totalWeight += weight;\n        }\n    }\n    return color;\n    // return vec4(centerNormal, 1.0);\n    // return vec4(pow(centerDepth, 100));\n}";

// src/renderer/webgpu/shader/wgsl/Blit.wgsl
var Blit_default = "struct VertexInput {\n    @location(0) position : vec2<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var texture: texture_2d<f32>;\n@group(0) @binding(1) var textureSampler: sampler;\n@group(0) @binding(2) var<storage, read> mip: f32;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output: VertexOutput;\n    output.position = vec4(input.position, 0.0, 1.0);\n    output.vUv = input.uv;\n    return output;\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    let uv = input.vUv;\n    let color = textureSampleLevel(texture, textureSampler, uv, mip);\n    return color;\n}";

// src/renderer/webgpu/shader/WEBGPUShaders.ts
var WEBGPUShaders = class {
  static DeferredMeshShaderCode = DeferredMeshShader_default;
  static DeferredLightingPBRShaderCode = DeferredLightingPBRShader_default;
  static ShadowShaderCode = ShadowPass_default;
  static WireframeShaderCode = WireframeShader_default;
  static QuadShaderCode = QuadShader_default;
  static SSGICode = SSGI_default;
  static DownSampleCode = DownSample_default;
  static UpSampleCode = UpSample_default;
  static BlurCode = Blur_default;
  static BlitCode = Blit_default;
};

// src/renderer/ShaderCode.ts
var ShaderCode = class {
  static get DeferredMeshShader() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.DeferredMeshShaderCode;
    throw Error("Unknown api");
  }
  static get DeferredLightingPBRShader() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.DeferredLightingPBRShaderCode;
    throw Error("Unknown api");
  }
  static get ShadowShader() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.ShadowShaderCode;
    throw Error("Unknown api");
  }
  static get QuadShader() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.QuadShaderCode;
    throw Error("Unknown api");
  }
  static get SSGI() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.SSGICode;
    throw Error("Unknown api");
  }
  static get DownSample() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.DownSampleCode;
    throw Error("Unknown api");
  }
  static get UpSample() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.UpSampleCode;
    throw Error("Unknown api");
  }
  static get Blur() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.BlurCode;
    throw Error("Unknown api");
  }
  static get Blit() {
    if (Renderer.type === "webgpu") return WEBGPUShaders.BlitCode;
    throw Error("Unknown api");
  }
};

// src/renderer/webgpu/WEBGPUMipsGenerator.ts
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
        code: ShaderCode.QuadShader
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
      format: sourceBuffer.format,
      mipLevelCount: this.numMipLevels(source.width, source.height),
      size: [source.width, source.height, 1],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
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
  type;
  dimension;
  buffer;
  view = [];
  currentLayer = 0;
  constructor(width, height, depth, format, type, dimension) {
    this.type = type;
    this.dimension = dimension;
    let textureUsage = GPUTextureUsage.COPY_DST;
    let textureType = GPUTextureUsage.TEXTURE_BINDING;
    if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
    else if (type === 1 /* DEPTH */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    else if (type === 2 /* RENDER_TARGET */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    else throw Error(`Unknown texture format ${format}`);
    this.buffer = WEBGPURenderer.device.createTexture({
      size: [width, height, depth],
      format,
      usage: textureUsage | textureType
    });
    this.width = width;
    this.height = height;
    this.depth = depth;
  }
  GetBuffer() {
    return this.buffer;
  }
  GetView() {
    if (!this.view[this.currentLayer]) {
      this.view[this.currentLayer] = this.buffer.createView({
        dimension: this.dimension,
        baseArrayLayer: this.currentLayer,
        arrayLayerCount: 1
      });
    }
    return this.view[this.currentLayer];
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
  // Format and types are very limited for now
  // https://github.com/gpuweb/gpuweb/issues/2322
  static FromImageBitmap(imageBitmap, width, height) {
    const texture = new _WEBGPUTexture(width, height, 1, Renderer.SwapChainFormat, 2 /* RENDER_TARGET */, "2d");
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
  depth;
  type;
  dimension;
  SetActiveLayer(layer) {
  }
  GetActiveLayer() {
    throw Error("Base class.");
  }
  GenerateMips() {
  }
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat) {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 0 /* IMAGE */, "2d");
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
  static Create(width, height, depth = 1, format = "depth24plus") {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d");
    throw Error("Renderer type invalid");
  }
};
var RenderTexture = class extends Texture2 {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat) {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 2 /* RENDER_TARGET */, "2d");
    throw Error("Renderer type invalid");
  }
};
var DepthTextureArray = class extends Texture2 {
  static Create(width, height, depth = 1, format = "depth24plus") {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d-array");
    throw Error("Renderer type invalid");
  }
};

// src/components/Camera.ts
var Camera = class _Camera extends Component {
  renderTarget = null;
  depthTarget = null;
  backgroundColor = new Color(0, 0, 0, 1);
  projectionMatrix = new Matrix4();
  viewMatrix = new Matrix4();
  static mainCamera;
  near;
  far;
  SetPerspective(fov, aspect, near, far) {
    this.near = near;
    this.far = far;
    this.projectionMatrix.perspectiveZO(fov, aspect, near, far);
  }
  SetOrthographic(left, right, top, bottom, near, far) {
    this.near = near;
    this.far = far;
    this.projectionMatrix.orthogonal(left, right, top, bottom, near, far);
  }
  Start() {
    if (_Camera.mainCamera === this) this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height, 1);
    EventSystem.on("TransformUpdated", (transform) => {
      if (this.transform === transform && _Camera.mainCamera === this) {
        EventSystem.emit("MainCameraUpdated", this);
      }
    });
  }
  Update() {
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
var BaseBuffer = class {
  buffer;
  size;
  constructor(sizeInBytes, type) {
    let usage = void 0;
    if (type == 0 /* STORAGE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 1 /* STORAGE_WRITE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 3 /* VERTEX */) usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 4 /* INDEX */) usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 2 /* UNIFORM */) usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
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
var Buffer2 = class {
  size;
  static Create(size, type) {
    if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type);
    else throw Error("Renderer type invalid");
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
  }
  async GetData(sourceOffset, destinationOffset, size) {
    return new ArrayBuffer(1);
  }
};
var DynamicBuffer2 = class {
  size;
  minBindingSize;
  dynamicOffset = 0;
  static Create(size, type, minBindingSize) {
    if (Renderer.type === "webgpu") return new WEBGPUDynamicBuffer(size, type, minBindingSize);
    else throw Error("Renderer type invalid");
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
  }
  async GetData(sourceOffset, destinationOffset, size) {
    return new ArrayBuffer(1);
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
    if (params && params.magFilter) samplerDescriptor.minFilter = params.magFilter;
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

// src/renderer/webgpu/shader/WEBGPUShaderUtils.ts
var WEBGPUShaderUtils = class {
  static WGSLPreprocess(code, defines) {
    const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);
    for (const condition of coditions) {
      const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
      const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
      if (defines[variable] === true) code = code.replaceAll(condition, value);
      else code = code.replaceAll(condition, "");
    }
    return code;
  }
};

// src/renderer/webgpu/shader/WEBGPUBaseShader.ts
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
    const code = params.defines ? WEBGPUShaderUtils.WGSLPreprocess(params.code, params.defines) : params.code;
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
        const sampleType = uniform.type === "depthTexture" ? "depth" : "float";
        group.layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: { sampleType, viewDimension: uniform.buffer.dimension } });
        const view = { dimension: uniform.buffer.dimension, arrayLayerCount: uniform.buffer.GetBuffer().depthOrArrayLayers, baseArrayLayer: 0 };
        group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer().createView(view) });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUTextureSampler) {
        let type = void 0;
        if (uniform.type === "sampler") type = "filtering";
        else if (uniform.type === "sampler-compare") type = "comparison";
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
      uniform.buffer = Buffer2.Create(data.byteLength, type);
      this.needsUpdate = true;
    }
    WEBGPURenderer.device.queue.writeBuffer(uniform.buffer.GetBuffer(), bufferOffset, data, dataOffset, size);
  }
  SetUniformDataFromBuffer(name, data) {
    if (!data) throw Error("Invalid buffer");
    const binding = this.GetValidUniform(name);
    if (!binding.buffer || binding.buffer.GetBuffer() !== data.GetBuffer()) {
      binding.buffer = data;
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
  RebuildDescriptors() {
  }
  OnPreRender() {
    if (this.needsUpdate || !this.pipeline || !this.bindGroups) {
      this.RebuildDescriptors();
    }
  }
};

// src/renderer/webgpu/shader/WEBGPUComputeShader.ts
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
    console.warn("Compiling shader");
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

// src/renderer/webgpu/shader/WEBGPUShader.ts
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
    console.warn("Compiling shader");
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
    for (const output of this.params.colorOutputs) targets.push({ format: output.format });
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
    if (this.params.depthOutput) pipelineDescriptor.depthStencil = { depthWriteEnabled: true, depthCompare: "less", format: this.params.depthOutput };
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
var Shader = class extends BaseShader {
  id;
  params;
  static Create(params) {
    if (Renderer.type === "webgpu") return new WEBGPUShader(params);
    throw Error("Unknown api");
  }
};
var Compute = class extends BaseShader {
  params;
  static Create(params) {
    if (Renderer.type === "webgpu") return new WEBGPUComputeShader(params);
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
    shader.OnPreRender();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i = 0; i < shader.bindGroups.length; i++) {
      let dynamicOffsetsV2 = [];
      for (const buffer of shader.bindGroupsInfo[i].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsetsV2.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i, shader.bindGroups[i], dynamicOffsetsV2);
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
        positions.GetBuffer().size;
        this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount);
      } else {
        const indexBuffer = geometry.index.buffer;
        this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
        this.activeRenderPass.drawIndexed(indexBuffer.size / 4, instanceCount);
      }
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
  static CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.copyBufferToBuffer(source.GetBuffer(), sourceOffset, destination.GetBuffer(), destinationOffset, size);
  }
  static CopyTextureToTexture(source, destination) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.copyTextureToTexture({ texture: source.GetBuffer() }, { texture: destination.GetBuffer() }, [source.width, source.height, source.depth]);
  }
};

// src/renderer/RendererContext.ts
var RendererContext = class {
  constructor() {
  }
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
  static CopyBufferToBuffer(source, destination, sourceOffset = 0, destinationOffset = 0, size = void 0) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size ? size : source.size);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToTexture(source, destination) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTexture(source, destination);
    else throw Error("Unknown render api type.");
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

// src/renderer/Material.ts
var Material = class {
  shader;
};
var DeferredMeshMaterial = class extends Material {
  constructor(params) {
    super();
    const DEFINES = {
      USE_ALBEDO_MAP: params?.albedoMap ? true : false,
      USE_NORMAL_MAP: params?.normalMap ? true : false,
      USE_HEIGHT_MAP: params?.heightMap ? true : false,
      USE_ROUGHNESS_MAP: params?.roughnessMap ? true : false,
      USE_METALNESS_MAP: params?.metalnessMap ? true : false,
      USE_EMISSIVE_MAP: params?.emissiveMap ? true : false,
      USE_AO_MAP: params?.aoMap ? true : false
    };
    let code = ShaderCode.DeferredMeshShader;
    let shaderParams = {
      code,
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
        RoughnessMap: { group: 0, binding: 8, type: "texture" },
        MetalnessMap: { group: 0, binding: 9, type: "texture" },
        EmissiveMap: { group: 0, binding: 10, type: "texture" },
        AOMap: { group: 0, binding: 11, type: "texture" },
        cameraPosition: { group: 0, binding: 12, type: "storage" }
      }
    };
    shaderParams = Object.assign({}, shaderParams, params);
    this.shader = Shader.Create(shaderParams);
    const albedoColor = shaderParams?.albedoColor ? shaderParams.albedoColor : new Color(1, 1, 1, 1);
    const emissiveColor = shaderParams?.emissiveColor ? shaderParams.emissiveColor : new Color(0, 0, 0, 0);
    const roughness = shaderParams?.roughness ? shaderParams.roughness : 0;
    const metalness = shaderParams?.metalness ? shaderParams.metalness : 0;
    const unlit = shaderParams?.unlit && shaderParams.unlit === true ? 1 : 0;
    if (DEFINES.USE_ALBEDO_MAP || DEFINES.USE_NORMAL_MAP || DEFINES.USE_HEIGHT_MAP || DEFINES.USE_ROUGHNESS_MAP || DEFINES.USE_METALNESS_MAP || DEFINES.USE_EMISSIVE_MAP || DEFINES.USE_AO_MAP) {
      const textureSampler = TextureSampler.Create();
      this.shader.SetSampler("TextureSampler", textureSampler);
    }
    this.shader.SetArray("material", new Float32Array([
      albedoColor.r,
      albedoColor.g,
      albedoColor.b,
      albedoColor.a,
      emissiveColor.r,
      emissiveColor.g,
      emissiveColor.b,
      emissiveColor.a,
      roughness,
      metalness,
      unlit,
      0
    ]));
    if (DEFINES.USE_ALBEDO_MAP === true && shaderParams.albedoMap) this.shader.SetTexture("AlbedoMap", shaderParams.albedoMap);
    if (DEFINES.USE_NORMAL_MAP === true && shaderParams.normalMap) this.shader.SetTexture("NormalMap", shaderParams.normalMap);
    if (DEFINES.USE_HEIGHT_MAP === true && shaderParams.heightMap) this.shader.SetTexture("HeightMap", shaderParams.heightMap);
    if (DEFINES.USE_ROUGHNESS_MAP === true && shaderParams.roughnessMap) this.shader.SetTexture("RoughnessMap", shaderParams.roughnessMap);
    if (DEFINES.USE_METALNESS_MAP === true && shaderParams.metalnessMap) this.shader.SetTexture("MetalnessMap", shaderParams.metalnessMap);
    if (DEFINES.USE_EMISSIVE_MAP === true && shaderParams.emissiveMap) this.shader.SetTexture("EmissiveMap", shaderParams.emissiveMap);
    if (DEFINES.USE_AO_MAP === true && shaderParams.aoMap) this.shader.SetTexture("AOMap", shaderParams.aoMap);
  }
};

// src/components/InstancedMesh.ts
var InstancedMesh = class extends Mesh {
  _maxInstanceCount = 1e6;
  _matricesBuffer = Buffer2.Create(this.maxInstanceCount * 4 * 16, 0 /* STORAGE */);
  get matricesBuffer() {
    return this._matricesBuffer;
  }
  get maxInstanceCount() {
    return this._maxInstanceCount;
  }
  set maxInstanceCount(maxInstanceCount) {
    this._maxInstanceCount = maxInstanceCount;
    Buffer2.Create(this.maxInstanceCount * 4 * 16, 0 /* STORAGE */);
  }
  _instanceCount = 0;
  get instanceCount() {
    return this._instanceCount;
  }
  SetMatrixAt(index, matrix) {
    if (!this._matricesBuffer) throw Error("Matrices buffer not created.");
    if (index > this.maxInstanceCount) throw Error("Trying to create more instances than max instance count.");
    this._instanceCount = Math.max(index, this._instanceCount);
    this._matricesBuffer.SetArray(matrix.elements, 4 * 16 * index);
  }
};

// src/plugins/UIStats.ts
var UISliderStat = class {
  constructor(container, label, min, max, step, defaultValue, callback) {
    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    const sliderElement = document.createElement("input");
    sliderElement.type = "range";
    sliderElement.min = `${min}`;
    sliderElement.max = `${max}`;
    sliderElement.step = `${step}`;
    sliderElement.value = `${defaultValue}`;
    sliderElement.addEventListener("input", (event) => {
      callback(parseFloat(sliderElement.value));
    });
    container.append(labelElement, sliderElement);
  }
};
var UITextStat = class {
  textElement;
  constructor(container, label, defaultValue) {
    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    this.textElement = document.createElement("pre");
    this.textElement.textContent = defaultValue;
    container.append(labelElement, this.textElement);
  }
  SetValue(value) {
    this.textElement.textContent = value;
  }
};
var UIStats = class {
  container;
  stats = [];
  constructor() {
    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.top = "0px";
    this.container.style.color = "white";
    this.container.style.display = "grid";
    this.container.style.backgroundColor = "#222222";
    this.container.style.fontSize = "10px";
    document.body.appendChild(this.container);
  }
  SetPosition(position) {
    if (position.left) this.container.style.left = `${position.left}px`;
    if (position.right) this.container.style.right = `${position.right}px`;
    if (position.top) this.container.style.top = `${position.top}px`;
    if (position.bottom) this.container.style.bottom = `${position.bottom}px`;
  }
  AddSlider(label, min, max, step, defaultValue, callback) {
    const stat = new UISliderStat(this.container, label, min, max, step, defaultValue, callback);
    this.stats.push(stat);
    return stat;
  }
  AddTextStat(label, defaultValue) {
    const stat = new UITextStat(this.container, label, defaultValue);
    this.stats.push(stat);
    return stat;
  }
};

// src/plugins/Debugger.ts
var _Debugger = class {
  ui;
  frameRenderPassesStat;
  frameRenderPasses = [];
  constructor() {
    this.ui = new UIStats();
    this.frameRenderPassesStat = this.ui.AddTextStat("Render passes: ", "");
  }
  ResetFrame() {
    this.frameRenderPasses = [];
    this.frameRenderPassesStat.SetValue("");
  }
  AddFrameRenderPass(name) {
    if (this.frameRenderPasses.includes(name)) return;
    this.frameRenderPasses.push(name);
    this.frameRenderPassesStat.SetValue(this.frameRenderPasses.join("\n"));
  }
};
var Debugger = new _Debugger();

// src/renderer/passes/DeferredMeshRenderPass.ts
var DeferredMeshRenderPass = class extends RenderPass {
  name = "DeferredMeshRenderPass";
  gbufferAlbedoRT;
  gbufferNormalRT;
  gbufferERMO;
  gbufferDepthDT;
  constructor(inputCamera, outputGBufferAlbedo, outputGBufferNormal, outputGBufferERMO, outputGBufferDepth) {
    super({ inputs: [inputCamera], outputs: [outputGBufferAlbedo, outputGBufferNormal, outputGBufferERMO, outputGBufferDepth] });
    this.gbufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gbufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gbufferERMO = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gbufferDepthDT = DepthTexture.Create(Renderer.width, Renderer.height, 1);
  }
  execute(resources, inputCamera, outputGBufferAlbedo, outputGBufferNormal, outputGBufferERMO, outputGBufferDepth) {
    Debugger.AddFrameRenderPass("DeferredMeshRenderPass");
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const backgroundColor = inputCamera.backgroundColor;
    RendererContext.BeginRenderPass(
      "DeferredMeshRenderPass",
      [
        { target: this.gbufferAlbedoRT, clear: true, color: backgroundColor },
        { target: this.gbufferNormalRT, clear: true, color: backgroundColor },
        { target: this.gbufferERMO, clear: true, color: backgroundColor }
      ],
      { target: this.gbufferDepthDT, clear: true }
    );
    const projectionMatrix = inputCamera.projectionMatrix;
    const viewMatrix = inputCamera.viewMatrix;
    const scene = Camera.mainCamera.gameObject.scene;
    const meshes = scene.GetComponents(Mesh);
    for (const mesh of meshes) {
      const geometry = mesh.GetGeometry();
      const materials = mesh.GetMaterials(DeferredMeshMaterial);
      for (const material of materials) {
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        RendererContext.DrawGeometry(geometry, shader, 1);
      }
    }
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    for (const instancedMesh of instancedMeshes) {
      const geometry = instancedMesh.GetGeometry();
      const materials = instancedMesh.GetMaterials(DeferredMeshMaterial);
      for (const material of materials) {
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount + 1);
      }
    }
    RendererContext.EndRenderPass();
    resources.setResource(outputGBufferAlbedo, this.gbufferAlbedoRT);
    resources.setResource(outputGBufferNormal, this.gbufferNormalRT);
    resources.setResource(outputGBufferERMO, this.gbufferERMO);
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
    super(array, 3 /* VERTEX */);
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
    console.log("sphere", geometry);
    return geometry;
  }
};

// src/components/Light.ts
var Light = class extends Component {
  camera;
  color = new Color(1, 1, 1);
  intensity = 1;
  range = 1e3;
  Start() {
    EventSystem.on("TransformUpdated", (transform) => {
      if (this.transform === transform) {
        EventSystem.emit("LightUpdated", this);
      }
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
    this.camera.SetOrthographic(-1, 1, -1, 1, 0.1, 100);
  }
};

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
};

// src/renderer/passes/ShadowPass.ts
var lightsCSMProjectionMatrix = [];
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
  for (let i = 0; i < numOfCascades; ++i) {
    let corners = getWorldSpaceCorners(camera, shadowDepthPercentage * f(i / (numOfCascades - 1)), shadowDepthPercentage * f((i + 1) / (numOfCascades - 1)));
    const center = corners[0].clone();
    for (let i2 = 1; i2 < 8; ++i2) {
      center.add(corners[i2]);
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
    for (let i2 = 0; i2 < 8; ++i2) {
      const viewSpaceCorner = corners[i2].clone().applyMatrix4(viewMatrix);
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
var ShadowPass = class extends RenderPass {
  name = "ShadowPass";
  shadowDepthDT;
  shadowWidth = 1024;
  shadowHeight = 1024;
  shader;
  instancedShader;
  lightProjectionViewMatricesBuffer;
  modelMatrices;
  lightProjectionMatrixBuffer;
  needsUpdate = true;
  constructor(outputDepthDT) {
    super({ outputs: [outputDepthDT] });
    this.shader = Shader.Create({
      code: ShaderCode.ShadowShader,
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
      depthOutput: "depth24plus",
      colorOutputs: []
    });
    this.instancedShader = Shader.Create({
      code: ShaderCode.ShadowShader,
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
      depthOutput: "depth24plus",
      colorOutputs: []
    });
    this.shadowDepthDT = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, 1);
    EventSystem.on("LightUpdated", (component) => {
      this.needsUpdate = true;
    });
    EventSystem.on("MeshUpdated", (component) => {
      this.needsUpdate = true;
    });
    EventSystem.on("MainCameraUpdated", (component) => {
      this.needsUpdate = true;
    });
  }
  cascadeIndexBuffers = [];
  cascadeCurrentIndexBuffer;
  execute(resources, outputDepthDT) {
    if (!this.needsUpdate) return;
    Debugger.AddFrameRenderPass("ShadowPass");
    const scene = Camera.mainCamera.gameObject.scene;
    const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
    if (lights.length === 0) {
      resources.setResource(outputDepthDT, this.shadowDepthDT);
      return;
    }
    if (lights.length !== this.shadowDepthDT.depth) {
      this.shadowDepthDT = DepthTextureArray.Create(this.shadowWidth, this.shadowHeight, lights.length);
    }
    const meshes = scene.GetComponents(Mesh);
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    if (!this.lightProjectionMatrixBuffer) {
      this.lightProjectionMatrixBuffer = Buffer2.Create(lights.length * 4 * 4 * 16, 0 /* STORAGE */);
      this.shader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
      this.instancedShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
    }
    if (!this.modelMatrices || this.modelMatrices.size / 256 !== meshes.length) {
      this.modelMatrices = DynamicBuffer2.Create(meshes.length * 256, 0 /* STORAGE */, 256);
    }
    const numOfCascades = 4;
    const assignmentExponent = 2.5;
    const shadowDepthPercentage = 1;
    const zMult = 10;
    if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size / 4 / 4 / 16 !== lights.length) {
      this.lightProjectionViewMatricesBuffer = Buffer2.Create(lights.length * numOfCascades * 4 * 16, 0 /* STORAGE */);
    }
    if (!this.cascadeCurrentIndexBuffer) {
      this.cascadeCurrentIndexBuffer = Buffer2.Create(4, 0 /* STORAGE */);
    }
    if (this.cascadeIndexBuffers.length === 0) {
      for (let i = 0; i < numOfCascades; i++) {
        const buffer = Buffer2.Create(4, 0 /* STORAGE */);
        buffer.SetArray(new Float32Array([i]));
        this.cascadeIndexBuffers.push(buffer);
      }
    }
    lightsCSMProjectionMatrix = [];
    for (let i = 0; i < lights.length; i++) {
      const lightViewMatrixInverse = lights[i].camera.viewMatrix.clone().invert();
      const lightDirection = new Vector3(0, 1, 0).applyMatrix4(lightViewMatrixInverse).mul(-1).normalize();
      const lightData = getLightViewProjections(Camera.mainCamera, lightDirection, numOfCascades, assignmentExponent, shadowDepthPercentage, zMult);
      const ld = new Float32Array(lightData.flatMap((v) => v.elements).flatMap((v) => [...v]));
      this.lightProjectionViewMatricesBuffer.SetArray(ld, i * numOfCascades * 4 * 16);
      lightsCSMProjectionMatrix.push(ld);
    }
    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      if (!mesh.enableShadows) continue;
      this.modelMatrices.SetArray(mesh.transform.localToWorldMatrix.elements, i * 256);
    }
    this.shader.SetBuffer("modelMatrix", this.modelMatrices);
    this.shadowDepthDT.SetActiveLayer(0);
    this.shader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    this.instancedShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    for (let i = 0; i < lights.length; i++) {
      RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, i * 4 * 4 * 16, 0, 4 * 4 * 16);
      const numOfCascades2 = 4;
      for (let cascadePass = 0; cascadePass < numOfCascades2; cascadePass++) {
        RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer);
        RendererContext.BeginRenderPass("ShadowPass", [], { target: this.shadowDepthDT, clear: cascadePass === 0 ? true : false });
        const width = this.shadowWidth / 2;
        const height = this.shadowHeight / 2;
        let x = 0;
        let y = 0;
        if (cascadePass >= 2) x += width;
        if (cascadePass % 2 !== 0) y += height;
        RendererContext.SetViewport(x, y, width, height, 0, 1);
        for (let i2 = 0; i2 < meshes.length; i2++) {
          const mesh = meshes[i2];
          if (!mesh.enableShadows) continue;
          const uniform_offset = i2 * 256;
          this.modelMatrices.dynamicOffset = uniform_offset;
          RendererContext.DrawGeometry(mesh.GetGeometry(), this.shader, 1);
        }
        for (let instancedMesh of instancedMeshes) {
          if (instancedMesh.instanceCount === 0) continue;
          this.instancedShader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
          RendererContext.DrawGeometry(instancedMesh.GetGeometry(), this.instancedShader, instancedMesh.instanceCount);
        }
        RendererContext.EndRenderPass();
      }
      this.shadowDepthDT.SetActiveLayer(this.shadowDepthDT.GetActiveLayer() + 1);
    }
    resources.setResource(outputDepthDT, this.shadowDepthDT);
    this.needsUpdate = false;
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
  constructor(inputGBufferAlbedo, inputGBufferNormal, inputGbufferERMO, inputGBufferDepth, inputShadowPassDepth, outputLightingPass) {
    super({ inputs: [inputGBufferAlbedo, inputGBufferNormal, inputGbufferERMO, inputGBufferDepth, inputShadowPassDepth], outputs: [outputLightingPass] });
    this.shader = Shader.Create({
      code: ShaderCode.DeferredLightingPBRShader,
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
        shadowSampler: { group: 0, binding: 9, type: "sampler" },
        shadowSamplerComp: { group: 0, binding: 10, type: "sampler-compare" }
      },
      colorOutputs: [{ format: Renderer.SwapChainFormat }]
    });
    this.sampler = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    this.shader.SetSampler("textureSampler", this.sampler);
    const shadowSampler = TextureSampler.Create({ minFilter: "nearest", magFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    this.shader.SetSampler("shadowSampler", shadowSampler);
    const shadowSamplerComp = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", compare: "less" });
    this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);
    this.quadGeometry = Geometry.Plane();
    this.lightsCountBuffer = Buffer2.Create(1 * 4, 0 /* STORAGE */);
    this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height);
    EventSystem.on("LightUpdated", (component) => {
      this.needsUpdate = true;
    });
    EventSystem.on("MainCameraUpdated", (component) => {
      this.needsUpdate = true;
    });
  }
  updateLightsBuffer() {
    const scene = Camera.mainCamera.gameObject.scene;
    const lights = [...scene.GetComponents(SpotLight), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(AreaLight)];
    const lightBufferSize = 4 + 16 + 4 * 16 + 16 + 16 + 3 + 1 + 4 + 4;
    const lightBuffer = new Float32Array(Math.max(1, lights.length) * lightBufferSize);
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
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
      lightBuffer.set([
        light.transform.position.x,
        light.transform.position.y,
        light.transform.position.z,
        1,
        ...light.camera.projectionMatrix.elements,
        ...lightsCSMProjectionMatrix[i],
        ...light.camera.viewMatrix.elements,
        ...light.camera.viewMatrix.clone().invert().elements,
        light.color.r,
        light.color.g,
        light.color.b,
        lightType,
        ...params1,
        ...params2
      ], i * lightBufferSize);
    }
    if (!this.lightsBuffer || this.lightsBuffer.size !== lights.length * lightBufferSize * 4) {
      console.log("HERE");
      this.lightsBuffer = Buffer2.Create(lights.length * lightBufferSize * 4, 0 /* STORAGE */);
      this.lightsCountBuffer = Buffer2.Create(1 * 4, 0 /* STORAGE */);
    }
    this.lightsBuffer.SetArray(lightBuffer);
    this.lightsCountBuffer.SetArray(new Uint32Array([lights.length]));
    this.shader.SetBuffer("lights", this.lightsBuffer);
    this.shader.SetBuffer("lightCount", this.lightsCountBuffer);
    this.needsUpdate = false;
  }
  execute(resources, inputGBufferAlbedo, inputGBufferNormal, inputGbufferERMO, inputGBufferDepth, inputShadowPassDepth, outputLightingPass) {
    Debugger.AddFrameRenderPass("DeferredLightingPass");
    const camera = Camera.mainCamera;
    if (!this.lightsBuffer || !this.lightsCountBuffer || this.needsUpdate) {
      this.updateLightsBuffer();
    }
    RendererContext.BeginRenderPass("DeferredLightingPass", [{ clear: true }]);
    this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
    this.shader.SetTexture("normalTexture", inputGBufferNormal);
    this.shader.SetTexture("ermoTexture", inputGbufferERMO);
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);
    const view = new Float32Array(4 + 4 + 16 + 16);
    view.set([Renderer.width, Renderer.height, 0], 0);
    view.set(camera.transform.position.elements, 4);
    const tempMatrix = new Matrix4();
    tempMatrix.copy(camera.projectionMatrix).invert();
    view.set(tempMatrix.elements, 8);
    tempMatrix.copy(camera.viewMatrix).invert();
    view.set(tempMatrix.elements, 24);
    this.shader.SetArray("view", view);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
    resources.setResource(outputLightingPass, this.outputLightingPass);
  }
};

// src/renderer/passes/DebuggerPass.ts
var DebuggerPass = class extends RenderPass {
  name = "DebuggerPass";
  shader;
  quadGeometry;
  constructor() {
    super({});
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
        @group(0) @binding(1) var albedoTexture: texture_2d<f32>;
        // @group(0) @binding(2) var shadowMapTexture: texture_depth_2d;
        @group(0) @binding(2) var shadowMapTexture: texture_depth_2d_array;
        
        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            let threshold = vec2(0.5, 0.5);
            let quadrant = step(threshold, uv);
            let baseCoords = uv * 2.0 - quadrant;
        
            // let albedo = textureSample(albedoTexture, textureSampler, baseCoords) * (1.0 - quadrant.x) * quadrant.y;

            let shadowMap2 = textureSample(shadowMapTexture, textureSampler, baseCoords, 0) * quadrant.x * quadrant.y;
            let shadowMap3 = textureSample(shadowMapTexture, textureSampler, baseCoords, 1) * quadrant.x * (1.0 - quadrant.y);
            
            return vec4(shadowMap2) + vec4(shadowMap3);
        }
        `;
    this.shader = Shader.Create({
      code,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        uv: { location: 1, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        albedoTexture: { group: 0, binding: 1, type: "texture" },
        shadowMapTexture: { group: 0, binding: 2, type: "depthTexture" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    const sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", sampler);
  }
  execute(resources) {
    this.shader.SetTexture("shadowMapTexture", resources.getResource("ShadowPassDepth" /* ShadowPassDepth */));
    RendererContext.BeginRenderPass("DebuggerPass", [{ clear: false }]);
    RendererContext.SetViewport(Renderer.width - 250, 0, 250, 250);
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
  debuggerPass;
  frame = 0;
  passes = {
    SetMainCamera: new SetMeshRenderCameraPass({ outputs: ["MainCamera" /* MainCamera */] }),
    DeferredMeshRenderPass: new DeferredMeshRenderPass("MainCamera" /* MainCamera */, "GBufferAlbedo" /* GBufferAlbedo */, "GBufferNormal" /* GBufferNormal */, "GBufferERMO" /* GBufferERMO */, "GBufferDepth" /* GBufferDepth */),
    ShadowPass: new ShadowPass("ShadowPassDepth" /* ShadowPassDepth */),
    DeferredLightingPass: new DeferredLightingPass("GBufferAlbedo" /* GBufferAlbedo */, "GBufferNormal" /* GBufferNormal */, "GBufferERMO" /* GBufferERMO */, "GBufferDepth" /* GBufferDepth */, "ShadowPassDepth" /* ShadowPassDepth */, "LightingPassOutput" /* LightingPassOutput */)
    // SSGI: new SSGI(PassParams.GBufferDepth, PassParams.GBufferNormal, PassParams.LightingPassOutput, PassParams.GBufferAlbedo)
  };
  constructor(renderer) {
    this.renderer = renderer;
    this.renderGraph = new RenderGraph();
    for (const pass of Object.keys(this.passes)) {
      this.renderGraph.addPass(this.passes[pass]);
    }
    this.debuggerPass = new DebuggerPass();
  }
  Render(scene) {
    if (this.frame % 100 == 0) {
      Debugger.ResetFrame();
    }
    this.renderer.BeginRenderFrame();
    this.renderGraph.execute();
    this.debuggerPass.execute(this.renderGraph.resourcePool);
    this.renderer.EndRenderFrame();
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
  constructor(camera) {
    this._camera = camera;
    this._camera.transform.LookAt(this.center);
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
          const currentDistance = Math.hypot(event.pageX - otherPointer.pageX, event.pageY - otherPointer.pageY);
          const previousDistance = Math.hypot(prevPointer.pageX - otherPointer.pageX, prevPointer.pageY - otherPointer.pageY);
          const zoomFactor = currentDistance / previousDistance;
          this.zoom(zoomFactor);
        }
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

// src/renderer/webgpu/WEBGPUComputeContext.ts
var WEBGPUComputeContext = class {
  static activeComputePass = null;
  static BeginComputePass(name) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.activeComputePass) throw Error("There is already an active compute pass");
    const computePassDescriptor = {};
    this.activeComputePass = activeCommandEncoder.beginComputePass(computePassDescriptor);
    this.activeComputePass.label = "ComputePass: " + name;
  }
  static EndComputePass() {
    if (!this.activeComputePass) throw Error("No active compute pass");
    this.activeComputePass.end();
    this.activeComputePass = null;
  }
  static Dispatch(computeShader, workgroupCountX, workgroupCountY, workgroupCountZ) {
    if (!this.activeComputePass) throw Error("No active render pass");
    computeShader.OnPreRender();
    if (!computeShader.pipeline) throw Error("Shader doesnt have a pipeline");
    this.activeComputePass.setPipeline(computeShader.pipeline);
    for (let i = 0; i < computeShader.bindGroups.length; i++) {
      let dynamicOffsetsV2 = [];
      for (const buffer of computeShader.bindGroupsInfo[i].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsetsV2.push(buffer.dynamicOffset);
        }
      }
      this.activeComputePass.setBindGroup(i, computeShader.bindGroups[i], dynamicOffsetsV2);
    }
    this.activeComputePass.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
  }
};

// src/renderer/ComputeContext.ts
var ComputeContext = class {
  constructor() {
  }
  static BeginComputePass(name) {
    if (Renderer.type === "webgpu") WEBGPUComputeContext.BeginComputePass(name);
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

// src/TEST/Floor.ts
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
  mainCameraGameObject.transform.position.z = 15;
  mainCameraGameObject.name = "MainCamera";
  const camera = mainCameraGameObject.AddComponent(Camera);
  camera.SetPerspective(36, canvas.width / canvas.height, 0.5, 500);
  const controls = new OrbitControls(camera);
  controls.connect(canvas);
  const planeGeometry = Geometry.Plane();
  const cubeGeometry = Geometry.Cube();
  const lightGameObject = new GameObject(scene);
  lightGameObject.transform.position.set(4, 4, 0);
  lightGameObject.transform.LookAt(new Vector3(0, 0, 0));
  const light = lightGameObject.AddComponent(DirectionalLight);
  light.intensity = 10;
  light.range = 100;
  light.color.set(1, 0, 0, 1);
  const lightHelperGameObject = new GameObject(scene);
  lightHelperGameObject.transform.position.copy(lightGameObject.transform.position);
  lightHelperGameObject.transform.eulerAngles.x = 90;
  const lightHelperMesh = lightHelperGameObject.AddComponent(Mesh);
  lightHelperMesh.SetGeometry(Geometry.Plane());
  lightHelperMesh.AddMaterial(new DeferredMeshMaterial({ unlit: true, cullMode: "none", albedoColor: light.color }));
  lightHelperMesh.enableShadows = false;
  function updateLight() {
    const lookAtPositon = new Vector3(0.01, 0, 0);
    lightGameObject.transform.LookAt(lookAtPositon);
    lightHelperMesh.transform.position.copy(lightGameObject.transform.position);
    lightHelperMesh.transform.LookAt(lookAtPositon);
  }
  Debugger.ui.AddSlider("Light X", -10, 10, 0.1, light.transform.position.x, (value) => {
    lightGameObject.transform.position.x = value;
    updateLight();
  });
  Debugger.ui.AddSlider("Light Y", -10, 100, 0.1, light.transform.position.y, (value) => {
    lightGameObject.transform.position.y = value;
    updateLight();
  });
  Debugger.ui.AddSlider("Light Z", -10, 10, 0.1, light.transform.position.z, (value) => {
    lightGameObject.transform.position.z = value;
    updateLight();
  });
  let fov = 60;
  let near = 0.01;
  let far = 1e3;
  Debugger.ui.AddSlider("FOV", 1, 120, 0.1, 60, (value) => {
    fov = value;
    light.camera.SetPerspective(fov, Renderer.width / Renderer.height, near, far);
    updateLight();
  });
  Debugger.ui.AddSlider("Near", 1e-3, 0.01, 1e-3, 0.01, (value) => {
    near = value;
    light.camera.SetPerspective(fov, Renderer.width / Renderer.height, near, far);
    updateLight();
  });
  Debugger.ui.AddSlider("Far", 1, 1e3, 0.01, 1e3, (value) => {
    far = value;
    light.camera.SetPerspective(fov, Renderer.width / Renderer.height, near, far);
    updateLight();
  });
  Debugger.ui.AddSlider("Scale X", 1, 100, 0.1, 1, (value) => {
    lightGameObject.transform.scale.x = value;
    lightHelperMesh.transform.scale.x = value;
  });
  Debugger.ui.AddSlider("Scale Y", 1, 100, 0.1, 1, (value) => {
    lightGameObject.transform.scale.y = value;
    lightHelperMesh.transform.scale.y = value;
  });
  Debugger.ui.AddSlider("Scale Z", 1, 100, 0.1, 1, (value) => {
    lightGameObject.transform.scale.z = value;
    lightHelperMesh.transform.scale.z = value;
  });
  const albedo = await Texture2.Load("./assets/textures/metal-compartments-unity/metal-compartments_albedo.png");
  const normal = await Texture2.Load("./assets/textures/metal-compartments-unity/metal-compartments_normal-ogl.png");
  const ao = await Texture2.Load("./assets/textures/metal-compartments-unity/metal-compartments_ao.png");
  const height = await Texture2.Load("./assets/textures/metal-compartments-unity/metal-compartments_height.png");
  albedo.GenerateMips();
  normal.GenerateMips();
  ao.GenerateMips();
  height.GenerateMips();
  const roughness = 0.7;
  const metalness = 0.1;
  const floorMaterial = new DeferredMeshMaterial({ albedoColor: new Color(1, 1, 1, 1), albedoMap: albedo, normalMap: normal, heightMap: height, roughness, metalness });
  const topMaterial = new DeferredMeshMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness, metalness });
  const backMaterial = new DeferredMeshMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness, metalness });
  const leftMaterial = new DeferredMeshMaterial({ albedoColor: new Color(1, 0, 0, 1), roughness, metalness });
  const rightMaterial = new DeferredMeshMaterial({ albedoColor: new Color(0, 1, 0, 1), roughness, metalness });
  const floor = new GameObject(scene);
  floor.transform.scale.set(50, 50, 50);
  floor.transform.position.y = -5;
  floor.transform.eulerAngles.x = -90;
  const meshbottom = floor.AddComponent(Mesh);
  meshbottom.SetGeometry(planeGeometry);
  meshbottom.AddMaterial(floorMaterial);
  const cube = new GameObject(scene);
  cube.transform.scale.set(2, 4, 2);
  cube.transform.position.set(-2, -3, -2);
  cube.transform.eulerAngles.y = 20;
  const cubeMesh = cube.AddComponent(Mesh);
  cubeMesh.SetGeometry(cubeGeometry);
  cubeMesh.AddMaterial(new DeferredMeshMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness, metalness }));
  const cube2 = new GameObject(scene);
  cube2.transform.scale.set(2, 2, 2);
  cube2.transform.position.set(2, -4, 2);
  cube2.transform.eulerAngles.y = 65;
  const cubeMesh2 = cube2.AddComponent(Mesh);
  cubeMesh2.SetGeometry(cubeGeometry);
  cubeMesh2.AddMaterial(new DeferredMeshMaterial({ albedoColor: new Color(1, 1, 1, 1), roughness, metalness }));
  Debugger.ui.AddSlider("Cube X", -10, 10, 0.1, light.transform.position.x, (value) => {
    cube2.transform.position.x = value;
  });
  const compute = Compute.Create({
    code: `
            @group(0) @binding(0) var<storage, read> size: vec2<u32>;
            @group(0) @binding(1) var<storage, read> current: array<u32>;
            @group(0) @binding(2) var<storage, read_write> next: array<u32>;
            
            override blockSize = 8;
            
            fn getIndex(x: u32, y: u32) -> u32 {
                let h = size.y;
                let w = size.x;
                
                return (y % h) * w + (x % w);
            }
            
            fn getCell(x: u32, y: u32) -> u32 {
                return current[getIndex(x, y)];
            }
            
            fn countNeighbors(x: u32, y: u32) -> u32 {
                return getCell(x - 1, y - 1) + getCell(x, y - 1) + getCell(x + 1, y - 1) + 
                        getCell(x - 1, y) +                         getCell(x + 1, y) + 
                        getCell(x - 1, y + 1) + getCell(x, y + 1) + getCell(x + 1, y + 1);
            }
            
            @compute @workgroup_size(blockSize, blockSize)
            fn main(@builtin(global_invocation_id) grid: vec3u) {
                let x = grid.x;
                let y = grid.y;
                let n = countNeighbors(x, y);
                next[getIndex(x, y)] = select(u32(n == 3u), u32(n == 2u || n == 3u), getCell(x, y) == 1u);
                next[0] = 10;
            } 
        
        `,
    computeEntrypoint: "main",
    uniforms: {
      size: { group: 0, binding: 0, type: "storage" },
      current: { group: 0, binding: 1, type: "storage" },
      next: { group: 0, binding: 2, type: "storage-write" }
    }
  });
  renderer.BeginRenderFrame();
  ComputeContext.BeginComputePass("GOL");
  compute.SetArray("size", new Float32Array([128, 128]));
  compute.SetArray("current", new Float32Array([128]));
  const nextBuffer = Buffer2.Create(128, 0 /* STORAGE */);
  compute.SetBuffer("next", nextBuffer);
  ComputeContext.Dispatch(compute, 1, 1, 1);
  ComputeContext.EndComputePass();
  renderer.EndRenderFrame();
  const d = await nextBuffer.GetData(0, 0, 4);
  console.log(new Uint32Array(d));
  scene.Start();
}
Application();
