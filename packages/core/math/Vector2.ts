export class Vector2 {
    public _x: number;
    public _y: number;

    public get x(): number { return this._x};
    public get y(): number { return this._y};

    public set x(v: number) { this._x = v };
    public set y(v: number) { this._y = v };

    private _elements = new Float32Array(2);
    public get elements(): Float32Array {
        this._elements[0] = this._x;
        this._elements[1] = this._y;
        return this._elements;
    }

    constructor(x = 0, y = 0) {
        this._x = x;
        this._y = y;
    }

    public set(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public mul(v: Vector2 | number): Vector2 {
        if (v instanceof Vector2) this.x *= v.x, this.y *= v.y;
        else this.x *= v, this.y *= v;
        return this;
    }

    public div(v: Vector2 | number): Vector2 {
        if (v instanceof Vector2) this.x /= v.x, this.y /= v.y;
        else this.x /= v, this.y /= v;
        return this;
    }

    public add(v: Vector2 | number): Vector2 {
        if (v instanceof Vector2) this.x += v.x, this.y += v.y;
        else this.x += v, this.y += v;
        return this;
    }

    public sub(v: Vector2 | number): Vector2 {
        if (v instanceof Vector2) this.x -= v.x, this.y -= v.y;
        else this.x -= v, this.y -= v;
        return this;
    }

    public dot(v: Vector2): number {
        return this.x * v.x + this.y * v.y;
    }

    public length(): number {
		return Math.sqrt( this.x * this.x + this.y * this.y );
	}

    public clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    public copy(v: Vector2): Vector2 {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    public toString(): string {
        return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)})`;
    }
}