import { Sphere } from "./nvclusterlod_common";
import { MeshInput } from "./nvclusterlod_mesh";
interface Mesh {
    vertices: Float32Array;
    indices: Uint32Array;
    error: number;
    parentError: number;
    boundingSphere: Sphere;
    parentBoundingSphere: Sphere;
}
export declare class NV_Cluster {
    static Build(input: MeshInput): Promise<Map<number, Mesh[]>>;
}
export {};
//# sourceMappingURL=lib.d.ts.map