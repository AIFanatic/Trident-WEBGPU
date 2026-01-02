import { Meshlet } from '../Meshlet.js';
import { attribute_size } from '../Meshoptimizer.js';
import { Metis } from '../Metis.js';

class MeshletGrouper {
  static adjacencyList(meshlets) {
    let vertexHashToMeshletMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < meshlets.length; i++) {
      const meshlet = meshlets[i];
      for (let j = 0; j < meshlet.vertices.length; j += attribute_size) {
        const hash = `${meshlet.vertices[j + 0].toPrecision(6)},${meshlet.vertices[j + 1].toPrecision(6)},${meshlet.vertices[j + 2].toPrecision(6)}`;
        let meshletList = vertexHashToMeshletMap.get(hash);
        if (!meshletList) meshletList = /* @__PURE__ */ new Set();
        meshletList.add(i);
        vertexHashToMeshletMap.set(hash, meshletList);
      }
    }
    const adjacencyList = /* @__PURE__ */ new Map();
    for (let [_, indices] of vertexHashToMeshletMap) {
      if (indices.size === 1) continue;
      for (let index of indices) {
        if (!adjacencyList.has(index)) {
          adjacencyList.set(index, /* @__PURE__ */ new Set());
        }
        for (let otherIndex of indices) {
          if (otherIndex !== index) {
            adjacencyList.get(index).add(otherIndex);
          }
        }
      }
    }
    let adjacencyListArray = new Array(meshlets.length).fill(0).map((v) => []);
    for (let [key, adjacents] of adjacencyList) {
      if (!adjacencyListArray[key]) adjacencyListArray[key] = [];
      adjacencyListArray[key].push(...Array.from(adjacents));
    }
    return adjacencyListArray;
  }
  static rebuildMeshletsFromGroupIndices(meshlets, groups) {
    let groupedMeshlets = [];
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
  static group(meshlets, nparts) {
    function split(meshlet, parts) {
      const adj = MeshletGrouper.adjacencyList(meshlet);
      const groups = Metis.partition(adj, parts);
      return MeshletGrouper.rebuildMeshletsFromGroupIndices(meshlet, groups);
    }
    function splitRec(input, partsNeeded) {
      if (partsNeeded === 1) {
        return [input];
      } else {
        const partsLeft = Math.ceil(partsNeeded / 2);
        const partsRight = Math.floor(partsNeeded / 2);
        const [leftInput, rightInput] = split(input, 2);
        const leftResult = splitRec(leftInput, partsLeft);
        const rightResult = splitRec(rightInput, partsRight);
        return [...leftResult, ...rightResult];
      }
    }
    return splitRec(meshlets, nparts);
  }
  static groupV2(meshlets, nparts) {
    const adj = MeshletGrouper.adjacencyList(meshlets);
    let adjancecy = /* @__PURE__ */ new Map();
    for (const arr of adj) {
      for (let i = 0; i < arr.length; i++) {
        const f = arr[i];
        let adjacents = adjancecy.get(f) || [];
        for (let j = i + 1; j < arr.length; j++) {
          const t = arr[j];
          if (!adjacents.includes(t)) adjacents.push(t);
        }
        adjancecy.set(f, adjacents);
      }
    }
    console.log(adjancecy);
    console.log(adj);
  }
  static buildMetisAdjacencyList(vertices, indices) {
    let adjacencyList = new Array(vertices.length / attribute_size);
    for (let i = 0; i < adjacencyList.length; i++) {
      adjacencyList[i] = /* @__PURE__ */ new Set();
    }
    for (let i = 0; i < indices.length; i += 3) {
      const v1 = indices[i];
      const v2 = indices[i + 1];
      const v3 = indices[i + 2];
      adjacencyList[v1].add(v2);
      adjacencyList[v1].add(v3);
      adjacencyList[v2].add(v1);
      adjacencyList[v2].add(v3);
      adjacencyList[v3].add(v1);
      adjacencyList[v3].add(v2);
    }
    return adjacencyList.map((set) => Array.from(set));
  }
  static partitionMeshByMetisOutput(vertices, indices, metisPartitions) {
    const attribute_size2 = 8;
    const numPartitions = metisPartitions.length;
    const vertexToPartitions = /* @__PURE__ */ new Map();
    metisPartitions.forEach((partition, index) => {
      partition.forEach((vertex) => {
        if (!vertexToPartitions.has(vertex)) {
          vertexToPartitions.set(vertex, []);
        }
        vertexToPartitions.get(vertex).push(index);
      });
    });
    const partitionedData = Array.from({ length: numPartitions }, () => ({
      vertexMap: /* @__PURE__ */ new Map(),
      vertices: [],
      indices: []
    }));
    for (let i = 0; i < indices.length; i += 3) {
      const v1 = indices[i];
      const v2 = indices[i + 1];
      const v3 = indices[i + 2];
      const v1Parts = vertexToPartitions.get(v1);
      const v2Parts = vertexToPartitions.get(v2);
      const v3Parts = vertexToPartitions.get(v3);
      const commonPartitions = v1Parts.filter(
        (part) => v2Parts.includes(part) && v3Parts.includes(part)
      );
      let assignedPartition;
      if (commonPartitions.length > 0) {
        assignedPartition = commonPartitions[0];
      } else {
        const vertexPartitions = [
          { vertex: v1, partitions: v1Parts },
          { vertex: v2, partitions: v2Parts },
          { vertex: v3, partitions: v3Parts }
        ];
        vertexPartitions.sort((a, b) => a.vertex - b.vertex);
        assignedPartition = vertexPartitions[0].partitions[0];
      }
      const partData = partitionedData[assignedPartition];
      [v1, v2, v3].forEach((vertex) => {
        if (!partData.vertexMap.has(vertex)) {
          const newVertexIndex = partData.vertices.length / attribute_size2;
          partData.vertexMap.set(vertex, newVertexIndex);
          for (let j = 0; j < attribute_size2; j++) {
            partData.vertices.push(vertices[vertex * attribute_size2 + j]);
          }
        }
      });
      partData.indices.push(
        partData.vertexMap.get(v1),
        partData.vertexMap.get(v2),
        partData.vertexMap.get(v3)
      );
    }
    const meshlets = partitionedData.filter((part) => part.vertices.length > 0).map((part) => new Meshlet(new Float32Array(part.vertices), new Uint32Array(part.indices)));
    return meshlets;
  }
  static split(meshlet, nparts) {
    function removeSelfLoops(adjacencyList) {
      return adjacencyList.map((neighbors) => {
        return neighbors.filter((neighbor) => neighbor !== adjacencyList.indexOf(neighbors));
      });
    }
    const adj = this.buildMetisAdjacencyList(meshlet.vertices, meshlet.indices);
    const groups = Metis.partition(removeSelfLoops(adj), nparts);
    return this.partitionMeshByMetisOutput(meshlet.vertices, meshlet.indices, groups);
  }
}

export { MeshletGrouper };
