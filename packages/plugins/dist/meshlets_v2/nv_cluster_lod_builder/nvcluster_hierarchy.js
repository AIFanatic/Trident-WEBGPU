import { Result, Sphere, createArrayView } from "./nvclusterlod_common";
import { AABB, Input, Result as ResultNVCluster, SpatialElements, generateClusters } from "./nvcluster";
import { GroupGeneratingGroups, generateGroupGeneratingGroups } from "./nvclusterlod_mesh_storage";
import { ClusterStorage } from "./nvcluster_storage";
// Input structure for the generation of hierarchical LODs on an input defined by its LODs,
// where each LOD is defined by a range of cluster groups, each of those groups being defined
// by a range of clusters. Each cluster is characterized by its bounding sphere.
export class HierarchyInput {
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
    minQuadricErrorOverDistance = 0.001;
    // Bounding spheres include the bounding spheres of generating groups. This
    // guarantees no overlaps regardless of the error over distance threshold.
    conservativeBoundingSpheres = true;
}
;
// Interior node in the LOD DAG
export class InteriorNode {
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
;
// static_assert(sizeof(InteriorNode) == sizeof(uint32_t));
// Leaf node in the LOD DAG
export class LeafNode {
    static CLUSTER_RANGE_MAX_SIZE = 256;
    // Either InteriorNode or LeafNode can be stored in Node, isLeafNode will be 1 for LeafNode
    isLeafNode = 1; // clusterGroupNode?
    // Index of the cluster group for the node
    group = 0;
    // Number of clusters in the group, minus one as a group always contains at least one cluster
    clusterCountMinusOne = 0;
}
;
// static_assert(sizeof(LeafNode) == sizeof(uint32_t));
// LOD DAG node
export class Node {
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
    maxClusterQuadricError = 0.0;
}
;
// Output structure for the LOD hierarchy
export class HierarchyOutput {
    // LOD DAG
    nodes;
    // Bounding sphere for each cluster group, encompassing all the clusters within the group
    groupCumulativeBoundingSpheres;
    // Quadric errors obtained by accumulating the quadric errors of the clusters within the group
    groupCumulativeQuadricError;
    // Number of nodes in the DAG
    nodeCount = 0;
}
;
// Structure to request the memory requirements to build a LOD DAG on the input data
export class HierarchyGetRequirementsInfo {
    input;
}
;
// Memory requirements to build a LOD DAG
export class HierarchyRequirements {
    maxNodeCount = 0;
}
;
// Structure to request to build a LOD DAG on the input data
export class HierarchyCreateInfo {
    input;
    constructor(input) {
        this.input = input;
    }
}
;
function U32_MASK(bitCount) {
    return (1 << (bitCount)) - 1;
}
// Find the sphere within spheres that lies farthest from the start sphere, accounting for the radii of the spheres
function farthestSphere(spheres, start) {
    let result = start;
    let maxLength = 0.0;
    // FIXME: todo for parallelism
    //SphereDist sd{.u64 = 0ull};
    // FIXME: parallelize?
    //for(const nvlod::Sphere& candidate : spheres)
    for (let sphereIndex = 0; sphereIndex < spheres.length; sphereIndex++) {
        const candidate = spheres[sphereIndex];
        const centerToCandidateVector = [candidate.x - start.x, candidate.y - start.y, candidate.z - start.z];
        const centerToCandidateDistance = Math.sqrt(centerToCandidateVector[0] * centerToCandidateVector[0]
            + centerToCandidateVector[1] * centerToCandidateVector[1]
            + centerToCandidateVector[2] * centerToCandidateVector[2]);
        const length = centerToCandidateDistance + candidate.radius + start.radius;
        //std::atomic_m
        // if (std:: isinf(length) || length > maxLength)
        if (!isFinite(length) || length > maxLength) {
            maxLength = length;
            result = candidate;
        }
    }
    //NVLOD_PARALLEL_FOR_END;
    return result;
}
;
// Create a sphere that bounds all the input spheres
function makeBoundingSphere(spheres, sphere) {
    if (spheres.length === 0) {
        return Result.SUCCESS;
    }
    // Loosely based on Ritter's bounding sphere algorithm, extending to include
    // sphere radii. Not verified, but I can imagine it works.
    const x = spheres[0];
    const y = farthestSphere(spheres, x);
    const z = farthestSphere(spheres, y);
    let yz = [z.x - y.x, z.y - y.y, z.z - y.z];
    const dist = Math.sqrt(yz[0] * yz[0] + yz[1] * yz[1] + yz[2] * yz[2]);
    const invDist = 1.0 / dist;
    yz[0] *= invDist;
    yz[1] *= invDist;
    yz[2] *= invDist;
    const resultRadius = (dist + y.radius + z.radius) * 0.5;
    //   sphere             = nvclusterlod::Sphere{y.x, y.y, y.z, resultRadius};
    const retSphere = new Sphere(y.x, y.y, y.z, resultRadius);
    Object.assign(sphere, retSphere);
    // [sphere, retSphere] = [retSphere, sphere];
    // TODO: I bet normalize could cancel down somehow to avoid the
    // singularity check
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
    // sphere.radius = std:: nextafter(sphere.radius, Number.MAX_VALUE);
    // sphere.radius = std:: nextafter(sphere.radius, Number.MAX_VALUE);  // fixes a test failure. or * 1.0001?
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
// From the set of input nodes, cluster them according to their spatial location so each cluster contains at most maxClusterItems
function clusterNodesSpatially(nodes, maxClusterItems, clusters) {
    // For each node, compute its axis-aligned bounding box and centroid location
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
    // Call the clusterizer to group the nodes
    let clusterBounds = new SpatialElements();
    clusterBounds.boundingBoxes = triangleClusterAabbs;
    clusterBounds.centroids = triangleClusterCentroids;
    clusterBounds.elementCount = triangleClusterAabbs.length;
    let clusterGroupInput = new Input();
    clusterGroupInput.config.minClusterSize = maxClusterItems;
    clusterGroupInput.config.maxClusterSize = maxClusterItems;
    clusterGroupInput.spatialElements = clusterBounds;
    // clusterGroupInput.graph           = nullptr;
    const result = generateClusters(clusterGroupInput, clusters);
    return result;
}
// Compute the number of nodes required to store the LOD hierarchy for the given input
export function nvclusterlodHierarchyGetRequirements(info) {
    let result = new HierarchyRequirements();
    result.maxNodeCount = info.input.clusterCount + 1;
    return result;
}
export function nvclusterlodCreateHierarchy(info, output) {
    const input = info.input;
    // Build sets of generating groups that contributed clusters for decimation
    // into each group.
    let groupGeneratingGroups = new GroupGeneratingGroups();
    // std::span<const nvcluster::Range> groupClusterRanges(input.groupClusterRanges, input.groupCount);
    const groupClusterRanges = createArrayView(input.groupClusterRanges, 0, input.groupCount);
    // FIXME: not sure about that count
    // std::span<const uint32_t> clusterGeneratingGroups(input.clusterGeneratingGroups, input.clusterCount);
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
    // Compute cumulative bounding spheres and quadric errors. Cumulative bounding
    // spheres avoid rendering overlapping geometry with a constant angular error
    // threshold at the cost of producing significantly oversized bounding
    // spheres.
    let groupCumulativeBoundingSpheres = new Array(input.groupCount).fill(null).map(() => new Sphere());
    let groupCumulativeQuadricErrors = new Array(input.groupCount).fill(0);
    for (let lodLevel = 0; lodLevel < input.lodLevelCount; ++lodLevel) {
        const lodGroupRange = input.lodLevelGroupRanges[lodLevel];
        for (let group = lodGroupRange.offset; group < lodGroupRange.offset + lodGroupRange.count; group++) {
            if (lodLevel == 0) {
                // Find the bounding sphere for each group
                // result = makeBoundingSphere(std:: span <const nvclusterlod:: Sphere> (input.clusterBoundingSpheres + groupClusterRanges[group].offset, groupClusterRanges[group].count), groupCumulativeBoundingSpheres[group]);
                result = makeBoundingSphere(createArrayView(input.clusterBoundingSpheres, groupClusterRanges[group].offset, groupClusterRanges[group].count), groupCumulativeBoundingSpheres[group]);
                if (result != Result.SUCCESS) {
                    return result;
                }
            }
            else {
                // Higher LOD bounding spheres just include the generating group
                // spheres. The current group will always be a subset, so no point
                // generating it.
                // TODO: only compute LOD0 clusterBoundingSpheres?
                let generatingSpheres = [];
                const generatingGroupRange = groupGeneratingGroups.ranges[group];
                // generatingSpheres.reserve(generatingGroupRange.count);
                for (let indexInGeneratingGroups = generatingGroupRange.offset; indexInGeneratingGroups < generatingGroupRange.offset + generatingGroupRange.count; indexInGeneratingGroups++) {
                    const generatingGroup = groupGeneratingGroups.groups[indexInGeneratingGroups];
                    generatingSpheres.push(groupCumulativeBoundingSpheres[generatingGroup]);
                }
                result = makeBoundingSphere(generatingSpheres, groupCumulativeBoundingSpheres[group]);
                if (result != Result.SUCCESS) {
                    return result;
                }
            }
            // Compute cumulative quadric error
            let maxGeneratingGroupQuadricError = 0.0;
            const generatingGroupRange = groupGeneratingGroups.ranges[group];
            for (let indexInGeneratingGroups = generatingGroupRange.offset; indexInGeneratingGroups < generatingGroupRange.offset + generatingGroupRange.count; indexInGeneratingGroups++) {
                const generatingGroup = groupGeneratingGroups.groups[indexInGeneratingGroups];
                maxGeneratingGroupQuadricError = Math.max(maxGeneratingGroupQuadricError, groupCumulativeQuadricErrors[generatingGroup]);
            }
            groupCumulativeQuadricErrors[group] = maxGeneratingGroupQuadricError + input.groupQuadricErrors[group];
        }
    }
    // Write recursively propagated group data
    for (let i = 0; i < groupCumulativeBoundingSpheres.length; i++) {
        output.groupCumulativeBoundingSpheres[i] = groupCumulativeBoundingSpheres[i];
    }
    for (let i = 0; i < groupCumulativeQuadricErrors.length; i++) {
        output.groupCumulativeQuadricError[i] = groupCumulativeQuadricErrors[i];
    }
    // Allocate the initial root node, just so it is first
    let lodCount = input.lodLevelCount;
    if (lodCount >= InteriorNode.NODE_RANGE_MAX_SIZE) // can fit all LODs into one root node.
     {
        return Result.ERROR_LOD_OVERFLOW;
    }
    //nvlod::Node*             outNode  = output.nodes;
    let rootNode = output.nodes[0]; // *outNode++;
    let currentNodeIndex = 1;
    let lodNodes = [];
    // Write the node hierarchy
    for (let lodIndex = 0; lodIndex < lodCount; ++lodIndex) {
        // Create leaf nodes for each group of clusters.
        let nodes = [];
        // nodes.reserve(input.lodLevelGroupRanges[lodIndex].count);
        const lodGroupRange = input.lodLevelGroupRanges[lodIndex];
        for (let groupIndex = lodGroupRange.offset; groupIndex < lodGroupRange.offset + lodGroupRange.count; groupIndex++) {
            if (input.groupClusterRanges[groupIndex].count > LeafNode.CLUSTER_RANGE_MAX_SIZE) {
                return Result.ERROR_HIERARCHY_GENERATION_FAILED;
            }
            let clusterRange = new LeafNode();
            clusterRange.isLeafNode = 1;
            clusterRange.group = groupIndex & U32_MASK(23);
            clusterRange.clusterCountMinusOne = (input.groupClusterRanges[groupIndex].count - 1) & U32_MASK(8);
            if (clusterRange.clusterCountMinusOne + 1 != input.groupClusterRanges[groupIndex].count) {
                return Result.ERROR_HIERARCHY_GENERATION_FAILED;
            }
            const node = new Node();
            node.clusters = clusterRange;
            node.boundingSphere = groupCumulativeBoundingSpheres[groupIndex];
            node.maxClusterQuadricError = groupCumulativeQuadricErrors[groupIndex];
            nodes.push(node);
        }
        // Build traversal hierarchy per-LOD
        // NOTE: could explore mixing nodes from different LODs near the top of the
        // tree to improve paralellism. Ideally the result could be N root nodes
        // rather than just one too.
        while (nodes.length > 1) {
            let nodeClusters = new ClusterStorage();
            let clusterResult = clusterNodesSpatially(nodes, InteriorNode.NODE_RANGE_MAX_SIZE, nodeClusters);
            if (clusterResult != ResultNVCluster.SUCCESS) {
                return Result.ERROR_CLUSTERING_FAILED;
            }
            let newNodes = [];
            // newNodes.reserve(nodeClusters.clusterRanges.size());
            for (let rangeIndex = 0; rangeIndex < nodeClusters.clusterRanges.length; rangeIndex++) {
                const range = nodeClusters.clusterRanges[rangeIndex];
                // std:: span < uint32_t > group = std:: span<uint32_t>(nodeClusters.clusterItems).subspan(range.offset, range.count);
                // createArrayView(nodeClusters.clusterItems, 0, nodeClusters.clusterItems.length)
                const group = createArrayView(createArrayView(nodeClusters.clusterItems, 0, nodeClusters.clusterItems.length), range.offset, range.count);
                if (group.length === 0 || group.length > InteriorNode.NODE_RANGE_MAX_SIZE) {
                    return Result.ERROR_HIERARCHY_GENERATION_FAILED;
                }
                let maxClusterQuadricError = 0.0;
                let boundingSpheres = [];
                // boundingSpheres.reserve(group.size());
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
            // std::swap(nodes, newNodes);
            // Object.assign(nodes, newNodes);
            // nodes.length = newNodes.length;
            [nodes, newNodes] = [newNodes, nodes];
            // nodes.length = 0;
            // nodes.push(...newNodes);
        }
        if (nodes.length != 1) {
            return Result.ERROR_HIERARCHY_GENERATION_FAILED;
        }
        // Always traverse lowest detail LOD by making the sphere radius huge
        if (lodIndex == lodCount - 1) {
            nodes[0].boundingSphere = new Sphere(0.0, 0.0, 0.0, Number.MAX_VALUE);
        }
        // lodNodes.insert(lodNodes.end(), nodes.begin(), nodes.end());
        for (let i = 0; i < nodes.length; i++) {
            lodNodes.push(nodes[i]);
        }
    }
    // Link the per-LOD trees into a single root node
    // TODO: recursively add to support more than NodeRange::MaxChildren LOD levels
    {
        let maxClusterQuadricError = 0.0;
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
        rootNode.boundingSphere = new Sphere(0.0, 0.0, 0.0, Number.MAX_VALUE); // always include everything
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
