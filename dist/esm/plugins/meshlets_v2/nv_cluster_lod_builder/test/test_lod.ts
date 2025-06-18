import { Meshoptimizer } from "../meshoptimizer/Meshoptimizer";
import { AABB, Range } from "../nvcluster";
import { HierarchyInput, Node } from "../nvcluster_hierarchy";
import { Result, Sphere, assert, pixelErrorToQuadricErrorOverDistance, quadricErrorOverDistanceToPixelError } from "../nvclusterlod_common";
import { LodHierarchy, generateLodHierarchy } from "../nvclusterlod_hierarchy_storage";
import { MeshInput, ORIGINAL_MESH_GROUP, uvec3, vec3 } from "../nvclusterlod_mesh";
import { GroupGeneratingGroups, LocalizedLodMesh, generateGroupGeneratingGroups, generateLocalizedLodMesh } from "../nvclusterlod_mesh_storage";
import { add, mul, ASSERT_EQ, vec3_to_number, length, lengthSquared, sub, EXPECT_TRUE, normalize, mat4, EXPECT_FALSE, EXPECT_NEAR } from "./test_common";

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
    public triangles: uvec3[] = [];
    public positions: vec3[] = [];

    constructor(triangles: uvec3[], positions: vec3[]) {
        this.triangles = triangles;
        this.positions = positions;
    }
};

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

type triangle_callback = (v0: vec3, v1: vec3, v2: vec3) => void;

function makeIcosphereWithCallback(
    depth: number,
    callback: triangle_callback
): void {
    for (let i = 0; i < icosahedron.triangles.length; i++) {
        const tri = icosahedron.triangles[i];
        const v0 = icosahedron.positions[tri[0]];
        const v1 = icosahedron.positions[tri[1]];
        const v2 = icosahedron.positions[tri[2]];
        subdivide(v0, v1, v2, depth, callback);
    }
}

// Makes an icosphere mesh with the given subdivision level.
function makeIcosphere(subdivision: number): GeometryMesh {
    // We'll use a Map to cache vertices. We use the string produced by vec3.toKey() as the key.
    const vertexCache = new Map<string, number>();
    const vertices: vec3[] = [];
    const trianglesArray: uvec3[] = [];

    // Helper function: get the index of a vertex, adding it if it doesn't exist.
    function getOrCreateIndex(v: vec3): number {
        const key = `${v.x.toFixed(9)},${v.y.toFixed(9)},${v.z.toFixed(9)}`;
        if (vertexCache.has(key)) {
            return vertexCache.get(key)!;
        } else {
            const index = vertices.length;
            const p = 4;
            vertices.push(new vec3(parseFloat(v.x.toPrecision(p)), parseFloat(v.y.toPrecision(p)), parseFloat(v.z.toPrecision(p))));
            vertexCache.set(key, index);
            return index;
        }
    }

    // Define our callback that builds triangles from subdivided vertices.
    const callback: triangle_callback = (v0, v1, v2) => {
        const index0 = getOrCreateIndex(v0);
        const index1 = getOrCreateIndex(v1);
        const index2 = getOrCreateIndex(v2);
        trianglesArray.push(new uvec3(index0, index1, index2));
    };

    // Generate the icosphere.
    makeIcosphereWithCallback(subdivision, callback);
    return { triangles: trianglesArray, positions: vertices };
}

function getSpherePosition(sphere: Sphere): vec3 {
    return new vec3(sphere.x, sphere.y, sphere.z);
}

// Returns whether `inner` is inside or equal to `outer`.
function isInside(inner: Sphere, outer: Sphere): boolean {
    const radiusDifference = outer.radius - inner.radius;
    return (radiusDifference >= 0.0)  // if this is negative then `inner` cannot be inside `outer`
        && lengthSquared(sub(getSpherePosition(inner), getSpherePosition(outer))) <= radiusDifference * radiusDifference;
}

// Verifies that for this node:
// - if it is a leaf node, each cluster's bounding sphere is contained within
//   the node's bounding sphere.
// - if it is an internal node, each child's bounding sphere is contained
//   within the node's bounding sphere.
function verifyNodeRecursive(m: LocalizedLodMesh, h: LodHierarchy, node: Node) {
    if (node.clusters && node.clusters.isLeafNode === 1) {
        // Verify real cluster bounding spheres
        // TODO: cluster bounding spheres in hierarchy are not bounding spheres of
        // the cluster, but bounding spheres of the cluster's generating group.
        const clusterRange: Range = m.lodMesh.groupClusterRanges[node.clusters.group];
        for (let i = 0; i < clusterRange.count; i++) {
            const clusterSphere: Sphere = m.lodMesh.clusterBoundingSpheres[clusterRange.offset + i];
            // #if 0  // For debugging
            //           printf("A = Sphere((%f, %f, %f), %f)\n", node.boundingSphere.x, node.boundingSphere.y, node.boundingSphere.z, node.boundingSphere.radius);
            //           printf("B = Sphere((%f, %f, %f), %f)\n", clusterSphere.x, clusterSphere.y, clusterSphere.z, clusterSphere.radius);
            //           assert(isInside(clusterSphere, node.boundingSphere));
            // #endif
            EXPECT_TRUE(isInside(clusterSphere, node.boundingSphere));
        }
    }
    else if (node.children) {
        for (let i = 0; i <= node.children.childCountMinusOne; i++) {
            const child: Node = h.nodes[node.children.childOffset + i];
            console.log(child.boundingSphere, node.boundingSphere)
            assert(isInside(child.boundingSphere, node.boundingSphere));
            EXPECT_TRUE(isInside(child.boundingSphere, node.boundingSphere));
            verifyNodeRecursive(m, h, child);
        }
    }
    else {
        // console.warn("Node: ", node)
        throw Error("Node doesn't have clusters or children");
    }
}

function transformPoint(t: mat4, point: vec3): vec3 {
    let result: vec3 = new vec3(t.columns[3][0], t.columns[3][1], t.columns[3][2]);
    for (let i = 0; i < 3; i++) {
        for (let row = 0; row < 3; row++) {
            result[row] += t.columns[i][row] * point[i];
        }
    }
    return result;
}

function createSeededRNG(seed) {
    // Parameters for a simple LCG (same as used in some C libraries)
    const m = 0x80000000; // 2^31
    const a = 1103515245;
    const c = 12345;
    let state = seed;

    return function () {
        state = (a * state + c) % m;
        return state / m;
    };
}

const rng = createSeededRNG(123);
const rng_max = 0x80000000 - 1;

// // Random number generator.
// std::default_random_engine rng(123);
// Returns a uniform random point on a sphere.
function randomPointOnSphere(sphere: Sphere): vec3 {
    // From https://www.pbr-book.org/4ed/Sampling_Algorithms/Sampling_Multidimensional_Functions#UniformlySamplingHemispheresandSpheres

    // Random Z coordinate on a unit sphere, in the range [-1, 1].
    const z = 1.0 - 2.0 * ((rng()) / (rng_max));
    // Choose a random point on the surface of the sphere at this z coordinate:
    const r = Math.sqrt(1.0 - z * z);
    const phi = 2.0 * Math.PI * ((rng()) / (rng_max));
    const randomOnUnitSphere: vec3 = new vec3(r * Math.cos(phi), r * Math.sin(phi), z);
    // Now scale and translate this.
    return add(getSpherePosition(sphere), mul(randomOnUnitSphere, sphere.radius));
}

function generatingSphere(groupSpheres: Sphere[], generatingGroupIndex: number): Sphere {
    return (generatingGroupIndex == ORIGINAL_MESH_GROUP) ? new Sphere() : groupSpheres[generatingGroupIndex];
}

function generatingError(groupErrors: number[], generatingGroupIndex: number): number {
    return (generatingGroupIndex == ORIGINAL_MESH_GROUP) ? 0.0 : groupErrors[generatingGroupIndex];
}

// Computes the conservative maximum arcsine of any geometric error relative to
// the camera, where 'transform' defines a transformation to eye-space.
function conservativeErrorOverDistance(transform: mat4, boundingSphere: Sphere, objectSpaceQuadricError: number): number {
    const radiusScale = 1.0;
    const maxError = objectSpaceQuadricError * radiusScale;
    const sphereDistance = length(transformPoint(transform, getSpherePosition(boundingSphere)));
    const errorDistance = Math.max(maxError, sphereDistance - boundingSphere.radius * radiusScale);
    return maxError / errorDistance;
}

function traverseChild1(viewInstanceTransform: mat4, node: Node, errorOverDistanceThreshold: number): boolean {
    return conservativeErrorOverDistance(viewInstanceTransform, node.boundingSphere, node.maxClusterQuadricError) >= errorOverDistanceThreshold;
}

function renderCluster1(viewInstanceTransform: mat4, quadricError: number, boundingSphere: Sphere, errorOverDistanceThreshold: number): boolean {
    return conservativeErrorOverDistance(viewInstanceTransform, boundingSphere, quadricError) < errorOverDistanceThreshold;
}

function traverseChild2(cameraPosition: vec3, node: Node, errorOverDistanceThreshold: number): boolean {
    return traverseChild1(mat4.makeTranslation(mul(cameraPosition, -1.0)), node, errorOverDistanceThreshold);
}

function renderCluster2(cameraPosition: vec3, quadricError: number, boundingSphere: Sphere, errorOverDistanceThreshold: number): boolean {
    return renderCluster1(mat4.makeTranslation(mul(cameraPosition, -1.0)), quadricError, boundingSphere, errorOverDistanceThreshold);
}

// Checks that there can be no overlapping geometry given two clusters from
// different LOD levels that represent the same surfcae. See renderCluster().
function verifyMutuallyExclusive(m: LocalizedLodMesh, h: LodHierarchy, cluster0: number, node0: Node, cluster1: number, node1: Node) {
    const cluster0Sphere: Sphere = generatingSphere(h.groupCumulativeBoundingSpheres, m.lodMesh.clusterGeneratingGroups[cluster0]);
    const cluster1Sphere: Sphere = generatingSphere(h.groupCumulativeBoundingSpheres, m.lodMesh.clusterGeneratingGroups[cluster1]);
    const cluster0QuadricError: number = generatingError(h.groupCumulativeQuadricError, m.lodMesh.clusterGeneratingGroups[cluster0]);
    const cluster1QuadricError: number = generatingError(h.groupCumulativeQuadricError, m.lodMesh.clusterGeneratingGroups[cluster1]);

    const errorOverDistanceThreshold: number = 0.9999;  // near worst case

    for (let i = 0; i < 10; ++i) {
        const testCameraPos: vec3 = randomPointOnSphere(node0.boundingSphere);
        const begin0: boolean = traverseChild2(testCameraPos, node0, errorOverDistanceThreshold);
        const begin1: boolean = traverseChild2(testCameraPos, node1, errorOverDistanceThreshold);
        const end0: boolean = !renderCluster2(testCameraPos, cluster0QuadricError, cluster0Sphere, errorOverDistanceThreshold);
        const end1: boolean = !renderCluster2(testCameraPos, cluster1QuadricError, cluster1Sphere, errorOverDistanceThreshold);
        const bothVisible: boolean = begin0 && !end0 && begin1 && !end1;
        EXPECT_FALSE(bothVisible);
    }
}

// GoogleTest does not offer any nice way to share data between tests. Since the
// test data takes some time to generate, everything is just in one giant test.
async function TEST_HierarchyTest_Everything() {
    const icosphere: GeometryMesh = makeIcosphere(6);
    const meshInput: MeshInput = new MeshInput();
    // Mesh data
    meshInput.indices = new Uint32Array(vec3_to_number(icosphere.triangles));
    meshInput.indexCount = 3 * icosphere.triangles.length;
    meshInput.vertices = new Float32Array(vec3_to_number(icosphere.positions));
    meshInput.vertexOffset = 0;
    meshInput.vertexCount = icosphere.positions.length;
    meshInput.vertexStride = 3; //sizeof(vec3),
    // Cluster configuration -- here we force clusters of size 32:
    meshInput.clusterConfig = {
        minClusterSize: 32,
        maxClusterSize: 32,
        costUnderfill: 0.9,
        costOverlap: 0.5,
        preSplitThreshold: 1 << 17,
    };
    // Cluster group configuration -- here we force groups of size 32:
    meshInput.groupConfig = {
        minClusterSize: 32,
        maxClusterSize: 32,
        costUnderfill: 0.5,
        costOverlap: 0.0,
        preSplitThreshold: 0,
    };
    // Decimation factor
    meshInput.decimationFactor = 0.5;

    await Meshoptimizer.load();
    const mesh: LocalizedLodMesh = new LocalizedLodMesh();
    let result: Result = generateLocalizedLodMesh(meshInput, mesh);
    ASSERT_EQ(result, Result.SUCCESS);

    const hierarchyInput: HierarchyInput = new HierarchyInput()
    hierarchyInput.clusterGeneratingGroups = mesh.lodMesh.clusterGeneratingGroups;
    hierarchyInput.groupQuadricErrors = mesh.lodMesh.groupQuadricErrors;
    hierarchyInput.groupClusterRanges = mesh.lodMesh.groupClusterRanges;
    hierarchyInput.groupCount = mesh.lodMesh.groupClusterRanges.length;
    hierarchyInput.clusterBoundingSpheres = mesh.lodMesh.clusterBoundingSpheres;
    hierarchyInput.clusterCount = mesh.lodMesh.clusterBoundingSpheres.length;
    hierarchyInput.lodLevelGroupRanges = mesh.lodMesh.lodLevelGroupRanges;
    hierarchyInput.lodLevelCount = mesh.lodMesh.lodLevelGroupRanges.length;
    hierarchyInput.minQuadricErrorOverDistance = 0.001;
    hierarchyInput.conservativeBoundingSpheres = false;

    const hierarchy: LodHierarchy = new LodHierarchy();
    result = generateLodHierarchy(hierarchyInput, hierarchy);
    ASSERT_EQ(result, Result.SUCCESS);

    verifyNodeRecursive(mesh, hierarchy, hierarchy.nodes[0]);

    // Build sets of generating groups that contributed clusters for decimation
    // into each group.
    let groupGeneratingGroups: GroupGeneratingGroups = new GroupGeneratingGroups();
    result = generateGroupGeneratingGroups(mesh.lodMesh.groupClusterRanges, mesh.lodMesh.clusterGeneratingGroups, groupGeneratingGroups);
    ASSERT_EQ(result, Result.SUCCESS);

    let clusterNodes: number[] = new Array(mesh.lodMesh.clusterTriangleRanges.length).fill(0);
    for (let nodeIndex = 0; nodeIndex < hierarchy.nodes.length; ++nodeIndex) {
        if (hierarchy.nodes[nodeIndex] && hierarchy.nodes[nodeIndex].clusters && hierarchy.nodes[nodeIndex].clusters.isLeafNode === 1) {
            const clusterIndices: Range = mesh.lodMesh.groupClusterRanges[hierarchy.nodes[nodeIndex].clusters.group];
            for (let i = clusterIndices.offset; i < clusterIndices.offset + clusterIndices.count; i++) {
                clusterNodes[i] = nodeIndex;
            }
        }
    }

    // Verify that each cluster's generating group's generating groups do not have
    // any clusters that can be drawn at the same time. Reverse order as the last
    // few low-detail clusters are where the interesting cases are.

    // Loop from mesh.lodMesh.groupClusterRanges.size() - 1 to 0.
    for (let groupIndex = mesh.lodMesh.groupClusterRanges.length; (groupIndex--) > 0;) {
        const groupClusterRange: Range = mesh.lodMesh.groupClusterRanges[groupIndex];
        for (let clusterIndex = groupClusterRange.offset; clusterIndex < groupClusterRange.offset + groupClusterRange.count; clusterIndex++) {
            const generatingGroupIndex = mesh.lodMesh.clusterGeneratingGroups[clusterIndex];
            if (generatingGroupIndex == ORIGINAL_MESH_GROUP) continue;
            for (let generatingGeneratingGroupIndex of groupGeneratingGroups.get(generatingGroupIndex)) {
                let lastNode = 0xffffffff;  // Initialize to some value that doesn't appear in clusterNodes
                const generatingGeneratingClusterRange: Range = mesh.lodMesh.groupClusterRanges[generatingGeneratingGroupIndex];
                for (let i = 0; i < generatingGeneratingClusterRange.count; i++) {
                    const generatingGeneratingClusterIndex = generatingGeneratingClusterRange.offset + i;
                    // Skip clusters with the same nodes. The child node is a primary
                    // interest. Faster testing at the expense of a few less test cases that
                    // are near identical.
                    if (clusterNodes[generatingGeneratingClusterIndex] == lastNode) continue;
                    lastNode = clusterNodes[generatingGeneratingClusterIndex];

                    verifyMutuallyExclusive(mesh, hierarchy, clusterIndex, hierarchy.nodes[clusterNodes[clusterIndex]],
                        generatingGeneratingClusterIndex,
                        hierarchy.nodes[clusterNodes[generatingGeneratingClusterIndex]]);
                }
            }
        }
    }
}

async function TEST_Hierarchy_AngularError() {
    {
        // Test with some hard coded ballpark-real values
        const fov = Math.PI * 0.5;
        const qeod = pixelErrorToQuadricErrorOverDistance(1.0, fov, 2048.0);
        EXPECT_NEAR(qeod, 0.0004, 0.0001);
        EXPECT_NEAR(quadricErrorOverDistanceToPixelError(qeod, fov, 2048.0), 1.0, 1e-10);
    }

    // Verify the reverse mapping works for many values
    const fovValues: number[] = [Math.PI * 0.05, Math.PI * 0.3, Math.PI * 0.5, Math.PI * 0.7];
    const pixelValues: number[] = [0.5, 1.0, 10.0, 100.0, 1000.0];
    for (const fov of fovValues) {
        for (const errorSize of pixelValues) {
            // TODO: would be nice if the precision were a bit better even for the
            // more extreme values
            const qeod = pixelErrorToQuadricErrorOverDistance(errorSize, fov, 2048.0);
            EXPECT_NEAR(quadricErrorOverDistanceToPixelError(qeod, fov, 2048.0), errorSize, 1e-4);
        }
    }
}

TEST_HierarchyTest_Everything();
TEST_Hierarchy_AngularError();