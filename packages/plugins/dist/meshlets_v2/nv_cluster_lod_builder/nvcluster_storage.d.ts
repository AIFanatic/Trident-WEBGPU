import { Input, Range, Result } from "./nvcluster";
export declare class ClusterStorage {
    clusterRanges: Range[];
    clusterItems: number[];
}
export declare class SegmentedClusterStorage {
    clusterRangeSegments: Range[];
    clusterRanges: Range[];
    clusterItems: number[];
}
export declare function generateSegmentedClusters(input: Input, itemSegments: Range[], itemSegmentCount: number, segmentedClusterStorage: SegmentedClusterStorage): Result;
//# sourceMappingURL=nvcluster_storage.d.ts.map