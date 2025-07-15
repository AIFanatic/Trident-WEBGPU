import { Meshlet } from "../Meshlet";
import { Meshoptimizer, attribute_size } from "../Meshoptimizer";
export class MeshletCreator {
    static cone_weight = 0.0;
    static buildMeshletsFromBuildOutput(vertices, output) {
        let meshlets = [];
        for (let i = 0; i < output.meshlets_count; i++) {
            const meshlet = output.meshlets_result[i];
            let meshlet_positions = [];
            let meshlet_indices = [];
            for (let v = 0; v < meshlet.vertex_count; ++v) {
                const o = attribute_size * output.meshlet_vertices_result[meshlet.vertex_offset + v];
                const vx = vertices[o + 0];
                const vy = vertices[o + 1];
                const vz = vertices[o + 2];
                const nx = vertices[o + 3];
                const ny = vertices[o + 4];
                const nz = vertices[o + 5];
                const uvx = vertices[o + 6];
                const uvy = vertices[o + 7];
                meshlet_positions.push(vx, vy, vz);
                if (attribute_size === 8) {
                    meshlet_positions.push(nx, ny, nz);
                    meshlet_positions.push(uvx, uvy);
                }
            }
            for (let t = 0; t < meshlet.triangle_count; ++t) {
                const o = meshlet.triangle_offset + 3 * t;
                meshlet_indices.push(output.meshlet_triangles_result[o + 0]);
                meshlet_indices.push(output.meshlet_triangles_result[o + 1]);
                meshlet_indices.push(output.meshlet_triangles_result[o + 2]);
            }
            meshlets.push(new Meshlet(new Float32Array(meshlet_positions), new Uint32Array(meshlet_indices)));
        }
        return meshlets;
    }
    static build(vertices, indices, max_vertices, max_triangles) {
        const cone_weight = MeshletCreator.cone_weight;
        const output = Meshoptimizer.meshopt_buildMeshlets(vertices, indices, max_vertices, max_triangles, cone_weight);
        const m = {
            meshlets_count: output.meshlets_count,
            meshlets_result: output.meshlets_result.slice(0, output.meshlets_count),
            meshlet_vertices_result: output.meshlet_vertices_result,
            meshlet_triangles_result: output.meshlet_triangles_result
        };
        const meshlets = MeshletCreator.buildMeshletsFromBuildOutput(vertices, m);
        return meshlets;
    }
}
