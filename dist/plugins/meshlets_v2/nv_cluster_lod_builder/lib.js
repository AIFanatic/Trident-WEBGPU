import { HierarchyInput } from './nvcluster_hierarchy.js';
import { Result, Sphere } from './nvclusterlod_common.js';
import { generateLodHierarchy, LodHierarchy } from './nvclusterlod_hierarchy_storage.js';
import { generateLocalizedLodMesh, LocalizedLodMesh } from './nvclusterlod_mesh_storage.js';

class NV_Cluster {
  static Build(input) {
    let mesh = new LocalizedLodMesh();
    let result = generateLocalizedLodMesh(input, mesh);
    if (result !== Result.SUCCESS) {
      throw Error("Error: " + Result[result]);
    }
    const hierarchyInput = new HierarchyInput();
    hierarchyInput.clusterGeneratingGroups = mesh.lodMesh.clusterGeneratingGroups;
    hierarchyInput.groupQuadricErrors = mesh.lodMesh.groupQuadricErrors;
    hierarchyInput.groupClusterRanges = mesh.lodMesh.groupClusterRanges;
    hierarchyInput.groupCount = mesh.lodMesh.groupClusterRanges.length;
    hierarchyInput.clusterBoundingSpheres = mesh.lodMesh.clusterBoundingSpheres;
    hierarchyInput.clusterCount = mesh.lodMesh.clusterBoundingSpheres.length;
    hierarchyInput.lodLevelGroupRanges = mesh.lodMesh.lodLevelGroupRanges;
    hierarchyInput.lodLevelCount = mesh.lodMesh.lodLevelGroupRanges.length;
    let hierarchy = new LodHierarchy();
    result = generateLodHierarchy(hierarchyInput, hierarchy);
    const groupLodLevels = new Array(mesh.lodMesh.groupClusterRanges.length).fill(0);
    for (let level = 0; level < mesh.lodMesh.lodLevelGroupRanges.length; level++) {
      const groupRange = mesh.lodMesh.lodLevelGroupRanges[level];
      for (let g = groupRange.offset; g < groupRange.offset + groupRange.count; g++) {
        groupLodLevels[g] = level;
      }
    }
    let output = /* @__PURE__ */ new Map();
    for (let lod = 0; lod < mesh.lodMesh.lodLevelGroupRanges.length; lod++) {
      const lodLevelGroupRange = mesh.lodMesh.lodLevelGroupRanges[lod];
      for (let groupIndex = lodLevelGroupRange.offset; groupIndex < lodLevelGroupRange.offset + lodLevelGroupRange.count; groupIndex++) {
        const groupClusterRange = mesh.lodMesh.groupClusterRanges[groupIndex];
        for (let clusterIndex = groupClusterRange.offset; clusterIndex < groupClusterRange.offset + groupClusterRange.count; clusterIndex++) {
          const clusterTriangleRange = mesh.lodMesh.clusterTriangleRanges[clusterIndex];
          const clusterVertexRange = mesh.clusterVertexRanges[clusterIndex];
          const clusterVertexGlobalIndices = mesh.vertexGlobalIndices.slice(clusterVertexRange.offset);
          let clusterIndices = [];
          for (let triangleIndex = clusterTriangleRange.offset; triangleIndex < clusterTriangleRange.offset + clusterTriangleRange.count; triangleIndex++) {
            const localIndex0 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 0];
            const localIndex1 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 1];
            const localIndex2 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 2];
            const globalIndex0 = clusterVertexGlobalIndices[localIndex0];
            const globalIndex1 = clusterVertexGlobalIndices[localIndex1];
            const globalIndex2 = clusterVertexGlobalIndices[localIndex2];
            clusterIndices.push(globalIndex0 + 1);
            clusterIndices.push(globalIndex1 + 1);
            clusterIndices.push(globalIndex2 + 1);
          }
          const clusterGeneratingGroup = mesh.lodMesh.clusterGeneratingGroups[clusterIndex];
          const lodMeshletsArray = output.get(lod) || [];
          const boundingSphere = hierarchy.groupCumulativeBoundingSpheres[groupIndex];
          const error = hierarchy.groupCumulativeQuadricError[groupIndex];
          let parentBoundingSphere = hierarchy.groupCumulativeBoundingSpheres[clusterGeneratingGroup];
          let parentError = hierarchy.groupCumulativeQuadricError[clusterGeneratingGroup];
          if (!parentBoundingSphere) parentBoundingSphere = new Sphere(0, 0, 0, 0);
          if (!parentError) parentError = 0;
          lodMeshletsArray.push({
            vertices: input.vertices,
            indices: new Uint32Array(clusterIndices),
            boundingSphere,
            error,
            parentBoundingSphere,
            parentError
          });
          output.set(lod, lodMeshletsArray);
          console.log(`Processed: lod: ${lod}, groupIndex: ${groupIndex}, clusterIndex: ${clusterIndex}, vertexCount: ${input.vertices.length}, indexCount: ${clusterIndices.length}`);
        }
      }
    }
    return output;
  }
}

export { NV_Cluster };
