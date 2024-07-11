export class Vector2 {
    public x: number;
    public y: number;

    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
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
}