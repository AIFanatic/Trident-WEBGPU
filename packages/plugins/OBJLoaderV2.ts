import { Geometry, IndexAttribute, VertexAttribute } from "../Geometry";

import { Object3D } from "../Object3D";
import { Matrix4 } from "../math/Matrix4";
import { PBRMaterial } from "../renderer/Material";

interface OBJMesh {
    vertices: Float32Array,
    normals: Float32Array,
    uvs: Float32Array,
    indices: Uint32Array
};

export class OBJLoaderIndexed {
    public static async load(url: string): Promise<Object3D[]> {
        const contents = await fetch(url).then(response => response.text());
        const objMesh = OBJLoaderIndexed.parse(contents);
        return [{
            geometry: this.toGeometry(objMesh),
            material: new PBRMaterial(),
            children: [],
            localMatrix: new Matrix4()
        }]
        // return this.toGeometry(objMesh);
    }

    public static parse(str: string): OBJMesh {
        const lines = str.split("\n");

        let vertices: number[] = [];
        let normals: number[] = [];
        let uvs: number[] = [];
        let indices: number[] = [];
        for (const line of lines) {
            const entries = line.split(" ");
            const key = entries[0];

            // Vertex
            if (key === "v") {
                if (entries.length !== 4) throw Error("Invalid vertex length");
                for (let i = 1; i < entries.length; i++) {
                    vertices.push(parseFloat(entries[i]));
                }
            }
            // Normals
            else if (key === "vn") {
                if (entries.length !== 4) throw Error("Invalid normal length");
                for (let i = 1; i < entries.length; i++) {
                    normals.push(parseFloat(entries[i]));
                }
            }
            else if (key === "f") {
                if (entries.length !== 4) throw Error("Invalid face length");
                for (let i = 1; i < entries.length; i++) {
                    const faceData = entries[i].split("/")
                    if (faceData.length !== 3) throw Error("Invalid face data length");
                    const index = parseInt(faceData[0]) - 1;
                    const uv = parseInt(faceData[1]);
                    const vertexNormal = parseInt(faceData[2]);
                    if (!isNaN(uv)) uvs.push(uv);
                    indices.push(index)
                }                    
            }
        }

        return {
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices)
        };
    }

    private static toGeometry(objMesh: OBJMesh): Geometry {
        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(objMesh.vertices));
        if (objMesh.normals.length > 0) geometry.attributes.set("normal", new VertexAttribute(objMesh.normals));
        if (objMesh.uvs.length > 0) geometry.attributes.set("uv", new VertexAttribute(objMesh.uvs));
        else {
            geometry.attributes.set("uv", new VertexAttribute(new Float32Array(objMesh.vertices.length / 3 * 2)))
        }
        if (objMesh.indices.length > 0) geometry.index = new IndexAttribute(new Uint32Array(objMesh.indices));

        return geometry;
    }
}