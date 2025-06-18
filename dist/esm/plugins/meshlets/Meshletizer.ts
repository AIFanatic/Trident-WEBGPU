import { Meshlet } from "./Meshlet";
import { Meshoptimizer, attribute_size } from "./Meshoptimizer";
import { Metis } from "./Metis";
import { MeshletCreator } from "./utils/MeshletCreator";
import { MeshletGrouper } from "./utils/MeshletGrouper";
import { MeshletMerger } from "./utils/MeshletMerger";
import { MeshletBorder } from "./utils/MeshletBorder";

export class Meshletizer {

    public static MaxLOD = 25;

    private static step(meshlets: Meshlet[], lod: number, previousMeshlets: Map<string, Meshlet>): Meshlet[] {

        if (meshlets.length === 1 && meshlets[0].vertices.length < Meshlet.max_triangles * 8) return meshlets;


        // let nparts = 2;

        let nparts = Math.ceil(meshlets.length / 8);
        if (nparts > 8) nparts = 8;
        let grouped = [meshlets];
        if (nparts > 1) {
            grouped = MeshletGrouper.group(meshlets, nparts);
        }

        let splitOutputs: Meshlet[] = [];
        for (let i = 0; i < grouped.length; i++) {
            const group = grouped[i];
            // merge
            const mergedGroup = MeshletMerger.merge(group);
            const cleanedMergedGroup = Meshoptimizer.clean(mergedGroup);
            // const cleanedMergedGroup = mergedGroup;

            const tLod = (lod+1) / Meshletizer.MaxLOD;
            const targetError = (0.1 * tLod + 0.01 * (1-tLod));
            // simplify
            let target_count = cleanedMergedGroup.indices.length / 2;
            // let simplified = Meshoptimizer.meshopt_simplify(cleanedMergedGroup, target_count, targetError);


            const sharedVertices = MeshletBorder.GetSharedVertices(group, attribute_size);
            const lockedArray = MeshletBorder.SharedVerticesToLockedArray(sharedVertices, mergedGroup, attribute_size);
            const simplified = Meshoptimizer.meshopt_simplifyWithAttributes(mergedGroup, lockedArray, target_count, targetError);

            const localScale = Meshoptimizer.meshopt_simplifyScale(simplified.meshlet);

            let meshSpaceError = simplified.error * localScale;
            let childrenError = 0.0;

            for (let m of group) {
                const previousMeshlet = previousMeshlets.get(m.id);
                if (!previousMeshlet) throw Error("Could not find previous meshler");

                childrenError = Math.max(childrenError, previousMeshlet.clusterError);
            }

            meshSpaceError += childrenError;

            let splits = MeshletCreator.build(simplified.meshlet.vertices, simplified.meshlet.indices, Meshlet.max_vertices, Meshlet.max_triangles);
            
            for (let split of splits) {
                split.clusterError = meshSpaceError;
                split.boundingVolume = simplified.meshlet.boundingVolume;
                split.lod = lod + 1;

                previousMeshlets.set(split.id, split);
                splitOutputs.push(split);
                split.parents.push(...group);
            }

            for (let m of group) {
                m.children.push(...splits);
                // m.lod = lod;

                const previousMeshlet = previousMeshlets.get(m.id);
                if (!previousMeshlet) throw Error("Could not find previous meshlet");

                previousMeshlet.parentError = meshSpaceError;
                previousMeshlet.parentBoundingVolume = simplified.meshlet.boundingVolume;
                // previousMeshlet.lod++;
            }
        }

        // console.log(meshlets.length, splitOutputs.length)
        return splitOutputs;
    }
    public static async Build(vertices: Float32Array, indices: Uint32Array): Promise<Meshlet[]> {
        await Meshoptimizer.load();
        await Metis.load();

        const meshlets = MeshletCreator.build(vertices, indices, Meshlet.max_vertices, Meshlet.max_triangles);
        // const npartsFirst = Math.ceil(indices.length / 3 / 128);
        // const m = new Meshlet(vertices, indices);
        // const meshlets = MeshletGrouper.split(m, npartsFirst);

        console.log(`starting with ${meshlets.length} meshlets`);

        let inputs = meshlets;
        let rootMeshlet: Meshlet | null = null;
        let previousMeshlets: Map<string, Meshlet> = new Map();

        for (let m of meshlets) previousMeshlets.set(m.id, m);

        for (let lod = 0; lod < Meshletizer.MaxLOD; lod++) {
            const outputs = this.step(inputs, lod, previousMeshlets);
            
            const inputTriangleArray = inputs.map(m => m.indices.length / 3);
            const outputTriangleArray = outputs.map(m => m.indices.length / 3);
            const inputTriangleCount = inputTriangleArray.reduce((a, b) => a + b);
            const outputTriangleCount = outputTriangleArray.reduce((a, b) => a + b);

            console.log(`LOD: ${lod}: input: [meshlets: ${inputTriangleArray.length}, triangles: ${inputTriangleCount}] -> output: [meshlets: ${outputTriangleArray.length}, triangles: ${outputTriangleCount}]`);

            if (outputTriangleCount >= inputTriangleCount) {
                for (const input of inputs) {
                    if (input.indices.length / 3 > Meshlet.max_triangles) {
                        throw Error(`Output meshlet triangle count ${inputTriangleCount} >= input triangle count ${inputTriangleCount}`)
                    }
                }
                break;
                // throw Error(`ERROR Output meshlet triangle count ${inputVertexCount} >= input triangle count ${inputVertexCount}`)
            }
            // if (outputTriangleCount.length === inputTriangleCount.length) {
            //     throw Error(`Output meshlets triangles ${outputTriangleCount.length} == input meshlets triangles ${inputTriangleCount.length}`);
            // }
            // if (lod === 7) throw Error("Stop");
            inputs = outputs;

            if (outputs.length === 1 && outputs[0].indices.length / 3 <= 128) {
                console.log("WE are done at lod", lod)

                rootMeshlet = outputs[0];
                rootMeshlet.lod = lod + 1;
                rootMeshlet.parentBoundingVolume = rootMeshlet.boundingVolume;


                break;
            }

            // console.log("\n");
        }
        // if (inputs.length !== 1) throw Error("Could not simplify up to one root node");
        if (rootMeshlet === null) throw Error("Root meshlet is invalid!");

        // if (rootMeshlet === null) rootMeshlet = inputs[0]

        let meshletsOut: Meshlet[] = [];
        for (const [_, meshlet] of previousMeshlets) {
            meshletsOut.push(meshlet);
        }

        return meshletsOut;
    }
}