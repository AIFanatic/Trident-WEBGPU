import { Matrix4 } from "./Matrix4";
import { Quaternion } from "./Quaternion";
export declare class Vector3 {
    _x: number;
    _y: number;
    _z: number;
    get x(): number;
    get y(): number;
    get z(): number;
    set x(v: number);
    set y(v: number);
    set z(v: number);
    private _elements;
    get elements(): Float32Array;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): Vector3;
    setX(x: number): Vector3;
    setY(y: number): Vector3;
    setZ(z: number): Vector3;
    clone(): Vector3;
    copy(v: Vector3): Vector3;
    mul(v: Vector3 | number): Vector3;
    div(v: Vector3 | number): Vector3;
    add(v: Vector3 | number): Vector3;
    sub(v: Vector3 | number): Vector3;
    subVectors(a: Vector3, b: Vector3): Vector3;
    applyQuaternion(q: Quaternion): Vector3;
    length(): number;
    lengthSq(): number;
    normalize(): Vector3;
    distanceTo(v: Vector3): number;
    distanceToSquared(v: Vector3): number;
    dot(v: Vector3): number;
    cross(v: Vector3): Vector3;
    crossVectors(a: Vector3, b: Vector3): Vector3;
    applyMatrix4(m: Matrix4): Vector3;
    min(v: Vector3): Vector3;
    max(v: Vector3): Vector3;
    lerp(v: Vector3, t: number): Vector3;
    setFromSphericalCoords(radius: number, phi: number, theta: number): this;
    setFromMatrixPosition(m: Matrix4): Vector3;
    equals(v: Vector3): boolean;
    abs(): Vector3;
    sign(): Vector3;
    transformDirection(m: Matrix4): Vector3;
    toString(): string;
    static fromArray(array: number[]): Vector3;
}
export declare class ObservableVector3 extends Vector3 {
    private onChange;
    get x(): number;
    get y(): number;
    get z(): number;
    set x(value: number);
    set y(value: number);
    set z(value: number);
    constructor(onChange: () => void, x?: number, y?: number, z?: number);
}
//# sourceMappingURL=Vector3.d.ts.map