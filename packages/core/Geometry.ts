import { UUID } from "./utils/";
import { BoundingVolume } from "./math/BoundingVolume";
import { Vector3 } from "./math/Vector3";
import { Buffer, BufferType } from "./renderer/Buffer";
import { Vector2 } from "./math";

export class GeometryAttribute {
    public type = "@trident/core/Geometry/GeometryAttribute";
    public array: Float32Array | Uint32Array | Uint16Array | Uint8Array;
    public buffer: Buffer;
    public currentOffset: number; // This can be used 
    public currentSize: number;
    public count: number;

    constructor(array: Float32Array | Uint32Array | Uint16Array | Uint8Array, type: BufferType) {
        if (array.length === 0) throw Error("GeometryAttribute data is empty");
    
        let bufferArray: typeof array = array;
        let bufferSize = array.byteLength;
    
        // WebGPU requires buffer sizes to be multiples of 4 bytes
        if (bufferSize % 4 !== 0) {
            bufferSize = Math.ceil(bufferSize / 4) * 4;
    
            if (array instanceof Uint16Array) {
                const paddedLength = bufferSize / Uint16Array.BYTES_PER_ELEMENT;
                const paddedArray = new Uint16Array(paddedLength);
                paddedArray.set(array);
                bufferArray = paddedArray;
            } else if (array instanceof Uint8Array) {
                const paddedLength = bufferSize / Uint8Array.BYTES_PER_ELEMENT;
                const paddedArray = new Uint8Array(paddedLength);
                paddedArray.set(array);
                bufferArray = paddedArray;
            }
            // Float32Array / Uint32Array are already 4-byte aligned
        }
    
        this.array = array;                     // logical data
        this.buffer = Buffer.Create(bufferSize, type);
        this.buffer.SetArray(bufferArray);      // upload padded array
        this.currentOffset = 0;
        this.currentSize = array.byteLength;    // actual used size (not padded)
        this.count = array.length;              // number of elements
    }
    

    public GetBuffer(): Buffer { return this.buffer };

    public Destroy() {
        this.buffer.Destroy();
    }

    public Serialize(): Object {
        return {
            attributeType: this.type,
            array: Array.from(this.array),
            arrayType: this.array instanceof Float32Array ? "float32" : "uint32",
            currentOffset: this.currentOffset,
            currentSize: this.currentSize
        }
    }
};

export class VertexAttribute extends GeometryAttribute {
    public type = "@trident/core/Geometry/VertexAttribute";
    constructor(array: Float32Array | Uint32Array | Uint16Array | Uint8Array) {
        super(array, BufferType.VERTEX);
    }
    
    public static Deserialize(data: any): VertexAttribute {
        const array = data.arrayType === "float32" ? new Float32Array(data.array) : new Uint32Array(data.array);
        const vertexAttribute = new VertexAttribute(array);
        vertexAttribute.currentOffset = data.currentOffset;
        vertexAttribute.currentSize = data.currentSize;
        return vertexAttribute;
    }
}

// TODO: Support true interleaved vertex buffers
// A buffer is shared, only offsets and count changes
export class InterleavedVertexAttribute extends GeometryAttribute {
    public type = "@trident/core/Geometry/InterleavedVertexAttribute";
    constructor(public array: Float32Array, public stride: number) {
        super(array, BufferType.VERTEX);
    }

    public static fromArrays(attributes: Float32Array[], inputStrides: number[], outputStrides?: number[]): InterleavedVertexAttribute {
        function stridedCopy(target: Float32Array, values: ArrayLike<number>, offset: number, inputStride: number, outputStride: number, interleavedStride: number) {
            let writeIndex = offset;
            for (let i = 0; i < values.length; i += inputStride) {
                for (let j = 0; j < inputStride && i + j < values.length; j++) {
                    target[writeIndex + j] = values[i + j];
                }
                for (let j = inputStride; j < outputStride; j++) { // Fill the remaining slots with zeros
                    target[writeIndex + j] = 0;
                }
                writeIndex += interleavedStride;
            }
        }

        if (!outputStrides) outputStrides = inputStrides;
        const interleavedStride = outputStrides.reduce((a, b) => a + b, 0);
        let totalLength = 0;
        for (let i = 0; i < attributes.length; i++) {
            totalLength += (attributes[i].length / inputStrides[i]) * outputStrides[i];
        }
        const interleavedArray = new Float32Array(totalLength);

        let offset = 0;
        for (let i = 0; i < attributes.length; i++) {
            const attribute = attributes[i];
            const inputStride = inputStrides[i];
            const outputStride = outputStrides[i];

            stridedCopy(interleavedArray, attribute, offset, inputStride, outputStride, interleavedStride);
            offset += outputStride;
        }

        return new InterleavedVertexAttribute(interleavedArray, interleavedStride);
    }

    public static Deserialize(data: any): InterleavedVertexAttribute {
        const array = new Float32Array(data.array);
        const interleavedVertexAttribute = new InterleavedVertexAttribute(array, data.stride);
        interleavedVertexAttribute.currentOffset = data.currentOffset;
        interleavedVertexAttribute.currentSize = data.currentSize;
        return interleavedVertexAttribute;
    }
}

export class IndexAttribute extends GeometryAttribute {
    public type = "@trident/core/Geometry/IndexAttribute";
    public format: "uint32" | "uint16";
    constructor(array: Uint32Array | Uint16Array) {
        super(array, BufferType.INDEX);
        this.format = array instanceof Uint32Array ? "uint32" : "uint16";
    }

    public static Deserialize(data: any): IndexAttribute {
        const array = new Uint32Array(data.array);
        const indexAttribute = new IndexAttribute(array);
        indexAttribute.currentOffset = data.currentOffset;
        indexAttribute.currentSize = data.currentSize;
        return indexAttribute;
    }
}

export class Geometry {
    public id = UUID();
    public name: string = "";
    public index?: IndexAttribute;
    public readonly attributes: Map<string, VertexAttribute | InterleavedVertexAttribute> = new Map();

    public _boundingVolume: BoundingVolume;
    public get boundingVolume(): BoundingVolume {
        const positions = this.attributes.get("position");
        if (!positions) throw Error("Geometry has no position attribute");
        if (!this._boundingVolume) this._boundingVolume = BoundingVolume.FromVertices(positions.array as Float32Array);
        return this._boundingVolume;
    }

    public ComputeBoundingVolume() {
        const positions = this.attributes.get("position");
        if (!positions) throw Error("Geometry has no position attribute");
        this._boundingVolume = BoundingVolume.FromVertices(positions.array as Float32Array);
    }

    public Clone(): Geometry {
        const clone = new Geometry();

        for (const attribute of this.attributes) {
            clone.attributes.set(attribute[0], attribute[1]);
        }
        if (this.index) {
            clone.index = new IndexAttribute(this.index.array as Uint32Array);
        }
        return clone;
    }

    private ApplyOperationToVertices(operation: "+" | "*", vec: Vector3): Geometry {
        let verts = this.attributes.get("position");
        if (!verts) throw Error("No verts");

        if (verts instanceof InterleavedVertexAttribute) throw Error("InterleavedVertexAttribute not implemented.");

        const center = this.boundingVolume.center;
        let vertsCentered = new Float32Array(verts.array.length);
        for (let i = 0; i < verts.array.length; i += 3) {
            if (operation === "+") {
                vertsCentered[i + 0] = verts.array[i + 0] + vec.x;
                vertsCentered[i + 1] = verts.array[i + 1] + vec.y;
                vertsCentered[i + 2] = verts.array[i + 2] + vec.z;
            }
            else if (operation === "*") {
                vertsCentered[i + 0] = verts.array[i + 0] * vec.x;
                vertsCentered[i + 1] = verts.array[i + 1] * vec.y;
                vertsCentered[i + 2] = verts.array[i + 2] * vec.z;
            }
        }

        const geometryCentered = this.Clone();
        geometryCentered.attributes.set("position", new VertexAttribute(vertsCentered));
        return geometryCentered;
    }

    public Center(): Geometry {
        const center = this.boundingVolume.center;
        return this.ApplyOperationToVertices("+", center.mul(-1));
    }

    public Scale(scale: Vector3): Geometry {
        return this.ApplyOperationToVertices("*", scale);
    }

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

    // From THREE.js (adapted/fixed)
    public ComputeTangents() {
        const index = this.index;

        const positionAttribute = this.attributes.get("position");
        const normalAttribute = this.attributes.get("normal");
        const uvAttribute = this.attributes.get("uv");

        if (!index || !positionAttribute || !normalAttribute || !uvAttribute) {
            console.error("computeTangents() failed. Missing required attributes (index, position, normal or uv)");
            return;
        }

        const pos = positionAttribute.array as Float32Array;
        const nor = normalAttribute.array as Float32Array;
        const uvs = uvAttribute.array as Float32Array;
        const ia = index.array as Uint32Array | Uint16Array | Uint8Array; // whatever you use

        const vertexCount = pos.length / 3;

        // Ensure tangent attribute exists & has the right size (vec4 per vertex)
        let tangentAttribute = this.attributes.get("tangent");
        if (!tangentAttribute || tangentAttribute.array.length !== 4 * vertexCount) {
            tangentAttribute = new VertexAttribute(new Float32Array(4 * vertexCount));
            this.attributes.set("tangent", tangentAttribute);
        } else {
            (tangentAttribute.array as Float32Array).fill(0);
        }
        const tang = tangentAttribute.array as Float32Array;

        // Accumulators
        const tan1: Vector3[] = new Array(vertexCount);
        const tan2: Vector3[] = new Array(vertexCount);
        for (let i = 0; i < vertexCount; i++) {
            tan1[i] = new Vector3();
            tan2[i] = new Vector3();
        }

        const vA = new Vector3(), vB = new Vector3(), vC = new Vector3();
        const uvA = new Vector2(), uvB = new Vector2(), uvC = new Vector2();
        const sdir = new Vector3(), tdir = new Vector3();

        function handleTriangle(a: number, b: number, c: number) {
            // positions
            vA.set(pos[a * 3 + 0], pos[a * 3 + 1], pos[a * 3 + 2]);
            vB.set(pos[b * 3 + 0], pos[b * 3 + 1], pos[b * 3 + 2]);
            vC.set(pos[c * 3 + 0], pos[c * 3 + 1], pos[c * 3 + 2]);

            // uvs
            uvA.set(uvs[a * 2 + 0], uvs[a * 2 + 1]);
            uvB.set(uvs[b * 2 + 0], uvs[b * 2 + 1]);
            uvC.set(uvs[c * 2 + 0], uvs[c * 2 + 1]);

            // edges
            vB.sub(vA);
            vC.sub(vA);
            uvB.sub(uvA);
            uvC.sub(uvA);

            const denom = uvB.x * uvC.y - uvC.x * uvB.y;
            // silently ignore degenerate UV triangles
            if (!isFinite(denom) || Math.abs(denom) < 1e-8) return;

            const r = 1.0 / denom;

            // sdir/tdir
            sdir.copy(vB).mul(uvC.y).add(vC.clone().mul(-uvB.y)).mul(r);
            tdir.copy(vC).mul(uvB.x).add(vB.clone().mul(-uvC.x)).mul(r);

            tan1[a].add(sdir); tan1[b].add(sdir); tan1[c].add(sdir);
            tan2[a].add(tdir); tan2[b].add(tdir); tan2[c].add(tdir);
        }

        // Walk the index buffer (triangles)
        for (let j = 0; j < ia.length; j += 3) {
            handleTriangle(ia[j + 0], ia[j + 1], ia[j + 2]);
        }

        const tmp = new Vector3();
        const n = new Vector3();
        const n2 = new Vector3();
        const ccv = new Vector3(); // cross-check vector

        function handleVertex(v: number) {
            n.set(nor[v * 3 + 0], nor[v * 3 + 1], nor[v * 3 + 2]);
            n2.copy(n);

            const t = tan1[v];

            // Gram–Schmidt orthogonalize (use clone to avoid mutating n)
            tmp.copy(t);
            const ndott = n.dot(t);
            tmp.sub(n.clone().mul(ndott));

            // Fallback if zero-length after projection (e.g., flat/degenerate UVs)
            if (!isFinite(tmp.x) || !isFinite(tmp.y) || !isFinite(tmp.z) || tmp.lengthSq() === 0) {
                // pick any orthogonal
                const ortho = Math.abs(n.x) > 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
                tmp.copy(ortho.cross(n));
            }
            tmp.normalize();

            // Handedness
            // ccv.crossVectors(n2, t);
            ccv.copy(n2).cross(t);
            const w = (ccv.dot(tan2[v]) < 0.0) ? -1.0 : 1.0;

            tang[v * 4 + 0] = tmp.x;
            tang[v * 4 + 1] = tmp.y;
            tang[v * 4 + 2] = tmp.z;
            tang[v * 4 + 3] = w;
        }

        for (let j = 0; j < ia.length; j += 3) {
            handleVertex(ia[j + 0]);
            handleVertex(ia[j + 1]);
            handleVertex(ia[j + 2]);
        }

        this.attributes.set("tangent", new VertexAttribute(tang))
    }

    public Destroy() {
        for (const [_, attribute] of this.attributes) attribute.Destroy();
        if (this.index) this.index.Destroy();
    }

    public static ToNonIndexed(vertices: Float32Array, indices: Uint32Array): Float32Array {
        const itemSize = 3;
        const array2 = new Float32Array(indices.length * itemSize);

        let index = 0, index2 = 0;
        for (let i = 0, l = indices.length; i < l; i++) {
            index = indices[i] * itemSize;
            for (let j = 0; j < itemSize; j++) {
                array2[index2++] = vertices[index++];
            }
        }

        return array2;
    }

    public static Cube(): Geometry {
        const vertices = new Float32Array([
            0.5, 0.5, 0.5,
            0.5, 0.5, -0.5,
            0.5, -0.5, 0.5,
            0.5, -0.5, -0.5,
            -0.5, 0.5, -0.5,
            -0.5, 0.5, 0.5,
            -0.5, -0.5, -0.5,
            -0.5, -0.5, 0.5,
            -0.5, 0.5, -0.5,
            0.5, 0.5, -0.5,
            -0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            -0.5, -0.5, -0.5,
            0.5, -0.5, -0.5,
            -0.5, 0.5, 0.5,
            0.5, 0.5, 0.5,
            -0.5, -0.5, 0.5,
            0.5, -0.5, 0.5,
            0.5, 0.5, -0.5,
            -0.5, 0.5, -0.5,
            0.5, -0.5, -0.5,
            -0.5, -0.5, -0.5
        ]);

        const uvs = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 0,
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);

        const normals = new Float32Array([
            1, 0, 0,
            1, 0, -0,
            1, 0, -0,
            1, 0, -0,
            -1, 0, 0,
            -1, 0, -0,
            -1, 0, -0,
            -1, 0, -0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
            0, -1, 0,
            -0, -1, 0,
            -0, -1, 0,
            -0, -1, 0,
            0, -0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1,
            0, 0, -1
        ]);

        const indices = new Uint32Array([
            0, 2, 1,
            2, 3, 1,
            4, 6, 5,
            6, 7, 5,
            8, 10, 9,
            10, 11, 9,
            12, 14, 13,
            14, 15, 13,
            16, 18, 17,
            18, 19, 17,
            20, 22, 21,
            22, 23, 21
        ]);

        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.attributes.set("normal", new VertexAttribute(normals));
        geometry.index = new IndexAttribute(indices);

        return geometry;
    }

    public static Plane(): Geometry {
        const vertices = new Float32Array([
            -1.0, -1.0, 0,  // Bottom left
            1.0, -1.0, 0,  // Bottom right
            1.0, 1.0, 0,  // Top right
            -1.0, 1.0, 0   // Top left
        ])

        const indices = new Uint32Array([
            0, 1, 2,  // First triangle (bottom left to top right)
            2, 3, 0   // Second triangle (top right to top left)
        ]);

        const uvs = new Float32Array([
            0.0, 1.0,  // Bottom left (now top left)
            1.0, 1.0,  // Bottom right (now top right)
            1.0, 0.0,  // Top right (now bottom right)
            0.0, 0.0   // Top left (now bottom left)
        ]);

        const normals = new Float32Array([
            0.0, 0.0, 1.0,  // Normal for bottom left vertex
            0.0, 0.0, 1.0,  // Normal for bottom right vertex
            0.0, 0.0, 1.0,  // Normal for top right vertex
            0.0, 0.0, 1.0   // Normal for top left vertex
        ]);

        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("normal", new VertexAttribute(normals));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);
        // geometry.ComputeNormals();

        return geometry;
    }

    public static Sphere(): Geometry {
        const radius = 0.5;
        const phiStart = 0;
        const phiLength = Math.PI * 2;
        const thetaStart = 0;
        const thetaLength = Math.PI;

        let widthSegments = 16; // 16;
        let heightSegments = 8; // 8;
        widthSegments = Math.max(3, Math.floor(widthSegments));
        heightSegments = Math.max(2, Math.floor(heightSegments));

        const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);

        let index = 0;
        const grid: number[][] = [];

        const vertex = new Vector3();
        const normal = new Vector3();

        // buffers
        const indices: number[] = [];
        const vertices: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];

        // generate vertices, normals and uvs
        for (let iy = 0; iy <= heightSegments; iy++) {
            const verticesRow: number[] = [];

            const v = iy / heightSegments;

            // special case for the poles
            let uOffset = 0;

            if (iy === 0 && thetaStart === 0) uOffset = 0.5 / widthSegments;
            else if (iy === heightSegments && thetaEnd === Math.PI) uOffset = - 0.5 / widthSegments;

            for (let ix = 0; ix <= widthSegments; ix++) {
                const u = ix / widthSegments;

                // vertex
                vertex.x = - radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
                vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
                vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
                vertices.push(vertex.x, vertex.y, vertex.z);

                // normal
                normal.copy(vertex).normalize();
                normals.push(normal.x, normal.y, normal.z);

                // uv
                uvs.push(u + uOffset, 1 - v);
                verticesRow.push(index++);
            }
            grid.push(verticesRow);
        }

        // indices
        for (let iy = 0; iy < heightSegments; iy++) {
            for (let ix = 0; ix < widthSegments; ix++) {
                const a = grid[iy][ix + 1];
                const b = grid[iy][ix];
                const c = grid[iy + 1][ix];
                const d = grid[iy + 1][ix + 1];

                if (iy !== 0 || thetaStart > 0) indices.push(a, b, d);
                if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d);
            }
        }

        // build geometry
        const geometry = new Geometry();
        geometry.index = new IndexAttribute(new Uint32Array(indices));
        geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
        geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
        geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));

        return geometry;
    }

    public Serialize(): Object {
        return {
            id: this.id,
            name: this.name,
            attributes: Array.from(this.attributes, ([key, attribute]) => Object.assign(attribute.Serialize(), {name: key})),
            index: this.index ? this.index.Serialize() : undefined
        }
    }

    public Deserialize(data: any) {
        this.id = data.id;
        this.name = data.name;

        for (const attribute of data.attributes) {
            this.attributes.set(attribute.name, VertexAttribute.Deserialize(attribute));
        }

        if (data.index) {
            this.index = IndexAttribute.Deserialize(data.index);
        }
    }
}