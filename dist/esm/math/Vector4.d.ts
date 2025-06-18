import { Matrix4 } from "./Matrix4";
export declare class Vector4 {
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
    set(x: number, y: number, z: number, w: number): Vector4;
    setX(x: number): Vector4;
    setY(y: number): Vector4;
    setZ(z: number): Vector4;
    setW(w: number): Vector4;
    clone(): Vector4;
    copy(v: Vector4): Vector4;
    applyMatrix4(m: Matrix4): Vector4;
    normalize(): Vector4;
    length(): number;
    toString(): string;
}
