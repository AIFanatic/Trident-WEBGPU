import { WASMHelper, WASMPointer } from "./WASMHelper";
import MeshOptimizerModule from "./MeshOptimizerModule.js";

export const attribute_size = 8;

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
    // /* bounding sphere, useful for frustum and occlusion culling */
	center: number[]; // float center[3];
	radius: number; // float radius;

	// /* normal cone, useful for backface culling */
	cone_apex: number[]; // float cone_apex[3];
	cone_axis: number[]; // float cone_axis[3];
	cone_cutoff: number; // float cone_cutoff; /* = cos(angle/2) */

	// // /* normal cone axis and cutoff, stored in 8-bit SNORM format; decode using x/127.0 */
	// cone_axis_s8: Vector3; // signed char cone_axis_s8[3];
	// cone_cutoff_s8: Vector3; // signed char cone_cutoff_s8;
}

export const meshopt_SimplifyLockBorder = 1 << 0;
export const meshopt_SimplifySparse = 1 << 1;
export const meshopt_SimplifyErrorAbsolute = 1 << 2;

interface meshopt_simplifyWithAttributes_result {
    ret: number;
    destination: Uint32Array;
    out_result_error: number;
};

export class Meshoptimizer {
    public static isLoaded: boolean = false;
    private static module;

    public static kMeshletMaxTriangles = 512;

    public static async load() {
        if (!Meshoptimizer.module) {
            Meshoptimizer.module = await MeshOptimizerModule();
            this.isLoaded = true;
        }
    }

    // size_t meshopt_simplifyWithAttributes(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions_data, size_t vertex_count, size_t vertex_positions_stride, const float* vertex_attributes_data, size_t vertex_attributes_stride, const float* attribute_weights, size_t attribute_count, const unsigned char* vertex_lock, size_t target_index_count, float target_error, unsigned int options, float* out_result_error)
    public static meshopt_simplifyWithAttributes(
        destination_length: number,
        indices: Uint32Array,
        index_count: number,
        vertex_positions_data: Float32Array,
        vertex_count: number,
        vertex_positions_stride: number,
        vertex_attributes_data: Float32Array | null,
        vertex_attributes_stride: number,
        attribute_weights: Float32Array | null,
        attribute_count: number,
        vertex_lock: Uint8Array,
        target_index_count: number,
        target_error: number,
        options: number,
    ): meshopt_simplifyWithAttributes_result {
        const MeshOptmizer = Meshoptimizer.module;

        const destination = new WASMPointer(new Uint32Array(destination_length), "out");
        const result_error = new WASMPointer(new Float32Array(1), "out");

        const ret = WASMHelper.call(MeshOptmizer, "meshopt_simplifyWithAttributes", "number",
            destination, // unsigned int* destination,
            new WASMPointer(indices), // const unsigned int* indices,
            index_count, // size_t index_count,
            new WASMPointer(vertex_positions_data), // const float* vertex_positions,
            vertex_count, // size_t vertex_count,
            vertex_positions_stride * Float32Array.BYTES_PER_ELEMENT,
            vertex_attributes_data !== null ? new WASMPointer(vertex_attributes_data) : null,
            vertex_attributes_stride,
            attribute_weights !== null ? new WASMPointer(attribute_weights) : null,
            attribute_count,
            new WASMPointer(vertex_lock),
            target_index_count, // size_t target_index_count,
            target_error, // float target_error, Should be 0.01 but cant reach 128 triangles with it
            options, // unsigned int options, preserve borders
            result_error, // float* result_error
        );

        return {ret: ret, destination: destination.data as Uint32Array, out_result_error: result_error.data[0]};
    }

    // void meshopt_generateShadowIndexBuffer(unsigned int* destination, const unsigned int* indices, size_t index_count, const void* vertices, size_t vertex_count, size_t vertex_size, size_t vertex_stride)
    public static meshopt_generateShadowIndexBuffer(
        indices: Uint32Array,
        index_count: number,
        vertices: Float32Array,
        vertex_count: number,
        vertex_size: number,
        vertex_stride: number,
    ): Uint32Array {
        const MeshOptmizer = Meshoptimizer.module;

        const destination = new WASMPointer(new Uint32Array(indices.length), "out");

        WASMHelper.call(MeshOptmizer, "meshopt_generateShadowIndexBuffer", "number",
            destination, // unsigned int* destination,
            new WASMPointer(indices), // const unsigned int* indices,
            index_count, // size_t index_count,
            new WASMPointer(vertices), // const float* vertex_positions,
            vertex_count, // size_t vertex_count,
            vertex_size * Float32Array.BYTES_PER_ELEMENT,
            vertex_stride * Float32Array.BYTES_PER_ELEMENT
        );

        return destination.data as Uint32Array;
    }

    public static meshopt_buildMeshlets(vertices: Float32Array, indices: Uint32Array, max_vertices: number, max_triangles: number, cone_weight: number): MeshletBuildOutput {
        if (!this.isLoaded) throw Error("Library not loaded");

        const MeshOptmizer = Meshoptimizer.module;

        function rebuildMeshlets(data) {
            let meshlets: meshopt_Meshlet[] = [];

            for (let i = 0; i < data.length; i += 4) {
                meshlets.push({
                    vertex_offset: data[i + 0],
                    triangle_offset: data[i + 1],
                    vertex_count: data[i + 2],
                    triangle_count: data[i + 3]
                })
            }

            return meshlets;
        }

        const max_meshlets = WASMHelper.call(MeshOptmizer, "meshopt_buildMeshletsBound", "number", indices.length, max_vertices, max_triangles);



        const meshlets = new WASMPointer(new Uint32Array(max_meshlets * 4), "out");
        const meshlet_vertices = new WASMPointer(new Uint32Array(max_meshlets * max_vertices), "out");
        const meshlet_triangles = new WASMPointer(new Uint8Array(max_meshlets * max_triangles * 3), "out");

        const meshletCount = WASMHelper.call(MeshOptmizer, "meshopt_buildMeshlets", "number", 
            meshlets,
            meshlet_vertices,
            meshlet_triangles,
            new WASMPointer(Uint32Array.from(indices)),
            indices.length,
            new WASMPointer(Float32Array.from(vertices)),
            vertices.length / attribute_size,
            attribute_size * Float32Array.BYTES_PER_ELEMENT,
            max_vertices,
            max_triangles,
            cone_weight
        );

        const meshlets_result = rebuildMeshlets(meshlets.data).slice(0, meshletCount);
        
        const output: MeshletBuildOutput = {
            meshlets_count: meshletCount,
            meshlets_result: meshlets_result.slice(0, meshletCount),
            meshlet_vertices_result: new Uint32Array(meshlet_vertices.data),
            meshlet_triangles_result: new Uint8Array(meshlet_triangles.data),
        }
        return output;
    }

    // meshopt_Bounds meshopt_computeClusterBounds(const unsigned int* indices, size_t index_count, const float* vertex_positions, size_t vertex_count, size_t vertex_positions_stride)
    public static meshopt_computeClusterBounds(
        indices: Uint32Array,
        index_count: number,
        vertices: Float32Array,
        vertex_count: number,
        vertex_stride: number,
    ): meshopt_Bounds {
        const MeshOptmizer = Meshoptimizer.module;

        const destination = new WASMPointer(new Float32Array(11), "out");

        WASMHelper.call(MeshOptmizer, "meshopt_computeClusterBounds", "number",
            destination, // unsigned int* destination,
            new WASMPointer(indices), // const unsigned int* indices,
            index_count, // size_t index_count,
            new WASMPointer(vertices), // const float* vertex_positions,
            vertex_count, // size_t vertex_count,
            vertex_stride * Float32Array.BYTES_PER_ELEMENT
        );

        const out = destination.data;
        return {
            center: [out[0], out[1], out[2]],
            radius: out[3],
            cone_apex: [out[4], out[5], out[6]],
            cone_axis: [out[7], out[8], out[9]],
            cone_cutoff: out[10],
        }
    }
}