import { InterleavedVertexAttribute } from "../../Geometry";
import { BoundingVolume } from "../../math/BoundingVolume";
import { Sphere } from "../../math/Sphere";
import { Vector3 } from "../../math/Vector3";
export interface MeshletBounds {
    cone_apex: Vector3;
    cone_axis: Vector3;
    cone_cutoff: number;
}
export declare class Meshlet {
    static max_triangles: number;
    static max_vertices: number;
    vertices: Float32Array;
    indices: Uint32Array;
    id: string;
    lod: number;
    children: Meshlet[];
    parents: Meshlet[];
    _boundingVolume: Sphere;
    get boundingVolume(): Sphere;
    set boundingVolume(boundingVolume: Sphere);
    parentBoundingVolume: Sphere;
    parentError: number;
    clusterError: number;
    vertices_gpu: Float32Array;
    crc: number;
    bounds: BoundingVolume;
    interleaved: InterleavedVertexAttribute;
    coneBounds: MeshletBounds;
    traversalMetric: {
        boundingSphereRadius: number;
        boundingSphereX: number;
        boundingSphereY: number;
        boundingSphereZ: number;
        maxQuadricError: number;
    };
    constructor(vertices: Float32Array, indices: Uint32Array);
    static convertBufferAttributeToNonIndexed(attribute: Float32Array, indices: Uint32Array, itemSize: number, isInterleaved?: boolean, stride?: number, offset?: number): Float32Array;
}
//# sourceMappingURL=Meshlet.d.ts.map