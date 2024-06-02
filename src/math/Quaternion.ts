import { Vector3 } from "./Vector3";

const EPSILON = 0.0001;

export class Quaternion {
    private _a = new Vector3()
    private _b = new Vector3()
    private _c = new Vector3()

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

    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
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

    lookAt(eye: Vector3, target: Vector3, up: Vector3): Quaternion {
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
            return this.set((sm31 + sm13) / S, (sm23 + sm32) / S, S / 4, (sm12 - sm21) / S)
        }
    }
}

export class ObservableQuaternion extends Quaternion {
    private onChange: () => void;

    public get x(): number { return this._x};
    public get y(): number { return this._y};
    public get z(): number { return this._z};
    public get w(): number { return this._w};
    
    set x(value: number) { this._x = value; if (this.onChange) this.onChange(); }
    set y(value: number) { this._y = value; if (this.onChange) this.onChange(); }
    set z(value: number) { this._z = value; if (this.onChange) this.onChange(); }
    set w(value: number) { this._w = value; if (this.onChange) this.onChange(); }
    
    constructor(onChange: () => void, x = 0, y = 0, z = 0, w = 1) {
        super(x, y, z, w);
        this.onChange = onChange;
    }
}