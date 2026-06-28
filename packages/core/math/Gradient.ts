export interface ColorKey { t: number; r: number; g: number; b: number }; // t in [0,1], colors in [0,1] (sRGB inputs)
export interface AlphaKey { t: number; a: number }; // t in [0,1]

export class Gradient {
    public colorKeys: ColorKey[] = [];
    public alphaKeys: AlphaKey[] = [];

    public addColor(color: ColorKey) { this.colorKeys.push(color) }
    public addAlpha(alpha: AlphaKey) { this.alphaKeys.push(alpha) }
    public setColorKeys(colorKeys: ColorKey[]) { this.colorKeys = colorKeys }
    public setAlphaKeys(alphaKeys: AlphaKey[]) { this.alphaKeys = alphaKeys }
}