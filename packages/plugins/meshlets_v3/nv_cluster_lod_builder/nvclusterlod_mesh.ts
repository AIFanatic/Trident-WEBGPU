import { Meshoptimizer, meshopt_SimplifyErrorAbsolute, meshopt_SimplifySparse } from "./meshoptimizer/Meshoptimizer";
import { AABB, Config, Input, Range, SpatialElements, Result as ResultNVCluster, Graph, generateClusters } from "./nvcluster";
import { ClusterStorage, SegmentedClusterStorage, generateSegmentedClusters } from "./nvcluster_storage";
import { Result, Sphere, assert, createArrayView, number_to_uvec3, resizeArray, vec3_to_number } from "./nvclusterlod_common";

export const ORIGINAL_MESH_GROUP = 0xFFFFFFFF;
const NVLOD_MINIMAL_ADJACENCY_SIZE = 5;
const NVLOD_LOCKED_VERTEX_WEIGHT_MULTIPLIER = 10;
const NVLOD_VERTEX_WEIGHT_MULTIPLIER = 10.0;

export class MeshRequirements {
    // Maximum total number of triangles across LODs
    public maxTriangleCount: number = 0;
    // Maximum total number of clusters across LODs
    public maxClusterCount: number = 0;
    // Maximum total number of cluster groups across LODs
    public maxGroupCount: number = 0;
    // Maximum number of LODs in the mesh
    public maxLodLevelCount: number = 0;
};

// High density mesh and clustering parameters used to generate the LODs for the mesh
export class MeshInput {
    // Pointer to triangle definitions, 3 indices per triangle
    public indices: Uint32Array;
    // Number of indices in the mesh
    public indexCount: number = 0;

    // Vertex data for the mesh, 3 floats per entry
    public vertices: Float32Array;
    // Offset in vertices where the vertex data for the mesh starts, in float
    public vertexOffset: number = 0;
    // Number of vertices in the mesh
    public vertexCount: number = 0;
    // Stride in bytes between the beginning of two successive vertices (e.g. 12 bytes for densely packed positions)
    public vertexStride: number = 0;

    // Configuration for the generation of triangle clusters
    public clusterConfig: Config = {
        minClusterSize: 96,
        maxClusterSize: 128,
        costUnderfill: 0.9,
        costOverlap: 0.5,
        preSplitThreshold: 1 << 17,
    };

    // Configuration for the generation of cluster groups
    // Each LOD is comprised of a number of cluster groups
    public groupConfig: Config = {
        minClusterSize: 24,
        maxClusterSize: 32,
        costUnderfill: 0.5,
        costOverlap: 0.0,
        preSplitThreshold: 0,
    };

    // Decimation factor applied between successive LODs
    public decimationFactor: number = 0.0;
}

export class MeshOutput {
    // Triangle clusters. Each Range represents one cluster covering range.count triangles in clusterTriangles, starting at range.offset
    public clusterTriangleRanges: Range[];

    // Triangle data for the clusters, referenced by clusterTriangleRanges
    public clusterTriangles: number[];

    // Decimation takes the mesh at a given LOD represented by a number of cluster groups,
    // and generates a (smaller) number of cluster groups for the next coarser LOD. For each
    // generated cluster clusterGeneratingGroups stores the index of the group it was generated from.
    // For the clusters at the finest LOD (LOD 0) that index is ORIGINAL_MESH_GROUP
    public clusterGeneratingGroups: number[];

    // Bounding spheres of the clusters, may be nullptr
    public clusterBoundingSpheres: Sphere[];

    // Error metric after decimating geometry in each group. Counter-intuitively,
    // not the error of the geometry in the group - that value does not exist
    // per-group but would be the group quadric error of the cluster's generating
    // group. This saves duplicating errors per cluster. The final LOD is just one
    // group, is not decimated, and has an error of zero.
    // TODO: shouldn't this be infinite error so it's always drawn?
    public groupQuadricErrors: number[];

    // Ranges of clusters contained in each group so that the clusters of a group are stored at range.offset in clusterTriangleRanges
    // and the group covers range.count clusters.
    public groupClusterRanges: Range[];

    // Ranges of groups comprised in each LOD level, so that the groups for LOD n are stored at lodLevelGroupRanges[n].offset and the LOD
    // uses lodLevelGroupRanges[n].count groups. The finest LOD is at index 0, followed by the coarser LODs from finer to coarser
    public lodLevelGroupRanges: Range[];

    // Number of triangles in the mesh across LODs
    public triangleCount: number = 0;
    // Number of clusters in the mesh across LODs
    public clusterCount: number = 0;
    // Number of cluster groups in the mesh across LODs
    public groupCount: number = 0;
    // Number of LODs in the mesh
    public lodLevelCount: number = 0;
};

export class MeshGetRequirementsInfo {
    // Definition of the input geometry and clustering configuration
    public input: MeshInput;
};

export class MeshCreateInfo {
    // Definition of the input geometry and clustering configuration
    public input: MeshInput;
};

// Clustered triangles for all groups, hence SegmentedClustering. Each segment
// is a group from the previous LOD iteration. Within each segment triangles are
// re-clustered.
export class TriangleClusters {
    public clustering: SegmentedClusterStorage = new SegmentedClusterStorage();

    // Bounding boxes for each cluster
    public clusterAabbs: AABB[] = [];

    // Triangles are clustered from ranges of input geometry. The initial
    // clustering has one range - the whole mesh. Subsequent ranges come from
    // decimated cluster groups of the previous level. The generating group is
    // implicitly generatingGroupOffset plus the segment index.
    public generatingGroupOffset: number;

    public maxClusterItems: number;
};

export class uvec3 {
    public x = 0;
    public y = 0;
    public z = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
};

// Dodgy but cant be fucked fixing for now
Object.defineProperties(uvec3.prototype, {
    '0': {
        get() { return this.x; },
        set(value) { this.x = value; }
    },
    '1': {
        get() { return this.y; },
        set(value) { this.y = value; }
    },
    '2': {
        get() { return this.z; },
        set(value) { this.z = value; }
    }
});

export class vec3 {
    public x = 0;
    public y = 0;
    public z = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
};

// Dodgy but cant be fucked fixing for now
Object.defineProperties(vec3.prototype, {
    '0': {
        get() { return this.x; },
        set(value) { this.x = value; }
    },
    '1': {
        get() { return this.y; },
        set(value) { this.y = value; }
    },
    '2': {
        get() { return this.z; },
        set(value) { this.z = value; }
    }
});

export class vec4 {
    public x = 0;
    public y = 0;
    public z = 0;
    public w = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
};

// Dodgy but cant be fucked fixing for now
Object.defineProperties(vec4.prototype, {
    '0': {
        get() { return this.x; },
        set(value) { this.x = value; }
    },
    '1': {
        get() { return this.y; },
        set(value) { this.y = value; }
    },
    '2': {
        get() { return this.z; },
        set(value) { this.z = value; }
    },
    '3': {
        get() { return this.w; },
        set(value) { this.w = value; }
    }
});


// Shared vertex counts between triangle clusters. This is used to compute
// adjacency weights for grouping triangle clusters. Connections are symmetric,
// and the data is duplicated (i.e. clusterAdjacencyConnections[0][1] will have
// the same counts as clusterAdjacencyConnections[1][0]).
class AdjacencyVertexCount {
    public vertexCount: number = 0;
    public lockedCount: number = 0;
};

type ClusterAdjacency = Array<Map<number, AdjacencyVertexCount>>;

function getTriangle(mesh: MeshInput, index: number): Uint32Array {
    // return mesh.indices + index * 3;
    const startIndex = index * 3;
    return mesh.indices.subarray(startIndex, startIndex + 3);
}

function getVertex(mesh: MeshInput, index: number): Float32Array {
    //   return mesh.vertices + index * (mesh.vertexStride / sizeof(float));
    const floatStride = mesh.vertexStride; // Since sizeof(float) == 4 bytes
    const startIndex = index * floatStride;

    return mesh.vertices.subarray(startIndex, startIndex + floatStride);
}

function centroidAABB(aabb: AABB): vec3 {
    let res: vec3 = new vec3();
    res.x = (aabb.bboxMax[0] + aabb.bboxMin[0]) / 2.0;
    res.y = (aabb.bboxMax[1] + aabb.bboxMin[1]) / 2.0;
    res.z = (aabb.bboxMax[2] + aabb.bboxMin[2]) / 2.0;
    return res;
}

function emptyAABB(): AABB {
    let res: AABB = new AABB();
    res.bboxMin[0] = Number.MAX_VALUE;
    res.bboxMin[1] = Number.MAX_VALUE;
    res.bboxMin[2] = Number.MAX_VALUE;
    res.bboxMax[0] = -Number.MAX_VALUE;
    res.bboxMax[1] = -Number.MAX_VALUE;
    res.bboxMax[2] = -Number.MAX_VALUE;
    return res;
}

function addAABB(aabb: AABB, added: AABB) {
    for (let i = 0; i < 3; i++) {
        aabb.bboxMin[i] = Math.min(aabb.bboxMin[i], added.bboxMin[i]);
        aabb.bboxMax[i] = Math.max(aabb.bboxMax[i], added.bboxMax[i]);
    }
}

export class DecimatedClusterGroups {
    // Ranges of triangles. Initially there is just one range containing the input
    // mesh. In subsequent iterations each ranges is a group of decimated
    // triangles. Clusters of triangles are formed within each range.
    public groupTriangleRanges: Range[] = [];

    // Triangle indices and vertices. Triangles are grouped by
    // groupTriangleRanges. Vertices always point to the input mesh vertices.
    public mesh: MeshInput = new MeshInput();

    // Storage for decimated triangles from the previous pass. Note that triangles
    // are written to the output in clusters, which are formed from these at the
    // start of each iteration.
    public decimatedTriangleStorage: uvec3[] = [];

    // Per-group quadric errors from decimation
    public groupQuadricErrors: number[] = [];

    // Added to the groupTriangleRanges index for a global group index. This is
    // needed to write clusterGeneratingGroups.
    public baseClusterGroupIndex: number = 0;

    // Boolean list of locked vertices from the previous pass. Used to encourage
    // connecting clusters with shared locked vertices by increasing adjacency
    // weights.
    public globalLockedVertices: number[] = [];
};

export class OutputWritePositions {
    public clusterTriangleRange: number = 0;
    public clusterTriangleVertex: number = 0;
    public clusterParentGroup: number = 0;
    public clusterBoundingSphere: number = 0;
    public groupQuadricError: number = 0;
    public groupCluster: number = 0;
    public lodLevelGroup: number = 0;
};

export function divCeil(a: number, b: number): number {
    return Math.floor((a + b - 1) / b);
}

export function nvclusterlodMeshGetRequirements(info: MeshGetRequirementsInfo): MeshRequirements {
    const triangleCount = info.input.indexCount / 3;
    assert(triangleCount != 0);
    const lod0ClusterCount = divCeil(triangleCount, info.input.clusterConfig.maxClusterSize) + 1;
    const idealLevelCount = Math.ceil(-Math.log(lod0ClusterCount) / Math.log(info.input.decimationFactor));
    const idealClusterCount = lod0ClusterCount * idealLevelCount;
    const idealClusterGroupCount = divCeil(idealClusterCount, info.input.groupConfig.maxClusterSize);

    let result: MeshRequirements = new MeshRequirements();
    result.maxTriangleCount = idealClusterCount * info.input.clusterConfig.maxClusterSize;
    result.maxClusterCount = idealClusterCount;
    result.maxGroupCount = idealClusterGroupCount * 4;  // DANGER: group min-cluster-count is less than the max
    result.maxLodLevelCount = idealLevelCount * 2 + 1;     // "* 2 + 1" - why is this needed

    return result;
}

// template <typename InputIt, typename OutputIt, typename T, typename BinaryOperation>
// static void exclusive_scan_impl(InputIt first, InputIt last, OutputIt d_first, T init, BinaryOperation op)
// {
//   T sum = init;
//   while(first != last)
//   {
//     *d_first++ = sum;
//     sum        = op(sum, *first++);
//   }
// }

export function exclusive_scan_impl<T>(input: Iterable<T>, init: T, op: (acc: T, cur: T) => T): T[] {
    let sum = init;
    const output: T[] = [];

    for (const value of input) {
        output.push(sum);
        sum = op(sum, value);
    }

    return output;
}

// Returns a vector of per-vertex boolean uint8_t values indicating which
// vertices are shared between clusters. Must be uint8_t because that's what
// meshoptimizer takes.
function computeLockedVertices(inputMesh: MeshInput, triangleClusters: TriangleClusters, clusterGrouping: ClusterGroups): number[] {
    const VERTEX_NOT_SEEN = 0xffffffff;
    const VERTEX_ADDED = 0xfffffffe;
    let lockedVertices: number[] = new Array(inputMesh.vertexCount).fill(0);
    let vertexClusterGroups: number[] = new Array(inputMesh.vertexCount).fill(VERTEX_NOT_SEEN);
    for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGrouping.groups.clusterRanges.length; ++clusterGroupIndex) {
        const range: Range = clusterGrouping.groups.clusterRanges[clusterGroupIndex];
        // std::span<const uint32_t> clusterGroup = std::span<const uint32_t>(clusterGrouping.groups.clusterItems.data() + range.offset, range.count);
        const clusterGroup = createArrayView(clusterGrouping.groups.clusterItems, range.offset, range.count);
        for (const clusterIndex of clusterGroup) {
            const clusterRange: Range = triangleClusters.clustering.clusterRanges[clusterIndex];
            // std::span<const uint32_t> cluster = std::span<const uint32_t>(triangleClusters.clustering.clusterItems.data() + clusterRange.offset, clusterRange.count);
            const cluster = createArrayView(triangleClusters.clustering.clusterItems, clusterRange.offset, clusterRange.count);
            for (const triangleIndex of cluster) {
                const tri = getTriangle(inputMesh, triangleIndex);
                for (let i = 0; i < 3; ++i) {
                    const vertexIndex = tri[i];
                    let vertexClusterGroup = vertexClusterGroups[vertexIndex]; // pointer to number

                    // Initially each vertex is not part of any cluster group. Those are
                    // marked with the ID of the first group seen.
                    if (vertexClusterGroup == VERTEX_NOT_SEEN) {
                        // vertexClusterGroup = clusterGroupIndex;
                        vertexClusterGroups[vertexIndex] = clusterGroupIndex;
                    }
                    else if (vertexClusterGroup != VERTEX_ADDED && vertexClusterGroup != clusterGroupIndex) {
                        // Vertex has been seen before and in another cluster group, so it
                        // must be shared. VertexAdded is not necessary, but indicates how a
                        // unique list of locked vertices might be populated.
                        lockedVertices[vertexIndex] = 1;
                        // vertexClusterGroup          = VERTEX_ADDED;
                        vertexClusterGroups[vertexIndex] = VERTEX_ADDED;
                    }
                }
            }
        }
    }
    return lockedVertices;
}

// Returns groups of triangle after decimating groups of clusters. These
// triangles will be regrouped into new clusters within their current group.
function decimateClusterGroups(current: DecimatedClusterGroups, triangleClusters: TriangleClusters, clusterGrouping: ClusterGroups, lodLevelDecimationFactor: number): Result {
    const inputMesh: MeshInput = current.mesh;
    let result: DecimatedClusterGroups = new DecimatedClusterGroups();
    // Compute vertices shared between cluster groups. These will be locked during
    // decimation.
    result.globalLockedVertices = computeLockedVertices(inputMesh, triangleClusters, clusterGrouping);
    //FIXME: rethink how DecimatedClusterGroups and InputMesh interact. There must be a way to update the ref to DecimatedClusterGroup
    //bool useOriginalIndices = result.decimatedTriangleStorage.empty();

    result.decimatedTriangleStorage = resizeArray(result.decimatedTriangleStorage, clusterGrouping.totalTriangleCount, () => new uvec3()); // space for worst case
    //if (!useOriginalIndices)
    {
        result.mesh.indices = new Uint32Array(vec3_to_number(result.decimatedTriangleStorage));
    }
    
    result.groupTriangleRanges = resizeArray(result.groupTriangleRanges, clusterGrouping.groups.clusterRanges.length, () => new Range());
    result.groupQuadricErrors = resizeArray(result.groupQuadricErrors, clusterGrouping.groups.clusterRanges.length, () => 0);
    result.baseClusterGroupIndex = clusterGrouping.globalGroupOffset;
    let decimatedTriangleAlloc = 0;
    let success: Result = Result.SUCCESS;

    for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGrouping.groups.clusterRanges.length; clusterGroupIndex++) {
        // The cluster group is formed by non-contiguous clusters but the decimator
        // expects contiguous triangle vertex indices. We could reorder triangles by
        // their cluster group, but that would mean reordering the original geometry
        // too. Instead, cluster triangles are flattened into a contiguous vector.

        if (success != Result.SUCCESS) {
            break;
        }

        const clusterGroupRange: Range = clusterGrouping.groups.clusterRanges[clusterGroupIndex];
        let clusterGroupTriangleVertices: uvec3[] = []
        // clusterGroupTriangleVertices.reserve(clusterGroupRange.count * triangleClusters.maxClusterItems);
        for (let indexInRange = clusterGroupRange.offset; indexInRange < clusterGroupRange.offset + clusterGroupRange.count; indexInRange++) {
            const clusterIndex = clusterGrouping.groups.clusterItems[indexInRange];
            const clusterRange: Range = triangleClusters.clustering.clusterRanges[clusterIndex];
            for (let index = clusterRange.offset; index < clusterRange.offset + clusterRange.count; index++) {
                const triangleIndex = triangleClusters.clustering.clusterItems[index];

                const triPtr = getTriangle(inputMesh, triangleIndex);
                clusterGroupTriangleVertices.push(new uvec3(triPtr[0], triPtr[1], triPtr[2]));
            }
        }

        // Decimate the cluster group
        let decimatedTriangleVertices: uvec3[] = new Array(clusterGroupTriangleVertices.length).fill(null).map(() => new uvec3());
        const targetError = 340282346638528859811704183484516925440.000000;
        let absoluteError = 0.0;
        const options = meshopt_SimplifySparse | meshopt_SimplifyErrorAbsolute;  // no meshopt_SimplifyLockBorder as we only care about vertices shared between cluster groups
        const desiredTriangleCount = Math.floor(clusterGroupTriangleVertices.length * lodLevelDecimationFactor);
        const ret = Meshoptimizer.meshopt_simplifyWithAttributes(
            decimatedTriangleVertices.length * 3,
            new Uint32Array(vec3_to_number(clusterGroupTriangleVertices)),
            clusterGroupTriangleVertices.length * 3,
            inputMesh.vertices, // getVertex(inputMesh, 0),
            inputMesh.vertexCount,
            inputMesh.vertexStride,
            null,
            0,
            null,
            0,
            new Uint8Array(result.globalLockedVertices),
            desiredTriangleCount * 3,
            targetError,
            options,
        );

        let simplifiedTriangleCount = ret.ret / 3;
        decimatedTriangleVertices = number_to_uvec3(ret.destination);
        absoluteError = ret.out_result_error;

        // const vclusterGroupTriangleVertices_crc = crc32V2Float(new Float32Array(new Uint32Array(vec3_to_number(clusterGroupTriangleVertices))));
        // console.log("clusterGroupTriangleVertices_crc: ", vclusterGroupTriangleVertices_crc, checksum(vec3_to_number(clusterGroupTriangleVertices)));

        // const inputMeshVertices_crc = crc32V2Float(inputMesh.vertices);
        // console.log("inputMeshVertices_crc: ", inputMeshVertices_crc, checksum(inputMesh.vertices));

        // const globalLockedVertices_crc = crc32V2Float(new Float32Array(new Uint32Array(result.globalLockedVertices)));
        // console.log("globalLockedVertices_crc: ", globalLockedVertices_crc, checksum(result.globalLockedVertices));

        // const destination_crc = crc32V2Float(new Float32Array(ret.destination));
        // console.log("decimatedTriangleVertices: ", destination_crc, checksum(ret.destination));
        
        // console.log("indexCount: ", clusterGroupTriangleVertices.length * 3);
        // console.log("vertex_count: ", inputMesh.vertexCount);
        // console.log("vertex_positions_stride: ", inputMesh.vertexStride);
        // console.log("target_index_count: ", desiredTriangleCount * 3);
        // console.log("target_error: ", targetError);
        // console.log("options: ", options);
        // console.log("absoluteError: ", absoluteError);
        
        // // console.log("simplifiedTriangleCount", simplifiedTriangleCount);
        // // console.log("decimatedTriangleVertices", decimatedTriangleVertices);
        // // console.log("absoluteError", absoluteError);

        // console.log(`desiredTriangleCount: ${desiredTriangleCount}, simplifiedTriangleCount: ${simplifiedTriangleCount}`);


        // for (let i = 0; i < result.globalLockedVertices.length; i++) {
        //     // console.log(`globalLockedVertices[${i}] [ ${result.globalLockedVertices[i]} ]`);
        // }

        // for (let i = 0; i < decimatedTriangleVertices.length; i++) {
        //     // console.log(`decimatedTriangleVertices[${i}] [ ${decimatedTriangleVertices[i].x}, ${decimatedTriangleVertices[i].y}, ${decimatedTriangleVertices[i].z} ]`);
        // }

        // debugger;
        if (desiredTriangleCount < simplifiedTriangleCount) {
            console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Retrying, ignoring topology`);
            let positionUniqueTriangleVertices: uvec3[] = new Array(clusterGroupTriangleVertices.length).fill(null).map(() => new uvec3());
            const ret_shadowIndexBuffer = Meshoptimizer.meshopt_generateShadowIndexBuffer(
                new Uint32Array(vec3_to_number(clusterGroupTriangleVertices)),
                clusterGroupTriangleVertices.length * 3,
                inputMesh.vertices,// getVertex(inputMesh, 0),
                inputMesh.vertexCount,
                3, // vertex_size, for interleaved this stays at 3 * 4
                inputMesh.vertexStride
            );
            positionUniqueTriangleVertices = number_to_uvec3(ret_shadowIndexBuffer);

            const ret = Meshoptimizer.meshopt_simplifyWithAttributes(
                decimatedTriangleVertices.length * 3,
                new Uint32Array(vec3_to_number(positionUniqueTriangleVertices)),
                positionUniqueTriangleVertices.length * 3,
                inputMesh.vertices, // getVertex(inputMesh, 0),
                inputMesh.vertexCount,
                inputMesh.vertexStride,
                null,
                0,
                null,
                0,
                new Uint8Array(result.globalLockedVertices),
                desiredTriangleCount * 3,
                targetError,
                options,
            );

            simplifiedTriangleCount = ret.ret / 3;
            decimatedTriangleVertices = number_to_uvec3(ret.destination);
            absoluteError = ret.out_result_error;

            if (desiredTriangleCount < simplifiedTriangleCount) {
                console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Retrying, ignoring locked`);
                throw Error("Not implemented")
                // simplifiedTriangleCount = meshopt_simplifySloppy(
                //     decimatedTriangleVertices,
                //     positionUniqueTriangleVertices,
                //     positionUniqueTriangleVertices.length * 3, getVertex(inputMesh, 0),
                //     inputMesh.vertexCount,
                //     inputMesh.vertexStride,
                //     desiredTriangleCount * 3,
                //     targetError,
                //     absoluteError // &absoluteError
                // ) / 3;
            }
        }

        // HACK: truncate triangles if decimation target was not met
        if (desiredTriangleCount < simplifiedTriangleCount) {
            console.warn(`Warning: decimation failed (${desiredTriangleCount} < ${simplifiedTriangleCount}). Discarding ${simplifiedTriangleCount - desiredTriangleCount} triangles`);


        }
        decimatedTriangleVertices = resizeArray(decimatedTriangleVertices, Math.min(desiredTriangleCount, simplifiedTriangleCount), () => new uvec3());

        // Allocate output for this thread
        // const groupDecimatedTrianglesOffset = decimatedTriangleAlloc.fetch_add(uint32_t(decimatedTriangleVertices.length));
        const groupDecimatedTrianglesOffset = decimatedTriangleAlloc;
        decimatedTriangleAlloc += decimatedTriangleVertices.length;

        // Copy decimated triangle indices to result.decimatedTriangleStorage. This
        // temporary buffer is needed and we can't write directly to the library
        // user's buffer because triangles must be ordered by cluster, which is
        // computed next.
        if (groupDecimatedTrianglesOffset + decimatedTriangleVertices.length > result.decimatedTriangleStorage.length) {
            success = Result.ERROR_OUTPUT_MESH_OVERFLOW;
            break;
        }
        // std:: ranges:: copy(decimatedTriangleVertices, result.decimatedTriangleStorage.begin() + groupDecimatedTrianglesOffset);
        for (let i = 0; i < decimatedTriangleVertices.length; i++) {
            result.decimatedTriangleStorage[groupDecimatedTrianglesOffset + i] = decimatedTriangleVertices[i];
        }

        result.groupTriangleRanges[clusterGroupIndex] = new Range(groupDecimatedTrianglesOffset, decimatedTriangleVertices.length);
        result.groupQuadricErrors[clusterGroupIndex] = absoluteError;
    }

    if (success != Result.SUCCESS) {
        return success;
    }

    // result.decimatedTriangleStorage.resize(decimatedTriangleAlloc);
    result.decimatedTriangleStorage = resizeArray(result.decimatedTriangleStorage, decimatedTriangleAlloc, () => new uvec3());
    result.mesh.indices = new Uint32Array(vec3_to_number(result.decimatedTriangleStorage));
    result.mesh.indexCount = result.decimatedTriangleStorage.length * 3;

    result.mesh.vertexCount = inputMesh.vertexCount;
    result.mesh.vertexOffset = inputMesh.vertexOffset;
    result.mesh.vertexStride = inputMesh.vertexStride;
    result.mesh.vertices = inputMesh.vertices;

    Object.assign(current, result);
    // [current, result] = [result, current];
    // std:: swap(current, result);
    return Result.SUCCESS;
}

// From a triangle mesh and a partition of its triangles into a number of triangle ranges (DecimatedClusterGroups::groupTriangleRanges), generate a number of clusters within each range
// according to the requested clusterConfig.
function generateTriangleClusters(decimatedClusterGroups: DecimatedClusterGroups, clusterConfig: Config, output: TriangleClusters): Result {

    // Compute the bounding boxes and centroids for each triangle
    const triangleCount = Math.floor(decimatedClusterGroups.mesh.indexCount) / 3;
    let triangleAabbs: AABB[] = new Array(triangleCount).fill(null).map(() => new AABB());
    let triangleCentroids: vec3[] = new Array(triangleCount).fill(null).map(() => new vec3());

    for (let i = 0; i < triangleCount; i++) {
        const triangle: Uint32Array = getTriangle(decimatedClusterGroups.mesh, i);

        const a = getVertex(decimatedClusterGroups.mesh, triangle[0]);
        const b = getVertex(decimatedClusterGroups.mesh, triangle[1]);
        const c = getVertex(decimatedClusterGroups.mesh, triangle[2]);

        for (let coord = 0; coord < 3; coord++) {
            triangleAabbs[i].bboxMin[coord] = Math.min(Math.min(a[coord], b[coord]), c[coord]);
            triangleAabbs[i].bboxMax[coord] = Math.max(Math.max(a[coord], b[coord]), c[coord]);
        }

        triangleCentroids[i] = centroidAABB(triangleAabbs[i]);
    }

    // TODO: compute triangle connectivity - slower but higher quality clusters
    //nvcluster::Graph graph{ ... };

    // The triangles are now only considered as bounding boxes with a centroid. The segment clusterizer will then
    // generate a number of clusters (each defined by a range in the array of input elements) within each input range (segment)
    // according to the requested clustering configuration.
    let perTriangleElements: SpatialElements = new SpatialElements();
    perTriangleElements.boundingBoxes = triangleAabbs;
    perTriangleElements.centroids = triangleCentroids.map(v => [v.x, v.y, v.z]).flat();
    perTriangleElements.elementCount = triangleAabbs.length;

    let triangleClusterInput: Input = new Input();
    triangleClusterInput.config = clusterConfig;
    triangleClusterInput.spatialElements = perTriangleElements;
    // triangleClusterInput.graph = undefined;

    let clusteringResult: ResultNVCluster = generateSegmentedClusters(
        triangleClusterInput,
        decimatedClusterGroups.groupTriangleRanges,
        decimatedClusterGroups.groupTriangleRanges.length,
        output.clustering
    );
    if (clusteringResult != ResultNVCluster.SUCCESS) {
        // FIXME: could translate the clustering error for more details
        return Result.ERROR_CLUSTERING_FAILED;
    }

    // For each generated cluster, compute its bounding box so the boxes can be used as input for potential further clustering
    // resizeArray(output.clusterAabbs, output.clustering.clusterRanges.length, () => new AABB());
    if (output.clusterAabbs.length !== output.clustering.clusterRanges.length) {
        for (let i = 0; i < output.clustering.clusterRanges.length; i++) {
            output.clusterAabbs.push(new AABB());
        }
    }
    for (let rangeIndex = 0; rangeIndex < output.clusterAabbs.length; rangeIndex++) {
        const range: Range = output.clustering.clusterRanges[rangeIndex];

        let clusterAabb: AABB = emptyAABB();

        for (let index = range.offset; index < range.offset + range.count; index++) {
            const triangleIndex = output.clustering.clusterItems[index];
            addAABB(clusterAabb, triangleAabbs[triangleIndex]);
        }
        output.clusterAabbs[rangeIndex] = clusterAabb;
    }


    // Store the cluster group index that was used to generate the clusters.
    // FIXME: where is that used?
    output.generatingGroupOffset = decimatedClusterGroups.baseClusterGroupIndex;
    // Store the largest allowed cluster size in the output
    output.maxClusterItems = clusterConfig.maxClusterSize;

    return Result.SUCCESS;
}

// TODO: 8 connections per vertex is a lot of memory overhead
export class VertexAdjacency extends Uint32Array {
    public static readonly Sentinel: number = 0xffffffff;

    constructor() {
        // Initialize a Uint32Array of length 8
        super(8);
        // Fill the array with the Sentinel value
        this.fill(VertexAdjacency.Sentinel);
    }
}

// Returns shared vertex counts between pairs of clusters. The use of the fixed
// sized VertexAdjacency limits cluster vertex valence (not triangle vertex
// valence), but this should be rare for well formed meshes.
function computeClusterAdjacency(decimatedClusterGroups: DecimatedClusterGroups, triangleClusters: TriangleClusters, result: ClusterAdjacency) {
    // Allocate the cluster connectivity: each cluster will have a map containing the indices of the clusters adjacent to it
    // resizeArray not working here?
    resizeArray(result, triangleClusters.clustering.clusterRanges.length, () => new Map());
    if (result.length !== triangleClusters.clustering.clusterRanges.length) {
        for (let i = 0; i < triangleClusters.clustering.clusterRanges.length; i++) {
            result.push(new Map());
        }
    }

    // TODO: reduce vertexAdjacency size? overallocated for all vertices in mesh even after decimation

    // For each vertex in the input mesh, we store up to 8 adjacent clusters
    const vertexClusterAdjacencies: VertexAdjacency[] = new Array(decimatedClusterGroups.mesh.vertexCount).fill(null).map(() => new VertexAdjacency());

    // For each triangle cluster, add its cluster index to the adjacency lists of the vertices of the triangles contained in the cluster
    // Each time a vertex is found to be adjacent to another cluster we add the current (resp. other) cluster to the adjacency list of the other (resp. current) cluster,
    // and increment the vertex count for each connection. At the end of this loop we then have, for each cluster, a map of the adjacent clusters indices containing the
    // number of vertices those clusters have in common
    for (let clusterIndex = 0; clusterIndex < triangleClusters.clustering.clusterRanges.length; ++clusterIndex) {
        // Fetch the range of triangles for the current cluster
        const range: Range = triangleClusters.clustering.clusterRanges[clusterIndex];
        // Fetch the indices of the triangles contained in the current cluster
        // std::span<const uint32_t> clusterTriangles = std::span<const uint32_t>(triangleClusters.clustering.clusterItems.data() + range.offset, range.count);
        const clusterTriangles = createArrayView(triangleClusters.clustering.clusterItems, range.offset, range.count);

        // For each triangle in the cluster, add the current cluster index to the adjacency lists of its vertices
        for (let indexInCluster = 0; indexInCluster < clusterTriangles.length; indexInCluster++) {
            // Fetch the current triangle in the cluster
            const triangleIndex = clusterTriangles[indexInCluster];
            const tri = getTriangle(decimatedClusterGroups.mesh, triangleIndex);

            // For each vertex of the triangle, add the current cluster index in its adjacency list
            for (let i = 0; i < 3; ++i) {
                // Fetch the cluster adjacency for the vertex
                const vertexClusterAdjacency: VertexAdjacency = vertexClusterAdjacencies[tri[i]];
                let seenSelf = false;

                // Check the entries in the adjacency list of the vertex and add the current cluster if not already present
                for (let adjacencyIndex = 0; adjacencyIndex < vertexClusterAdjacency.length; adjacencyIndex++) {
                    let adjacentClusterIndex = vertexClusterAdjacency[adjacencyIndex];

                    // If the current cluster has already been added in the vertex adjacency by another triangle there
                    // is nothing more to do for that vertex
                    if (adjacentClusterIndex == clusterIndex) {
                        seenSelf = true;
                        continue;
                    }

                    // If we reached the end of the adjacency list and did not find the current cluster index, add
                    // the current cluster to the back of the adjacency list
                    if (adjacentClusterIndex == VertexAdjacency.Sentinel) {
                        if (!seenSelf) {
                            adjacentClusterIndex = clusterIndex;
                            vertexClusterAdjacency[adjacencyIndex] = adjacentClusterIndex; // Set by pointer
                        }
                        if (vertexClusterAdjacency[vertexClusterAdjacency.length - 1] !== VertexAdjacency.Sentinel) {
                            console.warn(`Warning: vertexClusterAdjacency[${tri[i]}] is full`);
                        }
                        break;
                    }
                    // The adjacentIndex is a cluster index, different to the current one,
                    // that was previously added and thus is a new connection. Append
                    // found connection, once for each direction, and increment the vertex counts for each
                    if (adjacentClusterIndex >= clusterIndex) {
                        return Result.ERROR_ADJACENCY_GENERATION_FAILED;
                    }

                    // const currentToAdjacent: AdjacencyVertexCount = result[clusterIndex][adjacentClusterIndex];
                    // const adjacentToCurrent: AdjacencyVertexCount = result[adjacentClusterIndex][clusterIndex];
                    let currentToAdjacent: AdjacencyVertexCount | undefined = result[clusterIndex].get(adjacentClusterIndex);
                    let adjacentToCurrent: AdjacencyVertexCount | undefined = result[adjacentClusterIndex].get(clusterIndex);
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

// Find the vertex in the mesh that is the farthest from the start point.
function farthestPoint(mesh: MeshInput, start: number[], farthest: number[]) {
    let result: Float32Array | undefined = undefined;

    let maxLengthSq = 0.0;
    // Iterate over triangles, paying the cost of visiting duplicate vertices so
    // that unused vertices are not included.
    for (let triangleIndex = 0; triangleIndex < mesh.indexCount / 3; triangleIndex++) {
        const triangle = getTriangle(mesh, triangleIndex);
        // console.log("triangle", triangle[0], triangle[1], triangle[2]);
        for (let i = 0; i < 3; ++i) {
            const candidatePtr = getVertex(mesh, triangle[i]);
            
            let sc: number[] = new Array(3);
            sc[0] = candidatePtr[0] - start[0];
            sc[1] = candidatePtr[1] - start[1];
            sc[2] = candidatePtr[2] - start[2];
            sc[0] = parseFloat(sc[0].toPrecision(5));
            sc[1] = parseFloat(sc[1].toPrecision(5));
            sc[2] = parseFloat(sc[2].toPrecision(5));
            
            const lengthSq = sc[0] * sc[0] + sc[1] * sc[1] + sc[2] * sc[2];

            // console.log("candidatePtr", candidatePtr[0], candidatePtr[1], candidatePtr[2]);
            // console.log("sc", sc[0], sc[1], sc[2]);
            // console.log(`lengthSq: ${lengthSq}, maxLengthSq: ${maxLengthSq}`);

            if (lengthSq > maxLengthSq) {
                maxLengthSq = lengthSq;
                result = candidatePtr;
            }
        }
        // console.log("")
    }

    if (result !== undefined) {
        farthest[0] = result[0];
        farthest[1] = result[1];
        farthest[2] = result[2];
    }
    // console.log(start, farthest);
    // debugger;
};

function distance(x: number[], y: number[]): number {
    let result = 0.0;
    for (let i = 0; i < 3; i++) {
        const d = x[i] - y[i];
        result += d * d;
    }
    return Math.sqrt(result);
}

// Ritter's bounding sphere algorithm
// https://en.wikipedia.org/wiki/Bounding_sphere
function makeBoundingSphere(mesh: MeshInput, sphere: Sphere): Result {
    // TODO: try https://github.com/hbf/miniball
    const x = getVertex(mesh, 0);

    let y = new Array(3);
    let z = new Array(3);

    farthestPoint(mesh, Array.from(x), y);
    farthestPoint(mesh, y, z);

    // debugger;
    let position: number[] = new Array(3).fill(0);
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

    // debugger;
    return Result.SUCCESS;
}

// Groups of triangle clusters
class ClusterGroups {
    public groups: ClusterStorage = new ClusterStorage();
    public groupTriangleCounts: number[] = [];  // useful byproduct
    public totalTriangleCount: number = 0;
    public globalGroupOffset: number = 0;
}

// Make clusters of clusters, referred to as "groups", using the cluster adjacency to optimize clustering by keeping
// locked vertices internal to each group (i.e. not on group borders). This is
// important for quality of the recursive decimation.
// This function also sanitizes the cluster adjacency by removing connections involving less than NVLOD_MINIMAL_ADJACENCY_SIZE vertices.
type AdjacentCounts = Map<number, AdjacencyVertexCount>;
function groupClusters(triangleClusters: TriangleClusters, clusterGroupConfig: Config, globalGroupOffset: number, clusterAdjacency: ClusterAdjacency, result: ClusterGroups): Result {
    // Remove connections between clusters involving less than NVLOD_MINIMAL_ADJACENCY_SIZE vertices, otherwise checkerboard
    // patterns are generated.
    let adjacencySizes: number[] = new Array(clusterAdjacency.length).fill(0);
    {
        for (let i = 0; i < clusterAdjacency.length; i++) {
            const adjacency: AdjacentCounts = clusterAdjacency[i];

            // Remove entries where the vertex count is less than NVLOD_MINIMAL_ADJACENCY_SIZE.
            // We use Array.from() to safely iterate over keys while modifying the map.
            for (const key of Array.from(adjacency.keys())) {
                const count = adjacency.get(key);
                if (count && count.vertexCount < NVLOD_MINIMAL_ADJACENCY_SIZE) {
                    adjacency.delete(key);
                }
            }

            // Store the number of remaining entries for this cluster.
            adjacencySizes[i] = adjacency.size;
        }
    }

    let adjacencyOffsets = new Array(clusterAdjacency.length).fill(0);
    {
        //Stopwatch sw("sum");
        // Get the size of the adjacency list for each cluster (i.e. the number of clusters adjacent to it), and compute the prefix sum of those sizes into adjacencyOffsets.
        // Those offsets will later be used to linearize the adjacency data for the clusters and pass it along for further clustering
        // Note: do NOT use NVLOD_DEFAULT_EXECUTION_POLICY as exclusive_scan seems not to be guaranteed to work in parallel
        // exclusive_scan_impl(adjacencySizes.begin(), adjacencySizes.end(), adjacencyOffsets.begin(), 0, std:: plus<uint32_t>());
        adjacencyOffsets = exclusive_scan_impl(adjacencySizes, 0, (sum, value) => sum + value);

    }

    // Fill adjacency for clustering input
    // Get the total size of the adjacency list by fetching the offset of the adjacency data of the last cluster and adding the size of its adjacency list
    // const adjacencyItemCount = adjacencyOffsets.empty() ? 0u: adjacencyOffsets.back() + uint32_t(clusterAdjacency.back().size());
    const adjacencyItemCount = adjacencyOffsets.length === 0 ? 0 : adjacencyOffsets[adjacencyOffsets.length - 1] + clusterAdjacency[clusterAdjacency.length - 1].size;

    // Allocate the buffer storing the linearized per-cluster adjacency data and weights
    let adjacencyItems: number[] = new Array(adjacencyItemCount);
    let adjacencyWeights: number[] = new Array(adjacencyItemCount);


    // Allocate the buffer storing the ranges within the linearized adjacency buffer corresponding to each cluster
    let adjacencyRanges: Range[] = new Array(adjacencyOffsets.length);

    let clusterCentroids: vec3[] = new Array(triangleClusters.clusterAabbs.length);
    // For each cluster, write the adjacency data to the linearized buffer and store the corresponding range for the cluster within that adjacency data
    // and compute cluster centroids as the centroid of their AABBs
    {
        //Stopwatch sw("adj");
        for (let clusterIndex = 0; clusterIndex < adjacencyOffsets.length; clusterIndex++) {
            // Initialize the adjacency range with the offset for the cluster, leaving the count to zero and incrementing below
            let range: Range = adjacencyRanges[clusterIndex];
            range = new Range(adjacencyOffsets[clusterIndex], 0);
            adjacencyRanges[clusterIndex] = range;

            // Compute the weight of the connection to each adjacent cluster and write the adjacent clusters indices and weights within the range
            for (const [adjacentClusterIndex, adjacencyVertexCounts] of clusterAdjacency[clusterIndex]) {
                // Compute the weight of the connection, giving more weight to connections with more locked vertices
                const weight = 1 + adjacencyVertexCounts.vertexCount + adjacencyVertexCounts.lockedCount * NVLOD_LOCKED_VERTEX_WEIGHT_MULTIPLIER;

                // Write the adjacent cluster index and weight to the linearized buffer
                adjacencyItems[range.offset + range.count] = adjacentClusterIndex;
                adjacencyWeights[range.offset + range.count] = Math.max(weight, 1.0) * NVLOD_VERTEX_WEIGHT_MULTIPLIER;

                // Increment the write position within the range
                range.count++;
            }
            clusterCentroids[clusterIndex] = centroidAABB(triangleClusters.clusterAabbs[clusterIndex]);
        }

    }
    // Generate input data for the clusterizer, where the elements to clusterize are the input clusters.
    // We also provide the adjacency data and weights for the clusters to drive the clusterizer, that will
    // attempt to generate graph cuts with minimal weight. Since the weights depend on the number of shared
    // vertices between clusters, the clusterizer will tend to minimize the cost of the graph cuts, hence
    // grouping clusters with more shared vertices.
    const clusterElements: SpatialElements = new SpatialElements();
    clusterElements.boundingBoxes = triangleClusters.clusterAabbs;
    clusterElements.centroids = vec3_to_number(clusterCentroids);
    clusterElements.elementCount = triangleClusters.clusterAabbs.length;

    let graph: Graph = new Graph();
    graph.nodes = adjacencyRanges;
    graph.nodeCount = adjacencyRanges.length;
    graph.connectionTargets = adjacencyItems;
    graph.connectionWeights = adjacencyWeights;
    graph.connectionCount = adjacencyItems.length;

    const inputTriangleClusters: Input = new Input();
    inputTriangleClusters.config = clusterGroupConfig;
    inputTriangleClusters.spatialElements = clusterElements;
    inputTriangleClusters.graph = graph;

    // result = new ClusterGroups();
    result.globalGroupOffset = globalGroupOffset;

    let clusterResult: ResultNVCluster;

    {
        clusterResult = generateClusters(inputTriangleClusters, result.groups);
    }
    if (clusterResult != ResultNVCluster.SUCCESS) {
        return Result.ERROR_CLUSTERING_FAILED;
    }

    // Compute the total triangle count for each group of clusters of triangles
    result.groupTriangleCounts = resizeArray(result.groupTriangleCounts, result.groups.clusterRanges.length, () => 0);
    
    {
        //Stopwatch sw("total");
        for (let rangeIndex = 0; rangeIndex < result.groups.clusterRanges.length; rangeIndex++) {
            const range: Range = result.groups.clusterRanges[rangeIndex];
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

function writeClusters(decimatedClusterGroups: DecimatedClusterGroups, clusterGroups: ClusterGroups, triangleClusters: TriangleClusters, meshOutput: MeshOutput, outputWritePositions: OutputWritePositions): Result {
    if (outputWritePositions.lodLevelGroup >= meshOutput.lodLevelCount) {
        return Result.ERROR_OUTPUT_MESH_OVERFLOW;
    }

    // Fetch the range of groups for the current LOD level in the output mesh and set its start offset after the last written group count
    const lodLevelGroupRange: Range = meshOutput.lodLevelGroupRanges[outputWritePositions.lodLevelGroup];
    outputWritePositions.lodLevelGroup++;
    lodLevelGroupRange.offset = outputWritePositions.groupCluster;

    // Triangle clusters are stored in ranges of the generating group, before
    // decimation. Now that we have re-grouped the triangle clusters into cluster
    // groups we need to track the original generating group per cluster. This
    // saves binary searching to find the generating group index.
    let clusterGeneratingGroups: number[] = [];
    // clusterGeneratingGroups.reserve(triangleClusters.clustering.clusterRanges.size());
    for (let clusterLocalGroupIndex = 0; clusterLocalGroupIndex < triangleClusters.clustering.clusterRangeSegments.length; clusterLocalGroupIndex++) {
        // Fetch the range of clusters corresponding to the current group in the output mesh
        const clusterGroupRange: Range = triangleClusters.clustering.clusterRangeSegments[clusterLocalGroupIndex];
        // For each cluster in the range segment, store the generating group index representing the current segment
        const generatingGroupIndex = triangleClusters.generatingGroupOffset + clusterLocalGroupIndex;
        // clusterGeneratingGroups.insert(clusterGeneratingGroups.end(), clusterGroupRange.count, generatingGroupIndex);
        // clusterGeneratingGroups.push(clusterGeneratingGroups.end(), clusterGroupRange.count, generatingGroupIndex);
        for (let i = 0; i < clusterGroupRange.count; i++) {
            clusterGeneratingGroups.push(generatingGroupIndex);
        }
    }

    if (clusterGeneratingGroups.length != triangleClusters.clustering.clusterRanges.length) {
        return Result.ERROR_CLUSTER_GENERATING_GROUPS_MISMATCH;
    }

    // Write the clusters to the output
    for (let clusterGroupIndex = 0; clusterGroupIndex < clusterGroups.groups.clusterRanges.length; ++clusterGroupIndex) {
        // FIXME: check that value
        //if(outputWritePositions.groupCluster >= meshOutput.groupClusterRangeCount)
        if (outputWritePositions.groupCluster >= meshOutput.groupCount) {
            return Result.ERROR_OUTPUT_MESH_OVERFLOW;
        }
        const range: Range = clusterGroups.groups.clusterRanges[clusterGroupIndex];
        // std:: span < uint32_t > clusterGroup = std:: span<uint32_t>(clusterGroups.groups.clusterItems.data() + range.offset, range.count);
        const clusterGroup = createArrayView(clusterGroups.groups.clusterItems, range.offset, range.count);
        meshOutput.groupClusterRanges[outputWritePositions.groupCluster] = new Range(outputWritePositions.clusterTriangleRange, range.count);
        outputWritePositions.groupCluster++;


        // Sort the clusters by their generating group. Clusters are selected based
        // on a comparison between their group and generating group. By storing
        // clusters in contiguous ranges of this intersection, the computation for
        // the whole range can be done at once, or may at least be more cache
        // efficient.
        // std:: ranges:: sort(clusterGroup, [& gg = clusterGeneratingGroups](uint32_t a, uint32_t b) { return gg[a] < gg[b]; });
        clusterGroup.sort((a, b) => { return clusterGeneratingGroups[a] - clusterGeneratingGroups[b] })


        // #if 0
        // // Print the generating group membership counts
        // std:: unordered_map < uint32_t, uint32_t > generatingGroupCounts;
        // for (const uint32_t& clusterIndex : clusterGroup)
        // generatingGroupCounts[clusterGeneratingGroups[clusterIndex]]++;
        // for (auto[gg, count] : generatingGroupCounts)
        // printf("Group %zu: generating group %u: clusters: %u\n", clusterGroupIndex + lodLevelGroupRange.offset, gg, count);
        // #endif

        for (const clusterIndex of clusterGroup) {
            const clusterTriangleRange: Range = triangleClusters.clustering.clusterRanges[clusterIndex];
            // std:: span <const uint32_t> clusterTriangles = std:: span<uint32_t>(triangleClusters.clustering.clusterItems.data() + clusterTriangleRange.offset, clusterTriangleRange.count);
            const clusterTriangles = createArrayView(triangleClusters.clustering.clusterItems, clusterTriangleRange.offset, clusterTriangleRange.count);

            // const trianglesBegin = meshOutput.clusterTriangles + outputWritePositions.clusterTriangleVertex * 3;
            // const trianglesBegin = meshOutput.clusterTriangles.slice(outputWritePositions.clusterTriangleVertex * 3, meshOutput.clusterTriangles.length);
            const trianglesBegin = createArrayView(meshOutput.clusterTriangles, outputWritePositions.clusterTriangleVertex * 3, meshOutput.clusterTriangles.length);
            const trianglesBeginIndex = outputWritePositions.clusterTriangleVertex * 3;

            const clusterRange: Range = new Range(outputWritePositions.clusterTriangleVertex, clusterTriangles.length);
            if (clusterRange.offset + clusterRange.count > meshOutput.triangleCount) {
                return Result.ERROR_OUTPUT_MESH_OVERFLOW;
            }

            // FIXME: reinstate that one
            //assert(outputCounters.clusterTriangleRangeCount < meshOutput.clusterTriangleRangeCount);

            // Gather and write triangles for the cluster. Note these are still global
            // triangle vertex indices. Creating cluster vertices with a vertex cache
            // is intended to be done afterwards.
            for (const triangleIndex of clusterTriangles) {
                const triangle: Uint32Array = getTriangle(decimatedClusterGroups.mesh, triangleIndex);
                meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 0] = triangle[0];
                meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 1] = triangle[1];
                meshOutput.clusterTriangles[outputWritePositions.clusterTriangleVertex * 3 + 2] = triangle[2];
                outputWritePositions.clusterTriangleVertex++;
                // debugger;
            }

            meshOutput.clusterTriangleRanges[outputWritePositions.clusterTriangleRange] = clusterRange;
            outputWritePositions.clusterTriangleRange++;

            meshOutput.clusterGeneratingGroups[outputWritePositions.clusterParentGroup] = clusterGeneratingGroups[clusterIndex];
            outputWritePositions.clusterParentGroup++;

            // Bounding spheres are an optional output
            if (outputWritePositions.clusterBoundingSphere < meshOutput.clusterCount) {
                let mesh: MeshInput = new MeshInput();
                // mesh.indices = trianglesBegin;
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

                const result: Result = makeBoundingSphere(mesh, meshOutput.clusterBoundingSpheres[outputWritePositions.clusterBoundingSphere]);
                if (result != Result.SUCCESS) {
                    return result;
                }
                outputWritePositions.clusterBoundingSphere++;


                // console.log("meshOutput.clusterTriangles", meshOutput.clusterTriangles)
                // console.log("trianglesBegin", trianglesBegin[0])
                // throw Error("ERGERG")

                // debugger;
            }
        }
    }
    lodLevelGroupRange.count = outputWritePositions.groupCluster - lodLevelGroupRange.offset;
    return Result.SUCCESS;
}


export function nvclusterlodMeshCreate(info: MeshCreateInfo, output: MeshOutput): Result {
    const input: MeshInput = info.input;

    let outputCounters: OutputWritePositions = new OutputWritePositions();

    // Populate initial mesh input in a common structure. Subsequent passes
    // contain results from the previous level of detail.
    let decimatedClusterGroups: DecimatedClusterGroups = new DecimatedClusterGroups();
    decimatedClusterGroups.groupTriangleRanges = [new Range(0, Math.floor(input.indexCount / 3))];  // The first pass uses the entire input mesh, hence we only have one large group of triangles
    decimatedClusterGroups.mesh = input;
    decimatedClusterGroups.decimatedTriangleStorage = [];  // initial source is input.mesh so this is empty. Further passes will write the index buffer for the decimated triangles of the LODs
    decimatedClusterGroups.groupQuadricErrors = [0.0];   // In the first pass no error has yet been accumulated
    decimatedClusterGroups.baseClusterGroupIndex = ORIGINAL_MESH_GROUP;  // The first group represents the original mesh, hence we mark it as the original group
    decimatedClusterGroups.globalLockedVertices = new Array(input.vertexCount).fill(0);  // No vertices are locked in the original mesh

    // Initial clustering
    console.log(`Initial clustering (${input.indexCount / 3} triangles)`);

    // Loop creating LOD levels until there is a single root cluster.
    let lastTriangleCount = Infinity;
    let triangleCountCanary = 10;
    let lodLevel = 0;
    while (true) {
        // Cluster the initial or decimated geometry. When clustering decimated
        // geometry, clusters are only formed within groups of triangles from the
        // last iteration.

        // In the first iteration (LOD 0) the mesh is represented by a single range of triangles covering the entire mesh. The
        // function generateTriangleClusters will create a set of clusters from this mesh. Each cluster is represented by
        // a range of triangles within the mesh.
        // Later iterations will take the clusters from the previous iteration as input. The function generateTriangleClusters
        // will then create a set of clusters within each of the input clusters.
        const triangleClusters: TriangleClusters = new TriangleClusters();
        let success: Result = generateTriangleClusters(decimatedClusterGroups, input.clusterConfig, triangleClusters);

        if (success != Result.SUCCESS) {
            return success;
        }

        // Compute the adjacency between clusters: for each cluster clusterAdjacency will contain a map of
        // its adjacent clusters along with the number of vertices shared with each of those clusters. The adjacency information is symmetric.
        // This is important as it feeds into the weights for making groups of clusters.
        let clusterAdjacency: ClusterAdjacency = [];
        success = computeClusterAdjacency(decimatedClusterGroups, triangleClusters, clusterAdjacency);
        if (success != Result.SUCCESS) {
            return success;
        }

        // Make clusters of clusters, called "cluster groups" or just "groups".
        const globalGroupOffset = outputCounters.groupCluster;
        let clusterGroups: ClusterGroups = new ClusterGroups();
        success = groupClusters(triangleClusters, input.groupConfig, globalGroupOffset, clusterAdjacency, clusterGroups);
        if (success != Result.SUCCESS) {
            return success;
        }

        // Write the generated clusters and cluster groups representing the mesh at the current LOD
        success = writeClusters(decimatedClusterGroups, clusterGroups, triangleClusters, output, outputCounters);
        if (success != Result.SUCCESS) {
            return success;
        }

        // Exit when there is just one cluster, meaning the decimation reached the level where the entire mesh geometry fits within a single cluster
        const clusterCount = triangleClusters.clustering.clusterRanges.length;
        if (clusterCount <= 1) {
            if (clusterCount != 1) {
                return Result.ERROR_EMPTY_ROOT_CLUSTER;
            }
            break;
        }

        // Decimate within cluster groups to create the next LOD level
        console.warn("Decimating lod %d (%d clusters)\n", lodLevel++, clusterCount);

        const maxDecimationFactor = (clusterCount - 1) / clusterCount;
        const decimationFactor = Math.min(maxDecimationFactor, input.decimationFactor);
        success = decimateClusterGroups(decimatedClusterGroups, triangleClusters, clusterGroups, decimationFactor);

        if (success != Result.SUCCESS) {
            return success;
        }


        // Make sure the number of triangles is always going down. This may fail for
        // high decimation factors.
        const triangleCount = decimatedClusterGroups.decimatedTriangleStorage.length;
        if (triangleCount == lastTriangleCount && --triangleCountCanary <= 0) {
            return Result.ERROR_CLUSTER_COUNT_NOT_DECREASING;
        }
        lastTriangleCount = triangleCount;

        // Per-group quadric errors are written separately as the final LOD level
        // of groups will not decimate and need zeroes written instead.
        for (let i = 0; i < decimatedClusterGroups.groupQuadricErrors.length; i++) {
            output.groupQuadricErrors[outputCounters.groupQuadricError] = decimatedClusterGroups.groupQuadricErrors[i];
            outputCounters.groupQuadricError++;
        }
    }

    // Write zeroes for the final LOD level of groups (of which there is only
    // one), which do not decimate
    // TODO: shouldn't this be infinite error so it's always drawn?
    output.groupQuadricErrors[outputCounters.groupQuadricError] = 0;
    outputCounters.groupQuadricError++;

    output.clusterCount = outputCounters.clusterTriangleRange;
    output.groupCount = outputCounters.groupCluster;
    output.lodLevelCount = outputCounters.lodLevelGroup;
    output.triangleCount = outputCounters.clusterTriangleVertex;


    return Result.SUCCESS;
}