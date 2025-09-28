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
        this._x = x;
        this._y = y;
        this._z = z;
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

	public subVectors(a: Vector3, b: Vector3): Vector3 {
		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;
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

	public lengthSq(): number {
		return this.x * this.x + this.y * this.y + this.z * this.z;
	}

    public normalize(): Vector3 {
        return this.div(this.length() || 1)
    }

    public distanceTo(v: Vector3): number {
        return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z)
    }

	public distanceToSquared(v: Vector3): number {
		const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
		return dx * dx + dy * dy + dz * dz;
	}

    public dot(v: Vector3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z
    }

    public cross(v: Vector3): Vector3 {
        return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x)
    }

	public crossVectors(a: Vector3, b: Vector3): Vector3 {
		const ax = a.x, ay = a.y, az = a.z;
		const bx = b.x, by = b.y, bz = b.z;

		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;

		return this;
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

    public applyEuler(euler: Vector3 ): Vector3 {
		return this.applyQuaternion( _quaternion.setFromEuler( euler ) );
	}

    public min(v: Vector3): Vector3 {
		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );
		this.z = Math.min( this.z, v.z );

		return this;
	}

	public max(v: Vector3): Vector3 {
		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );
		this.z = Math.max( this.z, v.z );

		return this;
	}

    public lerp(v: Vector3, t: number): Vector3 {
        this.x = this.x + t * (v.x - this.x);
        this.y = this.y + t * (v.y - this.y);
        this.z = this.z + t * (v.z - this.z);
        return this;
    }

	public setFromSphericalCoords(radius: number, phi: number, theta: number) {
		const sinPhiRadius = Math.sin( phi ) * radius;
		this.x = sinPhiRadius * Math.sin( theta );
		this.y = Math.cos( phi ) * radius;
		this.z = sinPhiRadius * Math.cos( theta );
		return this;
	}

	public setFromMatrixPosition(m: Matrix4): Vector3 {
		const e = m.elements;
		this.x = e[ 12 ];
		this.y = e[ 13 ];
		this.z = e[ 14 ];
		return this;
	}

    public equals(v: Vector3): boolean {
        const EPS = 1e-4;
		return ( 
            Math.abs(v.x - this.x) < EPS &&
            Math.abs(v.y - this.y) < EPS &&
            Math.abs(v.z - this.z) < EPS
        );
	}

    public abs(): Vector3 {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        this.z = Math.abs(this.z);
        return this;
    }

    public sign(): Vector3 {
        this.x = Math.sign(this.x);
        this.y = Math.sign(this.y);
        this.z = Math.sign(this.z);
        return this;
    }

	public transformDirection( m: Matrix4 ): Vector3 {
		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;

		return this.normalize();
	}

    public toString(): string {
        return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)}, ${this.z.toPrecision(2)})`;
    }

    public static fromArray(array: number[]): Vector3 {
        if (array.length < 3) throw Error("Array doesn't have enough data");
        return new Vector3(array[0], array[1], array[2]);
    }

    public Serialize(): { type: string } & Record<string, unknown> {
        return {type: "@trident/core/math/Vector3", x: this.x, y: this.y, z: this.z};
    }

    public Deserialize(data: any): Vector3 {
        this.set(data.x, data.y, data.z);
        return this;
    }
}

export class ObservableVector3 extends Vector3 {
    private onChange: () => void;

    public get x(): number { return this._x};
    public get y(): number { return this._y};
    public get z(): number { return this._z};
    
    set x(value: number) {
        if (value !== this.x) {
            this._x = value;
            if (this.onChange) {
                this.onChange();
            }
        }
    }
    set y(value: number) {
        if (value !== this.y) {
            this._y = value;
            if (this.onChange) this.onChange();
        }
    }
    set z(value: number) {
        if (value !== this.z) {
            this._z = value;
            if (this.onChange) this.onChange();
        }
    }
    
    constructor(onChange: () => void, x = 0, y = 0, z = 0) {
        super(x, y, z);
        this.onChange = onChange;
    }
}

const _quaternion = new Quaternion();
