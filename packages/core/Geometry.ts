import { UUID } from "./utils/";
import { BoundingVolume } from "./math/BoundingVolume";
import { Vector3 } from "./math/Vector3";
import { Buffer, BufferType } from "./renderer/Buffer";
import { Vector2 } from "./math";
import { CRC32 } from "./utils/CRC32";

export class GeometryAttribute {
    public type = "@trident/core/Geometry/GeometryAttribute";
    public array: Float32Array | Uint32Array | Uint16Array | Uint8Array;
    public buffer: Buffer;
    public currentOffset: number; // This can be used 
    public currentSize: number;
    public count: number;

    private _crc: number;
    public get crc(): number {
        if (this._crc) return this._crc;
        this._crc = CRC32.forBytes(new Uint8Array(this.array));
        return this._crc;
    }

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
        let arrayType = "float32";
        if (this.array instanceof Uint32Array) arrayType = "uint32";
        else if (this.array instanceof Uint16Array) arrayType = "uint16";
        else if (this.array instanceof Uint8Array) arrayType = "uint8";
        return {
            attributeType: this.type,
            array: Array.from(this.array),
            arrayType: arrayType,
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
        let array = undefined;
        if (data.arrayType === "float32") array = new Float32Array(data.array);
        else if (data.arrayType === "uint32") array = new Uint32Array(data.array);
        else if (data.arrayType === "uint16") array = new Uint16Array(data.array);
        else if (data.arrayType === "uint8") array = new Uint8Array(data.array);
        if (array === undefined) throw Error(`Cannot deserialize VertexAttribute, invalid array type "${data.arrayType}"`);

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
        let array = undefined;
        if (data.arrayType === "uint32") array = new Uint32Array(data.array);
        else if (data.arrayType === "uint16") array = new Uint16Array(data.array);
        if (array === undefined) throw Error(`Cannot deserialize VertexAttribute, invalid array type "${data.arrayType}"`);

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
        const vertices = new Float32Array([0.5, 0.5, 0.5,0.5, 0.5, -0.5,0.5, -0.5, 0.5,0.5, -0.5, -0.5,-0.5, 0.5, -0.5,-0.5, 0.5, 0.5,-0.5, -0.5, -0.5,-0.5, -0.5, 0.5,-0.5, 0.5, -0.5,0.5, 0.5, -0.5,-0.5, 0.5, 0.5,0.5, 0.5, 0.5,-0.5, -0.5, 0.5,0.5, -0.5, 0.5,-0.5, -0.5, -0.5,0.5, -0.5, -0.5,-0.5, 0.5, 0.5,0.5, 0.5, 0.5,-0.5, -0.5, 0.5,0.5, -0.5, 0.5,0.5, 0.5, -0.5,-0.5, 0.5, -0.5,0.5, -0.5, -0.5,-0.5, -0.5, -0.5]);
        const uvs = new Float32Array([0, 1,1, 1,0, 0,1, 0,0, 1,1, 1,0, 0,1, 0,0, 1,1, 1,0, 0,1, 0,0, 1,1, 1,0, 0,1, 0,0, 1,1, 1,0, 0,1, 0,0, 1,1, 1,0, 0,1, 0]);
        const normals = new Float32Array([1, 0, 0,1, 0, -0,1, 0, -0,1, 0, -0,-1, 0, 0,-1, 0, -0,-1, 0, -0,-1, 0, -0,0, 1, 0,0, 1, 0,0, 1, 0,0, 1, 0,0, -1, 0,-0, -1, 0,-0, -1, 0,-0, -1, 0,0, -0, 1,0, 0, 1,0, 0, 1,0, 0, 1,0, 0, -1,0, 0, -1,0, 0, -1,0, 0, -1]);
        const indices = new Uint32Array([0, 2, 1,2, 3, 1,4, 6, 5,6, 7, 5,8, 10, 9,10, 11, 9,12, 14, 13,14, 15, 13,16, 18, 17,18, 19, 17,20, 22, 21,22, 23, 21]);

        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.attributes.set("normal", new VertexAttribute(normals));
        geometry.index = new IndexAttribute(indices);

        return geometry;
    }

    public static Plane(): Geometry {
        const vertices = new Float32Array([-1.0, -1.0, 0,1.0, -1.0, 0,1.0, 1.0, 0,-1.0, 1.0, 0])
        const normals = new Float32Array([0.0, 0.0, 1.0,0.0, 0.0, 1.0,0.0, 0.0, 1.0,0.0, 0.0, 1.0]);
        const uvs = new Float32Array([0.0, 1.0,1.0, 1.0,1.0, 0.0,0.0, 0.0]);
        
        const indices = new Uint32Array([0, 1, 2,2, 3, 0]);

        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("normal", new VertexAttribute(normals));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);

        return geometry;
    }

    public static Sphere(): Geometry {
        const vertices = new Float32Array([0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,-0.19,0.46,0,-0.18,0.46,0.07,-0.14,0.46,0.14,-0.07,0.46,0.18,0,0.46,0.19,0.07,0.46,0.18,0.14,0.46,0.14,0.18,0.46,0.07,0.19,0.46,0,0.18,0.46,-0.07,0.14,0.46,-0.14,0.07,0.46,-0.18,0,0.46,-0.19,-0.07,0.46,-0.18,-0.14,0.46,-0.14,-0.18,0.46,-0.07,-0.19,0.46,0,-0.35,0.35,0,-0.33,0.35,0.14,-0.25,0.35,0.25,-0.14,0.35,0.33,0,0.35,0.35,0.14,0.35,0.33,0.25,0.35,0.25,0.33,0.35,0.14,0.35,0.35,0,0.33,0.35,-0.14,0.25,0.35,-0.25,0.14,0.35,-0.33,0,0.35,-0.35,-0.14,0.35,-0.33,-0.25,0.35,-0.25,-0.33,0.35,-0.14,-0.35,0.35,0,-0.46,0.19,0,-0.43,0.19,0.18,-0.33,0.19,0.33,-0.18,0.19,0.43,0,0.19,0.46,0.18,0.19,0.43,0.33,0.19,0.33,0.43,0.19,0.18,0.46,0.19,0,0.43,0.19,-0.18,0.33,0.19,-0.33,0.18,0.19,-0.43,0,0.19,-0.46,-0.18,0.19,-0.43,-0.33,0.19,-0.33,-0.43,0.19,-0.18,-0.46,0.19,0,-0.5,0,0,-0.46,0,0.19,-0.35,0,0.35,-0.19,0,0.46,0,0,0.5,0.19,0,0.46,0.35,0,0.35,0.46,0,0.19,0.5,0,0,0.46,0,-0.19,0.35,0,-0.35,0.19,0,-0.46,0,0,-0.5,-0.19,0,-0.46,-0.35,0,-0.35,-0.46,0,-0.19,-0.5,0,0,-0.46,-0.19,0,-0.43,-0.19,0.18,-0.33,-0.19,0.33,-0.18,-0.19,0.43,0,-0.19,0.46,0.18,-0.19,0.43,0.33,-0.19,0.33,0.43,-0.19,0.18,0.46,-0.19,0,0.43,-0.19,-0.18,0.33,-0.19,-0.33,0.18,-0.19,-0.43,0,-0.19,-0.46,-0.18,-0.19,-0.43,-0.33,-0.19,-0.33,-0.43,-0.19,-0.18,-0.46,-0.19,0,-0.35,-0.35,0,-0.33,-0.35,0.14,-0.25,-0.35,0.25,-0.14,-0.35,0.33,0,-0.35,0.35,0.14,-0.35,0.33,0.25,-0.35,0.25,0.33,-0.35,0.14,0.35,-0.35,0,0.33,-0.35,-0.14,0.25,-0.35,-0.25,0.14,-0.35,-0.33,0,-0.35,-0.35,-0.14,-0.35,-0.33,-0.25,-0.35,-0.25,-0.33,-0.35,-0.14,-0.35,-0.35,0,-0.19,-0.46,0,-0.18,-0.46,0.07,-0.14,-0.46,0.14,-0.07,-0.46,0.18,0,-0.46,0.19,0.07,-0.46,0.18,0.14,-0.46,0.14,0.18,-0.46,0.07,0.19,-0.46,0,0.18,-0.46,-0.07,0.14,-0.46,-0.14,0.07,-0.46,-0.18,0,-0.46,-0.19,-0.07,-0.46,-0.18,-0.14,-0.46,-0.14,-0.18,-0.46,-0.07,-0.19,-0.46,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0]);
        const normals = new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,-0.38,0.92,0,-0.35,0.92,0.15,-0.27,0.92,0.27,-0.15,0.92,0.35,0,0.92,0.38,0.15,0.92,0.35,0.27,0.92,0.27,0.35,0.92,0.15,0.38,0.92,0,0.35,0.92,-0.15,0.27,0.92,-0.27,0.15,0.92,-0.35,0,0.92,-0.38,-0.15,0.92,-0.35,-0.27,0.92,-0.27,-0.35,0.92,-0.15,-0.38,0.92,0,-0.71,0.71,0,-0.65,0.71,0.27,-0.5,0.71,0.5,-0.27,0.71,0.65,0,0.71,0.71,0.27,0.71,0.65,0.5,0.71,0.5,0.65,0.71,0.27,0.71,0.71,0,0.65,0.71,-0.27,0.5,0.71,-0.5,0.27,0.71,-0.65,0,0.71,-0.71,-0.27,0.71,-0.65,-0.5,0.71,-0.5,-0.65,0.71,-0.27,-0.71,0.71,0,-0.92,0.38,0,-0.85,0.38,0.35,-0.65,0.38,0.65,-0.35,0.38,0.85,0,0.38,0.92,0.35,0.38,0.85,0.65,0.38,0.65,0.85,0.38,0.35,0.92,0.38,0,0.85,0.38,-0.35,0.65,0.38,-0.65,0.35,0.38,-0.85,0,0.38,-0.92,-0.35,0.38,-0.85,-0.65,0.38,-0.65,-0.85,0.38,-0.35,-0.92,0.38,0,-1,0,0,-0.92,0,0.38,-0.71,0,0.71,-0.38,0,0.92,0,0,1,0.38,0,0.92,0.71,0,0.71,0.92,0,0.38,1,0,0,0.92,0,-0.38,0.71,0,-0.71,0.38,0,-0.92,0,0,-1,-0.38,0,-0.92,-0.71,0,-0.71,-0.92,0,-0.38,-1,0,0,-0.92,-0.38,0,-0.85,-0.38,0.35,-0.65,-0.38,0.65,-0.35,-0.38,0.85,0,-0.38,0.92,0.35,-0.38,0.85,0.65,-0.38,0.65,0.85,-0.38,0.35,0.92,-0.38,0,0.85,-0.38,-0.35,0.65,-0.38,-0.65,0.35,-0.38,-0.85,0,-0.38,-0.92,-0.35,-0.38,-0.85,-0.65,-0.38,-0.65,-0.85,-0.38,-0.35,-0.92,-0.38,0,-0.71,-0.71,0,-0.65,-0.71,0.27,-0.5,-0.71,0.5,-0.27,-0.71,0.65,0,-0.71,0.71,0.27,-0.71,0.65,0.5,-0.71,0.5,0.65,-0.71,0.27,0.71,-0.71,0,0.65,-0.71,-0.27,0.5,-0.71,-0.5,0.27,-0.71,-0.65,0,-0.71,-0.71,-0.27,-0.71,-0.65,-0.5,-0.71,-0.5,-0.65,-0.71,-0.27,-0.71,-0.71,0,-0.38,-0.92,0,-0.35,-0.92,0.15,-0.27,-0.92,0.27,-0.15,-0.92,0.35,0,-0.92,0.38,0.15,-0.92,0.35,0.27,-0.92,0.27,0.35,-0.92,0.15,0.38,-0.92,0,0.35,-0.92,-0.15,0.27,-0.92,-0.27,0.15,-0.92,-0.35,0,-0.92,-0.38,-0.15,-0.92,-0.35,-0.27,-0.92,-0.27,-0.35,-0.92,-0.15,-0.38,-0.92,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0]);
        const uvs = new Float32Array([0.03,1,0.09,1,0.16,1,0.22,1,0.28,1,0.34,1,0.41,1,0.47,1,0.53,1,0.59,1,0.66,1,0.72,1,0.78,1,0.84,1,0.91,1,0.97,1,1.03,1,0,0.88,0.06,0.88,0.13,0.88,0.19,0.88,0.25,0.88,0.31,0.88,0.38,0.88,0.44,0.88,0.5,0.88,0.56,0.88,0.63,0.88,0.69,0.88,0.75,0.88,0.81,0.88,0.88,0.88,0.94,0.88,1,0.88,0,0.75,0.06,0.75,0.13,0.75,0.19,0.75,0.25,0.75,0.31,0.75,0.38,0.75,0.44,0.75,0.5,0.75,0.56,0.75,0.63,0.75,0.69,0.75,0.75,0.75,0.81,0.75,0.88,0.75,0.94,0.75,1,0.75,0,0.63,0.06,0.63,0.13,0.63,0.19,0.63,0.25,0.63,0.31,0.63,0.38,0.63,0.44,0.63,0.5,0.63,0.56,0.63,0.63,0.63,0.69,0.63,0.75,0.63,0.81,0.63,0.88,0.63,0.94,0.63,1,0.63,0,0.5,0.06,0.5,0.13,0.5,0.19,0.5,0.25,0.5,0.31,0.5,0.38,0.5,0.44,0.5,0.5,0.5,0.56,0.5,0.63,0.5,0.69,0.5,0.75,0.5,0.81,0.5,0.88,0.5,0.94,0.5,1,0.5,0,0.38,0.06,0.38,0.13,0.38,0.19,0.38,0.25,0.38,0.31,0.38,0.38,0.38,0.44,0.38,0.5,0.38,0.56,0.38,0.63,0.38,0.69,0.38,0.75,0.38,0.81,0.38,0.88,0.38,0.94,0.38,1,0.38,0,0.25,0.06,0.25,0.13,0.25,0.19,0.25,0.25,0.25,0.31,0.25,0.38,0.25,0.44,0.25,0.5,0.25,0.56,0.25,0.63,0.25,0.69,0.25,0.75,0.25,0.81,0.25,0.88,0.25,0.94,0.25,1,0.25,0,0.13,0.06,0.13,0.13,0.13,0.19,0.13,0.25,0.13,0.31,0.13,0.38,0.13,0.44,0.13,0.5,0.13,0.56,0.13,0.63,0.13,0.69,0.13,0.75,0.13,0.81,0.13,0.88,0.13,0.94,0.13,1,0.13,-0.03,0,0.03,0,0.09,0,0.16,0,0.22,0,0.28,0,0.34,0,0.41,0,0.47,0,0.53,0,0.59,0,0.66,0,0.72,0,0.78,0,0.84,0,0.91,0,0.97,0]);
        const indices = new Uint32Array([0,17,18,1,18,19,2,19,20,3,20,21,4,21,22,5,22,23,6,23,24,7,24,25,8,25,26,9,26,27,10,27,28,11,28,29,12,29,30,13,30,31,14,31,32,15,32,33,18,17,35,17,34,35,19,18,36,18,35,36,20,19,37,19,36,37,21,20,38,20,37,38,22,21,39,21,38,39,23,22,40,22,39,40,24,23,41,23,40,41,25,24,42,24,41,42,26,25,43,25,42,43,27,26,44,26,43,44,28,27,45,27,44,45,29,28,46,28,45,46,30,29,47,29,46,47,31,30,48,30,47,48,32,31,49,31,48,49,33,32,50,32,49,50,35,34,52,34,51,52,36,35,53,35,52,53,37,36,54,36,53,54,38,37,55,37,54,55,39,38,56,38,55,56,40,39,57,39,56,57,41,40,58,40,57,58,42,41,59,41,58,59,43,42,60,42,59,60,44,43,61,43,60,61,45,44,62,44,61,62,46,45,63,45,62,63,47,46,64,46,63,64,48,47,65,47,64,65,49,48,66,48,65,66,50,49,67,49,66,67,52,51,69,51,68,69,53,52,70,52,69,70,54,53,71,53,70,71,55,54,72,54,71,72,56,55,73,55,72,73,57,56,74,56,73,74,58,57,75,57,74,75,59,58,76,58,75,76,60,59,77,59,76,77,61,60,78,60,77,78,62,61,79,61,78,79,63,62,80,62,79,80,64,63,81,63,80,81,65,64,82,64,81,82,66,65,83,65,82,83,67,66,84,66,83,84,69,68,86,68,85,86,70,69,87,69,86,87,71,70,88,70,87,88,72,71,89,71,88,89,73,72,90,72,89,90,74,73,91,73,90,91,75,74,92,74,91,92,76,75,93,75,92,93,77,76,94,76,93,94,78,77,95,77,94,95,79,78,96,78,95,96,80,79,97,79,96,97,81,80,98,80,97,98,82,81,99,81,98,99,83,82,100,82,99,100,84,83,101,83,100,101,86,85,103,85,102,103,87,86,104,86,103,104,88,87,105,87,104,105,89,88,106,88,105,106,90,89,107,89,106,107,91,90,108,90,107,108,92,91,109,91,108,109,93,92,110,92,109,110,94,93,111,93,110,111,95,94,112,94,111,112,96,95,113,95,112,113,97,96,114,96,113,114,98,97,115,97,114,115,99,98,116,98,115,116,100,99,117,99,116,117,101,100,118,100,117,118,103,102,120,102,119,120,104,103,121,103,120,121,105,104,122,104,121,122,106,105,123,105,122,123,107,106,124,106,123,124,108,107,125,107,124,125,109,108,126,108,125,126,110,109,127,109,126,127,111,110,128,110,127,128,112,111,129,111,128,129,113,112,130,112,129,130,114,113,131,113,130,131,115,114,132,114,131,132,116,115,133,115,132,133,117,116,134,116,133,134,118,117,135,117,134,135,120,119,137,121,120,138,122,121,139,123,122,140,124,123,141,125,124,142,126,125,143,127,126,144,128,127,145,129,128,146,130,129,147,131,130,148,132,131,149,133,132,150,134,133,151,135,134,152]);

        // build geometry
        const geometry = new Geometry();
        geometry.index = new IndexAttribute(new Uint32Array(indices));
        geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
        geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
        geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));

        return geometry;
    }

    public static Cone(): Geometry {
        const vertices = new Float32Array([0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,0,0.5,0,-1,-0.5,0.71,-0.71,-0.5,1,0,-0.5,0.71,0.71,-0.5,0,1,-0.5,-0.71,0.71,-0.5,-1,0,-0.5,-0.71,-0.71,-0.5,0,-1,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,0,-0.5,0,-1,-0.5,0.71,-0.71,-0.5,1,0,-0.5,0.71,0.71,-0.5,0,1,-0.5,-0.71,0.71,-0.5,-1,0,-0.5,-0.71,-0.71,-0.5,0,-1,-0.5]);
        const normals = new Float32Array([0,-0.71,0.71,0.5,-0.5,0.71,0.71,0,0.71,0.5,0.5,0.71,0,0.71,0.71,-0.5,0.5,0.71,-0.71,0,0.71,-0.5,-0.5,0.71,0,-0.71,0.71,0,-0.71,0.71,0.5,-0.5,0.71,0.71,0,0.71,0.5,0.5,0.71,0,0.71,0.71,-0.5,0.5,0.71,-0.71,0,0.71,-0.5,-0.5,0.71,0,-0.71,0.71,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1,0,0,-1]);
        const uvs = new Float32Array([0,1,0.13,1,0.25,1,0.38,1,0.5,1,0.63,1,0.75,1,0.88,1,1,1,0,0,0.13,0,0.25,0,0.38,0,0.5,0,0.63,0,0.75,0,0.88,0,1,0,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.85,0.15,0.5,0,0.15,0.15,0,0.5,0.15,0.85,0.5,1,0.85,0.85,1,0.5]);
        const indices = new Uint32Array([9,10,1,10,11,2,11,12,3,12,13,4,13,14,5,14,15,6,15,16,7,16,17,8,27,26,18,28,27,19,29,28,20,30,29,21,31,30,22,32,31,23,33,32,24,34,33,25]);
        
        const geometry = new Geometry();
        geometry.index = new IndexAttribute(new Uint32Array(indices));
        geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
        geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
        geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));

        return geometry;
    }

    public Serialize(metadata: any = {}): Object {
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