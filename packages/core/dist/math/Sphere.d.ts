import { Vector3 } from "./Vector3";
export declare class Sphere {
    center: Vector3;
    radius: number;
    constructor(center?: Vector3, radius?: number);
    static fromAABB(minBounds: Vector3, maxBounds: Vector3): Sphere;
    static fromVertices(vertices: Float32Array, indices: Uint32Array, vertex_positions_stride: number): Sphere;
    SetFromPoints(points: Vector3[]): void;
}
//# sourceMappingURL=Sphere.d.ts.map