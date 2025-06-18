import { Utils } from "./utils/Utils";
import { BoundingVolume } from "./math/BoundingVolume";
import { Vector3 } from "./math/Vector3";
import { Buffer, BufferType } from "./renderer/Buffer";
export class GeometryAttribute {
    array;
    buffer;
    constructor(array, type) {
        if (array.length === 0)
            throw Error("GeometryAttribute data is empty");
        this.array = array;
        this.buffer = Buffer.Create(array.byteLength, type);
        this.buffer.SetArray(this.array);
    }
    GetBuffer() { return this.buffer; }
    ;
}
;
export class VertexAttribute extends GeometryAttribute {
    constructor(array) {
        super(array, BufferType.VERTEX);
    }
}
export class InterleavedVertexAttribute extends GeometryAttribute {
    array;
    stride;
    constructor(array, stride) {
        super(array, BufferType.VERTEX);
        this.array = array;
        this.stride = stride;
    }
    static fromArrays(attributes, inputStrides, outputStrides) {
        function stridedCopy(target, values, offset, inputStride, outputStride, interleavedStride) {
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
        if (!outputStrides)
            outputStrides = inputStrides;
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
}
export class IndexAttribute extends GeometryAttribute {
    constructor(array) { super(array, BufferType.INDEX); }
}
export class Geometry {
    id = Utils.UUID();
    index;
    attributes = new Map();
    enableShadows = true;
    _boundingVolume;
    get boundingVolume() {
        const positions = this.attributes.get("position");
        if (!positions)
            throw Error("Geometry has no position attribute");
        if (!this._boundingVolume)
            this._boundingVolume = BoundingVolume.FromVertices(positions.array);
        return this._boundingVolume;
    }
    ComputeBoundingVolume() {
        const positions = this.attributes.get("position");
        if (!positions)
            throw Error("Geometry has no position attribute");
        this._boundingVolume = BoundingVolume.FromVertices(positions.array);
    }
    Clone() {
        const clone = new Geometry();
        for (const attribute of this.attributes) {
            clone.attributes.set(attribute[0], attribute[1]);
        }
        if (this.index) {
            clone.index = new IndexAttribute(this.index.array);
        }
        clone.enableShadows = this.enableShadows;
        return clone;
    }
    ApplyOperationToVertices(operation, vec) {
        let verts = this.attributes.get("position");
        if (!verts)
            throw Error("No verts");
        if (verts instanceof InterleavedVertexAttribute)
            throw Error("InterleavedVertexAttribute not implemented.");
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
    Center() {
        const center = this.boundingVolume.center;
        return this.ApplyOperationToVertices("+", center.mul(-1));
    }
    Scale(scale) {
        return this.ApplyOperationToVertices("*", scale);
    }
    ComputeNormals() {
        let posAttrData = this.attributes.get("position")?.array;
        let indexAttrData = this.index?.array;
        if (!posAttrData || !indexAttrData)
            throw Error("Cannot compute normals without vertices and indices");
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
        if (!normals)
            normals = new VertexAttribute(normalAttrData);
        this.attributes.set("normal", normals);
    }
    static ToNonIndexed(vertices, indices) {
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
    static Cube() {
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
    static Plane() {
        const vertices = new Float32Array([
            -1.0, -1.0, 0, // Bottom left
            1.0, -1.0, 0, // Bottom right
            1.0, 1.0, 0, // Top right
            -1.0, 1.0, 0 // Top left
        ]);
        const indices = new Uint32Array([
            0, 1, 2, // First triangle (bottom left to top right)
            2, 3, 0 // Second triangle (top right to top left)
        ]);
        const uvs = new Float32Array([
            0.0, 1.0, // Bottom left (now top left)
            1.0, 1.0, // Bottom right (now top right)
            1.0, 0.0, // Top right (now bottom right)
            0.0, 0.0 // Top left (now bottom left)
        ]);
        const normals = new Float32Array([
            0.0, 0.0, 1.0, // Normal for bottom left vertex
            0.0, 0.0, 1.0, // Normal for bottom right vertex
            0.0, 0.0, 1.0, // Normal for top right vertex
            0.0, 0.0, 1.0 // Normal for top left vertex
        ]);
        const geometry = new Geometry();
        geometry.attributes.set("position", new VertexAttribute(vertices));
        geometry.attributes.set("normal", new VertexAttribute(normals));
        geometry.attributes.set("uv", new VertexAttribute(uvs));
        geometry.index = new IndexAttribute(indices);
        // geometry.ComputeNormals();
        return geometry;
    }
    static Sphere() {
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
        const grid = [];
        const vertex = new Vector3();
        const normal = new Vector3();
        // buffers
        const indices = [];
        const vertices = [];
        const normals = [];
        const uvs = [];
        // generate vertices, normals and uvs
        for (let iy = 0; iy <= heightSegments; iy++) {
            const verticesRow = [];
            const v = iy / heightSegments;
            // special case for the poles
            let uOffset = 0;
            if (iy === 0 && thetaStart === 0)
                uOffset = 0.5 / widthSegments;
            else if (iy === heightSegments && thetaEnd === Math.PI)
                uOffset = -0.5 / widthSegments;
            for (let ix = 0; ix <= widthSegments; ix++) {
                const u = ix / widthSegments;
                // vertex
                vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
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
                if (iy !== 0 || thetaStart > 0)
                    indices.push(a, b, d);
                if (iy !== heightSegments - 1 || thetaEnd < Math.PI)
                    indices.push(b, c, d);
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
}
//# sourceMappingURL=Geometry.js.map