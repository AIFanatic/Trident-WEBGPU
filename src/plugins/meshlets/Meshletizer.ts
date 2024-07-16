import { Meshlet } from "./Meshlet";
import { Meshoptimizer, meshopt_Bounds } from "./Meshoptimizer";
import { Metis } from "./Metis";
import { MeshletCreator } from "./utils/MeshletCreator";
import { MeshletGrouper } from "./utils/MeshletGrouper";
import { MeshletMerger } from "./utils/MeshletMerger";

export class Meshletizer {

    private static step(meshlets: Meshlet[], lod: number, previousMeshlets: Map<string, Meshlet>): Meshlet[] {
        // if (previousMeshlets.size === 0) {
        //     for (let m of meshlets) previousMeshlets.set(m.id, m);
        // }

        if (meshlets.length === 1 && meshlets[0].vertices.length < Meshlet.max_triangles * 3) return meshlets;



        let nparts = Math.ceil(meshlets.length / 4);
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

            // simplify
            const simplified = Meshoptimizer.meshopt_simplify(cleanedMergedGroup, cleanedMergedGroup.indices.length / 2);

            const localScale = Meshoptimizer.meshopt_simplifyScale(simplified.meshlet);
            // console.log(localScale, simplified.error)

            let meshSpaceError = simplified.error * localScale;
            let childrenError = 0.0;

            for (let m of group) {
                const previousMeshlet = previousMeshlets.get(m.id);
                if (!previousMeshlet) throw Error("Could not find previous meshler");

                // console.log("previousMeshlet.clusterError", previousMeshlet.clusterError)
                childrenError = Math.max(childrenError, previousMeshlet.clusterError);
            }

            meshSpaceError += childrenError;

            const splits = MeshletCreator.build(simplified.meshlet.vertices, simplified.meshlet.indices, 255, Meshlet.max_triangles);
            for (let split of splits) {
                split.clusterError = meshSpaceError;
                split.boundingVolume = simplified.meshlet.boundingVolume;

                previousMeshlets.set(split.id, split);
                splitOutputs.push(split);
                split.parents.push(...group);
            }

            for (let m of group) {
                m.children.push(...splits);
                m.lod = lod;

                const previousMeshlet = previousMeshlets.get(m.id);
                if (!previousMeshlet) throw Error("Could not find previous meshlet");

                previousMeshlet.parentError = meshSpaceError;
                previousMeshlet.parentBoundingVolume = simplified.meshlet.boundingVolume;
            }
        }

        return splitOutputs;
    }
    public static async Build(vertices: Float32Array, indices: Uint32Array): Promise<Meshlet> {
        await Meshoptimizer.load();
        await Metis.load();

        const meshlets = MeshletCreator.build(vertices, indices, 255, Meshlet.max_triangles);

        const maxLOD = 25;
        let inputs = meshlets;


        let rootMeshlet: Meshlet | null = null;
        let previousMeshlets: Map<string, Meshlet> = new Map();

        for (let m of meshlets) previousMeshlets.set(m.id, m);

        for (let lod = 0; lod < maxLOD; lod++) {
            const outputs = this.step(inputs, lod, previousMeshlets);

            console.log("inputs", inputs.map(m => m.indices.length / 3));
            console.log("outputs", outputs.map(m => m.indices.length / 3));

            if (outputs.length === 1) {
                console.log("WE are done at lod", lod)

                rootMeshlet = outputs[0];
                rootMeshlet.lod = lod + 1;
                rootMeshlet.parentBoundingVolume = rootMeshlet.boundingVolume;


                break;
            }

            inputs = outputs;
            // console.log("\n");
        }
        if (rootMeshlet === null) throw Error("Root meshlet is invalid!");

        return rootMeshlet;
    }
}