import { Matrix4 } from "./Matrix4";
import { Quaternion } from "./Quaternion";

export class Vector3 {
    public _x: number;
    public _y: number;
    public _z: number;

    public get x(): number { return this._x};
    public get y(): number { return this._y};
    public get z(): number { return this._z};

    public set x(v: number) { this._x = v };
    public set y(v: number) { this._y = v };
    public set z(v: number) { this._z = v };

    private _elements = new Float32Array(3);
    public get elements(): Float32Array {
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

    public set(x: number, y: number, z: number): Vector3 {
        this.x = x;
        this.y = y;
        this.z = z;

        return this;
    }

    public setX(x: number): Vector3 { this.x = x; return this; }
    public setY(y: number): Vector3 { this.y = y; return this; }
    public setZ(z: number): Vector3 { this.z = z; return this; }

    public clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    public copy(v: Vector3) {
        return this.set(v.x, v.y, v.z);
    }

    public mul(v: Vector3 | number): Vector3 {
        if (v instanceof Vector3) this.x *= v.x, this.y *= v.y, this.z *= v.z;
        else this.x *= v, this.y *= v, this.z *= v;
        return this;
    }

    public div(v: Vector3 | number): Vector3 {
        if (v instanceof Vector3) this.x /= v.x, this.y /= v.y, this.z /= v.z;
        else this.x /= v, this.y /= v, this.z /= v;
        return this;
    }

    public add(v: Vector3 | number): Vector3 {
        if (v instanceof Vector3) this.x += v.x, this.y += v.y, this.z += v.z;
        else this.x += v, this.y += v, this.z += v;
        return this;
    }

    public sub(v: Vector3 | number): Vector3 {
        if (v instanceof Vector3) this.x -= v.x, this.y -= v.y, this.z -= v.z;
        else this.x -= v, this.y -= v, this.z -= v;
        return this;
    }

    public applyQuaternion(q: Quaternion): Vector3 {
        const vx = this.x, vy = this.y, vz = this.z;
        const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

        const tx = 2 * (qy * vz - qz * vy);
        const ty = 2 * (qz * vx - qx * vz);
        const tz = 2 * (qx * vy - qy * vx);

        this.set(
            vx + qw * tx + qy * tz - qz * ty,
            vy + qw * ty + qz * tx - qx * tz,
            vz + qw * tz + qx * ty - qy * tx
        )

        return this;
    }

    public length(): number {
        return Math.hypot(this.x, this.y, this.z);
    }

    public normalize(): Vector3 {
        return this.div(this.length() || 1)
    }

    public distanceTo(v: Vector3): number {
        return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z)
    }

    public dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z
    }

    public cross(v: Vector3): Vector3 {
        return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x)
    }

	public applyMatrix4(m: Matrix4 ): Vector3 {
		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		const w = 1 / ( e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] );

		this.x = ( e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] ) * w;
		this.y = ( e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] ) * w;
		this.z = ( e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] ) * w;

		return this;
	}
}

export class ObservableVector3 extends Vector3 {
    private onChange: () => void;

    public get x(): number { return this._x};
    public get y(): number { return this._y};
    public get z(): number { return this._z};
    
    set x(value: number) { this._x = value; if (this.onChange) this.onChange(); }
    set y(value: number) { this._y = value; if (this.onChange) this.onChange(); }
    set z(value: number) { this._z = value; if (this.onChange) this.onChange(); }
    
    constructor(onChange: () => void, x = 0, y = 0, z = 0) {
        super(x, y, z);
        this.onChange = onChange;
    }
}