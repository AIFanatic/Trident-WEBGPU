import { Matrix4 } from "./Matrix4";

export class Vector4 {
    public _x: number;
    public _y: number;
    public _z: number;
    public _w: number;

    public get x(): number { return this._x};
    public get y(): number { return this._y};
    public get z(): number { return this._z};
    public get w(): number { return this._w};

    public set x(v: number) { this._x = v };
    public set y(v: number) { this._y = v };
    public set z(v: number) { this._z = v };
    public set w(v: number) { this._w = v };

    private _elements = new Float32Array(4);
    public get elements(): Float32Array {
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

    public set(x: number, y: number, z: number, w: number): Vector4 {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;

        return this;
    }

    public setX(x: number): Vector4 { this.x = x; return this; }
    public setY(y: number): Vector4 { this.y = y; return this; }
    public setZ(z: number): Vector4 { this.z = z; return this; }
    public setW(w: number): Vector4 { this.w = w; return this; }

    public clone(): Vector4 {
        return new Vector4(this.x, this.y, this.z, this.w);
    }

    public copy(v: Vector4) {
        return this.set(v.x, v.y, v.z, v.w);
    }

    public mul(v: Vector4 | number): Vector4 {
        if (v instanceof Vector4) this.x *= v.x, this.y *= v.y, this.z *= v.z, this.w *= v.w;
        else this.x *= v, this.y *= v, this.z *= v, this.w *= v;
        return this;
    }

    public div(v: Vector4 | number): Vector4 {
        if (v instanceof Vector4) this.x /= v.x, this.y /= v.y, this.z /= v.z, this.w /= v.w;
        else this.x /= v, this.y /= v, this.z /= v, this.w /= v;
        return this;
    }

    public add(v: Vector4 | number): Vector4 {
        if (v instanceof Vector4) this.x += v.x, this.y += v.y, this.z += v.z, this.w += v.w;
        else this.x += v, this.y += v, this.z += v, this.w += v;
        return this;
    }

    public sub(v: Vector4 | number): Vector4 {
        if (v instanceof Vector4) this.x -= v.x, this.y -= v.y, this.z -= v.z, this.w -= v.w;
        else this.x -= v, this.y -= v, this.z -= v, this.w -= v;
        return this;
    }

    public applyMatrix4(m: Matrix4): Vector4 {
		const x = this.x, y = this.y, z = this.z, w = this.w;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] * w;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] * w;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] * w;
		this.w = e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] * w;

		return this;
	}

    public normalize(): Vector4 {
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

    public length(): number {
		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w );
	}

    public toString(): string {
        return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)}, ${this.z.toPrecision(2)}, ${this.w.toPrecision(2)})`;
    }
}