import { Utils } from "./Utils";
import { Vector3 } from "./math/Vector3";
import { Buffer, BufferType } from "./renderer/Buffer";

export class Geometry {
    public id = Utils.UUID();
    public readonly vertices: Float32Array;
    public readonly indices: Uint32Array;
    public readonly normals: Float32Array;

    public readonly vertexBuffer: Buffer;
    public readonly normalBuffer: Buffer;
    public readonly indexBuffer: Buffer;

    constructor(vertices: Float32Array, indices?: Uint32Array) {
        this.vertices = vertices;
        this.vertexBuffer = Buffer.Create(this.vertices.byteLength, BufferType.VERTEX);
        this.vertexBuffer.SetArray(this.vertices);
        if (indices) {
            this.indices = indices;
            this.normals = Geometry.ComputeNormals(this.vertices, this.indices);
            this.indexBuffer = Buffer.Create(this.indices.byteLength, BufferType.INDEX);
            this.normalBuffer = Buffer.Create(this.normals.byteLength, BufferType.VERTEX);
            this.indexBuffer.SetArray(this.indices);
            this.normalBuffer.SetArray(this.normals);
        }
    }

    public static ComputeNormals(vertices: Float32Array, indices: Uint32Array): Float32Array {
        let posAttrData = vertices;
        let normalAttrData = new Float32Array(vertices.length);
        let indexAttrData = indices;

        let trianglesCount = indexAttrData.length / 3;
        let point1 = new Vector3(0, 1, 0);
        let point2 = new Vector3(0, 1, 0);
        let point3 = new Vector3(0, 1, 0);
        let crossA = new Vector3(0, 1, 0);
        let crossB = new Vector3(0, 1, 0);

        for (let i = 0; i < trianglesCount; i++) {
            let index1 = indexAttrData[i * 3];
            let index2 = indexAttrData[i * 3 + 1];
            let index3 = indexAttrData[i * 3 + 2];

            point1.set(posAttrData[index1 * 3], posAttrData[index1 * 3 + 1], posAttrData[index1 * 3 + 2]);
            point2.set(posAttrData[index2 * 3], posAttrData[index2 * 3 + 1], posAttrData[index2 * 3 + 2]);
            point3.set(posAttrData[index3 * 3], posAttrData[index3 * 3 + 1], posAttrData[index3 * 3 + 2]);

            crossA.copy(point1).sub(point2).normalize();
            crossB.copy(point1).sub(point3).normalize();

            let normal = crossA.clone().cross(crossB).normalize();

            normalAttrData[index1 * 3] = normalAttrData[index2 * 3] = normalAttrData[index3 * 3] = normal.x;
            normalAttrData[index1 * 3 + 1] = normalAttrData[index2 * 3 + 1] = normalAttrData[index3 * 3 + 1] = normal.y;
            normalAttrData[index1 * 3 + 2] = normalAttrData[index2 * 3 + 2] = normalAttrData[index3 * 3 + 2] = normal.z;
        }

        return normalAttrData;
    }
}