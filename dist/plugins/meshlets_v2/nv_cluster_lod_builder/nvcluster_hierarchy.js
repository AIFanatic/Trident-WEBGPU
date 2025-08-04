import { createArrayView, Result, Sphere } from './nvclusterlod_common.js';
import { Result as Result$1, AABB, SpatialElements, Input, generateClusters } from './nvcluster.js';
import { generateGroupGeneratingGroups, GroupGeneratingGroups } from './nvclusterlod_mesh_storage.js';
import { ClusterStorage } from './nvcluster_storage.js';

class HierarchyInput {
  // Decimation takes the mesh at a given LOD represented by a number of cluster groups,
  // and generates a (smaller) number of cluster groups for the next coarser LOD. For each
  // generated cluster clusterGeneratingGroups stores the index of the group it was generated from.
  // For the clusters at the finest LOD (LOD 0) that index is ORIGINAL_MESH_GROUP
  clusterGeneratingGroups;
  // Error metric after decimating geometry in each group
  groupQuadricErrors;
  // Ranges of clusters contained in each group so that the clusters of a group are stored at range.offset
  // and the group covers range.count clusters.
  groupClusterRanges;
  // Number of cluster groups
  groupCount = 0;
  // Bounding sphere for each cluster
  clusterBoundingSpheres;
  // Number of clusters
  clusterCount = 0;
  // Ranges of groups comprised in each LOD level, so that the groups for LOD n are stored at lodLevelGroupRanges[n].offset and the LOD
  // uses lodLevelGroupRanges[n].count groups. The finest LOD is at index 0, followed by the coarser LODs from finer to coarser
  lodLevelGroupRanges;
  // Number of LODs in the mesh
  lodLevelCount = 0;
  // Enforce a minimum LOD rate of change. This is the maximum sine of the error
  // angle threshold that will be used to compute LOD for a given camera
  // position. See Output::maxQuadricErrorOverDistance and
  // pixelErrorToQuadricErrorOverDistance(). Increase this if LOD levels
  // overlap.
  minQuadricErrorOverDistance = 1e-3;
  // Bounding spheres include the bounding spheres of generating groups. This
  // guarantees no overlaps regardless of the error over distance threshold.
  conservativeBoundingSpheres = true;
}
class InteriorNode {
  // Maximum number of children for the node
  static NODE_RANGE_MAX_SIZE = 32;
  // Either InteriorNode or LeafNode can be stored in Node, isLeafNode will be 0 for InteriorNode
  isLeafNode = 0;
  // Offset in FIXME where the children of the node can be found
  childOffset = 0;
  // Number of children for the node, minus one as the children list of an interior node contains at least a leaf node
  // representing its geometry at its corresponding LOD
  childCountMinusOne = 0;
}
class LeafNode {
  static CLUSTER_RANGE_MAX_SIZE = 256;
  // Either InteriorNode or LeafNode can be stored in Node, isLeafNode will be 1 for LeafNode
  isLeafNode = 1;
  // clusterGroupNode?
  // Index of the cluster group for the node
  group = 0;
  // Number of clusters in the group, minus one as a group always contains at least one cluster
  clusterCountMinusOne = 0;
}
class Node {
  // Node definition, either interior or leaf node
  //   union
  //   {
  //     InteriorNode children;
  //     LeafNode     clusters;
  //   };
  children;
  clusters;
  // Bounding sphere for the node
  boundingSphere = new Sphere();
  // Maximum error due to the mesh decimation at the LOD of the node
  maxClusterQuadricError = 0;
}
class HierarchyOutput {
  // LOD DAG
  nodes;
  // Bounding sphere for each cluster group, encompassing all the clusters within the group
  groupCumulativeBoundingSpheres;
  // Quadric errors obtained by accumulating the quadric errors of the clusters within the group
  groupCumulativeQuadricError;
  // Number of nodes in the DAG
  nodeCount = 0;
}
class HierarchyGetRequirementsInfo {
  input;
}
class HierarchyRequirements {
  maxNodeCount = 0;
}
class HierarchyCreateInfo {
  input;
  constructor(input) {
    this.input = input;
  }
}
function U32_MASK(bitCount) {
  return (1 << bitCount) - 1;
}
function farthestSphere(spheres, start) {
  let result = start;
  let maxLength = 0;
  for (let sphereIndex = 0; sphereIndex < spheres.length; sphereIndex++) {
    const candidate = spheres[sphereIndex];
    const centerToCandidateVector = [candidate.x - start.x, candidate.y - start.y, candidate.z - start.z];
    const centerToCandidateDistance = Math.sqrt(centerToCandidateVector[0] * centerToCandidateVector[0] + centerToCandidateVector[1] * centerToCandidateVector[1] + centerToCandidateVector[2] * centerToCandidateVector[2]);
    const length = centerToCandidateDistance + candidate.radius + start.radius;
    if (!isFinite(length) || length > maxLength) {
      maxLength = length;
      result = candidate;
    }
  }
  return result;
}
function makeBoundingSphere(spheres, sphere) {
  if (spheres.length === 0) {
    return Result.SUCCESS;
  }
  const x = spheres[0];
  const y = farthestSphere(spheres, x);
  const z = farthestSphere(spheres, y);
  let yz = [z.x - y.x, z.y - y.y, z.z - y.z];
  const dist = Math.sqrt(yz[0] * yz[0] + yz[1] * yz[1] + yz[2] * yz[2]);
  const invDist = 1 / dist;
  yz[0] *= invDist;
  yz[1] *= invDist;
  yz[2] *= invDist;
  const resultRadius = (dist + y.radius + z.radius) * 0.5;
  const retSphere = new Sphere(y.x, y.y, y.z, resultRadius);
  Object.assign(sphere, retSphere);
  if (dist > 1e-10) {
    const radiusDifference = resultRadius - y.radius;
    sphere.x += yz[0] * radiusDifference;
    sphere.y += yz[1] * radiusDifference;
    sphere.z += yz[2] * radiusDifference;
  }
  const f = farthestSphere(spheres, sphere);
  const sphereToFarthestVector = [f.x - sphere.x, f.y - sphere.y, f.z - sphere.z];
  const sphereToFarthestDistance = Math.sqrt(sphereToFarthestVector[0] * sphereToFarthestVector[0] + sphereToFarthestVector[1] * sphereToFarthestVector[1] + sphereToFarthestVector[2] * sphereToFarthestVector[2]);
  sphere.radius = sphereToFarthestDistance + f.radius;
  sphere.radius = sphere.radius + Number.EPSILON;
  sphere.radius = sphere.radius + Number.EPSILON;
  if (isNaN(sphere.x) || isNaN(sphere.y) || isNaN(sphere.z) || isNaN(sphere.radius)) {
    return Result.ERROR_INCONSISTENT_BOUNDING_SPHERES;
  }
  for (let childIndex = 0; childIndex < spheres.length; childIndex++) {
    const child = spheres[childIndex];
    if (child.radius > sphere.radius) {
      return Result.ERROR_INCONSISTENT_BOUNDING_SPHERES;
    }
  }
  return Result.SUCCESS;
}
function clusterNodesSpatially(nodes, maxClusterItems, clusters) {
  let triangleClusterAabbs = new Array(nodes.length).fill(null).map(() => new AABB());
  let triangleClusterCentroids = new Array(nodes.length * 3).fill(0);
  for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
    const node = nodes[nodeIndex];
    const center = [node.boundingSphere.x, node.boundingSphere.y, node.boundingSphere.z];
    const aabb = triangleClusterAabbs[nodeIndex];
    for (let i = 0; i < 3; i++) {
      aabb.bboxMin[i] = center[i] - node.boundingSphere.radius;
      aabb.bboxMax[i] = center[i] + node.boundingSphere.radius;
    }
    for (let i = 0; i < 3; i++) {
      triangleClusterCentroids[3 * nodeIndex + i] = (aabb.bboxMin[i] + aabb.bboxMax[i]) * 0.5;
    }
  }
  let clusterBounds = new SpatialElements();
  clusterBounds.boundingBoxes = triangleClusterAabbs;
  clusterBounds.centroids = triangleClusterCentroids;
  clusterBounds.elementCount = triangleClusterAabbs.length;
  let clusterGroupInput = new Input();
  clusterGroupInput.config.minClusterSize = maxClusterItems;
  clusterGroupInput.config.maxClusterSize = maxClusterItems;
  clusterGroupInput.spatialElements = clusterBounds;
  const result = generateClusters(clusterGroupInput, clusters);
  return result;
}
function nvclusterlodHierarchyGetRequirements(info) {
  let result = new HierarchyRequirements();
  result.maxNodeCount = info.input.clusterCount + 1;
  return result;
}
function nvclusterlodCreateHierarchy(info, output) {
  const input = info.input;
  let groupGeneratingGroups = new GroupGeneratingGroups();
  const groupClusterRanges = createArrayView(input.groupClusterRanges, 0, input.groupCount);
  const clusterGeneratingGroups = createArrayView(input.clusterGeneratingGroups, 0, input.clusterCount);
  let result = generateGroupGeneratingGroups(groupClusterRanges, clusterGeneratingGroups, groupGeneratingGroups);
  if (result != Result.SUCCESS) {
    return result;
  }
  if (groupGeneratingGroups.ranges.length != input.groupCount) {
    return Result.ERROR_INCONSISTENT_GENERATING_GROUPS;
  }
  if (groupGeneratingGroups.ranges[0].offset != 0) {
    return Result.ERROR_INCONSISTENT_GENERATING_GROUPS;
  }
  let groupCumulativeBoundingSpheres = new Array(input.groupCount).fill(null).map(() => new Sphere());
  let groupCumulativeQuadricErrors = new Array(input.groupCount).fill(0);
  for (let lodLevel = 0; lodLevel < input.lodLevelCount; ++lodLevel) {
    const lodGroupRange = input.lodLevelGroupRanges[lodLevel];
    for (let group = lodGroupRange.offset; group < lodGroupRange.offset + lodGroupRange.count; group++) {
      if (lodLevel == 0) {
        result = makeBoundingSphere(createArrayView(input.clusterBoundingSpheres, groupClusterRanges[group].offset, groupClusterRanges[group].count), groupCumulativeBoundingSpheres[group]);
        if (result != Result.SUCCESS) {
          return result;
        }
      } else {
        let generatingSpheres = [];
        const generatingGroupRange2 = groupGeneratingGroups.ranges[group];
        for (let indexInGeneratingGroups = generatingGroupRange2.offset; indexInGeneratingGroups < generatingGroupRange2.offset + generatingGroupRange2.count; indexInGeneratingGroups++) {
          const generatingGroup = groupGeneratingGroups.groups[indexInGeneratingGroups];
          generatingSpheres.push(groupCumulativeBoundingSpheres[generatingGroup]);
        }
        result = makeBoundingSphere(generatingSpheres, groupCumulativeBoundingSpheres[group]);
        if (result != Result.SUCCESS) {
          return result;
        }
      }
      let maxGeneratingGroupQuadricError = 0;
      const generatingGroupRange = groupGeneratingGroups.ranges[group];
      for (let indexInGeneratingGroups = generatingGroupRange.offset; indexInGeneratingGroups < generatingGroupRange.offset + generatingGroupRange.count; indexInGeneratingGroups++) {
        const generatingGroup = groupGeneratingGroups.groups[indexInGeneratingGroups];
        maxGeneratingGroupQuadricError = Math.max(maxGeneratingGroupQuadricError, groupCumulativeQuadricErrors[generatingGroup]);
      }
      groupCumulativeQuadricErrors[group] = maxGeneratingGroupQuadricError + input.groupQuadricErrors[group];
    }
  }
  for (let i = 0; i < groupCumulativeBoundingSpheres.length; i++) {
    output.groupCumulativeBoundingSpheres[i] = groupCumulativeBoundingSpheres[i];
  }
  for (let i = 0; i < groupCumulativeQuadricErrors.length; i++) {
    output.groupCumulativeQuadricError[i] = groupCumulativeQuadricErrors[i];
  }
  let lodCount = input.lodLevelCount;
  if (lodCount >= InteriorNode.NODE_RANGE_MAX_SIZE) {
    return Result.ERROR_LOD_OVERFLOW;
  }
  let rootNode = output.nodes[0];
  let currentNodeIndex = 1;
  let lodNodes = [];
  for (let lodIndex = 0; lodIndex < lodCount; ++lodIndex) {
    let nodes = [];
    const lodGroupRange = input.lodLevelGroupRanges[lodIndex];
    for (let groupIndex = lodGroupRange.offset; groupIndex < lodGroupRange.offset + lodGroupRange.count; groupIndex++) {
      if (input.groupClusterRanges[groupIndex].count > LeafNode.CLUSTER_RANGE_MAX_SIZE) {
        return Result.ERROR_HIERARCHY_GENERATION_FAILED;
      }
      let clusterRange = new LeafNode();
      clusterRange.isLeafNode = 1;
      clusterRange.group = groupIndex & U32_MASK(23);
      clusterRange.clusterCountMinusOne = input.groupClusterRanges[groupIndex].count - 1 & U32_MASK(8);
      if (clusterRange.clusterCountMinusOne + 1 != input.groupClusterRanges[groupIndex].count) {
        return Result.ERROR_HIERARCHY_GENERATION_FAILED;
      }
      const node = new Node();
      node.clusters = clusterRange;
      node.boundingSphere = groupCumulativeBoundingSpheres[groupIndex];
      node.maxClusterQuadricError = groupCumulativeQuadricErrors[groupIndex];
      nodes.push(node);
    }
    while (nodes.length > 1) {
      let nodeClusters = new ClusterStorage();
      let clusterResult = clusterNodesSpatially(nodes, InteriorNode.NODE_RANGE_MAX_SIZE, nodeClusters);
      if (clusterResult != Result$1.SUCCESS) {
        return Result.ERROR_CLUSTERING_FAILED;
      }
      let newNodes = [];
      for (let rangeIndex = 0; rangeIndex < nodeClusters.clusterRanges.length; rangeIndex++) {
        const range = nodeClusters.clusterRanges[rangeIndex];
        const group = createArrayView(createArrayView(nodeClusters.clusterItems, 0, nodeClusters.clusterItems.length), range.offset, range.count);
        if (group.length === 0 || group.length > InteriorNode.NODE_RANGE_MAX_SIZE) {
          return Result.ERROR_HIERARCHY_GENERATION_FAILED;
        }
        let maxClusterQuadricError = 0;
        let boundingSpheres = [];
        for (const nodeIndex of group) {
          boundingSpheres.push(nodes[nodeIndex].boundingSphere);
          maxClusterQuadricError = Math.max(maxClusterQuadricError, nodes[nodeIndex].maxClusterQuadricError);
        }
        let nodeRange = new InteriorNode();
        nodeRange.isLeafNode = 0;
        nodeRange.childOffset = currentNodeIndex & U32_MASK(26);
        nodeRange.childCountMinusOne = group.length - 1 & U32_MASK(5);
        let boundingSphere = new Sphere();
        result = makeBoundingSphere(boundingSpheres, boundingSphere);
        if (result != Result.SUCCESS) {
          return result;
        }
        const node = new Node();
        node.children = nodeRange;
        node.boundingSphere = boundingSphere;
        node.maxClusterQuadricError = maxClusterQuadricError;
        newNodes.push(node);
        for (const nodeIndex of group) {
          output.nodes[currentNodeIndex] = nodes[nodeIndex];
          currentNodeIndex++;
        }
      }
      [nodes, newNodes] = [newNodes, nodes];
    }
    if (nodes.length != 1) {
      return Result.ERROR_HIERARCHY_GENERATION_FAILED;
    }
    if (lodIndex == lodCount - 1) {
      nodes[0].boundingSphere = new Sphere(0, 0, 0, Number.MAX_VALUE);
    }
    for (let i = 0; i < nodes.length; i++) {
      lodNodes.push(nodes[i]);
    }
  }
  {
    let maxClusterQuadricError = 0;
    for (const node of lodNodes)
      maxClusterQuadricError = Math.max(maxClusterQuadricError, node.maxClusterQuadricError);
    let nodeRange = new InteriorNode();
    nodeRange.isLeafNode = 0;
    nodeRange.childOffset = currentNodeIndex & U32_MASK(26);
    nodeRange.childCountMinusOne = lodNodes.length - 1 & U32_MASK(5);
    if (nodeRange.childCountMinusOne + 1 != lodNodes.length) {
      return Result.ERROR_NODE_OVERFLOW;
    }
    rootNode = new Node();
    rootNode.children = nodeRange;
    rootNode.boundingSphere = new Sphere(0, 0, 0, Number.MAX_VALUE);
    rootNode.maxClusterQuadricError = maxClusterQuadricError;
    output.nodes[0] = rootNode;
    for (let nodeIndex = 0; nodeIndex < lodNodes.length; nodeIndex++) {
      const node = lodNodes[nodeIndex];
      if (currentNodeIndex >= output.nodeCount) {
        return Result.ERROR_HIERARCHY_GENERATION_FAILED;
      }
      output.nodes[currentNodeIndex] = node;
      currentNodeIndex++;
    }
  }
  output.nodeCount = currentNodeIndex;
  return Result.SUCCESS;
}

export { HierarchyCreateInfo, HierarchyGetRequirementsInfo, HierarchyInput, HierarchyOutput, HierarchyRequirements, InteriorNode, LeafNode, Node, nvclusterlodCreateHierarchy, nvclusterlodHierarchyGetRequirements };
