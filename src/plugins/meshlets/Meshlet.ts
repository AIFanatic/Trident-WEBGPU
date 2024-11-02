import { InterleavedVertexAttribute } from "../../Geometry";
import { Utils } from "../../utils/Utils";
import { BoundingVolume } from "../../math/BoundingVolume";
import { Sphere } from "../../math/Sphere";
import { CRC32 } from "../../utils/CRC32";
import { attribute_size } from "./Meshoptimizer";

export class Meshlet {
    public static max_triangles = 128;

    public vertices: Float32Array;
    public indices: Uint32Array;

    public id: string = Utils.UUID();

    public lod: number;
    public children: Meshlet[];
    public parents: Meshlet[];


    public _boundingVolume: Sphere;
    public get boundingVolume(): Sphere {
        // if (!this._boundingVolume) this._boundingVolume = Meshoptimizer.meshopt_computeClusterBounds(this.vertices, this.indices);
        if (!this._boundingVolume) this._boundingVolume = Sphere.fromVertices(this.vertices, this.indices, attribute_size);
        return this._boundingVolume;
    }
    public set boundingVolume(boundingVolume: Sphere) {
        this._boundingVolume = boundingVolume;
    }

    // public boundingVolume: Sphere;
    public parentBoundingVolume: Sphere;
    public parentError: number = Infinity;
    public clusterError: number = 0;

    public vertices_gpu: Float32Array;
    public crc: number;

    public bounds: BoundingVolume;

    // Temp
    public interleaved: InterleavedVertexAttribute;

    constructor(vertices: Float32Array, indices: Uint32Array) {
        this.vertices = vertices;
        this.indices = indices;

        this.lod = 0;
        this.children = [];
        this.parents = [];

        this.bounds = BoundingVolume.FromVertices(this.vertices);



        // if (this.vertices.length > max_vertices * 4 * 3) throw Error(`Vertices error ${this.vertices.length}!!`);

        // TODO: Get non indexed vertices, this is because no MDI in webgpu
        // const verticesNonIndexed = Geometry.ToNonIndexed(this.vertices, this.indices);
        const verticesNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 0);
        const normalsNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 3);
        const uvsNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 2, true, 8, 6);
        // console.log("verticesNonIndexed", verticesNonIndexed);
        // console.log("normalsNonIndexed", normalsNonIndexed);
        // console.log("uvsNonIndexed", uvsNonIndexed);
        const interleaved = InterleavedVertexAttribute.fromArrays([verticesNonIndexed, normalsNonIndexed, uvsNonIndexed], [3,3,2]);
        this.interleaved = this.interleaved;
        // console.log("interleaved", interleaved);

        // console.log("verticesNonIndexed", verticesNonIndexed)
        const verticesGPU: number[] = [] // vec4
        for (let i = 0; i < interleaved.array.length; i+=8) {
            verticesGPU.push(
                interleaved.array[i + 0], interleaved.array[i + 1], interleaved.array[i + 2], 0,
                interleaved.array[i + 3], interleaved.array[i + 4], interleaved.array[i + 5], 0,
                interleaved.array[i + 6], interleaved.array[i + 7], 0, 0
            );
        }
        // this.vertices_gpu = new Float32Array(verticesGPU);
        // const verticesGPU = interleaved.array;
        // console.log("verticesGPU", verticesGPU)

        // TODO: Force vertices to be always of max_vertices * vec4
        // This is not efficient since vertices that dont fill the whole buffer still get drawn.
        // But again no MDI, explore alternatives
        this.vertices_gpu = new Float32Array(Meshlet.max_triangles * (4 + 4 + 4) * 3);
        // TODO: This is capping vertices, may lead to errors
        this.vertices_gpu.set(verticesGPU.slice(0, Meshlet.max_triangles * (4 + 4 + 4) * 3));
        this.crc = CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
    }

    private static convertBufferAttributeToNonIndexed(attribute: Float32Array, indices: Uint32Array, itemSize: number, isInterleaved: boolean = false, stride: number = 3, offset: number = 0): Float32Array {
        if (!attribute) throw Error("Invalid attribute");

        const array = attribute;
        const array2 = new Float32Array( indices.length * itemSize );

        let index = 0, index2 = 0;

        for ( let i = 0, l = indices.length; i < l; i ++ ) {
            if (isInterleaved === true) index = indices[ i ] * stride + offset;
            else index = indices[ i ] * itemSize;

            for ( let j = 0; j < itemSize; j ++ ) {
                array2[ index2 ++ ] = array[ index ++ ];
            }
        }

        return array2;
    }
}