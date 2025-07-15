import { AABB } from "../nvcluster";
import { vec3, vec4 } from "../nvclusterlod_mesh";
export declare function ASSERT_EQ(a: number, b: number): void;
export declare function EXPECT_EQ(a: number, b: number): void;
export declare function EXPECT_GT(a: number, b: number): void;
export declare function EXPECT_GE(a: number, b: number): void;
export declare function EXPECT_LE(a: number, b: number): void;
export declare function EXPECT_TRUE(condition: boolean): void;
export declare function EXPECT_FALSE(condition: boolean): void;
export declare function EXPECT_NEAR(val1: number, val2: number, abs_error: number): void;
export declare function make_vec3(a: number[]): vec3;
export declare function add(a: vec3, b: vec3): vec3;
export declare function mul(v: vec3, a: number): vec3;
export declare function sub(a: vec3, b: vec3): vec3;
export declare function lengthSquared(v: vec3): number;
export declare function length(v: vec3): number;
export declare function normalize(v: vec3): vec3;
export declare class mat4 {
    columns: vec4[];
    constructor(v0: vec4, v1: vec4, v2: vec4, v3: vec4);
    static identity(): mat4;
    static fromArray(a: number[]): mat4;
    static makeTranslation(translation: vec3): mat4;
}
export declare function transformPoint(t: mat4, point: vec3): vec3;
export declare function centroid(aabb: AABB): vec3;
export declare function vec3_to_number(v: vec3[]): number[];
//# sourceMappingURL=test_common.d.ts.map