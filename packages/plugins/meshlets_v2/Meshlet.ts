import {
    Geometry, InterleavedVertexAttribute,
    Mathf,
    Utils
}  from "@trident/core";


export interface MeshletBounds {
    cone_apex: Mathf.Vector3;
    cone_axis: Mathf.Vector3;
    cone_cutoff: number;
}

export class Meshlet {
    public static max_triangles = 128;
    public static max_vertices = 255;

    public vertices: Float32Array;
    public indices: Uint32Array;

    public id: string = Utils.UUID();

    public lod: number;
    public children: Meshlet[];
    public parents: Meshlet[];


    public _boundingVolume: Mathf.Sphere;
    public get boundingVolume(): Mathf.Sphere {
        // if (!this._boundingVolume) this._boundingVolume = Meshoptimizer.meshopt_computeClusterBounds(this.vertices, this.indices);
        // if (!this._boundingVolume) this._boundingVolume = Sphere.fromVertices(this.vertices, this.indices, attribute_size);
        return this._boundingVolume;
    }
    public set boundingVolume(boundingVolume: Mathf.Sphere) {
        this._boundingVolume = boundingVolume;
    }

    // public boundingVolume: Sphere;
    public parentBoundingVolume: Mathf.Sphere;
    public parentError: number = Infinity;
    public clusterError: number = 0;

    public vertices_gpu: Float32Array;
    public crc: number;

    public bounds: Mathf.BoundingVolume;

    public interleaved: InterleavedVertexAttribute;

    public coneBounds: MeshletBounds;

    public traversalMetric: {
        boundingSphereRadius: number;
        boundingSphereX: number;
        boundingSphereY: number;
        boundingSphereZ: number;
        maxQuadricError: number;
    };

    constructor(vertices: Float32Array, indices: Uint32Array) {
        this.vertices = vertices;
        this.indices = indices;

        this.lod = 0;
        this.children = [];
        this.parents = [];

        this.bounds = Mathf.BoundingVolume.FromVertices(this.vertices);
        // if (this.indices.length / 3 < Meshoptimizer.kMeshletMaxTriangles) {
        //     const coneBounds = Meshoptimizer.meshopt_computeClusterBounds(this.vertices, this.indices);
        //     this.coneBounds = {cone_apex: coneBounds.cone_apex, cone_axis: coneBounds.cone_axis, cone_cutoff: coneBounds.cone_cutoff};
        // }
        this.coneBounds = {cone_apex: new Mathf.Vector3(), cone_axis: new Mathf.Vector3(), cone_cutoff: 0};

        // TODO: Get non indexed vertices, this is because no MDI in webgpu
        const verticesNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 0);
        const normalsNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 3, true, 8, 3);
        const uvsNonIndexed = Meshlet.convertBufferAttributeToNonIndexed(this.vertices, this.indices, 2, true, 8, 6);
        const interleaved = InterleavedVertexAttribute.fromArrays([verticesNonIndexed, normalsNonIndexed, uvsNonIndexed], [3,3,2]);
        const verticesGPU: number[] = [] // vec4
        for (let i = 0; i < interleaved.array.length; i+=8) {
            // verticesGPU.push(
            //     interleaved.array[i + 0], interleaved.array[i + 1], interleaved.array[i + 2], 0,
            //     interleaved.array[i + 3], interleaved.array[i + 4], interleaved.array[i + 5], 0,
            //     interleaved.array[i + 6], interleaved.array[i + 7], 0, 0
            // );

            verticesGPU.push(
                interleaved.array[i + 0], interleaved.array[i + 1], interleaved.array[i + 2],
                interleaved.array[i + 3], interleaved.array[i + 4], interleaved.array[i + 5],
                interleaved.array[i + 6], interleaved.array[i + 7],
            );
        }
        this.interleaved = interleaved


        // TODO: Force vertices to be always of max_vertices * vec4
        // This is not efficient since vertices that dont fill the whole buffer still get drawn.
        // But again no MDI, explore alternatives
        this.vertices_gpu = new Float32Array(Meshlet.max_triangles * (3 + 3 + 2) * 3);
        // TODO: This is capping vertices, may lead to errors
        this.vertices_gpu.set(verticesGPU.slice(0, Meshlet.max_triangles * (3 + 3 + 2) * 3));
        this.crc = Utils.CRC32.forBytes(new Uint8Array(this.vertices_gpu.buffer));
    }

    public static convertBufferAttributeToNonIndexed(attribute: Float32Array, indices: Uint32Array, itemSize: number, isInterleaved: boolean = false, stride: number = 3, offset: number = 0): Float32Array {
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