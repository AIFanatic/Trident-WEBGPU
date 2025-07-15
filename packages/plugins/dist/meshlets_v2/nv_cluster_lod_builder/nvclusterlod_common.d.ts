import { uvec3, vec3 } from "./nvclusterlod_mesh";
export declare class Sphere {
    x: number;
    y: number;
    z: number;
    radius: number;
    constructor(x?: number, y?: number, z?: number, radius?: number);
}
export declare enum Result {
    SUCCESS = 0,
    ERROR_EMPTY_CLUSTER_GENERATING_GROUPS = 1,
    ERROR_CLUSTERING_FAILED = 2,
    ERROR_NODE_OVERFLOW = 3,
    ERROR_LOD_OVERFLOW = 4,
    ERROR_CLUSTER_COUNT_NOT_DECREASING = 5,
    ERROR_INCONSISTENT_GENERATING_GROUPS = 6,
    ERROR_ADJACENCY_GENERATION_FAILED = 7,
    ERROR_OUTPUT_MESH_OVERFLOW = 8,
    ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH = 9,
    ERROR_EMPTY_ROOT_CLUSTER = 10,
    ERROR_INCONSISTENT_BOUNDING_SPHERES = 11,
    ERROR_HIERARCHY_GENERATION_FAILED = 12,
    ERROR_INVALID_ARGUMENT = 13,
    ERROR_UNSPECIFIED = 14
}
export declare function assert(condition: any): void;
export declare function resizeArray<T>(arr: T[], newSize: number, createDefaultValue: () => T): T[];
export declare function createArrayView<T>(arr: T[], offset: number, length: number): T[];
export declare function vec3_to_number(v: vec3[] | uvec3[]): number[];
export declare function number_to_uvec3(array: number[] | Uint32Array | Float32Array, count?: number): uvec3[];
export declare function pixelErrorToQuadricErrorOverDistance(errorSizeInPixels: number, fov: number, resolution: number): number;
export declare function quadricErrorOverDistanceToPixelError(quadricErrorOverDistance: number, fov: number, resolution: number): number;
//# sourceMappingURL=nvclusterlod_common.d.ts.map