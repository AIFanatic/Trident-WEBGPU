export declare class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    static fromArray(array: number[]): Vector3;
}
export declare class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
    static fromArray(array: number[]): Quaternion;
}
export declare class Matrix4 extends Float32Array {
    static create(): Matrix4;
    static clone(a: Matrix4): Matrix4;
    static multiply(out: Matrix4, a: Matrix4, b: Matrix4): Matrix4;
    static fromRotationTranslationScale(out: Matrix4, q: Quaternion, v: Vector3, s: Vector3): Matrix4;
    static fromValues(m00: number, m01: number, m02: number, m03: number, m10: number, m11: number, m12: number, m13: number, m20: number, m21: number, m22: number, m23: number, m30: number, m31: number, m32: number, m33: number): Matrix4;
}
//# sourceMappingURL=Math.d.ts.map