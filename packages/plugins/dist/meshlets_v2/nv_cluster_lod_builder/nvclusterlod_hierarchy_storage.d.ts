import { HierarchyInput, Node } from "./nvcluster_hierarchy";
import { Result, Sphere } from "./nvclusterlod_common";
export declare class LodHierarchy {
    nodes: Node[];
    groupCumulativeBoundingSpheres: Sphere[];
    groupCumulativeQuadricError: number[];
}
export declare function generateLodHierarchy(input: HierarchyInput, hierarchy: LodHierarchy): Result;
//# sourceMappingURL=nvclusterlod_hierarchy_storage.d.ts.map