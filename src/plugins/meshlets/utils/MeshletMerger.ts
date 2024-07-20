import { Meshlet } from "../Meshlet";

// From: THREE.js
export class MeshletMerger {
    public static merge(meshlets: Meshlet[]): Meshlet {
        const vertices: number[] = [];
        const indices: number[] = [];
    
        // merge indices
        let indexOffset = 0;
        const mergedIndices: number[] = [];
    
        for (let i = 0; i < meshlets.length; ++i) {
            const indices = meshlets[i].indices;
    
            for (let j = 0; j < indices.length; j++) {
                // mergedIndices.push(getX(indices, j, 3) + indexOffset);
                mergedIndices.push(indices[j] + indexOffset);
            }
            // indexOffset += meshlets[i].vertices.length / 3;
            indexOffset += meshlets[i].vertices.length / 8;
        }
    
        indices.push(...mergedIndices);
    
        // merge attributes
        for (let i = 0; i < meshlets.length; ++i) vertices.push(...meshlets[i].vertices);

        return new Meshlet(new Float32Array(vertices), new Uint32Array(indices));
    }
}