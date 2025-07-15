import { Object3D } from "../Object3D";
interface OBJMesh {
    vertices: Float32Array;
    normals: Float32Array;
    uvs: Float32Array;
    indices: Uint32Array;
}
export declare class OBJLoaderIndexed {
    static load(url: string): Promise<Object3D[]>;
    static parse(str: string): OBJMesh;
    private static toGeometry;
}
export {};
//# sourceMappingURL=OBJLoaderV2.d.ts.map