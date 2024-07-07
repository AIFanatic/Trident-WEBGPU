import { Component } from "./Component";
import { Geometry } from "../Geometry";
import { Material } from "../renderer/Material";
import { EventSystem } from "../Events";
import { Meshoptimizer, meshopt_Bounds } from "../plugins/meshlets/Meshoptimizer";
import { CRC32, Utils } from "../Utils";

const meshletsCache: Map<Geometry, Meshlet[]> = new Map();

export class Meshlet {
    public id = Utils.UUID();
    public vertices: Float32Array;
    public bounds: meshopt_Bounds;

    public crc: number;

    constructor(vertices: Float32Array, bounds: meshopt_Bounds) {
        this.vertices = vertices;
        this.bounds = bounds;
        this.crc = CRC32.forBytes(new Uint8Array(vertices.buffer));
    }
}

export class MeshletMesh extends Component {
    private materialsMapped: Map<string, Material[]> = new Map();

    public enableShadows: boolean = true;

    public meshlets: Meshlet[] = [];
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

        const max_vertices = 128;
        const max_triangles = 128;
        const cone_weight = 0.0;

        const vertices = geometry.attributes.get("position");
        const indices = geometry.index;
        if (!vertices || !indices) throw Error("Needs vertices and indices");

        const output = await Meshoptimizer.meshopt_buildMeshlets(vertices.array as Float32Array, indices.array as Uint32Array, max_vertices, max_triangles, cone_weight)
        const meshletGeometries = Meshoptimizer.buildMeshletsFromBuildOutput(vertices.array as Float32Array, output);

        let addV = [];
        for (const meshlet of meshletGeometries) {
            const bounds = await Meshoptimizer.meshopt_computeClusterBounds(meshlet.vertices, meshlet.indices);

            // TODO: Get non indexed vertices, this is because no MDI in webgpu
            const verticesNonIndexed = Geometry.ToNonIndexed(meshlet.vertices, meshlet.indices);
            const vertices: number[] = [] // vec4
            for (let i = 0; i < verticesNonIndexed.length; i+=3) {
                vertices.push(verticesNonIndexed[i + 0], verticesNonIndexed[i + 1], verticesNonIndexed[i + 2], 0);
            }

            // TODO: Force vertices to be always of max_vertices * vec4
            // This is not efficient since vertices that dont fill the whole buffer still get drawn.
            // But again no MDI, explore alternatives
            const finalVertices = new Float32Array(max_vertices * 4 * 3);
            finalVertices.set(vertices);
            
            this.meshlets.push(new Meshlet(finalVertices, bounds));
            addV.push(finalVertices);
        }
        console.log(addV)
        meshletsCache.set(geometry, this.meshlets);
    }
}