import { Matrix4 } from "./Matrix4";
import { Vector3 } from "./Vector3";

const EPSILON = 0.0001;

export class Quaternion {
    private _a = new Vector3();
    private _b = new Vector3();
    private _c = new Vector3();

    public _x: number;
    public _y: number;
    public _z: number;
    public _w: number;

    public get x(): number { return this._x };
    public get y(): number { return this._y };
    public get z(): number { return this._z };
    public get w(): number { return this._w };

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

    constructor(x = 0, y = 0, z = 0, w = 1) {
        this._x = x;
        this._y = y;
        this._z = z;
        this._w = w;
    }

    public equals(v: Quaternion): boolean {
        return Math.abs(v.x - this.x) < EPSILON && Math.abs(v.y - this.y) < EPSILON && Math.abs(v.z - this.z) < EPSILON && Math.abs(v.w - this.w) < EPSILON;
    }

    public set(x: number, y: number, z: number, w: number): Quaternion {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;

        return this;
    }

    public clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }

    public copy(quaternion: Quaternion): Quaternion {
        this.x = quaternion.x;
        this.y = quaternion.y;
        this.z = quaternion.z;
        this.w = quaternion.w;

        return this;
    }

    public fromEuler(euler: Vector3, inDegrees: boolean = false): Quaternion {
        const roll = inDegrees ? euler.x * Math.PI / 180 : euler.x;
        const pitch = inDegrees ? euler.y * Math.PI / 180 : euler.y;
        const yaw = inDegrees ? euler.z * Math.PI / 180 : euler.z;
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);

        // XYZ
        this.w = cr * cp * cy + sr * sp * sy;
        this.x = sr * cp * cy - cr * sp * sy;
        this.y = cr * sp * cy + sr * cp * sy;
        this.z = cr * cp * sy - sr * sp * cy;

        return this;
    }

    public toEuler(inDegrees = false): Vector3 {
        const out = new Vector3();
        // roll (x-axis rotation)
        const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
        const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
        out.x = Math.atan2(sinr_cosp, cosr_cosp);

        // pitch (y-axis rotation)
        const sinp = Math.sqrt(1 + 2 * (this.w * this.y - this.x * this.z));
        const cosp = Math.sqrt(1 - 2 * (this.w * this.y - this.x * this.z));
        out.y = 2 * Math.atan2(sinp, cosp) - Math.PI / 2;

        // yaw (z-axis rotation)
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

    public mul(b: Quaternion): Quaternion {
        // from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

        const qax = this._x, qay = this._y, qaz = this._z, qaw = this._w;
        const qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;

        this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        return this;
    }

    public lookAt(eye: Vector3, target: Vector3, up: Vector3): Quaternion {
        const z = this._a.copy(eye).sub(target)

        // eye and target are in the same position
        if (z.length() === 0) z.z = 1
        else z.normalize()

        const x = this._b.copy(up).cross(z)

        // up and z are parallel
        if (x.length() === 0) {
            const pup = this._c.copy(up)

            if (pup.z) pup.x += EPSILON
            else if (pup.y) pup.z += EPSILON
            else pup.y += EPSILON

            x.cross(pup)
        }
        x.normalize()

        const y = this._c.copy(z).cross(x)

        const [sm11, sm12, sm13] = [x.x, x.y, x.z]
        const [sm21, sm22, sm23] = [y.x, y.y, y.z]
        const [sm31, sm32, sm33] = [z.x, z.y, z.z]

        const trace = sm11 + sm22 + sm33

        if (trace > 0) {
            const S = Math.sqrt(trace + 1) * 2
            return this.set((sm23 - sm32) / S, (sm31 - sm13) / S, (sm12 - sm21) / S, S / 4)
        } else if (sm11 > sm22 && sm11 > sm33) {
            const S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2
            return this.set(S / 4, (sm12 + sm21) / S, (sm31 + sm13) / S, (sm23 - sm32) / S)
        } else if (sm22 > sm33) {
            const S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2
            return this.set((sm12 + sm21) / S, S / 4, (sm23 + sm32) / S, (sm31 - sm13) / S)
        } else {
            const S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2
            this.set((sm31 + sm13) / S, (sm23 + sm32) / S, S / 4, (sm12 - sm21) / S)
        }
        // Ensure the quaternion is normalized                                                                                                                                                         │ │
        const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)
        if (length > EPSILON) {
            this.x /= length                                                                           
            this.y /= length                                                                           
            this.z /= length                                                                           
            this.w /= length                                                                           
        } else {                                                                                       
            // Fallback to identity quaternion if length is too small                                  
            this.set(0, 0, 0, 1)                                                                       
        }                                                                                              
                                                                                                                    
        return this
    }

    public setFromAxisAngle(axis: Vector3, angle: number): Quaternion {
        // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

        // assumes axis is normalized

        const halfAngle = angle / 2, s = Math.sin(halfAngle);

        this._x = axis.x * s;
        this._y = axis.y * s;
        this._z = axis.z * s;
        this._w = Math.cos(halfAngle);

        return this;
    }

    public setFromRotationMatrix(m: Matrix4) {
        // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

        // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

        const te = m.elements,

            m11 = te[0], m12 = te[4], m13 = te[8],
            m21 = te[1], m22 = te[5], m23 = te[9],
            m31 = te[2], m32 = te[6], m33 = te[10],

            trace = m11 + m22 + m33;

        if (trace > 0) {

            const s = 0.5 / Math.sqrt(trace + 1.0);

            this._w = 0.25 / s;
            this._x = (m32 - m23) * s;
            this._y = (m13 - m31) * s;
            this._z = (m21 - m12) * s;

        } else if (m11 > m22 && m11 > m33) {

            const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

            this._w = (m32 - m23) / s;
            this._x = 0.25 * s;
            this._y = (m12 + m21) / s;
            this._z = (m13 + m31) / s;

        } else if (m22 > m33) {

            const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

            this._w = (m13 - m31) / s;
            this._x = (m12 + m21) / s;
            this._y = 0.25 * s;
            this._z = (m23 + m32) / s;

        } else {

            const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

            this._w = (m21 - m12) / s;
            this._x = (m13 + m31) / s;
            this._y = (m23 + m32) / s;
            this._z = 0.25 * s;

        }

        return this;
    }

    public length(): number {
		return Math.sqrt( this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w );
	}

    public normalize(): Quaternion {
		let l = this.length();
		if ( l === 0 ) {
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

    public dot(v: Quaternion): number {
		return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;
	}

    public slerp(qb: Quaternion, t: number): Quaternion {
		if ( t <= 0 ) return this;
		if ( t >= 1 ) return this.copy( qb ); // copy calls _onChangeCallback()

		let x = qb._x, y = qb._y, z = qb._z, w = qb._w;
		let dot = this.dot( qb );

		if ( dot < 0 ) {
			x = - x;
			y = - y;
			z = - z;
			w = - w;

			dot = - dot;
		}

		let s = 1 - t;

		if ( dot < 0.9995 ) {
			// slerp

			const theta = Math.acos( dot );
			const sin = Math.sin( theta );

			s = Math.sin( s * theta ) / sin;
			t = Math.sin( t * theta ) / sin;

			this._x = this._x * s + x * t;
			this._y = this._y * s + y * t;
			this._z = this._z * s + z * t;
			this._w = this._w * s + w * t;
		} else {
			// for small angles, lerp then normalize
			this._x = this._x * s + x * t;
			this._y = this._y * s + y * t;
			this._z = this._z * s + z * t;
			this._w = this._w * s + w * t;

			this.normalize(); // normalize calls _onChangeCallback()
		}

		return this;
	}

    public static fromArray(array: number[]): Quaternion {
        if (array.length < 4) throw Error("Array doesn't have enough data");
        return new Quaternion(array[0], array[1], array[2], array[3]);
    }

    public Serialize(): { type: string } & Record<string, unknown> {
        return {type: "@trident/core/math/Quaternion", x: this.x, y: this.y, z: this.z, w: this.w};
    }

    public Deserialize(data: any): Quaternion {
        this.set(data.x, data.y, data.z, data.w);
        return this;
    }
}

export class ObservableQuaternion extends Quaternion {
    private onChange: () => void;

    public get x(): number { return this._x };
    public get y(): number { return this._y };
    public get z(): number { return this._z };
    public get w(): number { return this._w };

    set x(value: number) {
        if (value !== this.x) {
            this._x = value;
            if (this.onChange) this.onChange();
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
    set w(value: number) {
        if (value !== this.w) {
            this._w = value;
            if (this.onChange) this.onChange();
        }
    }

    constructor(onChange: () => void, x = 0, y = 0, z = 0, w = 1) {
        super(x, y, z, w);
        this.onChange = onChange;
    }
}