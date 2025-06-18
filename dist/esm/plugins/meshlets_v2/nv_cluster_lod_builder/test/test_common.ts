import { AABB } from "../nvcluster";
import { assert } from "../nvclusterlod_common";
import { vec3, vec4 } from "../nvclusterlod_mesh";

export function ASSERT_EQ(a: number, b: number) {
    if (a !== b) throw Error(`ASSERT_EQ: ${a} !== ${b}`);
}

export function EXPECT_EQ(a: number, b: number) {
    return ASSERT_EQ(a, b);
}

export function EXPECT_GT(a: number, b: number) {
    return assert(a > b);
}

export function EXPECT_GE(a: number, b: number) {
    return assert(a >= b);
}

export function EXPECT_LE(a: number, b: number) {
    return assert(a <= b);
}

export function EXPECT_TRUE(condition: boolean) {
    return assert(condition === true);
}

export function EXPECT_FALSE(condition: boolean) {
    return assert(condition === false);
}

export function EXPECT_NEAR(val1: number, val2: number, abs_error: number) {
    return assert(Math.abs(val1 - val2) < abs_error);
}

export function make_vec3(a: number[]): vec3 {
    return new vec3(a[0], a[1], a[2]);
}

// Adds two vec3s.
export function add(a: vec3, b: vec3): vec3 {
    return new vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

export function mul(v: vec3, a: number): vec3 {
    return new vec3(v.x * a, v.y * a, v.z * a);
}

// Subtracts two vec3s.
export function sub(a: vec3, b: vec3): vec3 {
    return new vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// Returns the squared length of a vec3.
export function lengthSquared(v: vec3): number {
    return v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
}

export function length(v: vec3): number {
    return Math.sqrt(lengthSquared(v));
}

// Normalizes a vec3.
export function normalize(v: vec3): vec3 {
    const lengthSquared: number = v.x * v.x + v.y * v.y + v.z * v.z;
    const factor: number = (lengthSquared == 0.0) ? 1.0 : (1.0 / Math.sqrt(lengthSquared));
    return mul(v, factor);
}

export class mat4 {
    public columns: vec4[] = new Array(4).fill(null).map(() => new vec4())

    constructor(v0: vec4, v1: vec4, v2: vec4, v3: vec4) {
        this.columns[0] = v0;
        this.columns[1] = v1;
        this.columns[2] = v2;
        this.columns[3] = v3;
    }

    public static identity(): mat4 {
        return new mat4(
            new vec4(1, 0, 0, 0),
            new vec4(0, 1, 0, 0),
            new vec4(0, 0, 1, 0),
            new vec4(0, 0, 0, 1)
        );
    }

    public static fromArray(a: number[]): mat4 {
        return new mat4(
            new vec4(a[0], a[1], a[2], a[3]),
            new vec4(a[4], a[5], a[6], a[7]),
            new vec4(a[8], a[9], a[10], a[11]),
            new vec4(a[12], a[13], a[14], a[15])
        );
    }

    public static makeTranslation(translation: vec3): mat4 {
        let result: mat4 = mat4.identity();
        for (let i = 0; i < 3; i++) {
            result.columns[3][i] = translation[i];
        }
        return result;
    }
};

export function transformPoint(t: mat4, point: vec3): vec3 {
    let result: vec3 = new vec3(t.columns[3][0], t.columns[3][1], t.columns[3][2]);
    for (let i = 0; i < 3; i++) {
        for (let row = 0; row < 3; row++) {
            result[row] += t.columns[i][row] * point[i];
        }
    }
    return result;
}

export function centroid(aabb: AABB): vec3 {
    return mul(add(make_vec3(aabb.bboxMin), make_vec3(aabb.bboxMax)), 0.5);
}

export function vec3_to_number(v: vec3[]): number[] {
    let out: number[] = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i].x, v[i].y, v[i].z);
    }
    return out;
}