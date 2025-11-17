import { Components, Geometry, VertexAttribute, IndexAttribute } from '@trident/core';
import { TerrainMaterial } from './TerrainMaterial.js';

class Terrain extends Components.Mesh {
  get width() {
    return this.transform.scale.x;
  }
  get length() {
    return this.transform.scale.z;
  }
  get height() {
    return this.transform.scale.y;
  }
  set width(width) {
    this.transform.scale.x = width;
  }
  set length(length) {
    this.transform.scale.z = length;
  }
  set height(height) {
    this.transform.scale.y = height;
  }
  heights;
  get material() {
    return this._material;
  }
  constructor(gameObject) {
    super(gameObject);
    this._material = new TerrainMaterial(this.gameObject);
  }
  GenerateGeometryFromHeights(size, heights) {
    if (heights.length !== size * size) throw Error(`Heights length (${heights.length} don't match terrain size of ${size}x${size}(${size * size})`);
    const vertices = [];
    const uvs = [];
    const size_inv = 1 / (size - 1);
    let i = 0;
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        const height = heights[i];
        vertices.push(x * size_inv, height, z * size_inv);
        uvs.push(x * size_inv, z * size_inv);
        i++;
      }
    }
    const indices = [];
    for (let z = 0; z < size - 1; z++) {
      for (let x = 0; x < size - 1; x++) {
        const topLeft = z * size + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * size + x;
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
    const size = img.width * heightmapScale;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-90 * Math.PI / 180);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
    const imageData = ctx.getImageData(0, 0, size, size);
    let heights = new Float32Array(imageData.data.length / 4);
    for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
      heights[j] = imageData.data[i] / 255;
    }
    this.heights = smoothHeights ? this.smoothHeightsLaplacian(heights, size, 4, 0.6) : heights;
    this.geometry = this.GenerateGeometryFromHeights(size, this.heights);
    return heights;
  }
}

export { Terrain };
