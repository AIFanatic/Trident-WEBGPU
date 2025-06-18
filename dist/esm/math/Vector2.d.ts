export declare class Vector2 {
    _x: number;
    _y: number;
    get x(): number;
    get y(): number;
    set x(v: number);
    set y(v: number);
    private _elements;
    get elements(): Float32Array;
    constructor(x?: number, y?: number);
    set(x: number, y: number): void;
    mul(v: Vector2 | number): Vector2;
    div(v: Vector2 | number): Vector2;
    add(v: Vector2 | number): Vector2;
    sub(v: Vector2 | number): Vector2;
    dot(v: Vector2): number;
    length(): number;
    clone(): Vector2;
    copy(v: Vector2): Vector2;
    toString(): string;
}
