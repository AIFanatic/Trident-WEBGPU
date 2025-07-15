import { Meshlet } from "../Meshlet";
export interface MeshoptMeshlet {
    triangle_offset: number;
    triangle_count: number;
    vertex_offset: number;
    vertex_count: number;
}
export declare class MeshletCreator {
    private static cone_weight;
    private static buildMeshletsFromBuildOutput;
    static build(vertices: Float32Array, indices: Uint32Array, max_vertices: number, max_triangles: number): Meshlet[];
}
//# sourceMappingURL=MeshletCreator.d.ts.map