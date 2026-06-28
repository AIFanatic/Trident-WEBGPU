import { Vector3 } from "./Vector3";
import { Vector4 } from "./Vector4";

export class Color {
    private _elements = new Float32Array([0, 0, 0, 0]);
    public get elements(): Float32Array { this._elements.set([this.r, this.g, this.b, this.a]); return this._elements };

    constructor(public r = 0, public g = 0, public b = 0, public a = 1) { }

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

    public copy(color: Color): Color {
        this.set(color.r, color.g, color.b, color.a);
        return this;
    }

    // This mehods need to be cleaned with the above
    public static HexToRGB(hex: string) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
        const int = parseInt(hex, 16);
        return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
    }

    public static RGBToHex(r: number, g: number, b: number) {
        const toHex = (c: number) => c.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    public static HSVToRGB(h: number, s: number, v: number) {
        let c = v * s;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = v - c;

        let r, g, b;
        if (h < 60) [r, g, b] = [c, x, 0];
        else if (h < 120) [r, g, b] = [x, c, 0];
        else if (h < 180) [r, g, b] = [0, c, x];
        else if (h < 240) [r, g, b] = [0, x, c];
        else if (h < 300) [r, g, b] = [x, 0, c];
        else[r, g, b] = [c, 0, x];

        return { r: r + m, g: g + m, b: b + m };
    }

    public static RGBToHSV(r: number, g: number, b: number) {
        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let d = max - min, h, s, v = max;
        s = max === 0 ? 0 : d / max;
        if (d === 0) h = 0;
        else if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return { h: h * 60, s, v };
    }
}