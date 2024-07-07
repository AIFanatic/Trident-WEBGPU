import { Meshlet } from "../Meshlet";
import { Metis } from "../Metis";

export class MeshletGrouper {
    
    public static adjacencyList(meshlets: Meshlet[]): number[][] {

        let vertexHashToMeshletMap: Map<string, number[]> = new Map();

        for (let i = 0; i < meshlets.length; i++) {
            const meshlet = meshlets[i];
            for (let j = 0; j < meshlet.boundaryEdges.length; j++) {
                const boundaryEdge = meshlet.boundaryEdges[j];
                const edgeHash = meshlet.getEdgeHash(boundaryEdge);

                let meshletList = vertexHashToMeshletMap.get(edgeHash);
                if (!meshletList) meshletList = [];

                meshletList.push(i);
                vertexHashToMeshletMap.set(edgeHash, meshletList);
            }
        }
        const adjacencyList: Map<number, Set<number>> = new Map();

        for (let [_, indices] of vertexHashToMeshletMap) {
            if (indices.length === 1) continue;

            for (let index of indices) {
                if (!adjacencyList.has(index)) {
                    adjacencyList.set(index, new Set());
                }
                for (let otherIndex of indices) {
                    if (otherIndex !== index) {
                        adjacencyList.get(index).add(otherIndex);
                    }
                }
            }
        }


        let adjacencyListArray: number[][] = [];
        // Finally, to array
        for (let [key, adjacents] of adjacencyList) {
            if (!adjacencyListArray[key]) adjacencyListArray[key] = [];

            adjacencyListArray[key].push(...Array.from(adjacents));
        }
        return adjacencyListArray;
    }

    public static rebuildMeshletsFromGroupIndices(meshlets: Meshlet[], groups: number[][]): Meshlet[][] {
        let groupedMeshlets: Meshlet[][] = [];

        for (let i = 0; i < groups.length; i++) {
            if (!groupedMeshlets[i]) groupedMeshlets[i] = [];
            for (let j = 0; j < groups[i].length; j++) {
                const meshletId = groups[i][j];
                const meshlet = meshlets[meshletId];
                groupedMeshlets[i].push(meshlet);
            }
        }
        return groupedMeshlets;
    }

    public static group(meshlets: Meshlet[], nparts: number): Meshlet[][] {
        const adj = MeshletGrouper.adjacencyList(meshlets);

        const groups = Metis.partition(adj, nparts);
        return MeshletGrouper.rebuildMeshletsFromGroupIndices(meshlets, groups);
    }

}