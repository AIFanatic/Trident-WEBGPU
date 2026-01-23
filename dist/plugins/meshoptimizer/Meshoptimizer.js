import { WASMPointer, WASMHelper } from './WASMHelper.js';
import Module from './MeshOptimizerModule.js';

const attribute_size = 8;
const meshopt_SimplifyLockBorder = 1 << 0;
const meshopt_SimplifySparse = 1 << 1;
const meshopt_SimplifyErrorAbsolute = 1 << 2;
class Meshoptimizer {
  static isLoaded = false;
  static module;
  static kMeshletMaxTriangles = 512;
  static async load() {
    if (!Meshoptimizer.module) {
      Meshoptimizer.module = await Module();
      this.isLoaded = true;
    }
  }
  // size_t meshopt_simplify(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions_data, size_t vertex_count, size_t vertex_positions_stride, size_t target_index_count, float target_error, unsigned int options, float* out_result_error)
  static meshopt_simplify(indices, vertex_positions_data, vertex_count, vertex_positions_stride, target_index_count, target_error, options) {
    const MeshOptmizer = Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(indices.length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
    const ret = WASMHelper.call(
      MeshOptmizer,
      "meshopt_simplify",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer(indices),
      // const unsigned int* indices,
      indices.length,
      // size_t index_count,
      new WASMPointer(vertex_positions_data),
      // const float* vertex_positions,
      vertex_count,
      // size_t vertex_count,
      vertex_positions_stride * Float32Array.BYTES_PER_ELEMENT,
      target_index_count,
      // size_t target_index_count,
      target_error,
      // float target_error, Should be 0.01 but cant reach 128 triangles with it
      options,
      // unsigned int options, preserve borders
      result_error
      // float* result_error
    );
    return { destination: destination.data.slice(0, ret), result_error: result_error.data[0] };
  }
  // size_t meshopt_simplifyWithAttributes(unsigned int* destination, const unsigned int* indices, size_t index_count, const float* vertex_positions_data, size_t vertex_count, size_t vertex_positions_stride, const float* vertex_attributes_data, size_t vertex_attributes_stride, const float* attribute_weights, size_t attribute_count, const unsigned char* vertex_lock, size_t target_index_count, float target_error, unsigned int options, float* out_result_error)
  static meshopt_simplifyWithAttributes(destination_length, indices, index_count, vertex_positions_data, vertex_count, vertex_positions_stride, vertex_attributes_data, vertex_attributes_stride, attribute_weights, attribute_count, vertex_lock, target_index_count, target_error, options) {
    const MeshOptmizer = Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(destination_length), "out");
    const result_error = new WASMPointer(new Float32Array(1), "out");
    const ret = WASMHelper.call(
      MeshOptmizer,
      "meshopt_simplifyWithAttributes",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer(indices),
      // const unsigned int* indices,
      index_count,
      // size_t index_count,
      new WASMPointer(vertex_positions_data),
      // const float* vertex_positions,
      vertex_count,
      // size_t vertex_count,
      vertex_positions_stride * Float32Array.BYTES_PER_ELEMENT,
      vertex_attributes_data !== null ? new WASMPointer(vertex_attributes_data) : null,
      vertex_attributes_stride,
      attribute_weights !== null ? new WASMPointer(attribute_weights) : null,
      attribute_count,
      new WASMPointer(vertex_lock),
      target_index_count,
      // size_t target_index_count,
      target_error,
      // float target_error, Should be 0.01 but cant reach 128 triangles with it
      options,
      // unsigned int options, preserve borders
      result_error
      // float* result_error
    );
    return { ret, destination: destination.data, out_result_error: result_error.data[0] };
  }
  // void meshopt_generateShadowIndexBuffer(unsigned int* destination, const unsigned int* indices, size_t index_count, const void* vertices, size_t vertex_count, size_t vertex_size, size_t vertex_stride)
  static meshopt_generateShadowIndexBuffer(indices, index_count, vertices, vertex_count, vertex_size, vertex_stride) {
    const MeshOptmizer = Meshoptimizer.module;
    const destination = new WASMPointer(new Uint32Array(indices.length), "out");
    WASMHelper.call(
      MeshOptmizer,
      "meshopt_generateShadowIndexBuffer",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer(indices),
      // const unsigned int* indices,
      index_count,
      // size_t index_count,
      new WASMPointer(vertices),
      // const float* vertex_positions,
      vertex_count,
      // size_t vertex_count,
      vertex_size * Float32Array.BYTES_PER_ELEMENT,
      vertex_stride * Float32Array.BYTES_PER_ELEMENT
    );
    return destination.data;
  }
  static meshopt_buildMeshlets(vertices, indices, max_vertices, max_triangles, cone_weight) {
    if (!this.isLoaded) throw Error("Library not loaded");
    const MeshOptmizer = Meshoptimizer.module;
    function rebuildMeshlets(data) {
      let meshlets2 = [];
      for (let i = 0; i < data.length; i += 4) {
        meshlets2.push({
          vertex_offset: data[i + 0],
          triangle_offset: data[i + 1],
          vertex_count: data[i + 2],
          triangle_count: data[i + 3]
        });
      }
      return meshlets2;
    }
    const max_meshlets = WASMHelper.call(MeshOptmizer, "meshopt_buildMeshletsBound", "number", indices.length, max_vertices, max_triangles);
    const meshlets = new WASMPointer(new Uint32Array(max_meshlets * 4), "out");
    const meshlet_vertices = new WASMPointer(new Uint32Array(max_meshlets * max_vertices), "out");
    const meshlet_triangles = new WASMPointer(new Uint8Array(max_meshlets * max_triangles * 3), "out");
    const meshletCount = WASMHelper.call(
      MeshOptmizer,
      "meshopt_buildMeshlets",
      "number",
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
    const output = {
      meshlets_count: meshletCount,
      meshlets_result: meshlets_result.slice(0, meshletCount),
      meshlet_vertices_result: new Uint32Array(meshlet_vertices.data),
      meshlet_triangles_result: new Uint8Array(meshlet_triangles.data)
    };
    return output;
  }
  // meshopt_Bounds meshopt_computeClusterBounds(const unsigned int* indices, size_t index_count, const float* vertex_positions, size_t vertex_count, size_t vertex_positions_stride)
  static meshopt_computeClusterBounds(indices, index_count, vertices, vertex_count, vertex_stride) {
    const MeshOptmizer = Meshoptimizer.module;
    const destination = new WASMPointer(new Float32Array(11), "out");
    WASMHelper.call(
      MeshOptmizer,
      "meshopt_computeClusterBounds",
      "number",
      destination,
      // unsigned int* destination,
      new WASMPointer(indices),
      // const unsigned int* indices,
      index_count,
      // size_t index_count,
      new WASMPointer(vertices),
      // const float* vertex_positions,
      vertex_count,
      // size_t vertex_count,
      vertex_stride * Float32Array.BYTES_PER_ELEMENT
    );
    const out = destination.data;
    return {
      center: [out[0], out[1], out[2]],
      radius: out[3],
      cone_apex: [out[4], out[5], out[6]],
      cone_axis: [out[7], out[8], out[9]],
      cone_cutoff: out[10]
    };
  }
  // meshopt_Bounds meshopt_computeMeshletBounds(const unsigned int* meshlet_vertices, const unsigned char* meshlet_triangles, size_t triangle_count, const float* vertex_positions, size_t vertex_count, size_t vertex_positions_stride)
  static meshopt_computeMeshletBounds(meshlet_vertices, meshlet_triangles, triangle_count, vertex_positions, vertex_count, vertex_positions_stride) {
    const MeshOptmizer = Meshoptimizer.module;
    const destination = new WASMPointer(new Float32Array(11), "out");
    WASMHelper.call(
      MeshOptmizer,
      "meshopt_computeMeshletBounds",
      "number",
      destination,
      new WASMPointer(meshlet_vertices),
      new WASMPointer(meshlet_triangles),
      triangle_count,
      new WASMPointer(vertex_positions),
      vertex_count,
      vertex_positions_stride * Float32Array.BYTES_PER_ELEMENT
    );
    const out = destination.data;
    return {
      center: [out[0], out[1], out[2]],
      radius: out[3],
      cone_apex: [out[4], out[5], out[6]],
      cone_axis: [out[7], out[8], out[9]],
      cone_cutoff: out[10]
    };
  }
}

export { Meshoptimizer, attribute_size, meshopt_SimplifyErrorAbsolute, meshopt_SimplifyLockBorder, meshopt_SimplifySparse };
