import { Vector3 } from "../../math/Vector3";
import { Meshlet } from "./Meshlet";
export declare const attribute_size = 8;
export interface meshopt_Meshlet {
    triangle_offset: number;
    triangle_count: number;
    vertex_offset: number;
    vertex_count: number;
}
export interface MeshletBuildOutput {
    meshlets_count: number;
    meshlets_result: meshopt_Meshlet[];
    meshlet_vertices_result: Uint32Array;
    meshlet_triangles_result: Uint8Array;
}
export interface meshopt_Bounds {
    center: Vector3;
    radius: number;
    cone_apex: Vector3;
    cone_axis: Vector3;
    cone_cutoff: number;
}
export declare class Meshoptimizer {
    private static module;
    private static isLoaded;
    static kMeshletMaxTriangles: number;
    static load(): Promise<void>;
    static buildNeighbors(meshlets: meshopt_Meshlet[], meshlet_vertices_result: Uint32Array): number[][];
    static meshopt_buildMeshlets(vertices: Float32Array, indices: Uint32Array, max_vertices: number, max_triangles: number, cone_weight: number): MeshletBuildOutput;
    static meshopt_computeClusterBounds(vertices: Float32Array, indices: Uint32Array): meshopt_Bounds;
    static clean(meshlet: Meshlet): Meshlet;
    static meshopt_simplify(meshlet: Meshlet, target_count: number, target_error?: number): {
        meshlet: Meshlet;
        error: number;
    };
    static meshopt_simplifyWithAttributes(meshlet: Meshlet, vertex_lock_array: Uint8Array | null, target_count: number, target_error?: number): {
        meshlet: Meshlet;
        error: number;
    };
    static meshopt_simplifyWithAttributesRaw(indices: Uint32Array, a: number, vertices: Float32Array, b: number, c: number, d: any, e: number, f: any, g: number, lock: Uint32Array, target_count: number, target_error: number, options: number): Uint32Array<ArrayBufferLike>;
    static meshopt_simplifyScale(meshlet: Meshlet): number;
}
//# sourceMappingURL=Meshoptimizer.d.ts.map