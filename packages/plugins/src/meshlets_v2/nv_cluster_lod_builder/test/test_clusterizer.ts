import { vec3 } from '../nvclusterlod_mesh';
import { Result } from '../nvclusterlod_common';
import { AABB, Input, Result as ResultNVCluster, SpatialElements, generateClusters, Range, Graph } from '../nvcluster';
import { ClusterStorage, SegmentedClusterStorage, generateSegmentedClusters } from '../nvcluster_storage';
import { ASSERT_EQ, EXPECT_EQ, EXPECT_GE, EXPECT_GT, EXPECT_LE } from './test_common';

function make_vec3(a: number[]): vec3 {
    return new vec3(a[0], a[1], a[2]);
}

// Adds two vec3s.
function add(a: vec3, b: vec3): vec3 {
    return new vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}

function mul(v: vec3, a: number): vec3 {
    return new vec3(v.x * a, v.y * a, v.z * a);
}

function centroid(aabb: AABB): vec3 {
    return mul(add(make_vec3(aabb.bboxMin), make_vec3(aabb.bboxMax)), 0.5);
}

function vec3_to_number(v: vec3[]): number[] {
    let out: number[] = [];
    for (let i = 0; i < v.length; i++) {
        out.push(v[i].x, v[i].y, v[i].z);
    }
    return out;
}

// Sort items within each cluster by their index and then the clusters based on
// the first item. This makes verifying clustering results easier.
function sortClustersClusterStorage(clustering: ClusterStorage): void {
    // For each cluster, sort the subarray of clusterItems defined by offset and count.
    clustering.clusterRanges.forEach((cluster) => {
        const start = cluster.offset;
        const end = start + cluster.count;
        // Extract the subarray
        const subArray = clustering.clusterItems.slice(start, end);
        // Sort the subarray numerically in ascending order.
        subArray.sort((a, b) => a - b);
        // Write the sorted subarray back into the original array.
        for (let i = 0; i < subArray.length; i++) {
            clustering.clusterItems[start + i] = subArray[i];
        }
    });

    // Now sort the clusters based on the first item in each cluster.
    clustering.clusterRanges.sort((clusterA, clusterB) => {
        return clustering.clusterItems[clusterA.offset] - clustering.clusterItems[clusterB.offset];
    });
}

// Sorts clusters within segments, but not the segments themselves
export function sortClustersSegmentedClusterStorage(clustering: SegmentedClusterStorage): void {
    // Helper to sort a subarray in place.
    const sortSlice = <U>(
        array: U[],
        offset: number,
        count: number,
        cmp?: (a: U, b: U) => number
    ) => {
        const sorted = array.slice(offset, offset + count).sort(cmp);
        for (let i = 0; i < count; i++) {
            array[offset + i] = sorted[i];
        }
    };

    // Sort items in each cluster.
    clustering.clusterRanges.forEach(cluster =>
        sortSlice(
            clustering.clusterItems,
            cluster.offset,
            cluster.count,
            (a, b) => (a < b ? -1 : a > b ? 1 : 0)
        )
    );

    // Sort cluster ranges within each segment,
    // comparing based on the first item of each cluster.
    clustering.clusterRangeSegments.forEach(segment =>
        sortSlice(
            clustering.clusterRanges,
            segment.offset,
            segment.count,
            (rangeA, rangeB) => {
                const a = clustering.clusterItems[rangeA.offset];
                const b = clustering.clusterItems[rangeB.offset];
                return a < b ? -1 : a > b ? 1 : 0;
            }
        )
    );
}

function TEST_Simple2x2() {
    // Test items
    // 0 and 2 are close and should be in a cluster
    // 1 and 3 are close and should be in a cluster
    const boundingBoxes: AABB[] = [
        new AABB([0, 0, 0], [1, 1, 1]),
        new AABB([0, 100, 0], [1, 101, 1]),
        new AABB([1, 0, 0], [2, 1, 1]),
        new AABB([1, 100, 0], [2, 101, 1]),
    ];

    // Generate centroids
    let centroids: vec3[] = new Array(boundingBoxes.length).fill(null).map(() => new vec3());
    for (let i = 0; i < boundingBoxes.length; i++) {
        centroids[i] = centroid(boundingBoxes[i]);
    }

    // Input structs
    let spatialElements: SpatialElements = new SpatialElements();
    spatialElements.boundingBoxes = boundingBoxes;
    spatialElements.centroids = vec3_to_number(centroids);
    spatialElements.elementCount = boundingBoxes.length;

    let input: Input = new Input();
    input.config = {
        minClusterSize: 2,
        maxClusterSize: 2,
        costUnderfill: 0.0,
        costOverlap: 0.0,
        preSplitThreshold: 0,
    };
    input.spatialElements = spatialElements;
    // input.graph = undefined,

    // Clustering
    const clustering: ClusterStorage = new ClusterStorage();
    const result: ResultNVCluster = generateClusters(input, clustering);
    ASSERT_EQ(result, ResultNVCluster.SUCCESS);

    sortClustersClusterStorage(clustering);

    // Verify
    ASSERT_EQ(clustering.clusterRanges.length, 2);
    ASSERT_EQ(clustering.clusterItems.length, 4);
    const cluster0: Range = clustering.clusterRanges[0];
    ASSERT_EQ(cluster0.count, 2);
    EXPECT_EQ(clustering.clusterItems[cluster0.offset], 0);
    console.log(clustering.clusterItems, cluster0.offset)
    EXPECT_EQ(clustering.clusterItems[cluster0.offset + 1], 2);
    const cluster1: Range = clustering.clusterRanges[1];
    ASSERT_EQ(cluster1.count, 2);
    EXPECT_EQ(clustering.clusterItems[cluster1.offset], 1);
    EXPECT_EQ(clustering.clusterItems[cluster1.offset + 1], 3);
}

/*
 * Tests that weights affect the clusterizer's result.
 *
 * In the following diagram, v0 ... v3 are bounding boxes,
 * the edges are connections, and the `w` labels are weights:
 *
 *  v0 <- w1 -> v2
 *   ^           |
 *   |           |
 *   |           |
 * w1000       w1000
 *   |           |
 *   |           |
 *   v           v
 *  v1 <- w1 -> v3
 */
function TEST_Simple2x2Weights() {
    // Test items
    // 0 and 2 are close and would normally be in a cluster
    // 1 and 3 are close and would normally be in a cluster
    const boundingBoxes: AABB[] = [
        new AABB([0, 0, 0], [1, 1, 1]),
        new AABB([0, 100, 0], [1, 101, 1]),
        new AABB([1, 0, 0], [2, 1, 1]),
        new AABB([1, 100, 0], [2, 101, 1]),
    ];

    // Adjacency/connections to override normal spatial clustering and instead
    // make clusters of {0, 1}, {2, 3}.
    const graphNodes: Range[] = [new Range(0, 2), new Range(2, 2), new Range(4, 2), new Range(6, 2)];  // 2 connections each
    const connectionTargets: number[] = [
        1, 2,  // item 0 connections
        0, 3,  // item 1 connections
        0, 3,  // item 2 connections
        1, 2,  // item 3 connections
    ];
    const connectionWeights: number[] = [
        1000.0, 1.0,     // weight from 0 to 1 and 2 respectively
        1000.0, 1.0,     // weight from 1 to 0 and 3 respectively
        1.0, 1000.0,  // weight from 2 to 0 and 3 respectively
        1.0, 1000.0,  // weight from 3 to 1 and 2 respectively
    ];

    // Generate centroids
    let centroids: vec3[] = new Array(boundingBoxes.length);
    for (let i = 0; i < boundingBoxes.length; i++) {
        centroids[i] = centroid(boundingBoxes[i]);
    }

    // Input structs
    const spatialElements: SpatialElements = new SpatialElements()
    spatialElements.boundingBoxes = boundingBoxes;
    spatialElements.centroids = vec3_to_number(centroids);
    spatialElements.elementCount = boundingBoxes.length;
    const graph: Graph = new Graph()
    graph.nodes = graphNodes;
    graph.nodeCount = graphNodes.length;
    graph.connectionTargets = connectionTargets;
    graph.connectionWeights = connectionWeights;
    graph.connectionCount = connectionTargets.length;

    const input: Input = new Input();
    input.config = {
        minClusterSize: 2,
        maxClusterSize: 2,
        costUnderfill: 0.0,
        costOverlap: 0.0,
        preSplitThreshold: 0,
    };
    input.spatialElements = spatialElements;
    input.graph = graph;

    // Clustering
    let clustering = new ClusterStorage();
    let result: ResultNVCluster = generateClusters(input, clustering);
    ASSERT_EQ(result, Result.SUCCESS);

    sortClustersClusterStorage(clustering);

    // Verify
    ASSERT_EQ(clustering.clusterRanges.length, 2);
    ASSERT_EQ(clustering.clusterItems.length, 4);
    const cluster0: Range = clustering.clusterRanges[0];
    ASSERT_EQ(cluster0.count, 2);
    EXPECT_EQ(clustering.clusterItems[cluster0.offset], 0);
    EXPECT_EQ(clustering.clusterItems[cluster0.offset + 1], 1);
    const cluster1: Range = clustering.clusterRanges[1];
    ASSERT_EQ(cluster1.count, 2);
    EXPECT_EQ(clustering.clusterItems[cluster1.offset], 2);
    EXPECT_EQ(clustering.clusterItems[cluster1.offset + 1], 3);
};

function TEST_Segmented2x2() {
    // Test items
    // 0 and 2 are close and should be in a cluster
    // 1 and 3 are close and should be in a cluster
    // Repeated 3 times for each segment with a slight x offset
    const boundingBoxes: AABB[] = [
        new AABB([0, 0, 0], [1, 1, 1]), new AABB([0, 100, 0], [1, 101, 1]), new AABB([1, 0, 0], [2, 1, 1]), new AABB([1, 100, 0], [2, 101, 1]),
        new AABB([1, 0, 0], [2, 1, 1]), new AABB([1, 100, 0], [2, 101, 1]), new AABB([2, 0, 0], [3, 1, 1]), new AABB([2, 100, 0], [3, 101, 1]),
        new AABB([2, 0, 0], [3, 1, 1]), new AABB([2, 100, 0], [3, 101, 1]), new AABB([3, 0, 0], [4, 1, 1]), new AABB([3, 100, 0], [4, 101, 1]),
    ];

    // Segments
    // segment 0 should contain items 4 to 8
    // segment 1 should contain items 8 to 12
    // segment 2 should contain items 0 to 4
    const segments: Range[] = [
        new Range(4, 4),
        new Range(8, 4),
        new Range(0, 4),
    ];

    // Generate centroids
    let centroids: vec3[] = new Array(boundingBoxes.length);
    for (let i = 0; i < boundingBoxes.length; i++) {
        centroids[i] = centroid(boundingBoxes[i]);
    }

    // Input structs
    const spatialElements: SpatialElements = new SpatialElements();
    spatialElements.boundingBoxes = boundingBoxes;
    spatialElements.centroids = vec3_to_number(centroids);
    spatialElements.elementCount = boundingBoxes.length;
    const input: Input = new Input()
    input.config = {
        minClusterSize: 2,
        maxClusterSize: 2,
        costUnderfill: 0.0,
        costOverlap: 0.0,
        preSplitThreshold: 0,
    };
    input.spatialElements = spatialElements;
    // input.graph           = nullptr,

    // Clustering
    const clustering: SegmentedClusterStorage = new SegmentedClusterStorage();
    const result: ResultNVCluster = generateSegmentedClusters(input, segments, segments.length, clustering);
    ASSERT_EQ(result, Result.SUCCESS);

    // Sort everything to validate items in clusters
    sortClustersSegmentedClusterStorage(clustering);

    // Verify segment order remains consistent
    for (let segmentIndex = 0; segmentIndex < 3; ++segmentIndex) {
        const segment: Range = clustering.clusterRangeSegments[segmentIndex];
        const firstCluster: Range = clustering.clusterRanges[segment.offset + 0];
        const firstItem = clustering.clusterItems[firstCluster.offset + 0];
        EXPECT_EQ(firstItem, segments[segmentIndex].offset);
    }

    // Verify cluster in each segment and items in each cluster
    ASSERT_EQ(clustering.clusterItems.length, 2 * 2 * 3);
    ASSERT_EQ(clustering.clusterRanges.length, 2 * 3);
    ASSERT_EQ(clustering.clusterRangeSegments.length, 3);
    for (let segmentIndex = 0; segmentIndex < 3; ++segmentIndex) {
        const expectedFirstItem = segments[segmentIndex].offset;

        const segment: Range = clustering.clusterRangeSegments[segmentIndex];
        ASSERT_EQ(segment.count, 2);
        const cluster0: Range = clustering.clusterRanges[segment.offset + 0];
        ASSERT_EQ(cluster0.count, 2);
        EXPECT_EQ(clustering.clusterItems[cluster0.offset + 0], expectedFirstItem + 0);
        EXPECT_EQ(clustering.clusterItems[cluster0.offset + 1], expectedFirstItem + 2);
        const cluster1: Range = clustering.clusterRanges[segment.offset + 1];
        ASSERT_EQ(cluster1.count, 2);
        EXPECT_EQ(clustering.clusterItems[cluster1.offset + 0], segments[segmentIndex].offset + 1);
        EXPECT_EQ(clustering.clusterItems[cluster1.offset + 1], segments[segmentIndex].offset + 3);
    }
}


// Icosahedron data.
class icosahedron {
    public static X = 0.525731112119133606;
    public static Z = 0.850650808352039932;
    public static positions = [
        new vec3(-icosahedron.X, 0.0, icosahedron.Z),
        new vec3(icosahedron.X, 0.0, icosahedron.Z),
        new vec3(-icosahedron.X, 0.0, -icosahedron.Z),
        new vec3(icosahedron.X, 0.0, -icosahedron.Z),
        new vec3(0.0, icosahedron.Z, icosahedron.X),
        new vec3(0.0, icosahedron.Z, -icosahedron.X),
        new vec3(0.0, -icosahedron.Z, icosahedron.X),
        new vec3(0.0, -icosahedron.Z, -icosahedron.X),
        new vec3(icosahedron.Z, icosahedron.X, 0.0),
        new vec3(-icosahedron.Z, icosahedron.X, 0.0),
        new vec3(icosahedron.Z, -icosahedron.X, 0.0),
        new vec3(-icosahedron.Z, -icosahedron.X, 0.)
    ];
    public static triangles: vec3[] = [
        new vec3(0, 4, 1), new vec3(0, 9, 4), new vec3(9, 5, 4), new vec3(4, 5, 8), new vec3(4, 8, 1),
        new vec3(8, 10, 1), new vec3(8, 3, 10), new vec3(5, 3, 8), new vec3(5, 2, 3), new vec3(2, 7, 3),
        new vec3(7, 10, 3), new vec3(7, 6, 10), new vec3(7, 11, 6), new vec3(11, 0, 6), new vec3(0, 1, 6),
        new vec3(6, 1, 10), new vec3(9, 0, 11), new vec3(9, 11, 2), new vec3(9, 2, 5), new vec3(7, 2, 11)
    ];
}

class GeometryMesh {
    public triangles: vec3[] = [];
    public positions: vec3[] = [];

    constructor(triangles: vec3[], positions: vec3[]) {
        this.triangles = triangles;
        this.positions = positions;
    }
};

// Normalizes a vec3.
function normalize(v: vec3): vec3 {
    const lengthSquared: number = v.x * v.x + v.y * v.y + v.z * v.z;
    const factor: number = (lengthSquared == 0.0) ? 1.0 : (1.0 / Math.sqrt(lengthSquared));
    return mul(v, factor);
}

// Recursively subdivides a triangle on a sphere by a factor of 2^depth.
// Calls the callback function on each new triangle.
function subdivide(v0: vec3, v1: vec3, v2: vec3, depth: number, callback: Function) {
    if (depth == 0) {
        callback(v0, v1, v2);
    }
    else {
        const v01: vec3 = normalize(add(v0, v1));
        const v12: vec3 = normalize(add(v1, v2));
        const v20: vec3 = normalize(add(v2, v0));
        subdivide(v0, v01, v20, depth - 1, callback);
        subdivide(v1, v12, v01, depth - 1, callback);
        subdivide(v2, v20, v12, depth - 1, callback);
        subdivide(v01, v12, v20, depth - 1, callback);
    }
}

// Computes the axis-aligned bounding box of a triangle with the given indices.
function aabb(triangle: vec3, positions: vec3[]): AABB {
    let result: AABB = new AABB();
    let vertex: vec3 = positions[triangle[0]];

    result.bboxMin[0] = vertex.x; result.bboxMin[1] = vertex.y; result.bboxMin[2] = vertex.z;
    result.bboxMax[0] = vertex.x; result.bboxMax[1] = vertex.y; result.bboxMax[2] = vertex.z;

    for (let i = 1; i < 3; i++) {
        vertex = positions[triangle[i]];
        result.bboxMin[0] = Math.min(result.bboxMin[0], vertex.x);
        result.bboxMin[1] = Math.min(result.bboxMin[1], vertex.y);
        result.bboxMin[2] = Math.min(result.bboxMin[2], vertex.z);

        result.bboxMax[0] = Math.min(result.bboxMax[0], vertex.x);
        result.bboxMax[1] = Math.min(result.bboxMax[1], vertex.y);
        result.bboxMax[2] = Math.min(result.bboxMax[2], vertex.z);
    }
    return result;
}

// Makes an icosphere with 20 * (4^depth) triangles.
function makeIcosphereCB(depth: number, callback: Function) {
    for (let i = 0; i < icosahedron.triangles.length; i++) {
        const v0 = icosahedron.positions[icosahedron.triangles[i].x];
        const v1 = icosahedron.positions[icosahedron.triangles[i].y];
        const v2 = icosahedron.positions[icosahedron.triangles[i].z];
        subdivide(v0, v1, v2, depth, callback);
    }
}

function makeIcosphere(subdivision: number): GeometryMesh {
    const vertexCache: Map<vec3, number> = new Map();
    let triangles: vec3[] = [];
    // Our triangle callback function tries to place each of the vertices in the
    // vertex cache; each of the `it` iterators point to the existing value if
    // the vertex was already in the cache, or to a new value at the end of the
    // cache if it's a new vertex.
    // const callback = (v0: vec3, v1: vec3, v2: vec3) => {
    //     const it0 = {key: v0, value: vertexCache.size};
    //     vertexCache.set(it0.key, it0.value);
    //     const it1 = {key: v1, value: vertexCache.size};
    //     vertexCache.set(it1.key, it1.value);
    //     const it2 = {key: v2, value: vertexCache.size};
    //     vertexCache.set(it2.key, it2.value);
    //     triangles.push(new vec3(it0.value, it1.value, it2.value));
    //     debugger;
    // };

    const callback = (v0: vec3, v1: vec3, v2: vec3) => {
        // Helper function to add a vertex if it isn’t already in the cache.
        function addVertex(v: vec3): number {
            if (vertexCache.has(v)) {
                return vertexCache.get(v)!;
            } else {
                const index = vertexCache.size;
                vertexCache.set(v, index);
                return index;
            }
        }

        const i0 = addVertex(v0);
        const i1 = addVertex(v1);
        const i2 = addVertex(v2);
        triangles.push(new vec3(i0, i1, i2));
    };


    makeIcosphereCB(subdivision, callback);
    let positions: vec3[] = new Array(vertexCache.size).fill(null).map(() => new vec3());
    for (const [position, index] of vertexCache) {
        positions[index] = position;
    }
    return new GeometryMesh(triangles, positions);
}

function TEST_ClustersTestSizes() {
    const mesh: GeometryMesh = makeIcosphere(3);

    let boundingBoxes: AABB[] = new Array(mesh.triangles.length).fill(null).map(() => new AABB());
    for (let i = 0; i < mesh.triangles.length; i++) {
        boundingBoxes[i] = aabb(mesh.triangles[i], mesh.positions);
    }

    let centroids: vec3[] = new Array(boundingBoxes.length).fill(null).map(() => new vec3());
    for (let i = 0; i < boundingBoxes.length; i++) {
        centroids[i] = centroid(boundingBoxes[i]);
    }

    let spatialElements: SpatialElements = new SpatialElements();
    spatialElements.boundingBoxes = boundingBoxes;
    spatialElements.centroids = vec3_to_number(centroids);
    spatialElements.elementCount = boundingBoxes.length;
    debugger;
    for (let sizeMax = 1; sizeMax < 10; ++sizeMax) {
        // SCOPED_TRACE("Exact size: " + std:: to_string(sizeMax));
        let input: Input = new Input();
        input.config = {
            minClusterSize: sizeMax,
            maxClusterSize: sizeMax,
            costUnderfill: 0.0,
            costOverlap: 0.0,
            preSplitThreshold: 0
        };
        input.spatialElements = spatialElements;
        // input.graph           = nullptr;

        let clustering: ClusterStorage = new ClusterStorage();
        let result: ResultNVCluster = generateClusters(input, clustering);
        ASSERT_EQ(result, Result.SUCCESS);

        // We requested that all clusters have `sizeMax` triangles. When
        // mesh.triangle.size() isn't a multiple of `sizeMax`, though, there'll be
        // one cluster with the remaining triangles. So the minimum cluster size
        // should be
        let expectedMin = mesh.triangles.length % sizeMax;
        if (expectedMin == 0) expectedMin = sizeMax;
        // And the largest cluster should have size `sizeMax`.
        // Let's test that's true:
        let trueMinSize = Infinity, trueMaxSize = 0;
        for (const cluster of clustering.clusterRanges) {
            trueMinSize = Math.min(trueMinSize, cluster.count);
            trueMaxSize = Math.max(trueMaxSize, cluster.count);
        }

        EXPECT_EQ(expectedMin, trueMinSize);
        EXPECT_EQ(sizeMax, trueMaxSize);

        console.log("Even though this passes it doesn't match the cpp version");
    }
}

function TEST_PreSplit() {
    const preSplitThreshold = 1000;
    const mesh: GeometryMesh = makeIcosphere(3);
    // Make sure we'll pre-split at least once:
    EXPECT_GT(mesh.triangles.length, preSplitThreshold);

    let boundingBoxes: AABB[] = new Array(mesh.triangles.length);
    for (let i = 0; i < mesh.triangles.length; i++) {
        boundingBoxes[i] = aabb(mesh.triangles[i], mesh.positions);
    }

    let centroids: vec3[] = new Array(boundingBoxes.length);
    for (let i = 0; i < boundingBoxes.length; i++) {
        centroids[i] = centroid(boundingBoxes[i]);
    }

    let spatialElements: SpatialElements = new SpatialElements();
    spatialElements.boundingBoxes = boundingBoxes;
    spatialElements.centroids = vec3_to_number(centroids);
    spatialElements.elementCount = boundingBoxes.length;
    const input = new Input();
    input.config = {
        minClusterSize: 100,
        maxClusterSize: 100,
        costUnderfill: 0.0,
        costOverlap: 0.0,
        preSplitThreshold: preSplitThreshold,
    },
        input.spatialElements = spatialElements;
    // input.graph = nullptr;
    const clustering = new ClusterStorage();
    let result: ResultNVCluster = generateClusters(input, clustering);
    ASSERT_EQ(result, ResultNVCluster.SUCCESS);

    // Validate all items exist and are unique
    const uniqueItems = new Set<number>(clustering.clusterItems);
    EXPECT_EQ(uniqueItems.size, clustering.clusterItems.length);

    // Validate all items are covered by a range exactly once
    let itemClusterCounts: number[] = new Array(clustering.clusterItems.length).fill(0);
    for (const range of clustering.clusterRanges) {
        for (let i = range.offset; i < range.offset + range.count; i++) {
            itemClusterCounts[i]++;
        }
    }

    // Is every element in `itemClusterCounts` equal to 1?
    // EXPECT_EQ(std::set(itemClusterCounts.begin(), itemClusterCounts.end()), std::set<uint32_t>{1});
    for (let i = 0; i < itemClusterCounts.length; i++) {
        EXPECT_EQ(itemClusterCounts[i], 1);
    }

    // Validate most sizes are the maximum
    let clusterSizeCounts: { [key: number]: number } = {};  // cluster size -> number of clusters with that size
    for (const range of clustering.clusterRanges) {
        if (!clusterSizeCounts[range.count]) clusterSizeCounts[range.count] = 0;
        clusterSizeCounts[range.count]++;
    }

    // This number of clusters had the maximum size:
    const maxSizedCount = clusterSizeCounts[input.config.maxClusterSize];
    // This number of clusters were undersized:
    const undersizedCount = clustering.clusterRanges.length - maxSizedCount;
    // There should be at most this number of undersized clusters.
    // That is, there are ceil(mesh.triangles.size() / preSplitThreshold)
    // sets after pre-splitting. Each set should generate at most 1 undersized cluster.
    const expectedUndersized = Math.floor((mesh.triangles.length + preSplitThreshold - 1) / preSplitThreshold);

    EXPECT_LE(undersizedCount, expectedUndersized);
    EXPECT_GE(maxSizedCount, clustering.clusterRanges.length - expectedUndersized);
}

TEST_Simple2x2();
TEST_Simple2x2Weights();
TEST_Segmented2x2();
TEST_ClustersTestSizes();
TEST_PreSplit();