import { Geometry } from "../../Geometry";
import { CRC32, Utils } from "../../Utils";
import { BoundingVolume } from "../../math/BoundingVolume";
import { Meshoptimizer, meshopt_Bounds } from "./Meshoptimizer";

export class Meshlet {
    public vertices: Float32Array;
    public indices: Uint32Array;

    public id: string = Utils.UUID();

    public lod: number;
    public children: Meshlet[];
    public parents: Meshlet[];


    public _boundingVolume: meshopt_Bounds;
    public get boundingVolume(): meshopt_Bounds {
        if (!this._boundingVolume) this._boundingVolume = Meshoptimizer.meshopt_computeClusterBounds(this.vertices, this.indices);
        return this._boundingVolume;
    }
    public set boundingVolume(boundingVolume: meshopt_Bounds) {
        this._boundingVolume = boundingVolume;
    }

    // public boundingVolume: meshopt_Bounds;
    public parentBoundingVolume: meshopt_Bounds;
    public parentError: number = Infinity;
    public clusterError: number = 0;

    public vertices_gpu: Float32Array;
    public crc: number;

    public bounds: BoundingVolume;

    constructor(vertices: Float32Array, indices: Uint32Array) {
        this.vertices = vertices;
        this.indices = indices;

        // this.boundingVolume = Meshoptimizer.meshopt_computeClusterBounds(vertices, indices);
        
        this.lod = 0;
        this.children = [];
        this.parents = [];

        this.bounds = BoundingVolume.FromVertices(this.vertices);



        const max_vertices = 128;
        // if (this.vertices.length > max_vertices * 4 * 3) throw Error(`Vertices error ${this.vertices.length}!!`);

        // TODO: Get non indexed vertices, this is because no MDI in webgpu
        const verticesNonIndexed = Geometry.ToNonIndexed(this.vertices, this.indices);
        const verticesGPU: number[] = [] // vec4
        for (let i = 0; i < verticesNonIndexed.length; i+=3) {
            verticesGPU.push(verticesNonIndexed[i + 0], verticesNonIndexed[i + 1], verticesNonIndexed[i + 2], 0);
        }

        // TODO: Force vertices to be always of max_vertices * vec4
        // This is not efficient since vertices that dont fill the whole buffer still get drawn.
        // But again no MDI, explore alternatives
        this.vertices_gpu = new Float32Array(max_vertices * 4 * 3);
        // TODO: This is capping vertices, may lead to errors
        this.vertices_gpu.set(verticesGPU.slice(0, max_vertices * 4 * 3));
        this.crc = CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
    }
}