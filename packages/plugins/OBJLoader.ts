import { Object3D } from "../core/Object3D";

import {
    Geometry,
    IndexAttribute,
    VertexAttribute,
    PBRMaterial,
    Mathf
} from "@trident/core";


interface UnpackedAttrs {
    verts: number[];
    norms: number[];
    uvs: number[];
    hashindices: { [k: string]: number };
    indices: number[][];
    index: number;
}

interface OBJMesh {
    vertices: Float32Array,
    normals: Float32Array,
    uvs: Float32Array,
    indices: Uint32Array
};

export class OBJLoaderIndexed {
    public static* triangulate(elements: string[]) {
        if (elements.length <= 3) {
            yield elements;
        } else if (elements.length === 4) {
            yield [elements[0], elements[1], elements[2]];
            yield [elements[2], elements[3], elements[0]];
        } else {
            for (let i = 1; i < elements.length - 1; i++) {
                yield [elements[0], elements[i], elements[i + 1]];
            }
        }
    }

    public static async load(url: string): Promise<Object3D[]> {
        const contents = await fetch(url).then(response => response.text());
        const objMesh = OBJLoaderIndexed.parse(contents);
        return [{
            geometry: this.toGeometry(objMesh),
            material: new PBRMaterial(),
            children: [],
            localMatrix: new Mathf.Matrix4()
        }]
        // return this.toGeometry(objMesh);
    }

    public static parse(contents: string): OBJMesh {
        const indices = [];

        const verts: string[] = [];
        const vertNormals: string[] = [];
        const uvs: string[] = [];
        let currentMaterialIndex = -1;
        let currentObjectByMaterialIndex = 0;
        // unpacking stuff
        const unpacked: UnpackedAttrs = {
            verts: [],
            norms: [],
            uvs: [],
            hashindices: {},
            indices: [[]],
            index: 0,
        };

        const VERTEX_RE = /^v\s/;
        const NORMAL_RE = /^vn\s/;
        const UV_RE = /^vt\s/;
        const FACE_RE = /^f\s/;
        const WHITESPACE_RE = /\s+/;

        // array of lines separated by the newline
        const lines = contents.split("\n");

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("#")) {
                continue;
            }
            const elements = line.split(WHITESPACE_RE);
            elements.shift();

            if (VERTEX_RE.test(line)) {
                verts.push(...elements);
            } else if (NORMAL_RE.test(line)) {
                vertNormals.push(...elements);
            } else if (UV_RE.test(line)) {
                uvs.push(...elements);
            } else if (FACE_RE.test(line)) {
                const triangles = OBJLoaderIndexed.triangulate(elements);
                for (const triangle of triangles) {
                    for (let j = 0, eleLen = triangle.length; j < eleLen; j++) {
                        const hash = triangle[j] + "," + currentMaterialIndex;
                        if (hash in unpacked.hashindices) {
                            unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);
                        } else {
                            const vertex = triangle[j].split("/");
                            
                            // Vertex position
                            unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 0]);
                            unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 1]);
                            unpacked.verts.push(+verts[(+vertex[0] - 1) * 3 + 2]);
                            // vertex normals
                            if (vertNormals.length > 0) {
                                unpacked.norms.push(+vertNormals[(+vertex[2] - 1) * 3 + 0]);
                                unpacked.norms.push(+vertNormals[(+vertex[2] - 1) * 3 + 1]);
                                unpacked.norms.push(+vertNormals[(+vertex[2] - 1) * 3 + 2]);
                            }
                            // uvs
                            if (uvs.length > 0) {
                                // unpacked.uvs.push(+uvs[(+vertex[2] - 1) * 2 + 0]);
                                // unpacked.uvs.push(+uvs[(+vertex[2] - 1) * 2 + 1]);

                                unpacked.uvs.push(+uvs[(+vertex[1] - 1) * 2 + 0]);
                                unpacked.uvs.push(+uvs[(+vertex[1] - 1) * 2 + 1]);
                            }
                            // add the newly created Vertex to the list of indices
                            unpacked.hashindices[hash] = unpacked.index;
                            unpacked.indices[currentObjectByMaterialIndex].push(unpacked.hashindices[hash]);
                            // increment the counter
                            unpacked.index += 1;
                            // throw Error("ERGERG")
                        }
                    }
                }
            }
        }

        return {
            vertices: new Float32Array(unpacked.verts),
            normals: new Float32Array(unpacked.norms),
            uvs: new Float32Array(unpacked.uvs),
            indices: new Uint32Array(unpacked.indices[currentObjectByMaterialIndex])
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