export { Vector2 } from "./Vector2";
export { Vector3 } from "./Vector3";
export { Vector4 } from "./Vector4";
export { Sphere } from "./Sphere";
export { Matrix4 } from "./Matrix4";
export { Frustum } from "./Frustum";
export { Color } from "./Color";
export { BoundingVolume } from "./BoundingVolume";
export { Plane } from "./Plane";
export { Quaternion } from "./Quaternion";

function mulberry32(seed: number): () => number {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export const Random = mulberry32(1337);
export const RandomRange = (min: number, max: number) => Random() * (max - min) + min;
export const Lerp = (a: number, b: number, f: number) => a * (1.0 - f) + (b * f);
export const Clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const Clamp01 = (value: number) => Clamp(value, 0, 1);

export const Round = Math.round;
export const Sqrt = Math.sqrt;
export const Atan2 = Math.atan2;
export const Floor = Math.floor;
export const Max = Math.max;
export const Min = Math.min;
export const Sin = Math.sin;
export const Cos = Math.cos;
export const Tan = Math.tan;
export const Epsilon = 1e-5;

export const Deg2Rad = Math.PI / 180;
export const Rad2Deg = 180 / Math.PI;