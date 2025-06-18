export class Vector3 {
    _x;
    _y;
    _z;
    get x() { return this._x; }
    ;
    get y() { return this._y; }
    ;
    get z() { return this._z; }
    ;
    set x(v) { this._x = v; }
    ;
    set y(v) { this._y = v; }
    ;
    set z(v) { this._z = v; }
    ;
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
    setX(x) { this.x = x; return this; }
    setY(y) { this.y = y; return this; }
    setZ(z) { this.z = z; return this; }
    clone() {
        return new Vector3(this.x, this.y, this.z);
    }
    copy(v) {
        return this.set(v.x, v.y, v.z);
    }
    mul(v) {
        if (v instanceof Vector3)
            this.x *= v.x, this.y *= v.y, this.z *= v.z;
        else
            this.x *= v, this.y *= v, this.z *= v;
        return this;
    }
    div(v) {
        if (v instanceof Vector3)
            this.x /= v.x, this.y /= v.y, this.z /= v.z;
        else
            this.x /= v, this.y /= v, this.z /= v;
        return this;
    }
    add(v) {
        if (v instanceof Vector3)
            this.x += v.x, this.y += v.y, this.z += v.z;
        else
            this.x += v, this.y += v, this.z += v;
        return this;
    }
    sub(v) {
        if (v instanceof Vector3)
            this.x -= v.x, this.y -= v.y, this.z -= v.z;
        else
            this.x -= v, this.y -= v, this.z -= v;
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
        this.set(vx + qw * tx + qy * tz - qz * ty, vy + qw * ty + qz * tx - qx * tz, vz + qw * tz + qx * ty - qy * tx);
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
        return (Math.abs(v.x - this.x) < EPS &&
            Math.abs(v.y - this.y) < EPS &&
            Math.abs(v.z - this.z) < EPS);
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
        if (array.length < 3)
            throw Error("Array doesn't have enough data");
        return new Vector3(array[0], array[1], array[2]);
    }
}
export class ObservableVector3 extends Vector3 {
    onChange;
    get x() { return this._x; }
    ;
    get y() { return this._y; }
    ;
    get z() { return this._z; }
    ;
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
            if (this.onChange)
                this.onChange();
        }
    }
    set z(value) {
        if (value !== this.z) {
            this._z = value;
            if (this.onChange)
                this.onChange();
        }
    }
    constructor(onChange, x = 0, y = 0, z = 0) {
        super(x, y, z);
        this.onChange = onChange;
    }
}
//# sourceMappingURL=Vector3.js.map