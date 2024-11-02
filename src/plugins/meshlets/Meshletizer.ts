import { Meshlet } from "./Meshlet";
import { Meshoptimizer, meshopt_Bounds } from "./Meshoptimizer";
import { Metis } from "./Metis";
import { MeshletCreator } from "./utils/MeshletCreator";
import { MeshletGrouper } from "./utils/MeshletGrouper";
import { MeshletMerger } from "./utils/MeshletMerger";

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
            // grouped = MeshletGrouper.groupV2(meshlets, nparts);
        }
        // console.log("nparts", nparts, "grouped", grouped);

        // console.log(meshlets.length, grouped)

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
            let simplified = Meshoptimizer.meshopt_simplify(cleanedMergedGroup, cleanedMergedGroup.indices.length / 2, targetError);
            // const simplified = Meshoptimizer.meshopt_simplify(cleanedMergedGroup, 128, 100000);
            // const simplified2 = FQMR.setSimplifyRebuilt(cleanedMergedGroup, cleanedMergedGroup.indices.length / 3 / 2);
            // console.log("CMG", cleanedMergedGroup.indices.length / 3, "SM", simplified.meshlet.vertices.length / 8, simplified.meshlet.indices.length / 3, FQMR.getVertexCount(), FQMR.getFaceCount());
            // const f = new FastQuadric({targetPercentage: 0.5, aggressiveness: 100000});
            // const simplified3 = f.simplifyMeshlet(cleanedMergedGroup);
            // console.log(`
            //     CMG[${cleanedMergedGroup.vertices.length / 8}, ${cleanedMergedGroup.indices.length / 3}]
            //     MO[${simplified.meshlet.vertices.length / 8}, ${simplified.meshlet.indices.length / 3}]
            //     S3[${simplified3.vertices.length / 8}, ${simplified3.indices.length / 3}]
            // `);

            // const f = new FastQuadric({targetPercentage: 0.5, preserveBorders: true});
            // const simplified3 = f.simplifyMeshlet(cleanedMergedGroup);


            // // throw Error("GERGE")
            // simplified = {meshlet: simplified3, error: 1}

            // if (cleanedMergedGroup.indices.length === simplified.meshlet.indices.length) {
                // f.forcedRemoveV2();
            // if (lod === 9) {
            //     // console.log(`
            //     //     CMG[${cleanedMergedGroup.vertices.length / 8}, ${cleanedMergedGroup.indices.length / 3}]
            //     //     MO[${simplified.meshlet.vertices.length / 8}, ${simplified.meshlet.indices.length / 3}]
            //     //     S3[${simplified3.vertices.length / 8}, ${simplified3.indices.length / 3}]
            //     // `);



            //     const renderer = new THREE.WebGLRenderer();
            //     renderer.setSize( window.innerWidth, window.innerHeight );
            //     document.body.appendChild( renderer.domElement );
            
            //     const scene = new THREE.Scene();
            //     const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
            //     const controls = new OrbitControls(camera, renderer.domElement);
            
            //     camera.position.z = 5;
            
            //     function animate() {
            //         renderer.render( scene, camera );
            //     }
            //     renderer.setAnimationLoop( animate );

            //     function MeshletToTHREE(meshlet: Meshlet): THREE.Mesh {
            //         let v: number[] = [];
            //         for (let i = 0; i < meshlet.vertices.length; i+=8) {
            //             v.push(meshlet.vertices[i + 0], meshlet.vertices[i + 1], meshlet.vertices[i + 2]);

            //         }
            //         const g = new THREE.BufferGeometry();
            //         g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
            //         g.setIndex(new THREE.Uint32BufferAttribute(meshlet.indices, 3));
            //         const m = new THREE.Mesh(g);
            //         return m;
            //     }

            //     for (let i = 0; i < group.length; i++) {
            //         const tm = MeshletToTHREE(group[i]);
            //         tm.material.wireframe = true;
            //         tm.material.side = THREE.DoubleSide;
            //         tm.material.color = new THREE.Color(Math.random() * 0xffffff)
            //         // tm.position.copy(position);
            //         scene.add(tm);
            //     }
            //     // const tm = MeshletToTHREE(simplified.meshlet);
            //     // tm.material.wireframe = true;
            //     // scene.add(tm);


            //     throw Error("Group simplified");
            // }

            const localScale = Meshoptimizer.meshopt_simplifyScale(simplified.meshlet);

            let meshSpaceError = simplified.error * localScale;
            let childrenError = 0.0;

            for (let m of group) {
                const previousMeshlet = previousMeshlets.get(m.id);
                if (!previousMeshlet) throw Error("Could not find previous meshler");

                childrenError = Math.max(childrenError, previousMeshlet.clusterError);
            }

            meshSpaceError += childrenError;

            let splits = MeshletCreator.build(simplified.meshlet.vertices, simplified.meshlet.indices, 255, Meshlet.max_triangles);
            // const p = Math.ceil(group.length / 2);
            // let splits = [simplified.meshlet];
            // if (p > 1) {
            //     splits = MeshletGrouper.split(simplified.meshlet, p);
            // }
            // const splits = MeshletGrouper.group([simplified.meshlet], group.length / 2);


            // let nparts = group.length / 2;
            // let splits = [simplified.meshlet];
            // if (nparts > 1) {
            //     splits = MeshletGrouper.split(simplified.meshlet, nparts);
            // }

            // const splits = MeshletGrouper.split(simplified.meshlet, group.length / 2);

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

        const meshlets = MeshletCreator.build(vertices, indices, 255, Meshlet.max_triangles);
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