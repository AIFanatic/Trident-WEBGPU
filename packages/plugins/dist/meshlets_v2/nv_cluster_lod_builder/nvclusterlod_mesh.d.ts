import { AABB, Config, Range } from "./nvcluster";
import { SegmentedClusterStorage } from "./nvcluster_storage";
import { Result, Sphere } from "./nvclusterlod_common";
export declare const ORIGINAL_MESH_GROUP = 4294967295;
export declare class MeshRequirements {
    maxTriangleCount: number;
    maxClusterCount: number;
    maxGroupCount: number;
    maxLodLevelCount: number;
}
export declare class MeshInput {
    indices: Uint32Array;
    indexCount: number;
    vertices: Float32Array;
    vertexOffset: number;
    vertexCount: number;
    vertexStride: number;
    clusterConfig: Config;
    groupConfig: Config;
    decimationFactor: number;
}
export declare class MeshOutput {
    clusterTriangleRanges: Range[];
    clusterTriangles: number[];
    clusterGeneratingGroups: number[];
    clusterBoundingSpheres: Sphere[];
    groupQuadricErrors: number[];
    groupClusterRanges: Range[];
    lodLevelGroupRanges: Range[];
    triangleCount: number;
    clusterCount: number;
    groupCount: number;
    lodLevelCount: number;
}
export declare class MeshGetRequirementsInfo {
    input: MeshInput;
}
export declare class MeshCreateInfo {
    input: MeshInput;
}
export declare class TriangleClusters {
    clustering: SegmentedClusterStorage;
    clusterAabbs: AABB[];
    generatingGroupOffset: number;
    maxClusterItems: number;
}
export declare class uvec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
}
export declare class vec3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
}
export declare class vec4 {
    x: number;
    y: number;
    z: number;
    w: number;
    constructor(x?: number, y?: number, z?: number, w?: number);
}
export declare class DecimatedClusterGroups {
    groupTriangleRanges: Range[];
    mesh: MeshInput;
    decimatedTriangleStorage: uvec3[];
    groupQuadricErrors: number[];
    baseClusterGroupIndex: number;
    globalLockedVertices: number[];
}
export declare class OutputWritePositions {
    clusterTriangleRange: number;
    clusterTriangleVertex: number;
    clusterParentGroup: number;
    clusterBoundingSphere: number;
    groupQuadricError: number;
    groupCluster: number;
    lodLevelGroup: number;
}
export declare function divCeil(a: number, b: number): number;
export declare function nvclusterlodMeshGetRequirements(info: MeshGetRequirementsInfo): MeshRequirements;
export declare function exclusive_scan_impl<T>(input: Iterable<T>, init: T, op: (acc: T, cur: T) => T): T[];
export declare class VertexAdjacency extends Uint32Array {
    static readonly Sentinel: number;
    constructor();
}
export declare function nvclusterlodMeshCreate(info: MeshCreateInfo, output: MeshOutput): Result;
//# sourceMappingURL=nvclusterlod_mesh.d.ts.map