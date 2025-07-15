import { Result, Sphere, createArrayView, resizeArray } from "./nvclusterlod_common";
import { MeshCreateInfo, MeshGetRequirementsInfo, MeshOutput, ORIGINAL_MESH_GROUP, nvclusterlodMeshCreate, nvclusterlodMeshGetRequirements } from "./nvclusterlod_mesh";
import { Range } from "./nvcluster";
export class LodMesh {
    resize(sizes) {
        this.triangleVertices = resizeArray(this.triangleVertices, Math.floor(sizes.maxTriangleCount) * 3, () => 0);
        this.clusterTriangleRanges = resizeArray(this.clusterTriangleRanges, Math.floor(sizes.maxClusterCount), () => new Range());
        this.clusterGeneratingGroups = resizeArray(this.clusterGeneratingGroups, Math.floor(sizes.maxClusterCount), () => 0);
        this.clusterBoundingSpheres = resizeArray(this.clusterBoundingSpheres, Math.floor(sizes.maxClusterCount), () => new Sphere());
        this.groupQuadricErrors = resizeArray(this.groupQuadricErrors, Math.floor(sizes.maxGroupCount), () => 0);
        this.groupClusterRanges = resizeArray(this.groupClusterRanges, Math.floor(sizes.maxGroupCount), () => new Range());
        this.lodLevelGroupRanges = resizeArray(this.lodLevelGroupRanges, Math.floor(sizes.maxLodLevelCount), () => new Range());
    }
    triangleVertices = [];
    clusterTriangleRanges = [];
    clusterGeneratingGroups = [];
    clusterBoundingSpheres = [];
    groupQuadricErrors = [];
    groupClusterRanges = [];
    lodLevelGroupRanges = [];
}
;
export class LocalizedLodMesh {
    lodMesh = new LodMesh(); // contains cluster-local triangle indices
    clusterVertexRanges = [];
    vertexGlobalIndices = [];
}
export function generateLodMesh(input, lodMesh) {
    let reqInfo = new MeshGetRequirementsInfo();
    reqInfo.input = input;
    // Get conservative output sizes
    let sizes = nvclusterlodMeshGetRequirements(reqInfo);
    // Allocate storage
    lodMesh.resize(sizes);
    // Make LODs
    let lodOutput = new MeshOutput();
    lodOutput.clusterTriangleRanges = lodMesh.clusterTriangleRanges;
    lodOutput.clusterTriangles = lodMesh.triangleVertices;
    lodOutput.clusterGeneratingGroups = lodMesh.clusterGeneratingGroups;
    lodOutput.clusterBoundingSpheres = lodMesh.clusterBoundingSpheres;
    lodOutput.groupQuadricErrors = lodMesh.groupQuadricErrors;
    lodOutput.groupClusterRanges = lodMesh.groupClusterRanges;
    lodOutput.lodLevelGroupRanges = lodMesh.lodLevelGroupRanges;
    lodOutput.clusterCount = lodMesh.clusterTriangleRanges.length;
    lodOutput.groupCount = lodMesh.groupQuadricErrors.length;
    lodOutput.lodLevelCount = lodMesh.lodLevelGroupRanges.length;
    lodOutput.triangleCount = lodMesh.triangleVertices.length;
    let createInfo = new MeshCreateInfo();
    createInfo.input = input;
    let result = nvclusterlodMeshCreate(createInfo, lodOutput);
    if (result != Result.SUCCESS) {
        lodOutput = new MeshOutput();
        return result;
    }
    sizes.maxClusterCount = lodOutput.clusterCount;
    sizes.maxGroupCount = lodOutput.groupCount;
    sizes.maxLodLevelCount = lodOutput.lodLevelCount;
    sizes.maxTriangleCount = lodOutput.triangleCount;
    // Truncate to output size written
    lodMesh.resize(sizes);
    return Result.SUCCESS;
}
export function generateLocalizedLodMesh(input, localizedMesh) {
    let result = generateLodMesh(input, localizedMesh.lodMesh);
    if (result != Result.SUCCESS) {
        return result;
    }
    for (let clusterTriangleRangeIndex = 0; clusterTriangleRangeIndex < localizedMesh.lodMesh.clusterTriangleRanges.length; clusterTriangleRangeIndex++) {
        const clusterTriangleRange = localizedMesh.lodMesh.clusterTriangleRanges[clusterTriangleRangeIndex];
        // FIXME: the indices are changed from global to cluster-local in-place, this needs to be made clear in the doc
        // std::span<const uint32_t> globalTriangles(localizedMesh.lodMesh.triangleVertices.data() + 3 * clusterTriangleRange.offset, clusterTriangleRange.count * 3);
        const globalTriangles = createArrayView(localizedMesh.lodMesh.triangleVertices, 3 * clusterTriangleRange.offset, clusterTriangleRange.count * 3);
        // std::span<uint32_t> localTriangles(localizedMesh.lodMesh.triangleVertices.data() + 3 * clusterTriangleRange.offset, clusterTriangleRange.count * 3);
        const localTriangles = createArrayView(localizedMesh.lodMesh.triangleVertices, 3 * clusterTriangleRange.offset, clusterTriangleRange.count * 3);
        let currentLocalTriangleIndex = 0;
        const vertexRange = new Range(localizedMesh.vertexGlobalIndices.length, 0);
        {
            const vertexCache = new Map();
            for (let globalTriangleIndex = 0; globalTriangleIndex < globalTriangles.length / 3; globalTriangleIndex++) {
                // const inputTriangle = globalTriangles[3 * globalTriangleIndex];
                // const outputTriangle = localTriangles[3 * currentLocalTriangleIndex];
                const inputTriangle = globalTriangles.slice(3 * globalTriangleIndex);
                const outputTriangle = localTriangles.slice(3 * currentLocalTriangleIndex);
                currentLocalTriangleIndex++;
                for (let j = 0; j < 3; ++j) {
                    const globalIndex = inputTriangle[j];
                    let localIndex = vertexCache.get(globalIndex);
                    if (localIndex === undefined) {
                        localIndex = vertexCache.size;
                        vertexCache.set(globalIndex, localIndex);
                        localizedMesh.vertexGlobalIndices.push(globalIndex);
                    }
                    outputTriangle[j] = localIndex;
                    if (outputTriangle[j] >= 256) {
                        return Result.ERROR_OUTPUT_MESH_OVERFLOW;
                    }
                }
            }
            vertexRange.count = vertexCache.size;
        }
        localizedMesh.clusterVertexRanges.push(vertexRange);
    }
    return Result.SUCCESS;
}
// Utility call to build lists of generating groups (that contributed
// decimated clusters) for each group. This collapses duplicate values in
// clusterGeneratingGroups for each groupClusterRanges.
export class GroupGeneratingGroups {
    ranges = []; // ranges of groups
    groups = []; // indices of generating groups
    //   // Accessors to view this struct as an array of arrays. This avoids having the
    //   // many heap allocations that a std::vector of vectors has.
    //   std::span<const uint32_t> operator[](size_t i) const
    //   {
    //     return std::span(groups.data() + ranges[i].offset, ranges[i].count);
    //   }
    size() { return this.ranges.length; }
    get(i) {
        return createArrayView(this.groups, this.ranges[i].offset, this.ranges[i].count);
    }
}
;
export function generateGroupGeneratingGroups(groupClusterRanges, clusterGeneratingGroups, groupGeneratingGroups) {
    // groupGeneratingGroups.ranges.reserve(groupClusterRanges.size());
    // iterate over all groups and find unique set of generating groups
    // from its clusters.
    //
    // append them linearly
    let offset = 0;
    for (let groupIndex = 0; groupIndex < groupClusterRanges.length; groupIndex++) {
        const clusterRange = groupClusterRanges[groupIndex];
        if (clusterRange.count == 0) {
            return Result.ERROR_EMPTY_CLUSTER_GENERATING_GROUPS;
        }
        // std::span<const uint32_t> generatingGroups(clusterGeneratingGroups.data() + clusterRange.offset, clusterRange.count);
        const generatingGroups = createArrayView(clusterGeneratingGroups, clusterRange.offset, clusterRange.count);
        if (generatingGroups[0] == ORIGINAL_MESH_GROUP) {
            groupGeneratingGroups.ranges.push(new Range(offset, 0)); // LOD0 groups have no generating group
        }
        else {
            // std::unordered_set uniqueGeneratingGroups(generatingGroups.begin(), generatingGroups.end());
            const uniqueGeneratingGroups = new Set(generatingGroups);
            const newGroupRange = new Range(offset, uniqueGeneratingGroups.size);
            groupGeneratingGroups.ranges.push(newGroupRange);
            // groupGeneratingGroups.groups.insert(groupGeneratingGroups.groups.end(), uniqueGeneratingGroups.begin(), uniqueGeneratingGroups.end());
            for (const element of uniqueGeneratingGroups) {
                groupGeneratingGroups.groups.push(element);
            }
            offset += newGroupRange.count;
        }
    }
    return Result.SUCCESS;
}
