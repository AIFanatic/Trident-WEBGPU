import { AABB } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvcluster";
import { vec3, vec4 } from "../plugins/meshlets_v2/nv_cluster_lod_builder/nvclusterlod_mesh";

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