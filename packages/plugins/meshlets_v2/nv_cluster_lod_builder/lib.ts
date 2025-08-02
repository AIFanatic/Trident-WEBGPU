import { Meshoptimizer } from "./meshoptimizer/Meshoptimizer";
import { HierarchyInput } from "./nvcluster_hierarchy";
import { Result, Sphere } from "./nvclusterlod_common";
import { LodHierarchy, generateLodHierarchy } from "./nvclusterlod_hierarchy_storage";
import { MeshInput } from "./nvclusterlod_mesh";
import { LocalizedLodMesh, generateLocalizedLodMesh } from "./nvclusterlod_mesh_storage";
import { Range } from "./nvcluster";

interface Mesh {
    vertices: Float32Array;
    indices: Uint32Array;
    error: number;
    parentError: number;
    boundingSphere: Sphere;
    parentBoundingSphere: Sphere;
}

export class NV_Cluster {
    public static async Build(input: MeshInput): Promise<Map<number, Mesh[]>> {

        let mesh: LocalizedLodMesh = new LocalizedLodMesh();
        await Meshoptimizer.load();
        let result: Result = generateLocalizedLodMesh(input, mesh);

        if (result !== Result.SUCCESS) {
            throw Error("Error: " + Result[result]);
        }

        // Build a spatial hierarchy for faster selection
        const hierarchyInput: HierarchyInput = new HierarchyInput();
        hierarchyInput.clusterGeneratingGroups = mesh.lodMesh.clusterGeneratingGroups;
        hierarchyInput.groupQuadricErrors = mesh.lodMesh.groupQuadricErrors;
        hierarchyInput.groupClusterRanges = mesh.lodMesh.groupClusterRanges;
        hierarchyInput.groupCount = mesh.lodMesh.groupClusterRanges.length;
        hierarchyInput.clusterBoundingSpheres = mesh.lodMesh.clusterBoundingSpheres;
        hierarchyInput.clusterCount = mesh.lodMesh.clusterBoundingSpheres.length;
        hierarchyInput.lodLevelGroupRanges = mesh.lodMesh.lodLevelGroupRanges;
        hierarchyInput.lodLevelCount = mesh.lodMesh.lodLevelGroupRanges.length;

        let hierarchy: LodHierarchy = new LodHierarchy();
        result = generateLodHierarchy(hierarchyInput, hierarchy);

        const groupLodLevels = new Array(mesh.lodMesh.groupClusterRanges.length).fill(0);
        for(let level = 0; level < mesh.lodMesh.lodLevelGroupRanges.length; level++) {
            const groupRange = mesh.lodMesh.lodLevelGroupRanges[level];
            for(let g = groupRange.offset; g < groupRange.offset + groupRange.count; g++) {
                groupLodLevels[g] = level;
            }
        }
 
        let output: Map<number, Mesh[]> = new Map();
        // For each LOD level (highest detail first)
        for (let lod = 0; lod < mesh.lodMesh.lodLevelGroupRanges.length; lod++) {
            const lodLevelGroupRange: Range = mesh.lodMesh.lodLevelGroupRanges[lod];

            // For each group
            for (let groupIndex = lodLevelGroupRange.offset; groupIndex < lodLevelGroupRange.offset + lodLevelGroupRange.count; groupIndex++) {
                const groupClusterRange: Range = mesh.lodMesh.groupClusterRanges[groupIndex];

                // For each cluster
                for (let clusterIndex = groupClusterRange.offset; clusterIndex < groupClusterRange.offset + groupClusterRange.count; clusterIndex++) {
                    const clusterTriangleRange: Range = mesh.lodMesh.clusterTriangleRanges[clusterIndex];
                    const clusterVertexRange: Range = mesh.clusterVertexRanges[clusterIndex];

                    // Can use this to pre-compute a per-cluster vertex array
                    const clusterVertexGlobalIndices: number[] = mesh.vertexGlobalIndices.slice(clusterVertexRange.offset);

                    let clusterIndices: number[] = [];

                    // For each triangle
                    for (let triangleIndex = clusterTriangleRange.offset; triangleIndex < clusterTriangleRange.offset + clusterTriangleRange.count; triangleIndex++) {
                        const localIndex0 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 0];
                        const localIndex1 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 1];
                        const localIndex2 = mesh.lodMesh.triangleVertices[3 * triangleIndex + 2];

                        // Map to global indices
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
                        
                        boundingSphere: boundingSphere,
                        error: error,

                        parentBoundingSphere: parentBoundingSphere,
                        parentError: parentError,
                    });

                    output.set(lod, lodMeshletsArray);
                    
                    console.log(`Processed: lod: ${lod}, groupIndex: ${groupIndex}, clusterIndex: ${clusterIndex}, vertexCount: ${input.vertices.length}, indexCount: ${clusterIndices.length}`);
                }
            }
        }
        return output;
    }
}