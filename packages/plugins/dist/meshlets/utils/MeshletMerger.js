import { Meshlet } from "../Meshlet";
import { attribute_size } from "../Meshoptimizer";
class Vertex {
    position;
    normal;
    uv;
    constructor(position, normal, uv) {
        this.position = position;
        this.normal = normal;
        this.uv = uv;
    }
}
export class MeshletMerger {
    static removeDuplicateVertices(vertexData, indexData) {
        const vertexMap = new Map();
        const uniqueVertices = [];
        const newIndices = [];
        var precisionPoints = 4; // number of decimal points, e.g. 4 for epsilon of 0.0001
        var precision = Math.pow(10, precisionPoints);
        for (let i = 0; i < indexData.length; i++) {
            const index = indexData[i];
            const pos = vertexData.subarray(index * attribute_size, index * attribute_size + 3);
            const norm = vertexData.subarray(index * attribute_size + 3, index * attribute_size + 6);
            const uv = vertexData.subarray(index * attribute_size + 6, index * attribute_size + 8);
            const vertex = new Vertex(Array.from(pos), Array.from(norm), Array.from(uv));
            // const vertexKey = vertex.position.concat(vertex.normal).concat(vertex.uv).join(',');
            const vertexKey = Math.round(vertex.position[0] * precision) + '_' + Math.round(vertex.position[1] * precision) + '_' + Math.round(vertex.position[2] * precision);
            if (vertexMap.has(vertexKey)) {
                newIndices.push(vertexMap.get(vertexKey));
            }
            else {
                const newIndex = uniqueVertices.length;
                uniqueVertices.push(vertex);
                vertexMap.set(vertexKey, newIndex);
                newIndices.push(newIndex);
            }
        }
        const newVertexData = new Float32Array(uniqueVertices.length * attribute_size);
        uniqueVertices.forEach((v, index) => {
            newVertexData.set([...v.position, ...v.normal, ...v.uv], index * attribute_size);
        });
        return {
            vertices: newVertexData,
            indices: new Uint32Array(newIndices)
        };
    }
    static merge(meshlets) {
        const vertices = [];
        const indices = [];
        // merge indices
        let indexOffset = 0;
        // const mergedIndices: number[] = [];
        for (let i = 0; i < meshlets.length; ++i) {
            const indices2 = meshlets[i].indices;
            for (let j = 0; j < indices2.length; j++) {
                // mergedIndices.push(indices2[j] + indexOffset);
                indices.push(indices2[j] + indexOffset);
            }
            indexOffset += meshlets[i].vertices.length / attribute_size;
        }
        // indices.push(...mergedIndices);
        // merge attributes
        for (let i = 0; i < meshlets.length; ++i)
            vertices.push(...meshlets[i].vertices);
        const { vertices: newVertices, indices: newIndices } = this.removeDuplicateVertices(new Float32Array(vertices), new Uint32Array(indices));
        return new Meshlet(newVertices, newIndices);
        // return new Meshlet(new Float32Array(vertices), new Uint32Array(indices));
    }
    static mergeV2(meshlets) {
        let vertices = [];
        let indices = [];
        let indicesOffset = 0;
        for (const meshlet of meshlets) {
            for (const vertex of meshlet.vertices)
                vertices.push(vertex);
            for (const index of meshlet.indices)
                indices.push(index + indicesOffset);
            indicesOffset += meshlet.vertices.length / 3;
        }
        return new Meshlet(new Float32Array(vertices), new Uint32Array(indices));
    }
}
