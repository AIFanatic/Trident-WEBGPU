export class Color {
    private _elements = new Float32Array([0,0,0,0]);
    public get elements(): Float32Array { this._elements.set([this.r, this.g, this.b, this.a]); return this._elements};

    constructor(public r = 0, public g = 0, public b = 0, public a = 1) {}
    
    public set(r: number, g: number, b: number, a: number) { this.r = r; this.g = g; this.b = b; this.a = a }
}