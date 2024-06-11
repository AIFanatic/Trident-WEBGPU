import { Utils } from "./Utils";
import { Vector3 } from "./math/Vector3";
import { Buffer, BufferType } from "./renderer/Buffer";

export class GeometryAttribute {
    array: Float32Array | Uint32Array;
    buffer: Buffer;

    constructor(array: Float32Array | Uint32Array, type: BufferType) {
        this.array = array;
        this.buffer = Buffer.Create(array.byteLength, type);
        this.buffer.SetArray(this.array);
    }

    public GetBuffer(): Buffer { return this.buffer };
};

export class VertexAttribute extends GeometryAttribute {
    constructor(array: Float32Array) { super(array, BufferType.VERTEX) }
}

export class IndexAttribute extends GeometryAttribute {
    constructor(array: Uint32Array) { super(array, BufferType.INDEX) }
}

export class Geometry {
    public id = Utils.UUID();
    public index?: IndexAttribute;
    public readonly attributes: Map<string, VertexAttribute> = new Map();

    public ComputeNormals() {
        let posAttrData = this.attributes.get("position")?.array;
        let indexAttrData = this.index?.array;
        if (!posAttrData || !indexAttrData) throw Error("Cannot compute normals without vertices and indices");

        let normalAttrData = new Float32Array(posAttrData.length);

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

        let normals = this.attributes.get("normal");
        if (!normals) normals = new VertexAttribute(normalAttrData);
        this.attributes.set("normal", normals);
    }

    public static Cube(): Geometry {
        const vertices = new Float32Array([0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5]);
        const indices = new Uint32Array([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5, 8, 10, 9, 10, 11, 9, 12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22, 21, 22, 23, 21]);
        const uvs = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0]);
        
        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);
        geometry.ComputeNormals();

        return geometry;
    }

    public static Plane(): Geometry {
        const vertices = new Float32Array([
            -1.0,  1.0, 0.0, // Top-left
            1.0,  1.0, 0.0, // Top-right
           -1.0, -1.0, 0.0, // Bottom-left
            1.0, -1.0, 0.0  // Bottom-right
        ])

        const indices = new Uint32Array([
            0, 2, 1, // First triangle
            2, 3, 1  // Second triangle
        ]);

        const uvs = new Float32Array([
            0, 0,  // Bottom-left
            1, 0,  // Bottom-right
            0, 1,  // Top-left
            1, 1   // Top-right
        ]);

        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);
        geometry.ComputeNormals();
        
        return geometry;
    }
}