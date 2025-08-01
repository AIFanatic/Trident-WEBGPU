import { Mathf } from "@trident/core";
import { Meshlet } from "./Meshlet";
import { WASMHelper, WASMPointer } from "./WASMHelper";
import MeshOptimizerModule from "./meshoptimizer/MeshOptimizer";

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
	center: Mathf.Vector3; // float center[3];
	radius: number; // float radius;

	// /* normal cone, useful for backface culling */
	cone_apex: Mathf.Vector3; // float cone_apex[3];
	cone_axis: Mathf.Vector3; // float cone_axis[3];
	cone_cutoff: number; // float cone_cutoff; /* = cos(angle/2) */

	// // /* normal cone axis and cutoff, stored in 8-bit SNORM format; decode using x/127.0 */
	// cone_axis_s8: Vector3; // signed char cone_axis_s8[3];
	// cone_cutoff_s8: Vector3; // signed char cone_cutoff_s8;
}

export class Meshoptimizer {
    private static module;
    private static isLoaded: boolean = false;

    public static kMeshletMaxTriangles = 512;

    public static async load() {
        if (!Meshoptimizer.module) {
            Meshoptimizer.module = await MeshOptimizerModule();
            this.isLoaded = true;
        }
    }

    public static buildNeighbors(meshlets: meshopt_Meshlet[], meshlet_vertices_result: Uint32Array): number[][] {
        const vertex_to_meshlets: {count: number, meshlets: number[]}[] = [];
        
        for (let i = 0; i < meshlets.length; i++) {
            const meshlet = meshlets[i];
            // const meshlet_triangles = meshlet_triangles_result.slice(meshlet.triangle_offset, meshlet.triangle_offset + meshlet.triangle_count);
            const meshlet_vertices = meshlet_vertices_result.slice(meshlet.vertex_offset, meshlet.vertex_offset + meshlet.vertex_count);
            for (let j = 0; j < meshlet_vertices.length; j++) {
                if (!vertex_to_meshlets[meshlet_vertices[j]]) vertex_to_meshlets[meshlet_vertices[j]] = {count: 0, meshlets: []};
                vertex_to_meshlets[meshlet_vertices[j]].count++;
                vertex_to_meshlets[meshlet_vertices[j]].meshlets.push(i);
            }
        }
    
        const neighbors: Set<number>[] = Array.from({ length: meshlets.length }, () => new Set<number>());
        
        for (const v of vertex_to_meshlets) {
            const meshletArray = v.meshlets;
            for (let i = 0; i < meshletArray.length; i++) {
                for (let j = i + 1; j < meshletArray.length; j++) {
                    neighbors[meshletArray[i]].add(meshletArray[j]);
                    neighbors[meshletArray[j]].add(meshletArray[i]);
                }
            }
        }

        return neighbors.map((set) => [...set]);
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

    public static meshopt_computeClusterBounds(vertices: Float32Array, indices: Uint32Array): meshopt_Bounds {
        if (!this.isLoaded) throw Error("Library not loaded");

        const MeshOptmizer = Meshoptimizer.module;
        
        const boundsDataPtr = new WASMPointer(new Float32Array(16), "out");

        WASMHelper.call(MeshOptmizer, "meshopt_computeClusterBounds", "number", 
            boundsDataPtr,
            new WASMPointer(Uint32Array.from(indices)),
            indices.length,
            new WASMPointer(Float32Array.from(vertices)),
            vertices.length / attribute_size,
            attribute_size * Float32Array.BYTES_PER_ELEMENT,
        );

        const boundsData = boundsDataPtr.data;

        return {
            // /* bounding sphere, useful for frustum and occlusion culling */
            center: new Mathf.Vector3(boundsData[0], boundsData[1], boundsData[2]), // center: Vector3; // float center[3];
            radius: boundsData[3], // float radius;

            // /* normal cone, useful for backface culling */
            cone_apex: new Mathf.Vector3(boundsData[4], boundsData[5], boundsData[6]), // float cone_apex[3];
            cone_axis: new Mathf.Vector3(boundsData[7], boundsData[8], boundsData[9]), // float cone_axis[3];
            cone_cutoff: boundsData[10], // float cone_cutoff; /* = cos(angle/2) */

            // // /* normal cone axis and cutoff, stored in 8-bit SNORM format; decode using x/127.0 */
            // cone_axis_s8: new Vector3(boundsData[11], boundsData[12], boundsData[13]), // signed char cone_axis_s8[3];
            // cone_cutoff_s8: new Vector3(boundsData[14], boundsData[15], boundsData[16]) // signed char cone_cutoff_s8;
        }

    }

    
 
    
 


    public static clean(meshlet: Meshlet): Meshlet {

        const MeshOptmizer = Meshoptimizer.module;

        const remap = new WASMPointer(new Uint32Array(meshlet.indices.length * attribute_size), "out");
        const indices = new WASMPointer(new Uint32Array(meshlet.indices), "in");
        const vertices = new WASMPointer(new Float32Array(meshlet.vertices), "in");

        const vertex_count = WASMHelper.call(MeshOptmizer, "meshopt_generateVertexRemap", "number", 
            remap,
            indices,
            meshlet.indices.length,
            vertices,
            meshlet.vertices.length / attribute_size,
            attribute_size * Float32Array.BYTES_PER_ELEMENT
        );
        
        const indices_remapped = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
        WASMHelper.call(MeshOptmizer, "meshopt_remapIndexBuffer", "number", 
            indices_remapped,
            indices,
            meshlet.indices.length,
            remap
        );
        
        const vertices_remapped = new WASMPointer(new Float32Array(vertex_count * attribute_size), "out");
        WASMHelper.call(MeshOptmizer, "meshopt_remapVertexBuffer", "number", 
            vertices_remapped,
            vertices,
            meshlet.vertices.length / attribute_size,
            attribute_size * Float32Array.BYTES_PER_ELEMENT,
            remap
        );

        return new Meshlet(new Float32Array(vertices_remapped.data), new Uint32Array(indices_remapped.data));
    }

    public static meshopt_simplify(meshlet: Meshlet, target_count: number, target_error: number = 1): {meshlet: Meshlet, error: number} {
        const MeshOptmizer = Meshoptimizer.module;

        const destination = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
        const result_error = new WASMPointer(new Float32Array(1), "out");
        
        const meshopt_SimplifyLockBorder = 1 << 0;
        const meshopt_SimplifySparse = 1 << 1;
        const meshopt_SimplifyErrorAbsolute = 1 << 2;

        const options = meshopt_SimplifyLockBorder | meshopt_SimplifySparse;


        const simplified_index_count = WASMHelper.call(MeshOptmizer, "meshopt_simplify", "number",
            destination, // unsigned int* destination,
            new WASMPointer(new Uint32Array(meshlet.indices)), // const unsigned int* indices,
            meshlet.indices.length, // size_t index_count,
            new WASMPointer(new Float32Array(meshlet.vertices)), // const float* vertex_positions,
            meshlet.vertices.length / attribute_size, // size_t vertex_count,
            attribute_size * Float32Array.BYTES_PER_ELEMENT, // size_t vertex_positions_stride,
            target_count, // size_t target_index_count,
            target_error, // float target_error, Should be 0.01 but cant reach 128 triangles with it
            1, // unsigned int options, preserve borders
            result_error, // float* result_error
        );

        const destination_resized = destination.data.slice(0, simplified_index_count) as Uint32Array;

        return {
            error: result_error.data[0],
            meshlet: new Meshlet(meshlet.vertices, destination_resized)
        }
    }


    public static meshopt_simplifyWithAttributes(meshlet: Meshlet, vertex_lock_array: Uint8Array | null, target_count: number, target_error: number = 1): {meshlet: Meshlet, error: number} {
        const MeshOptmizer = Meshoptimizer.module;

        const destination = new WASMPointer(new Uint32Array(meshlet.indices.length), "out");
        const result_error = new WASMPointer(new Float32Array(1), "out");

        const meshopt_SimplifyLockBorder = 1 << 0;
        const meshopt_SimplifySparse = 1 << 1;
        const meshopt_SimplifyErrorAbsolute = 1 << 2;
        const options = meshopt_SimplifySparse;

        const vertex_lock = vertex_lock_array === null ? null : new WASMPointer(vertex_lock_array, "in");
        
        const simplified_index_count = WASMHelper.call(MeshOptmizer, "meshopt_simplifyWithAttributes", "number",
            destination, // unsigned int* destination,
            new WASMPointer(new Uint32Array(meshlet.indices)), // const unsigned int* indices,
            meshlet.indices.length, // size_t index_count,
            new WASMPointer(new Float32Array(meshlet.vertices)), // const float* vertex_positions,
            meshlet.vertices.length / attribute_size, // size_t vertex_count,
            attribute_size * Float32Array.BYTES_PER_ELEMENT, // size_t vertex_positions_stride,


            null,
            0,
            null,
            0,
            vertex_lock,


            target_count, // size_t target_index_count,
            target_error, // float target_error, Should be 0.01 but cant reach 128 triangles with it
            options, // unsigned int options, preserve borders
            result_error, // float* result_error
        );

        const destination_resized = destination.data.slice(0, simplified_index_count) as Uint32Array;

        return {
            error: result_error.data[0],
            meshlet: new Meshlet(meshlet.vertices, destination_resized)
        }
    }

    // ib, ib, 24, vb, 9, 12, NULL, 0, NULL, 0, lock, 3, 1e-3f, 0
    public static meshopt_simplifyWithAttributesRaw(indices: Uint32Array, a: number, vertices: Float32Array, b: number, c: number, d, e: number, f, g: number, lock: Uint32Array, target_count: number, target_error: number, options: number) {
        const MeshOptmizer = Meshoptimizer.module;

        const destination = new WASMPointer(new Uint32Array(indices.length), "out");
        const result_error = new WASMPointer(new Float32Array(1), "out");
        const vertex_lock = new WASMPointer(lock, "in");

        const simplified_index_count = WASMHelper.call(MeshOptmizer, "meshopt_simplifyWithAttributes", "number",
            destination, // unsigned int* destination,
            new WASMPointer(new Uint32Array(indices)), // const unsigned int* indices,
            a, // size_t index_count,
            new WASMPointer(new Float32Array(vertices)), // const float* vertex_positions,
            b, // size_t vertex_count,
            c,

            d,
            e,
            f,
            g,
            vertex_lock,


            target_count, // size_t target_index_count,
            target_error, // float target_error, Should be 0.01 but cant reach 128 triangles with it
            options, // unsigned int options, preserve borders
            result_error, // float* result_error
        );

        const destination_resized = destination.data.slice(0, simplified_index_count) as Uint32Array;

        return destination_resized;
    }

    public static meshopt_simplifyScale(meshlet: Meshlet): number {
        const MeshOptmizer = Meshoptimizer.module;

        const vertices = new WASMPointer(new Float32Array(meshlet.vertices), "in");

        // float meshopt_simplifyScale(const float* vertex_positions, size_t vertex_count, size_t vertex_positions_stride)
        const scale = WASMHelper.call(MeshOptmizer, "meshopt_simplifyScale", "number", 
            vertices,
            meshlet.vertices.length / attribute_size,
            attribute_size * Float32Array.BYTES_PER_ELEMENT
        );
        
        return scale;
    }
}