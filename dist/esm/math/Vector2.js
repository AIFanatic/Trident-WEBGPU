export class Vector2 {
    _x;
    _y;
    get x() { return this._x; }
    ;
    get y() { return this._y; }
    ;
    set x(v) { this._x = v; }
    ;
    set y(v) { this._y = v; }
    ;
    _elements = new Float32Array(3);
    get elements() {
        this._elements[0] = this._x;
        this._elements[1] = this._y;
        return this._elements;
    }
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
    }
    mul(v) {
        if (v instanceof Vector2)
            this.x *= v.x, this.y *= v.y;
        else
            this.x *= v, this.y *= v;
        return this;
    }
    div(v) {
        if (v instanceof Vector2)
            this.x /= v.x, this.y /= v.y;
        else
            this.x /= v, this.y /= v;
        return this;
    }
    add(v) {
        if (v instanceof Vector2)
            this.x += v.x, this.y += v.y;
        else
            this.x += v, this.y += v;
        return this;
    }
    sub(v) {
        if (v instanceof Vector2)
            this.x -= v.x, this.y -= v.y;
        else
            this.x -= v, this.y -= v;
        return this;
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    clone() {
        return new Vector2(this.x, this.y);
    }
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        return this;
    }
    toString() {
        return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)})`;
    }
}
//# sourceMappingURL=Vector2.js.map