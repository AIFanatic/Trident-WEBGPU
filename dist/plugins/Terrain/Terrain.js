import { SerializeField, Prefab, Components, EventSystemLocal, Mathf, Utils, GPU, Geometry, VertexAttribute, IndexAttribute, Assets, NonSerialized } from '@trident/core';
import { TerrainMaterial } from './TerrainMaterial.js';
import { LODGroup } from '../LOD/LODGroup.js';
import { InstancedLODGroup } from '../LOD/InstancedLODGroup.js';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s = !!(flags & 8), p = !!(flags & 16);
  var j = k > 3 ? array.length + 1 : k ? s ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  var desc = k && (!p && !s && (target = target.prototype), k < 5 && (k > 3 || !p) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra);
  }, set [name](x) {
    return __privateSet(this, extra, x);
  } }, name));
  k ? p && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: p ? (x) => __privateIn(target, x) : (x) => name in x };
      if (k ^ 3) access.get = p ? (x) => (k ^ 1 ? __privateGet : __privateMethod)(x, target, k ^ 4 ? extra : desc.get) : (x) => x[name];
      if (k > 2) access.set = p ? (x, y) => __privateSet(x, target, y, k ^ 4 ? extra : desc.set) : (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(k ? k < 4 ? p ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p ? k ^ 4 ? extra : desc : target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _matrices_dec, _prop_dec, _id_dec, _init, _materialIdMapTexture_dec, _materialIdMapData_dec, _paintMapResolution_dec, _heights_dec, _material_dec, _geometry_dec, _size_dec, _paintPropData_dec, _init2, _material_dec2, _geometry_dec2, _terrainData_dec, _a, _init3;
class TerrainEvents {
  static Changed = (terrain, terrainData) => {
  };
  static GeometryUpdated = (terrainData) => {
  };
}
_id_dec = [SerializeField], _prop_dec = [SerializeField(Prefab)], _matrices_dec = [SerializeField(Array)];
class PaintPropData {
  constructor() {
    __publicField(this, "id", __runInitializers(_init, 8, this, Utils.UUID())), __runInitializers(_init, 11, this);
    __publicField(this, "prop", __runInitializers(_init, 12, this)), __runInitializers(_init, 15, this);
    __publicField(this, "matrices", __runInitializers(_init, 16, this, [])), __runInitializers(_init, 19, this);
    __publicField(this, "instancedPrefab");
    __publicField(this, "instancedLODGroup");
  }
  // TODO: Check if LODGroup was changed
  async RebuildProps(terrainGameObject) {
    if (!this.instancedPrefab) {
      this.instancedPrefab = await terrainGameObject.scene.Instantiate(this.prop);
      this.instancedPrefab.enabled = false;
      this.instancedPrefab.flags = Utils.Flags.DontSaveInEditor | Utils.Flags.HideInHierarchy;
    }
    const lodGroup = this.instancedPrefab.GetComponent(LODGroup);
    if (!lodGroup) throw Error("No LODGroup found");
    if (lodGroup.lods.length === 0) throw Error("No LODGroup found");
    if (!this.instancedLODGroup) {
      this.instancedLODGroup = terrainGameObject.AddComponent(InstancedLODGroup);
      this.instancedLODGroup.flags = Utils.Flags.DontSaveInEditor | Utils.Flags.HideInInspector;
      this.instancedLODGroup.lods = lodGroup.lods;
    }
    this.instancedLODGroup.SetMatricesBulk(new Float32Array(this.matrices));
  }
  AddPropMatrix(matrix) {
    const m = matrix.clone().mul(this.instancedPrefab.transform.localToWorldMatrix);
    this.matrices.push(...m.elements);
    this.instancedLODGroup.SetMatrixAt(this.instancedLODGroup.instanceCount, m);
  }
  Destroy() {
    if (this.instancedLODGroup) {
      this.instancedLODGroup.gameObject.RemoveComponent(this.instancedLODGroup);
      this.instancedLODGroup = void 0;
    }
    if (this.instancedPrefab) {
      this.instancedPrefab.Destroy();
      this.instancedPrefab = void 0;
    }
  }
}
_init = __decoratorStart(null);
__decorateElement(_init, 5, "id", _id_dec, PaintPropData);
__decorateElement(_init, 5, "prop", _prop_dec, PaintPropData);
__decorateElement(_init, 5, "matrices", _matrices_dec, PaintPropData);
__decoratorMetadata(_init, PaintPropData);
_paintPropData_dec = [SerializeField(PaintPropData)], _size_dec = [SerializeField], _geometry_dec = [NonSerialized], _material_dec = [SerializeField], _heights_dec = [SerializeField(Float32Array)], _paintMapResolution_dec = [SerializeField], _materialIdMapData_dec = [SerializeField(Uint8Array)], _materialIdMapTexture_dec = [NonSerialized];
const _TerrainData = class _TerrainData {
  constructor() {
    __runInitializers(_init2, 5, this);
    __publicField(this, "paintPropData", __runInitializers(_init2, 8, this, [])), __runInitializers(_init2, 11, this);
    __publicField(this, "size", __runInitializers(_init2, 12, this)), __runInitializers(_init2, 15, this);
    __publicField(this, "geometry", __runInitializers(_init2, 16, this)), __runInitializers(_init2, 19, this);
    __publicField(this, "material", __runInitializers(_init2, 20, this)), __runInitializers(_init2, 23, this);
    __publicField(this, "_heights");
    __publicField(this, "paintMapResolution", __runInitializers(_init2, 24, this, 256)), __runInitializers(_init2, 27, this);
    __publicField(this, "_materialIdMapData");
    __publicField(this, "materialIdMapTexture", __runInitializers(_init2, 28, this)), __runInitializers(_init2, 31, this);
    __publicField(this, "resolution", 256);
    this.size = new Mathf.Vector3(1e3, 600, 1e3);
    this.material = new TerrainMaterial();
    const verticesPerSide = this.resolution + 1;
    this.heights = new Float32Array(verticesPerSide * verticesPerSide);
    this.InitializePaintMapData();
  }
  get heights() {
    return this._heights;
  }
  set heights(heights) {
    const expectedSide = this.resolution + 1;
    if (heights.length !== expectedSide * expectedSide) {
      const srcSide = Math.round(Math.sqrt(heights.length));
      if (srcSide * srcSide !== heights.length) {
        throw Error(`Heights length ${heights.length} is not a square number`);
      }
      console.warn(`[TerrainData] Resampling heights ${srcSide}\xB2 \u2192 ${expectedSide}\xB2 (saved at older resolution)`);
      heights = _TerrainData.resampleHeights(heights, expectedSide);
    }
    this._heights = heights;
    this.RebuildGeometry();
  }
  get materialIdMapData() {
    return this._materialIdMapData;
  }
  set materialIdMapData(data) {
    this._materialIdMapData = data;
  }
  static resampleHeights(src, dstSide) {
    const srcSide = Math.round(Math.sqrt(src.length));
    if (srcSide === dstSide) return src;
    const dst = new Float32Array(dstSide * dstSide);
    const srcMax = srcSide - 1;
    const dstMax = dstSide - 1;
    for (let ix = 0; ix < dstSide; ix++) {
      const sx = ix / dstMax * srcMax;
      const x0 = Math.floor(sx);
      const x1 = Math.min(x0 + 1, srcMax);
      const tx = sx - x0;
      for (let iz = 0; iz < dstSide; iz++) {
        const sz = iz / dstMax * srcMax;
        const z0 = Math.floor(sz);
        const z1 = Math.min(z0 + 1, srcMax);
        const tz = sz - z0;
        const a = src[x0 * srcSide + z0];
        const b = src[x0 * srcSide + z1];
        const c = src[x1 * srcSide + z0];
        const d = src[x1 * srcSide + z1];
        dst[ix * dstSide + iz] = (a * (1 - tz) + b * tz) * (1 - tx) + (c * (1 - tz) + d * tz) * tx;
      }
    }
    return dst;
  }
  InitializePaintMapData() {
    const pixelCount = this.paintMapResolution * this.paintMapResolution;
    if (!this._materialIdMapData || this._materialIdMapData.length !== pixelCount * 4) {
      this._materialIdMapData = new Uint8Array(pixelCount * 4);
    }
  }
  Resize(x, y, z) {
    this.size.set(x, y, z);
    this.RebuildGeometry();
  }
  async InitializePaintMaps() {
    this.InitializePaintMapData();
    this.materialIdMapTexture = GPU.Texture.Create(this.paintMapResolution, this.paintMapResolution, 1, "rgba8unorm");
    this.UploadPaintMaps();
    await this.BindPaintMaps();
  }
  UploadPaintMaps() {
    const bytesPerRow = this.paintMapResolution * 4;
    this.materialIdMapTexture.SetData(this._materialIdMapData, bytesPerRow);
  }
  async BindPaintMaps() {
    if (this.material.pendingShaderCreation) {
      await this.material.pendingShaderCreation;
    }
    this.material.materialIdMap = this.materialIdMapTexture;
  }
  GetProp(id) {
    return this.paintPropData.find((p) => p.id === id);
  }
  GetPropIndex(id) {
    return this.paintPropData.findIndex((p) => p.id === id);
  }
  async AddProp(prefab, terrainGameObject) {
    const existing = this.paintPropData.find((p) => p.prop.assetPath === prefab.assetPath);
    if (existing) return existing.id;
    const newProp = new PaintPropData();
    newProp.prop = prefab;
    await newProp.RebuildProps(terrainGameObject);
    this.paintPropData.push(newProp);
    return newProp.id;
  }
  RemoveProp(id) {
    const idx = this.paintPropData.findIndex((p) => p.id === id);
    if (idx === -1) throw Error(`Prop ${id} doesn't exist`);
    this.paintPropData[idx].Destroy();
    this.paintPropData.splice(idx, 1);
  }
  AddPropMatrix(id, matrix) {
    const prop = this.GetProp(id);
    if (!prop) throw Error(`Prop ${id} doesn't exist`);
    prop.AddPropMatrix(matrix);
  }
  RebuildGeometry() {
    const verticesPerSide = this.resolution + 1;
    this.geometry = _TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);
    this.geometry.name = this.assetPath;
    EventSystemLocal.emit(TerrainEvents.GeometryUpdated, this, this);
  }
  static GenerateGeometryFromHeights(verticesPerSide, heights, size) {
    if (heights.length !== verticesPerSide * verticesPerSide) throw Error(`Heights length (${heights.length} don't match terrain size of ${verticesPerSide}x${verticesPerSide}(${verticesPerSide * verticesPerSide})`);
    const vertices = [];
    const uvs = [];
    const half = size.clone().mul(0.5);
    const divisions = verticesPerSide - 1;
    const ratio = size.clone().div(divisions);
    let i = 0;
    for (let ix = 0; ix < verticesPerSide; ix++) {
      for (let iz = 0; iz < verticesPerSide; iz++) {
        const x = ix * ratio.x;
        const z = iz * ratio.z;
        const height = heights[i] * size.y - half.y;
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
  async HeightmapFromTexture(texture, smoothHeights = true, heightMultiplier = 1) {
    if (texture.width !== texture.height) {
      throw Error(`Only square textures are supported, got ${texture.width}x${texture.height}`);
    }
    const srcSize = texture.width;
    const pixels = await texture.GetPixels(0, 0, srcSize, srcSize, 0);
    const totalPixels = srcSize * srcSize;
    const channels = pixels.length / totalPixels;
    if (!Number.isInteger(channels)) {
      throw Error(`HeightmapFromTexture: unexpected pixel layout for format ${texture.format}`);
    }
    const red = new Float32Array(totalPixels);
    if (pixels instanceof Uint8Array) for (let i = 0; i < totalPixels; i++) red[i] = pixels[i * channels] / 255;
    else if (pixels instanceof Float32Array || pixels instanceof Float16Array) for (let i = 0; i < totalPixels; i++) red[i] = pixels[i * channels];
    else throw Error(`HeightmapFromTexture: unsupported pixel array type for format ${texture.format}`);
    const verticesPerSide = this.resolution + 1;
    const heights = new Float32Array(verticesPerSide * verticesPerSide);
    const last = srcSize - 1;
    const denom = Math.max(1, verticesPerSide - 1);
    const sample = smoothHeights ? (sx, sy) => {
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, last), y1 = Math.min(y0 + 1, last);
      const tx = sx - x0, ty = sy - y0;
      const a = red[y0 * srcSize + x0];
      const b = red[y0 * srcSize + x1];
      const c = red[y1 * srcSize + x0];
      const d = red[y1 * srcSize + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    } : (sx, sy) => red[Math.round(sy) * srcSize + Math.round(sx)];
    for (let ix = 0; ix < verticesPerSide; ix++) {
      for (let iz = 0; iz < verticesPerSide; iz++) {
        const col = ix / denom * last;
        const row = iz / denom * last;
        heights[ix * verticesPerSide + iz] = sample(col, row) * heightMultiplier;
      }
    }
    const finalHeights = smoothHeights ? this.smoothHeightsLaplacian(heights, verticesPerSide, 4, 0.6) : heights;
    if (this._heights && this._heights.length === finalHeights.length) {
      this._heights.set(finalHeights);
      this.ApplyHeightsToGeometry();
    } else {
      this.heights = finalHeights;
    }
    return finalHeights;
  }
  ApplyHeightsToGeometry() {
    const geometry = this.geometry;
    const heights = this.heights;
    const positions = geometry.attributes.get("position");
    if (!positions) return;
    const vertices = positions.array;
    const sizeH = Math.sqrt(heights.length);
    for (let x = 0; x < sizeH; x++) {
      for (let z = 0; z < sizeH; z++) {
        const i = x * sizeH + z;
        vertices[i * 3 + 1] = heights[i] * this.size.y - this.size.y * 0.5;
      }
    }
    positions.buffer.SetArray(vertices);
    geometry.ComputeNormals();
    geometry.ComputeTangents();
    EventSystemLocal.emit(TerrainEvents.GeometryUpdated, this, this);
  }
  Destroy() {
    if (this.assetPath) Assets.RemoveInstance(this.assetPath);
    for (const prop of this.paintPropData) prop.Destroy();
    this.geometry?.Destroy();
    this.material?.Destroy();
    this.materialIdMapTexture?.Destroy();
  }
};
_init2 = __decoratorStart(null);
__decorateElement(_init2, 2, "heights", _heights_dec, _TerrainData);
__decorateElement(_init2, 2, "materialIdMapData", _materialIdMapData_dec, _TerrainData);
__decorateElement(_init2, 5, "paintPropData", _paintPropData_dec, _TerrainData);
__decorateElement(_init2, 5, "size", _size_dec, _TerrainData);
__decorateElement(_init2, 5, "geometry", _geometry_dec, _TerrainData);
__decorateElement(_init2, 5, "material", _material_dec, _TerrainData);
__decorateElement(_init2, 5, "paintMapResolution", _paintMapResolution_dec, _TerrainData);
__decorateElement(_init2, 5, "materialIdMapTexture", _materialIdMapTexture_dec, _TerrainData);
__decoratorMetadata(_init2, _TerrainData);
__publicField(_TerrainData, "type", "@trident/plugins/Terrain/TerrainData");
let TerrainData = _TerrainData;
class Terrain extends (_a = Components.Mesh, _terrainData_dec = [SerializeField(TerrainData)], _geometry_dec2 = [NonSerialized], _material_dec2 = [NonSerialized], _a) {
  constructor(gameObject) {
    super(gameObject);
    __runInitializers(_init3, 5, this);
    __publicField(this, "_terrainData");
    this.terrainData = new TerrainData();
  }
  get terrainData() {
    return this._terrainData;
  }
  set terrainData(td) {
    if (this._terrainData === td) return;
    this._terrainData = td;
    if (!td) return;
    this.SetTerrainData(td).catch((err) => console.error("[Terrain] SetTerrainData failed", err));
  }
  async SetTerrainData(td) {
    await td.InitializePaintMaps();
    await Promise.all(td.paintPropData.map((prop) => prop.RebuildProps(this.gameObject)));
    if (td.heights?.length) td.RebuildGeometry();
    EventSystemLocal.emit(TerrainEvents.Changed, this, this, td);
  }
  get geometry() {
    return this._terrainData.geometry;
  }
  get material() {
    return this._terrainData.material;
  }
  WorldToGrid(worldPoint, gridDim) {
    const size = this._terrainData.size;
    const localX = (worldPoint.x - this.transform.position.x + size.x * 0.5) / size.x;
    const localZ = (worldPoint.z - this.transform.position.z + size.z * 0.5) / size.z;
    const max = gridDim - 1;
    return {
      fx: Math.max(0, Math.min(1, localX)) * max,
      fz: Math.max(0, Math.min(1, localZ)) * max
    };
  }
  SampleHeight(worldPosition) {
    const heights = this._terrainData.heights;
    if (!heights) return 0;
    const sizeH = Math.sqrt(heights.length);
    const { fx, fz } = this.WorldToGrid(worldPosition, sizeH);
    const x0 = Math.floor(fx), z0 = Math.floor(fz);
    const x1 = Math.min(x0 + 1, sizeH - 1);
    const z1 = Math.min(z0 + 1, sizeH - 1);
    const tx = fx - x0, tz = fz - z0;
    const idx = (x, z) => x * sizeH + z;
    const h0 = heights[idx(x0, z0)] * (1 - tx) + heights[idx(x1, z0)] * tx;
    const h1 = heights[idx(x0, z1)] * (1 - tx) + heights[idx(x1, z1)] * tx;
    const height = (h0 * (1 - tz) + h1 * tz) * this._terrainData.size.y - this._terrainData.size.y * 0.5 + this.transform.position.y;
    worldPosition.y = height;
    return height;
  }
  SampleNormal(worldPosition) {
    const heights = this._terrainData.heights;
    if (!heights) return new Mathf.Vector3(0, 1, 0);
    const size = this._terrainData.size;
    const sizeH = Math.sqrt(heights.length);
    const { fx, fz } = this.WorldToGrid(worldPosition, sizeH);
    const x = Math.floor(fx), z = Math.floor(fz);
    const x0 = Math.max(0, x - 1), x1 = Math.min(sizeH - 1, x + 1);
    const z0 = Math.max(0, z - 1), z1 = Math.min(sizeH - 1, z + 1);
    const idx = (x2, z2) => x2 * sizeH + z2;
    const dx = (heights[idx(x1, z)] - heights[idx(x0, z)]) * size.y;
    const dz = (heights[idx(x, z1)] - heights[idx(x, z0)]) * size.y;
    const scaleX = size.x / (sizeH - 1);
    const scaleZ = size.z / (sizeH - 1);
    return new Mathf.Vector3(-dx / scaleX, 2, -dz / scaleZ).normalize();
  }
  Destroy() {
    this._terrainData?.Destroy();
    super.Destroy();
  }
}
_init3 = __decoratorStart(_a);
__decorateElement(_init3, 2, "terrainData", _terrainData_dec, Terrain);
__decorateElement(_init3, 2, "geometry", _geometry_dec2, Terrain);
__decorateElement(_init3, 2, "material", _material_dec2, Terrain);
__decoratorMetadata(_init3, Terrain);
__publicField(Terrain, "type", "@trident/plugins/Terrain/Terrain");
Utils.TypeRegistry.set(TerrainData.type, TerrainData);

export { PaintPropData, Terrain, TerrainData, TerrainEvents };
