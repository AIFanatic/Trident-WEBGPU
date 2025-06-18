import { Quaternion } from "./Quaternion";
import { Vector3 } from "./Vector3";
export declare class Matrix4 {
    elements: Float32Array;
    constructor(n11?: number, n12?: number, n13?: number, n14?: number, n21?: number, n22?: number, n23?: number, n24?: number, n31?: number, n32?: number, n33?: number, n34?: number, n41?: number, n42?: number, n43?: number, n44?: number);
    copy(m: Matrix4): this;
    set(n11: number, n12: number, n13: number, n14: number, n21: number, n22: number, n23: number, n24: number, n31: number, n32: number, n33: number, n34: number, n41: number, n42: number, n43: number, n44: number): this;
    setFromArray(array: ArrayLike<number>): Matrix4;
    clone(): Matrix4;
    compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
    decompose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
    mul(m: Matrix4): this;
    premultiply(m: Matrix4): this;
    multiplyMatrices(a: Matrix4, b: Matrix4): this;
    invert(): Matrix4;
    determinant(): number;
    transpose(): this;
    perspective(fov: number, aspect: number, near: number, far: number): Matrix4;
    perspectiveZO(fovy: number, aspect: number, near: number, far: number): Matrix4;
    perspectiveLH(fovy: number, aspect: number, near: number, far: number): Matrix4;
    perspectiveWGPUMatrix(fieldOfViewYInRadians: number, aspect: number, zNear: number, zFar: number): Matrix4;
    orthoZO(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4;
    identity(): Matrix4;
    lookAt(eye: Vector3, center: Vector3, up: Vector3): Matrix4;
    translate(v: Vector3): this;
    scale(v: Vector3): this;
    makeTranslation(v: Vector3): this;
    makeScale(v: Vector3): this;
}
