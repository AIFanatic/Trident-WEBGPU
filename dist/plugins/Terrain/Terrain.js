import { Components, Mathf, Geometry, VertexAttribute, IndexAttribute } from '@trident/core';
import { TerrainMaterial } from './TerrainMaterial.js';

class TerrainData {
  size;
  heights;
  geometry;
  material;
  resolution = 64;
  constructor(gameObject) {
    this.size = new Mathf.Vector3(1e3, 600, 1e3);
    this.material = new TerrainMaterial(gameObject);
    const verticesPerSide = this.resolution + 1;
    this.heights = new Float32Array(verticesPerSide * verticesPerSide);
    this.geometry = this.GenerateGeometryFromHeights(verticesPerSide, this.heights);
  }
  GenerateGeometryFromHeights(verticesPerSide, heights) {
    if (heights.length !== verticesPerSide * verticesPerSide) throw Error(`Heights length (${heights.length} don't match terrain size of ${verticesPerSide}x${verticesPerSide}(${verticesPerSide * verticesPerSide})`);
    const vertices = [];
    const uvs = [];
    const half = this.size.clone().mul(0.5);
    const divisions = verticesPerSide - 1;
    const ratio = this.size.clone().div(divisions);
    let i = 0;
    for (let ix = 0; ix < verticesPerSide; ix++) {
      for (let iz = 0; iz < verticesPerSide; iz++) {
        const x = ix * ratio.x;
        const z = iz * ratio.z;
        const height = heights[i] * this.size.y;
        vertices.push(x - half.x, height, z - half.z);
        uvs.push(ix / divisions, iz / divisions);
        i++;
      }
    }
    const indices = [];
    for (let z = 0; z < divisions; z++) {
      for (let x = 0; x < divisions; x++) {
        const topLeft = z * verticesPerSide + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * verticesPerSide + x;
        const bottomRight = bottomLeft + 1;
        indices.push(topLeft, topRight, bottomLeft);
        indices.push(topRight, bottomRight, bottomLeft);
      }
    }
    let geometry = new Geometry();
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.ComputeNormals();
    geometry.ComputeTangents();
    return geometry;
  }
  smoothHeightsLaplacian(h, size, iters = 3, alpha = 0.5) {
    const out = new Float32Array(h);
    const idx = (x, y) => y * size + x;
    for (let k = 0; k < iters; k++) {
      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const i = idx(x, y);
          const n = (h[idx(x - 1, y)] + h[idx(x + 1, y)] + h[idx(x, y - 1)] + h[idx(x, y + 1)]) * 0.25;
          out[i] = (1 - alpha) * h[i] + alpha * n;
        }
      }
      h.set(out);
    }
    return h;
  }
  async HeightmapFromPNG(url, smoothHeights = true, heightmapScale = 1) {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (img.width !== img.height) throw Error(`Only square images are supported, image has width=${img.width} and height=${img.height}`);
    const verticesPerSide = this.resolution + 1;
    const canvas = document.createElement("canvas");
    canvas.width = verticesPerSide;
    canvas.height = verticesPerSide;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = smoothHeights;
    ctx.save();
    ctx.translate(verticesPerSide / 2, verticesPerSide / 2);
    ctx.rotate(-90 * Math.PI / 180);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -verticesPerSide / 2, -verticesPerSide / 2, verticesPerSide, verticesPerSide);
    ctx.restore();
    const imageData = ctx.getImageData(0, 0, verticesPerSide, verticesPerSide);
    let heights = new Float32Array(imageData.data.length / 4);
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
      heights[j] = imageData.data[i] / 255;
    }
    this.heights = smoothHeights ? this.smoothHeightsLaplacian(heights, verticesPerSide, 4, 0.6) : heights;
    this.geometry = this.GenerateGeometryFromHeights(verticesPerSide, this.heights);
    return heights;
  }
  GetHeights() {
    return this.heights;
  }
  GetGeometry() {
    return this.geometry;
  }
  GetMaterial() {
    return this.material;
  }
}
class Terrain extends Components.Mesh {
  static type = "@trident/plugins/Terrain/Terrain";
  get geometry() {
    return this.terrainData.GetGeometry();
  }
  get material() {
    return this.terrainData.GetMaterial();
  }
  terrainData;
  constructor(gameObject) {
    super(gameObject);
    this.terrainData = new TerrainData(this.gameObject);
  }
  SampleHeight(worldPosition) {
    const heights = this.terrainData.GetHeights();
    const size = this.terrainData.size;
    if (!heights || !this.geometry) return 0;
    const sizeH = Math.sqrt(heights.length);
    const localX = (worldPosition.x - this.transform.position.x + size.x * 0.5) / size.x;
    const localZ = (worldPosition.z - this.transform.position.z + size.z * 0.5) / size.z;
    const fx = Math.max(0, Math.min(1, localX)) * (sizeH - 1);
    const fz = Math.max(0, Math.min(1, localZ)) * (sizeH - 1);
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = Math.min(x0 + 1, sizeH - 1);
    const z1 = Math.min(z0 + 1, sizeH - 1);
    const tx = fx - x0;
    const tz = fz - z0;
    const idx = (x, z) => x * sizeH + z;
    const h00 = heights[idx(x0, z0)];
    const h10 = heights[idx(x1, z0)];
    const h01 = heights[idx(x0, z1)];
    const h11 = heights[idx(x1, z1)];
    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;
    const height = h0 * (1 - tz) + h1 * tz;
    worldPosition.y = height * size.y;
    return height * size.y;
  }
  SampleNormal(worldPosition) {
    const heights = this.terrainData.GetHeights();
    const size = this.terrainData.size;
    if (!heights) return new Mathf.Vector3(0, 1, 0);
    const sizeH = Math.sqrt(heights.length);
    const localX = (worldPosition.x - this.transform.position.x + size.x * 0.5) / size.x;
    const localZ = (worldPosition.z - this.transform.position.z + size.z * 0.5) / size.z;
    const fx = Math.max(0, Math.min(1, localX)) * (sizeH - 1);
    const fz = Math.max(0, Math.min(1, localZ)) * (sizeH - 1);
    const x = Math.floor(fx);
    const z = Math.floor(fz);
    const idx = (x2, z2) => x2 * sizeH + z2;
    const x0 = Math.max(0, x - 1);
    const x1 = Math.min(sizeH - 1, x + 1);
    const z0 = Math.max(0, z - 1);
    const z1 = Math.min(sizeH - 1, z + 1);
    const hL = heights[idx(x0, z)];
    const hR = heights[idx(x1, z)];
    const hD = heights[idx(x, z0)];
    const hU = heights[idx(x, z1)];
    const scaleX = size.x / (sizeH - 1);
    const scaleZ = size.z / (sizeH - 1);
    const dx = (hR - hL) * size.y;
    const dz = (hU - hD) * size.y;
    const normal = new Mathf.Vector3(
      -dx / scaleX,
      2,
      -dz / scaleZ
    );
    return normal.normalize();
  }
}

export { Terrain };
