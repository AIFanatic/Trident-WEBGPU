import { Meshlet } from "../Meshlet";
import { Meshoptimizer } from "../Meshoptimizer";

export interface MeshoptMeshlet {
    triangle_offset: number;
    triangle_count: number;
    vertex_offset: number;
    vertex_count: number;
}

interface MeshletBuildOutput {
    meshlets_count: number;
    meshlets_result: MeshoptMeshlet[];
    meshlet_vertices_result: Uint32Array;
    meshlet_triangles_result: Uint8Array;
}

export class MeshletCreator {
    private static cone_weight = 0.0;

    private static buildMeshletsFromBuildOutput(vertices: Float32Array, output: MeshletBuildOutput): Meshlet[] {
        let meshlets: Meshlet[] = [];

        for (let i = 0; i < output.meshlets_count; i++) {
            const meshlet = output.meshlets_result[i];

            let meshlet_positions: number[] = [];
            let meshlet_indices: number[] = [];

            for (let v = 0; v < meshlet.vertex_count; ++v) {
                const o = 8 * output.meshlet_vertices_result[meshlet.vertex_offset + v];
                const vx = vertices[o + 0];
                const vy = vertices[o + 1];
                const vz = vertices[o + 2];
                // console.log("o", 8 * output.meshlet_vertices_result[meshlet.vertex_offset + v], 8, meshlet.vertex_offset, v, vx, vy, vz);

                const nx = vertices[o + 3];
                const ny = vertices[o + 4];
                const nz = vertices[o + 5];

                const uvx = vertices[o + 6];
                const uvy = vertices[o + 7];

                meshlet_positions.push(vx, vy, vz);
                meshlet_positions.push(nx, ny, nz);
                meshlet_positions.push(uvx, uvy);
            }
            for (let t = 0; t < meshlet.triangle_count; ++t) {
                const o = meshlet.triangle_offset + 3 * t;
                meshlet_indices.push(output.meshlet_triangles_result[o + 0]);
                meshlet_indices.push(output.meshlet_triangles_result[o + 1]);
                meshlet_indices.push(output.meshlet_triangles_result[o + 2]);
            }

            // console.log("vertices", vertices);
            // console.log("output", output);

            meshlets.push(new Meshlet(new Float32Array(meshlet_positions), new Uint32Array(meshlet_indices)));
        }
        return meshlets;
    }

    public static build(vertices: Float32Array, indices: Uint32Array, max_vertices: number, max_triangles: number) {
        const cone_weight = MeshletCreator.cone_weight;

        const output = Meshoptimizer.meshopt_buildMeshlets(vertices, indices, max_vertices, max_triangles, cone_weight)
        const m = {
            meshlets_count: output.meshlets_count,
            meshlets_result: output.meshlets_result.slice(0, output.meshlets_count),
            meshlet_vertices_result: output.meshlet_vertices_result,
            meshlet_triangles_result: output.meshlet_triangles_result
        }

        console.log("m", m)

        const meshlets = MeshletCreator.buildMeshletsFromBuildOutput(vertices, m);
        
        return meshlets;
    }
}