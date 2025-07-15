import { Vector3 } from "./Vector3";
export declare class Plane {
    normal: Vector3;
    constant: number;
    constructor(normal?: Vector3, constant?: number);
    setComponents(x: number, y: number, z: number, w: number): this;
    normalize(): this;
}
//# sourceMappingURL=Plane.d.ts.map