import { Matrix4 } from "./Matrix4";
import { Vector3 } from "./Vector3";
export declare class Quaternion {
    private _a;
    private _b;
    private _c;
    _x: number;
    _y: number;
    _z: number;
    _w: number;
    get x(): number;
    get y(): number;
    get z(): number;
    get w(): number;
    set x(v: number);
    set y(v: number);
    set z(v: number);
    set w(v: number);
    private _elements;
    get elements(): Float32Array;
    constructor(x?: number, y?: number, z?: number, w?: number);
    equals(v: Quaternion): boolean;
    set(x: number, y: number, z: number, w: number): Quaternion;
    clone(): Quaternion;
    copy(quaternion: Quaternion): Quaternion;
    fromEuler(euler: Vector3, inDegrees?: boolean): Quaternion;
    toEuler(out?: Vector3, inDegrees?: boolean): Vector3;
    mul(b: Quaternion): Quaternion;
    lookAt(eye: Vector3, target: Vector3, up: Vector3): Quaternion;
    setFromAxisAngle(axis: Vector3, angle: number): Quaternion;
    setFromRotationMatrix(m: Matrix4): this;
    static fromArray(array: number[]): Quaternion;
}
export declare class ObservableQuaternion extends Quaternion {
    private onChange;
    get x(): number;
    get y(): number;
    get z(): number;
    get w(): number;
    set x(value: number);
    set y(value: number);
    set z(value: number);
    set w(value: number);
    constructor(onChange: () => void, x?: number, y?: number, z?: number, w?: number);
}
