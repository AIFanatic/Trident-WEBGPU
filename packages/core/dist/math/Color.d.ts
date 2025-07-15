import { Vector3 } from "./Vector3";
import { Vector4 } from "./Vector4";
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    private _elements;
    get elements(): Float32Array;
    constructor(r?: number, g?: number, b?: number, a?: number);
    set(r: number, g: number, b: number, a: number): void;
    static fromVector(v: Vector3 | Vector4): Color;
    static fromHex(hex: number): Color;
    mul(v: Color | number): Color;
    toHex(): string;
}
//# sourceMappingURL=Color.d.ts.map