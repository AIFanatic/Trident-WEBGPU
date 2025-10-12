import { Utils, Mathf, InterleavedVertexAttribute } from '@trident/core';
import { Meshoptimizer } from './nv_cluster_lod_builder/meshoptimizer/Meshoptimizer.js';

class Meshlet {
  static max_triangles = 128;
  static max_vertices = 255;
  vertices;
  indices;
  id = Utils.UUID();
  lod;
  children;
  parents;
  _boundingVolume;
  get boundingVolume() {
    return this._boundingVolume;
  }
  set boundingVolume(boundingVolume) {
    this._boundingVolume = boundingVolume;
  }
  // public boundingVolume: Sphere;
  parentBoundingVolume;
  parentError = Infinity;
  clusterError = 0;
  vertices_gpu;
  crc;
  bounds;
  interleaved;
  coneBounds;
  traversalMetric;
  constructor(vertices, indices) {
    this.vertices = vertices;
    this.indices = indices;
    this.lod = 0;
    this.children = [];
    this.parents = [];
    this.bounds = Mathf.BoundingVolume.FromVertices(this.vertices);
    if (this.indices.length / 3 < Meshoptimizer.kMeshletMaxTriangles) {
      const coneBounds = Meshoptimizer.meshopt_computeClusterBounds(this.indices, this.indices.length, this.vertices, this.vertices.length, 8);
      this.coneBounds = { cone_apex: Mathf.Vector3.fromArray(coneBounds.cone_apex), cone_axis: Mathf.Vector3.fromArray(coneBounds.cone_axis), cone_cutoff: coneBounds.cone_cutoff };
    }
    const verticesNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 0);
    const normalsNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 3);
    const uvsNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 2, true, 8, 6);
    const interleaved = InterleavedVertexAttribute.fromArrays([verticesNonIndexed, normalsNonIndexed, uvsNonIndexed], [3, 3, 2]);
    const verticesGPU = [];
    for (let i = 0; i < interleaved.array.length; i += 8) {
      verticesGPU.push(
        interleaved.array[i + 0],
        interleaved.array[i + 1],
        interleaved.array[i + 2],
        interleaved.array[i + 3],
        interleaved.array[i + 4],
        interleaved.array[i + 5],
        interleaved.array[i + 6],
        interleaved.array[i + 7]
      );
    }
    this.interleaved = interleaved;
    this.vertices_gpu = new Float32Array(Meshlet.max_triangles * (3 + 3 + 2) * 3);
    this.vertices_gpu.set(verticesGPU.slice(0, Meshlet.max_triangles * (3 + 3 + 2) * 3));
    this.crc = Utils.CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
  }
  static convertBufferAttributeToNonIndexed(attribute, indices, itemSize, isInterleaved = false, stride = 3, offset = 0) {
    if (!attribute) throw Error("Invalid attribute");
    const array = attribute;
    const array2 = new Float32Array(indices.length * itemSize);
    let index = 0, index2 = 0;
    for (let i = 0, l = indices.length; i < l; i++) {
      if (isInterleaved === true) index = indices[i] * stride + offset;
      else index = indices[i] * itemSize;
      for (let j = 0; j < itemSize; j++) {
        array2[index2++] = array[index++];
      }
    }
    return array2;
  }
}

export { Meshlet };
