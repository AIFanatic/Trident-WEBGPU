import { Component } from "./Component";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
import { EventSystem } from "../Events";
import { Meshoptimizer, meshopt_Bounds } from "../plugins/meshlets/Meshoptimizer";
import { CRC32, Utils } from "../Utils";
import { Metis } from "../plugins/meshlets/Metis";
import { Meshletizer } from "../plugins/meshlets/Meshletizer";

const meshletsCache: Map<Geometry, MeshletInfo[]> = new Map();
const max_vertices = 128;
const max_triangles = 128;
const cone_weight = 0.0;

export class Meshlet {
    public id = Utils.UUID();
    public vertices: Float32Array;
    public indices: Uint32Array;
    public bounds: meshopt_Bounds;

    public vertices_gpu: Float32Array;
    public vertices_gpu_crc: number;

    constructor(vertices: Float32Array, indices: Uint32Array) {
        this.vertices = vertices;
        this.indices = indices;
        this.bounds = Meshoptimizer.meshopt_computeClusterBounds(vertices, indices);

        // TODO: Get non indexed vertices, this is because no MDI in webgpu
        const verticesNonIndexed = Geometry.ToNonIndexed(vertices, indices);
        const verticesGPU: number[] = [] // vec4
        for (let i = 0; i < verticesNonIndexed.length; i+=3) {
            verticesGPU.push(verticesNonIndexed[i + 0], verticesNonIndexed[i + 1], verticesNonIndexed[i + 2], 0);
        }

        // TODO: Force vertices to be always of max_vertices * vec4
        // This is not efficient since vertices that dont fill the whole buffer still get drawn.
        // But again no MDI, explore alternatives
        this.vertices_gpu = new Float32Array(max_vertices * 4 * 3);
        this.vertices_gpu.set(vertices);
        this.vertices_gpu_crc = CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
    }
}

interface MeshletInfo {
    meshlet: Meshlet;
    index: number;
    neighbors: number[];
};

export class MeshletMeshV2 extends Component {
    private materialsMapped: Map<string, Material[]> = new Map();

    public enableShadows: boolean = true;

    public meshlets: MeshletInfo[] = [];
    public bounds: meshopt_Bounds;

    public Start(): void {
        // EventSystem.on("TransformUpdated", transform => {
        //     if (this.transform === transform) {
        //         EventSystem.emit("MeshUpdated", this);
        //     }
        // })
    }

    public AddMaterial(material: Material) {
        if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
        this.materialsMapped.get(material.constructor.name)?.push(material);
    }

    public GetMaterials<T extends Material>(type: new(...args: any[]) => T): T[] {
        return this.materialsMapped.get(type.name) as T[] || [];
    }

    public async SetGeometry(geometry: Geometry) {
        await Meshoptimizer.load();

        const cached = meshletsCache.get(geometry);
        if (cached) {
            this.meshlets.push(...cached);
            return;
        }

        const vertices = geometry.attributes.get("position");
        const indices = geometry.index;
        if (!vertices || !indices) throw Error("Needs vertices and indices");

        const geometryVertices = vertices.array as Float32Array;
        const geometryIndices = indices.array as Uint32Array
        
        const meshlets = Meshletizer.Build(geometryVertices, geometryIndices);
        // const meshlets = Meshoptimizer.meshopt_buildMeshlets(geometryVertices, geometryIndices, max_vertices, max_triangles, cone_weight);
        // const neighbors = Meshoptimizer.buildNeighbors(meshlets.meshlets_result, meshlets.meshlet_vertices_result);
        // if (meshlets.meshlets_result.length !== neighbors.length) throw Error(`Expecting the same number of meshlets and neighbors but got ${meshlets.meshlets_result.length} and ${neighbors.length}`);
        // const meshletGeometries = Meshoptimizer.buildMeshletsFromBuildOutput(geometryVertices, meshlets)

        // let meshletInstances: Meshlet[] = [];
        // for (let i = 0; i < meshlets.meshlets_result.length; i++) {
        //     const meshlet_geometry = meshletGeometries[i];
        //     const vertices = meshlet_geometry.vertices;
        //     const indices = meshlet_geometry.indices;
        //     const meshlet = new Meshlet(vertices, indices);
        //     meshletInstances.push(meshlet);
        //     const meshlet_neighbors = neighbors[i]
        //     this.meshlets.push({
        //         meshlet: meshlet,
        //         index: i,
        //         neighbors: meshlet_neighbors
        //     })
        // }

        // console.log(this.meshlets)

        // meshletsCache.set(geometry, this.meshlets);


        // await Metis.load();

        // console.log(neighbors)

        // const groups = Metis.partition(neighbors, 4);
        // const groupMeshlets = Metis.rebuildMeshletsFromGroupIndices(meshletInstances, groups);
        // console.log("groups", groups);
        // console.log("groupMeshlets", groupMeshlets);
    }
}