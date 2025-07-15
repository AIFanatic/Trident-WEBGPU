import { Vector4 } from "./Vector4";
export class Color {
    r;
    g;
    b;
    a;
    _elements = new Float32Array([0, 0, 0, 0]);
    get elements() { this._elements.set([this.r, this.g, this.b, this.a]); return this._elements; }
    ;
    constructor(r = 0, g = 0, b = 0, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    set(r, g, b, a) { this.r = r; this.g = g; this.b = b; this.a = a; }
    static fromVector(v) { return new Color(v.x, v.y, v.z, v instanceof Vector4 ? v.w : 0); }
    static fromHex(hex) { return new Color(((hex >> 16) & 0xff) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255); }
    mul(v) {
        if (v instanceof Color)
            this.r *= v.r, this.g *= v.g, this.b *= v.b;
        else
            this.r *= v, this.g *= v, this.b *= v;
        return this;
    }
    toHex() {
        const r = Math.floor(this.r * 255).toString(16).padStart(2, "0");
        const g = Math.floor(this.g * 255).toString(16).padStart(2, "0");
        const b = Math.floor(this.b * 255).toString(16).padStart(2, "0");
        const a = Math.floor(this.a * 255).toString(16).padStart(2, "0");
        return "#" + r + g + b + a;
    }
}
