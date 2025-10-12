import { Meshoptimizer, meshopt_Bounds, meshopt_Meshlet } from "./meshoptimizer/Meshoptimizer";
import { HierarchyInput } from "./nvcluster_hierarchy";
import { Result, Sphere } from "./nvclusterlod_common";
import { LodHierarchy, generateLodHierarchy } from "./nvclusterlod_hierarchy_storage";
import { MeshInput } from "./nvclusterlod_mesh";
import { LocalizedLodMesh, generateLocalizedLodMesh } from "./nvclusterlod_mesh_storage";
import { Range } from "./nvcluster";

await Meshoptimizer.load();

interface Cone {
	/* normal cone, useful for backface culling */
	apex: [number, number, number]; // float cone_apex[3];
	axis: [number, number, number]; // float cone_axis[3];
	cutoff: number; // float cone_cutoff; /* = cos(angle/2) */
};
export interface Bounds {
    /* bounding sphere, useful for frustum and occlusion culling */
	center: [number, number, number]; // float center[3];
	radius: number; // float radius;
}

export interface Meshlet extends meshopt_Meshlet {
    cone: Cone;
    bounds: Bounds;
    parentBounds: Bounds;
    error: number;
    parentError: number;
};

export interface LodMeshlet {
    lod: number;
    interleavedVertices: Float32Array;
    vertices: Uint32Array;
    indices: Uint8Array;
    meshlets: Meshlet[];
};

export function computeMeshletBounds(meshlet: meshopt_Meshlet, meshlet_vertices: Uint32Array, meshlet_triangles: Uint8Array, vertex_positions: Float32Array, vertex_positions_stride: number): meshopt_Bounds {
    // WASM doesnt work with array pointers, do this to prevent passing large data for every meshlet
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

// Helper to pack one cluster (meshlet) into meshoptimizer-compatible buffers
function packClusterToMeshlet(
    clusterGlobalTriangleIndices: number[], // flat [g0,g1,g2, g3,g4,g5, ...] (0-based global vertex indices)
    globalToLocalScratch?: Map<number, number>
): { localVertexList: number[]; localTriangleTriplets: number[] } {
    const globalToLocal = globalToLocalScratch ?? new Map<number, number>();
    const localVertexList: number[] = [];
    const localTriangleTriplets: number[] = [];

    // Clear the map if we re-use it
    if (globalToLocalScratch) globalToLocalScratch.clear();

    // Remap globals -> compact locals
    for (let i = 0; i < clusterGlobalTriangleIndices.length; i += 3) {
        const g0 = clusterGlobalTriangleIndices[i + 0];
        const g1 = clusterGlobalTriangleIndices[i + 1];
        const g2 = clusterGlobalTriangleIndices[i + 2];

        // ensure mapping exists
        let l0 = globalToLocal.get(g0);
        if (l0 === undefined) { l0 = localVertexList.length; globalToLocal.set(g0, l0); localVertexList.push(g0); }

        let l1 = globalToLocal.get(g1);
        if (l1 === undefined) { l1 = localVertexList.length; globalToLocal.set(g1, l1); localVertexList.push(g1); }

        let l2 = globalToLocal.get(g2);
        if (l2 === undefined) { l2 = localVertexList.length; globalToLocal.set(g2, l2); localVertexList.push(g2); }

        // meshoptimizer's triangle index stream is uint8 local indices; enforce limits here
        if (l0 > 255 || l1 > 255 || l2 > 255) {
            throw new Error(`Meshlet vertex count exceeded 255 (got ${localVertexList.length}). Consider generating smaller clusters or splitting.`);
        }

        localTriangleTriplets.push(l0, l1, l2);
    }

    return { localVertexList, localTriangleTriplets };
}

export class NV_Cluster {
    public static BuildToMeshlets(input: MeshInput): LodMeshlet[] {
        if (!Meshoptimizer.isLoaded) throw Error("Mesh optimizer is not loaded");

        // 1) Generate your existing localized LOD mesh
        const localized: LocalizedLodMesh = new LocalizedLodMesh();
        const res: Result = generateLocalizedLodMesh(input, localized);
        if (res !== Result.SUCCESS) throw Error("Error: " + Result[res]);

        // 2) Build hierarchy (unchanged; not strictly needed for packing, but you may still want it elsewhere)
        const hi: HierarchyInput = new HierarchyInput();
        hi.clusterGeneratingGroups = localized.lodMesh.clusterGeneratingGroups;
        hi.groupQuadricErrors = localized.lodMesh.groupQuadricErrors;
        hi.groupClusterRanges = localized.lodMesh.groupClusterRanges;
        hi.groupCount = localized.lodMesh.groupClusterRanges.length;
        hi.clusterBoundingSpheres = localized.lodMesh.clusterBoundingSpheres;
        hi.clusterCount = localized.lodMesh.clusterBoundingSpheres.length;
        hi.lodLevelGroupRanges = localized.lodMesh.lodLevelGroupRanges;
        hi.lodLevelCount = localized.lodMesh.lodLevelGroupRanges.length;

        const hierarchy: LodHierarchy = new LodHierarchy();
        generateLodHierarchy(hi, hierarchy);

        // 3) For each LOD, pack all clusters into one LodMeshlet container
        const lodCount = localized.lodMesh.lodLevelGroupRanges.length;
        const lodOutputs: LodMeshlet[] = [];

        // Prefer an interleaved stream if you have it; otherwise pass the raw vertices
        // (Adjust this to your actual input shape)
        const interleaved = (input as any).interleavedVertices as Float32Array | undefined;
        const interleavedVertices: Float32Array = interleaved ?? (input.vertices as Float32Array);

        for (let lod = 0; lod < lodCount; lod++) {
            const groupRange: Range = localized.lodMesh.lodLevelGroupRanges[lod];

            // These grow as we append meshlets within this LOD
            const meshlets: Meshlet[] = [];
            const allLocalVertices: number[] = [];   // concatenated local vertex lists (global indices)
            const allLocalTriangles: number[] = [];  // concatenated local triangle triplets (uint8-able)

            // Reuse a small map to avoid re-alloc per cluster
            const scratchMap = new Map<number, number>();

            for (let groupIndex = groupRange.offset; groupIndex < groupRange.offset + groupRange.count; groupIndex++) {
                const clusterRange: Range = localized.lodMesh.groupClusterRanges[groupIndex];

                for (let clusterIndex = clusterRange.offset; clusterIndex < clusterRange.offset + clusterRange.count; clusterIndex++) {
                    const triRange: Range = localized.lodMesh.clusterTriangleRanges[clusterIndex];
                    const vertRange: Range = localized.clusterVertexRanges[clusterIndex];
                    const clusterVertexGlobalIndices: number[] = localized.vertexGlobalIndices.slice(vertRange.offset, vertRange.offset + vertRange.count);

                    // gather global triangle indices for this cluster
                    const clusterGlobalTris: number[] = [];
                    for (let triangleIndex = triRange.offset; triangleIndex < triRange.offset + triRange.count; triangleIndex++) {
                        const localIndex0 = localized.lodMesh.triangleVertices[3 * triangleIndex + 0];
                        const localIndex1 = localized.lodMesh.triangleVertices[3 * triangleIndex + 1];
                        const localIndex2 = localized.lodMesh.triangleVertices[3 * triangleIndex + 2];

                        // map local->global (NO +1 here; keep 0-based)
                        const globalIndex0 = clusterVertexGlobalIndices[localIndex0];
                        const globalIndex1 = clusterVertexGlobalIndices[localIndex1];
                        const globalIndex2 = clusterVertexGlobalIndices[localIndex2];

                        clusterGlobalTris.push(globalIndex0, globalIndex1, globalIndex2);
                    }

                    // Pack the cluster into meshoptimizer meshlet buffers
                    const vertex_offset = allLocalVertices.length;
                    const triangle_offset = allLocalTriangles.length;

                    const { localVertexList, localTriangleTriplets } = packClusterToMeshlet(clusterGlobalTris, scratchMap);

                    // Append to LOD-level arrays
                    allLocalVertices.push(...localVertexList);
                    allLocalTriangles.push(...localTriangleTriplets);

                    const vertex_count = localVertexList.length;
                    const triangle_count = (localTriangleTriplets.length / 3) | 0;

                    // Sanity: meshoptimizer triangle index stream must be uint8
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

                    const meshlet: meshopt_Meshlet = { vertex_offset: 0, triangle_offset: 0, vertex_count: vertex_count, triangle_count: triangle_count };
                    const bounds = computeMeshletBounds(meshlet, new Uint32Array(localVertexList), new Uint8Array(localTriangleTriplets), interleavedVertices, 8);
                    meshlets.push({
                        vertex_offset: vertex_offset,
                        triangle_offset: triangle_offset,
                        vertex_count: vertex_count,
                        triangle_count: triangle_count,
                        cone: {apex: bounds.cone_apex, axis: bounds.cone_axis, cutoff: bounds.cone_cutoff},
                        bounds: { center: [boundingSphere.x, boundingSphere.y, boundingSphere.z], radius: boundingSphere.radius},
                        parentBounds: { center: [parentBoundingSphere.x, parentBoundingSphere.y, parentBoundingSphere.z], radius: parentBoundingSphere.radius},
                        error: error,
                        parentError: parentError
                    });

                    // (Optional) diagnostics
                    // console.log(`LOD ${lod} G${g} C${c} -> VtxOff ${vertex_offset}, TriOff ${triangle_offset}, v=${vertex_count}, t=${triangle_count}`);
                }
            }
            
            const lodMeshlet: LodMeshlet = {
                lod: lod,
                interleavedVertices: interleavedVertices,
                vertices: new Uint32Array(allLocalVertices),
                indices: new Uint8Array(allLocalTriangles),
                meshlets: meshlets
            };

            lodOutputs.push(lodMeshlet);
        }

        return lodOutputs;
    }
}