import { Vector3 } from "./Vector3";
export declare class BoundingVolume {
    min: Vector3;
    max: Vector3;
    center: Vector3;
    radius: number;
    constructor(min?: Vector3, max?: Vector3, center?: Vector3, radius?: number);
    static FromVertices(vertices: Float32Array): BoundingVolume;
}
//# sourceMappingURL=BoundingVolume.d.ts.map