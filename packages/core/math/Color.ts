import { Vector3 } from "./Vector3";
import { Vector4 } from "./Vector4";

export class Color {
    private _elements = new Float32Array([0,0,0,0]);
    public get elements(): Float32Array { this._elements.set([this.r, this.g, this.b, this.a]); return this._elements};

    constructor(public r = 0, public g = 0, public b = 0, public a = 1) {}
    
    public set(r: number, g: number, b: number, a: number) { this.r = r; this.g = g; this.b = b; this.a = a }
    public static fromVector(v: Vector3 | Vector4): Color { return new Color(v.x, v.y, v.z, v instanceof Vector4 ? v.w : 0) }
    public static fromHex(hex: number) { return new Color(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255) }

    public mul(v: Color | number): Color {
        if (v instanceof Color) this.r *= v.r, this.g *= v.g, this.b *= v.b;
        else this.r *= v, this.g *= v, this.b *= v;

        return this;
    }

    public toHex(): string {
        const r = Math.floor(this.r * 255).toString(16).padStart(2, "0");
        const g = Math.floor(this.g * 255).toString(16).padStart(2, "0");
        const b = Math.floor(this.b * 255).toString(16).padStart(2, "0");
        const a = Math.floor(this.a * 255).toString(16).padStart(2, "0");
        return "#" + r + g + b + a;
    }
}