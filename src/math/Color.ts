import { Vector3 } from "./Vector3";
import { Vector4 } from "./Vector4";

export class Color {
    private _elements = new Float32Array([0,0,0,0]);
    public get elements(): Float32Array { this._elements.set([this.r, this.g, this.b, this.a]); return this._elements};

    constructor(public r = 0, public g = 0, public b = 0, public a = 1) {}
    
    public set(r: number, g: number, b: number, a: number) { this.r = r; this.g = g; this.b = b; this.a = a }
    public static fromVector(v: Vector3 | Vector4): Color { return new Color(v.x, v.y, v.z, v instanceof Vector4 ? v.w : 0) }
}