import { ClusterStorage } from "./nvcluster_storage";
export declare class Range {
    offset: number;
    count: number;
    constructor(offset?: number, count?: number);
}
export declare class Config {
    minClusterSize: number;
    maxClusterSize: number;
    costUnderfill: number;
    costOverlap: number;
    preSplitThreshold: number;
}
export declare class AABB {
    bboxMin: number[];
    bboxMax: number[];
    constructor(bboxMin?: number[], bboxMax?: number[]);
}
export declare class SpatialElements {
    boundingBoxes: AABB[];
    centroids: number[];
    elementCount: number;
}
export declare class Graph {
    nodes: Range[];
    nodeCount: number;
    connectionTargets: number[];
    connectionWeights: number[];
    connectionCount: number;
}
export declare class Input {
    config: Config;
    spatialElements: SpatialElements;
    graph: Graph;
}
export declare class ClusterGetRequirementsSegmentedInfo {
    input: Input;
    elementSegments: Range[];
    elementSegmentCount: number;
}
export declare class ClusterGetRequirementsInfo {
    input: Input;
}
export declare class ClusterCreateSegmentedInfo {
    input: Input;
    elementSegments: Range[];
    elementSegmentCount: number;
}
export declare class Output {
    clusterRanges: Range[];
    clusteredElementIndices: number[];
    clusterCount: number;
    clusteredElementIndexCount: number;
}
export declare class Requirements {
    maxClusterCount: number;
    maxClusteredElementCount: number;
}
export declare class ClusterCreateInfo {
    input: Input;
}
export declare enum Result {
    SUCCESS = 0,
    ERROR_INVALID_CREATE_INFO = 1,
    ERROR_INTERNAL = 2,// Should not have to use this, find more explicit errors where this one is used
    ERROR_INVALID_CONFIG = 3,
    ERROR_INVALID_BOUNDS = 4,
    ERROR_INVALID_GRAPH = 5,
    ERROR_WEIGHT_OVERFLOW = 6,
    ERROR_INVALID_ARGUMENT = 7,
    ERROR_INVALID_CONTEXT = 8
}
export declare function generateClusters(input: Input, clusterStorage: ClusterStorage): Result;
export declare function nvclusterGetRequirementsSegmented(info: ClusterGetRequirementsSegmentedInfo, requirements: Requirements): Result;
export declare function nvclusterCreate(info: ClusterCreateInfo, clusters: Output): Result;
export declare function nvclustersCreateSegmented(info: ClusterCreateSegmentedInfo, clusters: Output, clusterSegments: Range[]): Result;
//# sourceMappingURL=nvcluster.d.ts.map