var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

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

// src/components/Camera.ts
var Camera = class _Camera extends Component {
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
    this.projectionMatrix.orthoZO(left, right, top, bottom, near, far);
  }
  Start() {
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

// src/renderer/webgpu/WEBGPURenderer.ts
var adapter = navigator ? await navigator.gpu.requestAdapter() : null;
if (!adapter) throw Error("WEBGPU not supported");
var requiredLimits = {};
for (const key in adapter.limits) requiredLimits[key] = adapter.limits[key];
var device = adapter ? await adapter.requestDevice({
  requiredFeatures: ["timestamp-query"],
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
    console.log(adapter);
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

// src/renderer/webgpu/WEBGPUBuffer.ts
var BaseBuffer = class {
  buffer;
  size;
  set name(name) {
    this.buffer.label = name;
  }
  get name() {
    return this.buffer.label;
  }
  constructor(sizeInBytes, type) {
    let usage = void 0;
    if (type == 0 /* STORAGE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 1 /* STORAGE_WRITE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 3 /* VERTEX */) usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 4 /* INDEX */) usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 2 /* UNIFORM */) usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 5 /* INDIRECT */) usage = GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
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
var Buffer3 = class {
  size;
  set name(name) {
  }
  get name() {
    return "Buffer";
  }
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

// src/renderer/Texture.ts
var Texture = class {
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
var DepthTexture = class extends Texture {
  static Create(width, height, depth = 1, format = "depth24plus") {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d");
    throw Error("Renderer type invalid");
  }
};

// src/renderer/webgpu/shader/wgsl/DeferredMeshShader.wgsl
var DeferredMeshShader_default = 'struct VertexInput {\n    @builtin(instance_index) instanceIdx : u32, \n    @location(0) position : vec3<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vPosition : vec3<f32>,\n    @location(1) vNormal : vec3<f32>,\n    @location(2) vUv : vec2<f32>,\n    @location(3) @interpolate(flat) instance : u32,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n\n@group(0) @binding(4) var TextureSampler: sampler;\n\n// These get optimized out based on "USE*" defines\n@group(0) @binding(5) var AlbedoMap: texture_2d<f32>;\n@group(0) @binding(6) var NormalMap: texture_2d<f32>;\n@group(0) @binding(7) var HeightMap: texture_2d<f32>;\n@group(0) @binding(8) var RoughnessMap: texture_2d<f32>;\n@group(0) @binding(9) var MetalnessMap: texture_2d<f32>;\n@group(0) @binding(10) var EmissiveMap: texture_2d<f32>;\n@group(0) @binding(11) var AOMap: texture_2d<f32>;\n\n\n@group(0) @binding(12) var<storage, read> cameraPosition: vec3<f32>;\n\n\nstruct Material {\n    AlbedoColor: vec4<f32>,\n    EmissiveColor: vec4<f32>,\n    Roughness: f32,\n    Metalness: f32,\n    Unlit: f32\n};\n@group(0) @binding(3) var<storage, read> material: Material;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output : VertexOutput;\n\n    var modelMatrixInstance = modelMatrix[input.instanceIdx];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n\n    output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);\n    \n    output.vPosition = input.position;\n    output.vNormal = input.normal;\n    output.vUv = input.uv;\n\n    output.instance = input.instanceIdx;\n\n    return output;\n}\n\nstruct FragmentOutput {\n    @location(0) albedo : vec4f,\n    @location(1) normal : vec4f,\n    @location(2) RMO : vec4f,\n};\n\nfn inversesqrt(v: f32) -> f32 {\n    return 1.0 / sqrt(v);\n}\n\nfn getNormalFromMap(N: vec3f, p: vec3f, uv: vec2f ) -> mat3x3<f32> {\n    // get edge vectors of the pixel triangle\n    let dp1 = dpdx( p );\n    let dp2 = dpdy( p );\n    let duv1 = dpdx( uv );\n    let duv2 = dpdy( uv );\n\n    // solve the linear system\n    let dp2perp = cross( dp2, N );\n    let dp1perp = cross( N, dp1 );\n    let T = dp2perp * duv1.x + dp1perp * duv2.x;\n    let B = dp2perp * duv1.y + dp1perp * duv2.y;\n\n    // construct a scale-invariant frame \n    let invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );\n    return mat3x3( T * invmax, B * invmax, N );\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> FragmentOutput {\n    var output: FragmentOutput;\n\n    let mat = material;\n\n    var uv = input.vUv;// * vec2(4.0, 2.0);\n    let tbn = getNormalFromMap(input.vNormal, input.vPosition, uv);\n    var modelMatrixInstance = modelMatrix[input.instance];\n\n    #if USE_HEIGHT_MAP\n        var viewDirection = normalize(cameraPosition - (modelMatrixInstance * vec4(input.vPosition, 1.0)).xyz);\n        // var viewDirection = normalize(cameraPosition - input.vPosition);\n\n        // Variables that control parallax occlusion mapping quality\n        let heightScale = 0.05;\n        let minLayers = 8.0;\n        let maxLayers = 64.0;\n        let numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 1.0, 0.0), viewDirection)));\n        let layerDepth = 1.0f / numLayers;\n        var currentLayerDepth = 0.0;\n        \n        // Remove the z division if you want less aberated results\n        let S = viewDirection.xz  * heightScale; \n        let deltaUVs = S / numLayers;\n        \n        var UVs = uv;\n        var currentDepthMapValue = 1.0 - textureSample(HeightMap, TextureSampler, UVs).r;\n        \n        // Loop till the point on the heightmap is "hit"\n        while(currentLayerDepth < currentDepthMapValue) {\n            UVs -= deltaUVs;\n            currentDepthMapValue = 1.0 - textureSampleLevel(HeightMap, TextureSampler, UVs, 0).r;\n            currentLayerDepth += layerDepth;\n        }\n\n\n        // Apply Occlusion (interpolation with prev value)\n        let prevTexCoords = UVs + deltaUVs;\n        let afterDepth  = currentDepthMapValue - currentLayerDepth;\n        let beforeDepth = 1.0 - textureSample(HeightMap, TextureSampler, prevTexCoords).r - currentLayerDepth + layerDepth;\n        let weight = afterDepth / (afterDepth - beforeDepth);\n        // UVs = prevTexCoords * weight + UVs * (1.0f - weight);\n        UVs = mix(UVs, prevTexCoords, weight);\n\n        // // Get rid of anything outside the normal range\n        // if(UVs.x > 1.0 || UVs.y > 1.0 || UVs.x < 0.0 || UVs.y < 0.0) {\n        //     discard;\n        // }\n        uv = UVs;\n\n\n        // // Parallax occlusion mapping\n        // let prev_uv = UVs + deltaUVs;\n        // let next = currentDepthMapValue - currentLayerDepth;\n        // let prev = textureSampleLevel(HeightMap, TextureSampler, prevTexCoords, 0).r - currentLayerDepth\n        //                 + layer_depth;\n        // let weight = next / (next - prev);\n        // uv = mix(UVs, prev_uv, weight);\n\n        // uv = parallax_uv(uv, viewDirection, 3);\n            \n    #endif\n    \n\n    var albedo = mat.AlbedoColor;\n    var roughness = mat.Roughness;\n    var metalness = mat.Metalness;\n    var occlusion = 1.0;\n    var unlit = mat.Unlit;\n\n    // var albedo = mat.AlbedoColor;\n    #if USE_ALBEDO_MAP\n        albedo *= textureSample(AlbedoMap, TextureSampler, uv);\n    #endif\n\n    var normal: vec3f = input.vNormal;\n    #if USE_NORMAL_MAP\n        let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;\n        normal = tbn * normalSample;\n\n        // let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;\n        // normal = normalSample.xyz;\n    #endif\n    // Should be normal matrix\n    normal = normalize(modelMatrixInstance * vec4(vec3(normal), 0.0)).xyz;\n\n    #if USE_ROUGHNESS_MAP\n        roughness *= textureSample(RoughnessMap, TextureSampler, uv).r;\n    #endif\n\n    #if USE_METALNESS_MAP\n        metalness *= textureSample(MetalnessMap, TextureSampler, uv).r;\n    #endif\n\n    var emissive = mat.EmissiveColor;\n    #if USE_EMISSIVE_MAP\n        emissive *= textureSample(EmissiveMap, TextureSampler, uv);\n    #endif\n\n    #if USE_AO_MAP\n        occlusion = textureSample(AOMap, TextureSampler, uv).r;\n        occlusion = 1.0;\n    #endif\n\n    output.normal = vec4(normal, 1.0);\n    output.albedo = albedo;\n    output.RMO = vec4(roughness, metalness, occlusion, unlit);\n    \n    output.albedo = vec4(albedo.rgb, roughness);\n    output.normal = vec4(normal.xyz, metalness);\n    output.RMO = vec4(emissive.rgb, unlit);\n\n    return output;\n}';

// src/renderer/webgpu/shader/wgsl/WireframeShader.wgsl
var WireframeShader_default = "struct VertexInput {\n    @builtin(instance_index) instanceID : u32,\n	@builtin(vertex_index) vertexID : u32,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n};\n\n@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;\n@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;\n@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;\n@group(0) @binding(3) var<storage, read> indices: array<u32>;\n@group(0) @binding(4) var<storage, read> positions: array<f32>;\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n	var localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);\n\n	var triangleIndex = input.vertexID / 6u;\n	var localVertexIndex = input.vertexID % 6u;\n\n	var elementIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];\n	var elementIndex = indices[elementIndexIndex];\n\n	var position = vec4<f32>(\n		positions[3u * elementIndex + 0u],\n		positions[3u * elementIndex + 1u],\n		positions[3u * elementIndex + 2u],\n		1.0\n	);\n\n	var output : VertexOutput;\n    var modelMatrixInstance = modelMatrix[input.instanceID];\n    var modelViewMatrix = viewMatrix * modelMatrixInstance;\n	output.position = projectionMatrix * modelViewMatrix * position;\n\n	return output;\n}\n\n@fragment\nfn fragmentMain(fragData: VertexOutput) -> @location(0) vec4<f32> {\n    return vec4(1.0, 0.0, 0.0, 1.0);\n}";

// src/renderer/webgpu/shader/wgsl/DeferredLightingPBRShader.wgsl
var DeferredLightingPBRShader_default = 'struct VertexInput {\n    @location(0) position : vec2<f32>,\n    @location(1) normal : vec3<f32>,\n    @location(2) uv : vec2<f32>,\n};\n\nstruct VertexOutput {\n    @builtin(position) position : vec4<f32>,\n    @location(0) vUv : vec2<f32>,\n};\n\n@group(0) @binding(0) var textureSampler: sampler;\n\n@group(0) @binding(1) var albedoTexture: texture_2d<f32>;\n@group(0) @binding(2) var normalTexture: texture_2d<f32>;\n@group(0) @binding(3) var ermoTexture: texture_2d<f32>;\n@group(0) @binding(4) var depthTexture: texture_depth_2d;\n// @group(0) @binding(5) var shadowPassDepth: texture_depth_2d;\n\n@group(0) @binding(5) var shadowPassDepth: texture_depth_2d_array;\n\n\n\nstruct Light {\n    position: vec4<f32>,\n    projectionMatrix: mat4x4<f32>,\n    csmProjectionMatrix: array<mat4x4<f32>, numCascades>,\n    viewMatrix: mat4x4<f32>,\n    viewMatrixInverse: mat4x4<f32>,\n    color: vec4<f32>,\n    params1: vec4<f32>,\n    params2: vec4<f32>,\n};\n\n@group(0) @binding(6) var<storage, read> lights: array<Light>;\n@group(0) @binding(7) var<storage, read> lightCount: u32;\n\n\n\n\n\n\nstruct View {\n    projectionOutputSize: vec4<f32>,\n    viewPosition: vec4<f32>,\n    projectionInverseMatrix: mat4x4<f32>,\n    viewInverseMatrix: mat4x4<f32>,\n};\n@group(0) @binding(8) var<storage, read> view: View;\n\n\n@group(0) @binding(9) var shadowSampler: sampler;\n\n\n\n\n\n\nconst numCascades = 4;\nconst debug_cascadeColors = array<vec4<f32>, 5>(\n    vec4<f32>(1.0, 0.0, 0.0, 1.0),\n    vec4<f32>(0.0, 1.0, 0.0, 1.0),\n    vec4<f32>(0.0, 0.0, 1.0, 1.0),\n    vec4<f32>(1.0, 1.0, 0.0, 1.0),\n    vec4<f32>(0.0, 0.0, 0.0, 1.0)\n);\n@group(0) @binding(10) var shadowSamplerComp: sampler_comparison;\n\n\n@vertex\nfn vertexMain(input: VertexInput) -> VertexOutput {\n    var output: VertexOutput;\n    output.position = vec4(input.position, 0.0, 1.0);\n    output.vUv = input.uv;\n    return output;\n}\nconst PI = 3.141592653589793;\n\nconst SPOT_LIGHT = 0;\nconst DIRECTIONAL_LIGHT = 1;\nconst POINT_LIGHT = 2;\nconst AREA_LIGHT = 3;\n\nstruct SpotLight {\n    pointToLight: vec3<f32>,\n    color: vec3<f32>,\n    direction: vec3<f32>,\n    range: f32,\n    intensity: f32,\n    angle: f32,\n}\n\nstruct DirectionalLight {\n    direction: vec3<f32>,\n    color: vec3<f32>,\n}\n\nstruct PointLight {\n    pointToLight: vec3<f32>,\n    color: vec3<f32>,\n    range: f32,\n    intensity: f32,\n}\n\nstruct AreaLight {\n    pointToLight: vec3<f32>,\n    direction: vec3<f32>,\n    color: vec3<f32>,\n    range: f32,\n    intensity: f32,\n}\n\nstruct Surface {\n    albedo: vec3<f32>,\n    emissive: vec3<f32>,\n    metallic: f32,\n    roughness: f32,\n    occlusion: f32,\n    worldPosition: vec3<f32>,\n    N: vec3<f32>,\n    F0: vec3<f32>,\n    V: vec3<f32>,\n};\n\nfn reconstructWorldPosFromZ(\n    coords: vec2<f32>,\n    size: vec2<f32>,\n    depthTexture: texture_depth_2d,\n    projInverse: mat4x4<f32>,\n    viewInverse: mat4x4<f32>\n    ) -> vec4<f32> {\n    let uv = coords.xy / size;\n    var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);\n        let x = uv.x * 2.0 - 1.0;\n        let y = (1.0 - uv.y) * 2.0 - 1.0;\n        let projectedPos = vec4(x, y, depth, 1.0);\n        var worldPosition = projInverse * projectedPos;\n        worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);\n        worldPosition = viewInverse * worldPosition;\n    return worldPosition;\n}\n\nfn DistributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {\n    let a      = roughness*roughness;\n    let a2     = a*a;\n    let NdotH  = max(dot(N, H), 0.0);\n    let NdotH2 = NdotH*NdotH;\n\n    let num   = a2;\n    var denom = (NdotH2 * (a2 - 1.0) + 1.0);\n    denom = PI * denom * denom;\n    return num / denom;\n}\n\nfn GeometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {\n    let r = (roughness + 1.0);\n    let k = (r*r) / 8.0;\n\n    let num   = NdotV;\n    let denom = NdotV * (1.0 - k) + k;\n\n    return num / denom;\n}\n\nfn GeometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {\n    let NdotV = max(dot(N, V), 0.0);\n    let NdotL = max(dot(N, L), 0.0);\n    let ggx2  = GeometrySchlickGGX(NdotV, roughness);\n    let ggx1  = GeometrySchlickGGX(NdotL, roughness);\n\n    return ggx1 * ggx2;\n}\n\nfn FresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {\n    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);\n} \n\nfn rangeAttenuation(range : f32, distance : f32) -> f32 {\n    if (range <= 0.0) {\n        // Negative range means no cutoff\n        return 1.0 / pow(distance, 2.0);\n    }\n    return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);\n}\n\nfn CalculateBRDF(surface: Surface, pointToLight: vec3<f32>) -> vec3<f32> {\n    // cook-torrance brdf\n    let L = normalize(pointToLight);\n    let H = normalize(surface.V + L);\n    let distance = length(pointToLight);\n\n    let NDF = DistributionGGX(surface.N, H, surface.roughness);\n    let G = GeometrySmith(surface.N, surface.V, L, surface.roughness);\n    let F = FresnelSchlick(max(dot(H, surface.V), 0.0), surface.F0);\n\n    let kD = (vec3(1.0, 1.0, 1.0) - F) * (1.0 - surface.metallic);\n\n    let NdotL = max(dot(surface.N, L), 0.0);\n\n    let numerator = NDF * G * F;\n    let denominator = max(4.0 * max(dot(surface.N, surface.V), 0.0) * NdotL, 0.001);\n    let specular = numerator / vec3(denominator, denominator, denominator);\n\n    return (kD * surface.albedo.rgb / vec3(PI, PI, PI) + specular) * NdotL;\n}\n\nfn PointLightRadiance(light : PointLight, surface : Surface) -> vec3<f32> {\n    let distance = length(light.pointToLight);\n    let attenuation = rangeAttenuation(light.range, distance);\n    let radiance = CalculateBRDF(surface, light.pointToLight) * light.color * light.intensity * attenuation;\n    return radiance;\n}\n\nfn DirectionalLightRadiance(light: DirectionalLight, surface : Surface) -> vec3<f32> {\n    return CalculateBRDF(surface, light.direction) * light.color;\n}\n\nfn SpotLightRadiance(light : SpotLight, surface : Surface) -> vec3<f32> {\n    let L = normalize(light.pointToLight);\n    let distance = length(light.pointToLight);\n\n    let angle = acos(dot(light.direction, L));\n\n    // Check if the point is within the light cone\n    if angle > light.angle {\n        return vec3(0.0, 0.0, 0.0); // Outside the outer cone\n    }\n\n    let intensity = smoothstep(light.angle, 0.0, angle);\n    let attenuation = rangeAttenuation(light.range, distance) * intensity;\n\n    let radiance = CalculateBRDF(surface, light.pointToLight) * light.color * light.intensity * attenuation;\n    return radiance;\n}\n\nfn Tonemap_ACES(x: vec3f) -> vec3f {\n    // Narkowicz 2015, "ACES Filmic Tone Mapping Curve"\n    let a = 2.51;\n    let b = 0.03;\n    let c = 2.43;\n    let d = 0.59;\n    let e = 0.14;\n    return (x * (a * x + b)) / (x * (c * x + d) + e);\n}\n\nfn OECF_sRGBFast(linear: vec3f) -> vec3f {\n    return pow(linear, vec3(0.454545));\n}\n\nfn CalculateShadow(worldPosition: vec3f, normal: vec3f, light: Light, lightIndex: u32) -> f32 {\n    var posFromLight = light.projectionMatrix * light.viewMatrix * vec4(worldPosition, 1.0);\n    posFromLight = vec4(posFromLight.xyz / posFromLight.w, 1.0);\n    let shadowPos = vec3(posFromLight.xy * vec2(0.5,-0.5) + vec2(0.5, 0.5), posFromLight.z);\n    // let inRange = shadowPos.x >= 0.0 && shadowPos.x <= 1.0 && shadowPos.y >= 0.0 && shadowPos.y <= 1.0 && shadowPos.z >= 0.0 && shadowPos.z <= 1.0;\n    var visibility = 0.0;\n\n    let shadowIndex = lightIndex;\n\n    let lightDirection = normalize(light.position.xyz - worldPosition);\n    \n    if (shadowPos.z <= 1.0) {\n        let sampleRadius = 2.0;\n        let pixelSize = 1.0 / vec2f(textureDimensions(shadowPassDepth));\n        // let pixelSize = 1.0 / vec2f(1024);\n\n		let bias = max(0.00025 * (1.0 - dot(normal, lightDirection)), 0.00009);\n        // let bias = 0.0009;\n\n        // // Naive Soft shadows\n        // for (var y = -sampleRadius; y <= sampleRadius; y+=1.0) {\n        //     for (var x = -sampleRadius; x <= sampleRadius; x+=1.0) {\n        //         let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy + vec2(x,y) * pixelSize, shadowIndex, 0);\n        //         // if (projectedDepth <= posFromLight.z - bias) {\n        //         if (posFromLight.z > projectedDepth + bias) {\n        //             visibility += 1.0;\n        //         }\n        //     }\n        // }\n        // visibility /= pow((sampleRadius * 2.0 + 1.0), 2.0);\n        \n        // Hard shadows\n        let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);\n        if (posFromLight.z > projectedDepth + bias) {\n            visibility = 1.0;\n        }\n    }\n    \n    return visibility;\n}\n\nfn CalculateDirectionalLightShadow(worldPosition: vec3<f32>, normal: vec3<f32>, light: Light, directionalLight: DirectionalLight, lightIndex: u32) -> f32 {\n    var posFromLight = light.projectionMatrix * light.viewMatrix * vec4(worldPosition, 1.0);\n    posFromLight = vec4(posFromLight.xyz / posFromLight.w, 1.0);\n    let shadowPos = vec3(posFromLight.xy * vec2(0.5,-0.5) + vec2(0.5, 0.5), posFromLight.z);\n    var visibility = 0.0;\n\n    let lightDirection = normalize(light.position.xyz - worldPosition);\n    // let bias = max(0.00025 * (1.0 - dot(normal, directionalLight.direction)), 0.00009);\n    let bias = 0.00009;\n    // Hard shadows\n    let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);\n    if (posFromLight.z > projectedDepth + bias) {\n        visibility = 1.0;\n    }\n    \n    return visibility;\n}\n\nstruct ShadowCSM {\n    visibility: f32,\n    selectedCascade: i32\n};\n\nfn CalculateShadowCSM(surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {\n    var selectedCascade = numCascades;\n    var hasNextCascade = false;\n    var shadowMapCoords = vec3<f32>(-1.0);\n    for (var i = 0; i < numCascades; i += 1) {\n        // ideally these operations should be performed in the vs\n        var csmShadowMapCoords = light.csmProjectionMatrix[i] * vec4(surface.worldPosition, 1.0);\n        csmShadowMapCoords = csmShadowMapCoords / csmShadowMapCoords.w;\n        shadowMapCoords = vec3<f32>(csmShadowMapCoords.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), csmShadowMapCoords.z);\n\n        if (all(shadowMapCoords > vec3<f32>(0.0)) && all(shadowMapCoords < vec3<f32>(1.0))) {\n            selectedCascade = i;\n            if (i < numCascades - 1) {\n                var nextShadowCoords = light.csmProjectionMatrix[i + 1] * vec4(surface.worldPosition, 1.0);\n                nextShadowCoords = nextShadowCoords / nextShadowCoords.w;\n                let uvShadowMapCoords = vec3<f32>(csmShadowMapCoords.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), csmShadowMapCoords.z);\n                hasNextCascade = all(uvShadowMapCoords > vec3<f32>(0.0)) && all(uvShadowMapCoords < vec3<f32>(1.0));\n            }\n            break;\n        }\n    }\n\n    let lightViewInverse = light.viewMatrixInverse;\n    let lightDirection = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n    \n    let pcfResolution = 2;\n    let minBias = 0.0005;\n    let maxBias = 0.001;\n\n    // let bias = max(minBias, maxBias * (1.0 - dot(lightDirection, surface.N)));\n    let bias = max(0.0025 * (1.0 - dot(surface.N, lightDirection)), 0.0009);\n    \n    let threshold = vec3<f32>(0.2);\n    var edgeAdditionalVisibility = clamp((shadowMapCoords.xyz - (1.0 - threshold)) / threshold, vec3<f32>(0.0), vec3<f32>(1.0));\n    edgeAdditionalVisibility = max(edgeAdditionalVisibility, 1.0 - clamp(shadowMapCoords.xyz / threshold, vec3<f32>(0.0), vec3<f32>(1.0)));\n    \n    var cascadeShadowMapCoords = shadowMapCoords;\n\n    if (selectedCascade >= 2) {\n        cascadeShadowMapCoords.x = cascadeShadowMapCoords.x + 1.0;\n    }\n    if (selectedCascade % 2 != 0) {\n        cascadeShadowMapCoords.y = cascadeShadowMapCoords.y + 1.0;\n    }\n    cascadeShadowMapCoords.x = cascadeShadowMapCoords.x / 2.0;\n    cascadeShadowMapCoords.y = cascadeShadowMapCoords.y / 2.0;\n\n\n    // PCF\n    var visibility: f32 = 0.0;\n    let offset = 1.0 / vec2<f32>(textureDimensions(shadowPassDepth));\n    for (var i = -pcfResolution; i <= pcfResolution; i = i + 1) {\n        for (var j = -pcfResolution; j <= pcfResolution; j = j + 1) {\n            visibility = visibility + textureSampleCompareLevel(\n                shadowPassDepth,\n                shadowSamplerComp,\n                cascadeShadowMapCoords.xy + vec2<f32>(f32(i), f32(j)) * offset, lightIndex, cascadeShadowMapCoords.z - bias\n            );\n        }\n    }\n\n    let fadeOut = select(max(max(edgeAdditionalVisibility.x, edgeAdditionalVisibility.y), edgeAdditionalVisibility.z), 0.0, hasNextCascade);\n    visibility = visibility / f32((pcfResolution + pcfResolution + 1) * (pcfResolution + pcfResolution + 1)) + fadeOut;\n\n    var shadow: ShadowCSM;\n    shadow.visibility = clamp(visibility, 0.0, 1.0);\n    shadow.selectedCascade = selectedCascade;\n    \n    return shadow;\n}\n\n@fragment\nfn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {\n    let uv = input.vUv;\n    let albedo = textureSample(albedoTexture, textureSampler, uv);\n    let normal = textureSample(normalTexture, textureSampler, uv);\n    let ermo = textureSample(ermoTexture, textureSampler, uv);\n\n    let cutoff = 0.0001;\n    let albedoSum = albedo.r + albedo.g + albedo.b;\n    if (albedoSum < cutoff) {\n        discard;\n    }\n\n    var color: vec3f = vec3(0);\n\n    let worldPosition = reconstructWorldPosFromZ(\n        input.position.xy,\n        view.projectionOutputSize.xy,\n        depthTexture,\n        view.projectionInverseMatrix,\n        view.viewInverseMatrix\n    );\n\n    var surface: Surface;\n    surface.albedo = albedo.rgb;\n    surface.roughness = albedo.a;\n    surface.metallic = normal.a;\n    surface.emissive = ermo.rgb;\n    surface.occlusion = 1.0;\n    surface.worldPosition = worldPosition.xyz;\n    surface.N = normalize(normal.rgb);\n    surface.F0 = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));\n    surface.V = normalize(view.viewPosition.xyz - surface.worldPosition);\n\n    if (ermo.w > 0.5) {\n        return vec4(surface.albedo.rgb, 1.0);\n    }\n    \n    var selectedCascade = 0;\n    var Lo = vec3(0.0);\n    for (var i : u32 = 0u; i < lightCount; i = i + 1u) {\n        let light = lights[i];\n        let lightType = light.color.a;\n\n        if (lightType == SPOT_LIGHT) {\n            var spotLight: SpotLight;\n            \n            let lightViewInverse = light.viewMatrixInverse; // Assuming you can calculate or pass this\n            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n\n            spotLight.pointToLight = light.position.xyz - surface.worldPosition;\n            spotLight.color = light.color.rgb;\n            spotLight.intensity = light.params1.r;\n            spotLight.range = light.params1.g;\n            spotLight.direction = lightDir;\n            spotLight.angle = light.params1.b;\n\n            let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);\n            Lo += (1.0 - shadow) * SpotLightRadiance(spotLight, surface);\n        }\n        else if (lightType == POINT_LIGHT) {\n            var pointLight: PointLight;\n            \n            pointLight.pointToLight = light.position.xyz - surface.worldPosition;\n            pointLight.color = light.color.rgb;\n            pointLight.intensity = light.params1.x;\n            pointLight.range = light.params1.y;\n\n            let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);\n            Lo += (1.0 - shadow) * PointLightRadiance(pointLight, surface);\n        }\n        else if (lightType == DIRECTIONAL_LIGHT) {\n            var directionalLight: DirectionalLight;\n            let lightViewInverse = light.viewMatrixInverse; // Assuming you can calculate or pass this\n            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);\n            directionalLight.direction = lightDir;\n            directionalLight.color = light.color.rgb;\n\n            // var shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);\n            let shadowCSM = CalculateShadowCSM(surface, light, i);\n            let shadow = shadowCSM.visibility;\n            selectedCascade = shadowCSM.selectedCascade;\n\n            Lo += (shadow) * DirectionalLightRadiance(directionalLight, surface);\n\n            // let finalColor = shadow * DirectionalLightRadiance(directionalLight, surface);\n            // Lo += mix(finalColor, debug_cascadeColors[selectedCascade].rgb, 0.01);\n        }\n    }\n\n\n    let ambientColor = vec3(0.01);\n    color = ambientColor * surface.albedo + Lo * surface.occlusion;\n\n    // color += debug_cascadeColors[selectedCascade].rgb * 0.05;\n    color += surface.emissive;\n\n    color = Tonemap_ACES(color);\n    color = OECF_sRGBFast(color);\n\n\n    return vec4(color, 1.0);\n    // return vec4(pow(projectedDepth, 20.0));\n    // return vec4(shadowPos, 1.0);\n    // return vec4(Lo, 1.0);\n    // return vec4(surface.albedo.rgb, 1.0);\n    // return vec4(worldPosition.xyz, 1.0);\n    // return vec4(surface.N, 1.0);\n}';

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
      uniform.buffer = Buffer3.Create(data.byteLength, type);
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

// src/plugins/UIStats.ts
var Stat = class {
  statContainer;
  constructor(container) {
    this.statContainer = document.createElement("div");
    container.appendChild(this.statContainer);
  }
};
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
var UITextStat = class extends Stat {
  textElement;
  constructor(container, label, defaultValue) {
    super(container);
    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    this.textElement = document.createElement("pre");
    this.textElement.textContent = defaultValue;
    this.statContainer.append(labelElement, this.textElement);
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
    this.container.style.minWidth = "200px";
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
  totalMeshlets;
  visibleMeshes;
  gpuTime;
  triangleCount;
  visibleTriangles;
  constructor() {
    this.ui = new UIStats();
    this.frameRenderPassesStat = this.ui.AddTextStat("Render passes: ", "");
    this.totalMeshlets = this.ui.AddTextStat("Total meshlets: ", "");
    this.visibleMeshes = this.ui.AddTextStat("Visible meshlets: ", "");
    this.gpuTime = this.ui.AddTextStat("GPU time: ", "");
    this.triangleCount = this.ui.AddTextStat("Triangles: ", "");
    this.visibleTriangles = this.ui.AddTextStat("Visible triangles: ", "");
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
  SetTotalMeshlets(count) {
    this.totalMeshlets.SetValue(count.toString());
  }
  SetVisibleMeshes(count) {
    this.visibleMeshes.SetValue(count.toString());
  }
  SetGPUTime(time) {
    this.gpuTime.SetValue(time.toString());
  }
  SetTriangleCount(count) {
    this.triangleCount.SetValue(count.toString());
  }
  SetVisibleTriangleCount(count) {
    this.visibleTriangles.SetValue(count.toString());
  }
};
var Debugger = new _Debugger();

// src/renderer/webgpu/WEBGPUTimestampQuery.ts
var WEBGPUTimestampQuery = class {
  static querySet;
  static resolveBuffer;
  static resultBuffer;
  static isTimestamping = false;
  static links = /* @__PURE__ */ new Map();
  static currentLinkIndex = 0;
  static BeginRenderTimestamp(name) {
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
    this.links.set(currentLinkIndex, name);
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
    let str = ``;
    for (let i = 0; i < this.currentLinkIndex; i += 2) {
      const link = this.links.get(i);
      if (!link) throw Error("ERGERG");
      if (visited[link] === true) continue;
      const duration = Number(times[i + 1] - times[i]);
      str += `${link}: ${(duration / 1e3).toFixed(1)}\xB5s
`;
      visited[link] = true;
    }
    Debugger.SetGPUTime(str);
    this.resultBuffer.unmap();
    this.currentLinkIndex = 0;
    this.links.clear();
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
  static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset) {
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
  static CopyTextureToTexture(source, destination) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.copyTextureToTexture({ texture: source.GetBuffer() }, { texture: destination.GetBuffer() }, [source.width, source.height, source.depth]);
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
  static CopyTextureToTexture(source, destination) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTexture(source, destination);
    else throw Error("Unknown render api type.");
  }
  static ClearBuffer(buffer, offset = 0, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.ClearBuffer(buffer, offset, size ? size : buffer.size);
    else throw Error("Unknown render api type.");
  }
};

// src/math/BoundingVolume.ts
var BoundingVolume = class _BoundingVolume {
  min;
  max;
  center;
  radius;
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), center = new Vector3(), radius) {
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
    for (let i = 0; i < vertices.length; i += 3) {
      maxX = Math.max(maxX, vertices[i + 0]);
      minX = Math.min(minX, vertices[i + 0]);
      maxY = Math.max(maxY, vertices[i + 1]);
      minY = Math.min(minY, vertices[i + 1]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
      minZ = Math.min(minZ, vertices[i + 2]);
    }
    return new _BoundingVolume(
      new Vector3(minX, minY, minZ),
      new Vector3(maxX, maxY, maxZ),
      new Vector3(minX + (maxX - minX) / 2, minY + (maxY - minY) / 2, minZ + (maxZ - minZ) / 2),
      Math.max((maxX - minX) / 2, (maxY - minY) / 2, (maxZ - minZ) / 2)
    );
  }
};

// src/Geometry.ts
var GeometryAttribute = class {
  array;
  buffer;
  constructor(array, type) {
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
    return geometry;
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

// src/plugins/meshlets/Meshlet.ts
var Meshlet = class {
  vertices;
  indices;
  id = Utils.UUID();
  lod;
  children;
  parents;
  _boundingVolume;
  get boundingVolume() {
    if (!this._boundingVolume) this._boundingVolume = Meshoptimizer.meshopt_computeClusterBounds(this.vertices, this.indices);
    return this._boundingVolume;
  }
  set boundingVolume(boundingVolume) {
    this._boundingVolume = boundingVolume;
  }
  // public boundingVolume: meshopt_Bounds;
  parentBoundingVolume;
  parentError = Infinity;
  clusterError = 0;
  vertices_gpu;
  crc;
  bounds;
  constructor(vertices, indices) {
    this.vertices = vertices;
    this.indices = indices;
    this.lod = 0;
    this.children = [];
    this.parents = [];
    this.bounds = BoundingVolume.FromVertices(this.vertices);
    const max_vertices = 128;
    const verticesNonIndexed = Geometry.ToNonIndexed(this.vertices, this.indices);
    const verticesGPU = [];
    for (let i = 0; i < verticesNonIndexed.length; i += 3) {
      verticesGPU.push(verticesNonIndexed[i + 0], verticesNonIndexed[i + 1], verticesNonIndexed[i + 2], 0);
    }
    this.vertices_gpu = new Float32Array(max_vertices * 4 * 3);
    this.vertices_gpu.set(verticesGPU.slice(0, max_vertices * 4 * 3));
    this.crc = CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
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
    module[type.heap].set(typedArray, heapPointer >> 2);
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
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
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
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg instanceof WASMPointer) {
        arg.ptr = _WASMHelper.transferNumberArrayToHeap(module, arg.data);
        method_args.push(arg.ptr);
      } else method_args.push(args[i]);
    }
    return method_args;
  }
  static getOutputArguments(module, args) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
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
    ["_malloc", "_meshopt_computeClusterBounds", "_meshopt_buildMeshletsBound", "_meshopt_buildMeshlets", "_meshopt_simplify", "_meshopt_generateVertexRemap", "_meshopt_remapIndexBuffer", "_meshopt_remapVertexBuffer", "_meshopt_simplifyScale", "_fflush", "onRuntimeInitialized"].forEach((prop) => {
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
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
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
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
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
var Meshoptimizer = class _Meshoptimizer {
  static module;
  static isLoaded = false;
  static async load() {
    if (!_Meshoptimizer.module) {
      _Meshoptimizer.module = await MeshOptimizer_default();
      this.isLoaded = true;
    }
  }
  static buildMeshletsFromBuildOutput(vertices, output) {
    let meshlets = [];
    for (let i = 0; i < output.meshlets_count; i++) {
      const meshlet = output.meshlets_result[i];
      let meshlet_positions = [];
      let meshlet_indices = [];
      for (let v = 0; v < meshlet.vertex_count; ++v) {
        const o = 3 * output.meshlet_vertices_result[meshlet.vertex_offset + v];
        const x = vertices[o];
        const y = vertices[o + 1];
        const z = vertices[o + 2];
        meshlet_positions.push(x);
        meshlet_positions.push(y);
        meshlet_positions.push(z);
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
  static buildNeighbors(meshlets, meshlet_vertices_result) {
    const vertex_to_meshlets = [];
    for (let i = 0; i < meshlets.length; i++) {
      const meshlet = meshlets[i];
      const meshlet_vertices = meshlet_vertices_result.slice(meshlet.vertex_offset, meshlet.vertex_offset + meshlet.vertex_count);
      for (let j = 0; j < meshlet_vertices.length; j++) {
        if (!vertex_to_meshlets[meshlet_vertices[j]]) vertex_to_meshlets[meshlet_vertices[j]] = { count: 0, meshlets: [] };
        vertex_to_meshlets[meshlet_vertices[j]].count++;
        vertex_to_meshlets[meshlet_vertices[j]].meshlets.push(i);
      }
    }
    const neighbors = Array.from({ length: meshlets.length }, () => /* @__PURE__ */ new Set());
    for (const v of vertex_to_meshlets) {
      const meshletArray = v.meshlets;
      for (let i = 0; i < meshletArray.length; i++) {
        for (let j = i + 1; j < meshletArray.length; j++) {
          neighbors[meshletArray[i]].add(meshletArray[j]);
          neighbors[meshletArray[j]].add(meshletArray[i]);
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
      for (let i = 0; i < data.length; i += 4) {
        meshlets2.push({
          vertex_offset: data[i + 0],
          triangle_offset: data[i + 1],
          vertex_count: data[i + 2],
          triangle_count: data[i + 3]
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
      vertices.length,
      3 * Float32Array.BYTES_PER_ELEMENT,
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
      vertices.length,
      3 * Float32Array.BYTES_PER_ELEMENT
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
    const remap = new WASMPointer(new Uint32Array(meshlet.indices.length * 3), "out");
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
      meshlet.vertices.length,
      3 * Float32Array.BYTES_PER_ELEMENT
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
    const vertices_remapped = new WASMPointer(new Float32Array(vertex_count * 3), "out");
    WASMHelper.call(
      MeshOptmizer,
      "meshopt_remapVertexBuffer",
      "number",
      vertices_remapped,
      vertices,
      meshlet.vertices.length / 3,
      3 * Float32Array.BYTES_PER_ELEMENT,
      remap
    );
    return new Meshlet(new Float32Array(vertices_remapped.data), new Uint32Array(indices_remapped.data));
  }
  static meshopt_simplify(meshlet, target_count) {
    const MeshOptmizer = _Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
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
      meshlet.vertices.length / 3,
      // size_t vertex_count,
      3 * Float32Array.BYTES_PER_ELEMENT,
      // size_t vertex_positions_stride,
      target_count,
      // size_t target_index_count,
      0.05,
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
  static meshopt_simplifyScale(meshlet) {
    const MeshOptmizer = _Meshoptimizer.module;
    const vertices = new WASMPointer(new Float32Array(meshlet.vertices), "in");
    const scale = WASMHelper.call(
      MeshOptmizer,
      "meshopt_simplifyScale",
      "number",
      vertices,
      meshlet.vertices.length / 3,
      3 * Float32Array.BYTES_PER_ELEMENT
    );
    return scale;
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
      for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343) {
          var u1 = str.charCodeAt(++i);
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
      for (var i = 0; i < str.length; ++i) {
        var c = str.charCodeAt(i);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i;
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
      for (var i = parts.length - 1; i >= 0; i--) {
        var last = parts[i];
        if (last === ".") {
          parts.splice(i, 1);
        } else if (last === "..") {
          parts.splice(i, 1);
          up++;
        } else if (up) {
          parts.splice(i, 1);
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
      for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = i >= 0 ? arguments[i] : FS.cwd();
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
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
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
      for (var i = 0; i < length; i++) {
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
        buffer2[offset + i] = result;
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
        for (var i = 0; i < length; i++) {
          stream.tty.ops.put_char(stream.tty, buffer2[offset + i]);
        }
      } catch (e) {
        throw new FS.ErrnoError(29);
      }
      if (length) {
        stream.node.timestamp = Date.now();
      }
      return i;
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
          for (var i in new_node.contents) {
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
      for (var i in node.contents) {
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
        for (var i = 0; i < size; i++) buffer2[offset + i] = contents[position + i];
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
        for (var i = 0; i < length; i++) {
          node.contents[position + i] = buffer2[offset + i];
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
      for (var i = 0; i < parts.length; i++) {
        var islast = i === parts.length - 1;
        if (islast && opts.parent) {
          break;
        }
        current = FS.lookupNode(current, parts[i]);
        current_path = PATH.join2(current_path, parts[i]);
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
      for (var i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
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
      for (var i = 0; i < dirs.length; ++i) {
        if (!dirs[i]) continue;
        d += "/" + dirs[i];
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
      for (var i = 0; i < FS.streams.length; i++) {
        var stream = FS.streams[i];
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
          for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
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
        for (var i = 0; i < length; i++) {
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
          buffer2[offset + i] = result;
        }
        if (bytesRead) {
          stream.node.timestamp = Date.now();
        }
        return bytesRead;
      }, write: (stream, buffer2, offset, length, pos) => {
        for (var i = 0; i < length; i++) {
          try {
            output(buffer2[offset + i]);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
        if (length) {
          stream.node.timestamp = Date.now();
        }
        return i;
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
          for (var i = 0; i < size; i++) {
            buffer2[offset + i] = contents[position + i];
          }
        } else {
          for (var i = 0; i < size; i++) {
            buffer2[offset + i] = contents.get(position + i);
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
      for (var i = 0; i < iovcnt; i++) {
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
      for (var i = 0; i < iovcnt; i++) {
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
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
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
    var _METIS_PartGraphKway = Module3["_METIS_PartGraphKway"] = function() {
      return (_METIS_PartGraphKway = Module3["_METIS_PartGraphKway"] = Module3["asm"]["B"]).apply(null, arguments);
    };
    var ___errno_location = Module3["___errno_location"] = function() {
      return (___errno_location = Module3["___errno_location"] = Module3["asm"]["C"]).apply(null, arguments);
    };
    var _setThrew = Module3["_setThrew"] = function() {
      return (_setThrew = Module3["_setThrew"] = Module3["asm"]["D"]).apply(null, arguments);
    };
    var stackSave = Module3["stackSave"] = function() {
      return (stackSave = Module3["stackSave"] = Module3["asm"]["E"]).apply(null, arguments);
    };
    var stackRestore = Module3["stackRestore"] = function() {
      return (stackRestore = Module3["stackRestore"] = Module3["asm"]["F"]).apply(null, arguments);
    };
    var stackAlloc = Module3["stackAlloc"] = function() {
      return (stackAlloc = Module3["stackAlloc"] = Module3["asm"]["G"]).apply(null, arguments);
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
      for (let i = 0; i < adjacency.length; i++) {
        let adj = adjacency[i];
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
    for (let i = 0; i <= part_num; i++) {
      const part = [];
      for (let j = 0; j < parts.data.length; j++) {
        if (parts.data[j] === i) {
          part.push(j);
        }
      }
      if (part.length > 0) parts_out.push(part);
    }
    return parts_out;
  }
  static rebuildMeshletsFromGroupIndices(meshlets, groups) {
    let groupedMeshlets = [];
    for (let i = 0; i < groups.length; i++) {
      if (!groupedMeshlets[i]) groupedMeshlets[i] = [];
      for (let j = 0; j < groups[i].length; j++) {
        const meshletId = groups[i][j];
        const meshlet = meshlets[meshletId];
        groupedMeshlets[i].push(meshlet);
      }
    }
    return groupedMeshlets;
  }
  static group(adj, nparts) {
    const groups = this.partition(adj, nparts);
    return groups;
  }
};

// src/plugins/meshlets/utils/MeshletCreator.ts
var MeshletCreator = class _MeshletCreator {
  static max_vertices = 255;
  static max_triangles = 128;
  static cone_weight = 0;
  static buildMeshletsFromBuildOutput(vertices, output) {
    let meshlets = [];
    for (let i = 0; i < output.meshlets_count; i++) {
      const meshlet = output.meshlets_result[i];
      let meshlet_positions = [];
      let meshlet_indices = [];
      for (let v = 0; v < meshlet.vertex_count; ++v) {
        const o = 3 * output.meshlet_vertices_result[meshlet.vertex_offset + v];
        const x = vertices[o];
        const y = vertices[o + 1];
        const z = vertices[o + 2];
        meshlet_positions.push(x);
        meshlet_positions.push(y);
        meshlet_positions.push(z);
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
    for (let i = 0; i < meshlets.length; i++) {
      const meshlet = meshlets[i];
      for (let j = 0; j < meshlet.vertices.length; j += 3) {
        const hash = `${meshlet.vertices[j + 0]},${meshlet.vertices[j + 1]},${meshlet.vertices[j + 2]}`;
        let meshletList = vertexHashToMeshletMap.get(hash);
        if (!meshletList) meshletList = /* @__PURE__ */ new Set();
        meshletList.add(i);
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
    for (let i = 0; i < groups.length; i++) {
      if (!groupedMeshlets[i]) groupedMeshlets[i] = [];
      for (let j = 0; j < groups[i].length; j++) {
        const meshletId = groups[i][j];
        const meshlet = meshlets[meshletId];
        groupedMeshlets[i].push(meshlet);
      }
    }
    return groupedMeshlets;
  }
  static group(meshlets, nparts) {
    const adj = _MeshletGrouper.adjacencyList(meshlets);
    const groups = Metis.partition(adj, nparts);
    return _MeshletGrouper.rebuildMeshletsFromGroupIndices(meshlets, groups);
  }
};

// src/plugins/meshlets/utils/MeshletMerger.ts
var MeshletMerger = class {
  static merge(meshlets) {
    const vertices = [];
    const indices = [];
    let indexOffset = 0;
    const mergedIndices = [];
    for (let i = 0; i < meshlets.length; ++i) {
      const indices2 = meshlets[i].indices;
      for (let j = 0; j < indices2.length; j++) {
        mergedIndices.push(indices2[j] + indexOffset);
      }
      indexOffset += meshlets[i].vertices.length / 3;
    }
    indices.push(...mergedIndices);
    for (let i = 0; i < meshlets.length; ++i) {
      vertices.push(...meshlets[i].vertices);
    }
    const merged = new Meshlet(new Float32Array(vertices), new Uint32Array(indices));
    return merged;
  }
};

// src/plugins/meshlets/Meshletizer.ts
var Meshletizer = class {
  static step(meshlets, lod, previousMeshlets) {
    if (previousMeshlets.size === 0) {
      for (let m of meshlets) previousMeshlets.set(m.id, m);
    }
    let nparts = Math.ceil(meshlets.length / 4);
    let grouped = [meshlets];
    if (nparts > 1) {
      grouped = MeshletGrouper.group(meshlets, nparts);
    }
    let splitOutputs = [];
    for (let i = 0; i < grouped.length; i++) {
      const group = grouped[i];
      const mergedGroup = MeshletMerger.merge(group);
      const cleanedMergedGroup = Meshoptimizer.clean(mergedGroup);
      const simplified = Meshoptimizer.meshopt_simplify(cleanedMergedGroup, cleanedMergedGroup.indices.length / 2);
      const localScale = Meshoptimizer.meshopt_simplifyScale(simplified.meshlet);
      let meshSpaceError = simplified.error * localScale;
      let childrenError = 0;
      for (let m of group) {
        const previousMeshlet = previousMeshlets.get(m.id);
        if (!previousMeshlet) throw Error("Could not find previous meshler");
        childrenError = Math.max(childrenError, previousMeshlet.clusterError);
      }
      meshSpaceError += childrenError;
      const splits = MeshletCreator.build(simplified.meshlet.vertices, simplified.meshlet.indices, 255, 128);
      for (let split of splits) {
        split.clusterError = meshSpaceError;
        split.boundingVolume = simplified.meshlet.boundingVolume;
        previousMeshlets.set(split.id, split);
        splitOutputs.push(split);
        split.parents.push(...group);
      }
      for (let m of group) {
        m.children.push(...splits);
        m.lod = lod;
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
    const meshlets = MeshletCreator.build(vertices, indices, 255, 128);
    const maxLOD = 25;
    let inputs = meshlets;
    let rootMeshlet = null;
    let previousMeshlets = /* @__PURE__ */ new Map();
    for (let lod = 0; lod < maxLOD; lod++) {
      const outputs = this.step(inputs, lod, previousMeshlets);
      if (outputs.length === 1) {
        console.log("WE are done at lod", lod);
        rootMeshlet = outputs[0];
        rootMeshlet.lod = lod + 1;
        rootMeshlet.parentBoundingVolume = rootMeshlet.boundingVolume;
        break;
      }
      inputs = outputs;
    }
    if (rootMeshlet === null) throw Error("Root meshlet is invalid!");
    return rootMeshlet;
  }
};

// src/components/MeshletMesh.ts
var meshletsCache = /* @__PURE__ */ new Map();
var MeshletMesh = class extends Component {
  materialsMapped = /* @__PURE__ */ new Map();
  enableShadows = true;
  meshlets = [];
  AddMaterial(material) {
    if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
    this.materialsMapped.get(material.constructor.name)?.push(material);
  }
  GetMaterials(type) {
    return this.materialsMapped.get(type.name) || [];
  }
  async SetGeometry(geometry) {
    const cached = meshletsCache.get(geometry);
    if (cached) {
      this.meshlets.push(...cached);
      return;
    }
    const vertices = geometry.attributes.get("position");
    const indices = geometry.index;
    if (!vertices || !indices) throw Error("Needs vertices and indices");
    const geometryVertices = vertices.array;
    const geometryIndices = indices.array;
    const rootMeshlet = await Meshletizer.Build(geometryVertices, geometryIndices);
    function traverse(meshlet, fn, visited = []) {
      if (visited.indexOf(meshlet.id) !== -1) return;
      fn(meshlet);
      visited.push(meshlet.id);
      for (let child of meshlet.parents) {
        traverse(child, fn, visited);
      }
    }
    const allMeshlets = [];
    traverse(rootMeshlet, (m) => allMeshlets.push(m));
    this.meshlets = allMeshlets;
    meshletsCache.set(geometry, this.meshlets);
  }
};

// src/renderer/passes/GPUDriven.ts
var vertexSize = 128 * 3;
var workgroupSize = 64;
var GPUDriven = class extends RenderPass {
  name = "GPUDriven";
  shader;
  geometry;
  currentMeshCount = 0;
  drawIndirectBuffer;
  compute;
  computeDrawBuffer;
  instanceInfoBuffer;
  vertexBuffer;
  depthTarget;
  cullData;
  frustum = new Frustum();
  constructor() {
    super({});
    const code = `
        struct VertexInput {
            @builtin(instance_index) instanceIndex : u32,
            @builtin(vertex_index) vertexIndex : u32,
            @location(0) position : vec3<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) @interpolate(flat) instance : u32,
        };

        @group(0) @binding(0) var<storage, read> viewMatrix: mat4x4<f32>;
        @group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;

        @group(0) @binding(2) var<storage, read> vertices: array<vec4<f32>>;

        struct InstanceInfo {
            meshID: u32
        };

        @group(0) @binding(3) var<storage, read> instanceInfo: array<InstanceInfo>;



        struct MeshInfo {
            modelMatrix: mat4x4<f32>,
            position: vec4<f32>,
            scale: vec4<f32>
        };

        struct ObjectInfo {
            meshID: f32,
            meshletID: f32,
            padding: vec2<f32>,
        };

        @group(0) @binding(4) var<storage, read> meshInfo: array<MeshInfo>;
        @group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            let meshID = instanceInfo[input.instanceIndex].meshID;
            // let mesh = meshInfo[meshID];
            let object = objectInfo[meshID];
            let mesh = meshInfo[u32(object.meshID)];
            let modelMatrix = mesh.modelMatrix;
            
            let vertexID = input.vertexIndex + u32(object.meshletID) * ${vertexSize};
            let position = vertices[vertexID];
            
            let modelViewMatrix = viewMatrix * modelMatrix;
            output.position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
            output.instance = meshID;

            return output;
        }
        

        fn rand(co: f32) -> f32 {
            return fract(sin((co + 1.0) * 12.9898) * 43758.5453);
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let r = rand(f32(input.instance) + 12.1212);
            let g = rand(f32(input.instance) + 22.1212);
            let b = rand(f32(input.instance) + 32.1212);

            return vec4(r, g, b, 1.0);
        }
        `;
    this.shader = Shader.Create({
      code,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        viewMatrix: { group: 0, binding: 0, type: "storage" },
        projectionMatrix: { group: 0, binding: 1, type: "storage" },
        vertices: { group: 0, binding: 2, type: "storage" },
        instanceInfo: { group: 0, binding: 3, type: "storage" },
        meshInfo: { group: 0, binding: 4, type: "storage" },
        objectInfo: { group: 0, binding: 5, type: "storage" }
      }
    });
    this.depthTarget = DepthTexture.Create(Renderer.width, Renderer.height);
    this.compute = Compute.Create({
      code: `
                struct DrawBuffer {
                    vertexCount: u32,
                    instanceCount: atomic<u32>,
                    firstVertex: u32,
                    firstInstance: u32,
                };

                @group(0) @binding(0) var<storage, read_write> drawBuffer: DrawBuffer;

                struct InstanceInfo {
                    meshID: u32
                };

                @group(0) @binding(1) var<storage, read_write> instanceInfo: array<InstanceInfo>;


                struct CullData {
                    projectionMatrix: mat4x4<f32>,
                    viewMatrix: mat4x4<f32>,
                    cameraPosition: vec4<f32>,
                    frustum: array<vec4<f32>, 6>,
                    meshCount: vec4<f32>,
                    screenSize: vec4<f32>
                };

                @group(0) @binding(2) var<storage, read> cullData: CullData;
                

                struct MeshletInfo {
                    cone_apex: vec4<f32>,
                    cone_axis: vec4<f32>,
                    cone_cutoff: f32,

                    boundingSphere: vec4<f32>,
                    parentBoundingSphere: vec4<f32>,
                    error: vec4<f32>,
                    parentError: vec4<f32>,
                    lod: vec4<f32>
                };

                struct MeshInfo {
                    modelMatrix: mat4x4<f32>,
                    position: vec4<f32>,
                    scale: vec4<f32>
                };

                struct ObjectInfo {
                    meshID: f32,
                    meshletID: f32,
                    padding: vec2<f32>,
                };

                @group(0) @binding(3) var<storage, read> meshletInfo: array<MeshletInfo>;
                @group(0) @binding(4) var<storage, read> meshInfo: array<MeshInfo>;
                @group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;


                // assume a fixed resolution and fov
                const PI = 3.141592653589793;
                const testFOV = PI * 0.5;
                const cotHalfFov = 1.0 / tan(testFOV / 2.0);

                // TODO: Pass these
                const screenHeight = 609.0;
                const lodErrorThreshold = 1.0;
                const forcedLOD = 0;
                
                fn transformSphere(sphere: vec4<f32>, transform: mat4x4<f32>) -> vec4<f32> {
                    var hCenter = vec4(sphere.xyz, 1.0);
                    hCenter = transform * hCenter;
                    let center = hCenter.xyz / hCenter.w;
                    return vec4(center, length((transform * vec4(sphere.w, 0, 0, 0)).xyz));
                }

                // project given transformed (ie in view space) sphere to an error value in pixels
                // xyz is center of sphere
                // w is radius of sphere
                fn projectErrorToScreen(transformedSphere: vec4<f32>) -> f32 {
                    // https://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
                    if (transformedSphere.w > 1000000.0) {
                        return transformedSphere.w;
                    }
                    let d2 = dot(transformedSphere.xyz, transformedSphere.xyz);
                    let r = transformedSphere.w;
                    return cullData.screenSize.y * cotHalfFov * r / sqrt(d2 - r*r);
                }


                fn cull(meshlet: MeshletInfo, modelview: mat4x4<f32>) -> bool {
                    var projectedBounds = vec4(meshlet.boundingSphere.xyz, max(meshlet.error.x, 10e-10f));
                    projectedBounds = transformSphere(projectedBounds, modelview);
            
                    var parentProjectedBounds = vec4(meshlet.parentBoundingSphere.xyz, max(meshlet.parentError.x, 10e-10f));
                    parentProjectedBounds = transformSphere(parentProjectedBounds, modelview);
            
                    let clusterError = projectErrorToScreen(projectedBounds);
                    let parentError = projectErrorToScreen(parentProjectedBounds);
                    let render = clusterError <= lodErrorThreshold && parentError > lodErrorThreshold;
                    return render;

                    // // Disable culling
                    // return u32(meshlet.lod.x) == u32(forcedLOD);
                }



                fn planeDistanceToPoint(normal: vec3f, constant: f32, point: vec3f) -> f32 {
                    return dot(normal, point) + constant;
                }

                fn IsVisible(objectIndex: u32) -> bool {
                    let a = objectInfo[objectIndex];
                    let mesh = meshInfo[u32(a.meshID)];
                    let meshlet = meshletInfo[u32(a.meshletID)];

                    let v = cull(meshlet, cullData.viewMatrix * mesh.modelMatrix);
                    if (!v) {
                        return false;
                    }

                    // Backface
                    if (dot(normalize(meshlet.cone_apex.xyz - cullData.cameraPosition.xyz), meshlet.cone_axis.xyz) >= meshlet.cone_cutoff) {
                        return false;
                    }
                    
                    // Camera frustum
                    let scale = mesh.scale.x;
                    let boundingSphere = meshlet.boundingSphere * scale;
                    let center = (cullData.viewMatrix * vec4(boundingSphere.xyz + mesh.position.xyz, 1.0)).xyz;
                    let negRadius = -boundingSphere.w;

                    for (var i = 0; i < 6; i++) {
                        let distance = planeDistanceToPoint(cullData.frustum[i].xyz, cullData.frustum[i].w, center);

                        if (distance < negRadius) {
                            return false;
                        }
                    }

                    return true;
                }

                override blockSizeX: u32 = ${workgroupSize};
                override blockSizeY: u32 = 1;
                override blockSizeZ: u32 = 1;
                
                @compute @workgroup_size(blockSizeX, blockSizeY, blockSizeZ)
                fn main(@builtin(global_invocation_id) grid: vec3<u32>) {
                    let gID = grid.z * (blockSizeX * blockSizeY) + grid.y * blockSizeX + grid.x;
                    if (gID < u32(cullData.meshCount.x)) {
                        let visible = IsVisible(gID);
                            
                        if (visible) {
                            drawBuffer.vertexCount = ${vertexSize};
                            let countIndex = atomicAdd(&drawBuffer.instanceCount, 1);
                            instanceInfo[countIndex].meshID = gID;
                        }
                    }
                } 
            
            `,
      computeEntrypoint: "main",
      uniforms: {
        drawBuffer: { group: 0, binding: 0, type: "storage-write" },
        instanceInfo: { group: 0, binding: 1, type: "storage-write" },
        cullData: { group: 0, binding: 2, type: "storage" },
        meshletInfo: { group: 0, binding: 3, type: "storage" },
        meshInfo: { group: 0, binding: 4, type: "storage" },
        objectInfo: { group: 0, binding: 5, type: "storage" }
      }
    });
    this.drawIndirectBuffer = Buffer3.Create(4 * 4, 5 /* INDIRECT */);
    this.drawIndirectBuffer.name = "drawIndirectBuffer";
    this.geometry = new Geometry();
    this.geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertexSize)));
  }
  buildMeshletData() {
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
      console.time("buildMeshletData");
      console.log("meshlets", meshlets.length);
      console.log("sceneMeshes", sceneMeshlets.length);
      console.time("GGGG");
      let meshletInfo = [];
      let meshInfo = [];
      let objectInfo = [];
      let vertices = [];
      const indexedCache = /* @__PURE__ */ new Map();
      const meshCache = /* @__PURE__ */ new Map();
      for (let i = 0; i < meshlets.length; i++) {
        const sceneMesh = meshlets[i];
        let geometryIndex = indexedCache.get(sceneMesh.geometry.crc);
        if (geometryIndex === void 0) {
          console.log("Not found");
          geometryIndex = indexedCache.size;
          indexedCache.set(sceneMesh.geometry.crc, geometryIndex);
          vertices.push(...sceneMesh.geometry.vertices_gpu);
          const meshlet = sceneMesh.geometry;
          const bv = meshlet.boundingVolume;
          const pbv = meshlet.boundingVolume;
          meshletInfo.push(
            ...bv.cone_apex.elements,
            0,
            ...bv.cone_axis.elements,
            0,
            bv.cone_cutoff,
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
            0
          );
        }
        let meshIndex = meshCache.get(sceneMesh.mesh.id);
        if (meshIndex === void 0) {
          meshIndex = meshCache.size;
          meshCache.set(sceneMesh.mesh.id, meshIndex);
          meshInfo.push(
            ...sceneMesh.mesh.transform.localToWorldMatrix.elements,
            ...sceneMesh.mesh.transform.position.elements,
            0,
            ...sceneMesh.mesh.transform.scale.elements,
            0
          );
        }
        objectInfo.push(
          meshIndex,
          geometryIndex,
          0,
          0
        );
      }
      const verticesArray = new Float32Array(vertices);
      console.log("verticesArray", verticesArray.length);
      const meshletInfoArray = new Float32Array(meshletInfo);
      const meshletInfoBuffer = Buffer3.Create(meshletInfoArray.byteLength, 0 /* STORAGE */);
      meshletInfoBuffer.name = "meshletInfoBuffer";
      meshletInfoBuffer.SetArray(meshletInfoArray);
      this.compute.SetBuffer("meshletInfo", meshletInfoBuffer);
      const meshInfoBufferArray = new Float32Array(meshInfo);
      const meshInfoBuffer = Buffer3.Create(meshInfoBufferArray.byteLength, 0 /* STORAGE */);
      meshInfoBuffer.name = "meshInfoBuffer";
      meshInfoBuffer.SetArray(meshInfoBufferArray);
      this.compute.SetBuffer("meshInfo", meshInfoBuffer);
      const objectInfoBufferArray = new Float32Array(objectInfo);
      const objectInfoBuffer = Buffer3.Create(objectInfoBufferArray.byteLength, 0 /* STORAGE */);
      objectInfoBuffer.name = "objectInfoBuffer";
      objectInfoBuffer.SetArray(objectInfoBufferArray);
      this.compute.SetBuffer("objectInfo", objectInfoBuffer);
      this.shader.SetBuffer("meshInfo", meshInfoBuffer);
      this.shader.SetBuffer("objectInfo", objectInfoBuffer);
      console.log("meshletInfoBuffer", meshletInfoArray.byteLength);
      console.log("meshInfoBufferArray", meshInfoBufferArray.byteLength);
      console.log("objectInfoBufferArray", objectInfoBufferArray.byteLength);
      console.timeEnd("GGGG");
      console.log("verticesArray", verticesArray.length);
      this.vertexBuffer = Buffer3.Create(verticesArray.byteLength, 0 /* STORAGE */);
      this.vertexBuffer.name = "vertexBuffer";
      this.vertexBuffer.SetArray(verticesArray);
      this.shader.SetBuffer("vertices", this.vertexBuffer);
      this.currentMeshCount = sceneMeshlets.length;
      console.timeEnd("buildMeshletData");
      Debugger.SetTotalMeshlets(meshlets.length);
    }
  }
  execute(resources) {
    const mainCamera = Camera.mainCamera;
    const scene = mainCamera.gameObject.scene;
    const sceneMeshlets = [...scene.GetComponents(MeshletMesh)];
    let meshletsCount = 0;
    for (const meshlet of sceneMeshlets) {
      meshletsCount += meshlet.meshlets.length;
    }
    if (meshletsCount === 0) return;
    this.buildMeshletData();
    this.shader.SetMatrix4("viewMatrix", mainCamera.viewMatrix);
    this.frustum.setFromProjectionMatrix(mainCamera.projectionMatrix);
    this.shader.SetMatrix4("projectionMatrix", mainCamera.projectionMatrix);
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
      meshletsCount,
      0,
      0,
      0,
      Renderer.width,
      Renderer.height,
      0,
      0
    ]);
    if (!this.cullData) {
      this.cullData = Buffer3.Create(cullDataArray.byteLength, 0 /* STORAGE */);
      this.cullData.name = "cullData";
      this.compute.SetBuffer("cullData", this.cullData);
    }
    this.cullData.SetArray(cullDataArray);
    if (!this.computeDrawBuffer) {
      this.computeDrawBuffer = Buffer3.Create(4 * 4, 1 /* STORAGE_WRITE */);
      this.computeDrawBuffer.name = "computeDrawBuffer";
      this.compute.SetBuffer("drawBuffer", this.computeDrawBuffer);
      this.instanceInfoBuffer = Buffer3.Create(meshletsCount * 1 * 4, 1 /* STORAGE_WRITE */);
      this.instanceInfoBuffer.name = "instanceInfoBuffer";
      this.compute.SetBuffer("instanceInfo", this.instanceInfoBuffer);
      this.shader.SetBuffer("instanceInfo", this.instanceInfoBuffer);
    }
    RendererContext.ClearBuffer(this.computeDrawBuffer);
    ComputeContext.BeginComputePass("GPUDriven - Culling", true);
    const workgroupSizeX = Math.floor((meshletsCount + workgroupSize - 1) / workgroupSize);
    ComputeContext.Dispatch(this.compute, workgroupSizeX);
    ComputeContext.EndComputePass();
    RendererContext.CopyBufferToBuffer(this.computeDrawBuffer, this.drawIndirectBuffer);
    RendererContext.BeginRenderPass("GPUDriven - Indirect", [{ clear: true }], { target: this.depthTarget, clear: true }, true);
    RendererContext.DrawIndirect(this.geometry, this.shader, this.drawIndirectBuffer);
    RendererContext.EndRenderPass();
    this.computeDrawBuffer.GetData().then((v) => {
      const visibleMeshCount = new Uint32Array(v)[1];
      Debugger.SetVisibleMeshes(visibleMeshCount);
      Debugger.SetTriangleCount(vertexSize / 3 * meshletsCount);
      Debugger.SetVisibleTriangleCount(vertexSize / 3 * visibleMeshCount);
    });
  }
};

// src/renderer/RenderingPipeline.ts
var RenderingPipeline = class {
  renderer;
  renderGraph;
  debuggerPass;
  frame = 0;
  passes = {
    // SetMainCamera: new SetMeshRenderCameraPass({outputs: [PassParams.MainCamera]}),
    // DeferredMeshRenderPass: new DeferredMeshRenderPass(PassParams.MainCamera, PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth),
    // ShadowPass: new ShadowPass(PassParams.ShadowPassDepth),
    // DeferredLightingPass: new DeferredLightingPass(PassParams.GBufferAlbedo, PassParams.GBufferNormal, PassParams.GBufferERMO, PassParams.GBufferDepth, PassParams.ShadowPassDepth, PassParams.LightingPassOutput),
    // SSGI: new SSGI(PassParams.GBufferDepth, PassParams.GBufferNormal, PassParams.LightingPassOutput, PassParams.GBufferAlbedo)
    GPUDriven: new GPUDriven()
  };
  constructor(renderer) {
    this.renderer = renderer;
    this.renderGraph = new RenderGraph();
    for (const pass of Object.keys(this.passes)) {
      this.renderGraph.addPass(this.passes[pass]);
    }
    this.debuggerPass = new DebuggerPass();
  }
  async Render(scene) {
    if (this.frame % 100 == 0) {
      Debugger.ResetFrame();
    }
    this.renderer.BeginRenderFrame();
    this.renderGraph.execute();
    this.renderer.EndRenderFrame();
    await WEBGPUTimestampQuery.GetResult();
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

// src/plugins/OBJLoader.ts
var OBJLoaderIndexed = class _OBJLoaderIndexed {
  static *triangulate(elements) {
    if (elements.length <= 3) {
      yield elements;
    } else if (elements.length === 4) {
      yield [elements[0], elements[1], elements[2]];
      yield [elements[2], elements[3], elements[0]];
    } else {
      for (let i = 1; i < elements.length - 1; i++) {
        yield [elements[0], elements[i], elements[i + 1]];
      }
    }
  }
  static async load(url) {
    const contents = await fetch(url).then((response) => response.text());
    return _OBJLoaderIndexed.parse(contents);
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
};

// src/TEST/GPUDriven.ts
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
  camera.SetPerspective(36, canvas.width / canvas.height, 0.5, 5e4);
  const controls = new OrbitControls(camera);
  controls.connect(canvas);
  const sphereGeometry = Geometry.Sphere();
  const cubeGeometry = Geometry.Cube();
  const bunnyObj = await OBJLoaderIndexed.load("./bunny.obj");
  const bunnyGeometry = new Geometry();
  bunnyGeometry.attributes.set("position", new VertexAttribute(bunnyObj.vertices));
  bunnyGeometry.index = new IndexAttribute(bunnyObj.indices);
  console.log(bunnyObj);
  const n = 20;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const cube = new GameObject(scene);
        cube.transform.scale.set(20, 20, 20);
        cube.transform.position.set(x * 10, y * 10, z * 10);
        const cubeMesh = cube.AddComponent(MeshletMesh);
        await cubeMesh.SetGeometry(bunnyGeometry);
      }
    }
  }
  scene.Start();
}
Application();
