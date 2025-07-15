import { Meshlet } from "../Meshlet";
export declare class MeshletGrouper {
    static adjacencyList(meshlets: Meshlet[]): number[][];
    static rebuildMeshletsFromGroupIndices(meshlets: Meshlet[], groups: number[][]): Meshlet[][];
    static group(meshlets: Meshlet[], nparts: number): Meshlet[][];
    static groupV2(meshlets: Meshlet[], nparts: number): Meshlet[][];
    private static buildMetisAdjacencyList;
    static partitionMeshByMetisOutput(vertices: Float32Array, indices: Uint32Array, metisPartitions: number[][]): Meshlet[];
    static split(meshlet: Meshlet, nparts: number): Meshlet[];
}
//# sourceMappingURL=MeshletGrouper.d.ts.map