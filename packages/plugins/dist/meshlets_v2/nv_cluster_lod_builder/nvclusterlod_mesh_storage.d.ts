import { Result, Sphere } from "./nvclusterlod_common";
import { MeshInput, MeshRequirements } from "./nvclusterlod_mesh";
import { Range } from "./nvcluster";
export declare class LodMesh {
    resize(sizes: MeshRequirements): void;
    triangleVertices: number[];
    clusterTriangleRanges: Range[];
    clusterGeneratingGroups: number[];
    clusterBoundingSpheres: Sphere[];
    groupQuadricErrors: number[];
    groupClusterRanges: Range[];
    lodLevelGroupRanges: Range[];
}
export declare class LocalizedLodMesh {
    lodMesh: LodMesh;
    clusterVertexRanges: Range[];
    vertexGlobalIndices: number[];
}
export declare function generateLodMesh(input: MeshInput, lodMesh: LodMesh): Result;
export declare function generateLocalizedLodMesh(input: MeshInput, localizedMesh: LocalizedLodMesh): Result;
export declare class GroupGeneratingGroups {
    ranges: Range[];
    groups: number[];
    size(): number;
    get(i: number): number[];
}
export declare function generateGroupGeneratingGroups(groupClusterRanges: Range[], clusterGeneratingGroups: number[], groupGeneratingGroups: GroupGeneratingGroups): Result;
//# sourceMappingURL=nvclusterlod_mesh_storage.d.ts.map