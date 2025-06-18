import { Vector3 } from "./Vector3";
export declare class Plane {
    normal: Vector3;
    constant: number;
    constructor(normal?: Vector3, constant?: number);
    setComponents(x: any, y: any, z: any, w: any): this;
    normalize(): this;
}
