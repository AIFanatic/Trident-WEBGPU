import { Result, Sphere } from "./nvclusterlod_common";
import { Range } from "./nvcluster";
export declare class HierarchyInput {
    clusterGeneratingGroups: number[];
    groupQuadricErrors: number[];
    groupClusterRanges: Range[];
    groupCount: number;
    clusterBoundingSpheres: Sphere[];
    clusterCount: number;
    lodLevelGroupRanges: Range[];
    lodLevelCount: number;
    minQuadricErrorOverDistance: number;
    conservativeBoundingSpheres: boolean;
}
export declare class InteriorNode {
    static NODE_RANGE_MAX_SIZE: number;
    isLeafNode: number;
    childOffset: number;
    childCountMinusOne: number;
}
export declare class LeafNode {
    static CLUSTER_RANGE_MAX_SIZE: number;
    isLeafNode: number;
    group: number;
    clusterCountMinusOne: number;
}
export declare class Node {
    children?: InteriorNode;
    clusters?: LeafNode;
    boundingSphere: Sphere;
    maxClusterQuadricError: number;
}
export declare class HierarchyOutput {
    nodes: Node[];
    groupCumulativeBoundingSpheres: Sphere[];
    groupCumulativeQuadricError: number[];
    nodeCount: number;
}
export declare class HierarchyGetRequirementsInfo {
    input: HierarchyInput;
}
export declare class HierarchyRequirements {
    maxNodeCount: number;
}
export declare class HierarchyCreateInfo {
    input: HierarchyInput;
    constructor(input: HierarchyInput);
}
export declare function nvclusterlodHierarchyGetRequirements(info: HierarchyGetRequirementsInfo): HierarchyRequirements;
export declare function nvclusterlodCreateHierarchy(info: HierarchyCreateInfo, output: HierarchyOutput): Result;
//# sourceMappingURL=nvcluster_hierarchy.d.ts.map