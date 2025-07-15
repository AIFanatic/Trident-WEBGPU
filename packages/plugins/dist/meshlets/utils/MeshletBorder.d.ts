interface Mesh {
    vertices: Float32Array;
    indices: Uint32Array;
}
export declare class MeshletBorder {
    static GetSharedVertices(meshes: Mesh[], attribute_size: any): number[][];
    private static getVertexIndicesForVertexKeys;
    static SharedVerticesToLockedArray(sharedVertices: number[][], mesh: Mesh, attribute_size: number): Uint8Array;
}
export {};
//# sourceMappingURL=MeshletBorder.d.ts.map