import { UUID } from './utils/StringUtils.js';
import { BoundingVolume } from './math/BoundingVolume.js';
import { Vector3 } from './math/Vector3.js';
import { BufferType, Buffer } from './renderer/Buffer.js';
import { Vector2 } from './math/Vector2.js';
import './math/Matrix4.js';

class GeometryAttribute {
  array;
  buffer;
  currentOffset;
  // This can be used 
  currentSize;
  constructor(array, type) {
    if (array.length === 0) throw Error("GeometryAttribute data is empty");
    this.array = array;
    this.buffer = Buffer.Create(array.byteLength, type);
    this.buffer.SetArray(this.array);
    this.currentOffset = 0;
    this.currentSize = array.byteLength;
  }
  GetBuffer() {
    return this.buffer;
  }
  Destroy() {
    this.buffer.Destroy();
  }
}
class VertexAttribute extends GeometryAttribute {
  constructor(array) {
    super(array, BufferType.VERTEX);
  }
}
class InterleavedVertexAttribute extends GeometryAttribute {
  constructor(array, stride) {
    super(array, BufferType.VERTEX);
    this.array = array;
    this.stride = stride;
  }
  static fromArrays(attributes, inputStrides, outputStrides) {
    function stridedCopy(target, values, offset2, inputStride, outputStride, interleavedStride2) {
      let writeIndex = offset2;
      for (let i = 0; i < values.length; i += inputStride) {
        for (let j = 0; j < inputStride && i + j < values.length; j++) {
          target[writeIndex + j] = values[i + j];
        }
        for (let j = inputStride; j < outputStride; j++) {
          target[writeIndex + j] = 0;
        }
        writeIndex += interleavedStride2;
      }
    }
    if (!outputStrides) outputStrides = inputStrides;
    const interleavedStride = outputStrides.reduce((a, b) => a + b, 0);
    let totalLength = 0;
    for (let i = 0; i < attributes.length; i++) {
      totalLength += attributes[i].length / inputStrides[i] * outputStrides[i];
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
class IndexAttribute extends GeometryAttribute {
  constructor(array) {
    super(array, BufferType.INDEX);
  }
}
class Geometry {
  id = UUID();
  name = "";
  index;
  attributes = /* @__PURE__ */ new Map();
  _boundingVolume;
  get boundingVolume() {
    const positions = this.attributes.get("position");
    if (!positions) throw Error("Geometry has no position attribute");
    if (!this._boundingVolume) this._boundingVolume = BoundingVolume.FromVertices(positions.array);
    return this._boundingVolume;
  }
  ComputeBoundingVolume() {
    const positions = this.attributes.get("position");
    if (!positions) throw Error("Geometry has no position attribute");
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
    return clone;
  }
  ApplyOperationToVertices(operation, vec) {
    let verts = this.attributes.get("position");
    if (!verts) throw Error("No verts");
    if (verts instanceof InterleavedVertexAttribute) throw Error("InterleavedVertexAttribute not implemented.");
    this.boundingVolume.center;
    let vertsCentered = new Float32Array(verts.array.length);
    for (let i = 0; i < verts.array.length; i += 3) {
      if (operation === "+") {
        vertsCentered[i + 0] = verts.array[i + 0] + vec.x;
        vertsCentered[i + 1] = verts.array[i + 1] + vec.y;
        vertsCentered[i + 2] = verts.array[i + 2] + vec.z;
      } else if (operation === "*") {
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
  ComputeTangents() {
    const index = this.index;
    const positionAttribute = this.attributes.get("position");
    const normalAttribute = this.attributes.get("normal");
    const uvAttribute = this.attributes.get("uv");
    if (!index || !positionAttribute || !normalAttribute || !uvAttribute) {
      console.error("computeTangents() failed. Missing required attributes (index, position, normal or uv)");
      return;
    }
    const pos = positionAttribute.array;
    const nor = normalAttribute.array;
    const uvs = uvAttribute.array;
    const ia = index.array;
    const vertexCount = pos.length / 3;
    let tangentAttribute = this.attributes.get("tangent");
    if (!tangentAttribute || tangentAttribute.array.length !== 4 * vertexCount) {
      tangentAttribute = new VertexAttribute(new Float32Array(4 * vertexCount));
      this.attributes.set("tangent", tangentAttribute);
    } else {
      tangentAttribute.array.fill(0);
    }
    const tang = tangentAttribute.array;
    const tan1 = new Array(vertexCount);
    const tan2 = new Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      tan1[i] = new Vector3();
      tan2[i] = new Vector3();
    }
    const vA = new Vector3(), vB = new Vector3(), vC = new Vector3();
    const uvA = new Vector2(), uvB = new Vector2(), uvC = new Vector2();
    const sdir = new Vector3(), tdir = new Vector3();
    function handleTriangle(a, b, c) {
      vA.set(pos[a * 3 + 0], pos[a * 3 + 1], pos[a * 3 + 2]);
      vB.set(pos[b * 3 + 0], pos[b * 3 + 1], pos[b * 3 + 2]);
      vC.set(pos[c * 3 + 0], pos[c * 3 + 1], pos[c * 3 + 2]);
      uvA.set(uvs[a * 2 + 0], uvs[a * 2 + 1]);
      uvB.set(uvs[b * 2 + 0], uvs[b * 2 + 1]);
      uvC.set(uvs[c * 2 + 0], uvs[c * 2 + 1]);
      vB.sub(vA);
      vC.sub(vA);
      uvB.sub(uvA);
      uvC.sub(uvA);
      const denom = uvB.x * uvC.y - uvC.x * uvB.y;
      if (!isFinite(denom) || Math.abs(denom) < 1e-8) return;
      const r = 1 / denom;
      sdir.copy(vB).mul(uvC.y).add(vC.clone().mul(-uvB.y)).mul(r);
      tdir.copy(vC).mul(uvB.x).add(vB.clone().mul(-uvC.x)).mul(r);
      tan1[a].add(sdir);
      tan1[b].add(sdir);
      tan1[c].add(sdir);
      tan2[a].add(tdir);
      tan2[b].add(tdir);
      tan2[c].add(tdir);
    }
    for (let j = 0; j < ia.length; j += 3) {
      handleTriangle(ia[j + 0], ia[j + 1], ia[j + 2]);
    }
    const tmp = new Vector3();
    const n = new Vector3();
    const n2 = new Vector3();
    const ccv = new Vector3();
    function handleVertex(v) {
      n.set(nor[v * 3 + 0], nor[v * 3 + 1], nor[v * 3 + 2]);
      n2.copy(n);
      const t = tan1[v];
      tmp.copy(t);
      const ndott = n.dot(t);
      tmp.sub(n.clone().mul(ndott));
      if (!isFinite(tmp.x) || !isFinite(tmp.y) || !isFinite(tmp.z) || tmp.lengthSq() === 0) {
        const ortho = Math.abs(n.x) > 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
        tmp.copy(ortho.cross(n));
      }
      tmp.normalize();
      ccv.copy(n2).cross(t);
      const w = ccv.dot(tan2[v]) < 0 ? -1 : 1;
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
    this.attributes.set("tangent", new VertexAttribute(tang));
  }
  Destroy() {
    for (const [_, attribute] of this.attributes) attribute.Destroy();
    if (this.index) this.index.Destroy();
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
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5
    ]);
    const uvs = new Float32Array([
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0
    ]);
    const normals = new Float32Array([
      1,
      0,
      0,
      1,
      0,
      -0,
      1,
      0,
      -0,
      1,
      0,
      -0,
      -1,
      0,
      0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      0,
      -0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1
    ]);
    const indices = new Uint32Array([
      0,
      2,
      1,
      2,
      3,
      1,
      4,
      6,
      5,
      6,
      7,
      5,
      8,
      10,
      9,
      10,
      11,
      9,
      12,
      14,
      13,
      14,
      15,
      13,
      16,
      18,
      17,
      18,
      19,
      17,
      20,
      22,
      21,
      22,
      23,
      21
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
      -1,
      -1,
      0,
      // Bottom left
      1,
      -1,
      0,
      // Bottom right
      1,
      1,
      0,
      // Top right
      -1,
      1,
      0
      // Top left
    ]);
    const indices = new Uint32Array([
      0,
      1,
      2,
      // First triangle (bottom left to top right)
      2,
      3,
      0
      // Second triangle (top right to top left)
    ]);
    const uvs = new Float32Array([
      0,
      1,
      // Bottom left (now top left)
      1,
      1,
      // Bottom right (now top right)
      1,
      0,
      // Top right (now bottom right)
      0,
      0
      // Top left (now bottom left)
    ]);
    const normals = new Float32Array([
      0,
      0,
      1,
      // Normal for bottom left vertex
      0,
      0,
      1,
      // Normal for bottom right vertex
      0,
      0,
      1,
      // Normal for top right vertex
      0,
      0,
      1
      // Normal for top left vertex
    ]);
    const geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("normal", new VertexAttribute(normals));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.index = new IndexAttribute(indices);
    return geometry;
  }
  static Sphere() {
    const radius = 0.5;
    const phiStart = 0;
    const phiLength = Math.PI * 2;
    const thetaStart = 0;
    const thetaLength = Math.PI;
    let widthSegments = 16;
    let heightSegments = 8;
    widthSegments = Math.max(3, Math.floor(widthSegments));
    heightSegments = Math.max(2, Math.floor(heightSegments));
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
    let index = 0;
    const grid = [];
    const vertex = new Vector3();
    const normal = new Vector3();
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow = [];
      const v = iy / heightSegments;
      let uOffset = 0;
      if (iy === 0 && thetaStart === 0) uOffset = 0.5 / widthSegments;
      else if (iy === heightSegments && thetaEnd === Math.PI) uOffset = -0.5 / widthSegments;
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments;
        vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
        vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertices.push(vertex.x, vertex.y, vertex.z);
        normal.copy(vertex).normalize();
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u + uOffset, 1 - v);
        verticesRow.push(index++);
      }
      grid.push(verticesRow);
    }
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
    const geometry = new Geometry();
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
    return geometry;
  }
}

export { Geometry, GeometryAttribute, IndexAttribute, InterleavedVertexAttribute, VertexAttribute };
