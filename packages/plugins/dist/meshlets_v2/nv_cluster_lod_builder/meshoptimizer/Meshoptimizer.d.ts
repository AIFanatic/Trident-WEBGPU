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
    center: number[];
    radius: number;
    cone_apex: number[];
    cone_axis: number[];
    cone_cutoff: number;
}
export declare const meshopt_SimplifyLockBorder: number;
export declare const meshopt_SimplifySparse: number;
export declare const meshopt_SimplifyErrorAbsolute: number;
interface meshopt_simplifyWithAttributes_result {
    ret: number;
    destination: Uint32Array;
    out_result_error: number;
}
export declare class Meshoptimizer {
    private static module;
    private static isLoaded;
    static kMeshletMaxTriangles: number;
    static load(): Promise<void>;
    static meshopt_simplifyWithAttributes(destination_length: number, indices: Uint32Array, index_count: number, vertex_positions_data: Float32Array, vertex_count: number, vertex_positions_stride: number, vertex_attributes_data: Float32Array | null, vertex_attributes_stride: number, attribute_weights: Float32Array | null, attribute_count: number, vertex_lock: Uint8Array, target_index_count: number, target_error: number, options: number): meshopt_simplifyWithAttributes_result;
    static meshopt_generateShadowIndexBuffer(indices: Uint32Array, index_count: number, vertices: Float32Array, vertex_count: number, vertex_size: number, vertex_stride: number): Uint32Array;
}
export {};
//# sourceMappingURL=Meshoptimizer.d.ts.map