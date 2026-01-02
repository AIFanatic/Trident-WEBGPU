class MeshletBorder {
  // Returns an array with the shared vertices between meshes
  static GetSharedVertices(meshes, attribute_size) {
    function VertexEncode(vertex) {
      return `${vertex[0].toPrecision(4)},${vertex[1].toPrecision(4)},${vertex[2].toPrecision(4)}`;
    }
    function VertexDecode(vertexKey) {
      const vertex = vertexKey.split(",");
      return [parseFloat(vertex[0]), parseFloat(vertex[1]), parseFloat(vertex[2])];
    }
    let vertexCountMap = /* @__PURE__ */ new Map();
    for (const mesh of meshes) {
      for (let i = 0; i < mesh.vertices.length; i += attribute_size) {
        const vKey = VertexEncode([mesh.vertices[i + 0], mesh.vertices[i + 1], mesh.vertices[i + 2]]);
        let vCounts = vertexCountMap.get(vKey) || 0;
        vertexCountMap.set(vKey, ++vCounts);
      }
    }
    let sharedVertices = [];
    for (const [key, vCount] of vertexCountMap) {
      if (vCount > 1) {
        sharedVertices.push(VertexDecode(key));
      }
    }
    return sharedVertices;
  }
  static getVertexIndicesForVertexKeys(vertexKeys, vertices, attribute_size) {
    let matches = [];
    for (let i = 0; i < vertexKeys.length; i++) {
      const v = vertexKeys[i];
      for (let j = 0; j < vertices.length; j += attribute_size) {
        const EPS = 1e-3;
        if (Math.abs(v[0] - vertices[j + 0]) < EPS && Math.abs(v[1] - vertices[j + 1]) < EPS && Math.abs(v[2] - vertices[j + 2]) < EPS) {
          matches.push(j);
        }
      }
    }
    return matches;
  }
  // For a given mesh returns an array with locked vertices that match sharedVertices
  static SharedVerticesToLockedArray(sharedVertices, mesh, attribute_size) {
    const mergedGroupLockedVertexIds = this.getVertexIndicesForVertexKeys(sharedVertices, mesh.vertices, attribute_size);
    const lockedArray = new Uint8Array(mesh.vertices.length).fill(0);
    for (const lockedVertex of mergedGroupLockedVertexIds) {
      lockedArray[lockedVertex] = 1;
    }
    return lockedArray;
  }
}

export { MeshletBorder };
