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
    const regex = new RegExp(`${escapeRegExp(start)}(.*?)${escapeRegExp(end)}`, "g");
    const matches = [];
    let match;
    while ((match = regex.exec(source)) !== null) {
      if (exclusive) matches.push(match[1]);
      else matches.push(start + match[1] + end);
    }
    return matches;
  }
  static StringReplaceAll(str, find, replace) {
    return str.replace(new RegExp(find, "g"), replace);
  }
  static StringRemoveTextBetween(input, start, end) {
    const regex = new RegExp(`${start}.*?${end}`, "gs");
    return input.replace(regex, "");
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
  shaders = [];
  enableGPUInstancing = true;
  AddShader(shader) {
    if (this.shaders.includes(shader)) return;
    this.shaders.push(shader);
    EventSystem.emit("MeshUpdated", this, "shader");
  }
  GetShaders() {
    return this.shaders;
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
  _eulerAngles = new Vector3(0, 0, 0);
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
  get scale() {
    return this._scale;
  }
  set scale(value) {
    this._scale.copy(value);
    this.onChanged();
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

// src/math/Color.ts
var Color = class {
  constructor(r = 0, g = 0, b = 0, a = 1) {
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
  BeginRenderFrame() {
  }
  EndRenderFrame() {
  }
};

// src/renderer/webgpu/WEBGPUTexture.ts
var WEBGPUTexture = class {
  id = Utils.UUID();
  width;
  height;
  buffer;
  view;
  constructor(width, height, format, type) {
    let textureFormat = "rgba32uint";
    let textureUsage = GPUTextureUsage.COPY_DST;
    let textureType = 0;
    if (format === void 0) textureFormat = WEBGPURenderer.presentationFormat;
    else if (format === 0 /* RGBA32F */) textureFormat = "rgba32float";
    else if (format === 1 /* RGBA32 */) textureFormat = "rgba32uint";
    if (!type) textureType = GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING;
    else if (type === 1 /* DEPTH */) {
      textureFormat = "depth24plus";
      textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
    } else if (type === 2 /* RENDER_TARGET */) {
      textureFormat = WEBGPURenderer.presentationFormat;
      textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    } else throw Error(`Unknown texture format ${format}`);
    this.buffer = WEBGPURenderer.device.createTexture({
      size: [width, height],
      format: textureFormat,
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
};

// src/renderer/Texture.ts
var Texture2 = class {
  id;
  width;
  height;
  static Create(width, height, format) {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, 0 /* IMAGE */);
    throw Error("Renderer type invalid");
  }
};
var DepthTexture = class extends Texture2 {
  static Create(width, height) {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, 1 /* RGBA32 */, 1 /* DEPTH */);
    throw Error("Renderer type invalid");
  }
};
var RenderTexture = class extends Texture2 {
  static Create(width, height) {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, 1 /* RGBA32 */, 2 /* RENDER_TARGET */);
    throw Error("Renderer type invalid");
  }
};

// src/components/Camera.ts
var Camera = class _Camera extends Component {
  renderTarget = null;
  depthTarget = null;
  clearValue = new Color(0.2, 0.2, 0.2, 1);
  fov = 60;
  aspect = 1;
  near = 0.3;
  far = 1e5;
  projectionMatrix = new Matrix4();
  viewMatrix = new Matrix4();
  static mainCamera;
  Start() {
    for (const gameObject of this.gameObject.scene.GetGameObjects()) {
      if (gameObject.GetComponent(_Camera)) {
        _Camera.mainCamera = this;
        break;
      }
    }
    if (_Camera.mainCamera === this) this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
  }
  Update() {
    this.projectionMatrix.perspective(this.fov, this.aspect, this.near, this.far).transpose();
    this.viewMatrix.copy(this.transform.worldToLocalMatrix);
  }
};

// src/renderer/webgpu/WEBGPURendererContext.ts
var WEBGPURendererContext = class {
  static compiledGeometryCache = /* @__PURE__ */ new Map();
  static CompileGeometry(geometry, shader) {
    const key = `${geometry.id}-${shader.id}`;
    let compiledMesh = this.compiledGeometryCache.get(key);
    if (compiledMesh) return compiledMesh;
    const pipelineDescriptor = {
      layout: "auto",
      vertex: {
        module: shader.GetModule(),
        entryPoint: shader.GetVertexEntrypoint(),
        buffers: [
          // position
          { arrayStride: 3 * 4, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }] },
          // normals
          { arrayStride: 3 * 4, attributes: [{ shaderLocation: 1, offset: 0, format: "float32x3" }] }
        ]
      },
      fragment: {
        module: shader.GetModule(),
        entryPoint: shader.GetFragmentEntrypoint(),
        targets: [{ format: WEBGPURenderer.presentationFormat }]
      },
      primitive: { topology: "triangle-list", frontFace: "ccw", cullMode: "back" }
    };
    if (shader.depthTest) pipelineDescriptor.depthStencil = { depthWriteEnabled: true, depthCompare: "less", format: "depth24plus" };
    const pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
    const bindGroupEntries = [];
    for (let [_, binding] of shader.GetBindings()) {
      if (!binding.buffer) throw Error(`Shader has binding (${binding.name}) but no buffer was set`);
      if (binding.buffer instanceof GPUBuffer) bindGroupEntries.push({ binding: binding.binding, resource: { buffer: binding.buffer } });
      else if (binding.buffer instanceof GPUTexture) bindGroupEntries.push({ binding: binding.binding, resource: binding.buffer.createView() });
      else if (binding.buffer instanceof GPUSampler) bindGroupEntries.push({ binding: binding.binding, resource: binding.buffer });
    }
    const bindGroup = WEBGPURenderer.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: bindGroupEntries
    });
    compiledMesh = { pipeline, bindGroup };
    this.compiledGeometryCache.set(key, compiledMesh);
    return compiledMesh;
  }
  static GetRenderPassDescriptor(renderTarget, depthTarget, clearColor, clearDepth, backgroundColor) {
    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: renderTarget ? renderTarget.GetView() : WEBGPURenderer.context.getCurrentTexture().createView(),
          clearValue: backgroundColor,
          loadOp: clearColor,
          storeOp: "store"
        }
      ]
    };
    if (depthTarget) renderPassDescriptor.depthStencilAttachment = { view: depthTarget.GetView(), depthClearValue: 1, depthLoadOp: clearDepth, depthStoreOp: "store" };
    return renderPassDescriptor;
  }
  static ProcessCommandBuffer(commandBuffer) {
    const geometry = commandBuffer.PopCommand("SetGeometry");
    const shader = commandBuffer.PopCommand("SetShader");
    const draw = commandBuffer.PopCommand("DrawIndexed");
    if (geometry && shader && draw) {
      const compiledMesh = this.CompileGeometry(geometry, shader);
      const vertexBuffer = commandBuffer.PopCommand("SetVertexBuffer");
      const normalBuffer = commandBuffer.PopCommand("SetNormalBuffer");
      const indexBuffer = commandBuffer.PopCommand("SetIndexBuffer");
      const renderTarget = commandBuffer.PopCommand("SetRenderTarget");
      const depthTarget = commandBuffer.PopCommand("SetDepthTarget");
      const clearCommand = commandBuffer.PopCommand("ClearRenderTarget");
      const clearColor = clearCommand && clearCommand.clearColor ? "clear" : "load";
      const clearDepth = clearCommand && clearCommand.clearDepth ? "clear" : "load";
      const backgroundColor = clearCommand ? clearCommand.backgroundColor : void 0;
      const renderPassDescriptor = this.GetRenderPassDescriptor(renderTarget, depthTarget, clearColor, clearDepth, backgroundColor);
      const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
      if (!activeCommandEncoder) throw Error("No active command encoder!!");
      const renderPass = activeCommandEncoder.beginRenderPass(renderPassDescriptor);
      renderPass.setPipeline(compiledMesh.pipeline);
      if (compiledMesh.bindGroup) renderPass.setBindGroup(0, compiledMesh.bindGroup);
      if (vertexBuffer) renderPass.setVertexBuffer(0, vertexBuffer.GetBuffer());
      if (normalBuffer) renderPass.setVertexBuffer(1, normalBuffer.GetBuffer());
      if (indexBuffer) renderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
      renderPass.drawIndexed(draw.indexCount, draw.instanceCount);
      renderPass.end();
    }
  }
};

// src/renderer/RendererContext.ts
var RendererContext = class {
  static ProcessCommandBuffer(commandBuffer) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.ProcessCommandBuffer(commandBuffer);
    else throw Error("Unknown render api type.");
  }
};

// src/renderer/webgpu/WEBGPUBuffer.ts
var WEBGPUBuffer = class {
  buffer;
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
    WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
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
    const shaders = mesh.GetShaders();
    if (!geometry || !geometry.vertices) return;
    if (!shaders || shaders.length === 0) return;
    const transform = mesh.transform;
    for (const shader of shaders) {
      if (mesh.enableGPUInstancing) this.AddRenderableInstanced(transform, geometry, shader);
      else this.AddRenderable(transform, geometry, shader);
    }
  }
  static UpdateTransform(transform) {
    const transformMap = this.transformMap.get(transform);
    if (!transformMap) return;
    if (transformMap.index === -1) transformMap.buffer.SetArray(transform.localToWorldMatrix.elements);
    else transformMap.buffer.SetArray(transform.localToWorldMatrix.elements, 4 * 16 * transformMap.index);
  }
};

// src/renderer/RenderCommandBuffer.ts
var RenderCommandBuffer = class {
  name;
  commands = /* @__PURE__ */ new Map();
  constructor(name = "") {
    this.name = name;
  }
  SetCommand(cmd, arg) {
    const command = { cmd, arg };
    this.commands.set(cmd, command);
  }
  PopCommand(cmd) {
    const command = this.commands.get(cmd);
    this.commands.delete(cmd);
    if (command) return command.arg;
    return null;
  }
  ClearRenderTarget(clearColor, clearDepth, backgroundColor) {
    this.SetCommand("ClearRenderTarget", { clearColor, clearDepth, backgroundColor });
  }
  SetRenderTarget(renderTarget, depthTarget) {
    this.SetCommand("SetRenderTarget", renderTarget);
    this.SetCommand("SetDepthTarget", depthTarget);
  }
  DrawMesh(geometry, shader, instances = 1) {
    this.SetCommand("SetGeometry", geometry);
    this.SetCommand("SetShader", shader);
    this.SetCommand("SetVertexBuffer", geometry.vertexBuffer);
    this.SetCommand("SetNormalBuffer", geometry.normalBuffer);
    this.SetCommand("SetIndexBuffer", geometry.indexBuffer);
    this.SetCommand("DrawIndexed", { indexCount: geometry.indexBuffer.size / 4, instanceCount: instances });
  }
};

// src/renderer/passes/MeshRenderPass.ts
var MeshRenderPass = class {
  renderTarget;
  depthTarget;
  constructor() {
    EventSystem.on("MeshUpdated", (mesh, type) => {
      MeshRenderCache.AddMesh(mesh);
    });
    EventSystem.on("CallUpdate", (component, flag) => {
      if (flag === false && component instanceof Transform) MeshRenderCache.UpdateTransform(component);
    });
    this.renderTarget = RenderTexture.Create(Renderer.width, Renderer.height);
    this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
  }
  Execute() {
    const commandBuffer = new RenderCommandBuffer("MeshRenderPass");
    const mainCamera = Camera.mainCamera;
    commandBuffer.ClearRenderTarget(true, true, mainCamera.clearValue);
    commandBuffer.SetRenderTarget(this.renderTarget, this.depthTarget);
    for (const renderable of MeshRenderCache.GetRenderable()) {
      renderable.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
      renderable.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
      if (!renderable.shader.HasBuffer("modelMatrix")) renderable.shader.SetBuffer("modelMatrix", renderable.modelMatrixBuffer);
    }
    for (const [_, renderableInstanced] of MeshRenderCache.GetRenderableInstanced()) {
      const shader = renderableInstanced.shader;
      shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
      shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
      if (!shader.HasBuffer("modelMatrix")) shader.SetBuffer("modelMatrix", renderableInstanced.modelMatrixBuffer);
      commandBuffer.DrawMesh(renderableInstanced.geometry, shader, renderableInstanced.transform.length);
    }
    return commandBuffer;
  }
  GetRenderTarget() {
    return this.renderTarget;
  }
  GetDepthTarget() {
    return this.depthTarget;
  }
};

// src/renderer/webgpu/WEBGPUShader.ts
var WGSLUsageToWEBGPU = ((WGSLUsageToWEBGPU2) => {
  WGSLUsageToWEBGPU2[WGSLUsageToWEBGPU2["storage"] = GPUBufferUsage.STORAGE] = "storage";
  WGSLUsageToWEBGPU2[WGSLUsageToWEBGPU2["uniform"] = GPUBufferUsage.UNIFORM] = "uniform";
  WGSLUsageToWEBGPU2[WGSLUsageToWEBGPU2["read"] = GPUBufferUsage.COPY_DST] = "read";
  WGSLUsageToWEBGPU2[WGSLUsageToWEBGPU2["read_write"] = GPUBufferUsage.COPY_DST] = "read_write";
  return WGSLUsageToWEBGPU2;
})(WGSLUsageToWEBGPU || {});
var WEBGPUShader = class _WEBGPUShader {
  id = Utils.UUID();
  depthTest = true;
  vertexEntrypoint;
  fragmentEntrypoint;
  module;
  bindings;
  constructor(code) {
    this.module = WEBGPURenderer.device.createShaderModule({ code });
    const cleanedCode = Utils.StringReplaceAll(Utils.StringReplaceAll(code, "\n", " "), "  ", "");
    const vertexEntrypoint = Utils.StringFindAllBetween(cleanedCode, "@vertex fn ", "(")[0];
    const fragmentEntrypoint = Utils.StringFindAllBetween(cleanedCode, "@fragment fn ", "(")[0];
    if (!vertexEntrypoint) throw Error("Vertex entrypoint not found.");
    if (!fragmentEntrypoint) throw Error("Fragment entrypoint not found.");
    this.vertexEntrypoint = vertexEntrypoint;
    this.fragmentEntrypoint = fragmentEntrypoint;
    this.bindings = _WEBGPUShader.ParseShader(code);
  }
  static ParseShader(code) {
    const bindings = Utils.StringFindAllBetween(Utils.StringReplaceAll(Utils.StringRemoveTextBetween(code, "//", "\n"), " ", ""), "@", ";", false);
    const buffers = /* @__PURE__ */ new Map();
    for (let uniform of bindings) {
      const group = Utils.StringFindAllBetween(uniform, "group(", ")")[0];
      const binding = Utils.StringFindAllBetween(uniform, "binding(", ")")[0];
      let name = Utils.StringFindAllBetween(uniform, ">", ":")[0];
      if (!name) name = Utils.StringFindAllBetween(uniform, "var", ":")[0];
      if (!group || !binding || !name) throw Error(`Could not find group or binding or name ${group} ${binding} ${name}`);
      const types = Utils.StringReplaceAll(Utils.StringFindAllBetween(uniform, ":", ";")[0], ">", "").split("<");
      const usageStr = Utils.StringFindAllBetween(uniform, "var<", ">")[0];
      const usage = usageStr ? usageStr.split(",").map((v) => WGSLUsageToWEBGPU[v]).reduce((a, b) => a | b) : void 0;
      buffers.set(name, {
        name,
        group: parseInt(group),
        binding: parseInt(binding),
        usage,
        types
      });
    }
    return buffers;
  }
  GetBindings() {
    return this.bindings;
  }
  GetModule() {
    return this.module;
  }
  GetVertexEntrypoint() {
    return this.vertexEntrypoint;
  }
  GetFragmentEntrypoint() {
    return this.fragmentEntrypoint;
  }
  GetValidBinding(name, type) {
    const binding = this.bindings.get(name);
    if (!binding) throw Error(`Shader does not have a parameter named ${name}`);
    if (!binding.types || binding.types.length == 0 || !binding.types.includes(type)) throw Error(`Binding is not of "mat4x4" type, it is ${binding.types}`);
    return binding;
  }
  SetMatrix4(name, matrix) {
    const binding = this.GetValidBinding(name, "mat4x4");
    if (!binding.usage) throw Error(`Binding has no usage`);
    if (!binding.buffer) binding.buffer = WEBGPURenderer.device.createBuffer({ size: 4 * 16, usage: binding.usage });
    WEBGPURenderer.device.queue.writeBuffer(binding.buffer, 0, matrix.elements);
  }
  SetArray(name, array, bufferOffset = 0, dataOffset, size) {
    const binding = this.GetValidBinding(name, "array");
    if (!binding.usage) throw Error(`Binding has no usage`);
    if (!binding.buffer) binding.buffer = WEBGPURenderer.device.createBuffer({ size: array.byteLength, usage: binding.usage });
    WEBGPURenderer.device.queue.writeBuffer(binding.buffer, bufferOffset, array, dataOffset, size);
  }
  SetTexture(name, texture) {
    const binding = this.GetValidBinding(name, "texture_2d");
    binding.buffer = texture.GetBuffer();
  }
  SetSampler(name, sampler) {
    const binding = this.GetValidBinding(name, "sampler");
    binding.buffer = sampler.GetSampler();
  }
  SetBuffer(name, buffer) {
    const binding = this.bindings.get(name);
    if (!binding) throw Error(`Shader does not have a parameter named ${name}`);
    if (binding.buffer !== buffer.GetBuffer()) {
      binding.buffer = buffer.GetBuffer();
    }
  }
  HasBuffer(name) {
    return this.bindings.get(name)?.buffer ? true : false;
  }
};

// src/renderer/webgpu/shaders/StandardShader.wgsl
var StandardShader_default = "struct VertexInput {\n    @location(0) position : vec3<f32>,\n    @location(1) normal : vec3<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) Position : vec4<f32>,\n    @location(0) vPos : vec4<f32>,\n    @location(1) vNormal : vec3<f32>,\n};\n\n@group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(3) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n\n@vertex\nfn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {\n    var output : VertexOutput;\n\n    var modelMatrixInstance = modelMatrix[instanceIdx];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n    \n    output.Position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);\n    output.vPos = modelViewMatrix * vec4(input.position, 1.0);\n    \n    output.vNormal = normalize((modelViewMatrix * vec4(input.normal, 0.0)).xyz);\n\n    return output;\n}\n\n@fragment\nfn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {\n    let surfaceColor: vec4<f32> = vec4(1.0, 0.0, 0.0, 1.0);\n    let ambientColor: vec4<f32> = vec4(surfaceColor);\n    let specularColor: vec4<f32> = vec4(1.0);\n    let lightPosition_worldSpace: vec4<f32> = vec4(10.0, 10.0, 10.0, 1.0);\n    let lightColor: vec3<f32> = vec3(0.3, 0.3, 0.3);\n    let lightIntensity = 250.0;\n    let specularLobeFactor = 5.0;\n    let ambientFactor = 0.1;\n    let specularReflectivity = 0.5;\n\n    let lightPosition_viewSpace: vec3<f32> = (viewMatrix * lightPosition_worldSpace).xyz;\n    let lightDirection_viewSpace: vec3<f32> = normalize(lightPosition_viewSpace - fragData.vPos.xyz);\n    let viewDirection_viewSpace: vec3<f32> = normalize(-fragData.vPos.xyz); // Corrected view direction\n\n    let lightColorIntensity: vec3<f32> = lightColor * lightIntensity;\n    let distanceFromLight = distance(fragData.vPos.xyz, lightPosition_viewSpace);\n\n    let diffuseStrength = clamp(dot(fragData.vNormal, lightDirection_viewSpace), 0.0, 1.0);\n    let diffuseLight = (lightColorIntensity * diffuseStrength) / (distanceFromLight * distanceFromLight);\n\n    let lightReflection_viewSpace = reflect(-lightDirection_viewSpace, fragData.vNormal);\n\n    let specularStrength = clamp(dot(viewDirection_viewSpace, lightReflection_viewSpace), 0.0, 1.0);\n    let specularLight = (lightColorIntensity * pow(specularStrength, specularLobeFactor)) / (distanceFromLight * distanceFromLight);\n\n    return vec4(\n        vec3((ambientColor.rgb * ambientFactor) + (surfaceColor.rgb * diffuseLight) + (specularColor.rgb * specularReflectivity * specularLight)), \n        surfaceColor.a\n    );\n}";

// src/renderer/webgpu/shaders/WEBGPUDefaultShaders.ts
var WEBGPUDefaultShaders = class {
  static Standard = StandardShader_default;
};

// src/renderer/Shader.ts
var Shader = class {
  id;
  depthTest;
  static Create(code) {
    if (Renderer.type === "webgpu") return new WEBGPUShader(code);
    throw Error("Unknown api");
  }
  static get Standard() {
    if (Renderer.type === "webgpu") return new WEBGPUShader(WEBGPUDefaultShaders.Standard);
    throw Error("Unknown api");
  }
  SetMatrix4(name, matrix) {
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
};

// src/Geometry.ts
var Geometry = class _Geometry {
  id = Utils.UUID();
  vertices;
  indices;
  normals;
  vertexBuffer;
  normalBuffer;
  indexBuffer;
  constructor(vertices, indices) {
    this.vertices = vertices;
    this.vertexBuffer = Buffer2.Create(this.vertices.byteLength, 1 /* VERTEX */);
    this.vertexBuffer.SetArray(this.vertices);
    if (indices) {
      this.indices = indices;
      this.normals = _Geometry.ComputeNormals(this.vertices, this.indices);
      this.indexBuffer = Buffer2.Create(this.indices.byteLength, 2 /* INDEX */);
      this.normalBuffer = Buffer2.Create(this.normals.byteLength, 1 /* VERTEX */);
      this.indexBuffer.SetArray(this.indices);
      this.normalBuffer.SetArray(this.normals);
    }
  }
  static ComputeNormals(vertices, indices) {
    let posAttrData = vertices;
    let normalAttrData = new Float32Array(vertices.length);
    let indexAttrData = indices;
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
    return normalAttrData;
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
  GetSampler() {
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

// src/renderer/passes/OutputPass.ts
var OutputPass = class {
  quadGeometry;
  shader;
  sampler;
  constructor() {
    this.shader = Shader.Create(`
        struct VertexInput {
            @location(0) position : vec3<f32>,
            @location(1) normal : vec3<f32>,
        };
        
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
        };
        
        @group(0) @binding(0) var ourTexture: texture_2d<f32>;
        // @group(0) @binding(1) var depthTexture: texture_2d<f32>;

        @group(0) @binding(2) var ourSampler: sampler;
        
        @vertex
        fn vertexMain1(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
            var output : VertexOutput;

            output.position = vec4(input.position, 1.0);
        
            return output;
        }
        
        @fragment
        fn fragmentMain1(fragData: VertexOutput) -> @location(0) vec4<f32> {
            let uv = fragData.position.xy / vec2<f32>(textureDimensions(ourTexture));
            var color = vec4<f32>(0.0);
        
            // Simple 3x3 kernel blur
            for (var x: i32 = -1; x <= 1; x = x + 1) {
                for (var y: i32 = -1; y <= 1; y = y + 1) {
                    color = color + textureSample(ourTexture, ourSampler, uv + vec2<f32>(f32(x), f32(y)) * 0.002);
                }
            }

            return color / 9;
        }
        `);
    this.shader.depthTest = false;
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
    this.quadGeometry = new Geometry(vertices, indices);
    this.sampler = TextureSampler.Create();
    this.shader.SetSampler("ourSampler", this.sampler);
  }
  Execute(inputTarget) {
    const commandBuffer = new RenderCommandBuffer("OutputPass");
    this.shader.SetTexture("ourTexture", inputTarget);
    const mainCamera = Camera.mainCamera;
    commandBuffer.SetRenderTarget(mainCamera.renderTarget, null);
    commandBuffer.ClearRenderTarget(true, true, mainCamera.clearValue);
    commandBuffer.DrawMesh(this.quadGeometry, this.shader);
    return commandBuffer;
  }
};

// src/renderer/RenderingPipeline.ts
var RenderingPipeline = class {
  renderer;
  meshRenderPass;
  outputPass;
  customRenderPasses = [];
  constructor(renderer) {
    this.renderer = renderer;
    this.meshRenderPass = new MeshRenderPass();
    this.outputPass = new OutputPass();
  }
  Render() {
    const mainCamera = Camera.mainCamera;
    this.renderer.BeginRenderFrame();
    const meshRenderPassCommandBuffer = this.meshRenderPass.Execute();
    RendererContext.ProcessCommandBuffer(meshRenderPassCommandBuffer);
    const outputPassCommandBuffer = this.outputPass.Execute(this.meshRenderPass.GetRenderTarget());
    RendererContext.ProcessCommandBuffer(outputPassCommandBuffer);
    for (const renderPass of this.customRenderPasses) {
      const customPassCommandBuffer = renderPass.Execute();
      RendererContext.ProcessCommandBuffer(customPassCommandBuffer);
    }
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
  renderPipeline;
  constructor(renderer) {
    this.renderer = renderer;
    this.renderPipeline = new RenderingPipeline(this.renderer);
    EventSystem.on("CallUpdate", (component, flag) => {
      if (flag) this.toUpdate.set(component, true);
      else this.toUpdate.delete(component);
    });
  }
  AddGameObject(gameObject) {
    this.gameObjects.push(gameObject);
  }
  GetGameObjects() {
    return this.gameObjects;
  }
  Start() {
    if (this.hasStarted) return;
    for (const gameObject of this.gameObjects) gameObject.Start();
    this._hasStarted = true;
    this.Tick();
  }
  Tick() {
    for (const [component, _] of this.toUpdate) component.Update();
    this.renderPipeline.Render();
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

// src/TEST/Cube.ts
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
  const cubeVertices = new Float32Array([
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
    0.5,
    -0.5,
    -0.5,
    -0.5,
    0.5,
    0.5,
    -0.5,
    0.5,
    0.5,
    0.5,
    0.5,
    -0.5,
    0.5,
    0.5
  ]);
  const cubeIndices = new Uint32Array([
    0,
    3,
    2,
    2,
    1,
    0,
    // Front face
    4,
    5,
    6,
    6,
    7,
    4,
    // Back face
    0,
    1,
    5,
    5,
    4,
    0,
    // Bottom face
    3,
    7,
    6,
    6,
    2,
    3,
    // Top face
    0,
    4,
    7,
    7,
    3,
    0,
    // Left face
    1,
    2,
    6,
    6,
    5,
    1
    // Right face
  ]);
  const geometry = new Geometry(cubeVertices, cubeIndices);
  const shader = Shader.Standard;
  setTimeout(() => {
    {
      const meshGameObject = new GameObject(scene);
      meshGameObject.transform.position.x = -2;
      const mesh = meshGameObject.AddComponent(Mesh);
      mesh.enableGPUInstancing = true;
      mesh.SetGeometry(geometry);
      mesh.AddShader(shader);
    }
  }, 3e3);
  let lastCube;
  const n = 10;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const meshGameObject = new GameObject(scene);
        meshGameObject.transform.position.set(x * 2, y * 2, z * 2);
        const mesh = meshGameObject.AddComponent(Mesh);
        mesh.enableGPUInstancing = true;
        mesh.SetGeometry(geometry);
        mesh.AddShader(shader);
        lastCube = meshGameObject.transform;
      }
    }
  }
  setTimeout(() => {
    console.log("CALLED", lastCube.position);
    lastCube.position.x += Math.random() * 2;
  }, 5e3);
  scene.Start();
}
Application();
