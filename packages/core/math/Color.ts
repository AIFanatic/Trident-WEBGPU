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

    public setFromHex(hex: string): Color {
        if (hex.length !== 6 && hex.length !== 8 && !hex.startsWith("#")) {
            throw new Error("Invalid hex color format. Expected #RRGGBB or #RRGGBBAA");
        }
    
        hex = hex.slice(1);
        const r = parseInt(hex.slice(0, 2), 16) / 255;
        const g = parseInt(hex.slice(2, 4), 16) / 255;
        const b = parseInt(hex.slice(4, 6), 16) / 255;
        const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    
        this.set(r, g, b, a);
        return this;
    }

    public clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }
}