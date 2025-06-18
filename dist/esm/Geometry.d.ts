import { BoundingVolume } from "./math/BoundingVolume";
import { Vector3 } from "./math/Vector3";
import { Buffer, BufferType } from "./renderer/Buffer";
export declare class GeometryAttribute {
    array: Float32Array | Uint32Array;
    buffer: Buffer;
    constructor(array: Float32Array | Uint32Array, type: BufferType);
    GetBuffer(): Buffer;
}
export declare class VertexAttribute extends GeometryAttribute {
    constructor(array: Float32Array);
}
export declare class InterleavedVertexAttribute extends GeometryAttribute {
    array: Float32Array;
    stride: number;
    constructor(array: Float32Array, stride: number);
    static fromArrays(attributes: Float32Array[], inputStrides: number[], outputStrides?: number[]): InterleavedVertexAttribute;
}
export declare class IndexAttribute extends GeometryAttribute {
    constructor(array: Uint32Array);
}
export declare class Geometry {
    id: string;
    index?: IndexAttribute;
    readonly attributes: Map<string, VertexAttribute | InterleavedVertexAttribute>;
    enableShadows: boolean;
    _boundingVolume: BoundingVolume;
    get boundingVolume(): BoundingVolume;
    ComputeBoundingVolume(): void;
    Clone(): Geometry;
    private ApplyOperationToVertices;
    Center(): Geometry;
    Scale(scale: Vector3): Geometry;
    ComputeNormals(): void;
    static ToNonIndexed(vertices: Float32Array, indices: Uint32Array): Float32Array;
    static Cube(): Geometry;
    static Plane(): Geometry;
    static Sphere(): Geometry;
}
