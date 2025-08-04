import { Meshoptimizer, meshopt_SimplifySparse, meshopt_SimplifyErrorAbsolute } from './meshoptimizer/Meshoptimizer.js';
import { Range, AABB, SpatialElements, Input, Result as Result$1, Graph, generateClusters } from './nvcluster.js';
import { generateSegmentedClusters, SegmentedClusterStorage, ClusterStorage } from './nvcluster_storage.js';
import { assert, Result, resizeArray, createArrayView, vec3_to_number, number_to_uvec3 } from './nvclusterlod_common.js';

const ORIGINAL_MESH_GROUP = 4294967295;
const NVLOD_MINIMAL_ADJACENCY_SIZE = 5;
const NVLOD_LOCKED_VERTEX_WEIGHT_MULTIPLIER = 10;
const NVLOD_VERTEX_WEIGHT_MULTIPLIER = 10;
let lodLevel = 0;
class MeshRequirements {
  // Maximum total number of triangles across LODs
  maxTriangleCount = 0;
  // Maximum total number of clusters across LODs
  maxClusterCount = 0;
  // Maximum total number of cluster groups across LODs
  maxGroupCount = 0;
  // Maximum number of LODs in the mesh
  maxLodLevelCount = 0;
}
class MeshInput {
  // Pointer to triangle definitions, 3 indices per triangle
  indices;
  // Number of indices in the mesh
  indexCount = 0;
  // Vertex data for the mesh, 3 floats per entry
  vertices;
  // Offset in vertices where the vertex data for the mesh starts, in float
  vertexOffset = 0;
  // Number of vertices in the mesh
  vertexCount = 0;
  // Stride in bytes between the beginning of two successive vertices (e.g. 12 bytes for densely packed positions)
  vertexStride = 0;
  // Configuration for the generation of triangle clusters
  clusterConfig = {
    minClusterSize: 96,
    maxClusterSize: 128,
    costUnderfill: 0.9,
    costOverlap: 0.5,
    preSplitThreshold: 1 << 17
  };
  // Configuration for the generation of cluster groups
  // Each LOD is comprised of a number of cluster groups
  groupConfig = {
    minClusterSize: 24,
    maxClusterSize: 32,
    costUnderfill: 0.5,
    costOverlap: 0,
    preSplitThreshold: 0
  };
  // Decimation factor applied between successive LODs
  decimationFactor = 0;
}
class MeshOutput {
  // Triangle clusters. Each Range represents one cluster covering range.count triangles in clusterTriangles, starting at range.offset
  clusterTriangleRanges;
  // Triangle data for the clusters, referenced by clusterTriangleRanges
  clusterTriangles;
  // Decimation takes the mesh at a given LOD represented by a number of cluster groups,
  // and generates a (smaller) number of cluster groups for the next coarser LOD. For each
  // generated cluster clusterGeneratingGroups stores the index of the group it was generated from.
  // For the clusters at the finest LOD (LOD 0) that index is ORIGINAL_MESH_GROUP
  clusterGeneratingGroups;
  // Bounding spheres of the clusters, may be nullptr
  clusterBoundingSpheres;
  // Error metric after decimating geometry in each group. Counter-intuitively,
  // not the error of the geometry in the group - that value does not exist
  // per-group but would be the group quadric error of the cluster's generating
  // group. This saves duplicating errors per cluster. The final LOD is just one
  // group, is not decimated, and has an error of zero.
  // TODO: shouldn't this be infinite error so it's always drawn?
  groupQuadricErrors;
  // Ranges of clusters contained in each group so that the clusters of a group are stored at range.offset in clusterTriangleRanges
  // and the group covers range.count clusters.
  groupClusterRanges;
  // Ranges of groups comprised in each LOD level, so that the groups for LOD n are stored at lodLevelGroupRanges[n].offset and the LOD
  // uses lodLevelGroupRanges[n].count groups. The finest LOD is at index 0, followed by the coarser LODs from finer to coarser
  lodLevelGroupRanges;
  // Number of triangles in the mesh across LODs
  triangleCount = 0;
  // Number of clusters in the mesh across LODs
  clusterCount = 0;
  // Number of cluster groups in the mesh across LODs
  groupCount = 0;
  // Number of LODs in the mesh
  lodLevelCount = 0;
}
class MeshGetRequirementsInfo {
  // Definition of the input geometry and clustering configuration
  input;
}
class MeshCreateInfo {
  // Definition of the input geometry and clustering configuration
  input;
}
class TriangleClusters {
  clustering = new SegmentedClusterStorage();
  // Bounding boxes for each cluster
  clusterAabbs = [];
  // Triangles are clustered from ranges of input geometry. The initial
  // clustering has one range - the whole mesh. Subsequent ranges come from
  // decimated cluster groups of the previous level. The generating group is
  // implicitly generatingGroupOffset plus the segment index.
  generatingGroupOffset;
  maxClusterItems;
}
class uvec3 {
  x = 0;
  y = 0;
  z = 0;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}
Object.defineProperties(uvec3.prototype, {
  "0": {
    get() {
      return this.x;
    },
    set(value) {
      this.x = value;
    }
  },
  "1": {
    get() {
      return this.y;
    },
    set(value) {
      this.y = value;
    }
  },
  "2": {
    get() {
      return this.z;
    },
    set(value) {
      this.z = value;
    }
  }
});
class vec3 {
  x = 0;
  y = 0;
  z = 0;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}
Object.defineProperties(vec3.prototype, {
  "0": {
    get() {
      return this.x;
    },
    set(value) {
      this.x = value;
    }
  },
  "1": {
    get() {
      return this.y;
    },
    set(value) {
      this.y = value;
    }
  },
  "2": {
    get() {
      return this.z;
    },
    set(value) {
      this.z = value;
    }
  }
});
class AdjacencyVertexCount {
  vertexCount = 0;
  lockedCount = 0;
}
function getTriangle(mesh, index) {
  const startIndex = index * 3;
  return mesh.indices.subarray(startIndex, startIndex + 3);
}
function getVertex(mesh, index) {
  const floatStride = mesh.vertexStride;
  const startIndex = index * floatStride;
  return mesh.vertices.subarray(startIndex, startIndex + floatStride);
}
function centroidAABB(aabb) {
  let res = new vec3();
  res.x = (aabb.bboxMax[0] + aabb.bboxMin[0]) / 2;
  res.y = (aabb.bboxMax[1] + aabb.bboxMin[1]) / 2;
  res.z = (aabb.bboxMax[2] + aabb.bboxMin[2]) / 2;
  return res;
}
function emptyAABB() {
  let res = new AABB();
  res.bboxMin[0] = Number.MAX_VALUE;
  res.bboxMin[1] = Number.MAX_VALUE;
  res.bboxMin[2] = Number.MAX_VALUE;
  res.bboxMax[0] = -Number.MAX_VALUE;
  res.bboxMax[1] = -Number.MAX_VALUE;
  res.bboxMax[2] = -Number.MAX_VALUE;
  return res;
}
function addAABB(aabb, added) {
  for (let i = 0; i < 3; i++) {
    aabb.bboxMin[i] = Math.min(aabb.bboxMin[i], added.bboxMin[i]);
    aabb.bboxMax[i] = Math.max(aabb.bboxMax[i], added.bboxMax[i]);
  }
}
class DecimatedClusterGroups {
  // Ranges of triangles. Initially there is just one range containing the input
  // mesh. In subsequent iterations each ranges is a group of decimated
  // triangles. Clusters of triangles are formed within each range.
  groupTriangleRanges = [];
  // Triangle indices and vertices. Triangles are grouped by
  // groupTriangleRanges. Vertices always point to the input mesh vertices.
  mesh = new MeshInput();
  // Storage for decimated triangles from the previous pass. Note that triangles
  // are written to the output in clusters, which are formed from these at the
  // start of each iteration.
  decimatedTriangleStorage = [];
  // Per-group quadric errors from decimation
  groupQuadricErrors = [];
  // Added to the groupTriangleRanges index for a global group index. This is
  // needed to write clusterGeneratingGroups.
  baseClusterGroupIndex = 0;
  // Boolean list of locked vertices from the previous pass. Used to encourage
  // connecting clusters with shared locked vertices by increasing adjacency
  // weights.
  globalLockedVertices = [];
}
class OutputWritePositions {
  clusterTriangleRange = 0;
  clusterTriangleVertex = 0;
  clusterParentGroup = 0;
  clusterBoundingSphere = 0;
  groupQuadricError = 0;
  groupCluster = 0;
  lodLevelGroup = 0;
}
function divCeil(a, b) {
  return Math.floor((a + b - 1) / b);
}
function nvclusterlodMeshGetRequirements(info) {
  const triangleCount = info.input.indexCount / 3;
  assert(triangleCount != 0);
  const lod0ClusterCount = divCeil(triangleCount, info.input.clusterConfig.maxClusterSize) + 1;
  const idealLevelCount = Math.ceil(-Math.log(lod0ClusterCount) / Math.log(info.input.decimationFactor));
  const idealClusterCount = lod0ClusterCount * idealLevelCount;
  const idealClusterGroupCount = divCeil(idealClusterCount, info.input.groupConfig.maxClusterSize);
  let result = new MeshRequirements();
  result.maxTriangleCount = idealClusterCount * info.input.clusterConfig.maxClusterSize;
  result.maxClusterCount = idealClusterCount;
  result.maxGroupCount = idealClusterGroupCount * 4;
  result.maxLodLevelCount = idealLevelCount * 2 + 1;
  return result;
}
function exclusive_scan_impl(input, init, op) {
  let sum = init;
  const output = [];
  for (const value of input) {
    output.push(sum);
    sum = op(sum, value);
  }
  return output;
}
function computeLockedVertices(inputMesh, triangleClusters, clusterGrouping) {
  const VERTEX_NOT_SEEN = 4294967295;
  const VERTEX_ADDED = 4294967294;
  let lockedVertices = new Array(inputMesh.vertexCount).fill(0);
  let vertexClusterGroups = new Array(inputMesh.vertexCount).fill(VERTEX_NOT_SEEN);
  for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGrouping.groups.clusterRanges.length; ++clusterGroupIndex) {
    const range = clusterGrouping.groups.clusterRanges[clusterGroupIndex];
    const clusterGroup = createArrayView(clusterGrouping.groups.clusterItems, range.offset, range.count);
    for (const clusterIndex of clusterGroup) {
      const clusterRange = triangleClusters.clustering.clusterRanges[clusterIndex];
      const cluster = createArrayView(triangleClusters.clustering.clusterItems, clusterRange.offset, clusterRange.count);
      for (const triangleIndex of cluster) {
        const tri = getTriangle(inputMesh, triangleIndex);
        for (let i = 0; i < 3; ++i) {
          const vertexIndex = tri[i];
          let vertexClusterGroup = vertexClusterGroups[vertexIndex];
          if (vertexClusterGroup == VERTEX_NOT_SEEN) {
            vertexClusterGroups[vertexIndex] = clusterGroupIndex;
          } else if (vertexClusterGroup != VERTEX_ADDED && vertexClusterGroup != clusterGroupIndex) {
            lockedVertices[vertexIndex] = 1;
            vertexClusterGroups[vertexIndex] = VERTEX_ADDED;
          }
        }
      }
    }
  }
  return lockedVertices;
}
function decimateClusterGroups(current, triangleClusters, clusterGrouping, lodLevelDecimationFactor) {
  const inputMesh = current.mesh;
  let result = new DecimatedClusterGroups();
  result.globalLockedVertices = computeLockedVertices(inputMesh, triangleClusters, clusterGrouping);
  result.decimatedTriangleStorage = resizeArray(result.decimatedTriangleStorage, clusterGrouping.totalTriangleCount, () => new uvec3());
  {
    result.mesh.indices = new Uint32Array(vec3_to_number(result.decimatedTriangleStorage));
  }
  result.groupTriangleRanges = resizeArray(result.groupTriangleRanges, clusterGrouping.groups.clusterRanges.length, () => new Range());
  result.groupQuadricErrors = resizeArray(result.groupQuadricErrors, clusterGrouping.groups.clusterRanges.length, () => 0);
  result.baseClusterGroupIndex = clusterGrouping.globalGroupOffset;
  let decimatedTriangleAlloc = 0;
  let success = Result.SUCCESS;
  for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGrouping.groups.clusterRanges.length; clusterGroupIndex++) {
    if (success != Result.SUCCESS) {
      break;
    }
    const clusterGroupRange = clusterGrouping.groups.clusterRanges[clusterGroupIndex];
    let clusterGroupTriangleVertices = [];
    for (let indexInRange = clusterGroupRange.offset; indexInRange < clusterGroupRange.offset + clusterGroupRange.count; indexInRange++) {
      const clusterIndex = clusterGrouping.groups.clusterItems[indexInRange];
      const clusterRange = triangleClusters.clustering.clusterRanges[clusterIndex];
      for (let index = clusterRange.offset; index < clusterRange.offset + clusterRange.count; index++) {
        const triangleIndex = triangleClusters.clustering.clusterItems[index];
        const triPtr = getTriangle(inputMesh, triangleIndex);
        clusterGroupTriangleVertices.push(new uvec3(triPtr[0], triPtr[1], triPtr[2]));
      }
    }
    let decimatedTriangleVertices = new Array(clusterGroupTriangleVertices.length).fill(null).map(() => new uvec3());
    const targetError = 34028234663852886e22;
    let absoluteError = 0;
    const options = meshopt_SimplifySparse | meshopt_SimplifyErrorAbsolute;
    const desiredTriangleCount = Math.floor(clusterGroupTriangleVertices.length * lodLevelDecimationFactor);
    const ret = Meshoptimizer.meshopt_simplifyWithAttributes(
      decimatedTriangleVertices.length * 3,
      new Uint32Array(vec3_to_number(clusterGroupTriangleVertices)),
      clusterGroupTriangleVertices.length * 3,
      inputMesh.vertices,
      // getVertex(inputMesh, 0),
      inputMesh.vertexCount,
      inputMesh.vertexStride,
      null,
      0,
      null,
      0,
      new Uint8Array(result.globalLockedVertices),
      desiredTriangleCount * 3,
      targetError,
      options
    );
    let simplifiedTriangleCount = ret.ret / 3;
    decimatedTriangleVertices = number_to_uvec3(ret.destination);
    absoluteError = ret.out_result_error;
    if (desiredTriangleCount < simplifiedTriangleCount) {
      console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Retrying, ignoring topology`);
      let positionUniqueTriangleVertices = new Array(clusterGroupTriangleVertices.length).fill(null).map(() => new uvec3());
      const ret_shadowIndexBuffer = Meshoptimizer.meshopt_generateShadowIndexBuffer(
        new Uint32Array(vec3_to_number(clusterGroupTriangleVertices)),
        clusterGroupTriangleVertices.length * 3,
        inputMesh.vertices,
        // getVertex(inputMesh, 0),
        inputMesh.vertexCount,
        3,
        // vertex_size, for interleaved this stays at 3 * 4
        inputMesh.vertexStride
      );
      positionUniqueTriangleVertices = number_to_uvec3(ret_shadowIndexBuffer);
      const ret2 = Meshoptimizer.meshopt_simplifyWithAttributes(
        decimatedTriangleVertices.length * 3,
        new Uint32Array(vec3_to_number(positionUniqueTriangleVertices)),
        positionUniqueTriangleVertices.length * 3,
        inputMesh.vertices,
        // getVertex(inputMesh, 0),
        inputMesh.vertexCount,
        inputMesh.vertexStride,
        null,
        0,
        null,
        0,
        new Uint8Array(result.globalLockedVertices),
        desiredTriangleCount * 3,
        targetError,
        options
      );
      simplifiedTriangleCount = ret2.ret / 3;
      decimatedTriangleVertices = number_to_uvec3(ret2.destination);
      absoluteError = ret2.out_result_error;
      if (desiredTriangleCount < simplifiedTriangleCount) {
        console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Retrying, ignoring locked`);
        throw Error("Not implemented");
      }
    }
    if (desiredTriangleCount < simplifiedTriangleCount) {
      console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Discarding ${simplifiedTriangleCount - desiredTriangleCount} triangles`);
    }
    decimatedTriangleVertices = resizeArray(decimatedTriangleVertices, Math.min(desiredTriangleCount, simplifiedTriangleCount), () => new uvec3());
    const groupDecimatedTrianglesOffset = decimatedTriangleAlloc;
    decimatedTriangleAlloc += decimatedTriangleVertices.length;
    if (groupDecimatedTrianglesOffset + decimatedTriangleVertices.length > result.decimatedTriangleStorage.length) {
      success = Result.ERROR_OUTPUT_MESH_OVERFLOW;
      break;
    }
    for (let i = 0; i < decimatedTriangleVertices.length; i++) {
      result.decimatedTriangleStorage[groupDecimatedTrianglesOffset + i] = decimatedTriangleVertices[i];
    }
    result.groupTriangleRanges[clusterGroupIndex] = new Range(groupDecimatedTrianglesOffset, decimatedTriangleVertices.length);
    result.groupQuadricErrors[clusterGroupIndex] = absoluteError;
  }
  if (success != Result.SUCCESS) {
    return success;
  }
  result.decimatedTriangleStorage = resizeArray(result.decimatedTriangleStorage, decimatedTriangleAlloc, () => new uvec3());
  result.mesh.indices = new Uint32Array(vec3_to_number(result.decimatedTriangleStorage));
  result.mesh.indexCount = result.decimatedTriangleStorage.length * 3;
  result.mesh.vertexCount = inputMesh.vertexCount;
  result.mesh.vertexOffset = inputMesh.vertexOffset;
  result.mesh.vertexStride = inputMesh.vertexStride;
  result.mesh.vertices = inputMesh.vertices;
  Object.assign(current, result);
  return Result.SUCCESS;
}
function generateTriangleClusters(decimatedClusterGroups, clusterConfig, output) {
  const triangleCount = Math.floor(decimatedClusterGroups.mesh.indexCount) / 3;
  let triangleAabbs = new Array(triangleCount).fill(null).map(() => new AABB());
  let triangleCentroids = new Array(triangleCount).fill(null).map(() => new vec3());
  for (let i = 0; i < triangleCount; i++) {
    const triangle = getTriangle(decimatedClusterGroups.mesh, i);
    const a = getVertex(decimatedClusterGroups.mesh, triangle[0]);
    const b = getVertex(decimatedClusterGroups.mesh, triangle[1]);
    const c = getVertex(decimatedClusterGroups.mesh, triangle[2]);
    for (let coord = 0; coord < 3; coord++) {
      triangleAabbs[i].bboxMin[coord] = Math.min(Math.min(a[coord], b[coord]), c[coord]);
      triangleAabbs[i].bboxMax[coord] = Math.max(Math.max(a[coord], b[coord]), c[coord]);
    }
    triangleCentroids[i] = centroidAABB(triangleAabbs[i]);
  }
  let perTriangleElements = new SpatialElements();
  perTriangleElements.boundingBoxes = triangleAabbs;
  perTriangleElements.centroids = triangleCentroids.map((v) => [v.x, v.y, v.z]).flat();
  perTriangleElements.elementCount = triangleAabbs.length;
  let triangleClusterInput = new Input();
  triangleClusterInput.config = clusterConfig;
  triangleClusterInput.spatialElements = perTriangleElements;
  let clusteringResult = generateSegmentedClusters(
    triangleClusterInput,
    decimatedClusterGroups.groupTriangleRanges,
    decimatedClusterGroups.groupTriangleRanges.length,
    output.clustering
  );
  if (clusteringResult != Result$1.SUCCESS) {
    return Result.ERROR_CLUSTERING_FAILED;
  }
  if (output.clusterAabbs.length !== output.clustering.clusterRanges.length) {
    for (let i = 0; i < output.clustering.clusterRanges.length; i++) {
      output.clusterAabbs.push(new AABB());
    }
  }
  for (let rangeIndex = 0; rangeIndex < output.clusterAabbs.length; rangeIndex++) {
    const range = output.clustering.clusterRanges[rangeIndex];
    let clusterAabb = emptyAABB();
    for (let index = range.offset; index < range.offset + range.count; index++) {
      const triangleIndex = output.clustering.clusterItems[index];
      addAABB(clusterAabb, triangleAabbs[triangleIndex]);
    }
    output.clusterAabbs[rangeIndex] = clusterAabb;
  }
  output.generatingGroupOffset = decimatedClusterGroups.baseClusterGroupIndex;
  output.maxClusterItems = clusterConfig.maxClusterSize;
  return Result.SUCCESS;
}
class VertexAdjacency extends Uint32Array {
  static Sentinel = 4294967295;
  constructor() {
    super(8);
    this.fill(VertexAdjacency.Sentinel);
  }
}
function computeClusterAdjacency(decimatedClusterGroups, triangleClusters, result) {
  resizeArray(result, triangleClusters.clustering.clusterRanges.length, () => /* @__PURE__ */ new Map());
  if (result.length !== triangleClusters.clustering.clusterRanges.length) {
    for (let i = 0; i < triangleClusters.clustering.clusterRanges.length; i++) {
      result.push(/* @__PURE__ */ new Map());
    }
  }
  const vertexClusterAdjacencies = new Array(decimatedClusterGroups.mesh.vertexCount).fill(null).map(() => new VertexAdjacency());
  for (let clusterIndex = 0; clusterIndex < triangleClusters.clustering.clusterRanges.length; ++clusterIndex) {
    const range = triangleClusters.clustering.clusterRanges[clusterIndex];
    const clusterTriangles = createArrayView(triangleClusters.clustering.clusterItems, range.offset, range.count);
    for (let indexInCluster = 0; indexInCluster < clusterTriangles.length; indexInCluster++) {
      const triangleIndex = clusterTriangles[indexInCluster];
      const tri = getTriangle(decimatedClusterGroups.mesh, triangleIndex);
      for (let i = 0; i < 3; ++i) {
        const vertexClusterAdjacency = vertexClusterAdjacencies[tri[i]];
        let seenSelf = false;
        for (let adjacencyIndex = 0; adjacencyIndex < vertexClusterAdjacency.length; adjacencyIndex++) {
          let adjacentClusterIndex = vertexClusterAdjacency[adjacencyIndex];
          if (adjacentClusterIndex == clusterIndex) {
            seenSelf = true;
            continue;
          }
          if (adjacentClusterIndex == VertexAdjacency.Sentinel) {
            if (!seenSelf) {
              adjacentClusterIndex = clusterIndex;
              vertexClusterAdjacency[adjacencyIndex] = adjacentClusterIndex;
            }
            if (vertexClusterAdjacency[vertexClusterAdjacency.length - 1] !== VertexAdjacency.Sentinel) {
              console.warn(`Warning: vertexClusterAdjacency[${tri[i]}] is full`);
            }
            break;
          }
          if (adjacentClusterIndex >= clusterIndex) {
            return Result.ERROR_ADJACENCY_GENERATION_FAILED;
          }
          let currentToAdjacent = result[clusterIndex].get(adjacentClusterIndex);
          let adjacentToCurrent = result[adjacentClusterIndex].get(clusterIndex);
          if (!currentToAdjacent) {
            currentToAdjacent = new AdjacencyVertexCount();
            result[clusterIndex].set(adjacentClusterIndex, currentToAdjacent);
          }
          if (!adjacentToCurrent) {
            adjacentToCurrent = new AdjacencyVertexCount();
            result[adjacentClusterIndex].set(clusterIndex, adjacentToCurrent);
          }
          currentToAdjacent.vertexCount += 1;
          adjacentToCurrent.vertexCount += 1;
          if (decimatedClusterGroups.globalLockedVertices[tri[i]] != 0) {
            currentToAdjacent.lockedCount += 1;
            adjacentToCurrent.lockedCount += 1;
          }
        }
      }
    }
  }
  return Result.SUCCESS;
}
function farthestPoint(mesh, start, farthest) {
  let result = void 0;
  let maxLengthSq = 0;
  for (let triangleIndex = 0; triangleIndex < mesh.indexCount / 3; triangleIndex++) {
    const triangle = getTriangle(mesh, triangleIndex);
    for (let i = 0; i < 3; ++i) {
      const candidatePtr = getVertex(mesh, triangle[i]);
      let sc = new Array(3);
      sc[0] = candidatePtr[0] - start[0];
      sc[1] = candidatePtr[1] - start[1];
      sc[2] = candidatePtr[2] - start[2];
      sc[0] = parseFloat(sc[0].toPrecision(5));
      sc[1] = parseFloat(sc[1].toPrecision(5));
      sc[2] = parseFloat(sc[2].toPrecision(5));
      const lengthSq = sc[0] * sc[0] + sc[1] * sc[1] + sc[2] * sc[2];
      if (lengthSq > maxLengthSq) {
        maxLengthSq = lengthSq;
        result = candidatePtr;
      }
    }
  }
  if (result !== void 0) {
    farthest[0] = result[0];
    farthest[1] = result[1];
    farthest[2] = result[2];
  }
}
function distance(x, y) {
  let result = 0;
  for (let i = 0; i < 3; i++) {
    const d = x[i] - y[i];
    result += d * d;
  }
  return Math.sqrt(result);
}
function makeBoundingSphere(mesh, sphere) {
  const x = getVertex(mesh, 0);
  let y = new Array(3);
  let z = new Array(3);
  farthestPoint(mesh, Array.from(x), y);
  farthestPoint(mesh, y, z);
  let position = new Array(3).fill(0);
  for (let i = 0; i < 3; i++) {
    position[i] = (y[i] + z[i]) * 0.5;
  }
  let radius = distance(z, y) * 0.5;
  const f = new Array(3).fill(0);
  farthestPoint(mesh, position, f);
  radius = distance(f, position);
  if (isNaN(position[0]) || isNaN(position[1]) || isNaN(position[2]) || isNaN(radius)) {
    return Result.ERROR_INCONSISTENT_BOUNDING_SPHERES;
  }
  sphere.x = position[0];
  sphere.y = position[1];
  sphere.z = position[2];
  sphere.radius = radius;
  return Result.SUCCESS;
}
class ClusterGroups {
  groups = new ClusterStorage();
  groupTriangleCounts = [];
  // useful byproduct
  totalTriangleCount = 0;
  globalGroupOffset = 0;
}
function groupClusters(triangleClusters, clusterGroupConfig, globalGroupOffset, clusterAdjacency, result) {
  let adjacencySizes = new Array(clusterAdjacency.length).fill(0);
  {
    for (let i = 0; i < clusterAdjacency.length; i++) {
      const adjacency = clusterAdjacency[i];
      for (const key of Array.from(adjacency.keys())) {
        const count = adjacency.get(key);
        if (count && count.vertexCount < NVLOD_MINIMAL_ADJACENCY_SIZE) {
          adjacency.delete(key);
        }
      }
      adjacencySizes[i] = adjacency.size;
    }
  }
  let adjacencyOffsets = new Array(clusterAdjacency.length).fill(0);
  {
    adjacencyOffsets = exclusive_scan_impl(adjacencySizes, 0, (sum, value) => sum + value);
  }
  const adjacencyItemCount = adjacencyOffsets.length === 0 ? 0 : adjacencyOffsets[adjacencyOffsets.length - 1] + clusterAdjacency[clusterAdjacency.length - 1].size;
  let adjacencyItems = new Array(adjacencyItemCount);
  let adjacencyWeights = new Array(adjacencyItemCount);
  let adjacencyRanges = new Array(adjacencyOffsets.length);
  let clusterCentroids = new Array(triangleClusters.clusterAabbs.length);
  {
    for (let clusterIndex = 0; clusterIndex < adjacencyOffsets.length; clusterIndex++) {
      let range = adjacencyRanges[clusterIndex];
      range = new Range(adjacencyOffsets[clusterIndex], 0);
      adjacencyRanges[clusterIndex] = range;
      for (const [adjacentClusterIndex, adjacencyVertexCounts] of clusterAdjacency[clusterIndex]) {
        const weight = 1 + adjacencyVertexCounts.vertexCount + adjacencyVertexCounts.lockedCount * NVLOD_LOCKED_VERTEX_WEIGHT_MULTIPLIER;
        adjacencyItems[range.offset + range.count] = adjacentClusterIndex;
        adjacencyWeights[range.offset + range.count] = Math.max(weight, 1) * NVLOD_VERTEX_WEIGHT_MULTIPLIER;
        range.count++;
      }
      clusterCentroids[clusterIndex] = centroidAABB(triangleClusters.clusterAabbs[clusterIndex]);
    }
  }
  const clusterElements = new SpatialElements();
  clusterElements.boundingBoxes = triangleClusters.clusterAabbs;
  clusterElements.centroids = vec3_to_number(clusterCentroids);
  clusterElements.elementCount = triangleClusters.clusterAabbs.length;
  let graph = new Graph();
  graph.nodes = adjacencyRanges;
  graph.nodeCount = adjacencyRanges.length;
  graph.connectionTargets = adjacencyItems;
  graph.connectionWeights = adjacencyWeights;
  graph.connectionCount = adjacencyItems.length;
  const inputTriangleClusters = new Input();
  inputTriangleClusters.config = clusterGroupConfig;
  inputTriangleClusters.spatialElements = clusterElements;
  inputTriangleClusters.graph = graph;
  result.globalGroupOffset = globalGroupOffset;
  let clusterResult;
  {
    clusterResult = generateClusters(inputTriangleClusters, result.groups);
  }
  if (clusterResult != Result$1.SUCCESS) {
    return Result.ERROR_CLUSTERING_FAILED;
  }
  result.groupTriangleCounts = resizeArray(result.groupTriangleCounts, result.groups.clusterRanges.length, () => 0);
  {
    for (let rangeIndex = 0; rangeIndex < result.groups.clusterRanges.length; rangeIndex++) {
      const range = result.groups.clusterRanges[rangeIndex];
      for (let index = range.offset; index < range.offset + range.count; index++) {
        const clusterIndex = result.groups.clusterItems[index];
        const triangleClusterCount = triangleClusters.clustering.clusterRanges[clusterIndex].count;
        result.groupTriangleCounts[rangeIndex] += triangleClusterCount;
        result.totalTriangleCount += triangleClusterCount;
      }
    }
  }
  return Result.SUCCESS;
}
function writeClusters(decimatedClusterGroups, clusterGroups, triangleClusters, meshOutput, outputWritePositions) {
  if (outputWritePositions.lodLevelGroup >= meshOutput.lodLevelCount) {
    return Result.ERROR_OUTPUT_MESH_OVERFLOW;
  }
  const lodLevelGroupRange = meshOutput.lodLevelGroupRanges[outputWritePositions.lodLevelGroup];
  outputWritePositions.lodLevelGroup++;
  lodLevelGroupRange.offset = outputWritePositions.groupCluster;
  let clusterGeneratingGroups = [];
  for (let clusterLocalGroupIndex = 0; clusterLocalGroupIndex < triangleClusters.clustering.clusterRangeSegments.length; clusterLocalGroupIndex++) {
    const clusterGroupRange = triangleClusters.clustering.clusterRangeSegments[clusterLocalGroupIndex];
    const generatingGroupIndex = triangleClusters.generatingGroupOffset + clusterLocalGroupIndex;
    for (let i = 0; i < clusterGroupRange.count; i++) {
      clusterGeneratingGroups.push(generatingGroupIndex);
    }
  }
  if (clusterGeneratingGroups.length != triangleClusters.clustering.clusterRanges.length) {
    return Result.ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH;
  }
  for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGroups.groups.clusterRanges.length; ++clusterGroupIndex) {
    if (outputWritePositions.groupCluster >= meshOutput.groupCount) {
      return Result.ERROR_OUTPUT_MESH_OVERFLOW;
    }
    const range = clusterGroups.groups.clusterRanges[clusterGroupIndex];
    const clusterGroup = createArrayView(clusterGroups.groups.clusterItems, range.offset, range.count);
    meshOutput.groupClusterRanges[outputWritePositions.groupCluster] = new Range(outputWritePositions.clusterTriangleRange, range.count);
    outputWritePositions.groupCluster++;
    clusterGroup.sort((a, b) => {
      return clusterGeneratingGroups[a] - clusterGeneratingGroups[b];
    });
    for (const clusterIndex of clusterGroup) {
      const clusterTriangleRange = triangleClusters.clustering.clusterRanges[clusterIndex];
      const clusterTriangles = createArrayView(triangleClusters.clustering.clusterItems, clusterTriangleRange.offset, clusterTriangleRange.count);
      const trianglesBegin = createArrayView(meshOutput.clusterTriangles, outputWritePositions.clusterTriangleVertex * 3, meshOutput.clusterTriangles.length);
      const trianglesBeginIndex = outputWritePositions.clusterTriangleVertex * 3;
      const clusterRange = new Range(outputWritePositions.clusterTriangleVertex, clusterTriangles.length);
      if (clusterRange.offset + clusterRange.count > meshOutput.triangleCount) {
        return Result.ERROR_OUTPUT_MESH_OVERFLOW;
      }
      for (const triangleIndex of clusterTriangles) {
        const triangle = getTriangle(decimatedClusterGroups.mesh, triangleIndex);
        meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 0] = triangle[0];
        meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 1] = triangle[1];
        meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 2] = triangle[2];
        outputWritePositions.clusterTriangleVertex++;
      }
      meshOutput.clusterTriangleRanges[outputWritePositions.clusterTriangleRange] = clusterRange;
      outputWritePositions.clusterTriangleRange++;
      meshOutput.clusterGeneratingGroups[outputWritePositions.clusterParentGroup] = clusterGeneratingGroups[clusterIndex];
      outputWritePositions.clusterParentGroup++;
      if (outputWritePositions.clusterBoundingSphere < meshOutput.clusterCount) {
        let mesh = new MeshInput();
        mesh.indexCount = outputWritePositions.clusterTriangleVertex * 3 - trianglesBeginIndex;
        let indices = new Uint32Array(mesh.indexCount);
        for (let i = 0; i < mesh.indexCount; i++) {
          indices[i] = trianglesBegin[i];
        }
        mesh.indices = indices;
        mesh.vertices = decimatedClusterGroups.mesh.vertices;
        mesh.vertexOffset = decimatedClusterGroups.mesh.vertexOffset;
        mesh.vertexStride = decimatedClusterGroups.mesh.vertexStride;
        mesh.vertexCount = decimatedClusterGroups.mesh.vertexCount;
        const result = makeBoundingSphere(mesh, meshOutput.clusterBoundingSpheres[outputWritePositions.clusterBoundingSphere]);
        if (result != Result.SUCCESS) {
          return result;
        }
        outputWritePositions.clusterBoundingSphere++;
      }
    }
  }
  lodLevelGroupRange.count = outputWritePositions.groupCluster - lodLevelGroupRange.offset;
  return Result.SUCCESS;
}
function nvclusterlodMeshCreate(info, output) {
  const input = info.input;
  let outputCounters = new OutputWritePositions();
  let decimatedClusterGroups = new DecimatedClusterGroups();
  decimatedClusterGroups.groupTriangleRanges = [new Range(0, Math.floor(input.indexCount / 3))];
  decimatedClusterGroups.mesh = input;
  decimatedClusterGroups.decimatedTriangleStorage = [];
  decimatedClusterGroups.groupQuadricErrors = [0];
  decimatedClusterGroups.baseClusterGroupIndex = ORIGINAL_MESH_GROUP;
  decimatedClusterGroups.globalLockedVertices = new Array(input.vertexCount).fill(0);
  console.log(`Initial clustering (${input.indexCount / 3} triangles)`);
  let lastTriangleCount = Infinity;
  let triangleCountCanary = 10;
  while (true) {
    const triangleClusters = new TriangleClusters();
    let success = generateTriangleClusters(decimatedClusterGroups, input.clusterConfig, triangleClusters);
    if (success != Result.SUCCESS) {
      return success;
    }
    let clusterAdjacency = [];
    success = computeClusterAdjacency(decimatedClusterGroups, triangleClusters, clusterAdjacency);
    if (success != Result.SUCCESS) {
      return success;
    }
    const globalGroupOffset = outputCounters.groupCluster;
    let clusterGroups = new ClusterGroups();
    success = groupClusters(triangleClusters, input.groupConfig, globalGroupOffset, clusterAdjacency, clusterGroups);
    if (success != Result.SUCCESS) {
      return success;
    }
    success = writeClusters(decimatedClusterGroups, clusterGroups, triangleClusters, output, outputCounters);
    if (success != Result.SUCCESS) {
      return success;
    }
    const clusterCount = triangleClusters.clustering.clusterRanges.length;
    if (clusterCount <= 1) {
      if (clusterCount != 1) {
        return Result.ERROR_EMPTY_ROOT_CLUSTER;
      }
      break;
    }
    console.warn("Decimating lod %d (%d clusters)\n", lodLevel++, clusterCount);
    const maxDecimationFactor = (clusterCount - 1) / clusterCount;
    const decimationFactor = Math.min(maxDecimationFactor, input.decimationFactor);
    success = decimateClusterGroups(decimatedClusterGroups, triangleClusters, clusterGroups, decimationFactor);
    if (success != Result.SUCCESS) {
      return success;
    }
    const triangleCount = decimatedClusterGroups.decimatedTriangleStorage.length;
    if (triangleCount == lastTriangleCount && --triangleCountCanary <= 0) {
      return Result.ERROR_CLUSTER_COUNT_NOT_DECREASING;
    }
    lastTriangleCount = triangleCount;
    for (let i = 0; i < decimatedClusterGroups.groupQuadricErrors.length; i++) {
      output.groupQuadricErrors[outputCounters.groupQuadricError] = decimatedClusterGroups.groupQuadricErrors[i];
      outputCounters.groupQuadricError++;
    }
  }
  output.groupQuadricErrors[outputCounters.groupQuadricError] = 0;
  outputCounters.groupQuadricError++;
  output.clusterCount = outputCounters.clusterTriangleRange;
  output.groupCount = outputCounters.groupCluster;
  output.lodLevelCount = outputCounters.lodLevelGroup;
  output.triangleCount = outputCounters.clusterTriangleVertex;
  return Result.SUCCESS;
}

export { DecimatedClusterGroups, MeshCreateInfo, MeshGetRequirementsInfo, MeshInput, MeshOutput, MeshRequirements, ORIGINAL_MESH_GROUP, OutputWritePositions, TriangleClusters, VertexAdjacency, divCeil, exclusive_scan_impl, nvclusterlodMeshCreate, nvclusterlodMeshGetRequirements, uvec3, vec3 };
