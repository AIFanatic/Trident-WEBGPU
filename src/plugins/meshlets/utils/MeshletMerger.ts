import { Meshlet } from "../Meshlet";


class Vertex {
    position: number[];
    normal: number[];
    uv: number[];

    constructor(position: number[], normal: number[], uv: number[]) {
        this.position = position;
        this.normal = normal;
        this.uv = uv;
    }
}

export class MeshletMerger {
    private static removeDuplicateVertices(vertexData: Float32Array, indexData: Uint32Array): { vertices: Float32Array, indices: Uint32Array } {
        const vertexMap = new Map<string, number>();
        const uniqueVertices: Vertex[] = [];
        const newIndices: number[] = [];

        var precisionPoints = 4; // number of decimal points, e.g. 4 for epsilon of 0.0001
		var precision = Math.pow( 10, precisionPoints );
        
        for (let i = 0; i < indexData.length; i++) {
            const index = indexData[i];
            const pos = vertexData.subarray(index * 8, index * 8 + 3);
            const norm = vertexData.subarray(index * 8 + 3, index * 8 + 6);
            const uv = vertexData.subarray(index * 8 + 6, index * 8 + 8);
            
            const vertex = new Vertex(Array.from(pos), Array.from(norm), Array.from(uv));
            // const vertexKey = vertex.position.concat(vertex.normal).concat(vertex.uv).join(',');
            const vertexKey = Math.round( vertex.position[0] * precision ) + '_' + Math.round( vertex.position[1] * precision ) + '_' + Math.round( vertex.position[2] * precision );
    
            if (vertexMap.has(vertexKey)) {
                newIndices.push(vertexMap.get(vertexKey)!);
            } else {
                const newIndex = uniqueVertices.length;
                uniqueVertices.push(vertex);
                vertexMap.set(vertexKey, newIndex);
                newIndices.push(newIndex);
            }
        }
    
        const newVertexData = new Float32Array(uniqueVertices.length * 8);
        uniqueVertices.forEach((v, index) => {
            newVertexData.set([...v.position, ...v.normal, ...v.uv], index * 8);
        });
    
        return {
            vertices: newVertexData,
            indices: new Uint32Array(newIndices)
        };
    }

    public static merge(meshlets: Meshlet[]): Meshlet {
        const vertices: number[] = [];
        const indices: number[] = [];
    
        // merge indices
        let indexOffset = 0;
        const mergedIndices: number[] = [];
    
        for (let i = 0; i < meshlets.length; ++i) {
            const indices = meshlets[i].indices;
    
            for (let j = 0; j < indices.length; j++) {
                mergedIndices.push(indices[j] + indexOffset);
            }
            indexOffset += meshlets[i].vertices.length / 8;
        }
    
        indices.push(...mergedIndices);
    
        // merge attributes
        for (let i = 0; i < meshlets.length; ++i) vertices.push(...meshlets[i].vertices);

        const { vertices: newVertices, indices: newIndices } = this.removeDuplicateVertices(new Float32Array(vertices), new Uint32Array(indices));

        return new Meshlet(newVertices, newIndices);
        // return new Meshlet(new Float32Array(vertices), new Uint32Array(indices));
    }
}