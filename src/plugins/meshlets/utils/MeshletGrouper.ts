import { Meshlet } from "../Meshlet";
import { Metis } from "../Metis";

export class MeshletGrouper {
    public static adjacencyList(meshlets: Meshlet[]): number[][] {

        let vertexHashToMeshletMap: Map<string, Set<number>> = new Map();

        for (let i = 0; i < meshlets.length; i++) {
            const meshlet = meshlets[i];
            for (let j = 0; j < meshlet.vertices.length; j+=3) {
                const hash = `${meshlet.vertices[j + 0]},${meshlet.vertices[j + 1]},${meshlet.vertices[j + 2]}`;
                let meshletList = vertexHashToMeshletMap.get(hash);
                if (!meshletList) meshletList = new Set();

                meshletList.add(i);
                vertexHashToMeshletMap.set(hash, meshletList);
            }
        }

        const adjacencyList: Map<number, Set<number>> = new Map();

        for (let [_, indices] of vertexHashToMeshletMap) {
            if (indices.size === 1) continue;

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


        // const adjacencyListArray = Array.from(adjacencyList.entries(), ([key, set]) => [key, ...set]);
        // let adjacencyListArray: number[][] = []; //new Array(meshlets.length).fill(0).map(v => []);
        let adjacencyListArray: number[][] = new Array(meshlets.length).fill(0).map(v => []);
        // Finally, to array
        for (let [key, adjacents] of adjacencyList) {
            if (!adjacencyListArray[key]) adjacencyListArray[key] = [];
            
            adjacencyListArray[key].push(...Array.from(adjacents));
        }
        // console.log(meshlets);
        // console.log(adjacencyListArray);
        // throw Error("HERE")
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