import { BoundingVolume, Meshlet } from "./Meshlet";
import { Meshoptimizer } from "./Meshoptimizer";
import { Metis } from "./Metis";
import { MeshletCreator } from "./utils/MeshletCreator";
import { MeshletGrouper } from "./utils/MeshletGrouper";
import { MeshletMerger } from "./utils/MeshletMerger";

export class Meshletizer {

    private static appendMeshlets(simplifiedGroup: Meshlet, bounds: BoundingVolume, error: number): Meshlet[] {
        const split = MeshletCreator.build(simplifiedGroup.vertices_raw, simplifiedGroup.indices_raw, 255, 128);
        for (let s of split) {
            s.clusterError = error;
            s.boundingVolume = bounds;
        }
        return split;
    }

    private static step(meshlets: Meshlet[], lod: number, previousMeshlets: Map<number, Meshlet>): Meshlet[] {
        if (previousMeshlets.size === 0) {
            for (let m of meshlets) previousMeshlets.set(m.id, m);
        }



        let nparts = Math.ceil(meshlets.length / 4);
        let grouped = [meshlets];
        if (nparts > 1) {
            grouped = MeshletGrouper.group(meshlets, nparts);
        }







        let x = 0;
        let splitOutputs: Meshlet[] = [];
        for (let i = 0; i < grouped.length; i++) {
            const group = grouped[i];
            // merge
            const mergedGroup = MeshletMerger.merge(group);
            const cleanedMergedGroup = Meshoptimizer.clean(mergedGroup);

            // simplify
            const simplified = Meshoptimizer.meshopt_simplify(cleanedMergedGroup, cleanedMergedGroup.indices_raw.length / 2);

            const localScale = Meshoptimizer.meshopt_simplifyScale(simplified.meshlet);
            // console.log(localScale, simplified.result_error)

            let meshSpaceError = simplified.error * localScale;
            let childrenError = 0.0;

            for (let m of group) {
                const previousMeshlet = previousMeshlets.get(m.id);
                if (!previousMeshlet) throw Error("Could not find previous meshler");

                // console.log("previousMeshlet.clusterError", previousMeshlet.clusterError)
                childrenError = Math.max(childrenError, previousMeshlet.clusterError);
            }

            meshSpaceError += childrenError;

            for (let m of group) {
                const previousMeshlet = previousMeshlets.get(m.id);
                if (!previousMeshlet) throw Error("Could not find previous meshler");

                previousMeshlet.parentError = meshSpaceError;
                previousMeshlet.parentBoundingVolume = simplified.meshlet.boundingVolume;
            }

            const out = this.appendMeshlets(simplified.meshlet, simplified.meshlet.boundingVolume, meshSpaceError);


            for (let o of out) {
                previousMeshlets.set(o.id, o);
                splitOutputs.push(o);
            }


            for (let m of group) {
                m.children.push(...out);
                m.lod = lod;
            }
            for (let s of out) {
                s.parents.push(...group);
            }
        }

        return splitOutputs;
    }
    public static async Build(vertices: Float32Array, indices: Uint32Array): Promise<Meshlet> {
        await Meshoptimizer.load();
        await Metis.load();

        const meshlets = MeshletCreator.build(vertices, indices, 255, 128);
        // console.log(meshlets)


        const maxLOD = 25;
        let inputs = meshlets;


        let rootMeshlet: Meshlet | null = null;
        let previousMeshlets: Map<number, Meshlet> = new Map();

        for (let lod = 0; lod < maxLOD; lod++) {
            const outputs = this.step(inputs, lod, previousMeshlets);

            // console.log("inputs", inputs.map(m => m.indices_raw.length / 3));
            // console.log("outputs", outputs.map(m => m.indices_raw.length / 3));

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