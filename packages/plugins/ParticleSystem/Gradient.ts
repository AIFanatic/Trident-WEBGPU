import { GPU } from "@trident/core";

// --- Types
export interface ColorKey { t: number; r: number; g: number; b: number }; // t in [0,1], colors in [0,1] (sRGB inputs)
export interface AlphaKey { t: number; a: number }; // t in [0,1]

export class Gradient {
    public readonly rampTexture: GPU.Texture
    public colorKeys: ColorKey[];
    public alphaKeys: AlphaKey[];

    constructor(textureWidth?: number, format?: GPU.TextureFormat) {
        this.colorKeys = [];
        this.alphaKeys = [];

        this.rampTexture = GPU.Texture.Create(textureWidth || 256, 1, 1, format || "rgba8unorm-srgb");
    }
    
    // --- Helpers (sRGB <-> linear)
    private srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    private linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    private clamp01 = (x: number) => Math.min(1, Math.max(0, x));

    // --- Key evaluation (linear interpolation between bracketing keys)
    private sampleScalar(keys: { t: number; v: number }[], t: number): number {
        if (t <= keys[0].t) return keys[0].v;
        if (t >= keys[keys.length - 1].t) return keys[keys.length - 1].v;
        for (let i = 0; i < keys.length - 1; i++) {
            const a = keys[i], b = keys[i + 1];
            if (t >= a.t && t <= b.t) {
                const u = (t - a.t) / (b.t - a.t);
                return a.v + (b.v - a.v) * u;
            }
        }
        return keys[keys.length - 1].v; // fallback (shouldn't hit)
    }

    private sampleRgbLinear(colorKeysSRGB: ColorKey[], t: number) {
        // convert the two bracketing keys on the fly (keeps code short and allocations low)
        if (t <= colorKeysSRGB[0].t) {
            const k = colorKeysSRGB[0];
            return [this.srgbToLinear(k.r), this.srgbToLinear(k.g), this.srgbToLinear(k.b)];
        }
        if (t >= colorKeysSRGB[colorKeysSRGB.length - 1].t) {
            const k = colorKeysSRGB[colorKeysSRGB.length - 1];
            return [this.srgbToLinear(k.r), this.srgbToLinear(k.g), this.srgbToLinear(k.b)];
        }
        for (let i = 0; i < colorKeysSRGB.length - 1; i++) {
            const a = colorKeysSRGB[i], b = colorKeysSRGB[i + 1];
            if (t >= a.t && t <= b.t) {
                const u = (t - a.t) / (b.t - a.t);
                const ar = this.srgbToLinear(a.r), ag = this.srgbToLinear(a.g), ab = this.srgbToLinear(a.b);
                const br = this.srgbToLinear(b.r), bg = this.srgbToLinear(b.g), bb = this.srgbToLinear(b.b);
                return [ar + (br - ar) * u, ag + (bg - ag) * u, ab + (bb - ab) * u];
            }
        }
        const k = colorKeysSRGB[colorKeysSRGB.length - 1];
        return [this.srgbToLinear(k.r), this.srgbToLinear(k.g), this.srgbToLinear(k.b)];
    }

    // --- Build ramp pixels (Uint8 RGBA)
    private buildGradientRamp(size = 256): Uint8Array {
        const colorKeys = this.colorKeys;
        const alphaKeys = this.alphaKeys;
        if (!colorKeys?.length) return new Uint8Array(size * 4);// throw new Error("gradient.colorKeys must have at least 1 key");
        const A = (alphaKeys && alphaKeys.length)
            ? alphaKeys.map(k => ({ t: k.t, v: this.clamp01(k.a) }))
            : [{ t: 0, v: 1 }, { t: 1, v: 1 }];

        const data = new Uint8Array(size * 4);
        for (let i = 0; i < size; i++) {
            const t = i / (size - 1);
            const [lr, lg, lb] = this.sampleRgbLinear(colorKeys, this.clamp01(t)); // linear space
            const a = this.sampleScalar(A, t);
            const r = this.clamp01(this.linearToSrgb(lr));
            const g = this.clamp01(this.linearToSrgb(lg));
            const b = this.clamp01(this.linearToSrgb(lb));
            const o = i * 4;
            data[o + 0] = (r * 255) | 0;
            data[o + 1] = (g * 255) | 0;
            data[o + 2] = (b * 255) | 0;
            data[o + 3] = (a * 255) | 0;
        }
        return data;
    }

    public updateRampTexture() {
        const ramp = this.buildGradientRamp();
        const width = ramp.length / 4;
        if (width > this.rampTexture.width) throw Error("Ramp texture not big enough");
        this.rampTexture.SetData(ramp, this.rampTexture.width * 4);
    }

    public addColor(color: ColorKey) {
        this.colorKeys.push(color);
        this.updateRampTexture();
    }

    public addAlpha(alpha: AlphaKey) {
        this.alphaKeys.push(alpha);
        this.updateRampTexture();
    }

    public setColorKeys(colorKeys: ColorKey[]) {
        this.colorKeys = colorKeys;
        this.updateRampTexture();
    }

    public setAlphaKeys(alphaKeys: AlphaKey[]) {
        this.alphaKeys = alphaKeys;
        this.updateRampTexture();
    }
}