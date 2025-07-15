import { WASMHelper, WASMPointer } from "./WASMHelper";
import MeshOptimizerModule from "./MeshOptimizerModule.js";
export const attribute_size = 8;
export const meshopt_SimplifyLockBorder = 1 << 0;
export const meshopt_SimplifySparse = 1 << 1;
export const meshopt_SimplifyErrorAbsolute = 1 << 2;
;
export class Meshoptimizer {
    static module;
    static isLoaded = false;
    static kMeshletMaxTriangles = 512;
    static async load() {
        if (!Meshoptimizer.module) {
            Meshoptimizer.module = await MeshOptimizerModule();
            this.isLoaded = true;
        }
    }
    // size_t meshopt_simplifyWithAttributes(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions_data, size_t vertex_count, size_t vertex_positions_stride, const float* vertex_attributes_data, size_t vertex_attributes_stride, const float* attribute_weights, size_t attribute_count, const unsigned char* vertex_lock, size_t target_index_count, float target_error, unsigned int options, float* out_result_error)
    static meshopt_simplifyWithAttributes(destination_length, indices, index_count, vertex_positions_data, vertex_count, vertex_positions_stride, vertex_attributes_data, vertex_attributes_stride, attribute_weights, attribute_count, vertex_lock, target_index_count, target_error, options) {
        const MeshOptmizer = Meshoptimizer.module;
        const destination = new WASMPointer(new Uint32Array(destination_length), "out");
        const result_error = new WASMPointer(new Float32Array(1), "out");
        const ret = WASMHelper.call(MeshOptmizer, "meshopt_simplifyWithAttributes", "number", destination, // unsigned int* destination,
        new WASMPointer(indices), // const unsigned int* indices,
        index_count, // size_t index_count,
        new WASMPointer(vertex_positions_data), // const float* vertex_positions,
        vertex_count, // size_t vertex_count,
        vertex_positions_stride * Float32Array.BYTES_PER_ELEMENT, vertex_attributes_data !== null ? new WASMPointer(vertex_attributes_data) : null, vertex_attributes_stride, attribute_weights !== null ? new WASMPointer(attribute_weights) : null, attribute_count, new WASMPointer(vertex_lock), target_index_count, // size_t target_index_count,
        target_error, // float target_error, Should be 0.01 but cant reach 128 triangles with it
        options, // unsigned int options, preserve borders
        result_error);
        return { ret: ret, destination: destination.data, out_result_error: result_error.data[0] };
    }
    // void meshopt_generateShadowIndexBuffer(unsigned int* destination, const unsigned int* indices, size_t index_count, const void* vertices, size_t vertex_count, size_t vertex_size, size_t vertex_stride)
    static meshopt_generateShadowIndexBuffer(indices, index_count, vertices, vertex_count, vertex_size, vertex_stride) {
        const MeshOptmizer = Meshoptimizer.module;
        const destination = new WASMPointer(new Uint32Array(indices.length), "out");
        WASMHelper.call(MeshOptmizer, "meshopt_generateShadowIndexBuffer", "number", destination, // unsigned int* destination,
        new WASMPointer(indices), // const unsigned int* indices,
        index_count, // size_t index_count,
        new WASMPointer(vertices), // const float* vertex_positions,
        vertex_count, // size_t vertex_count,
        vertex_size * Float32Array.BYTES_PER_ELEMENT, vertex_stride * Float32Array.BYTES_PER_ELEMENT);
        return destination.data;
    }
}
