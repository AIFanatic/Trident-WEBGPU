import { Meshlet } from "../Meshlet";
import { attribute_size } from "../Meshoptimizer";
import { Metis } from "../Metis";
export class MeshletGrouper {
    static adjacencyList(meshlets) {
        let vertexHashToMeshletMap = new Map();
        for (let i = 0; i < meshlets.length; i++) {
            const meshlet = meshlets[i];
            for (let j = 0; j < meshlet.vertices.length; j += attribute_size) {
                // const hash = `${meshlet.vertices[j + 0]},${meshlet.vertices[j + 1]},${meshlet.vertices[j + 2]}`;
                const hash = `${meshlet.vertices[j + 0].toPrecision(6)},${meshlet.vertices[j + 1].toPrecision(6)},${meshlet.vertices[j + 2].toPrecision(6)}`;
                let meshletList = vertexHashToMeshletMap.get(hash);
                if (!meshletList)
                    meshletList = new Set();
                meshletList.add(i);
                vertexHashToMeshletMap.set(hash, meshletList);
            }
        }
        const adjacencyList = new Map();
        for (let [_, indices] of vertexHashToMeshletMap) {
            if (indices.size === 1)
                continue;
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
        let adjacencyListArray = new Array(meshlets.length).fill(0).map(v => []);
        // Finally, to array
        for (let [key, adjacents] of adjacencyList) {
            if (!adjacencyListArray[key])
                adjacencyListArray[key] = [];
            adjacencyListArray[key].push(...Array.from(adjacents));
        }
        // console.log(meshlets);
        // console.log(adjacencyListArray);
        // throw Error("HERE")
        return adjacencyListArray;
    }
    static rebuildMeshletsFromGroupIndices(meshlets, groups) {
        let groupedMeshlets = [];
        for (let i = 0; i < groups.length; i++) {
            if (!groupedMeshlets[i])
                groupedMeshlets[i] = [];
            for (let j = 0; j < groups[i].length; j++) {
                const meshletId = groups[i][j];
                const meshlet = meshlets[meshletId];
                groupedMeshlets[i].push(meshlet);
            }
        }
        return groupedMeshlets;
    }
    static group(meshlets, nparts) {
        // let current = meshlets;
        // for (let i = 0; i < nparts / 2; i++) {
        //     const adj = MeshletGrouper.adjacencyList(current);
        //     const groups = Metis.partition(adj, 2);
        //     const a = MeshletGrouper.rebuildMeshletsFromGroupIndices(current, groups); 
        // }
        function split(meshlet, parts) {
            const adj = MeshletGrouper.adjacencyList(meshlet);
            const groups = Metis.partition(adj, parts);
            return MeshletGrouper.rebuildMeshletsFromGroupIndices(meshlet, groups);
        }
        function splitRec(input, partsNeeded) {
            if (partsNeeded === 1) {
                return [input];
            }
            else {
                // Calculate how many parts should go to the left and right
                const partsLeft = Math.ceil(partsNeeded / 2);
                const partsRight = Math.floor(partsNeeded / 2);
                // Split the input into two parts
                const [leftInput, rightInput] = split(input, 2);
                // Recursively split the left and right parts
                const leftResult = splitRec(leftInput, partsLeft);
                const rightResult = splitRec(rightInput, partsRight);
                // Combine the results
                return [...leftResult, ...rightResult];
            }
        }
        return splitRec(meshlets, nparts);
        // const adj = MeshletGrouper.adjacencyList(meshlets);
        // const groups = Metis.partition(adj, nparts);
        // return MeshletGrouper.rebuildMeshletsFromGroupIndices(meshlets, groups);
    }
    static groupV2(meshlets, nparts) {
        const adj = MeshletGrouper.adjacencyList(meshlets);
        let adjancecy = new Map();
        for (const arr of adj) {
            for (let i = 0; i < arr.length; i++) {
                const f = arr[i];
                let adjacents = adjancecy.get(f) || [];
                for (let j = i + 1; j < arr.length; j++) {
                    const t = arr[j];
                    if (!adjacents.includes(t))
                        adjacents.push(t);
                }
                adjancecy.set(f, adjacents);
            }
        }
        console.log(adjancecy);
        console.log(adj);
    }
    static buildMetisAdjacencyList(vertices, indices) {
        // Step 1: Initialize adjacency information
        let adjacencyList = new Array(vertices.length / attribute_size); // Assuming each vertex is (x, y, z)
        for (let i = 0; i < adjacencyList.length; i++) {
            adjacencyList[i] = new Set();
        }
        // Step 2: Fill the adjacency list
        for (let i = 0; i < indices.length; i += 3) {
            const v1 = indices[i];
            const v2 = indices[i + 1];
            const v3 = indices[i + 2];
            // Add each vertex to the adjacency list of the other two vertices
            adjacencyList[v1].add(v2); // METIS is 1-based
            adjacencyList[v1].add(v3);
            adjacencyList[v2].add(v1);
            adjacencyList[v2].add(v3);
            adjacencyList[v3].add(v1);
            adjacencyList[v3].add(v2);
        }
        // Step 3: Convert sets to arrays
        return adjacencyList.map(set => Array.from(set));
    }
    static partitionMeshByMetisOutput(vertices, indices, metisPartitions) {
        const attribute_size = 8; // Ensure this is properly defined
        const numPartitions = metisPartitions.length;
        // Create a mapping from vertex to partitions it belongs to
        const vertexToPartitions = new Map();
        metisPartitions.forEach((partition, index) => {
            partition.forEach(vertex => {
                if (!vertexToPartitions.has(vertex)) {
                    vertexToPartitions.set(vertex, []);
                }
                vertexToPartitions.get(vertex).push(index);
            });
        });
        // Initialize partitioned data
        const partitionedData = Array.from({ length: numPartitions }, () => ({
            vertexMap: new Map(),
            vertices: [],
            indices: [],
        }));
        // Process each face
        for (let i = 0; i < indices.length; i += 3) {
            const v1 = indices[i];
            const v2 = indices[i + 1];
            const v3 = indices[i + 2];
            // Get partitions of the vertices
            const v1Parts = vertexToPartitions.get(v1);
            const v2Parts = vertexToPartitions.get(v2);
            const v3Parts = vertexToPartitions.get(v3);
            // Find common partitions among the vertices
            const commonPartitions = v1Parts.filter(part => v2Parts.includes(part) && v3Parts.includes(part));
            let assignedPartition;
            if (commonPartitions.length > 0) {
                // Assign to the first common partition
                assignedPartition = commonPartitions[0];
            }
            else {
                // Assign to the partition of the vertex with the lowest index
                const vertexPartitions = [
                    { vertex: v1, partitions: v1Parts },
                    { vertex: v2, partitions: v2Parts },
                    { vertex: v3, partitions: v3Parts },
                ];
                // Find the vertex with the lowest index
                vertexPartitions.sort((a, b) => a.vertex - b.vertex);
                assignedPartition = vertexPartitions[0].partitions[0];
            }
            // Add the face to the assigned partition
            const partData = partitionedData[assignedPartition];
            [v1, v2, v3].forEach(vertex => {
                if (!partData.vertexMap.has(vertex)) {
                    const newVertexIndex = partData.vertices.length / attribute_size;
                    partData.vertexMap.set(vertex, newVertexIndex);
                    for (let j = 0; j < attribute_size; j++) {
                        partData.vertices.push(vertices[vertex * attribute_size + j]);
                    }
                }
            });
            partData.indices.push(partData.vertexMap.get(v1), partData.vertexMap.get(v2), partData.vertexMap.get(v3));
        }
        // Convert to typed arrays and return
        const meshlets = partitionedData
            .filter(part => part.vertices.length > 0)
            .map(part => new Meshlet(new Float32Array(part.vertices), new Uint32Array(part.indices)));
        return meshlets;
    }
    static split(meshlet, nparts) {
        function removeSelfLoops(adjacencyList) {
            return adjacencyList.map(neighbors => {
                // Filter out the self-loop (i.e., remove the vertex number if it appears in its own list)
                return neighbors.filter(neighbor => neighbor !== adjacencyList.indexOf(neighbors));
            });
        }
        const adj = this.buildMetisAdjacencyList(meshlet.vertices, meshlet.indices);
        const groups = Metis.partition(removeSelfLoops(adj), nparts);
        return this.partitionMeshByMetisOutput(meshlet.vertices, meshlet.indices, groups);
    }
}
