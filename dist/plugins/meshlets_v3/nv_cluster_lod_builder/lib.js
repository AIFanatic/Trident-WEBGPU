import { Meshoptimizer } from './meshoptimizer/Meshoptimizer.js';
import { HierarchyInput } from './nvcluster_hierarchy.js';
import { Result, Sphere } from './nvclusterlod_common.js';
import { generateLodHierarchy, LodHierarchy } from './nvclusterlod_hierarchy_storage.js';
import { generateLocalizedLodMesh, LocalizedLodMesh } from './nvclusterlod_mesh_storage.js';

await Meshoptimizer.load();
function computeMeshletBounds(meshlet, meshlet_vertices, meshlet_triangles, vertex_positions, vertex_positions_stride) {
  const vertexSlice = meshlet_vertices.subarray(meshlet.vertex_offset, meshlet.vertex_offset + meshlet.vertex_count);
  const triangleSlice = meshlet_triangles.subarray(meshlet.triangle_offset, meshlet.triangle_offset + meshlet.triangle_count * 3);
  const localVertices = new Float32Array(meshlet.vertex_count * vertex_positions_stride);
  const sequentialVertexIds = new Uint32Array(meshlet.vertex_count);
  for (let i = 0; i < meshlet.vertex_count; i++) {
    const srcIndex = vertexSlice[i] * vertex_positions_stride;
    const dstIndex = i * vertex_positions_stride;
    for (let j = 0; j < vertex_positions_stride; j++) localVertices[dstIndex + j] = vertex_positions[srcIndex + j];
    sequentialVertexIds[i] = i;
  }
  return Meshoptimizer.meshopt_computeMeshletBounds(sequentialVertexIds, triangleSlice, meshlet.triangle_count, localVertices, meshlet.vertex_count, vertex_positions_stride);
}
function packClusterToMeshlet(clusterGlobalTriangleIndices, globalToLocalScratch) {
  const globalToLocal = globalToLocalScratch ?? /* @__PURE__ */ new Map();
  const localVertexList = [];
  const localTriangleTriplets = [];
  if (globalToLocalScratch) globalToLocalScratch.clear();
  for (let i = 0; i < clusterGlobalTriangleIndices.length; i += 3) {
    const g0 = clusterGlobalTriangleIndices[i + 0];
    const g1 = clusterGlobalTriangleIndices[i + 1];
    const g2 = clusterGlobalTriangleIndices[i + 2];
    let l0 = globalToLocal.get(g0);
    if (l0 === void 0) {
      l0 = localVertexList.length;
      globalToLocal.set(g0, l0);
      localVertexList.push(g0);
    }
    let l1 = globalToLocal.get(g1);
    if (l1 === void 0) {
      l1 = localVertexList.length;
      globalToLocal.set(g1, l1);
      localVertexList.push(g1);
    }
    let l2 = globalToLocal.get(g2);
    if (l2 === void 0) {
      l2 = localVertexList.length;
      globalToLocal.set(g2, l2);
      localVertexList.push(g2);
    }
    if (l0 > 255 || l1 > 255 || l2 > 255) {
      throw new Error(`Meshlet vertex count exceeded 255 (got ${localVertexList.length}). Consider generating smaller clusters or splitting.`);
    }
    localTriangleTriplets.push(l0, l1, l2);
  }
  return { localVertexList, localTriangleTriplets };
}
class NV_Cluster {
  static BuildToMeshlets(input) {
    if (!Meshoptimizer.isLoaded) throw Error("Mesh optimizer is not loaded");
    const localized = new LocalizedLodMesh();
    const res = generateLocalizedLodMesh(input, localized);
    if (res !== Result.SUCCESS) throw Error("Error: " + Result[res]);
    const hi = new HierarchyInput();
    hi.clusterGeneratingGroups = localized.lodMesh.clusterGeneratingGroups;
    hi.groupQuadricErrors = localized.lodMesh.groupQuadricErrors;
    hi.groupClusterRanges = localized.lodMesh.groupClusterRanges;
    hi.groupCount = localized.lodMesh.groupClusterRanges.length;
    hi.clusterBoundingSpheres = localized.lodMesh.clusterBoundingSpheres;
    hi.clusterCount = localized.lodMesh.clusterBoundingSpheres.length;
    hi.lodLevelGroupRanges = localized.lodMesh.lodLevelGroupRanges;
    hi.lodLevelCount = localized.lodMesh.lodLevelGroupRanges.length;
    const hierarchy = new LodHierarchy();
    generateLodHierarchy(hi, hierarchy);
    const lodCount = localized.lodMesh.lodLevelGroupRanges.length;
    const lodOutputs = [];
    const interleaved = input.interleavedVertices;
    const interleavedVertices = interleaved ?? input.vertices;
    for (let lod = 0; lod < lodCount; lod++) {
      const groupRange = localized.lodMesh.lodLevelGroupRanges[lod];
      const meshlets = [];
      const allLocalVertices = [];
      const allLocalTriangles = [];
      const scratchMap = /* @__PURE__ */ new Map();
      for (let groupIndex = groupRange.offset; groupIndex < groupRange.offset + groupRange.count; groupIndex++) {
        const clusterRange = localized.lodMesh.groupClusterRanges[groupIndex];
        for (let clusterIndex = clusterRange.offset; clusterIndex < clusterRange.offset + clusterRange.count; clusterIndex++) {
          const triRange = localized.lodMesh.clusterTriangleRanges[clusterIndex];
          const vertRange = localized.clusterVertexRanges[clusterIndex];
          const clusterVertexGlobalIndices = localized.vertexGlobalIndices.slice(vertRange.offset, vertRange.offset + vertRange.count);
          const clusterGlobalTris = [];
          for (let triangleIndex = triRange.offset; triangleIndex < triRange.offset + triRange.count; triangleIndex++) {
            const localIndex0 = localized.lodMesh.triangleVertices[3 * triangleIndex + 0];
            const localIndex1 = localized.lodMesh.triangleVertices[3 * triangleIndex + 1];
            const localIndex2 = localized.lodMesh.triangleVertices[3 * triangleIndex + 2];
            const globalIndex0 = clusterVertexGlobalIndices[localIndex0];
            const globalIndex1 = clusterVertexGlobalIndices[localIndex1];
            const globalIndex2 = clusterVertexGlobalIndices[localIndex2];
            clusterGlobalTris.push(globalIndex0, globalIndex1, globalIndex2);
          }
          const vertex_offset = allLocalVertices.length;
          const triangle_offset = allLocalTriangles.length;
          const { localVertexList, localTriangleTriplets } = packClusterToMeshlet(clusterGlobalTris, scratchMap);
          allLocalVertices.push(...localVertexList);
          allLocalTriangles.push(...localTriangleTriplets);
          const vertex_count = localVertexList.length;
          const triangle_count = localTriangleTriplets.length / 3 | 0;
          if (vertex_count > 256) {
            throw new Error(`Meshlet at LOD ${lod}, group ${groupIndex}, cluster ${clusterIndex} has ${vertex_count} vertices (>255).`);
          }
          const clusterGeneratingGroup = localized.lodMesh.clusterGeneratingGroups[clusterIndex];
          const boundingSphere = hierarchy.groupCumulativeBoundingSpheres[groupIndex];
          const error = hierarchy.groupCumulativeQuadricError[groupIndex];
          let parentBoundingSphere = hierarchy.groupCumulativeBoundingSpheres[clusterGeneratingGroup];
          let parentError = hierarchy.groupCumulativeQuadricError[clusterGeneratingGroup];
          if (!parentBoundingSphere) parentBoundingSphere = new Sphere(0, 0, 0, 0);
          if (!parentError) parentError = 0;
          const meshlet = { vertex_offset: 0, triangle_offset: 0, vertex_count, triangle_count };
          const bounds = computeMeshletBounds(meshlet, new Uint32Array(localVertexList), new Uint8Array(localTriangleTriplets), interleavedVertices, 8);
          meshlets.push({
            vertex_offset,
            triangle_offset,
            vertex_count,
            triangle_count,
            cone: { apex: bounds.cone_apex, axis: bounds.cone_axis, cutoff: bounds.cone_cutoff },
            bounds: { center: [boundingSphere.x, boundingSphere.y, boundingSphere.z], radius: boundingSphere.radius },
            parentBounds: { center: [parentBoundingSphere.x, parentBoundingSphere.y, parentBoundingSphere.z], radius: parentBoundingSphere.radius },
            error,
            parentError
          });
        }
      }
      const lodMeshlet = {
        lod,
        interleavedVertices,
        vertices: new Uint32Array(allLocalVertices),
        indices: new Uint8Array(allLocalTriangles),
        meshlets
      };
      lodOutputs.push(lodMeshlet);
    }
    return lodOutputs;
  }
}

export { NV_Cluster, computeMeshletBounds };
