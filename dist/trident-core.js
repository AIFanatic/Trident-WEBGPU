class EventSystem {
  static events = /* @__PURE__ */ new Map();
  static on(event, callback) {
    const events = this.events.get(event) || [];
    events.push(callback);
    this.events.set(event, events);
  }
  static emit(event, ...args) {
    const callbacks = this.events.get(event);
    if (callbacks === void 0) return;
    for (let i = 0; i < callbacks.length; i++) {
      callbacks[i](...args);
    }
  }
}
class EventSystemLocal {
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
    for (let i = 0; i < localEventsCallbacks.length; i++) {
      localEventsCallbacks[i](...args);
    }
  }
}

function UUID() {
  return Math.floor(Math.random() * 1e6).toString();
}
function StringFindAllBetween(source, start, end, exclusive = true) {
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

class CRC32 {
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
}

class SerializableFieldsMap {
  fields = /* @__PURE__ */ new Map();
  set(component, property) {
    this.fields.set(`${component.constructor.name}-${property}`, true);
  }
  get(component, property) {
    return this.fields.get(`${component.constructor.name}-${property}`);
  }
  has(component, property) {
    return this.fields.has(`${component.constructor.name}-${property}`);
  }
}
const SerializableFields = new SerializableFieldsMap();
function SerializeField(value, context) {
  context.enumerable = true;
  context.addInitializer(function() {
    SerializableFields.set(this, context.name);
  });
  if (context.kind === "field") {
    return;
  }
  return value;
}

var index$3 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    CRC32: CRC32,
    SerializableFields: SerializableFields,
    SerializeField: SerializeField,
    StringFindAllBetween: StringFindAllBetween,
    UUID: UUID
});

class ComponentEvents {
  static CallUpdate = (component, shouldUpdate) => {
  };
  static AddedComponent = (component, scene) => {
  };
  static RemovedComponent = (component, scene) => {
  };
}
class Component {
  static type;
  id = UUID();
  enabled = true;
  hasStarted = false;
  name;
  gameObject;
  transform;
  static Registry = /* @__PURE__ */ new Map();
  constructor(gameObject) {
    this.gameObject = gameObject;
    this.transform = gameObject.transform;
    this.name = this.constructor.name;
    if (this.gameObject.scene.hasStarted) this.Start();
    if (this.constructor.prototype.Update !== Component.prototype.Update) EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);
  }
  Start() {
  }
  Update() {
  }
  Destroy() {
  }
  Serialize(metadata = {}) {
    throw Error(`Serialize not implemented for ${this.constructor.name}`);
  }
  Deserialize(data) {
    throw Error(`Deserialize not implemented for ${this.constructor.name}`);
  }
}

const EPSILON = 1e-4;
class Quaternion {
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
    this._x = x;
    this._y = y;
    this._z = z;
    this._w = w;
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
    return new Quaternion(this.x, this.y, this.z, this.w);
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
  toEuler(inDegrees = false) {
    const out = new Vector3();
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
      this.set((sm31 + sm13) / S, (sm23 + sm32) / S, S / 4, (sm12 - sm21) / S);
    }
    const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (length > EPSILON) {
      this.x /= length;
      this.y /= length;
      this.z /= length;
      this.w /= length;
    } else {
      this.set(0, 0, 0, 1);
    }
    return this;
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
  length() {
    return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
  }
  normalize() {
    let l = this.length();
    if (l === 0) {
      this._x = 0;
      this._y = 0;
      this._z = 0;
      this._w = 1;
    } else {
      l = 1 / l;
      this._x = this._x * l;
      this._y = this._y * l;
      this._z = this._z * l;
      this._w = this._w * l;
    }
    return this;
  }
  dot(v) {
    return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;
  }
  slerp(qb, t) {
    if (t <= 0) return this;
    if (t >= 1) return this.copy(qb);
    let x = qb._x, y = qb._y, z = qb._z, w = qb._w;
    let dot = this.dot(qb);
    if (dot < 0) {
      x = -x;
      y = -y;
      z = -z;
      w = -w;
      dot = -dot;
    }
    let s = 1 - t;
    if (dot < 0.9995) {
      const theta = Math.acos(dot);
      const sin = Math.sin(theta);
      s = Math.sin(s * theta) / sin;
      t = Math.sin(t * theta) / sin;
      this._x = this._x * s + x * t;
      this._y = this._y * s + y * t;
      this._z = this._z * s + z * t;
      this._w = this._w * s + w * t;
    } else {
      this._x = this._x * s + x * t;
      this._y = this._y * s + y * t;
      this._z = this._z * s + z * t;
      this._w = this._w * s + w * t;
      this.normalize();
    }
    return this;
  }
  static fromArray(array) {
    if (array.length < 4) throw Error("Array doesn't have enough data");
    return new Quaternion(array[0], array[1], array[2], array[3]);
  }
  Serialize() {
    return { type: "@trident/core/math/Quaternion", x: this.x, y: this.y, z: this.z, w: this.w };
  }
  Deserialize(data) {
    this.set(data.x, data.y, data.z, data.w);
    return this;
  }
}
class ObservableQuaternion extends Quaternion {
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
}

class Vector3 {
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
    this._x = x;
    this._y = y;
    this._z = z;
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
    return new Vector3(this.x, this.y, this.z);
  }
  copy(v) {
    return this.set(v.x, v.y, v.z);
  }
  mul(v) {
    if (v instanceof Vector3) this.x *= v.x, this.y *= v.y, this.z *= v.z;
    else this.x *= v, this.y *= v, this.z *= v;
    return this;
  }
  div(v) {
    if (v instanceof Vector3) this.x /= v.x, this.y /= v.y, this.z /= v.z;
    else this.x /= v, this.y /= v, this.z /= v;
    return this;
  }
  add(v) {
    if (v instanceof Vector3) this.x += v.x, this.y += v.y, this.z += v.z;
    else this.x += v, this.y += v, this.z += v;
    return this;
  }
  sub(v) {
    if (v instanceof Vector3) this.x -= v.x, this.y -= v.y, this.z -= v.z;
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
  applyEuler(euler) {
    return this.applyQuaternion(_quaternion.setFromEuler(euler));
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
  toString() {
    return `Vector3(x: ${this.x.toPrecision(2)}, y: ${this.y.toPrecision(2)}, z: ${this.z.toPrecision(2)})`;
  }
  static fromArray(array) {
    if (array.length < 3) throw Error("Array doesn't have enough data");
    return new Vector3(array[0], array[1], array[2]);
  }
  Serialize() {
    return { type: "@trident/core/math/Vector3", x: this.x, y: this.y, z: this.z };
  }
  Deserialize(data) {
    this.set(data.x, data.y, data.z);
    return this;
  }
}
class ObservableVector3 extends Vector3 {
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
}
const _quaternion = new Quaternion();

class Matrix4 {
  elements;
  constructor(n11 = 1, n12 = 0, n13 = 0, n14 = 0, n21 = 0, n22 = 1, n23 = 0, n24 = 0, n31 = 0, n32 = 0, n33 = 1, n34 = 0, n41 = 0, n42 = 0, n43 = 0, n44 = 1) {
    this.elements = new Float32Array(16);
    const te = this.elements;
    te[0] = n11;
    te[1] = n12;
    te[2] = n13;
    te[3] = n14;
    te[4] = n21;
    te[5] = n22;
    te[6] = n23;
    te[7] = n24;
    te[8] = n31;
    te[9] = n32;
    te[10] = n33;
    te[11] = n34;
    te[12] = n41;
    te[13] = n42;
    te[14] = n43;
    te[15] = n44;
    return this;
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
    return new Matrix4().setFromArray(this.elements);
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
  getMaxScaleOnAxis() {
    const te = this.elements;
    const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2];
    const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6];
    const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10];
    return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
  }
}
const _v1 = new Vector3();
const _m1 = new Matrix4();

class TransformEvents {
  static Updated = () => {
  };
}
class Transform extends Component {
  static type = "@trident/core/components/Transform";
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
    if (this.parent !== null) {
      this._localToWorldMatrix.premultiply(this.parent._localToWorldMatrix);
    }
    for (const child of this.children) {
      child.UpdateMatrices();
    }
    this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();
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
  Serialize() {
    return {
      type: Transform.type,
      position: this.position.Serialize(),
      rotation: this.rotation.Serialize(),
      scale: this.scale.Serialize()
    };
  }
  Deserialize(data) {
    this.position.Deserialize(data.position);
    this.rotation.Deserialize(data.rotation);
    this.scale.Deserialize(data.scale);
  }
}
const m1 = new Matrix4();

function getCtorChain$1(ctor) {
  const chain = [];
  for (let c = ctor; c && c !== Component; c = Object.getPrototypeOf(c)) {
    chain.push(c);
  }
  return chain;
}
class GameObject {
  id = UUID();
  name = "GameObject";
  scene;
  transform;
  componentsByCtor = /* @__PURE__ */ new Map();
  allComponents = [];
  enabled = true;
  constructor(scene) {
    this.scene = scene;
    this.transform = new Transform(this);
    this.scene.AddGameObject(this);
  }
  AddComponent(Ctor, ...args) {
    const componentInstance = new Ctor(this, ...args);
    if (!(componentInstance instanceof Component)) throw new Error("Invalid component");
    if (componentInstance instanceof Transform && this.GetComponent(Transform)) throw new Error("A GameObject can only have one Transform");
    this.allComponents.push(componentInstance);
    for (const ctor of getCtorChain$1(componentInstance.constructor)) {
      let arr = this.componentsByCtor.get(ctor);
      if (!arr) this.componentsByCtor.set(ctor, arr = []);
      if (!arr.includes(componentInstance)) arr.push(componentInstance);
    }
    if (this.scene.hasStarted && componentInstance.Start) componentInstance.Start();
    return componentInstance;
  }
  GetComponent(Ctor) {
    const arr = this.componentsByCtor.get(Ctor);
    return arr && arr.length ? arr[0] : null;
  }
  GetComponents(Ctor) {
    if (!Ctor) return this.allComponents;
    return this.componentsByCtor.get(Ctor) ?? [];
  }
  // Optional: only the exact type (no subclasses), still cheap (O(k) where k = matches for Ctor)
  GetComponentsExact(Ctor) {
    const arr = this.componentsByCtor.get(Ctor);
    return arr ? arr.filter((c) => c.constructor === Ctor) : [];
  }
  Start() {
    for (const component of this.allComponents) {
      if (!component.hasStarted) {
        component.Start();
        component.hasStarted = true;
      }
    }
  }
  Destroy() {
    for (const child of this.transform.children) {
      child.gameObject.Destroy();
    }
    for (const component of this.allComponents) {
      component.Destroy();
    }
    this.scene.RemoveGameObject(this);
  }
  Serialize(metadata = {}) {
    let serializedChildren = [];
    for (const childGameObject of this.transform.children) serializedChildren.push(childGameObject.gameObject.Serialize(metadata));
    return {
      name: this.name,
      transform: this.transform.Serialize(),
      components: this.allComponents.map((c) => c.Serialize(metadata)),
      children: serializedChildren
    };
  }
  Deserialize(data) {
    this.name = data.name;
    this.transform.Deserialize(data.transform);
    let componentInstances = [];
    for (let i = 0; i < data.components.length; i++) {
      const component = data.components[i];
      const componentClass = Component.Registry.get(component.type);
      if (!componentClass) throw Error(`Component ${component.type} not found in component registry.`);
      const instance = this.AddComponent(componentClass);
      componentInstances.push(instance);
    }
    for (let i = 0; i < data.components.length; i++) {
      const componentInstance = componentInstances[i];
      const componentSerialized = data.components[i];
      componentInstance.Deserialize(componentSerialized);
    }
    for (let i = 0; i < data.children.length; i++) {
      const newGameObject = new GameObject(Scene.mainScene);
      newGameObject.transform.parent = this.transform;
      newGameObject.Deserialize(data.children[i]);
    }
  }
}

class Vector2 {
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
  _elements = new Float32Array(2);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    return this._elements;
  }
  constructor(x = 0, y = 0) {
    this._x = x;
    this._y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
  }
  mul(v) {
    if (v instanceof Vector2) this.x *= v.x, this.y *= v.y;
    else this.x *= v, this.y *= v;
    return this;
  }
  div(v) {
    if (v instanceof Vector2) this.x /= v.x, this.y /= v.y;
    else this.x /= v, this.y /= v;
    return this;
  }
  add(v) {
    if (v instanceof Vector2) this.x += v.x, this.y += v.y;
    else this.x += v, this.y += v;
    return this;
  }
  sub(v) {
    if (v instanceof Vector2) this.x -= v.x, this.y -= v.y;
    else this.x -= v, this.y -= v;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }
  clone() {
    return new Vector2(this.x, this.y);
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  toString() {
    return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)})`;
  }
}

const adapter = navigator ? await navigator.gpu.requestAdapter() : null;
if (!adapter) throw Error("WEBGPU not supported");
const requiredLimits = {};
for (const key in adapter.limits) requiredLimits[key] = adapter.limits[key];
const features = [];
if (adapter.features.has("timestamp-query")) features.push("timestamp-query");
const device = adapter ? await adapter.requestDevice({
  requiredFeatures: features,
  requiredLimits
}) : null;
class WEBGPURenderer {
  static adapter;
  static device;
  static context;
  static presentationFormat;
  static activeCommandEncoder = null;
  constructor(canvas) {
    if (!adapter || !device) throw Error("WEBGPU not supported");
    const context = canvas.getContext("webgpu");
    if (!context) throw Error("Could not get WEBGPU context");
    WEBGPURenderer.adapter = adapter;
    WEBGPURenderer.device = device;
    WEBGPURenderer.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: WEBGPURenderer.presentationFormat });
    WEBGPURenderer.adapter = adapter;
    WEBGPURenderer.device = device;
    WEBGPURenderer.context = context;
    WEBGPURenderer.context.configure({
      device: WEBGPURenderer.device,
      format: WEBGPURenderer.presentationFormat,
      alphaMode: "opaque"
    });
  }
  static GetActiveCommandEncoder() {
    return WEBGPURenderer.activeCommandEncoder;
  }
  static BeginRenderFrame() {
    if (WEBGPURenderer.activeCommandEncoder !== null) {
      console.warn("Only one active encoder pipeline is allowed.");
      return;
    }
    WEBGPURenderer.activeCommandEncoder = WEBGPURenderer.device.createCommandEncoder();
  }
  static EndRenderFrame() {
    if (WEBGPURenderer.activeCommandEncoder === null) {
      console.log("There is no active render pass.");
      return;
    }
    WEBGPURenderer.device.queue.submit([WEBGPURenderer.activeCommandEncoder.finish()]);
    WEBGPURenderer.activeCommandEncoder = null;
  }
  static HasActiveFrame() {
    return WEBGPURenderer.activeCommandEncoder !== null;
  }
  static OnFrameCompleted() {
    return WEBGPURenderer.device.queue.onSubmittedWorkDone();
  }
}

class RendererInfo {
  frame = 0;
  deltaTime = 0;
  fps = 0;
  vertexCount = 0;
  triangleCount = 0;
  visibleTriangles = 0;
  cpuTime = 0;
  bindGroupLayoutsStat = 0;
  bindGroupsStat = 0;
  frameVertexBuffersStat = 0;
  frameIndexBufferStat = 0;
  compiledShadersStat = 0;
  drawCallsStat = 0;
  gpuBufferSizeTotal = 0;
  gpuBufferCount = 0;
  gpuTextureSizeTotal = 0;
  gpuTextureCount = 0;
  gpuBandwidthInBytes = 0;
  visibleObjects = 0;
  framePassesStats = /* @__PURE__ */ new Map();
  SetPassTime(name, time) {
    this.framePassesStats.set(name, time / 1e6);
  }
  ResetFrame() {
    this.drawCallsStat = 0;
    this.triangleCount = 0;
    this.vertexCount = 0;
    this.frameVertexBuffersStat = 0;
    this.frameIndexBufferStat = 0;
    this.drawCallsStat = 0;
    this.visibleObjects = 0;
    this.visibleTriangles = 0;
    this.gpuBandwidthInBytes = 0;
  }
}

class RendererEvents {
  static Resized = (canvas) => {
  };
}
class Renderer {
  static type;
  static width;
  static height;
  static activeRenderer;
  static info = new RendererInfo();
  static canvas;
  // Dodgy, just here for the UICanvas/TextureViewer plugin
  static get device() {
    return WEBGPURenderer.device;
  }
  static Create(canvas, type, aspectRatio = 1) {
    canvas.width = canvas.parentElement.clientWidth * aspectRatio;
    canvas.height = canvas.parentElement.clientHeight * aspectRatio;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.userSelect = "none";
    const observer = new ResizeObserver((entries) => {
      canvas.width = canvas.parentElement.clientWidth * aspectRatio;
      canvas.height = canvas.parentElement.clientHeight * aspectRatio;
      Renderer.width = canvas.width;
      Renderer.height = canvas.height;
      EventSystem.emit(RendererEvents.Resized, canvas);
    });
    observer.observe(canvas);
    Renderer.canvas = canvas;
    Renderer.type = type;
    Renderer.width = canvas.width;
    Renderer.height = canvas.height;
    if (type === "webgpu") {
      this.activeRenderer = new WEBGPURenderer(canvas);
      return this.activeRenderer;
    }
    throw Error("Unknown render api type.");
  }
  static get SwapChainFormat() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.presentationFormat;
    throw Error("Unknown render api type.");
  }
  static BeginRenderFrame() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.BeginRenderFrame();
    throw Error("Unknown render api type.");
  }
  static EndRenderFrame() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.EndRenderFrame();
    throw Error("Unknown render api type.");
  }
  static HasActiveFrame() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.HasActiveFrame();
    throw Error("Unknown render api type.");
  }
  static OnFrameCompleted() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.OnFrameCompleted();
    throw Error("Unknown render api type.");
  }
}

class Assets {
  static cache = /* @__PURE__ */ new Map();
  // Register a path
  static async Register(path, resource, force = false) {
    if (Assets.cache.has(path) && force === false) throw Error(`Assets[Register]: ${path} already set, use "force" to bypass.`);
    Assets.cache.set(path, Promise.resolve(resource));
  }
  static async Load(url, type) {
    const cached = Assets.cache.get(url);
    if (cached !== void 0) {
      return cached;
    }
    const promise = fetch(url).then((response) => {
      if (!response.ok) throw Error(`File not found ${url}`);
      if (type === "json") return response.json();
      else if (type === "text") return response.text();
      else if (type === "binary") return response.arrayBuffer();
    }).then((result) => {
      Assets.cache.set(url, Promise.resolve(result));
      return result;
    }).catch((error) => {
      Assets.cache.delete(url);
      throw error;
    });
    Assets.cache.set(url, promise);
    return promise;
  }
  static async LoadURL(url, type) {
    const cached = Assets.cache.get(url.href);
    if (cached !== void 0) {
      return cached;
    }
    const promise = fetch(url).then((response) => {
      if (!response.ok) throw Error(`File not found ${url}`);
      if (type === "json") return response.json();
      else if (type === "text") return response.text();
      else if (type === "binary") return response.arrayBuffer();
    }).then((result) => {
      Assets.cache.set(url.href, Promise.resolve(result));
      return result;
    }).catch((error) => {
      Assets.cache.delete(url.href);
      throw error;
    });
    Assets.cache.set(url.href, promise);
    return promise;
  }
}

var WGSL_Shader_Draw_URL = "#include \"@trident/core/resources/webgpu/shaders/deferred/OctahedralEncoding.wgsl\";\n\nstruct VertexInput {\n    @builtin(instance_index) instance : u32, \n    @builtin(vertex_index) vertex : u32,\n    @location(0) position : vec3<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n\n    #if USE_NORMAL_MAP\n        @location(3) tangent : vec4<f32>,\n        #if USE_SKINNING\n            @location(4) joints: vec4<u32>,\n            @location(5) weights: vec4<f32>,\n        #endif\n    #else\n        #if USE_SKINNING\n            @location(3) joints: vec4<u32>,\n            @location(4) weights: vec4<f32>,\n        #endif\n    #endif\n};\n\nstruct Material {\n    AlbedoColor: vec4<f32>,\n    EmissiveColor: vec4<f32>,\n    Roughness: f32,\n    Metalness: f32,\n    Unlit: f32,\n    AlphaCutoff: f32,\n    Wireframe: f32,\n    RepeatOffset: vec4<f32>, // xy = repeat, zw = offset\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vPosition : vec3<f32>,\n    @location(1) vNormal : vec3<f32>,\n    @location(2) vUv : vec2<f32>,\n    @location(3) @interpolate(flat) instance : u32,\n    @location(4) barycenticCoord : vec3<f32>,\n    @location(5) tangent : vec3<f32>,\n    @location(6) bitangent : vec3<f32>,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n@group(0) @binding(3) var<storage, read> material: Material;\n@group(0) @binding(4) var TextureSampler: sampler;\n\n// These get optimized out based on \"USE*\" defines\n@group(0) @binding(5) var AlbedoMap: texture_2d<f32>;\n@group(0) @binding(6) var NormalMap: texture_2d<f32>;\n@group(0) @binding(7) var HeightMap: texture_2d<f32>;\n@group(0) @binding(8) var MetalnessMap: texture_2d<f32>;\n@group(0) @binding(9) var EmissiveMap: texture_2d<f32>;\n@group(0) @binding(10) var AOMap: texture_2d<f32>;\n\n\n@group(0) @binding(11) var<storage, read> cameraPosition: vec3<f32>;\n\n#if USE_SKINNING\n    @group(1) @binding(0) var<storage, read> boneMatrices: array<mat4x4<f32>>;\n#endif\n\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output : VertexOutput;\n\n      var finalPosition = vec4(input.position, 1.0);\n      var finalNormal = vec4(input.normal, 0.0);\n\n    #if USE_SKINNING\n        var skinnedPosition = vec4(0.0);\n        var skinnedNormal = vec4(0.0);\n\n        let skinMatrix: mat4x4<f32> = \n            boneMatrices[input.joints[0]] * input.weights[0] +\n            boneMatrices[input.joints[1]] * input.weights[1] +\n            boneMatrices[input.joints[2]] * input.weights[2] +\n            boneMatrices[input.joints[3]] * input.weights[3];\n        \n        finalPosition = skinMatrix * vec4(input.position, 1.0);\n        finalNormal   = normalize(skinMatrix * vec4(input.normal, 0.0));\n    #endif\n\n    let modelMatrixInstance = modelMatrix[input.instance];\n    let modelViewMatrix = viewMatrix * modelMatrixInstance;\n\n    output.instance = input.instance;\n    output.position = projectionMatrix * modelViewMatrix * vec4(finalPosition.xyz, 1.0);\n    output.vPosition = finalPosition.xyz;\n    output.vUv = input.uv;\n    let worldNormal = normalize(modelMatrixInstance * vec4(finalNormal.xyz, 0.0)).xyz;\n    output.vNormal = worldNormal;\n\n    #if USE_NORMAL_MAP\n        let worldTangent = normalize(modelMatrixInstance * vec4(input.tangent.xyz, 0.0)).xyz;\n        let worldBitangent = cross(worldNormal, worldTangent) * input.tangent.w;\n\n        output.tangent = worldTangent;\n        output.bitangent = worldBitangent;\n    #endif\n\n    // emit a barycentric coordinate\n    output.barycenticCoord = vec3f(0);\n    output.barycenticCoord[input.vertex % 3] = 1.0;\n\n    return output;\n}\n\nstruct FragmentOutput {\n    @location(0) albedo : vec4f,\n    @location(1) normal : vec4f,\n    @location(2) RMO : vec4f,\n};\n\nfn inversesqrt(v: f32) -> f32 {\n    return 1.0 / sqrt(v);\n}\n\nfn edgeFactor(bary: vec3f) -> f32 {\n    let lineThickness = 1.0;\n    let d = fwidth(bary);\n    let a3 = smoothstep(vec3f(0.0), d * lineThickness, bary);\n    return min(min(a3.x, a3.y), a3.z);\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> FragmentOutput {\n    var output: FragmentOutput;\n\n\n    let mat = material;\n    let modelMatrixInstance = modelMatrix[input.instance];\n\n    var uv = input.vUv * mat.RepeatOffset.xy + mat.RepeatOffset.zw;\n\n    var albedo = mat.AlbedoColor;\n    var roughness = mat.Roughness;\n    var metalness = mat.Metalness;\n    var occlusion = 1.0;\n\n    // var albedo = mat.AlbedoColor;\n    #if USE_ALBEDO_MAP\n        albedo *= textureSample(AlbedoMap, TextureSampler, uv);\n    #endif\n\n    if (albedo.a < mat.AlphaCutoff) {\n        discard;\n    }\n\n    var normal: vec3f = normalize(input.vNormal);\n    #if USE_NORMAL_MAP\n        var tbn: mat3x3<f32>;\n        tbn[0] = input.tangent;      // column-major: T, B, N\n        tbn[1] = input.bitangent;\n        tbn[2] = input.vNormal;\n\n        let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;\n        normal = normalize(tbn * normalSample);\n    #endif\n\n    #if USE_METALNESS_MAP\n        let metalnessRoughness = textureSample(MetalnessMap, TextureSampler, uv);\n        metalness *= metalnessRoughness.b;\n        roughness *= metalnessRoughness.g;\n    #endif\n\n    var emissive = mat.EmissiveColor;\n    #if USE_EMISSIVE_MAP\n        emissive *= textureSample(EmissiveMap, TextureSampler, uv);\n    #endif\n\n    #if USE_AO_MAP\n        occlusion = textureSample(AOMap, TextureSampler, uv).r;\n    #endif\n\n    output.albedo = vec4(albedo.rgb, roughness);\n\n    output.normal = vec4(OctEncode(normal.xyz), occlusion, metalness);\n    output.RMO = vec4(emissive.rgb, mat.Unlit);\n\n\n    // Wireframe\n    output.albedo *= 1.0 - edgeFactor(input.barycenticCoord) * mat.Wireframe;\n\n    // // Flat shading\n    // let xTangent: vec3f = dpdx( input.vPosition );\n    // let yTangent: vec3f = dpdy( input.vPosition );\n    // let faceNormal: vec3f = normalize( cross( xTangent, yTangent ) );\n\n    // output.normal = vec4(OctEncode(faceNormal.xyz), occlusion, metalness);\n\n    return output;\n}";

var WGSL_Shader_DrawVertexPulling_URL = "struct VertexInput {\n    @builtin(instance_index) instanceIdx : u32, \n    @builtin(vertex_index) vertexIndex : u32,\n    // @location(0) position : vec3<f32>,\n    // @location(1) normal : vec3<f32>,\n    // @location(2) uv : vec2<f32>,\n};\n\nstruct Material {\n    AlbedoColor: vec4<f32>,\n    EmissiveColor: vec4<f32>,\n    Roughness: f32,\n    Metalness: f32,\n    Unlit: f32,\n    AlphaCutoff: f32,\n    Wireframe: f32\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vPosition : vec3<f32>,\n    @location(1) vNormal : vec3<f32>,\n    @location(2) vUv : vec2<f32>,\n    @location(3) @interpolate(flat) instance : u32,\n    @location(4) barycenticCoord : vec3<f32>,\n    @location(5) tangent : vec3<f32>,\n    @location(6) bitangent : vec3<f32>,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n@group(0) @binding(3) var<storage, read> material: Material;\n@group(0) @binding(4) var TextureSampler: sampler;\n\n// These get optimized out based on \"USE*\" defines\n@group(0) @binding(5) var AlbedoMap: texture_2d<f32>;\n@group(0) @binding(6) var NormalMap: texture_2d<f32>;\n@group(0) @binding(7) var HeightMap: texture_2d<f32>;\n@group(0) @binding(8) var MetalnessMap: texture_2d<f32>;\n@group(0) @binding(9) var EmissiveMap: texture_2d<f32>;\n@group(0) @binding(10) var AOMap: texture_2d<f32>;\n\n\n@group(0) @binding(11) var<storage, read> cameraPosition: vec3<f32>;\n\n// TODO: Make it work with skinning\n@group(1) @binding(0) var<storage, read> position: array<vec4<f32>>;\n@group(1) @binding(1) var<storage, read> normal: array<vec4<f32>>;\n@group(1) @binding(2) var<storage, read> uv: array<vec2<f32>>;\n@group(1) @binding(3) var<storage, read> index: array<u32>;\n#if USE_NORMAL_MAP\n    @group(1) @binding(4) var<storage, read> tangent: array<vec4<f32>>;\n#endif\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output : VertexOutput;\n\n    let i = u32(index[input.vertexIndex]);\n\n    var finalPosition = vec4(position[i].xyz, 1.0);\n    // var finalPosition = vec4(input.position, 1.0);\n    var finalNormal = vec4(normal[i].xyz, 0.0);\n\n\n    var modelMatrixInstance = modelMatrix[input.instanceIdx];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n\n    output.instance = input.instanceIdx;\n    output.position = projectionMatrix * modelViewMatrix * vec4(finalPosition.xyz, 1.0);\n    output.vPosition = finalPosition.xyz;\n    output.vUv = uv[i];\n    let worldNormal = normalize(modelMatrixInstance * vec4(finalNormal.xyz, 0.0)).xyz;\n    output.vNormal = worldNormal;\n\n    #if USE_NORMAL_MAP\n        let tangentData = tangent[i];\n        let worldTangent = normalize(modelMatrixInstance * vec4(tangentData.xyz, 0.0)).xyz;\n        let worldBitangent = cross(worldNormal, worldTangent) * tangentData.w;\n        output.tangent = worldTangent;\n        output.bitangent = worldBitangent;\n    #endif\n\n    // emit a barycentric coordinate\n    output.barycenticCoord = vec3f(0);\n    output.barycenticCoord[input.vertexIndex % 3] = 1.0;\n\n    return output;\n}\n\nstruct FragmentOutput {\n    @location(0) albedo : vec4f,\n    @location(1) normal : vec4f,\n    @location(2) RMO : vec4f,\n};\n\nfn inversesqrt(v: f32) -> f32 {\n    return 1.0 / sqrt(v);\n}\n\nfn edgeFactor(bary: vec3f) -> f32 {\n    let lineThickness = 1.0;\n    let d = fwidth(bary);\n    let a3 = smoothstep(vec3f(0.0), d * lineThickness, bary);\n    return min(min(a3.x, a3.y), a3.z);\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> FragmentOutput {\n    var output: FragmentOutput;\n\n    let mat = material;\n\n    var uv = input.vUv;// * vec2(4.0, 2.0);\n\n    var modelMatrixInstance = modelMatrix[input.instance];\n\n    var albedo = mat.AlbedoColor;\n    var roughness = mat.Roughness;\n    var metalness = mat.Metalness;\n    var occlusion = 1.0;\n    var unlit = mat.Unlit;\n\n    // var albedo = mat.AlbedoColor;\n    #if USE_ALBEDO_MAP\n        albedo *= textureSample(AlbedoMap, TextureSampler, uv);\n    #endif\n\n    if (albedo.a < mat.AlphaCutoff) {\n        discard;\n    }\n\n    var normal: vec3f = input.vNormal;\n    #if USE_NORMAL_MAP\n        var tbn: mat3x3<f32>;\n        tbn[0] = input.tangent;\n        tbn[1] = input.bitangent;\n        tbn[2] = input.vNormal;\n        \n        let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0; // [0 - 1] -> [-1, -1] from brga8unorm to float\n        normal = tbn * normalSample;\n    #endif\n\n    #if USE_METALNESS_MAP\n        let metalnessRoughness = textureSample(MetalnessMap, TextureSampler, uv);\n        metalness *= metalnessRoughness.b;\n        roughness *= metalnessRoughness.g;\n    #endif\n\n    var emissive = mat.EmissiveColor;\n    #if USE_EMISSIVE_MAP\n        emissive *= textureSample(EmissiveMap, TextureSampler, uv);\n    #endif\n\n    #if USE_AO_MAP\n        occlusion = textureSample(AOMap, TextureSampler, uv).r;\n        occlusion = 1.0;\n    #endif\n\n    output.albedo = vec4(albedo.rgb, roughness);\n    output.normal = vec4(normal, metalness);\n    // output.normal = vec4(input.tangent.xyz, metalness);\n    output.RMO = vec4(emissive.rgb, unlit);\n\n\n    // Wireframe\n    output.albedo *= 1.0 - edgeFactor(input.barycenticCoord) * mat.Wireframe;\n\n    // // Flat shading\n    // let xTangent: vec3f = dpdx( input.vPosition );\n    // let yTangent: vec3f = dpdy( input.vPosition );\n    // let faceNormal: vec3f = normalize( cross( xTangent, yTangent ) );\n\n    // output.normal = vec4(faceNormal.xyz, metalness);\n\n    return output;\n}";

var WGSL_Shader_DeferredLighting_URL = "#include \"@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/ShadowMap.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/ShadowMapCSM.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/OctahedralEncoding.wgsl\";\n\nstruct Settings {\n    debugDepthPass: f32,\n    debugDepthMipLevel: f32,\n    debugDepthExposure: f32,\n    viewType: f32,\n    useHeightMap: f32,\n    heightScale: f32,\n\n    debugShadowCascades: f32,\n    pcfResolution: f32,\n    blendThreshold: f32,\n    viewBlendThreshold: f32,\n\n    cameraPosition: vec4<f32>,\n};\n\nstruct VertexInput {\n    @builtin(instance_index) instance : u32, \n    @location(0) position : vec3<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) position: vec4<f32>,\n    @location(0) vUv: vec2<f32>,\n    @location(1) @interpolate(flat) lightIndex: u32,\n};\n\n@group(0) @binding(0) var textureSampler: sampler;\n\n@group(0) @binding(1) var albedoTexture: texture_2d<f32>;\n@group(0) @binding(2) var normalTexture: texture_2d<f32>;\n@group(0) @binding(3) var ermoTexture: texture_2d<f32>;\n@group(0) @binding(4) var depthTexture: texture_depth_2d;\n@group(0) @binding(5) var shadowPassDepth: texture_depth_2d_array;\n\n@group(0) @binding(6) var skyboxTexture: texture_cube<f32>;\n@group(0) @binding(7) var skyboxIrradianceTexture: texture_cube<f32>;\n@group(0) @binding(8) var skyboxPrefilterTexture: texture_cube<f32>;\n@group(0) @binding(9) var skyboxBRDFLUT: texture_2d<f32>;\n\n@group(0) @binding(10) var brdfSampler: sampler;\n@group(0) @binding(11) var<storage, read> lights: array<Light>;\n@group(0) @binding(12) var<storage, read> lightCount: u32;\n\n\n\n\n\n\nstruct View {\n    projectionOutputSize: vec4<f32>,\n    viewPosition: vec4<f32>,\n    projectionInverseMatrix: mat4x4<f32>,\n    viewInverseMatrix: mat4x4<f32>,\n    viewMatrix: mat4x4<f32>,\n    projectionMatrix: mat4x4<f32>,\n};\n@group(0) @binding(13) var<storage, read> view: View;\n\n\nconst numCascades = 4;\n\n@group(0) @binding(14) var shadowSamplerComp: sampler_comparison;\n\n@group(0) @binding(15) var<storage, read> settings: Settings;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output: VertexOutput;\n    let light = lights[input.instance];\n    let lightType = u32(light.color.a);\n\n    output.position = view.projectionMatrix * view.viewMatrix * light.lightModelMatrix * vec4(input.position, 1.0);\n    if (lightType == DIRECTIONAL_LIGHT) {\n        // Flip X so the quad becomes back-facing (survives front-face cull).\n        // Place it at the far plane so it passes depthCompare \"greater-equal\".\n        output.position = vec4(-input.position.x, input.position.y, 1.0, 1.0);\n    }\n\n    output.vUv = input.uv;\n    output.lightIndex = input.instance;\n    return output;\n}\n\nconst PI = 3.141592653589793;\n\nconst SPOT_LIGHT = 0;\nconst DIRECTIONAL_LIGHT = 1;\nconst POINT_LIGHT = 2;\nconst AREA_LIGHT = 3;\n\nfn reconstructWorldPosFromZ(\n    coords: vec2<f32>,\n    size: vec2<f32>,\n    depth: f32,\n    projInverse: mat4x4<f32>,\n    viewInverse: mat4x4<f32>\n    ) -> vec4<f32> {\n    let uv = coords.xy / size;\n    let x = uv.x * 2.0 - 1.0;\n    let y = (1.0 - uv.y) * 2.0 - 1.0;\n    let projectedPos = vec4(x, y, depth, 1.0);\n    var worldPosition = projInverse * projectedPos;\n    worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);\n    worldPosition = viewInverse * worldPosition;\n    return worldPosition;\n}\n\nfn DistributionGGX(n: vec3f, h: vec3f, roughness: f32) -> f32 {\n  let a = roughness * roughness;\n  let a2 = a * a;\n  let nDotH = max(dot(n, h), 0.0);\n  let nDotH2 = nDotH * nDotH;\n  var denom = (nDotH2 * (a2 - 1.0) + 1.0);\n  denom = PI * denom * denom;\n  return a2 / denom;\n}\n\nfn GeometrySchlickGGX(nDotV: f32, roughness: f32) -> f32 {\n  let r = (roughness + 1.0);\n  let k = (r * r) / 8.0;\n  return nDotV / (nDotV * (1.0 - k) + k);\n}\n\nfn GeometrySmith(n: vec3f, v: vec3f, l: vec3f, roughness: f32) -> f32 {\n  let nDotV = max(dot(n, v), 0.0);\n  let nDotL = max(dot(n, l), 0.0);\n  let ggx2 = GeometrySchlickGGX(nDotV, roughness);\n  let ggx1 = GeometrySchlickGGX(nDotL, roughness);\n  return ggx1 * ggx2;\n}\n\nfn FresnelSchlick(cosTheta: f32, f0: vec3f) -> vec3f {\n  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);\n}\n\nfn CalculateBRDF(surface: Surface, pointToLight: vec3<f32>) -> vec3<f32> {\n    // cook-torrance brdf\n    let L = normalize(pointToLight);\n    let H = normalize(surface.V + L);\n    let distance = length(pointToLight);\n\n    let NDF = DistributionGGX(surface.N, H, surface.roughness);\n    let G = GeometrySmith(surface.N, surface.V, L, surface.roughness);\n    let F = FresnelSchlick(max(dot(H, surface.V), 0.0), surface.F0);\n\n    let kD = (vec3(1.0, 1.0, 1.0) - F) * (1.0 - surface.metallic);\n\n    let NdotL = max(dot(surface.N, L), 0.0);\n\n    let numerator = NDF * G * F;\n    let denominator = max(4.0 * max(dot(surface.N, surface.V), 0.0) * NdotL, 0.001);\n    let specular = numerator / vec3(denominator, denominator, denominator);\n\n    return (kD * surface.albedo.rgb / vec3(PI, PI, PI) + specular) * NdotL;\n}\n\nfn DirectionalLightRadiance(light: DirectionalLight, surface : Surface) -> vec3<f32> {\n    return CalculateBRDF(surface, light.direction) * light.color * light.intensity;\n}\n\nfn rangeAttenuation(range : f32, distance : f32) -> f32 {\n    if (range <= 0.0) {\n        // Negative range means no cutoff\n        return 1.0 / pow(distance, 2.0);\n    }\n    return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);\n}\n\nfn SpotLightRadiance(light : SpotLight, surface : Surface) -> vec3<f32> {\n    // pointToLight is SURFACE -> LIGHT (as you already set)\n    let dist = length(light.pointToLight);\n\n    // For cone test we need LIGHT -> SURFACE\n    let L_ls = normalize(-light.pointToLight);   // light -> surface\n    let cd   = dot(light.direction, L_ls);       // cos(theta), 1 at center\n\n    // Smooth falloff from edge to center: 0 at cos(angle), 1 at 1.0\n    let spot = smoothstep(cos(light.angle), 1.0, cd);\n\n    // Range attenuation as you have it\n    let attenuation = rangeAttenuation(light.range, dist) * spot;\n\n    // BRDF usually expects wi = SURFACE -> LIGHT\n    let wi = -L_ls; // (surface -> light)\n    let radiance = CalculateBRDF(surface, wi) * light.color * light.intensity * attenuation;\n    return radiance;\n}\n\nfn PointLightRadiance(light: PointLight, surface: Surface) -> vec3<f32> {\n    let dist = length(light.pointToLight);\n    let wi   = normalize(light.pointToLight);        // surface -> light\n    let att  = rangeAttenuation(light.range, dist);  // your smooth cutoff / r^2\n    return CalculateBRDF(surface, wi) * light.color * light.intensity * att;\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    // Load depth once\n    let pix   = vec2<i32>(floor(input.position.xy));\n    let depth = textureLoad(depthTexture, pix, 0);\n\n    let fragCoord = input.position.xy;\n    let screenSize = view.projectionOutputSize.xy;\n\n    let uv = fragCoord / screenSize;\n\n    let worldPosition = reconstructWorldPosFromZ(\n        input.position.xy,\n        view.projectionOutputSize.xy,\n        depth,\n        view.projectionInverseMatrix,\n        view.viewInverseMatrix\n    );\n\n    let albedo = textureSample(albedoTexture, textureSampler, uv);\n    let normal = textureSample(normalTexture, textureSampler, uv);\n    let ermo   = textureSample(ermoTexture,   textureSampler, uv);\n\n    let unlit = ermo.a;\n\n    if (unlit > 0.5) {\n        var color = albedo.rgb;\n        return vec4f(color, 1.0);\n    }\n\n    var surface: Surface;\n    surface.depth          = depth;\n    surface.albedo         = albedo.rgb;\n    surface.roughness      = clamp(albedo.a, 0.0, 0.99);\n    surface.occlusion      = normal.z;\n    surface.metallic       = normal.a;\n    surface.emissive       = ermo.rgb;\n    surface.worldPosition  = worldPosition.xyz;\n    \n    surface.N              = OctDecode(normal.rg);\n    surface.F0             = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));\n    surface.V              = normalize(view.viewPosition.xyz - surface.worldPosition);\n\n    var lo = vec3f(0.0);\n    var selectedCascade = 0;\n\n    var light = lights[input.lightIndex];\n    let lightType = u32(light.color.a);\n\n    if (lightType == DIRECTIONAL_LIGHT) {\n        var directionalLight: DirectionalLight;\n        directionalLight.direction = normalize((light.viewMatrixInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n        // directionalLight.direction = light.direction.xyz;\n        directionalLight.color = light.color.rgb;\n        directionalLight.intensity = light.params1.x;\n\n        let castShadows = light.params1.z > 0.5;\n        var shadow = 1.0;\n        if (castShadows) {\n            let shadowCSM = CalculateShadowCSM(shadowPassDepth, shadowSamplerComp, surface, light, input.lightIndex);\n            shadow = shadowCSM.visibility;\n            selectedCascade = shadowCSM.selectedCascade;\n        }\n\n        // lo += shadow * DirectionalLightRadiance(directionalLight, surface) * radiance;\n        lo += shadow * DirectionalLightRadiance(directionalLight, surface);\n    }\n\n    else if (lightType == SPOT_LIGHT) {\n        var spotLight: SpotLight;\n        \n        // light.position.x *= -1.0;\n        // light.position.z *= -1.0;\n        spotLight.pointToLight = light.position.xyz - surface.worldPosition;\n        spotLight.color = light.color.rgb;\n        spotLight.intensity = light.params1.r;\n        spotLight.range = light.params1.g;\n        spotLight.direction = normalize((light.viewMatrixInverse * vec4(0.0, 0.0, -1.0, 0.0)).xyz);\n        // spotLight.direction = normalize(light.params2.xyz);\n        // spotLight.direction = light.direction.xyz;\n        spotLight.angle = light.params2.w;\n\n        let castShadows = light.params1.z > 0.5;\n        var shadow = 1.0;\n        if (castShadows) {\n            let shadowCSM = CalculateShadowCSMSpot(shadowPassDepth, shadowSamplerComp, surface, light, input.lightIndex);\n            shadow = shadowCSM.visibility;\n            selectedCascade = shadowCSM.selectedCascade;\n            // shadow = SampleSpotShadowMap(surface, light); // <— single 2D map on this layer\n\n        }\n\n        lo += shadow * SpotLightRadiance(spotLight, surface);\n    }\n\n    else if (lightType == POINT_LIGHT) {\n        var p: PointLight;\n        p.pointToLight = light.position.xyz - surface.worldPosition;\n        p.color        = light.color.rgb;\n        p.intensity    = light.params1.x;\n        p.range        = light.params1.y;\n\n        var shadow = 1.0;\n        let castShadows = light.params1.z > 0.5;\n        // if (castShadows) {\n        //     shadow = SamplePointShadow(surface, light, i);\n        // }\n\n        lo += shadow * PointLightRadiance(p, surface);\n    }\n\n    return vec4f(lo, 0.0);\n}";

var WGSL_Shader_IBLLighting_URL = "#include \"@trident/core/resources/webgpu/shaders/deferred/OctahedralEncoding.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl\";\n\nstruct VertexOutput {\n    @builtin(position) position: vec4<f32>,\n    @location(0) vUv: vec2<f32>,\n};\n\n@group(0) @binding(0) var textureSampler: sampler;\n\n@group(0) @binding(1) var albedoTexture: texture_2d<f32>;\n@group(0) @binding(2) var normalTexture: texture_2d<f32>;\n@group(0) @binding(3) var ermoTexture: texture_2d<f32>;\n@group(0) @binding(4) var depthTexture: texture_depth_2d;\n\n@group(0) @binding(7) var skyboxIrradianceTexture: texture_cube<f32>;\n@group(0) @binding(8) var skyboxPrefilterTexture: texture_cube<f32>;\n@group(0) @binding(9) var skyboxBRDFLUT: texture_2d<f32>;\n\n@group(0) @binding(10) var brdfSampler: sampler;\n\nstruct View {\n    projectionOutputSize: vec4<f32>,\n    viewPosition: vec4<f32>,\n    projectionInverseMatrix: mat4x4<f32>,\n    viewInverseMatrix: mat4x4<f32>,\n    viewMatrix: mat4x4<f32>,\n    projectionMatrix: mat4x4<f32>,\n};\n@group(0) @binding(13) var<storage, read> view: View;\n\n\n// Full-screen triangle (covers screen with 3 verts)\nconst p = array<vec2f, 3>(\n    vec2f(-1.0, -1.0),\n    vec2f( 3.0, -1.0),\n    vec2f(-1.0,  3.0)\n);\n\n@vertex\nfn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {\n    var output: VertexOutput;\n    output.position = vec4(p[vertexIndex], 0.0, 1.0);\n    let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));\n    output.vUv = vec2f(uv.x, 1.0 - uv.y);\n    return output;\n}\n\nfn reconstructWorldPosFromZ(\n    coords: vec2<f32>,\n    size: vec2<f32>,\n    depth: f32,\n    projInverse: mat4x4<f32>,\n    viewInverse: mat4x4<f32>\n    ) -> vec4<f32> {\n    let uv = coords.xy / size;\n    let x = uv.x * 2.0 - 1.0;\n    let y = (1.0 - uv.y) * 2.0 - 1.0;\n    let projectedPos = vec4(x, y, depth, 1.0);\n    var worldPosition = projInverse * projectedPos;\n    worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);\n    worldPosition = viewInverse * worldPosition;\n    return worldPosition;\n}\n\nfn FresnelSchlick(cosTheta: f32, f0: vec3f) -> vec3f {\n  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);\n}\n\nfn FresnelSchlickRoughness(cosTheta: f32, f0: vec3f, roughness: f32) -> vec3f {\n  return f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);\n}\n\nfn fixCubeHandedness(d: vec3f) -> vec3f {\n    return vec3f(-d.x, d.y, d.z);\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    let uv = input.vUv;\n    let pix   = vec2<i32>(floor(input.position.xy));\n\n    let depth = textureLoad(depthTexture, pix, 0);\n    let albedo = textureSample(albedoTexture, textureSampler, uv);\n    let normal = textureSample(normalTexture, textureSampler, uv);\n    let ermo   = textureSample(ermoTexture,   textureSampler, uv);\n\n    let worldPosition = reconstructWorldPosFromZ(\n        input.position.xy,\n        view.projectionOutputSize.xy,\n        depth,\n        view.projectionInverseMatrix,\n        view.viewInverseMatrix\n    );\n\n    var surface: Surface;\n    surface.depth          = depth;\n    surface.albedo         = albedo.rgb;\n    surface.roughness      = clamp(albedo.a, 0.0, 0.99);\n    surface.occlusion      = normal.z;\n    surface.metallic       = normal.a;\n    surface.emissive       = ermo.rgb;\n    surface.worldPosition  = worldPosition.xyz;\n    \n    surface.N              = OctDecode(normal.rg);\n    surface.F0             = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));\n    surface.V              = normalize(view.viewPosition.xyz - surface.worldPosition);\n\n\n    let n = surface.N;\n    let v = surface.V;\n    let r = reflect(-v, n);\n\n    let irradiance = textureSample(skyboxIrradianceTexture, textureSampler, fixCubeHandedness(n)).rgb;\n    let diffuse = irradiance * surface.albedo.xyz;\n\n    let f = FresnelSchlickRoughness(max(dot(n, v), 0.00001), surface.F0, surface.roughness);\n    let kS = f;\n    var kD = vec3f(1.0) - kS;\n    kD *= 1.0 - surface.metallic;\n\n    const MAX_REFLECTION_LOD = 4.0;\n    let prefilteredColor = textureSampleLevel(skyboxPrefilterTexture, textureSampler, fixCubeHandedness(r), surface.roughness * MAX_REFLECTION_LOD).rgb;\n    let brdf = textureSample(skyboxBRDFLUT, brdfSampler, vec2f(max(dot(n, v), 0.0), surface.roughness)).rg;\n    let specular = prefilteredColor * (f * brdf.x + brdf.y);\n\n    let ambient = kD * diffuse * surface.occlusion + specular;\n\n    let color = ambient + surface.emissive;\n\n    return vec4f(color, 1.0);\n}";

var WGSL_Shader_Deferred_SurfaceStruct = "struct Surface {\n    albedo: vec3<f32>,\n    emissive: vec3<f32>,\n    metallic: f32,\n    roughness: f32,\n    occlusion: f32,\n    worldPosition: vec3<f32>,\n    N: vec3<f32>,\n    F0: vec3<f32>,\n    V: vec3<f32>,\n    depth: f32\n};";

var WGSL_Shader_Deferred_LightStruct = "struct Light {\n    lightModelMatrix: mat4x4<f32>,\n    position: vec4<f32>,\n    projectionMatrix: mat4x4<f32>,\n    // // Using an array of mat4x4 causes the render time to go from 3ms to 9ms for some reason\n    // csmProjectionMatrix: array<mat4x4<f32>, 4>,\n    csmProjectionMatrix0: mat4x4<f32>,\n    csmProjectionMatrix1: mat4x4<f32>,\n    csmProjectionMatrix2: mat4x4<f32>,\n    csmProjectionMatrix3: mat4x4<f32>,\n    cascadeSplits: vec4<f32>,\n    viewMatrix: mat4x4<f32>,\n    viewMatrixInverse: mat4x4<f32>,\n    // direction: vec4<f32>,\n    color: vec4<f32>,\n    params1: vec4<f32>,\n    params2: vec4<f32>,\n};\n\nstruct DirectionalLight {\n    direction: vec3<f32>,\n    color: vec3<f32>,\n    intensity: f32\n};\n\nstruct SpotLight {\n    pointToLight: vec3<f32>,\n    color: vec3<f32>,\n    direction: vec3<f32>,\n    range: f32,\n    intensity: f32,\n    angle: f32,\n};\n\nstruct PointLight {\n    pointToLight: vec3<f32>,\n    color: vec3<f32>,\n    range: f32,\n    intensity: f32,\n};";

var WGSL_Shader_Deferred_ShadowMap = "#include \"@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/ShadowUtils.wgsl\";\n\n// NDC -> UV, then remap into the 2×2 quadrant atlas inside ONE array layer.\nfn worldToAtlasUVZSpot(worldPos: vec3<f32>, light: Light, cascadeIndex: i32) -> vec3<f32> {\n    let m = light.csmProjectionMatrix0;\n    let p = m * vec4(worldPos, 1.0);\n    let ndc = p.xyz / p.w;\n\n    // NDC -> [0,1], with y flipped to texture space\n    var uv = ndc.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);\n\n    return vec3<f32>(uv, ndc.z);\n}\n\nfn SampleCascadeShadowMapSpot(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, cascadeIndex: i32, lightIndex: u32) -> f32 {\n    // Build atlas UV/Z for this cascade\n    let uvz = worldToAtlasUVZSpot(surface.worldPosition, light, cascadeIndex);\n    let uv  = uvz.xy;\n    let z   = uvz.z;\n\n    // Outside clip or outside atlas -> lit\n    if (z <= 0.0 || z >= 1.0 || !inUnitSquare(uv)) {\n        return 1.0;\n    }\n\n    // One textureDimensions() per pixel (ideally pass texel size from CPU)\n    let texDim = vec2<f32>(textureDimensions(shadowTexture));\n    let texel  = 1.0 / texDim;\n\n    // Use fast 3×3 when radius <= 1, else bounded loop (max 5×5)\n    let radius = i32(settings.pcfResolution); // interpret as radius\n    if (radius <= 1) {\n        return pcf3x3_quadrant(shadowTexture, shadowSampler, uv, z, i32(light.params1.w), texel);\n    } else {\n        return pcfBounded(shadowTexture, shadowSampler, uv, z, i32(light.params1.w), texel, radius);\n    }\n}\n\nfn CalculateShadowCSMSpot(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {\n    var out: ShadowCSM;\n\n    // View-space depth for cascade selection\n    let fragPosViewSpace = view.viewMatrix * vec4f(surface.worldPosition, 1.0);\n    let depthValue  = abs(fragPosViewSpace.z);\n\n    // Pick cascade (branchless)\n    let selectedCascade = 0;\n    out.selectedCascade = selectedCascade;\n\n    // Primary cascade\n    let visibility = SampleCascadeShadowMapSpot(shadowTexture, shadowSampler, surface, light, selectedCascade, lightIndex);\n\n    out.visibility = clamp(visibility, 0.0, 1.0);\n    return out;\n}";

var WGSL_Shader_Deferred_ShadowMapCSM = "#include \"@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl\";\n#include \"@trident/core/resources/webgpu/shaders/deferred/ShadowUtils.wgsl\";\n\nfn csmMatrix(light: Light, idx: i32) -> mat4x4<f32> {\n    if (idx == 0) { return light.csmProjectionMatrix0; }\n    if (idx == 1) { return light.csmProjectionMatrix1; }\n    if (idx == 2) { return light.csmProjectionMatrix2; }\n    return light.csmProjectionMatrix3;\n}\n\nfn ShadowLayerSelection(depthValue: f32, light: Light) -> i32 {\n    // count how many splits we have passed (0..3)\n    var layer = 0;\n    layer += select(0, 1, depthValue >= light.cascadeSplits.x);\n    layer += select(0, 1, depthValue >= light.cascadeSplits.y);\n    layer += select(0, 1, depthValue >= light.cascadeSplits.z);\n    return clamp(layer, 0, numCascades - 1);\n}\n\n// NDC -> UV, then remap into the 2×2 quadrant atlas inside ONE array layer.\nfn worldToAtlasUVZ(worldPos: vec3<f32>, light: Light, cascadeIndex: i32) -> vec3<f32> {\n    let m = csmMatrix(light, cascadeIndex);\n    let p = m * vec4(worldPos, 1.0);\n    let ndc = p.xyz / p.w;\n\n    // NDC -> [0,1], with y flipped to texture space\n    var uv = ndc.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);\n\n    // Quadrant packing: [0]=BL, [1]=TL, [2]=BR, [3]=TR (matches your original logic)\n    if (cascadeIndex >= 2) { uv.x += 1.0; }\n    if ((cascadeIndex & 1) == 1) { uv.y += 1.0; }\n    uv *= 0.5;\n\n    return vec3<f32>(uv, ndc.z);\n}\n\nfn SampleCascadeShadowMap(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, cascadeIndex: i32, lightIndex: u32) -> f32 {\n    // Build atlas UV/Z for this cascade\n    let uvz = worldToAtlasUVZ(surface.worldPosition, light, cascadeIndex);\n    let uv  = uvz.xy;\n    let z   = uvz.z;\n\n    // Outside clip or outside atlas -> lit\n    if (z <= 0.0 || z >= 1.0 || !inUnitSquare(uv)) {\n        return 1.0;\n    }\n\n    // One textureDimensions() per pixel (ideally pass texel size from CPU)\n    let texDim = vec2<f32>(textureDimensions(shadowTexture));\n    let texel  = 1.0 / texDim;\n\n    // Use fast 3×3 when radius <= 1, else bounded loop (max 5×5)\n    let radius = i32(settings.pcfResolution); // interpret as radius\n    if (radius <= 1) {\n        return pcf3x3_quadrant(shadowTexture, shadowSampler, uv, z, i32(light.params1.w), texel);\n    } else {\n        return pcfBounded(shadowTexture, shadowSampler, uv, z, i32(light.params1.w), texel, radius);\n    }\n}\n\nfn lerp(k0: f32, k1: f32, t: f32) -> f32 {\n    return k0 + t * (k1 - k0);\n}\n\nfn CalculateShadowCSM(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {\n    var out: ShadowCSM;\n\n    // View-space depth for cascade selection\n    let fragPosViewSpace = view.viewMatrix * vec4f(surface.worldPosition, 1.0);\n    let depthValue  = abs(fragPosViewSpace.z);\n\n    // Early accept: beyond last split, no shadow work\n    let lastSplit = light.cascadeSplits[numCascades - 1];\n    if (depthValue > lastSplit) {\n        out.visibility = 1.0;\n        out.selectedCascade = numCascades - 1;\n        return out;\n    }\n\n    // Pick cascade (branchless)\n    let selectedCascade = ShadowLayerSelection(depthValue, light);\n    out.selectedCascade = selectedCascade;\n\n    // Primary cascade\n    var visibility = SampleCascadeShadowMap(shadowTexture, shadowSampler, surface, light, selectedCascade, lightIndex);\n\n    // Blend near the split to hide seams\n    let blendThreshold   = settings.blendThreshold;\n    let nextSplit  = light.cascadeSplits[selectedCascade];\n\n    var splitSize = nextSplit;\n    if (selectedCascade > 0) { splitSize = nextSplit - light.cascadeSplits[selectedCascade - 1]; }\n\n    let fadeFactor = (nextSplit - depthValue) / max(splitSize, 1e-6);\n\n    if (fadeFactor <= blendThreshold && selectedCascade != numCascades - 1) {\n        let nextSplitVisibility = SampleCascadeShadowMap(shadowTexture, shadowSampler, surface, light, selectedCascade + 1, lightIndex);\n        let lerpAmount = smoothstep(0.0, blendThreshold, fadeFactor);\n        visibility = lerp(nextSplitVisibility, visibility, lerpAmount);\n\n        if (u32(settings.viewBlendThreshold) == 1u) {\n            visibility *= fadeFactor; // debug view\n        }\n    }\n\n    out.visibility = clamp(visibility, 0.0, 1.0);\n    return out;\n}";

var WGSL_Shader_Deferred_ShadowUtils = "struct ShadowCSM {\n    visibility: f32,\n    selectedCascade: i32\n};\n\nfn inUnitSquare(u: vec2<f32>) -> bool {\n    return all(u >= vec2<f32>(0.0)) && all(u <= vec2<f32>(1.0));\n}\n\nfn pcf3x3_quadrant(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, uv: vec2<f32>, z: f32, layer: i32, texel: vec2<f32>) -> f32 {\n    // Early accept: fully lit center → 1.0\n    let center = textureSampleCompareLevel(shadowTexture, shadowSampler, uv, layer, z);\n    if (center >= 1.0) { return 1.0; }\n\n    var sum = 0.0;\n    // Row -1\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(-texel.x, -texel.y), layer, z);\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(         0.0, -texel.y), layer, z);\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2( texel.x, -texel.y), layer, z);\n    // Row  0\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(-texel.x,          0.0), layer, z);\n    sum += center;\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2( texel.x,          0.0), layer, z);\n    // Row +1\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(-texel.x,  texel.y), layer, z);\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(         0.0,  texel.y), layer, z);\n    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2( texel.x,  texel.y), layer, z);\n\n    return sum * (1.0 / 9.0);\n}\n\nconst MAX_RADIUS : i32 = 2; // up to 5×5\nfn pcfBounded(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, uv: vec2<f32>, z: f32, layer: i32, texel: vec2<f32>, radius: i32) -> f32 {\n    let r = clamp(radius, 0, MAX_RADIUS);\n    if (r <= 1) { return pcf3x3_quadrant(shadowTexture, shadowSampler, uv, z, layer, texel); }\n\n    var sum = 0.0;\n    for (var j = -r; j <=  r; j = j + 1) {\n        for (var i = -r; i <=  r; i = i + 1) {\n            sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2<f32>(f32(i), f32(j)) * texel, layer, z);\n        }\n    }\n    let taps = f32((2 * r + 1) * (2 * r + 1));\n    return sum / taps;\n}";

var WGSL_Shader_Deferred_OctahedralEncoding = "// From: https://knarkowicz.wordpress.com/2014/04/16/octahedron-normal-vector-encoding/\nfn OctWrap(v: vec2f) -> vec2f {\n    return (1.0 - abs(v.yx)) * select(vec2f(-1.0), vec2f(1.0), v.xy >= vec2(0.0));\n}\n\nfn OctEncode(_n: vec3f) -> vec2f {\n    var n = _n.xy;\n    let nz = _n.z;\n    n /= (abs(n.x) + abs(n.y) + abs(nz));\n    n = select(OctWrap(n.xy), n.xy, nz >= 0.0);\n    n = n.xy * 0.5 + 0.5;\n    return n.xy;\n}\n\nfn OctDecode(_f: vec2f) -> vec3f {\n    let f = _f * 2.0 - 1.0;\n\n    // https://twitter.com/Stubbesaurus/status/937994790553227264\n    var n = vec3f(f.x, f.y, 1.0 - abs(f.x) - abs(f.y));\n    let t = saturate(-n.z);\n    let cond = select(vec2f(t), vec2f(-t), n.xy >= vec2f(0.0));\n    n.x += cond.x; n.y += cond.y;\n    return normalize(n);\n}";

class ShaderPreprocessor {
  static ProcessDefines(code, defines) {
    const nl = code.indexOf("\r\n") >= 0 ? "\r\n" : "\n";
    const out = [];
    const stack = [];
    const evalCond = (s) => {
      s = s.trim();
      let neg = false;
      while (s.startsWith("!")) {
        neg = !neg;
        s = s.slice(1).trim();
      }
      const val = !!defines[s];
      return neg ? !val : val;
    };
    for (const raw of code.split(nl)) {
      const t = raw.trim();
      if (t.startsWith("#if ")) {
        stack.push(evalCond(t.slice(4)));
        continue;
      }
      if (t.startsWith("#else")) {
        if (stack.length) stack[stack.length - 1] = !stack[stack.length - 1];
        continue;
      }
      if (t.startsWith("#endif")) {
        if (stack.length) stack.pop();
        continue;
      }
      if (stack.every(Boolean)) out.push(raw);
    }
    return out.join(nl);
  }
  static async ProcessIncludes(code, url = "./") {
    const basepath = url.substring(url.lastIndexOf("/"), -1) + "/";
    const includes = StringFindAllBetween(code, "#include", "\n", false);
    for (const includeStr of includes) {
      const filenameArray = StringFindAllBetween(includeStr, '"', '"', true);
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
  static async ProcessIncludesV2(code, url = "./", seen = /* @__PURE__ */ new Set()) {
    const includes = StringFindAllBetween(code, "#include", "\n", false);
    for (const includeStr of includes) {
      const filenameArray = StringFindAllBetween(includeStr, '"', '"', true).concat(StringFindAllBetween(includeStr, "'", "'", true));
      if (filenameArray.length !== 1) throw Error(`Invalid include ${filenameArray}`);
      const includeFullPath = filenameArray[0];
      if (seen.has(includeFullPath)) {
        code = code.replace(includeStr, "");
        continue;
      }
      seen.add(includeFullPath);
      const newCode = await Assets.Load(includeFullPath, "text");
      const includedCode = await this.ProcessIncludesV2(newCode, includeFullPath, seen);
      code = code.replace(includeStr, includedCode + "\n");
    }
    return code;
  }
}
class ShaderLoader {
  static async Load(shader_url) {
    if (Renderer.type === "webgpu") {
      if (shader_url === "") throw Error(`Invalid shader ${shader_url}`);
      let code = await Assets.Load(shader_url, "text");
      code = await ShaderPreprocessor.ProcessIncludes(code, shader_url);
      return code;
    }
    throw Error("Unknown api");
  }
  static async LoadV2(shader_url) {
    if (Renderer.type === "webgpu") {
      if (shader_url === "") throw Error(`Invalid shader ${shader_url}`);
      let code = await Assets.Load(shader_url, "text");
      code = await ShaderPreprocessor.ProcessIncludesV2(code, shader_url);
      return code;
    }
    throw Error("Unknown api");
  }
  static async LoadURL(shader_url) {
    if (Renderer.type === "webgpu") {
      let code = await Assets.LoadURL(shader_url, "text");
      code = await ShaderPreprocessor.ProcessIncludesV2(code, shader_url.href);
      return code;
    }
    throw Error("Unknown api");
  }
  static get Draw() {
    return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_Draw_URL);
  }
  static get DrawVertexPulling() {
    return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_DrawVertexPulling_URL);
  }
  static get DeferredLighting() {
    return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_DeferredLighting_URL);
  }
  static get IBLLighting() {
    return ShaderPreprocessor.ProcessIncludesV2(WGSL_Shader_IBLLighting_URL);
  }
}
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl", WGSL_Shader_Deferred_SurfaceStruct);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl", WGSL_Shader_Deferred_LightStruct);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowMap.wgsl", WGSL_Shader_Deferred_ShadowMap);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowMapCSM.wgsl", WGSL_Shader_Deferred_ShadowMapCSM);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/ShadowUtils.wgsl", WGSL_Shader_Deferred_ShadowUtils);
Assets.Register("@trident/core/resources/webgpu/shaders/deferred/OctahedralEncoding.wgsl", WGSL_Shader_Deferred_OctahedralEncoding);

class WEBGPUMipsGenerator {
  static sampler;
  static module;
  static pipelineByFormat = {};
  static numMipLevels(...sizes) {
    return 1 + Math.log2(Math.max(...sizes)) | 0;
  }
  // TODO: Cannot call this twice because of texture usages
  static generateMips(source) {
    if (!WEBGPURenderer.device) throw Error("WEBGPU not initialized");
    const device = WEBGPURenderer.device;
    const sourceBuffer = source.GetBuffer();
    if (!this.module) {
      this.module = device.createShaderModule({
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
      this.sampler = device.createSampler({ minFilter: "linear", magFilter: "linear" });
    }
    if (!this.pipelineByFormat[sourceBuffer.format]) {
      this.pipelineByFormat[sourceBuffer.format] = device.createRenderPipeline({
        label: "mip level generator pipeline",
        layout: "auto",
        vertex: { module: this.module },
        fragment: { module: this.module, targets: [{ format: sourceBuffer.format }] }
      });
    }
    const pipeline = this.pipelineByFormat[sourceBuffer.format];
    const encoder = device.createCommandEncoder({ label: "mip gen encoder" });
    const destinationBuffer = device.createTexture({
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
      const bindGroup = device.createBindGroup({
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
    device.queue.submit([commandBuffer]);
    return destinationBuffer;
  }
}

const TextureFormatToBits = {
  rgba8unorm: 32,
  "rgba8unorm-srgb": 32,
  bgra8unorm: 32,
  "bgra8unorm-srgb": 32,
  rgba16float: 64,
  rg16float: 32,
  r16float: 16,
  rgba32float: 128,
  rg32float: 64,
  r32float: 32,
  rg8unorm: 16,
  r8unorm: 8,
  depth24plus: 32,
  "depth24plus-stencil8": 32,
  depth16unorm: 16
};
function bytesPerPixel(format) {
  return (TextureFormatToBits[format] ?? 32) / 8;
}
function totalBytesForTexture(format, width, height, depth, mipLevels) {
  let w = width, h = height, d = depth, totalPixels = 0;
  for (let i = 0; i < mipLevels; i++) {
    totalPixels += Math.max(1, w) * Math.max(1, h) * Math.max(1, d);
    w = w > 1 ? w >> 1 : 1;
    h = h > 1 ? h >> 1 : 1;
    d = d > 1 ? d >> 1 : d;
  }
  return totalPixels * bytesPerPixel(format);
}
class WEBGPUTexture {
  byteSize = 0;
  lastBandwidthFrame = -1;
  id = UUID();
  width;
  height;
  depth;
  format;
  type;
  dimension;
  mipLevels;
  name;
  buffer;
  viewCache = /* @__PURE__ */ new Map();
  currentLayer = 0;
  currentMip = 0;
  activeMipCount = 1;
  imageBitmap;
  // Used for Serialized/Deserialize
  constructor(width, height, depth, format, type, dimension, mipLevels) {
    let textureUsage = GPUTextureUsage.COPY_DST;
    let textureType = GPUTextureUsage.TEXTURE_BINDING;
    if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
    else if (type === TextureType.DEPTH) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    else if (type === TextureType.RENDER_TARGET) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    else if (type === TextureType.RENDER_TARGET_STORAGE) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
    else throw Error(`Unknown texture format ${format}`);
    let dim = "2d";
    if (dimension === "1d") dim = "1d";
    else if (dimension === "3d") dim = "3d";
    const textureBindingViewDimension = dimension === "cube" ? "cube" : void 0;
    this.buffer = WEBGPURenderer.device.createTexture({
      size: { width, height, depthOrArrayLayers: depth },
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
    this.byteSize = totalBytesForTexture(this.format, this.width, this.height, this.depth, this.mipLevels);
    Renderer.info.gpuTextureSizeTotal += this.byteSize;
    Renderer.info.gpuTextureCount++;
  }
  GetBuffer() {
    return this.buffer;
  }
  GetView() {
    const key = `${this.currentLayer}-${this.currentMip}`;
    let view = this.viewCache.get(key);
    if (!view) {
      const viewDimension = this.dimension === "cube" ? "2d" : this.dimension;
      view = this.buffer.createView({
        dimension: viewDimension,
        baseArrayLayer: this.currentLayer,
        arrayLayerCount: 1,
        baseMipLevel: this.currentMip,
        mipLevelCount: this.activeMipCount
      });
      this.viewCache.set(key, view);
    }
    if (Renderer.info.frame !== this.lastBandwidthFrame) {
      Renderer.info.gpuBandwidthInBytes += this.byteSize;
      this.lastBandwidthFrame = Renderer.info.frame;
    }
    return view;
  }
  GenerateMips() {
    this.buffer = WEBGPUMipsGenerator.generateMips(this);
    const mipLevels = WEBGPUMipsGenerator.numMipLevels(this.width, this.height, this.depth);
    this.SetActiveMipCount(mipLevels);
    this.mipLevels = mipLevels;
    this.byteSize = totalBytesForTexture(this.format, this.width, this.height, this.depth, this.mipLevels);
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
  SetName(name) {
    this.name = name;
    this.buffer.label = name;
  }
  GetName() {
    return this.buffer.label;
  }
  Destroy() {
    Renderer.info.gpuTextureSizeTotal -= this.byteSize;
    Renderer.info.gpuTextureCount--;
    this.buffer.destroy();
  }
  SetData(data, bytesPerRow, rowsPerImage) {
    try {
      WEBGPURenderer.device.queue.writeTexture(
        { texture: this.buffer },
        data,
        { bytesPerRow, rowsPerImage },
        { width: this.width, height: this.height, depthOrArrayLayers: this.depth }
      );
    } catch (error) {
      console.warn(error);
    }
  }
  // Format and types are very limited for now
  // https://github.com/gpuweb/gpuweb/issues/2322
  static FromImageBitmap(imageBitmap, width, height, format, generateMips) {
    const texture = new WEBGPUTexture(width, height, 1, format, TextureType.RENDER_TARGET, "2d", 1);
    try {
      WEBGPURenderer.device.queue.copyExternalImageToTexture(
        { source: imageBitmap, flipY: false },
        { texture: texture.GetBuffer() },
        [imageBitmap.width, imageBitmap.height]
      );
    } catch (error) {
      console.warn(error);
    }
    texture.imageBitmap = imageBitmap;
    if (generateMips) texture.GenerateMips();
    return texture;
  }
  Serialize(metadata = {}) {
    let cachedTexture = WEBGPUTexture.SerializedTextureCache.get(this.id);
    if (!cachedTexture) {
      let data = this.imageBitmap;
      if (metadata["base64Textures"] === true) {
        const canvas = new OffscreenCanvas(this.width, this.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(this.imageBitmap, 0, 0);
        data = new TextDecoder("latin1").decode(ctx.getImageData(0, 0, this.width, this.height).data);
      }
      cachedTexture = {
        serialized: {
          name: this.name,
          id: this.id,
          width: this.width,
          height: this.height,
          depth: this.depth,
          format: this.format,
          type: this.type,
          dimension: this.dimension,
          mipLevels: this.mipLevels,
          data
        },
        texture: this
      };
      WEBGPUTexture.SerializedTextureCache.set(this.id, cachedTexture);
    }
    return cachedTexture.serialized;
  }
  // TODO: Textures should deserialize to a global entry similar to gltf, otherwise many MB would be duplicated with each identical copy
  static Deserialize(data) {
    let cachedTexture = WEBGPUTexture.SerializedTextureCache.get(data.id);
    if (cachedTexture) return cachedTexture.texture;
    const texture = new WEBGPUTexture(data.width, data.height, data.depth, data.format, data.type, data.dimension, data.mipLevels);
    texture.name = data.name;
    let imageData = void 0;
    if (data.data instanceof ImageBitmap) imageData = data.data;
    else {
      const uint8 = new TextEncoder().encode(data.data);
      const blob = new Blob([uint8], { type: "image/png" });
      createImageBitmap(blob).then((imageBitmap) => {
        throw Error("Not implemented");
      });
      throw Error("Not implemented");
    }
    try {
      WEBGPURenderer.device.queue.copyExternalImageToTexture(
        { source: imageData, flipY: false },
        { texture: texture.GetBuffer() },
        [data.width, data.height]
      );
    } catch (error) {
      console.warn(error);
    }
    cachedTexture = { serialized: data, texture };
    WEBGPUTexture.SerializedTextureCache.set(data.id, cachedTexture);
    return texture;
  }
  static SerializedTextureCache = /* @__PURE__ */ new Map();
}

class BoundingVolume {
  min;
  max;
  center;
  radius;
  scale;
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), center = new Vector3(), radius = 0, scale = 1) {
    this.min = min;
    this.max = max;
    this.center = center;
    this.radius = radius;
    this.scale = scale;
  }
  static FromVertices(vertices) {
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    for (let i = 0; i < vertices.length; i += 3) {
      maxX = Math.max(maxX, vertices[i]);
      minX = Math.min(minX, vertices[i]);
      maxY = Math.max(maxY, vertices[i + 1]);
      minY = Math.min(minY, vertices[i + 1]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
      minZ = Math.min(minZ, vertices[i + 2]);
    }
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;
    const centerZ = minZ + (maxZ - minZ) / 2;
    const newCenter = new Vector3(centerX, centerY, centerZ);
    const halfWidth = (maxX - minX) / 2;
    const halfHeight = (maxY - minY) / 2;
    const halfDepth = (maxZ - minZ) / 2;
    const newRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight + halfDepth * halfDepth);
    return new BoundingVolume(
      new Vector3(minX, minY, minZ),
      new Vector3(maxX, maxY, maxZ),
      newCenter,
      newRadius
    );
  }
  copy(boundingVolume) {
    this.min.copy(boundingVolume.min);
    this.max.copy(boundingVolume.max);
    this.center.copy(boundingVolume.center);
    this.radius = boundingVolume.radius;
    this.scale = boundingVolume.scale;
    return this;
  }
}

class Vector4 {
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
    this._x = x;
    this._y = y;
    this._z = z;
    this._w = w;
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
    return new Vector4(this.x, this.y, this.z, this.w);
  }
  copy(v) {
    return this.set(v.x, v.y, v.z, v.w);
  }
  mul(v) {
    if (v instanceof Vector4) this.x *= v.x, this.y *= v.y, this.z *= v.z, this.w *= v.w;
    else this.x *= v, this.y *= v, this.z *= v, this.w *= v;
    return this;
  }
  div(v) {
    if (v instanceof Vector4) this.x /= v.x, this.y /= v.y, this.z /= v.z, this.w /= v.w;
    else this.x /= v, this.y /= v, this.z /= v, this.w /= v;
    return this;
  }
  add(v) {
    if (v instanceof Vector4) this.x += v.x, this.y += v.y, this.z += v.z, this.w += v.w;
    else this.x += v, this.y += v, this.z += v, this.w += v;
    return this;
  }
  sub(v) {
    if (v instanceof Vector4) this.x -= v.x, this.y -= v.y, this.z -= v.z, this.w -= v.w;
    else this.x -= v, this.y -= v, this.z -= v, this.w -= v;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
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
}

class Sphere {
  center;
  radius;
  constructor(center = new Vector3(0, 0, 0), radius = 0) {
    this.center = center;
    this.radius = radius;
  }
  static fromAABB(minBounds, maxBounds) {
    const center = maxBounds.clone().add(minBounds).mul(0.5);
    const radius = maxBounds.distanceTo(minBounds) * 0.5;
    return new Sphere(center, radius);
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
    return Sphere.fromAABB(min, max);
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
  applyMatrix4(matrix) {
    this.center.applyMatrix4(matrix);
    this.radius = this.radius * matrix.getMaxScaleOnAxis();
    return this;
  }
  clone() {
    return new Sphere(this.center.clone(), this.radius);
  }
}

class Plane {
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
  distanceToPoint(point) {
    return this.normal.dot(point) + this.constant;
  }
}

class Frustum {
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
  intersectsBoundingVolume(boundingVolume) {
    const planes = this.planes;
    const center = boundingVolume.center;
    const negRadius = -boundingVolume.radius * boundingVolume.scale;
    for (let i = 0; i < 6; i++) {
      const distance = planes[i].distanceToPoint(center);
      if (distance < negRadius) return false;
    }
    return true;
  }
}

class Color {
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
    return new Color(v.x, v.y, v.z, v instanceof Vector4 ? v.w : 0);
  }
  static fromHex(hex) {
    return new Color((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255);
  }
  mul(v) {
    if (v instanceof Color) this.r *= v.r, this.g *= v.g, this.b *= v.b;
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
  setFromHex(hex) {
    if (hex.length !== 6 && hex.length !== 8 && !hex.startsWith("#")) {
      throw new Error("Invalid hex color format. Expected #RRGGBB or #RRGGBBAA");
    }
    hex = hex.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    this.set(r, g, b, a);
    return this;
  }
  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }
  copy(color) {
    this.set(color.r, color.g, color.b, color.a);
    return this;
  }
  Serialize() {
    return { type: "@trident/core/math/Color", r: this.r, g: this.g, b: this.b, a: this.a };
  }
  Deserialize(data) {
    this.set(data.r, data.g, data.b, data.a);
    return this;
  }
}

const Lerp = (a, b, f) => a * (1 - f) + b * f;
const Clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const RandomRange = (min, max) => Math.random() * (max - min) + min;
const Round = Math.round;
const Sqrt = Math.sqrt;
const Atan2 = Math.atan2;
const Floor = Math.floor;
const Max = Math.max;
const Min = Math.min;
const Sin = Math.sin;
const Cos = Math.cos;
const Tan = Math.tan;
const Epsilon = 1e-5;
const Deg2Rad = Math.PI / 180;
const Rad2Deg = 180 / Math.PI;

var index$2 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Atan2: Atan2,
    BoundingVolume: BoundingVolume,
    Clamp: Clamp,
    Color: Color,
    Cos: Cos,
    Deg2Rad: Deg2Rad,
    Epsilon: Epsilon,
    Floor: Floor,
    Frustum: Frustum,
    Lerp: Lerp,
    Matrix4: Matrix4,
    Max: Max,
    Min: Min,
    Plane: Plane,
    Quaternion: Quaternion,
    Rad2Deg: Rad2Deg,
    RandomRange: RandomRange,
    Round: Round,
    Sin: Sin,
    Sphere: Sphere,
    Sqrt: Sqrt,
    Tan: Tan,
    Vector2: Vector2,
    Vector3: Vector3,
    Vector4: Vector4
});

class GeometryAttribute {
  type = "@trident/core/Geometry/GeometryAttribute";
  array;
  buffer;
  currentOffset;
  // This can be used 
  currentSize;
  count;
  constructor(array, type) {
    if (array.length === 0) throw Error("GeometryAttribute data is empty");
    let bufferArray = array;
    let bufferSize = array.byteLength;
    if (bufferSize % 4 !== 0) {
      bufferSize = Math.ceil(bufferSize / 4) * 4;
      if (array instanceof Uint16Array) {
        const paddedLength = bufferSize / Uint16Array.BYTES_PER_ELEMENT;
        const paddedArray = new Uint16Array(paddedLength);
        paddedArray.set(array);
        bufferArray = paddedArray;
      } else if (array instanceof Uint8Array) {
        const paddedLength = bufferSize / Uint8Array.BYTES_PER_ELEMENT;
        const paddedArray = new Uint8Array(paddedLength);
        paddedArray.set(array);
        bufferArray = paddedArray;
      }
    }
    this.array = array;
    this.buffer = Buffer.Create(bufferSize, type);
    this.buffer.SetArray(bufferArray);
    this.currentOffset = 0;
    this.currentSize = array.byteLength;
    this.count = array.length;
  }
  GetBuffer() {
    return this.buffer;
  }
  Destroy() {
    this.buffer.Destroy();
  }
  Serialize() {
    let arrayType = "float32";
    if (this.array instanceof Uint32Array) arrayType = "uint32";
    else if (this.array instanceof Uint16Array) arrayType = "uint16";
    else if (this.array instanceof Uint8Array) arrayType = "uint8";
    return {
      attributeType: this.type,
      array: Array.from(this.array),
      arrayType,
      currentOffset: this.currentOffset,
      currentSize: this.currentSize
    };
  }
}
class VertexAttribute extends GeometryAttribute {
  type = "@trident/core/Geometry/VertexAttribute";
  constructor(array) {
    super(array, BufferType.VERTEX);
  }
  static Deserialize(data) {
    let array = void 0;
    if (data.arrayType === "float32") array = new Float32Array(data.array);
    else if (data.arrayType === "uint32") array = new Uint32Array(data.array);
    else if (data.arrayType === "uint16") array = new Uint16Array(data.array);
    else if (data.arrayType === "uint8") array = new Uint8Array(data.array);
    if (array === void 0) throw Error(`Cannot deserialize VertexAttribute, invalid array type "${data.arrayType}"`);
    const vertexAttribute = new VertexAttribute(array);
    vertexAttribute.currentOffset = data.currentOffset;
    vertexAttribute.currentSize = data.currentSize;
    return vertexAttribute;
  }
}
class InterleavedVertexAttribute extends GeometryAttribute {
  constructor(array, stride) {
    super(array, BufferType.VERTEX);
    this.array = array;
    this.stride = stride;
  }
  type = "@trident/core/Geometry/InterleavedVertexAttribute";
  static fromArrays(attributes, inputStrides, outputStrides) {
    function stridedCopy(target, values, offset2, inputStride, outputStride, interleavedStride2) {
      let writeIndex = offset2;
      for (let i = 0; i < values.length; i += inputStride) {
        for (let j = 0; j < inputStride && i + j < values.length; j++) {
          target[writeIndex + j] = values[i + j];
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
    for (let i = 0; i < attributes.length; i++) {
      totalLength += attributes[i].length / inputStrides[i] * outputStrides[i];
    }
    const interleavedArray = new Float32Array(totalLength);
    let offset = 0;
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i];
      const inputStride = inputStrides[i];
      const outputStride = outputStrides[i];
      stridedCopy(interleavedArray, attribute, offset, inputStride, outputStride, interleavedStride);
      offset += outputStride;
    }
    return new InterleavedVertexAttribute(interleavedArray, interleavedStride);
  }
  static Deserialize(data) {
    const array = new Float32Array(data.array);
    const interleavedVertexAttribute = new InterleavedVertexAttribute(array, data.stride);
    interleavedVertexAttribute.currentOffset = data.currentOffset;
    interleavedVertexAttribute.currentSize = data.currentSize;
    return interleavedVertexAttribute;
  }
}
class IndexAttribute extends GeometryAttribute {
  type = "@trident/core/Geometry/IndexAttribute";
  format;
  constructor(array) {
    super(array, BufferType.INDEX);
    this.format = array instanceof Uint32Array ? "uint32" : "uint16";
  }
  static Deserialize(data) {
    let array = void 0;
    if (data.arrayType === "uint32") array = new Uint32Array(data.array);
    else if (data.arrayType === "uint16") array = new Uint16Array(data.array);
    if (array === void 0) throw Error(`Cannot deserialize VertexAttribute, invalid array type "${data.arrayType}"`);
    const indexAttribute = new IndexAttribute(array);
    indexAttribute.currentOffset = data.currentOffset;
    indexAttribute.currentSize = data.currentSize;
    return indexAttribute;
  }
}
class Geometry {
  id = UUID();
  name = "";
  index;
  attributes = /* @__PURE__ */ new Map();
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
    const clone = new Geometry();
    for (const attribute of this.attributes) {
      clone.attributes.set(attribute[0], attribute[1]);
    }
    if (this.index) {
      clone.index = new IndexAttribute(this.index.array);
    }
    return clone;
  }
  ApplyOperationToVertices(operation, vec) {
    let verts = this.attributes.get("position");
    if (!verts) throw Error("No verts");
    if (verts instanceof InterleavedVertexAttribute) throw Error("InterleavedVertexAttribute not implemented.");
    this.boundingVolume.center;
    let vertsCentered = new Float32Array(verts.array.length);
    for (let i = 0; i < verts.array.length; i += 3) {
      if (operation === "+") {
        vertsCentered[i + 0] = verts.array[i + 0] + vec.x;
        vertsCentered[i + 1] = verts.array[i + 1] + vec.y;
        vertsCentered[i + 2] = verts.array[i + 2] + vec.z;
      } else if (operation === "*") {
        vertsCentered[i + 0] = verts.array[i + 0] * vec.x;
        vertsCentered[i + 1] = verts.array[i + 1] * vec.y;
        vertsCentered[i + 2] = verts.array[i + 2] * vec.z;
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
  // From THREE.js (adapted/fixed)
  ComputeTangents() {
    const index = this.index;
    const positionAttribute = this.attributes.get("position");
    const normalAttribute = this.attributes.get("normal");
    const uvAttribute = this.attributes.get("uv");
    if (!index || !positionAttribute || !normalAttribute || !uvAttribute) {
      console.error("computeTangents() failed. Missing required attributes (index, position, normal or uv)");
      return;
    }
    const pos = positionAttribute.array;
    const nor = normalAttribute.array;
    const uvs = uvAttribute.array;
    const ia = index.array;
    const vertexCount = pos.length / 3;
    let tangentAttribute = this.attributes.get("tangent");
    if (!tangentAttribute || tangentAttribute.array.length !== 4 * vertexCount) {
      tangentAttribute = new VertexAttribute(new Float32Array(4 * vertexCount));
      this.attributes.set("tangent", tangentAttribute);
    } else {
      tangentAttribute.array.fill(0);
    }
    const tang = tangentAttribute.array;
    const tan1 = new Array(vertexCount);
    const tan2 = new Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      tan1[i] = new Vector3();
      tan2[i] = new Vector3();
    }
    const vA = new Vector3(), vB = new Vector3(), vC = new Vector3();
    const uvA = new Vector2(), uvB = new Vector2(), uvC = new Vector2();
    const sdir = new Vector3(), tdir = new Vector3();
    function handleTriangle(a, b, c) {
      vA.set(pos[a * 3 + 0], pos[a * 3 + 1], pos[a * 3 + 2]);
      vB.set(pos[b * 3 + 0], pos[b * 3 + 1], pos[b * 3 + 2]);
      vC.set(pos[c * 3 + 0], pos[c * 3 + 1], pos[c * 3 + 2]);
      uvA.set(uvs[a * 2 + 0], uvs[a * 2 + 1]);
      uvB.set(uvs[b * 2 + 0], uvs[b * 2 + 1]);
      uvC.set(uvs[c * 2 + 0], uvs[c * 2 + 1]);
      vB.sub(vA);
      vC.sub(vA);
      uvB.sub(uvA);
      uvC.sub(uvA);
      const denom = uvB.x * uvC.y - uvC.x * uvB.y;
      if (!isFinite(denom) || Math.abs(denom) < 1e-8) return;
      const r = 1 / denom;
      sdir.copy(vB).mul(uvC.y).add(vC.clone().mul(-uvB.y)).mul(r);
      tdir.copy(vC).mul(uvB.x).add(vB.clone().mul(-uvC.x)).mul(r);
      tan1[a].add(sdir);
      tan1[b].add(sdir);
      tan1[c].add(sdir);
      tan2[a].add(tdir);
      tan2[b].add(tdir);
      tan2[c].add(tdir);
    }
    for (let j = 0; j < ia.length; j += 3) {
      handleTriangle(ia[j + 0], ia[j + 1], ia[j + 2]);
    }
    const tmp = new Vector3();
    const n = new Vector3();
    const n2 = new Vector3();
    const ccv = new Vector3();
    function handleVertex(v) {
      n.set(nor[v * 3 + 0], nor[v * 3 + 1], nor[v * 3 + 2]);
      n2.copy(n);
      const t = tan1[v];
      tmp.copy(t);
      const ndott = n.dot(t);
      tmp.sub(n.clone().mul(ndott));
      if (!isFinite(tmp.x) || !isFinite(tmp.y) || !isFinite(tmp.z) || tmp.lengthSq() === 0) {
        const ortho = Math.abs(n.x) > 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
        tmp.copy(ortho.cross(n));
      }
      tmp.normalize();
      ccv.copy(n2).cross(t);
      const w = ccv.dot(tan2[v]) < 0 ? -1 : 1;
      tang[v * 4 + 0] = tmp.x;
      tang[v * 4 + 1] = tmp.y;
      tang[v * 4 + 2] = tmp.z;
      tang[v * 4 + 3] = w;
    }
    for (let j = 0; j < ia.length; j += 3) {
      handleVertex(ia[j + 0]);
      handleVertex(ia[j + 1]);
      handleVertex(ia[j + 2]);
    }
    this.attributes.set("tangent", new VertexAttribute(tang));
  }
  Destroy() {
    for (const [_, attribute] of this.attributes) attribute.Destroy();
    if (this.index) this.index.Destroy();
  }
  static ToNonIndexed(vertices, indices) {
    const itemSize = 3;
    const array2 = new Float32Array(indices.length * itemSize);
    let index = 0, index2 = 0;
    for (let i = 0, l = indices.length; i < l; i++) {
      index = indices[i] * itemSize;
      for (let j = 0; j < itemSize; j++) {
        array2[index2++] = vertices[index++];
      }
    }
    return array2;
  }
  static Cube() {
    const vertices = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5]);
    const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0]);
    const normals = new Float32Array([1, 0, 0, 1, 0, -0, 1, 0, -0, 1, 0, -0, -1, 0, 0, -1, 0, -0, -1, 0, -0, -1, 0, -0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, -0, -1, 0, -0, -1, 0, -0, -1, 0, 0, -0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
    const indices = new Uint32Array([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22, 21, 22, 23, 21]);
    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.attributes.set("normal", new VertexAttribute(normals));
    geometry.index = new IndexAttribute(indices);
    return geometry;
  }
  static Plane() {
    const vertices = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]);
    const indices = new Uint32Array([0, 1, 2, 2, 3, 0]);
    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("normal", new VertexAttribute(normals));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.index = new IndexAttribute(indices);
    return geometry;
  }
  static Sphere() {
    const vertices = new Float32Array([0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, -0.19, 0.46, 0, -0.18, 0.46, 0.07, -0.14, 0.46, 0.14, -0.07, 0.46, 0.18, 0, 0.46, 0.19, 0.07, 0.46, 0.18, 0.14, 0.46, 0.14, 0.18, 0.46, 0.07, 0.19, 0.46, 0, 0.18, 0.46, -0.07, 0.14, 0.46, -0.14, 0.07, 0.46, -0.18, 0, 0.46, -0.19, -0.07, 0.46, -0.18, -0.14, 0.46, -0.14, -0.18, 0.46, -0.07, -0.19, 0.46, 0, -0.35, 0.35, 0, -0.33, 0.35, 0.14, -0.25, 0.35, 0.25, -0.14, 0.35, 0.33, 0, 0.35, 0.35, 0.14, 0.35, 0.33, 0.25, 0.35, 0.25, 0.33, 0.35, 0.14, 0.35, 0.35, 0, 0.33, 0.35, -0.14, 0.25, 0.35, -0.25, 0.14, 0.35, -0.33, 0, 0.35, -0.35, -0.14, 0.35, -0.33, -0.25, 0.35, -0.25, -0.33, 0.35, -0.14, -0.35, 0.35, 0, -0.46, 0.19, 0, -0.43, 0.19, 0.18, -0.33, 0.19, 0.33, -0.18, 0.19, 0.43, 0, 0.19, 0.46, 0.18, 0.19, 0.43, 0.33, 0.19, 0.33, 0.43, 0.19, 0.18, 0.46, 0.19, 0, 0.43, 0.19, -0.18, 0.33, 0.19, -0.33, 0.18, 0.19, -0.43, 0, 0.19, -0.46, -0.18, 0.19, -0.43, -0.33, 0.19, -0.33, -0.43, 0.19, -0.18, -0.46, 0.19, 0, -0.5, 0, 0, -0.46, 0, 0.19, -0.35, 0, 0.35, -0.19, 0, 0.46, 0, 0, 0.5, 0.19, 0, 0.46, 0.35, 0, 0.35, 0.46, 0, 0.19, 0.5, 0, 0, 0.46, 0, -0.19, 0.35, 0, -0.35, 0.19, 0, -0.46, 0, 0, -0.5, -0.19, 0, -0.46, -0.35, 0, -0.35, -0.46, 0, -0.19, -0.5, 0, 0, -0.46, -0.19, 0, -0.43, -0.19, 0.18, -0.33, -0.19, 0.33, -0.18, -0.19, 0.43, 0, -0.19, 0.46, 0.18, -0.19, 0.43, 0.33, -0.19, 0.33, 0.43, -0.19, 0.18, 0.46, -0.19, 0, 0.43, -0.19, -0.18, 0.33, -0.19, -0.33, 0.18, -0.19, -0.43, 0, -0.19, -0.46, -0.18, -0.19, -0.43, -0.33, -0.19, -0.33, -0.43, -0.19, -0.18, -0.46, -0.19, 0, -0.35, -0.35, 0, -0.33, -0.35, 0.14, -0.25, -0.35, 0.25, -0.14, -0.35, 0.33, 0, -0.35, 0.35, 0.14, -0.35, 0.33, 0.25, -0.35, 0.25, 0.33, -0.35, 0.14, 0.35, -0.35, 0, 0.33, -0.35, -0.14, 0.25, -0.35, -0.25, 0.14, -0.35, -0.33, 0, -0.35, -0.35, -0.14, -0.35, -0.33, -0.25, -0.35, -0.25, -0.33, -0.35, -0.14, -0.35, -0.35, 0, -0.19, -0.46, 0, -0.18, -0.46, 0.07, -0.14, -0.46, 0.14, -0.07, -0.46, 0.18, 0, -0.46, 0.19, 0.07, -0.46, 0.18, 0.14, -0.46, 0.14, 0.18, -0.46, 0.07, 0.19, -0.46, 0, 0.18, -0.46, -0.07, 0.14, -0.46, -0.14, 0.07, -0.46, -0.18, 0, -0.46, -0.19, -0.07, -0.46, -0.18, -0.14, -0.46, -0.14, -0.18, -0.46, -0.07, -0.19, -0.46, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0]);
    const normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -0.38, 0.92, 0, -0.35, 0.92, 0.15, -0.27, 0.92, 0.27, -0.15, 0.92, 0.35, 0, 0.92, 0.38, 0.15, 0.92, 0.35, 0.27, 0.92, 0.27, 0.35, 0.92, 0.15, 0.38, 0.92, 0, 0.35, 0.92, -0.15, 0.27, 0.92, -0.27, 0.15, 0.92, -0.35, 0, 0.92, -0.38, -0.15, 0.92, -0.35, -0.27, 0.92, -0.27, -0.35, 0.92, -0.15, -0.38, 0.92, 0, -0.71, 0.71, 0, -0.65, 0.71, 0.27, -0.5, 0.71, 0.5, -0.27, 0.71, 0.65, 0, 0.71, 0.71, 0.27, 0.71, 0.65, 0.5, 0.71, 0.5, 0.65, 0.71, 0.27, 0.71, 0.71, 0, 0.65, 0.71, -0.27, 0.5, 0.71, -0.5, 0.27, 0.71, -0.65, 0, 0.71, -0.71, -0.27, 0.71, -0.65, -0.5, 0.71, -0.5, -0.65, 0.71, -0.27, -0.71, 0.71, 0, -0.92, 0.38, 0, -0.85, 0.38, 0.35, -0.65, 0.38, 0.65, -0.35, 0.38, 0.85, 0, 0.38, 0.92, 0.35, 0.38, 0.85, 0.65, 0.38, 0.65, 0.85, 0.38, 0.35, 0.92, 0.38, 0, 0.85, 0.38, -0.35, 0.65, 0.38, -0.65, 0.35, 0.38, -0.85, 0, 0.38, -0.92, -0.35, 0.38, -0.85, -0.65, 0.38, -0.65, -0.85, 0.38, -0.35, -0.92, 0.38, 0, -1, 0, 0, -0.92, 0, 0.38, -0.71, 0, 0.71, -0.38, 0, 0.92, 0, 0, 1, 0.38, 0, 0.92, 0.71, 0, 0.71, 0.92, 0, 0.38, 1, 0, 0, 0.92, 0, -0.38, 0.71, 0, -0.71, 0.38, 0, -0.92, 0, 0, -1, -0.38, 0, -0.92, -0.71, 0, -0.71, -0.92, 0, -0.38, -1, 0, 0, -0.92, -0.38, 0, -0.85, -0.38, 0.35, -0.65, -0.38, 0.65, -0.35, -0.38, 0.85, 0, -0.38, 0.92, 0.35, -0.38, 0.85, 0.65, -0.38, 0.65, 0.85, -0.38, 0.35, 0.92, -0.38, 0, 0.85, -0.38, -0.35, 0.65, -0.38, -0.65, 0.35, -0.38, -0.85, 0, -0.38, -0.92, -0.35, -0.38, -0.85, -0.65, -0.38, -0.65, -0.85, -0.38, -0.35, -0.92, -0.38, 0, -0.71, -0.71, 0, -0.65, -0.71, 0.27, -0.5, -0.71, 0.5, -0.27, -0.71, 0.65, 0, -0.71, 0.71, 0.27, -0.71, 0.65, 0.5, -0.71, 0.5, 0.65, -0.71, 0.27, 0.71, -0.71, 0, 0.65, -0.71, -0.27, 0.5, -0.71, -0.5, 0.27, -0.71, -0.65, 0, -0.71, -0.71, -0.27, -0.71, -0.65, -0.5, -0.71, -0.5, -0.65, -0.71, -0.27, -0.71, -0.71, 0, -0.38, -0.92, 0, -0.35, -0.92, 0.15, -0.27, -0.92, 0.27, -0.15, -0.92, 0.35, 0, -0.92, 0.38, 0.15, -0.92, 0.35, 0.27, -0.92, 0.27, 0.35, -0.92, 0.15, 0.38, -0.92, 0, 0.35, -0.92, -0.15, 0.27, -0.92, -0.27, 0.15, -0.92, -0.35, 0, -0.92, -0.38, -0.15, -0.92, -0.35, -0.27, -0.92, -0.27, -0.35, -0.92, -0.15, -0.38, -0.92, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0]);
    const uvs = new Float32Array([0.03, 1, 0.09, 1, 0.16, 1, 0.22, 1, 0.28, 1, 0.34, 1, 0.41, 1, 0.47, 1, 0.53, 1, 0.59, 1, 0.66, 1, 0.72, 1, 0.78, 1, 0.84, 1, 0.91, 1, 0.97, 1, 1.03, 1, 0, 0.88, 0.06, 0.88, 0.13, 0.88, 0.19, 0.88, 0.25, 0.88, 0.31, 0.88, 0.38, 0.88, 0.44, 0.88, 0.5, 0.88, 0.56, 0.88, 0.63, 0.88, 0.69, 0.88, 0.75, 0.88, 0.81, 0.88, 0.88, 0.88, 0.94, 0.88, 1, 0.88, 0, 0.75, 0.06, 0.75, 0.13, 0.75, 0.19, 0.75, 0.25, 0.75, 0.31, 0.75, 0.38, 0.75, 0.44, 0.75, 0.5, 0.75, 0.56, 0.75, 0.63, 0.75, 0.69, 0.75, 0.75, 0.75, 0.81, 0.75, 0.88, 0.75, 0.94, 0.75, 1, 0.75, 0, 0.63, 0.06, 0.63, 0.13, 0.63, 0.19, 0.63, 0.25, 0.63, 0.31, 0.63, 0.38, 0.63, 0.44, 0.63, 0.5, 0.63, 0.56, 0.63, 0.63, 0.63, 0.69, 0.63, 0.75, 0.63, 0.81, 0.63, 0.88, 0.63, 0.94, 0.63, 1, 0.63, 0, 0.5, 0.06, 0.5, 0.13, 0.5, 0.19, 0.5, 0.25, 0.5, 0.31, 0.5, 0.38, 0.5, 0.44, 0.5, 0.5, 0.5, 0.56, 0.5, 0.63, 0.5, 0.69, 0.5, 0.75, 0.5, 0.81, 0.5, 0.88, 0.5, 0.94, 0.5, 1, 0.5, 0, 0.38, 0.06, 0.38, 0.13, 0.38, 0.19, 0.38, 0.25, 0.38, 0.31, 0.38, 0.38, 0.38, 0.44, 0.38, 0.5, 0.38, 0.56, 0.38, 0.63, 0.38, 0.69, 0.38, 0.75, 0.38, 0.81, 0.38, 0.88, 0.38, 0.94, 0.38, 1, 0.38, 0, 0.25, 0.06, 0.25, 0.13, 0.25, 0.19, 0.25, 0.25, 0.25, 0.31, 0.25, 0.38, 0.25, 0.44, 0.25, 0.5, 0.25, 0.56, 0.25, 0.63, 0.25, 0.69, 0.25, 0.75, 0.25, 0.81, 0.25, 0.88, 0.25, 0.94, 0.25, 1, 0.25, 0, 0.13, 0.06, 0.13, 0.13, 0.13, 0.19, 0.13, 0.25, 0.13, 0.31, 0.13, 0.38, 0.13, 0.44, 0.13, 0.5, 0.13, 0.56, 0.13, 0.63, 0.13, 0.69, 0.13, 0.75, 0.13, 0.81, 0.13, 0.88, 0.13, 0.94, 0.13, 1, 0.13, -0.03, 0, 0.03, 0, 0.09, 0, 0.16, 0, 0.22, 0, 0.28, 0, 0.34, 0, 0.41, 0, 0.47, 0, 0.53, 0, 0.59, 0, 0.66, 0, 0.72, 0, 0.78, 0, 0.84, 0, 0.91, 0, 0.97, 0]);
    const indices = new Uint32Array([0, 17, 18, 1, 18, 19, 2, 19, 20, 3, 20, 21, 4, 21, 22, 5, 22, 23, 6, 23, 24, 7, 24, 25, 8, 25, 26, 9, 26, 27, 10, 27, 28, 11, 28, 29, 12, 29, 30, 13, 30, 31, 14, 31, 32, 15, 32, 33, 18, 17, 35, 17, 34, 35, 19, 18, 36, 18, 35, 36, 20, 19, 37, 19, 36, 37, 21, 20, 38, 20, 37, 38, 22, 21, 39, 21, 38, 39, 23, 22, 40, 22, 39, 40, 24, 23, 41, 23, 40, 41, 25, 24, 42, 24, 41, 42, 26, 25, 43, 25, 42, 43, 27, 26, 44, 26, 43, 44, 28, 27, 45, 27, 44, 45, 29, 28, 46, 28, 45, 46, 30, 29, 47, 29, 46, 47, 31, 30, 48, 30, 47, 48, 32, 31, 49, 31, 48, 49, 33, 32, 50, 32, 49, 50, 35, 34, 52, 34, 51, 52, 36, 35, 53, 35, 52, 53, 37, 36, 54, 36, 53, 54, 38, 37, 55, 37, 54, 55, 39, 38, 56, 38, 55, 56, 40, 39, 57, 39, 56, 57, 41, 40, 58, 40, 57, 58, 42, 41, 59, 41, 58, 59, 43, 42, 60, 42, 59, 60, 44, 43, 61, 43, 60, 61, 45, 44, 62, 44, 61, 62, 46, 45, 63, 45, 62, 63, 47, 46, 64, 46, 63, 64, 48, 47, 65, 47, 64, 65, 49, 48, 66, 48, 65, 66, 50, 49, 67, 49, 66, 67, 52, 51, 69, 51, 68, 69, 53, 52, 70, 52, 69, 70, 54, 53, 71, 53, 70, 71, 55, 54, 72, 54, 71, 72, 56, 55, 73, 55, 72, 73, 57, 56, 74, 56, 73, 74, 58, 57, 75, 57, 74, 75, 59, 58, 76, 58, 75, 76, 60, 59, 77, 59, 76, 77, 61, 60, 78, 60, 77, 78, 62, 61, 79, 61, 78, 79, 63, 62, 80, 62, 79, 80, 64, 63, 81, 63, 80, 81, 65, 64, 82, 64, 81, 82, 66, 65, 83, 65, 82, 83, 67, 66, 84, 66, 83, 84, 69, 68, 86, 68, 85, 86, 70, 69, 87, 69, 86, 87, 71, 70, 88, 70, 87, 88, 72, 71, 89, 71, 88, 89, 73, 72, 90, 72, 89, 90, 74, 73, 91, 73, 90, 91, 75, 74, 92, 74, 91, 92, 76, 75, 93, 75, 92, 93, 77, 76, 94, 76, 93, 94, 78, 77, 95, 77, 94, 95, 79, 78, 96, 78, 95, 96, 80, 79, 97, 79, 96, 97, 81, 80, 98, 80, 97, 98, 82, 81, 99, 81, 98, 99, 83, 82, 100, 82, 99, 100, 84, 83, 101, 83, 100, 101, 86, 85, 103, 85, 102, 103, 87, 86, 104, 86, 103, 104, 88, 87, 105, 87, 104, 105, 89, 88, 106, 88, 105, 106, 90, 89, 107, 89, 106, 107, 91, 90, 108, 90, 107, 108, 92, 91, 109, 91, 108, 109, 93, 92, 110, 92, 109, 110, 94, 93, 111, 93, 110, 111, 95, 94, 112, 94, 111, 112, 96, 95, 113, 95, 112, 113, 97, 96, 114, 96, 113, 114, 98, 97, 115, 97, 114, 115, 99, 98, 116, 98, 115, 116, 100, 99, 117, 99, 116, 117, 101, 100, 118, 100, 117, 118, 103, 102, 120, 102, 119, 120, 104, 103, 121, 103, 120, 121, 105, 104, 122, 104, 121, 122, 106, 105, 123, 105, 122, 123, 107, 106, 124, 106, 123, 124, 108, 107, 125, 107, 124, 125, 109, 108, 126, 108, 125, 126, 110, 109, 127, 109, 126, 127, 111, 110, 128, 110, 127, 128, 112, 111, 129, 111, 128, 129, 113, 112, 130, 112, 129, 130, 114, 113, 131, 113, 130, 131, 115, 114, 132, 114, 131, 132, 116, 115, 133, 115, 132, 133, 117, 116, 134, 116, 133, 134, 118, 117, 135, 117, 134, 135, 120, 119, 137, 121, 120, 138, 122, 121, 139, 123, 122, 140, 124, 123, 141, 125, 124, 142, 126, 125, 143, 127, 126, 144, 128, 127, 145, 129, 128, 146, 130, 129, 147, 131, 130, 148, 132, 131, 149, 133, 132, 150, 134, 133, 151, 135, 134, 152]);
    const geometry = new Geometry();
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
    return geometry;
  }
  static Cone() {
    const vertices = new Float32Array([0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 0, 0.5, 0, -1, -0.5, 0.71, -0.71, -0.5, 1, 0, -0.5, 0.71, 0.71, -0.5, 0, 1, -0.5, -0.71, 0.71, -0.5, -1, 0, -0.5, -0.71, -0.71, -0.5, 0, -1, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, 0, -0.5, 0, -1, -0.5, 0.71, -0.71, -0.5, 1, 0, -0.5, 0.71, 0.71, -0.5, 0, 1, -0.5, -0.71, 0.71, -0.5, -1, 0, -0.5, -0.71, -0.71, -0.5, 0, -1, -0.5]);
    const normals = new Float32Array([0, -0.71, 0.71, 0.5, -0.5, 0.71, 0.71, 0, 0.71, 0.5, 0.5, 0.71, 0, 0.71, 0.71, -0.5, 0.5, 0.71, -0.71, 0, 0.71, -0.5, -0.5, 0.71, 0, -0.71, 0.71, 0, -0.71, 0.71, 0.5, -0.5, 0.71, 0.71, 0, 0.71, 0.5, 0.5, 0.71, 0, 0.71, 0.71, -0.5, 0.5, 0.71, -0.71, 0, 0.71, -0.5, -0.5, 0.71, 0, -0.71, 0.71, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
    const uvs = new Float32Array([0, 1, 0.13, 1, 0.25, 1, 0.38, 1, 0.5, 1, 0.63, 1, 0.75, 1, 0.88, 1, 1, 1, 0, 0, 0.13, 0, 0.25, 0, 0.38, 0, 0.5, 0, 0.63, 0, 0.75, 0, 0.88, 0, 1, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.85, 0.15, 0.5, 0, 0.15, 0.15, 0, 0.5, 0.15, 0.85, 0.5, 1, 0.85, 0.85, 1, 0.5]);
    const indices = new Uint32Array([9, 10, 1, 10, 11, 2, 11, 12, 3, 12, 13, 4, 13, 14, 5, 14, 15, 6, 15, 16, 7, 16, 17, 8, 27, 26, 18, 28, 27, 19, 29, 28, 20, 30, 29, 21, 31, 30, 22, 32, 31, 23, 33, 32, 24, 34, 33, 25]);
    const geometry = new Geometry();
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
    return geometry;
  }
  Serialize(metadata = {}) {
    return {
      id: this.id,
      name: this.name,
      attributes: Array.from(this.attributes, ([key, attribute]) => Object.assign(attribute.Serialize(), { name: key })),
      index: this.index ? this.index.Serialize() : void 0
    };
  }
  Deserialize(data) {
    this.id = data.id;
    this.name = data.name;
    for (const attribute of data.attributes) {
      this.attributes.set(attribute.name, VertexAttribute.Deserialize(attribute));
    }
    if (data.index) {
      this.index = IndexAttribute.Deserialize(data.index);
    }
  }
}

class RendererContext {
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
  static DrawGeometry(geometry, shader, instanceCount, firstInstance) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.DrawGeometry(geometry, shader, instanceCount, firstInstance);
    else throw Error("Unknown render api type.");
  }
  static DrawIndexed(geometry, shader, indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.DrawIndexed(geometry, shader, indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
    else throw Error("Unknown render api type.");
  }
  static Draw(geometry, shader, vertexCount, instanceCount, firstVertex, firstInstance) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.Draw(geometry, shader, vertexCount, instanceCount, firstVertex, firstInstance);
    else throw Error("Unknown render api type.");
  }
  static DrawVertex(shader, vertexCount, instanceCount, firstVertex, firstInstance) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.DrawVertex(shader, vertexCount, instanceCount, firstVertex, firstInstance);
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
}

class WEBGPUTextureSampler {
  id = UUID();
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
}

const defaultSamplerParams = {
  magFilter: "linear",
  minFilter: "linear",
  mipmapFilter: "linear",
  addressModeU: "repeat",
  addressModeV: "repeat",
  compare: void 0,
  maxAnisotropy: 1
};
class TextureSampler {
  params;
  static Create(params) {
    const samplerParams = Object.assign({}, defaultSamplerParams, params);
    if (Renderer.type === "webgpu") return new WEBGPUTextureSampler(samplerParams);
    throw Error("Renderer type invalid");
  }
}

class WEBGPUBlit {
  static blitShader;
  static blitGeometry;
  static async Init(output = Renderer.SwapChainFormat) {
    WEBGPUBlit.blitShader = await Shader.Create({
      code: `
            struct VertexInput {
                @location(0) position : vec2<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) vUv : vec2<f32>,
            };
            
            @group(0) @binding(0) var texture: texture_2d<f32>;
            @group(0) @binding(1) var textureSampler: sampler;
            @group(0) @binding(2) var<storage, read> mip: f32;
            @group(0) @binding(3) var<storage, read> uv_scale: vec2<f32>;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output: VertexOutput;
                output.position = vec4(input.position, 0.0, 1.0);
                output.vUv = input.uv;
                return output;
            }
            
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let uv = input.vUv;
                var color = textureSampleLevel(texture, textureSampler, uv * uv_scale, mip);
            
                return color;
            }
            `,
      colorOutputs: [{ format: output }],
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
  }
  static async Blit(source, destination, width, height, uv_scale) {
    if (!this.blitShader || this.blitShader.params.colorOutputs[0].format !== destination.format) await this.Init(destination.format);
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
}

var TextureType = /* @__PURE__ */ ((TextureType2) => {
  TextureType2[TextureType2["IMAGE"] = 0] = "IMAGE";
  TextureType2[TextureType2["DEPTH"] = 1] = "DEPTH";
  TextureType2[TextureType2["RENDER_TARGET"] = 2] = "RENDER_TARGET";
  TextureType2[TextureType2["RENDER_TARGET_STORAGE"] = 3] = "RENDER_TARGET_STORAGE";
  return TextureType2;
})(TextureType || {});
function CreateTexture(width, height, depth, format, type, dimension, mipLevels) {
  if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, type, dimension, mipLevels);
  throw Error("Renderer type invalid");
}
class Texture {
  id;
  width;
  height;
  depth;
  type;
  dimension;
  format;
  mipLevels;
  name;
  SetName(name) {
  }
  GetName() {
    throw Error("Base class.");
  }
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
  SetData(data, bytesPerRow, rowsPerImage) {
  }
  Serialize(metadata = {}) {
    throw Error("Base class.");
  }
  static Deserialize(data) {
    if (Renderer.type === "webgpu") return WEBGPUTexture.Deserialize(data);
    throw Error("Renderer type invalid");
  }
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 0 /* IMAGE */, "2d", mipLevels);
  }
  static async Load(url, format = Renderer.SwapChainFormat, flipY = false, generateMips = false) {
    const response = await fetch(url);
    const imageBitmap = await createImageBitmap(await response.blob());
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, generateMips);
    throw Error("Renderer type invalid");
  }
  static async LoadImageSource(imageSource, format = Renderer.SwapChainFormat, generateMips = false) {
    const imageBitmap = await createImageBitmap(imageSource);
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, generateMips);
    throw Error("Renderer type invalid");
  }
  static async Blit(source, destination, width, height, uv_scale = new Vector2(1, 1)) {
    if (Renderer.type === "webgpu") return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
    throw Error("Renderer type invalid");
  }
}
class DepthTexture extends Texture {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 1 /* DEPTH */, "2d", mipLevels);
  }
}
class RenderTexture extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 2 /* RENDER_TARGET */, "2d", mipLevels);
  }
}
class RenderTextureStorage3D extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 3 /* RENDER_TARGET_STORAGE */, "3d", mipLevels);
  }
}
class RenderTextureStorage2D extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 3 /* RENDER_TARGET_STORAGE */, "2d", mipLevels);
  }
}
class RenderTextureCube extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 2 /* RENDER_TARGET */, "cube", mipLevels);
  }
}
class TextureArray extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 0 /* IMAGE */, "2d-array", mipLevels);
  }
}
class CubeTexture extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 0 /* IMAGE */, "cube", mipLevels);
  }
}
class DepthTextureArray extends Texture {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 1 /* DEPTH */, "2d-array", mipLevels);
  }
}
class RenderTexture3D extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 2 /* RENDER_TARGET */, "3d", mipLevels);
  }
}

const BindGroupLayoutCache = /* @__PURE__ */ new Map();
const BindGroupCache = /* @__PURE__ */ new Map();
const UniformTypeToWGSL = {
  "uniform": "uniform",
  "storage": "read-only-storage",
  "storage-write": "storage"
};
class WEBGPUBaseShader {
  id = UUID();
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
    this.module = WEBGPURenderer.device.createShaderModule({ code, label: params.name });
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
        if (uniform.buffer.type === TextureType.RENDER_TARGET_STORAGE) {
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
        Renderer.info.bindGroupLayoutsStat += 1;
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
    for (let i = 0; i < bindGroupsInfo.length; i++) {
      const crc = bindGroupsCRC[i];
      const bindGroupInfo = bindGroupsInfo[i];
      const bindGroupLayout = this.bindGroupLayouts[i];
      let bindGroup = BindGroupCache.get(crc);
      if (bindGroup === void 0) {
        bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
        Renderer.info.bindGroupsStat += 1;
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
      let type = BufferType.STORAGE;
      if (uniform.type === "uniform") type = BufferType.UNIFORM;
      uniform.buffer = Buffer.Create(data.byteLength, type);
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
  OnPreRender(geometry) {
    return true;
  }
  Destroy() {
    const crcs = this.BuildBindGroupsCRC();
    for (const crc of crcs) {
      if (BindGroupCache.delete(crc) === true) {
        Renderer.info.bindGroupsStat -= 1;
      }
    }
    for (const bindGroupLayout of this.bindGroupLayouts) {
      for (const [cachedBindGroupLayoutName, cachedBindGroupLayout] of BindGroupLayoutCache) {
        if (bindGroupLayout === cachedBindGroupLayout) {
          if (BindGroupLayoutCache.delete(cachedBindGroupLayoutName) === true) {
            Renderer.info.bindGroupLayoutsStat -= 1;
          }
        }
      }
    }
    Renderer.info.compiledShadersStat -= 1;
  }
}

class WEBGPUComputeShader extends WEBGPUBaseShader {
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
    Renderer.info.compiledShadersStat += 1;
    this.needsUpdate = false;
  }
  Serialize() {
    return {
      code: this.params.code,
      defines: this.params.defines,
      uniforms: this.params.uniforms
    };
  }
}

const pipelineLayoutCache = /* @__PURE__ */ new Map();
const pipelineCache = /* @__PURE__ */ new Map();
const WGSLShaderAttributeFormat = {
  vec2: "float32x2",
  vec3: "float32x3",
  vec4: "float32x4",
  vec2u: "uint32x2",
  vec3u: "uint32x3",
  vec4u: "uint32x4"
};
function blendState(mode) {
  switch (mode) {
    case "opaque":
      return void 0;
    // no blending
    case "alpha":
      return {
        color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
      };
    case "premultiplied":
      return {
        color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" }
      };
    case "add":
      return {
        color: { srcFactor: "one", dstFactor: "one", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one", operation: "add" }
      };
  }
}
class WEBGPUShader extends WEBGPUBaseShader {
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
      pipelineLayout.label = UUID();
      pipelineLayoutCache.set(bindGroupLayoutsCRC, pipelineLayout);
      hasCompiled = true;
    }
    let targets = [];
    for (const output of this.params.colorOutputs) targets.push({
      format: output.format,
      blend: blendState(output.blendMode)
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
    const pipelineDescriptorKey = JSON.stringify(pipelineDescriptor) + this.params.code;
    let pipeline = pipelineCache.get(pipelineDescriptorKey);
    if (!pipeline) {
      pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
      pipelineCache.set(pipelineDescriptorKey, pipeline);
      hasCompiled = true;
    }
    this._pipeline = pipeline;
    if (hasCompiled === true) {
      Renderer.info.compiledShadersStat += 1;
    }
    this.needsUpdate = false;
  }
  GetAttributeSlot(name) {
    return this.attributeMap.get(name)?.location;
  }
  Serialize() {
    return {
      code: this.params.code,
      defines: this.params.defines,
      attributes: this.params.attributes,
      uniforms: Object.entries(this.params.uniforms).map(([key, value]) => {
        return { group: value.group, binding: value.binding, type: value.type };
      }),
      vertexEntrypoint: this.params.vertexEntrypoint,
      fragmentEntrypoint: this.params.fragmentEntrypoint,
      colorOutputs: this.params.colorOutputs,
      depthOutput: this.params.depthOutput,
      depthCompare: this.params.depthCompare,
      depthBiasSlopeScale: this.params.depthBiasSlopeScale,
      depthBiasClamp: this.params.depthBiasClamp,
      depthWriteEnabled: this.params.depthWriteEnabled,
      topology: this.params.topology,
      frontFace: this.params.frontFace,
      cullMode: this.params.cullMode
    };
  }
}

var Topology = /* @__PURE__ */ ((Topology2) => {
  Topology2["Triangles"] = "triangle-list";
  Topology2["Points"] = "point-list";
  Topology2["Lines"] = "line-list";
  return Topology2;
})(Topology || {});
class BaseShader {
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
  Destroy() {
  }
  Serialize(metadata = {}) {
    throw Error("Called deserialize on BaseShader");
  }
}
class Shader extends BaseShader {
  static async Create(params) {
    params.code = await ShaderPreprocessor.ProcessIncludesV2(params.code);
    if (Renderer.type === "webgpu") return new WEBGPUShader(params);
    throw Error("Unknown api");
  }
}
class Compute extends BaseShader {
  /**
   * @example
   * ```js
   * const = await GPU.Compute.Create({
   *     code: `
   *         @compute @workgroup_size(8, 8, 1)
   *         fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
   *         }
   *     `,
   *     computeEntrypoint: "main",
   *     uniforms: {
   *         drawBuffer: {group: 0, binding: 0, type: "storage-write"}
   *     }
   * })
   * ```
   */
  static async Create(params) {
    params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
    if (Renderer.type === "webgpu") return new WEBGPUComputeShader(params);
    throw Error("Unknown api");
  }
}

class WEBGPUTimestampQuery {
  static querySet;
  static resolveBuffer;
  static resultBuffer;
  static isTimestamping = false;
  static links = /* @__PURE__ */ new Map();
  static currentLinkIndex = 0;
  static BeginRenderTimestamp(name) {
    if (this.links.has(name)) return void 0;
    if (!WEBGPURenderer.adapter.features.has("timestamp-query")) return void 0;
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
}

class WEBGPURendererContext {
  static activeRenderPass = null;
  static HasActiveRenderPass() {
    return this.activeRenderPass instanceof GPURenderPassEncoder;
  }
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
  static BindGeometry(shader, geometry) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    shader.Compile();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    Renderer.info.drawCallsStat += 1;
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i = 0; i < shader.bindGroups.length; i++) {
      let dynamicOffsets = [];
      for (const buffer of shader.bindGroupsInfo[i].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsets.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i, shader.bindGroups[i], dynamicOffsets);
    }
    if (!geometry) return;
    if (shader.params.useVertexPulling === void 0 || shader.params.useVertexPulling === false) {
      for (const [name, attribute] of geometry.attributes) {
        const attributeSlot = shader.GetAttributeSlot(name);
        if (attributeSlot === void 0) continue;
        const attributeBuffer = attribute.buffer;
        this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer(), attribute.currentOffset, attribute.currentSize);
        Renderer.info.frameVertexBuffersStat++;
      }
      if (geometry.index) {
        const indexBuffer = geometry.index.buffer;
        this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), geometry.index.format, geometry.index.currentOffset, geometry.index.currentSize);
        Renderer.info.frameIndexBufferStat++;
      }
    }
  }
  static DrawGeometry(geometry, shader, instanceCount = 1, firstInstance = 0) {
    if (!shader.OnPreRender(geometry)) return;
    this.BindGeometry(shader, geometry);
    if (!shader.params.topology || shader.params.topology === Topology.Triangles) {
      if (!geometry.index) {
        const positions = geometry.attributes.get("position");
        const vertexCount = positions.GetBuffer().size / 4 / 4;
        this.activeRenderPass.draw(vertexCount, instanceCount, 0, firstInstance);
      } else {
        const indexCount = geometry.index.count;
        if (shader.params.useVertexPulling === true) {
          this.activeRenderPass.draw(indexCount, instanceCount, 0, firstInstance);
        } else {
          this.activeRenderPass.drawIndexed(indexCount, instanceCount, 0, 0, firstInstance);
        }
      }
    } else if (shader.params.topology === Topology.Lines) {
      const positions = geometry.attributes.get("position");
      this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount, 0, firstInstance);
    }
  }
  static DrawIndexed(geometry, shader, indexCount, instanceCount, firstIndex, baseVertex, firstInstance) {
    this.BindGeometry(shader, geometry);
    this.activeRenderPass.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance);
  }
  static Draw(geometry, shader, vertexCount, instanceCount, firstVertex, firstInstance) {
    this.BindGeometry(shader, geometry);
    this.activeRenderPass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
  }
  static DrawVertex(shader, vertexCount, instanceCount, firstVertex, firstInstance) {
    this.BindGeometry(shader);
    this.activeRenderPass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
  }
  static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset) {
    if (!shader.OnPreRender(geometry)) return;
    this.BindGeometry(shader, geometry);
    if (!geometry.index) {
      this.activeRenderPass.drawIndirect(indirectBuffer.GetBuffer(), indirectOffset);
    } else {
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
}

class BaseBuffer {
  id = UUID();
  buffer;
  size;
  set name(name) {
    this.buffer.label = name;
  }
  get name() {
    return this.buffer.label;
  }
  constructor(sizeInBytes, type) {
    Renderer.info.gpuBufferSizeTotal += sizeInBytes;
    Renderer.info.gpuBufferCount++;
    let usage = void 0;
    if (type == BufferType.STORAGE) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == BufferType.STORAGE_WRITE) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == BufferType.VERTEX) usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
    else if (type == BufferType.INDEX) usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
    else if (type == BufferType.UNIFORM) usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == BufferType.INDIRECT) usage = GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
    else if (type == 10) usage = GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    if (!usage) throw Error("Invalid buffer usage");
    this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage });
    this.size = sizeInBytes;
  }
  GetBuffer() {
    return this.buffer;
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
    if (WEBGPURendererContext.HasActiveRenderPass()) {
      console.warn("Cannot set buffer data while there is an active render pass.");
      return;
    }
    if (WEBGPURenderer.GetActiveCommandEncoder()) {
      console.warn("Cannot set buffer data after a frame has started.");
    }
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
    Renderer.info.gpuBufferSizeTotal += -this.size;
    Renderer.info.gpuBufferCount--;
    this.buffer.destroy();
  }
}
class WEBGPUBuffer extends BaseBuffer {
  constructor(sizeInBytes, type) {
    super(sizeInBytes, type);
  }
}
class WEBGPUDynamicBuffer extends BaseBuffer {
  minBindingSize;
  dynamicOffset = 0;
  constructor(sizeInBytes, type, minBindingSize) {
    super(sizeInBytes, type);
    this.minBindingSize = minBindingSize;
  }
}

var BufferType = /* @__PURE__ */ ((BufferType2) => {
  BufferType2[BufferType2["STORAGE"] = 0] = "STORAGE";
  BufferType2[BufferType2["STORAGE_WRITE"] = 1] = "STORAGE_WRITE";
  BufferType2[BufferType2["UNIFORM"] = 2] = "UNIFORM";
  BufferType2[BufferType2["VERTEX"] = 3] = "VERTEX";
  BufferType2[BufferType2["INDEX"] = 4] = "INDEX";
  BufferType2[BufferType2["INDIRECT"] = 5] = "INDIRECT";
  return BufferType2;
})(BufferType || {});
class Buffer {
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
}
class DynamicBuffer {
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
}

class RenderPass {
  name;
  initialized = false;
  initializing = false;
  drawCommands = [];
  async init(resources) {
  }
  async preFrame(resources) {
  }
  async preRender(resources) {
  }
  async execute(resources) {
  }
}
class ResourcePool {
  resources = {};
  setResource(name, resource) {
    this.resources[name] = resource;
  }
  getResource(name) {
    return this.resources[name];
  }
}
class RenderGraph {
  passes = [];
  resourcePool = new ResourcePool();
  addPass(pass) {
    this.passes.push(pass);
  }
  async init() {
    for (const pass of this.passes) {
      if (pass.initialized === true || pass.initializing === true) continue;
      pass.initializing = true;
      await pass.init(this.resourcePool);
      pass.initialized = true;
    }
  }
  async preFrame() {
    for (const pass of this.passes) if (pass.initialized) await pass.preFrame(this.resourcePool);
  }
  async preRender() {
    for (const pass of this.passes) if (pass.initialized) await pass.preRender(this.resourcePool);
  }
  async execute() {
    for (const pass of this.passes) if (pass.initialized) await pass.execute(this.resourcePool);
  }
}

class WEBGPUComputeContext {
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
    if (!computeShader.OnPreRender()) return;
    computeShader.Compile();
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
}

class ComputeContext {
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
}

var __create$2 = Object.create;
var __defProp$2 = Object.defineProperty;
var __getOwnPropDesc$2 = Object.getOwnPropertyDescriptor;
var __knownSymbol$2 = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError$2 = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __decoratorStart$2 = (base) => [, , , __create$2(base?.[__knownSymbol$2("metadata")] ?? null)];
var __decoratorStrings$2 = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn$2 = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError$2("Function expected") : fn;
var __decoratorContext$2 = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings$2[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError$2("Already initialized") : fns.push(__expectFn$2(fn || null)) });
var __decoratorMetadata$2 = (array, target) => __defNormalProp$2(target, __knownSymbol$2("metadata"), array[3]);
var __runInitializers$2 = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) fns[i].call(self) ;
  return value;
};
var __decorateElement$2 = (array, flags, name, decorators, target, extra) => {
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = 2 , key = __decoratorStrings$2[k + 5];
  var extraInitializers = array[j] || (array[j] = []);
  var desc = ((target = target.prototype), __getOwnPropDesc$2(target , name));
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext$2(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
    }
    it = (0, decorators[i])(desc[key]  , ctx), done._ = 1;
    __expectFn$2(it) && (desc[key] = it );
  }
  return desc && __defProp$2(target, name, desc), target;
};
var __publicField$2 = (obj, key, value) => __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
var _aspect_dec, _fov_dec, _far_dec, _near_dec, _a$2, _init$2;
class CameraEvents {
  static Updated = (camera) => {
  };
}
const _Camera = class _Camera extends (_a$2 = Component, _near_dec = [SerializeField], _far_dec = [SerializeField], _fov_dec = [SerializeField], _aspect_dec = [SerializeField], _a$2) {
  constructor(gameObject) {
    super(gameObject);
    __runInitializers$2(_init$2, 5, this);
    __publicField$2(this, "backgroundColor", new Color(0, 0, 0, 1));
    __publicField$2(this, "projectionMatrix", new Matrix4());
    __publicField$2(this, "projectionScreenMatrix", new Matrix4());
    __publicField$2(this, "projectionViewMatrix", new Matrix4());
    __publicField$2(this, "viewMatrix", new Matrix4());
    __publicField$2(this, "frustum", new Frustum());
    __publicField$2(this, "_near");
    __publicField$2(this, "_far");
    __publicField$2(this, "_fov");
    __publicField$2(this, "_aspect");
    if (!_Camera.mainCamera) _Camera.mainCamera = this;
  }
  get near() {
    return this._near;
  }
  set near(near) {
    this.SetPerspective(this.fov, this.aspect, near, this.far);
  }
  get far() {
    return this._far;
  }
  set far(far) {
    this.SetPerspective(this.fov, this.aspect, this.near, far);
  }
  get fov() {
    return this._fov;
  }
  set fov(fov) {
    this.SetPerspective(fov, this.aspect, this.near, this.far);
  }
  get aspect() {
    return this._aspect;
  }
  set aspect(aspect) {
    this.SetPerspective(this.fov, aspect, this.near, this.far);
  }
  SetPerspective(fov, aspect, near, far) {
    this._fov = fov;
    this._aspect = aspect;
    this._near = near;
    this._far = far;
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
    this.projectionScreenMatrix.multiplyMatrices(this.projectionMatrix, this.transform.worldToLocalMatrix);
    this.frustum.setFromProjectionMatrix(this.projectionScreenMatrix);
    this.projectionViewMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix);
  }
  Serialize() {
    return {
      type: _Camera.type,
      name: this.name,
      id: this.id,
      backgroundColor: this.backgroundColor.Serialize(),
      near: this.near,
      far: this.far,
      fov: this.fov,
      aspect: this.aspect
    };
  }
  Deserialize(data) {
    this.backgroundColor.Deserialize(data.backgroundColor);
    this.name = data.name;
    this.id = data.id;
    this.near = data.near;
    this.far = data.far;
    this.fov = data.fov;
    this.aspect = data.aspect;
  }
};
_init$2 = __decoratorStart$2(_a$2);
__decorateElement$2(_init$2, 2, "near", _near_dec, _Camera);
__decorateElement$2(_init$2, 2, "far", _far_dec, _Camera);
__decorateElement$2(_init$2, 2, "fov", _fov_dec, _Camera);
__decorateElement$2(_init$2, 2, "aspect", _aspect_dec, _Camera);
__decoratorMetadata$2(_init$2, _Camera);
__publicField$2(_Camera, "type", "@trident/core/components/Camera");
__publicField$2(_Camera, "mainCamera");
let Camera = _Camera;
Component.Registry.set(Camera.type, Camera);

var __create$1 = Object.create;
var __defProp$1 = Object.defineProperty;
var __getOwnPropDesc$1 = Object.getOwnPropertyDescriptor;
var __knownSymbol$1 = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError$1 = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name$1 = (target, value) => __defProp$1(target, "name", { value, configurable: true });
var __decoratorStart$1 = (base) => [, , , __create$1(base?.[__knownSymbol$1("metadata")] ?? null)];
var __decoratorStrings$1 = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn$1 = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError$1("Function expected") : fn;
var __decoratorContext$1 = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings$1[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError$1("Already initialized") : fns.push(__expectFn$1(fn || null)) });
var __decoratorMetadata$1 = (array, target) => __defNormalProp$1(target, __knownSymbol$1("metadata"), array[3]);
var __runInitializers$1 = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement$1 = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings$1[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc$1(k < 4 ? target : { get [name]() {
    return __privateGet$1(this, extra);
  }, set [name](x) {
    return __privateSet$1(this, extra, x);
  } }, name));
  k ? p && k < 4 && __name$1(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name$1(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext$1(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn$1(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet$1 : __privateMethod$1)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet$1(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn$1(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError$1("Object expected");
    else __expectFn$1(fn = it.get) && (desc.get = fn), __expectFn$1(fn = it.set) && (desc.set = fn), __expectFn$1(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata$1(array, target), desc && __defProp$1(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};
var __publicField$1 = (obj, key, value) => __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck$1 = (obj, member, msg) => member.has(obj) || __typeError$1("Cannot " + msg);
var __privateIn$1 = (member, obj) => Object(obj) !== obj ? __typeError$1('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet$1 = (obj, member, getter) => (__accessCheck$1(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet$1 = (obj, member, value, setter) => (__accessCheck$1(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod$1 = (obj, member, method) => (__accessCheck$1(obj, member, "access private method"), method);
var _castShadows_dec, _intensity_dec, _color_dec, _a$1, _init$1, _range_dec, _angle_dec, _b, _init2, _range_dec2, _c, _init3, _direction_dec, _d, _init4;
class LightEvents {
  static Updated = (light) => {
  };
}
const _Light = class _Light extends (_a$1 = Component, _color_dec = [SerializeField], _intensity_dec = [SerializeField], _castShadows_dec = [SerializeField], _a$1) {
  constructor(gameObject) {
    super(gameObject);
    __publicField$1(this, "camera");
    __publicField$1(this, "color", __runInitializers$1(_init$1, 8, this, new Color(1, 1, 1))), __runInitializers$1(_init$1, 11, this);
    __publicField$1(this, "intensity", __runInitializers$1(_init$1, 12, this, 1)), __runInitializers$1(_init$1, 15, this);
    __publicField$1(this, "castShadows", __runInitializers$1(_init$1, 16, this, true)), __runInitializers$1(_init$1, 19, this);
    this.camera = new Camera(this.gameObject);
  }
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(LightEvents.Updated, this);
    });
  }
  Serialize() {
    return {
      type: _Light.type,
      camera: this.camera.Serialize(),
      color: this.color.Serialize(),
      intensity: this.intensity,
      // range: this.range,
      castShadows: this.castShadows
    };
  }
};
_init$1 = __decoratorStart$1(_a$1);
__decorateElement$1(_init$1, 5, "color", _color_dec, _Light);
__decorateElement$1(_init$1, 5, "intensity", _intensity_dec, _Light);
__decorateElement$1(_init$1, 5, "castShadows", _castShadows_dec, _Light);
__decoratorMetadata$1(_init$1, _Light);
__publicField$1(_Light, "type", "@trident/core/components/Light");
let Light = _Light;
class SpotLight extends (_b = Light, _angle_dec = [SerializeField], _range_dec = [SerializeField], _b) {
  constructor() {
    super(...arguments);
    __runInitializers$1(_init2, 5, this);
    __publicField$1(this, "direction", new Vector3(0, -1, 0));
    __publicField$1(this, "_angle", 1);
    __publicField$1(this, "_range", 10);
  }
  get angle() {
    return this._angle;
  }
  set angle(angle) {
    this._angle = angle;
    this.UpdateLight();
  }
  get range() {
    return this._range;
  }
  set range(range) {
    this._range = range;
    this.UpdateLight();
  }
  UpdateLight() {
    const radius = Math.tan(this.angle) * this.range;
    this.transform.scale.set(radius, this.range, radius);
  }
  Start() {
    super.Start();
    this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1e3);
    this.UpdateLight();
  }
}
_init2 = __decoratorStart$1(_b);
__decorateElement$1(_init2, 2, "angle", _angle_dec, SpotLight);
__decorateElement$1(_init2, 2, "range", _range_dec, SpotLight);
__decoratorMetadata$1(_init2, SpotLight);
class PointLight extends (_c = Light, _range_dec2 = [SerializeField], _c) {
  constructor() {
    super(...arguments);
    __runInitializers$1(_init3, 5, this);
    __publicField$1(this, "_range", 10);
  }
  get range() {
    return this._range;
  }
  set range(range) {
    this._range = range;
    this.UpdateLight();
  }
  UpdateLight() {
    this.transform.scale.set(this.range, this.range, this.range);
  }
  Start() {
    super.Start();
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
    this.UpdateLight();
  }
}
_init3 = __decoratorStart$1(_c);
__decorateElement$1(_init3, 2, "range", _range_dec2, PointLight);
__decoratorMetadata$1(_init3, PointLight);
class AreaLight extends Light {
  Start() {
    super.Start();
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
  }
}
const _DirectionalLight = class _DirectionalLight extends (_d = Light, _direction_dec = [SerializeField], _d) {
  constructor() {
    super(...arguments);
    __publicField$1(this, "direction", __runInitializers$1(_init4, 8, this, new Vector3(0, 1, 0))), __runInitializers$1(_init4, 11, this);
  }
  Start() {
    super.Start();
    const size = 1;
    this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
  }
  Serialize() {
    return Object.assign(super.Serialize(), {
      type: _DirectionalLight.type,
      direction: this.direction.Serialize()
    });
  }
  Deserialize(data) {
    this.direction.Deserialize(data.direction);
    this.camera.Deserialize(data.camera);
    this.color.Deserialize(data.color);
    this.intensity = data.intensity;
    this.range = data.range;
    this.castShadows = data.castShadows;
  }
};
_init4 = __decoratorStart$1(_d);
__decorateElement$1(_init4, 5, "direction", _direction_dec, _DirectionalLight);
__decoratorMetadata$1(_init4, _DirectionalLight);
__publicField$1(_DirectionalLight, "type", "@trident/core/components/DirectionalLight");
let DirectionalLight = _DirectionalLight;
Component.Registry.set(SpotLight.type, SpotLight);
Component.Registry.set(PointLight.type, PointLight);
Component.Registry.set(DirectionalLight.type, DirectionalLight);

class MemoryAllocator {
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
    for (let i = 0; i < this.freeBlocks.length; i++) {
      const block = this.freeBlocks[i];
      if (block.size >= size) {
        const offset = block.offset;
        block.offset += size;
        block.size -= size;
        this.availableMemorySize -= size;
        if (block.size === 0) {
          this.freeBlocks.splice(i, 1);
        }
        this.usedBlocks.push({ offset, size });
        return offset;
      }
    }
    throw Error("Not enough space.");
  }
  mergeFreeBlocks() {
    this.freeBlocks.sort((a, b) => a.offset - b.offset);
    for (let i = 0; i < this.freeBlocks.length - 1; ) {
      const currentBlock = this.freeBlocks[i];
      const nextBlock = this.freeBlocks[i + 1];
      if (currentBlock.offset + currentBlock.size === nextBlock.offset) {
        currentBlock.size += nextBlock.size;
        this.freeBlocks.splice(i + 1, 1);
      } else {
        i++;
      }
    }
  }
  free(offset) {
    for (let i = 0; i < this.usedBlocks.length; i++) {
      const block = this.usedBlocks[i];
      if (block.offset === offset) {
        this.usedBlocks.splice(i, 1);
        this.freeBlocks.push(block);
        this.mergeFreeBlocks();
        this.availableMemorySize += block.size;
        return;
      }
    }
    throw new Error(`No allocated block found at offset ${offset}`);
  }
}
class BufferMemoryAllocator {
  allocator;
  buffer;
  links;
  static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
  bufferType;
  constructor(size, bufferType = BufferType.STORAGE) {
    this.allocator = new MemoryAllocator(size);
    this.buffer = Buffer.Create(size * BufferMemoryAllocator.BYTES_PER_ELEMENT, bufferType);
    this.links = /* @__PURE__ */ new Map();
    this.bufferType = bufferType;
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
    this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
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
}
class DynamicBufferMemoryAllocator extends BufferMemoryAllocator {
  incrementAmount;
  constructor(size, incrementAmount, bufferType = BufferType.STORAGE) {
    super(size, bufferType);
    this.incrementAmount = incrementAmount ? incrementAmount : size;
  }
  set(link, data) {
    let bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) {
      if (this.allocator.availableMemorySize - data.length < 0) {
        this.allocator.memorySize;
        const incrementAmount = this.incrementAmount > data.length ? this.incrementAmount : data.length;
        const oldMemorySize = this.allocator.memorySize - this.allocator.availableMemorySize;
        this.allocator.memorySize += incrementAmount;
        this.allocator.availableMemorySize += incrementAmount;
        this.allocator.freeBlocks.push({ offset: oldMemorySize, size: incrementAmount });
        const buffer = Buffer.Create(this.allocator.memorySize * BufferMemoryAllocator.BYTES_PER_ELEMENT, BufferType.STORAGE);
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
}

class DeferredLightingPass extends RenderPass {
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
  gBufferDepthClone;
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
        lights: { group: 0, binding: 11, type: "storage" },
        lightCount: { group: 0, binding: 12, type: "storage" },
        view: { group: 0, binding: 13, type: "storage" },
        shadowSamplerComp: { group: 0, binding: 14, type: "sampler-compare" },
        settings: { group: 0, binding: 15, type: "storage" }
      },
      colorOutputs: [{ format: "rgba16float", blendMode: "add" }],
      depthOutput: "depth24plus",
      depthWriteEnabled: false,
      // depthCompare: "less-equal",
      // cullMode: "back"
      depthCompare: "greater-equal",
      cullMode: "front"
    });
    this.sampler = TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    this.shader.SetSampler("textureSampler", this.sampler);
    const shadowSamplerComp = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", compare: "less" });
    this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);
    this.quadGeometry = new Geometry();
    this.lightsBuffer = new DynamicBufferMemoryAllocator(120 * 1e4);
    this.lightsCountBuffer = Buffer.Create(1 * 4, BufferType.STORAGE);
    this.shader.SetBuffer("lights", this.lightsBuffer.getBuffer());
    this.shader.SetBuffer("lightCount", this.lightsCountBuffer);
    this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    EventSystem.on(RendererEvents.Resized, (canvas) => {
      this.outputLightingPass.Destroy();
      this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    });
    this.dummyShadowPassDepth = DepthTextureArray.Create(1, 1, 1);
    this.gBufferDepthClone = DepthTexture.Create(Renderer.width, Renderer.height);
    EventSystem.on(LightEvents.Updated, (component) => {
      this.needsUpdate = true;
    });
    this.initialized = true;
  }
  updateLightsBuffer(lights, resources) {
    if (!this.needsUpdate) return;
    Camera.mainCamera.gameObject.scene;
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
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
        ...light.transform.localToWorldMatrix.elements,
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
        // ...new Vector4(0,0,1,0).applyMatrix4(light.camera.viewMatrix.clone().invert()).normalize().elements,
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
  async preFrame(resources) {
    if (!this.initialized) return;
    this.drawCommands.length = 0;
    const camera = Camera.mainCamera;
    const scene = camera.gameObject.scene;
    const _lights = scene.GetComponents(Light);
    let lights = [];
    for (const light of _lights) {
      if (light.enabled === false || light.gameObject.enabled === false) continue;
      lights.push(light);
    }
    if (lights.length === 0) return;
    this.updateLightsBuffer(lights, resources);
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    const inputShadowPassDepth = resources.getResource(PassParams.ShadowPassDepth) || this.dummyShadowPassDepth;
    const inputFrameBuffer = resources.getResource(PassParams.FrameBuffer);
    if (!inputGBufferAlbedo) return;
    this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
    this.shader.SetTexture("normalTexture", inputGBufferNormal);
    this.shader.SetTexture("ermoTexture", inputGbufferERMO);
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);
    this.shader.SetArray("view", inputFrameBuffer);
    const settings = resources.getResource(PassParams.DebugSettings);
    this.shader.SetArray("settings", settings);
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (light instanceof DirectionalLight) this.drawCommands.push({ geometry: this.plane, shader: this.shader, instanceCount: 1, firstInstance: i });
      if (light instanceof PointLight) this.drawCommands.push({ geometry: this.sphere, shader: this.shader, instanceCount: 1, firstInstance: i });
      if (light instanceof SpotLight) this.drawCommands.push({ geometry: this.cone, shader: this.shader, instanceCount: 1, firstInstance: i });
    }
  }
  plane = Geometry.Plane();
  sphere = Geometry.Sphere();
  cone = Geometry.Cone();
  async execute(resources) {
    if (!this.initialized) return;
    if (this.drawCommands.length === 0) return;
    const GBufferDepth = resources.getResource(PassParams.GBufferDepth);
    RendererContext.CopyTextureToTextureV3({ texture: GBufferDepth }, { texture: this.gBufferDepthClone });
    RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: false }], { target: this.gBufferDepthClone, clear: false }, true);
    for (const draw of this.drawCommands) {
      RendererContext.DrawGeometry(draw.geometry, draw.shader, draw.instanceCount, draw.firstInstance);
    }
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.LightingPassOutput, this.outputLightingPass);
    resources.setResource(PassParams.LightsBuffer, this.lightsBuffer);
  }
}

class TextureViewer extends RenderPass {
  name = "TextureViewer";
  shader;
  quadGeometry;
  async init() {
    const code = `
        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<f32>;

        // Full-screen triangle (covers screen with 3 verts)
        const p = array<vec2f, 3>(
            vec2f(-1.0, -1.0),
            vec2f( 3.0, -1.0),
            vec2f(-1.0,  3.0)
        );

        @vertex fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
            var out : VertexOutput;
            out.position = vec4f(p[vertexIndex], 0.0, 1.0);
          
            // Derive UVs from NDC: ([-1,1] -> [0,1])
            let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
            out.vUv = vec2f(uv.x, 1.0 - uv.y);
            return out;
        }

        fn toneMapping(color: vec3f) -> vec3f {
            // Narkowicz 2015 ACES approx
            let a = 2.51; let b = 0.03; let c = 2.43; let d = 0.59; let e = 0.14;
            return clamp((color*(a*color+b)) / (color*(c*color+d)+e), vec3f(0.0), vec3f(1.0));
        }

        fn gammaCorrection(color: vec3f) -> vec3f {
            return pow(color, vec3f(1.0 / 2.2));
        }


        /*
        * ACES tonemapping fit for the sRGB color space
        * https://github.com/TheRealMJP/BakingLab/blob/master/BakingLab/ACES.hlsl
        */
        // sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
        const aces_input_mat = mat3x3<f32>(
            0.59719, 0.07600, 0.02840,
            0.35458, 0.90834, 0.13383,
            0.04823, 0.01566, 0.83777
        );

        // ODT_SAT => XYZ => D60_2_D65 => sRGB
        const aces_output_mat = mat3x3<f32>(
            1.60475, -0.10208, -0.00327,
            -0.53108,  1.10813, -0.07276,
            -0.07367, -0.00605,  1.07602
        );

        fn rrt_and_odt_fit(v: vec3f) -> vec3f {
            let a = v * (v + 0.0245786) - 0.000090537;
            let b = v * (0.983729 * v + 0.4329510) + 0.238081;
            return a / b;
        }
            
        fn aces_fitted(_color: vec3f) -> vec3f {
            var color = _color;
            color = aces_input_mat * color;
            color = rrt_and_odt_fit(color);
            color = aces_output_mat * color;
            return clamp(color, vec3f(0.0), vec3f(1.0));
        }

        //-----------------------------------------------------------------------------

        fn gamma_correct(linear_srgb: vec3f) -> vec3f {
            let a = 12.92 * linear_srgb;
            let b = 1.055 * pow(linear_srgb, vec3(1.0 / 2.4)) - 0.055;
            let c = step(vec3(0.0031308), linear_srgb);
            return mix(a, b, c);
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            // let color = textureSampleLevel(texture, textureSampler, input.vUv, 0);
            // return vec4f(gammaCorrection(toneMapping(color.rgb)), color.a);

            // let hdr = textureSampleLevel(texture, textureSampler, input.vUv, 0);
            // return vec4f(gammaCorrection(toneMapping(hdr.rgb * 0.5)), hdr.a);


            const EXPOSURE = -4.0;

            var col = textureSampleLevel(texture, textureSampler, input.vUv, 0).rgb;
            
            // Apply exposure
            col = col * exp2(EXPOSURE);

            // Tonemap
            col = toneMapping(col);
            // Apply the sRGB transfer function (gamma correction)
            col = clamp(gammaCorrection(col), vec3f(0.0), vec3f(1.0));


            // // Tonemap
            // col = aces_fitted(col);
            // // Apply the sRGB transfer function (gamma correction)
            // col = clamp(gamma_correct(col), vec3f(0.0), vec3f(1.0));

            return vec4f(col, 1.0);
        }
        `;
    this.shader = await Shader.Create({
      code,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        texture: { group: 0, binding: 1, type: "texture" }
      }
    });
    this.quadGeometry = new Geometry();
    const sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", sampler);
    this.initialized = true;
  }
  async execute(resources) {
    if (this.initialized === false) return;
    resources.getResource(PassParams.DebugSettings);
    const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
    if (!LightingPassOutputTexture) return;
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass("TextureViewer", [{ clear: false }], void 0, true);
    RendererContext.Draw(this.quadGeometry, this.shader, 3);
    RendererContext.EndRenderPass();
  }
}

class Material {
  shader;
  params;
  constructor(params) {
    const defaultParams = {
      isDeferred: false,
      shader: void 0
    };
    this.params = Object.assign({}, defaultParams, params);
    this.shader = this.params.shader;
  }
  Destroy() {
    this.shader.Destroy();
  }
  Serialize(metadata = {}) {
    return {
      shader: this.shader ? this.shader.Serialize(metadata) : void 0,
      isDeferred: this.params.isDeferred
    };
  }
  // TODO: Do cache
  static Deserialize(data) {
    if (data.type === "@trident/core/renderer/Material/PBRMaterial") {
      return PBRMaterial.Deserialize(data);
    }
  }
}
class PBRMaterial extends Material {
  type = "@trident/core/renderer/Material/PBRMaterial";
  id = UUID();
  initialParams;
  static DefaultParams = {
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
    repeat: new Vector2(1, 1),
    offset: new Vector2(0, 0),
    doubleSided: false,
    alphaCutoff: 0,
    unlit: false,
    wireframe: false,
    isSkinned: false,
    isDeferred: true,
    useVertexPulling: false
  };
  constructor(params) {
    super(params);
    this.initialParams = params;
    const _params = Object.assign({}, PBRMaterial.DefaultParams, params);
    const instance = this;
    const handler = {
      async set(obj, prop, value) {
        obj[prop] = value;
        if (!instance.shader) await instance.createShader();
        instance.shader.SetArray("material", new Float32Array([
          instance.params.albedoColor.r,
          instance.params.albedoColor.g,
          instance.params.albedoColor.b,
          instance.params.albedoColor.a,
          instance.params.emissiveColor.r,
          instance.params.emissiveColor.g,
          instance.params.emissiveColor.b,
          instance.params.emissiveColor.a,
          instance.params.roughness,
          instance.params.metalness,
          +instance.params.unlit,
          instance.params.alphaCutoff,
          +instance.params.wireframe,
          0,
          0,
          0
        ]));
        return true;
      }
    };
    this.params = new Proxy(_params, handler);
    this.createShader();
  }
  async createShader() {
    const gbufferFormat = Scene.mainScene.renderPipeline.GBufferFormat;
    const DEFINES = {
      USE_ALBEDO_MAP: this.initialParams?.albedoMap ? true : false,
      USE_NORMAL_MAP: this.initialParams?.normalMap ? true : false,
      USE_HEIGHT_MAP: this.initialParams?.heightMap ? true : false,
      USE_METALNESS_MAP: this.initialParams?.metalnessMap ? true : false,
      USE_EMISSIVE_MAP: this.initialParams?.emissiveMap ? true : false,
      USE_AO_MAP: this.initialParams?.aoMap ? true : false,
      USE_SKINNING: this.initialParams?.isSkinned ? true : false
    };
    let shaderParams = {
      code: this.params.useVertexPulling === true ? ShaderLoader.DrawVertexPulling : ShaderLoader.Draw,
      defines: DEFINES,
      colorOutputs: [{ format: gbufferFormat }, { format: gbufferFormat }, { format: gbufferFormat }],
      depthOutput: "depth24plus",
      attributes: this.params.useVertexPulling === true ? void 0 : {
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
        // // Global buffers
        // Frame: {group: 1, binding: 0, type: "storage"},
        // Materials: {group: 1, binding: 1, type: "storage"},
        // Models: {group: 1, binding: 2, type: "storage"},
        // Instance: {group: 1, binding: 3, type: "storage"},
      },
      cullMode: this.params.doubleSided ? "none" : void 0,
      useVertexPulling: this.params.useVertexPulling
    };
    let nextAttributeLocation = 3;
    if (DEFINES.USE_NORMAL_MAP && this.params.useVertexPulling !== true) {
      shaderParams.attributes.tangent = { location: nextAttributeLocation++, size: 4, type: "vec4" };
    }
    if (DEFINES.USE_SKINNING) {
      shaderParams.attributes.joints = { location: nextAttributeLocation++, size: 4, type: "vec4u" };
      shaderParams.attributes.weights = { location: nextAttributeLocation++, size: 4, type: "vec4" };
      shaderParams.uniforms.boneMatrices = { group: 1, binding: 0, type: "storage" };
    }
    if (this.params.useVertexPulling === true) {
      shaderParams.uniforms.position = { group: 1, binding: 0, type: "storage" };
      shaderParams.uniforms.normal = { group: 1, binding: 1, type: "storage" };
      shaderParams.uniforms.uv = { group: 1, binding: 2, type: "storage" };
      shaderParams.uniforms.index = { group: 1, binding: 3, type: "storage" };
      if (DEFINES.USE_NORMAL_MAP) {
        shaderParams.uniforms.tangent = { group: 1, binding: 4, type: "storage" };
      }
    }
    const shader = await Shader.Create(shaderParams);
    if (this.params.useVertexPulling === true) {
      shader.OnPreRender = (geometry) => {
        shader.SetBuffer("position", geometry.attributes.get("position").GetBuffer());
        shader.SetBuffer("normal", geometry.attributes.get("normal").GetBuffer());
        shader.SetBuffer("uv", geometry.attributes.get("uv").GetBuffer());
        shader.SetBuffer("index", geometry.index.GetBuffer());
        if (DEFINES.USE_NORMAL_MAP) {
          shader.SetBuffer("tangent", geometry.attributes.get("tangent").GetBuffer());
        }
        return true;
      };
    }
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
      0,
      this.params.repeat.x,
      this.params.repeat.y,
      this.params.offset.x,
      this.params.offset.y
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
  Serialize(metadata = {}) {
    const params = this.params;
    return Object.assign(
      super.Serialize(metadata),
      {
        type: this.type,
        params: {
          albedoColor: params.albedoColor.Serialize(),
          emissiveColor: params.emissiveColor.Serialize(),
          roughness: params.roughness,
          metalness: params.metalness,
          albedoMap: params.albedoMap ? params.albedoMap.Serialize(metadata) : void 0,
          normalMap: params.normalMap ? params.normalMap.Serialize(metadata) : void 0,
          heightMap: params.heightMap ? params.heightMap.Serialize(metadata) : void 0,
          metalnessMap: params.metalnessMap ? params.metalnessMap.Serialize(metadata) : void 0,
          emissiveMap: params.emissiveMap ? params.emissiveMap.Serialize(metadata) : void 0,
          aoMap: params.aoMap ? params.aoMap.Serialize(metadata) : void 0,
          doubleSided: params.doubleSided,
          alphaCutoff: params.alphaCutoff,
          unlit: params.unlit,
          wireframe: params.wireframe,
          isSkinned: params.isSkinned
        }
      }
    );
  }
  // TODO: Do cache, process textures
  static Deserialize(data) {
    const params = data.params;
    const defaults = PBRMaterial.DefaultParams;
    return new PBRMaterial({
      albedoColor: params.albedoColor ? new Color().Deserialize(params.albedoColor) : defaults.albedoColor,
      emissiveColor: params.emissiveColor ? new Color().Deserialize(params.emissiveColor) : defaults.emissiveColor,
      roughness: params.roughness ? params.roughness : defaults.roughness,
      metalness: params.metalness ? params.metalness : defaults.metalness,
      albedoMap: params.albedoMap ? Texture.Deserialize(params.albedoMap) : defaults.albedoMap,
      normalMap: params.normalMap ? Texture.Deserialize(params.normalMap) : defaults.normalMap,
      heightMap: params.heightMap ? Texture.Deserialize(params.heightMap) : defaults.heightMap,
      metalnessMap: params.metalnessMap ? Texture.Deserialize(params.metalnessMap) : defaults.metalnessMap,
      emissiveMap: params.emissiveMap ? Texture.Deserialize(params.emissiveMap) : defaults.emissiveMap,
      aoMap: params.aoMap ? Texture.Deserialize(params.aoMap) : defaults.aoMap,
      doubleSided: params.doubleSided ? params.doubleSided : defaults.doubleSided,
      alphaCutoff: params.alphaCutoff ? params.alphaCutoff : defaults.alphaCutoff,
      unlit: params.unlit ? params.unlit : defaults.unlit,
      wireframe: params.wireframe ? params.wireframe : defaults.wireframe,
      isSkinned: params.isSkinned ? params.isSkinned : defaults.isSkinned
    });
  }
}

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra);
  }, set [name](x) {
    return __privateSet(this, extra, x);
  } }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _enableShadows_dec, _material_dec, _geometry_dec, _a, _init;
class MeshEvents {
  static TransformUpdated = (mesh) => {
  };
  static MaterialUpdated = (mesh, material) => {
  };
}
const _Mesh = class _Mesh extends (_a = Component, _geometry_dec = [SerializeField], _material_dec = [SerializeField], _enableShadows_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __runInitializers(_init, 5, this);
    __publicField(this, "_geometry");
    __publicField(this, "_material");
    __publicField(this, "enableShadows", __runInitializers(_init, 8, this, true)), __runInitializers(_init, 11, this);
    __publicField(this, "bounds", new BoundingVolume());
  }
  get geometry() {
    return this._geometry;
  }
  set geometry(geometry) {
    this._geometry = geometry;
  }
  get material() {
    return this._material;
  }
  set material(material) {
    this._material = material;
    EventSystem.emit(MeshEvents.MaterialUpdated, this, material);
  }
  get localBounds() {
    return this.geometry.boundingVolume;
  }
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      if (!this.geometry) return;
      const local = this.localBounds;
      this.bounds.center.copy(local.center);
      this.bounds.center.applyMatrix4(this.transform.localToWorldMatrix);
      const m = this.transform.localToWorldMatrix.elements;
      const sx = Math.hypot(m[0], m[1], m[2]);
      const sy = Math.hypot(m[4], m[5], m[6]);
      const sz = Math.hypot(m[8], m[9], m[10]);
      this.bounds.radius = local.radius * Math.max(sx, sy, sz);
      EventSystem.emit(MeshEvents.TransformUpdated, this);
    });
  }
  Destroy() {
    this.geometry.Destroy();
    this.material.Destroy();
  }
  Serialize(metadata = {}) {
    return {
      type: _Mesh.type,
      geometry: this.geometry.Serialize(metadata),
      material: this.material.Serialize(metadata),
      enableShadows: this.enableShadows
    };
  }
  Deserialize(data) {
    this.geometry = new Geometry();
    this.geometry.Deserialize(data.geometry);
    this.material = Material.Deserialize(data.material);
    this.enableShadows = data.enableShadows;
  }
};
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "geometry", _geometry_dec, _Mesh);
__decorateElement(_init, 2, "material", _material_dec, _Mesh);
__decorateElement(_init, 5, "enableShadows", _enableShadows_dec, _Mesh);
__decoratorMetadata(_init, _Mesh);
__publicField(_Mesh, "type", "@trident/core/components/Mesh");
let Mesh = _Mesh;
Component.Registry.set(Mesh.type, Mesh);

class Skin {
  joints;
  inverseBindMatrices;
  jointData;
  constructor(joints, inverseBindMatrixData) {
    this.joints = joints;
    this.inverseBindMatrices = [];
    this.jointData = new Float32Array(joints.length * 16);
    for (let i = 0; i < joints.length; ++i) {
      this.inverseBindMatrices.push(new Float32Array(
        inverseBindMatrixData.buffer,
        inverseBindMatrixData.byteOffset + Float32Array.BYTES_PER_ELEMENT * 16 * i,
        16
      ));
    }
  }
  _matrix = new Matrix4();
  update(skinRootWorldMatrix) {
    for (let j = 0; j < this.joints.length; ++j) {
      const tmp = skinRootWorldMatrix.clone().mul(this.joints[j].localToWorldMatrix).mul(new Matrix4().setFromArray(this.inverseBindMatrices[j]));
      this.jointData.set(tmp.elements, j * 16);
    }
  }
}
class SkinnedMesh extends Mesh {
  skin;
  boneMatricesBuffer;
  constructor(gameObject) {
    super(gameObject);
  }
  GetBoneMatricesBuffer() {
    return this.boneMatricesBuffer;
  }
  Start() {
    if (!this.skin) throw Error("SkinnedMesh needs a skin");
    this.boneMatricesBuffer = Buffer.Create(this.skin.jointData.length * 4, BufferType.STORAGE);
    this.boneMatricesBuffer.SetArray(this.skin.jointData);
  }
  Update() {
    this.skin.update(this.gameObject.transform.worldToLocalMatrix);
    this.boneMatricesBuffer.SetArray(this.skin.jointData);
  }
}

class InstancedMesh extends Mesh {
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
  Destroy() {
    this.matricesBuffer.Destroy();
  }
}

class _DeferredShadowMapPassSettings {
  shadowWidth = 2048;
  shadowHeight = 2048;
  shadowsUpdateValue = true;
  roundToPixelSizeValue = true;
  debugCascadesValue = false;
  pcfResolutionValue = 1;
  blendThresholdValue = 0.3;
  viewBlendThresholdValue = false;
  numOfCascades = 4;
  splitType = "practical";
  splitTypePracticalLambda = 0.9;
  maxShadowDistance = 2e3;
}
const DeferredShadowMapPassSettings = new _DeferredShadowMapPassSettings();
class DeferredShadowMapPass extends RenderPass {
  name = "DeferredShadowMapPass";
  drawInstancedShadowShader;
  drawShadowShader;
  drawSkinnedMeshShadowShader;
  lightProjectionMatrixBuffer;
  lightProjectionViewMatricesBuffer;
  modelMatrices;
  cascadeCurrentIndexBuffer;
  cascadeIndexBuffers = [];
  lightShadowData = /* @__PURE__ */ new Map();
  shadowOutput;
  skinnedBoneMatricesBuffer;
  preparedLights = [];
  preparedMeshes = [];
  preparedInstancedMeshes = [];
  // TODO: Clean this, csmSplits here to be used by debugger plugin
  Settings = DeferredShadowMapPassSettings;
  csmSplits = [0, 0, 0, 0];
  async init(resources) {
    const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIdx : u32, 
            @location(0) position : vec3<f32>,
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
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        cascadeIndex: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 1, binding: 0, type: "storage" }
      },
      colorOutputs: [],
      depthOutput: "depth24plus",
      // depthBias: 2,              // Constant bias
      // depthBiasSlopeScale: -1.0,  // Slope-scale bias
      // depthBiasClamp: 0.0,       // Max clamp for the bias
      cullMode: "front"
    });
    this.drawInstancedShadowShader = await Shader.Create({
      code,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
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
    this.drawSkinnedMeshShadowShader = await Shader.Create({
      code: `
            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) joints: vec4<u32>,
                @location(2) weights: vec4<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
            };
            
            @group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
            @group(0) @binding(1) var<storage, read> cascadeIndex: f32;
            
            @group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;
            @group(1) @binding(1) var<storage, read> boneMatrices: array<mat4x4<f32>>;
    
            @vertex
            fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
                var output : VertexOutput;

                let skinMatrix: mat4x4<f32> = 
                boneMatrices[input.joints[0]] * input.weights[0] +
                boneMatrices[input.joints[1]] * input.weights[1] +
                boneMatrices[input.joints[2]] * input.weights[2] +
                boneMatrices[input.joints[3]] * input.weights[3];
            
                let finalPosition = skinMatrix * vec4(input.position, 1.0);
    
                let modelMatrixInstance = modelMatrix[input.instanceIdx];
                let lightProjectionViewMatrix = projectionMatrix[u32(cascadeIndex)];
            
                return lightProjectionViewMatrix * modelMatrixInstance * finalPosition;
            }
            
            @fragment
            fn fragmentMain() -> @location(0) vec4<f32> {
                return vec4(1.0);
            }
            `,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        joints: { location: 1, size: 4, type: "vec4u" },
        weights: { location: 2, size: 4, type: "vec4" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        cascadeIndex: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 1, binding: 0, type: "storage" },
        boneMatrices: { group: 1, binding: 1, type: "storage" }
      },
      colorOutputs: [],
      depthOutput: "depth24plus",
      cullMode: "front"
    });
    this.skinnedBoneMatricesBuffer = Buffer.Create(16 * 100 * 4, BufferType.STORAGE);
    this.drawSkinnedMeshShadowShader.SetBuffer("boneMatrices", this.skinnedBoneMatricesBuffer);
    this.shadowOutput = DepthTextureArray.Create(DeferredShadowMapPassSettings.shadowWidth, DeferredShadowMapPassSettings.shadowHeight, 1);
    this.initialized = true;
  }
  frustumData;
  getCornersForCascade(camera, cascadeNear, cascadeFar) {
    const projectionMatrix = new Matrix4().perspectiveZO(camera.fov * (Math.PI / 180), camera.aspect, cascadeNear, cascadeFar);
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
    for (let i = 0; i < 8; i++) frustumCorners[i].applyMatrix4(invViewProj);
    return frustumCorners;
  }
  uniformSplit(numOfCascades, near, far, target) {
    for (let i = 1; i < numOfCascades; i++) target.push((near + (far - near) * i / numOfCascades) / far);
    target.push(1);
  }
  logarithmicSplit(numOfCascades, near, far, target) {
    for (let i = 1; i < numOfCascades; i++) target.push(near * (far / near) ** (i / numOfCascades) / far);
    target.push(1);
  }
  practicalSplit(numOfCascades, near, far, lambda, target) {
    const lerp = (x, y, t) => (1 - t) * x + t * y;
    const _uniformArray = [];
    const _logArray = [];
    this.logarithmicSplit(numOfCascades, near, far, _logArray);
    this.uniformSplit(numOfCascades, near, far, _uniformArray);
    for (let i = 1; i < numOfCascades; i++) target.push(lerp(_uniformArray[i - 1], _logArray[i - 1], lambda));
    target.push(1);
  }
  getCascadeSplits(cascadeCount, near, far) {
    let CASCADE_DISTANCES = [];
    if (DeferredShadowMapPassSettings.splitType === "uniform") this.uniformSplit(cascadeCount, near, far, CASCADE_DISTANCES);
    if (DeferredShadowMapPassSettings.splitType === "log") this.logarithmicSplit(cascadeCount, near, far, CASCADE_DISTANCES);
    if (DeferredShadowMapPassSettings.splitType === "practical") this.practicalSplit(cascadeCount, near, far, DeferredShadowMapPassSettings.splitTypePracticalLambda, CASCADE_DISTANCES);
    for (let i = 0; i < cascadeCount; i++) CASCADE_DISTANCES[i] *= far;
    return CASCADE_DISTANCES;
  }
  getCascades(cascadeSplits, camera, cascadeCount, light) {
    let cascades = [];
    this.frustumData = { corners: [], lightMatrix: new Matrix4(), cameraMatrix: new Matrix4(), frustumCenters: [] };
    for (let i = 0; i < cascadeCount; i++) {
      const cascadeNear = i === 0 ? camera.near : cascadeSplits[i - 1];
      const cascadeFar = cascadeSplits[i];
      const frustumCorners = this.getCornersForCascade(camera, cascadeNear, cascadeFar);
      const frustumCenter = new Vector3(0, 0, 0);
      for (let i2 = 0; i2 < frustumCorners.length; i2++) {
        frustumCenter.add(frustumCorners[i2]);
      }
      frustumCenter.mul(1 / frustumCorners.length);
      let radius = 0;
      for (let i2 = 0; i2 < 8; i2++) radius = Math.max(radius, frustumCorners[i2].clone().sub(frustumCenter).length());
      const lightDirection = light.transform.position.clone().mul(-1).normalize();
      const up = Math.abs(lightDirection.dot(new Vector3(0, 1, 0))) > 0.99 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
      const snapped = (p_value, p_step) => {
        if (p_step != 0) {
          p_value = Math.floor(p_value / p_step + 0.5) * p_step;
        }
        return p_value;
      };
      if (DeferredShadowMapPassSettings.roundToPixelSizeValue === true) {
        const shadowMapSize = DeferredShadowMapPassSettings.shadowWidth;
        const texelsPerUnit = shadowMapSize / (radius * 2);
        const scalar = new Matrix4().makeScale(new Vector3(texelsPerUnit, texelsPerUnit, texelsPerUnit));
        const lookAt = new Matrix4().lookAt(new Vector3(0, 0, 0), lightDirection, up).mul(scalar);
        const lookAtInv = lookAt.clone().invert();
        frustumCenter.applyMatrix4(lookAt);
        frustumCenter.x = snapped(frustumCenter.x, texelsPerUnit);
        frustumCenter.y = snapped(frustumCenter.y, texelsPerUnit);
        frustumCenter.applyMatrix4(lookAtInv);
      }
      const eye = frustumCenter.clone().sub(lightDirection.clone().mul(-radius));
      const lightViewMatrix = new Matrix4();
      lightViewMatrix.lookAt(eye, frustumCenter, up);
      const lightProjMatrix = new Matrix4().orthoZO(-radius, radius, -radius, radius, -radius * 2, 0);
      const viewProjMatrix = lightProjMatrix.clone().mul(lightViewMatrix);
      this.frustumData.corners.push(...frustumCorners);
      this.frustumData.cameraMatrix = camera.projectionMatrix.clone().mul(camera.viewMatrix);
      this.frustumData.lightMatrix = viewProjMatrix;
      this.frustumData.frustumCenters.push(frustumCenter);
      cascades.push({
        viewProjMatrix,
        splitDepth: cascadeFar
      });
    }
    return cascades;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    const mainCamera = Camera.mainCamera;
    if (!mainCamera) return;
    if (!this.Settings.shadowsUpdateValue) return;
    const scene = mainCamera.gameObject.scene;
    this.lightShadowData.clear();
    this.preparedLights.length = 0;
    this.preparedMeshes.length = 0;
    this.preparedInstancedMeshes.length = 0;
    const lights = [
      ...scene.GetComponents(SpotLight),
      ...scene.GetComponents(PointLight),
      ...scene.GetComponents(DirectionalLight),
      ...scene.GetComponents(AreaLight)
    ].filter((light) => light.castShadows === true);
    if (lights.length === 0) return;
    if (!this.shadowOutput || this.shadowOutput.depth !== lights.length) {
      this.shadowOutput = DepthTextureArray.Create(
        DeferredShadowMapPassSettings.shadowWidth,
        DeferredShadowMapPassSettings.shadowHeight,
        lights.length
      );
    }
    const cascadeCapacity = DeferredShadowMapPassSettings.numOfCascades;
    const perLightByteSize = cascadeCapacity * 4 * 16;
    if (!this.lightProjectionMatrixBuffer) {
      this.lightProjectionMatrixBuffer = Buffer.Create(perLightByteSize, BufferType.STORAGE);
      this.drawShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
      this.drawSkinnedMeshShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
      this.drawInstancedShadowShader.SetBuffer("projectionMatrix", this.lightProjectionMatrixBuffer);
    }
    const totalProjectionSize = lights.length * perLightByteSize;
    if (!this.lightProjectionViewMatricesBuffer || this.lightProjectionViewMatricesBuffer.size !== totalProjectionSize) {
      this.lightProjectionViewMatricesBuffer = Buffer.Create(totalProjectionSize, BufferType.STORAGE);
    }
    if (!this.cascadeCurrentIndexBuffer) {
      this.cascadeCurrentIndexBuffer = Buffer.Create(4, BufferType.STORAGE);
      this.drawShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
      this.drawSkinnedMeshShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
      this.drawInstancedShadowShader.SetBuffer("cascadeIndex", this.cascadeCurrentIndexBuffer);
    }
    if (this.cascadeIndexBuffers.length < cascadeCapacity) {
      for (let i = this.cascadeIndexBuffers.length; i < cascadeCapacity; i++) {
        const buffer = Buffer.Create(4, BufferType.STORAGE);
        buffer.SetArray(new Float32Array([i]));
        this.cascadeIndexBuffers.push(buffer);
      }
    }
    const meshes = [...scene.GetComponents(Mesh), ...scene.GetComponents(SkinnedMesh)].filter((mesh) => mesh.enableShadows && mesh.enabled && mesh.gameObject.enabled);
    if (meshes.length > 0) {
      const requiredSize = meshes.length * 256;
      if (!this.modelMatrices || this.modelMatrices.size !== requiredSize) {
        this.modelMatrices = DynamicBuffer.Create(requiredSize, BufferType.STORAGE, 256);
        this.drawShadowShader.SetBuffer("modelMatrix", this.modelMatrices);
        this.drawSkinnedMeshShadowShader.SetBuffer("modelMatrix", this.modelMatrices);
      }
      for (let i = 0; i < meshes.length; i++) {
        this.modelMatrices.SetArray(meshes[i].transform.localToWorldMatrix.elements, i * 256);
      }
    }
    this.preparedMeshes = meshes;
    const instancedMeshes = scene.GetComponents(InstancedMesh).filter((instance) => instance.enableShadows && instance.instanceCount > 0);
    this.preparedInstancedMeshes = instancedMeshes;
    let shadowLayer = 0;
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      EventSystemLocal.emit(TransformEvents.Updated, light.transform);
      let matricesForLight = [];
      let splits = [0, 0, 0, 0];
      let numOfCascades = 0;
      const cascadeViewports = [];
      if (light instanceof DirectionalLight) {
        const camera = mainCamera;
        numOfCascades = DeferredShadowMapPassSettings.numOfCascades;
        const cascadeSplits = this.getCascadeSplits(numOfCascades, camera.near, Math.min(camera.far, DeferredShadowMapPassSettings.maxShadowDistance));
        this.csmSplits = cascadeSplits;
        const cascades = this.getCascades(cascadeSplits, camera, numOfCascades, light);
        matricesForLight = cascades.map((c) => c.viewProjMatrix);
        splits = cascades.map((c) => c.splitDepth);
        const halfWidth = this.shadowOutput.width / 2;
        const halfHeight = this.shadowOutput.height / 2;
        for (let cascadeIndex = 0; cascadeIndex < numOfCascades; cascadeIndex++) {
          let x = 0;
          let y = 0;
          if (cascadeIndex >= 2) x += halfWidth;
          if (cascadeIndex & 1) y += halfHeight;
          cascadeViewports.push({ x, y, width: halfWidth, height: halfHeight });
        }
      } else if (light instanceof SpotLight) {
        numOfCascades = 1;
        const vp = light.camera.projectionMatrix.clone().mul(light.camera.viewMatrix);
        matricesForLight = [vp, vp, vp, vp];
        splits = [0, 0, 0, 0];
        cascadeViewports.push({ x: 0, y: 0, width: this.shadowOutput.width, height: this.shadowOutput.height });
      } else {
        shadowLayer++;
        continue;
      }
      const projectionArray = new Float32Array(matricesForLight.flatMap((m) => [...m.elements]));
      const copyOffset = i * perLightByteSize;
      this.lightProjectionViewMatricesBuffer.SetArray(projectionArray, copyOffset);
      const cascadeSplitsArray = new Float32Array(splits);
      this.lightShadowData.set(light.id, {
        cascadeSplits: cascadeSplitsArray,
        projectionMatrices: projectionArray,
        shadowMapIndex: shadowLayer
      });
      this.preparedLights.push({
        light,
        layer: shadowLayer,
        numCascades: numOfCascades,
        copyOffset,
        copySize: numOfCascades * 4 * 16,
        cascadeViewports,
        cascadeSplits: cascadeSplitsArray
      });
      shadowLayer++;
    }
    resources.setResource(PassParams.ShadowPassCascadeData, this.lightShadowData);
    resources.setResource(PassParams.ShadowPassDepth, this.shadowOutput);
  }
  async preRender(resources) {
    if (!this.initialized) return;
    if (this.preparedLights.length === 0) return;
    RendererContext.BeginRenderPass(`ShadowPass - clear`, [], { target: this.shadowOutput, clear: true }, false);
    RendererContext.EndRenderPass();
  }
  async execute(resources) {
    if (!this.initialized) return;
    if (this.preparedLights.length === 0) return;
    const shadowOutput = this.shadowOutput;
    shadowOutput.SetActiveLayer(0);
    for (const prepared of this.preparedLights) {
      shadowOutput.SetActiveLayer(prepared.layer);
      RendererContext.CopyBufferToBuffer(this.lightProjectionViewMatricesBuffer, this.lightProjectionMatrixBuffer, prepared.copyOffset, 0, prepared.copySize);
      for (let cascadePass = 0; cascadePass < prepared.numCascades; cascadePass++) {
        RendererContext.CopyBufferToBuffer(this.cascadeIndexBuffers[cascadePass], this.cascadeCurrentIndexBuffer, 0, 0, 4);
        RendererContext.BeginRenderPass("ShadowPass", [], { target: shadowOutput, clear: cascadePass === 0 }, true);
        const viewport = prepared.cascadeViewports[cascadePass];
        if (viewport) RendererContext.SetViewport(viewport.x, viewport.y, viewport.width, viewport.height, 0, 1);
        else RendererContext.SetViewport(0, 0, shadowOutput.width, shadowOutput.height, 0, 1);
        let meshCount = 0;
        for (const mesh of this.preparedMeshes) {
          const geometry = mesh.geometry;
          if (!geometry || !geometry.attributes.has("position")) {
            meshCount++;
            continue;
          }
          this.modelMatrices.dynamicOffset = meshCount * 256;
          if (mesh instanceof SkinnedMesh) {
            this.drawSkinnedMeshShadowShader.SetBuffer("boneMatrices", mesh.GetBoneMatricesBuffer());
            RendererContext.DrawGeometry(geometry, this.drawSkinnedMeshShadowShader, 1);
          } else {
            RendererContext.DrawGeometry(geometry, this.drawShadowShader, 1);
          }
          meshCount++;
        }
        for (const instance of this.preparedInstancedMeshes) {
          this.drawInstancedShadowShader.SetBuffer("modelMatrix", instance.matricesBuffer);
          RendererContext.DrawGeometry(instance.geometry, this.drawInstancedShadowShader, instance.instanceCount + 1, 0);
        }
        RendererContext.EndRenderPass();
      }
    }
    shadowOutput.SetActiveLayer(0);
  }
}

class PrepareGBuffers extends RenderPass {
  name = "PrepareGBuffers";
  gBufferAlbedoRT;
  gBufferNormalRT;
  gBufferERMORT;
  depthTexture;
  skybox;
  skyboxIrradiance;
  skyboxPrefilter;
  skyboxBRDFLUT;
  GBufferFormat = "rgba8unorm";
  FrameBufferValues = new ArrayBuffer(288);
  FrameBufferViews = {
    projectionOutputSize: new Float32Array(this.FrameBufferValues, 0, 4),
    viewPosition: new Float32Array(this.FrameBufferValues, 16, 4),
    projectionInverseMatrix: new Float32Array(this.FrameBufferValues, 32, 16),
    viewInverseMatrix: new Float32Array(this.FrameBufferValues, 96, 16),
    viewMatrix: new Float32Array(this.FrameBufferValues, 160, 16),
    projectionMatrix: new Float32Array(this.FrameBufferValues, 224, 16)
  };
  constructor() {
    super();
    EventSystem.on(RendererEvents.Resized, (canvas) => {
      this.CreateGBufferTextures();
    });
  }
  CreateGBufferTextures() {
    if (this.depthTexture) this.depthTexture.Destroy();
    if (this.gBufferAlbedoRT) this.gBufferAlbedoRT.Destroy();
    if (this.gBufferNormalRT) this.gBufferNormalRT.Destroy();
    if (this.gBufferERMORT) this.gBufferERMORT.Destroy();
    this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);
    this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, this.GBufferFormat);
    this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, this.GBufferFormat);
    this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, this.GBufferFormat);
  }
  async init(resources) {
    this.CreateGBufferTextures();
    this.initialized = true;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    if (!Camera.mainCamera) return;
    resources.setResource(PassParams.depthTexture, this.depthTexture);
    resources.setResource(PassParams.GBufferDepth, this.depthTexture);
    resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
    resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
    resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);
    resources.setResource(PassParams.Skybox, this.skybox);
    resources.setResource(PassParams.SkyboxIrradiance, this.skyboxIrradiance);
    resources.setResource(PassParams.SkyboxPrefilter, this.skyboxPrefilter);
    resources.setResource(PassParams.SkyboxBRDFLUT, this.skyboxBRDFLUT);
    const settings = new Float32Array([
      0,
      // +Debugger.isDebugDepthPassEnabled,
      0,
      // Debugger.debugDepthMipLevel,
      0,
      // Debugger.debugDepthExposure,
      0,
      // Renderer.info.viewTypeValue,
      0,
      // +Renderer.info.useHeightMapValue,
      0,
      // Debugger.heightScale,
      +DeferredShadowMapPassSettings.debugCascadesValue,
      DeferredShadowMapPassSettings.pcfResolutionValue,
      DeferredShadowMapPassSettings.blendThresholdValue,
      +DeferredShadowMapPassSettings.viewBlendThresholdValue,
      ...Camera.mainCamera.transform.position.elements,
      0,
      0,
      0
    ]);
    resources.setResource(PassParams.DebugSettings, settings);
    const camera = Camera.mainCamera;
    this.FrameBufferViews.projectionOutputSize.set([Renderer.width, Renderer.height, 0, 0]);
    this.FrameBufferViews.viewPosition.set([...camera.transform.position.elements, 0]);
    const tempMatrix = new Matrix4();
    this.FrameBufferViews.projectionInverseMatrix.set(tempMatrix.clone().copy(camera.projectionMatrix).invert().elements);
    this.FrameBufferViews.viewInverseMatrix.set(tempMatrix.clone().copy(camera.viewMatrix).invert().elements);
    this.FrameBufferViews.viewMatrix.set(camera.viewMatrix.elements);
    this.FrameBufferViews.projectionMatrix.set(camera.projectionMatrix.elements);
    resources.setResource(PassParams.FrameBuffer, this.FrameBufferValues);
  }
  async execute(resources) {
    const colorTargets = [
      { target: this.gBufferAlbedoRT, clear: true },
      { target: this.gBufferNormalRT, clear: true },
      { target: this.gBufferERMORT, clear: true }
    ];
    RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, { target: this.depthTexture, clear: true }, true);
    RendererContext.EndRenderPass();
    const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
    if (!LightingPassOutput) return;
    RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: true }], void 0, true);
    RendererContext.EndRenderPass();
  }
}

class DeferredGBufferPass extends RenderPass {
  name = "DeferredGBufferPass";
  modelMatrixBuffer;
  async init(resources) {
    this.modelMatrixBuffer = new DynamicBufferMemoryAllocator(16 * 4 * 1e3);
    this.initialized = true;
  }
  // TODO: This still has bugs...specially with SkinnedMeshes and/or Transformed meshes.
  // Disabled for now
  frustumCull(camera, meshes) {
    let nonOccluded = [];
    for (const mesh of meshes) {
      nonOccluded.push(mesh);
    }
    return nonOccluded;
  }
  async preFrame(resources) {
    this.drawCommands.length = 0;
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    const allMeshes = scene.GetComponents(Mesh);
    let renderableMeshes = [];
    for (const mesh of allMeshes) {
      if (!mesh.enabled || !mesh.gameObject.enabled || !mesh.geometry || !mesh.material) continue;
      renderableMeshes.push(mesh);
    }
    renderableMeshes = this.frustumCull(Camera.mainCamera, renderableMeshes);
    Renderer.info.visibleObjects += renderableMeshes.length;
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    if (renderableMeshes.length === 0 && instancedMeshes.length === 0) return;
    const inputCamera = Camera.mainCamera;
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const projectionMatrix = inputCamera.projectionMatrix;
    const viewMatrix = inputCamera.viewMatrix;
    for (const mesh of renderableMeshes) {
      const offset = this.modelMatrixBuffer.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
      const matrixIndex = offset / 16;
      const geometry = mesh.geometry;
      const material = mesh.material;
      if (material.params.isDeferred === false) continue;
      if (!material.shader) continue;
      const shader = material.shader;
      shader.SetMatrix4("projectionMatrix", projectionMatrix);
      shader.SetMatrix4("viewMatrix", viewMatrix);
      shader.SetBuffer("modelMatrix", this.modelMatrixBuffer.getBuffer());
      shader.SetVector3("cameraPosition", inputCamera.transform.position);
      if (mesh instanceof SkinnedMesh) {
        shader.SetBuffer("boneMatrices", mesh.GetBoneMatricesBuffer());
      }
      this.drawCommands.push({ geometry, shader, instanceCount: 1, firstInstance: matrixIndex });
      const position = geometry.attributes.get("position");
      Renderer.info.vertexCount += position.array.length / 3;
      Renderer.info.triangleCount += geometry.index ? geometry.index.array.length / 3 : position.array.length / 3;
    }
    for (const instancedMesh of instancedMeshes) {
      const geometry = instancedMesh.geometry;
      const material = instancedMesh.material;
      if (!geometry || !material || !material.shader || material.params.isDeferred === false) continue;
      const shader = material.shader;
      shader.SetMatrix4("projectionMatrix", projectionMatrix);
      shader.SetMatrix4("viewMatrix", viewMatrix);
      shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
      shader.SetVector3("cameraPosition", inputCamera.transform.position);
      this.drawCommands.push({ geometry, shader, instanceCount: instancedMesh.instanceCount + 1, firstInstance: 0 });
      const position = geometry.attributes.get("position");
      Renderer.info.vertexCount += position.array.length / 3 * instancedMesh.instanceCount;
      Renderer.info.triangleCount += (geometry.index ? geometry.index.array.length / 3 : position.array.length / 3) * instancedMesh.instanceCount;
    }
  }
  async execute(resources) {
    if (!this.initialized) return;
    if (this.drawCommands.length === 0) return;
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
    for (const draw of this.drawCommands) {
      RendererContext.DrawGeometry(draw.geometry, draw.shader, draw.instanceCount, draw.firstInstance);
    }
    resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
    resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
    resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
    resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);
    RendererContext.EndRenderPass();
  }
}

class ForwardPass extends RenderPass {
  name = "ForwardPass";
  projectionMatrix;
  viewMatrix;
  modelMatrices;
  async init(resources) {
    this.projectionMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
    this.viewMatrix = Buffer.Create(16 * 4, BufferType.STORAGE);
    this.modelMatrices = new DynamicBufferMemoryAllocator(16 * 4 * 10);
    this.initialized = true;
  }
  async preFrame(resources) {
    this.drawCommands.length = 0;
    const mainCamera = Camera.mainCamera;
    const scene = mainCamera.gameObject.scene;
    const meshes = scene.GetComponents(Mesh);
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    if (meshes.length === 0 && instancedMeshes.length === 0) return;
    this.projectionMatrix.SetArray(mainCamera.projectionMatrix.elements);
    this.viewMatrix.SetArray(mainCamera.viewMatrix.elements);
    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      const material = mesh.material;
      if (!geometry || !material) continue;
      if (!geometry.attributes.has("position")) continue;
      if (material.params.isDeferred === true) continue;
      if (!material.shader) continue;
      const offset = this.modelMatrices.set(mesh.id, mesh.transform.localToWorldMatrix.elements);
      const matrixIndex = offset / 16;
      material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
      material.shader.SetBuffer("viewMatrix", this.viewMatrix);
      material.shader.SetBuffer("modelMatrix", this.modelMatrices.getBuffer());
      this.drawCommands.push({ geometry, shader: material.shader, instanceCount: 1, firstInstance: matrixIndex });
    }
    for (const instancedMesh of instancedMeshes) {
      if (instancedMesh.instanceCount === 0) continue;
      const geometry = instancedMesh.geometry;
      const material = instancedMesh.material;
      if (!geometry || !material) continue;
      if (!geometry.attributes.has("position")) continue;
      if (material.params.isDeferred === true) continue;
      if (!material.shader) continue;
      material.shader.SetBuffer("projectionMatrix", this.projectionMatrix);
      material.shader.SetBuffer("viewMatrix", this.viewMatrix);
      material.shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
      this.drawCommands.push({ geometry, shader: material.shader, instanceCount: instancedMesh.instanceCount, firstInstance: 0 });
    }
  }
  async execute(resources) {
    if (this.drawCommands.length === 0) return;
    const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
    const DepthPassOutput = resources.getResource(PassParams.GBufferDepth);
    RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], { target: DepthPassOutput, clear: false }, true);
    for (const draw of this.drawCommands) {
      RendererContext.DrawGeometry(draw.geometry, draw.shader, draw.instanceCount, draw.firstInstance);
    }
    RendererContext.EndRenderPass();
  }
}

class IBLLightingPass extends RenderPass {
  name = "IBLLightingPass";
  shader;
  sampler;
  quadGeometry;
  initialized = false;
  async init() {
    this.shader = await Shader.Create({
      code: await ShaderLoader.IBLLighting,
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        albedoTexture: { group: 0, binding: 1, type: "texture" },
        normalTexture: { group: 0, binding: 2, type: "texture" },
        ermoTexture: { group: 0, binding: 3, type: "texture" },
        depthTexture: { group: 0, binding: 4, type: "depthTexture" },
        skyboxIrradianceTexture: { group: 0, binding: 7, type: "texture" },
        skyboxPrefilterTexture: { group: 0, binding: 8, type: "texture" },
        skyboxBRDFLUTTexture: { group: 0, binding: 9, type: "texture" },
        brdfSampler: { group: 0, binding: 10, type: "sampler" },
        view: { group: 0, binding: 13, type: "storage" }
      },
      colorOutputs: [{ format: "rgba16float", blendMode: "add" }]
    });
    this.sampler = TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    this.shader.SetSampler("textureSampler", this.sampler);
    const brdfSampler = TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat"
    });
    this.shader.SetSampler("brdfSampler", brdfSampler);
    this.quadGeometry = new Geometry();
    this.initialized = true;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    this.drawCommands.length = 0;
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    const inputSkyboxIrradiance = resources.getResource(PassParams.SkyboxIrradiance);
    const inputSkyboxPrefilter = resources.getResource(PassParams.SkyboxPrefilter);
    const inputSkyboxBRDFLUT = resources.getResource(PassParams.SkyboxBRDFLUT);
    const inputFrameBuffer = resources.getResource(PassParams.FrameBuffer);
    if (!inputGBufferAlbedo) return;
    if (!inputSkyboxIrradiance) return;
    this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
    this.shader.SetTexture("normalTexture", inputGBufferNormal);
    this.shader.SetTexture("ermoTexture", inputGbufferERMO);
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("skyboxIrradianceTexture", inputSkyboxIrradiance);
    this.shader.SetTexture("skyboxPrefilterTexture", inputSkyboxPrefilter);
    this.shader.SetTexture("skyboxBRDFLUTTexture", inputSkyboxBRDFLUT);
    this.shader.SetArray("view", inputFrameBuffer);
    this.drawCommands.push({ geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0 });
  }
  async execute(resources) {
    if (!this.initialized) return;
    if (this.drawCommands.length === 0) return;
    const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
    RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], void 0, true);
    for (const draw of this.drawCommands) {
      RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
    }
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.LightingPassOutput, LightingPassOutput);
  }
}

class SkyboxPass extends RenderPass {
  name = "SkyboxPass";
  shader;
  quadGeometry;
  initialized = false;
  async init() {
    this.shader = await Shader.Create({
      code: `
                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                };

                @group(0) @binding(0) var textureSampler: sampler;

                @group(0) @binding(4) var depthTexture: texture_depth_2d;

                @group(0) @binding(6) var skyboxTexture: texture_cube<f32>;

                struct View {
                    projectionOutputSize: vec4<f32>,
                    viewPosition: vec4<f32>,
                    projectionInverseMatrix: mat4x4<f32>,
                    viewInverseMatrix: mat4x4<f32>,
                    viewMatrix: mat4x4<f32>,
                    projectionMatrix: mat4x4<f32>,
                };
                @group(0) @binding(13) var<storage, read> view: View;


                // Full-screen triangle (covers screen with 3 verts)
                const p = array<vec2f, 3>(
                    vec2f(-1.0, -1.0),
                    vec2f( 3.0, -1.0),
                    vec2f(-1.0,  3.0)
                );

                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(p[vertexIndex], 0.0, 1.0);
                    return output;
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let pix   = vec2<i32>(floor(input.position.xy));

                    let depth = textureLoad(depthTexture, pix, 0);
                    
                    if (depth <= 0.9999999) {
                        discard;
                    }

                    // Build NDC + view/world rays (same as before)
                    let ndc = vec3<f32>(
                        (input.position.x / view.projectionOutputSize.x) * 2.0 - 1.0,
                        (input.position.y / view.projectionOutputSize.y) * 2.0 - 1.0,
                        1.0
                    );
                    let viewRay4 = view.projectionInverseMatrix * vec4(ndc, 1.0);
                    var viewRay  = normalize(viewRay4.xyz / viewRay4.w);
                    viewRay.y   *= -1.0;
                    var worldRay = normalize((view.viewInverseMatrix * vec4(viewRay, 0.0)).xyz);

                    let sky = textureSample(skyboxTexture, textureSampler, worldRay).rgb;
                    return vec4f(sky, 1.0);
                }
            `,
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        depthTexture: { group: 0, binding: 4, type: "depthTexture" },
        skyboxTexture: { group: 0, binding: 6, type: "texture" },
        view: { group: 0, binding: 13, type: "storage" }
      },
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.shader.SetSampler("textureSampler", TextureSampler.Create());
    this.quadGeometry = new Geometry();
    this.initialized = true;
  }
  async preFrame(resources) {
    if (!this.initialized) return;
    this.drawCommands.length = 0;
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    const inputSkybox = resources.getResource(PassParams.Skybox);
    const inputFrameBuffer = resources.getResource(PassParams.FrameBuffer);
    if (!inputGBufferDepth) return;
    if (!inputSkybox) return;
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("skyboxTexture", inputSkybox);
    this.shader.SetArray("view", inputFrameBuffer);
    this.drawCommands.push({ geometry: this.quadGeometry, shader: this.shader, instanceCount: 1, firstInstance: 0 });
  }
  async execute(resources) {
    if (!this.initialized) return;
    if (this.drawCommands.length === 0) return;
    const LightingPassOutput = resources.getResource(PassParams.LightingPassOutput);
    RendererContext.BeginRenderPass(this.name, [{ target: LightingPassOutput, clear: false }], void 0, true);
    for (const draw of this.drawCommands) {
      RendererContext.Draw(draw.geometry, draw.shader, 3, draw.instanceCount, draw.firstInstance);
    }
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.LightingPassOutput, LightingPassOutput);
  }
}

const PassParams = {
  DebugSettings: "DebugSettings",
  MainCamera: "MainCamera",
  depthTexture: "depthTexture",
  depthTexturePyramid: "depthTexturePyramid",
  GBufferAlbedo: "GBufferAlbedo",
  GBufferNormal: "GBufferNormal",
  GBufferERMO: "GBufferERMO",
  GBufferDepth: "GBufferDepth",
  Skybox: "Skybox",
  SkyboxIrradiance: "SkyboxIrradiance",
  SkyboxPrefilter: "SkyboxPrefilter",
  SkyboxBRDFLUT: "SkyboxBRDFLUT",
  ShadowPassDepth: "ShadowPassDepth",
  ShadowPassCascadeData: "ShadowPassCascadeData",
  LightsBuffer: "LightsBuffer",
  LightingPassOutput: "LightingPassOutput",
  FrameBuffer: "FrameBuffer"
};
var RenderPassOrder = /* @__PURE__ */ ((RenderPassOrder2) => {
  RenderPassOrder2[RenderPassOrder2["BeforeGBuffer"] = 0] = "BeforeGBuffer";
  RenderPassOrder2[RenderPassOrder2["AfterGBuffer"] = 1] = "AfterGBuffer";
  RenderPassOrder2[RenderPassOrder2["BeforeLighting"] = 2] = "BeforeLighting";
  RenderPassOrder2[RenderPassOrder2["AfterLighting"] = 3] = "AfterLighting";
  RenderPassOrder2[RenderPassOrder2["BeforeScreenOutput"] = 4] = "BeforeScreenOutput";
  return RenderPassOrder2;
})(RenderPassOrder || {});
class RenderingPipeline {
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
  get skyboxIrradiance() {
    return this.prepareGBuffersPass.skyboxIrradiance;
  }
  set skyboxIrradiance(skyboxIrradiance) {
    this.prepareGBuffersPass.skyboxIrradiance = skyboxIrradiance;
  }
  get skyboxPrefilter() {
    return this.prepareGBuffersPass.skyboxPrefilter;
  }
  set skyboxPrefilter(skyboxPrefilter) {
    this.prepareGBuffersPass.skyboxPrefilter = skyboxPrefilter;
  }
  get skyboxBRDFLUT() {
    return this.prepareGBuffersPass.skyboxBRDFLUT;
  }
  set skyboxBRDFLUT(skyboxBRDFLUT) {
    this.prepareGBuffersPass.skyboxBRDFLUT = skyboxBRDFLUT;
  }
  get GBufferFormat() {
    return this.prepareGBuffersPass.GBufferFormat;
  }
  DeferredShadowMapPass = new DeferredShadowMapPass();
  constructor(renderer) {
    this.renderer = renderer;
    this.prepareGBuffersPass = new PrepareGBuffers();
    this.renderGraph = new RenderGraph();
    this.beforeGBufferPasses = [
      this.prepareGBuffersPass
    ];
    this.afterGBufferPasses = [
      new DeferredGBufferPass(),
      this.DeferredShadowMapPass
    ];
    this.beforeLightingPasses = [];
    this.afterLightingPasses = [
      // new BasePass(), // Needs to blend instead of overwritting every pixel on lighting output (this does emissive)
      new DeferredLightingPass(),
      new IBLLightingPass(),
      new SkyboxPass(),
      new ForwardPass()
    ];
    this.beforeScreenOutputPasses = [
      new TextureViewer()
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
  async Render(scene) {
    Renderer.info.ResetFrame();
    const renderPipelineStart = performance.now();
    await this.renderGraph.preFrame();
    Renderer.BeginRenderFrame();
    await this.renderGraph.preRender();
    await this.renderGraph.execute();
    Renderer.EndRenderFrame();
    Renderer.info.cpuTime = performance.now() - renderPipelineStart;
    WEBGPUTimestampQuery.GetResult().then((frameTimes) => {
      if (frameTimes) {
        for (const [name, time] of frameTimes) {
          Renderer.info.SetPassTime(name, time);
        }
      }
    });
    const currentTime = performance.now();
    const elapsed = currentTime - this.previousTime;
    this.previousTime = currentTime;
    Renderer.info.fps = 1 / elapsed * 1e3;
    this.frame++;
  }
}

var index$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Buffer: Buffer,
    BufferMemoryAllocator: BufferMemoryAllocator,
    BufferType: BufferType,
    Compute: Compute,
    ComputeContext: ComputeContext,
    CubeTexture: CubeTexture,
    DepthTexture: DepthTexture,
    DynamicBuffer: DynamicBuffer,
    DynamicBufferMemoryAllocator: DynamicBufferMemoryAllocator,
    Material: Material,
    MemoryAllocator: MemoryAllocator,
    PassParams: PassParams,
    RenderPass: RenderPass,
    RenderPassOrder: RenderPassOrder,
    RenderTexture: RenderTexture,
    RenderTexture3D: RenderTexture3D,
    RenderTextureCube: RenderTextureCube,
    RenderTextureStorage2D: RenderTextureStorage2D,
    RenderTextureStorage3D: RenderTextureStorage3D,
    Renderer: Renderer,
    RendererContext: RendererContext,
    RenderingPipeline: RenderingPipeline,
    ResourcePool: ResourcePool,
    Shader: Shader,
    ShaderLoader: ShaderLoader,
    ShaderPreprocessor: ShaderPreprocessor,
    Texture: Texture,
    TextureArray: TextureArray,
    TextureSampler: TextureSampler,
    Topology: Topology
});

var KeyCodes = /* @__PURE__ */ ((KeyCodes2) => {
  KeyCodes2[KeyCodes2["CANCEL"] = 3] = "CANCEL";
  KeyCodes2[KeyCodes2["HELP"] = 6] = "HELP";
  KeyCodes2[KeyCodes2["BACK_SPACE"] = 8] = "BACK_SPACE";
  KeyCodes2[KeyCodes2["TAB"] = 9] = "TAB";
  KeyCodes2[KeyCodes2["CLEAR"] = 12] = "CLEAR";
  KeyCodes2[KeyCodes2["RETURN"] = 13] = "RETURN";
  KeyCodes2[KeyCodes2["ENTER"] = 14] = "ENTER";
  KeyCodes2[KeyCodes2["SHIFT"] = 16] = "SHIFT";
  KeyCodes2[KeyCodes2["CONTROL"] = 17] = "CONTROL";
  KeyCodes2[KeyCodes2["ALT"] = 18] = "ALT";
  KeyCodes2[KeyCodes2["PAUSE"] = 19] = "PAUSE";
  KeyCodes2[KeyCodes2["CAPS_LOCK"] = 20] = "CAPS_LOCK";
  KeyCodes2[KeyCodes2["ESCAPE"] = 27] = "ESCAPE";
  KeyCodes2[KeyCodes2["SPACE"] = 32] = "SPACE";
  KeyCodes2[KeyCodes2["PAGE_UP"] = 33] = "PAGE_UP";
  KeyCodes2[KeyCodes2["PAGE_DOWN"] = 34] = "PAGE_DOWN";
  KeyCodes2[KeyCodes2["END"] = 35] = "END";
  KeyCodes2[KeyCodes2["HOME"] = 36] = "HOME";
  KeyCodes2[KeyCodes2["LEFT"] = 37] = "LEFT";
  KeyCodes2[KeyCodes2["UP"] = 38] = "UP";
  KeyCodes2[KeyCodes2["RIGHT"] = 39] = "RIGHT";
  KeyCodes2[KeyCodes2["DOWN"] = 40] = "DOWN";
  KeyCodes2[KeyCodes2["PRINTSCREEN"] = 44] = "PRINTSCREEN";
  KeyCodes2[KeyCodes2["INSERT"] = 45] = "INSERT";
  KeyCodes2[KeyCodes2["DELETE"] = 46] = "DELETE";
  KeyCodes2[KeyCodes2["NUM_0"] = 48] = "NUM_0";
  KeyCodes2[KeyCodes2["NUM_1"] = 49] = "NUM_1";
  KeyCodes2[KeyCodes2["NUM_2"] = 50] = "NUM_2";
  KeyCodes2[KeyCodes2["NUM_3"] = 51] = "NUM_3";
  KeyCodes2[KeyCodes2["NUM_4"] = 52] = "NUM_4";
  KeyCodes2[KeyCodes2["NUM_5"] = 53] = "NUM_5";
  KeyCodes2[KeyCodes2["NUM_6"] = 54] = "NUM_6";
  KeyCodes2[KeyCodes2["NUM_7"] = 55] = "NUM_7";
  KeyCodes2[KeyCodes2["NUM_8"] = 56] = "NUM_8";
  KeyCodes2[KeyCodes2["NUM_9"] = 57] = "NUM_9";
  KeyCodes2[KeyCodes2["SEMICOLON"] = 59] = "SEMICOLON";
  KeyCodes2[KeyCodes2["EQUALS"] = 61] = "EQUALS";
  KeyCodes2[KeyCodes2["A"] = 65] = "A";
  KeyCodes2[KeyCodes2["B"] = 66] = "B";
  KeyCodes2[KeyCodes2["C"] = 67] = "C";
  KeyCodes2[KeyCodes2["D"] = 68] = "D";
  KeyCodes2[KeyCodes2["E"] = 69] = "E";
  KeyCodes2[KeyCodes2["F"] = 70] = "F";
  KeyCodes2[KeyCodes2["G"] = 71] = "G";
  KeyCodes2[KeyCodes2["H"] = 72] = "H";
  KeyCodes2[KeyCodes2["I"] = 73] = "I";
  KeyCodes2[KeyCodes2["J"] = 74] = "J";
  KeyCodes2[KeyCodes2["K"] = 75] = "K";
  KeyCodes2[KeyCodes2["L"] = 76] = "L";
  KeyCodes2[KeyCodes2["M"] = 77] = "M";
  KeyCodes2[KeyCodes2["N"] = 78] = "N";
  KeyCodes2[KeyCodes2["O"] = 79] = "O";
  KeyCodes2[KeyCodes2["P"] = 80] = "P";
  KeyCodes2[KeyCodes2["Q"] = 81] = "Q";
  KeyCodes2[KeyCodes2["R"] = 82] = "R";
  KeyCodes2[KeyCodes2["S"] = 83] = "S";
  KeyCodes2[KeyCodes2["T"] = 84] = "T";
  KeyCodes2[KeyCodes2["U"] = 85] = "U";
  KeyCodes2[KeyCodes2["V"] = 86] = "V";
  KeyCodes2[KeyCodes2["W"] = 87] = "W";
  KeyCodes2[KeyCodes2["X"] = 88] = "X";
  KeyCodes2[KeyCodes2["Y"] = 89] = "Y";
  KeyCodes2[KeyCodes2["Z"] = 90] = "Z";
  KeyCodes2[KeyCodes2["CONTEXT_MENU"] = 93] = "CONTEXT_MENU";
  KeyCodes2[KeyCodes2["NUMPAD0"] = 96] = "NUMPAD0";
  KeyCodes2[KeyCodes2["NUMPAD1"] = 97] = "NUMPAD1";
  KeyCodes2[KeyCodes2["NUMPAD2"] = 98] = "NUMPAD2";
  KeyCodes2[KeyCodes2["NUMPAD3"] = 99] = "NUMPAD3";
  KeyCodes2[KeyCodes2["NUMPAD4"] = 100] = "NUMPAD4";
  KeyCodes2[KeyCodes2["NUMPAD5"] = 101] = "NUMPAD5";
  KeyCodes2[KeyCodes2["NUMPAD6"] = 102] = "NUMPAD6";
  KeyCodes2[KeyCodes2["NUMPAD7"] = 103] = "NUMPAD7";
  KeyCodes2[KeyCodes2["NUMPAD8"] = 104] = "NUMPAD8";
  KeyCodes2[KeyCodes2["NUMPAD9"] = 105] = "NUMPAD9";
  KeyCodes2[KeyCodes2["MULTIPLY"] = 106] = "MULTIPLY";
  KeyCodes2[KeyCodes2["ADD"] = 107] = "ADD";
  KeyCodes2[KeyCodes2["SEPARATOR"] = 108] = "SEPARATOR";
  KeyCodes2[KeyCodes2["SUBTRACT"] = 109] = "SUBTRACT";
  KeyCodes2[KeyCodes2["DECIMAL"] = 110] = "DECIMAL";
  KeyCodes2[KeyCodes2["DIVIDE"] = 111] = "DIVIDE";
  KeyCodes2[KeyCodes2["F1"] = 112] = "F1";
  KeyCodes2[KeyCodes2["F2"] = 113] = "F2";
  KeyCodes2[KeyCodes2["F3"] = 114] = "F3";
  KeyCodes2[KeyCodes2["F4"] = 115] = "F4";
  KeyCodes2[KeyCodes2["F5"] = 116] = "F5";
  KeyCodes2[KeyCodes2["F6"] = 117] = "F6";
  KeyCodes2[KeyCodes2["F7"] = 118] = "F7";
  KeyCodes2[KeyCodes2["F8"] = 119] = "F8";
  KeyCodes2[KeyCodes2["F9"] = 120] = "F9";
  KeyCodes2[KeyCodes2["F10"] = 121] = "F10";
  KeyCodes2[KeyCodes2["F11"] = 122] = "F11";
  KeyCodes2[KeyCodes2["F12"] = 123] = "F12";
  KeyCodes2[KeyCodes2["F13"] = 124] = "F13";
  KeyCodes2[KeyCodes2["F14"] = 125] = "F14";
  KeyCodes2[KeyCodes2["F15"] = 126] = "F15";
  KeyCodes2[KeyCodes2["F16"] = 127] = "F16";
  KeyCodes2[KeyCodes2["F17"] = 128] = "F17";
  KeyCodes2[KeyCodes2["F18"] = 129] = "F18";
  KeyCodes2[KeyCodes2["F19"] = 130] = "F19";
  KeyCodes2[KeyCodes2["F20"] = 131] = "F20";
  KeyCodes2[KeyCodes2["F21"] = 132] = "F21";
  KeyCodes2[KeyCodes2["F22"] = 133] = "F22";
  KeyCodes2[KeyCodes2["F23"] = 134] = "F23";
  KeyCodes2[KeyCodes2["F24"] = 135] = "F24";
  KeyCodes2[KeyCodes2["NUM_LOCK"] = 144] = "NUM_LOCK";
  KeyCodes2[KeyCodes2["SCROLL_LOCK"] = 145] = "SCROLL_LOCK";
  KeyCodes2[KeyCodes2["COMMA"] = 188] = "COMMA";
  KeyCodes2[KeyCodes2["PERIOD"] = 190] = "PERIOD";
  KeyCodes2[KeyCodes2["SLASH"] = 191] = "SLASH";
  KeyCodes2[KeyCodes2["BACK_QUOTE"] = 192] = "BACK_QUOTE";
  KeyCodes2[KeyCodes2["OPEN_BRACKET"] = 219] = "OPEN_BRACKET";
  KeyCodes2[KeyCodes2["BACK_SLASH"] = 220] = "BACK_SLASH";
  KeyCodes2[KeyCodes2["CLOSE_BRACKET"] = 221] = "CLOSE_BRACKET";
  KeyCodes2[KeyCodes2["QUOTE"] = 222] = "QUOTE";
  KeyCodes2[KeyCodes2["META"] = 224] = "META";
  return KeyCodes2;
})(KeyCodes || {});
var MouseCodes = /* @__PURE__ */ ((MouseCodes2) => {
  MouseCodes2[MouseCodes2["MOUSE_LEFT"] = 0] = "MOUSE_LEFT";
  MouseCodes2[MouseCodes2["MOUSE_RIGHT"] = 1] = "MOUSE_RIGHT";
  MouseCodes2[MouseCodes2["MOUSE_MIDDLE"] = 2] = "MOUSE_MIDDLE";
  return MouseCodes2;
})(MouseCodes || {});
class Input {
  static keysDown = {};
  static keysUp = {};
  static mouseDown = {};
  static mouseUp = {};
  static mousePosition = new Vector2();
  static horizontalAxis = 0;
  static verticalAxis = 0;
  static previousTouch = new Vector2();
  static initialized = false;
  static Init() {
    if (this.initialized === true) return;
    if (!Renderer.canvas) throw Error("Renderer has no canvas.");
    document.onkeydown = (event) => {
      this.OnKeyDown(event);
    };
    document.onkeyup = (event) => {
      this.OnKeyUp(event);
    };
    document.onmousemove = (event) => {
      this.OnMouseMove(event);
    };
    document.onmousedown = (event) => {
      this.OnMouseDown(event);
    };
    document.onmouseup = (event) => {
      this.OnMouseUp(event);
    };
    document.ontouchmove = (event) => {
      this.OnTouchMove(event);
    };
    this.initialized = true;
  }
  static OnTouchMove(event) {
    event.preventDefault();
    this.mousePosition.x = event.touches[0].clientX;
    this.mousePosition.y = event.touches[0].clientY;
    this.horizontalAxis += Math.round(this.mousePosition.x - this.previousTouch.x);
    this.verticalAxis += Math.round(this.mousePosition.y - this.previousTouch.y);
    this.previousTouch.set(this.mousePosition.x, this.mousePosition.y);
  }
  static OnMouseMove(event) {
    this.mousePosition.x = event.clientX;
    this.mousePosition.y = event.clientY;
    this.horizontalAxis += event.movementX;
    this.verticalAxis += event.movementY;
  }
  static OnKeyDown(event) {
    if (this.keysDown[event.keyCode] === void 0) {
      this.keysDown[event.keyCode] = Renderer.info.frame;
      delete this.keysUp[event.keyCode];
    }
  }
  static OnKeyUp(event) {
    this.keysUp[event.keyCode] = Renderer.info.frame;
    delete this.keysDown[event.keyCode];
  }
  static OnMouseDown(event) {
    if (this.mouseDown[event.button] === void 0) {
      this.mouseDown[event.button] = Renderer.info.frame;
      delete this.keysUp[event.button];
    }
  }
  static OnMouseUp(event) {
    this.mouseUp[event.button] = Renderer.info.frame;
    delete this.mouseDown[event.button];
  }
  static Update() {
    if (!this.initialized) return;
    this.horizontalAxis = 0;
    this.verticalAxis = 0;
  }
  /**
   * Checks if the specified key was pressed down during the current frame.
   * This method only returns true once per key down event, the key needs to be released 
   * and pressed again in order for the condition to be true once more.
   * 
   * @param {KeyCodes} key - Key to check for press event.
   * @returns {boolean} - True if the key was pressed down during this frame.
   */
  static GetKeyDown(key) {
    this.Init();
    if (this.keysDown[key] == Renderer.info.frame - 1) {
      return true;
    }
    return false;
  }
  /**
   * Checks if the specified key was released during the current frame.
   * This method only returns true once per release event, the key needs to be pressed down 
   * and released again in order for the condition to be true once more.
   * 
   * @param {KeyCodes} key - Key to check for release event.
   * @returns {boolean} - True if the key was released during this frame.
   */
  static GetKeyUp(key) {
    this.Init();
    if (this.keysUp[key] == Renderer.info.frame - 1) {
      return true;
    }
    return false;
  }
  /**
   * Checks if the specified key is pressed down.
   * This method returns true while the key is pressed down.
   * 
   * @param {KeyCodes} key - Key to check for press down event.
   * @returns {boolean} - True if the key is being pressed down.
   */
  static GetKey(key) {
    this.Init();
    if (this.keysDown[key] !== void 0) {
      return true;
    }
    return false;
  }
  static GetMouseDown(key) {
    this.Init();
    if (this.mouseDown[key] == Renderer.info.frame - 1) {
      return true;
    }
    return false;
  }
  static GetMouseUp(key) {
    this.Init();
    if (this.mouseUp[key] == Renderer.info.frame - 1) {
      return true;
    }
    return false;
  }
  /**
   * Gets the mouse position difference between the previous frame and the current frame.
   * This method works with both the mouse and touch events.
   * 
   * @param {"Horizontal"|"Vertical"} axisName - Axis to query.
   * @returns {number} - Mouse difference between the previous frame and the current fram.
   */
  static GetAxis(axisName) {
    this.Init();
    if (axisName == "Horizontal") {
      return this.horizontalAxis;
    } else if (axisName == "Vertical") {
      return this.verticalAxis;
    }
  }
}

class AnimationClip {
  name;
  channels;
  duration;
  constructor(name, channels, duration) {
    this.name = name;
    this.channels = channels;
    this.duration = duration;
  }
}
class AnimationState {
  clip;
  time = 0;
  speed = 1;
  constructor(clip, speed = 1) {
    this.clip = clip;
    this.speed = speed;
  }
}
class Animator extends Component {
  clips;
  playing;
  clipIndex;
  previousTime;
  // --- blending state ---
  current;
  next;
  fadeDuration = 0;
  fadeTime = 0;
  constructor(gameObject) {
    super(gameObject);
    this.clips = [];
    this.playing = false;
    this.clipIndex = 0;
  }
  SetClipByIndex(i, speed = 1) {
    this.clipIndex = Math.max(0, Math.min(i, this.clips.length - 1));
    const clip = this.clips[this.clipIndex];
    this.current = clip ? new AnimationState(clip, speed) : void 0;
    this.next = void 0;
    this.fadeDuration = 0;
    this.fadeTime = 0;
    this.playing = true;
  }
  // Start a crossfade into another clip over `duration` seconds
  CrossFadeTo(i, duration = 0.25, speed = 1) {
    if (this.clips.length === 0) return;
    const targetIdx = Math.max(0, Math.min(i, this.clips.length - 1));
    const target = this.clips[targetIdx];
    if (!target) return;
    if (!this.current) {
      this.SetClipByIndex(targetIdx);
      return;
    }
    this.next = new AnimationState(target, speed);
    this.fadeDuration = Math.max(1e-4, duration);
    this.fadeTime = 0;
    this.playing = true;
  }
  Start() {
    this.previousTime = performance.now();
  }
  Update() {
    const now = performance.now();
    const dt = (now - this.previousTime) / 1e3;
    this.previousTime = now;
    if (!this.playing || !this.current) return;
    this.current.time += dt * this.current.speed;
    if (this.next) {
      this.next.time += dt * this.next.speed;
      this.fadeTime += dt;
    }
    if (!this.next) {
      this.apply(this.current.clip, this.current.time);
    } else {
      const alpha = Math.min(1, this.fadeTime / this.fadeDuration);
      this.applyBlended(this.current.clip, this.current.time, this.next.clip, this.next.time, alpha);
      if (alpha >= 1) {
        this.current = this.next;
        this.next = void 0;
        this.fadeDuration = 0;
        this.fadeTime = 0;
      }
    }
  }
  // unchanged sampler
  sampleSampler(sampler, t, out) {
    const times = sampler.times;
    const lastT = times[sampler.keyCount - 1];
    const time = sampler.keyCount > 1 ? t % lastT : 0;
    let i1 = 0;
    while (i1 < sampler.keyCount && times[i1] < time) ++i1;
    if (i1 === 0) i1 = 1;
    if (i1 >= sampler.keyCount) i1 = sampler.keyCount - 1;
    const i0 = i1 - 1;
    const t0 = times[i0];
    const t1 = times[i1];
    const u = t1 > t0 ? (time - t0) / (t1 - t0) : 0;
    const c = sampler.compCount;
    const base0 = i0 * c;
    const base1 = i1 * c;
    if (c === 4 && out instanceof Quaternion) {
      const qa = sampler.values.subarray(base0, base0 + 4);
      const qb = sampler.values.subarray(base1, base1 + 4);
      const _qa = new Quaternion(...qa);
      const _qb = new Quaternion(...qb);
      out.copy(_qa).slerp(_qb, u);
    } else if (c === 3 && out instanceof Vector3) {
      const a = sampler.values.subarray(base0, base0 + 3);
      const b = sampler.values.subarray(base1, base1 + 3);
      const _a = new Vector3(...a);
      const _b = new Vector3(...b);
      out.copy(_a).lerp(_b, u);
    } else {
      throw Error("Not implemented");
    }
    return out;
  }
  // find a channel in `clip` matching the same target transform & path
  findChannel(clip, target, path) {
    return clip.channels.find((ch) => ch.targetTransform === target && ch.path === path);
  }
  // original apply (no blend)
  apply(clip, time) {
    for (const ch of clip.channels) {
      switch (ch.path) {
        case "translation":
          this.sampleSampler(ch.sampler, time, ch.targetTransform.position);
          break;
        case "scale":
          this.sampleSampler(ch.sampler, time, ch.targetTransform.scale);
          break;
        case "rotation":
          this.sampleSampler(ch.sampler, time, ch.targetTransform.rotation).normalize();
          break;
      }
    }
  }
  // blended apply between two clips at times tA/tB and factor alpha
  applyBlended(clipA, tA, clipB, tB, alpha) {
    const visited = /* @__PURE__ */ new Set();
    const tmpV0 = new Vector3();
    const tmpV1 = new Vector3();
    const tmpQ0 = new Quaternion();
    const tmpQ1 = new Quaternion();
    for (const chA of clipA.channels) {
      visited.add(chA);
      const chB = this.findChannel(clipB, chA.targetTransform, chA.path);
      const tr = chA.targetTransform;
      if (chA.path === "translation") {
        this.sampleSampler(chA.sampler, tA, tmpV0);
        if (chB) this.sampleSampler(chB.sampler, tB, tmpV1);
        tr.position.copy(chB ? tmpV0.lerp(tmpV1, alpha) : tmpV0);
      } else if (chA.path === "scale") {
        this.sampleSampler(chA.sampler, tA, tmpV0);
        if (chB) this.sampleSampler(chB.sampler, tB, tmpV1);
        tr.scale.copy(chB ? tmpV0.lerp(tmpV1, alpha) : tmpV0);
      } else if (chA.path === "rotation") {
        this.sampleSampler(chA.sampler, tA, tmpQ0);
        if (chB) this.sampleSampler(chB.sampler, tB, tmpQ1);
        tr.rotation.copy(chB ? tmpQ0.slerp(tmpQ1, alpha) : tmpQ0).normalize();
      }
    }
    for (const chB of clipB.channels) {
      const chA = this.findChannel(clipA, chB.targetTransform, chB.path);
      if (chA) continue;
      const tr = chB.targetTransform;
      if (chB.path === "translation") {
        this.sampleSampler(chB.sampler, tB, tmpV1);
        tr.position.lerp(tmpV1, alpha);
      } else if (chB.path === "scale") {
        this.sampleSampler(chB.sampler, tB, tmpV1);
        tr.scale.lerp(tmpV1, alpha);
      } else if (chB.path === "rotation") {
        this.sampleSampler(chB.sampler, tB, tmpQ1);
        tr.rotation.slerp(tmpQ1, alpha).normalize();
      }
    }
  }
}

var index = /*#__PURE__*/Object.freeze({
    __proto__: null,
    AnimationClip: AnimationClip,
    Animator: Animator,
    Camera: Camera,
    Component: Component,
    DirectionalLight: DirectionalLight,
    InstancedMesh: InstancedMesh,
    Light: Light,
    Mesh: Mesh,
    PointLight: PointLight,
    Skin: Skin,
    SkinnedMesh: SkinnedMesh,
    SpotLight: SpotLight,
    Transform: Transform,
    TransformEvents: TransformEvents
});

function getCtorChain(ctor) {
  const chain = [];
  for (let c = ctor; c && c !== Component; c = Object.getPrototypeOf(c)) {
    chain.push(c);
  }
  return chain;
}
class Scene {
  static Events = {
    OnStarted: (scene) => {
    }
  };
  renderer;
  name = "Default scene";
  id = UUID();
  _hasStarted = false;
  get hasStarted() {
    return this._hasStarted;
  }
  gameObjects = [];
  toUpdate = /* @__PURE__ */ new Map();
  componentsByType = /* @__PURE__ */ new Map();
  renderPipeline;
  static mainScene;
  previousTime = 0;
  constructor(renderer) {
    this.renderer = renderer;
    this.renderPipeline = new RenderingPipeline(this.renderer);
    if (!Scene.mainScene) Scene.mainScene = this;
    EventSystem.on(ComponentEvents.CallUpdate, (component, flag) => {
      if (flag) this.toUpdate.set(component, true);
      else this.toUpdate.delete(component);
    });
    EventSystem.on(ComponentEvents.AddedComponent, (component, scene) => {
      if (scene !== this) return;
      for (const ctor of getCtorChain(component.constructor)) {
        let arr = this.componentsByType.get(ctor);
        if (!arr) this.componentsByType.set(ctor, arr = []);
        if (!arr.includes(component)) arr.push(component);
      }
    });
    EventSystem.on(ComponentEvents.RemovedComponent, (component, scene) => {
      if (scene !== this) return;
      for (const ctor of getCtorChain(component.constructor)) {
        const arr = this.componentsByType.get(ctor);
        if (arr) {
          const i = arr.indexOf(component);
          if (i >= 0) arr.splice(i, 1);
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
  GetComponents(Ctor) {
    return this.componentsByType.get(Ctor) ?? [];
  }
  RemoveGameObject(gameObject) {
    const i = this.gameObjects.indexOf(gameObject);
    if (i !== -1) this.gameObjects.splice(i, 1);
    for (const component of gameObject.GetComponents()) {
      for (const ctor of getCtorChain(component.constructor)) {
        const arr = this.componentsByType.get(ctor);
        if (!arr) continue;
        const j = arr.indexOf(component);
        if (j !== -1) arr.splice(j, 1);
        if (arr.length === 0) this.componentsByType.delete(ctor);
      }
    }
  }
  Start() {
    if (this.hasStarted) return;
    for (const gameObject of this.gameObjects) gameObject.Start();
    this._hasStarted = true;
    EventSystem.emit(Scene.Events.OnStarted, this);
    Renderer.info.frame = 0;
    this.previousTime = performance.now();
    this.Tick();
  }
  Tick() {
    Renderer.info.frame++;
    const currentTime = performance.now();
    Renderer.info.deltaTime = currentTime - this.previousTime;
    this.previousTime = currentTime;
    for (const [component, _] of this.toUpdate) {
      if (component.gameObject.enabled === false) continue;
      if (!component.hasStarted) {
        component.Start();
        component.hasStarted = true;
      }
      component.Update();
    }
    this.renderPipeline.Render(this);
    Input.Update();
    requestAnimationFrame(() => this.Tick());
  }
  Serialize() {
    let serializedScene = { name: this.name, mainCamera: Camera.mainCamera.id, gameObjects: [] };
    for (const gameObject of this.gameObjects) {
      serializedScene.gameObjects.push(gameObject.Serialize());
    }
    return serializedScene;
  }
  Deserialize(data) {
    for (const serializedGameObject of data.gameObjects) {
      const gameObject = new GameObject(this);
      gameObject.Deserialize(serializedGameObject);
    }
    for (const gameObject of this.gameObjects) {
      for (const component of gameObject.GetComponents(Camera)) {
        if (component.id === data.mainCamera) {
          Camera.mainCamera = component;
        }
      }
    }
  }
  static serializedCache = /* @__PURE__ */ new Map();
  static Instantiate(gameObject, position, rotation) {
    let serializedGameObject = Scene.serializedCache.get(gameObject.id);
    if (!serializedGameObject) {
      serializedGameObject = gameObject.Serialize({ base64Textures: false });
      Scene.serializedCache.set(gameObject.id, serializedGameObject);
    }
    const newGameObject = new GameObject(Scene.mainScene);
    newGameObject.Deserialize(serializedGameObject);
    if (position) newGameObject.transform.position.copy(position);
    if (rotation) newGameObject.transform.rotation.copy(rotation);
    return newGameObject;
  }
}

export { Assets, Component, index as Components, EventSystem, EventSystemLocal, index$1 as GPU, GameObject, Geometry, IndexAttribute, Input, InterleavedVertexAttribute, KeyCodes, index$2 as Mathf, MouseCodes, PBRMaterial, Renderer, Scene, Texture, index$3 as Utils, VertexAttribute };
