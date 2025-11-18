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

export const Lerp = (a: number, b: number, f: number) => a * (1.0 - f) + (b * f);
export const Clamp = (value: number, min: number, max: number) => Math.max( min, Math.min( max, value ) );
export const RandomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const Round = Math.round;
export const Sqrt = Math.sqrt;
export const Atan2 = Math.atan2;
export const Floor = Math.floor;
export const Max = Math.max;
export const Min = Math.min;
export const Epsilon = 1e-5;

export const Deg2Rad = Math.PI / 180;
export const Rad2Deg = 180 / Math.PI;