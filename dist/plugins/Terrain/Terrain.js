import { SerializeField, GameObject, Components, Mathf, Utils, GPU, Geometry, VertexAttribute, IndexAttribute, NonSerialized } from '@trident/core';
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
var _matrices_dec, _prop_dec, _init, _terrainGameObject_dec, _blendWeightMapTexture_dec, _materialIdMapTexture_dec, _blendWeightMapData_dec, _materialIdMapData_dec, _paintMapResolution_dec, _heights_dec, _material_dec, _geometry_dec, _size_dec, _paintPropData_dec, _init2, _material_dec2, _geometry_dec2, _terrainData_dec, _a, _init3;
_prop_dec = [SerializeField(GameObject)], _matrices_dec = [SerializeField(Array)];
class PaintPropData {
  constructor() {
    __publicField(this, "prop", __runInitializers(_init, 8, this)), __runInitializers(_init, 11, this);
    __publicField(this, "matrices", __runInitializers(_init, 12, this, [])), __runInitializers(_init, 15, this);
    __publicField(this, "instancedLODGroup");
  }
  // TODO: Check if LODGroup was changed
  RebuildProps(terrainGameObject) {
    const lodGroup = this.prop.GetComponent(LODGroup);
    if (!lodGroup) return;
    if (lodGroup.lods.length === 0) return;
    if (!this.instancedLODGroup) {
      this.instancedLODGroup = terrainGameObject.AddComponent(InstancedLODGroup);
      this.instancedLODGroup.flags = Utils.Flags.DontSaveInEditor | Utils.Flags.HideInInspector;
      this.instancedLODGroup.lods = lodGroup.lods;
    }
    this.RebuildPropMatrices();
  }
  RebuildPropMatrices() {
    if (!this.instancedLODGroup) throw Error("Could not find instancedLODGroup");
    this.instancedLODGroup.SetMatricesBulk(new Float32Array(this.matrices));
  }
  AddPropMatrix(matrix) {
    this.matrices.push(...matrix.elements);
    this.instancedLODGroup.SetMatrixAt(this.instancedLODGroup.instanceCount, matrix);
  }
}
_init = __decoratorStart(null);
__decorateElement(_init, 5, "prop", _prop_dec, PaintPropData);
__decorateElement(_init, 5, "matrices", _matrices_dec, PaintPropData);
__decoratorMetadata(_init, PaintPropData);
_paintPropData_dec = [SerializeField(PaintPropData)], _size_dec = [SerializeField], _geometry_dec = [NonSerialized], _material_dec = [SerializeField], _heights_dec = [SerializeField(Float32Array)], _paintMapResolution_dec = [SerializeField], _materialIdMapData_dec = [SerializeField(Uint8Array)], _blendWeightMapData_dec = [SerializeField(Uint8Array)], _materialIdMapTexture_dec = [NonSerialized], _blendWeightMapTexture_dec = [NonSerialized], _terrainGameObject_dec = [SerializeField];
const _TerrainData = class _TerrainData {
  constructor(gameObject) {
    __runInitializers(_init2, 5, this);
    __publicField(this, "paintPropData", __runInitializers(_init2, 8, this, [])), __runInitializers(_init2, 11, this);
    __publicField(this, "size", __runInitializers(_init2, 12, this)), __runInitializers(_init2, 15, this);
    __publicField(this, "geometry", __runInitializers(_init2, 16, this)), __runInitializers(_init2, 19, this);
    __publicField(this, "material", __runInitializers(_init2, 20, this)), __runInitializers(_init2, 23, this);
    __publicField(this, "_heights");
    __publicField(this, "paintMapResolution", __runInitializers(_init2, 24, this, 256)), __runInitializers(_init2, 27, this);
    __publicField(this, "_materialIdMapData");
    __publicField(this, "_blendWeightMapData");
    __publicField(this, "materialIdMapTexture", __runInitializers(_init2, 28, this)), __runInitializers(_init2, 31, this);
    __publicField(this, "blendWeightMapTexture", __runInitializers(_init2, 32, this)), __runInitializers(_init2, 35, this);
    __publicField(this, "resolution", 64);
    __publicField(this, "terrainGameObject", __runInitializers(_init2, 36, this)), __runInitializers(_init2, 39, this);
    this.terrainGameObject = gameObject;
    this.size = new Mathf.Vector3(1e3, 600, 1e3);
    this.material = new TerrainMaterial();
    const verticesPerSide = this.resolution + 1;
    this.heights = new Float32Array(verticesPerSide * verticesPerSide);
    this.geometry = _TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);
    this.InitializePaintMapData();
  }
  get heights() {
    return this._heights;
  }
  set heights(heights) {
    this._heights = heights;
    this.RebuildGeometry();
  }
  get materialIdMapData() {
    return this._materialIdMapData;
  }
  set materialIdMapData(data) {
    this._materialIdMapData = data;
  }
  get blendWeightMapData() {
    return this._blendWeightMapData;
  }
  set blendWeightMapData(data) {
    this._blendWeightMapData = data;
  }
  InitializePaintMapData() {
    const pixelCount = this.paintMapResolution * this.paintMapResolution;
    if (!this._materialIdMapData || this._materialIdMapData.length !== pixelCount * 4) {
      this._materialIdMapData = new Uint8Array(pixelCount * 4);
      this._blendWeightMapData = new Uint8Array(pixelCount * 4);
      for (let i = 0; i < pixelCount; i++) {
        this._blendWeightMapData[i * 4] = 255;
      }
    }
  }
  InitializePaintMaps() {
    this.InitializePaintMapData();
    this.materialIdMapTexture = GPU.Texture.Create(this.paintMapResolution, this.paintMapResolution, 1, "rgba8unorm");
    this.blendWeightMapTexture = GPU.TextureArray.Create(this.paintMapResolution, this.paintMapResolution, 1, "rgba8unorm");
    this.UploadPaintMaps();
    this.BindPaintMaps();
  }
  UploadPaintMaps() {
    const bytesPerRow = this.paintMapResolution * 4;
    this.materialIdMapTexture.SetData(this._materialIdMapData, bytesPerRow);
    this.blendWeightMapTexture.SetData(this._blendWeightMapData, bytesPerRow, this.paintMapResolution);
  }
  async BindPaintMaps() {
    if (this.material.pendingShaderCreation) {
      await this.material.pendingShaderCreation;
    }
    this.material.materialIdMap = this.materialIdMapTexture;
    this.material.shader.SetTexture("blendWeightMaps", this.blendWeightMapTexture);
  }
  AddProp(gameObject) {
    const existingIndex = this.paintPropData.findIndex((value) => value.prop === gameObject);
    if (existingIndex !== -1) return existingIndex;
    const newProp = new PaintPropData();
    newProp.prop = gameObject;
    newProp.RebuildProps(this.terrainGameObject);
    this.paintPropData.push(newProp);
    return this.paintPropData.length - 1;
  }
  AddPropMatrix(propIndex, matrix) {
    if (propIndex >= this.paintPropData.length) throw Error("Prop doesnt exist");
    this.paintPropData[propIndex].AddPropMatrix(matrix);
  }
  async OnDeserialized() {
    this.RebuildGeometry();
    this.InitializePaintMaps();
    for (const prop of this.paintPropData) prop.RebuildProps(this.terrainGameObject);
  }
  RebuildGeometry() {
    const verticesPerSide = this.resolution + 1;
    this.geometry = _TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);
    this.geometry.name = this.assetPath;
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
        const height = heights[i] * size.y;
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
  async HeightmapFromPNG(url, smoothHeights = true) {
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
    this.geometry = _TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);
    return heights;
  }
  ApplyHeightsToGeometry() {
    const geometry = this.GetGeometry();
    const heights = this.GetHeights();
    const positions = geometry.attributes.get("position");
    if (!positions) return;
    const vertices = positions.array;
    const sizeH = Math.sqrt(heights.length);
    for (let x = 0; x < sizeH; x++) {
      for (let z = 0; z < sizeH; z++) {
        const i = x * sizeH + z;
        vertices[i * 3 + 1] = heights[i] * this.size.y;
      }
    }
    positions.buffer.SetArray(vertices);
    geometry.ComputeNormals();
    geometry.ComputeTangents();
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
};
_init2 = __decoratorStart(null);
__decorateElement(_init2, 2, "heights", _heights_dec, _TerrainData);
__decorateElement(_init2, 2, "materialIdMapData", _materialIdMapData_dec, _TerrainData);
__decorateElement(_init2, 2, "blendWeightMapData", _blendWeightMapData_dec, _TerrainData);
__decorateElement(_init2, 5, "paintPropData", _paintPropData_dec, _TerrainData);
__decorateElement(_init2, 5, "size", _size_dec, _TerrainData);
__decorateElement(_init2, 5, "geometry", _geometry_dec, _TerrainData);
__decorateElement(_init2, 5, "material", _material_dec, _TerrainData);
__decorateElement(_init2, 5, "paintMapResolution", _paintMapResolution_dec, _TerrainData);
__decorateElement(_init2, 5, "materialIdMapTexture", _materialIdMapTexture_dec, _TerrainData);
__decorateElement(_init2, 5, "blendWeightMapTexture", _blendWeightMapTexture_dec, _TerrainData);
__decorateElement(_init2, 5, "terrainGameObject", _terrainGameObject_dec, _TerrainData);
__decoratorMetadata(_init2, _TerrainData);
__publicField(_TerrainData, "type", "@trident/plugins/Terrain/TerrainData");
let TerrainData = _TerrainData;
class Terrain extends (_a = Components.Mesh, _terrainData_dec = [SerializeField(TerrainData)], _geometry_dec2 = [NonSerialized], _material_dec2 = [NonSerialized], _a) {
  constructor(gameObject) {
    super(gameObject);
    __runInitializers(_init3, 5, this);
    __publicField(this, "terrainData", __runInitializers(_init3, 8, this)), __runInitializers(_init3, 11, this);
    this.terrainData = new TerrainData(gameObject);
  }
  get geometry() {
    return this.terrainData.geometry;
  }
  get material() {
    return this.terrainData.material;
  }
  Start() {
    super.Start();
  }
  WorldToGrid(worldPoint, gridDim) {
    const size = this.terrainData.size;
    const localX = (worldPoint.x - this.transform.position.x + size.x * 0.5) / size.x;
    const localZ = (worldPoint.z - this.transform.position.z + size.z * 0.5) / size.z;
    const max = gridDim - 1;
    return {
      fx: Math.max(0, Math.min(1, localX)) * max,
      fz: Math.max(0, Math.min(1, localZ)) * max
    };
  }
  SampleHeight(worldPosition) {
    const heights = this.terrainData.GetHeights();
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
    const height = (h0 * (1 - tz) + h1 * tz) * this.terrainData.size.y;
    worldPosition.y = height;
    return height;
  }
  SampleNormal(worldPosition) {
    const heights = this.terrainData.GetHeights();
    if (!heights) return new Mathf.Vector3(0, 1, 0);
    const size = this.terrainData.size;
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
}
_init3 = __decoratorStart(_a);
__decorateElement(_init3, 2, "geometry", _geometry_dec2, Terrain);
__decorateElement(_init3, 2, "material", _material_dec2, Terrain);
__decorateElement(_init3, 5, "terrainData", _terrainData_dec, Terrain);
__decoratorMetadata(_init3, Terrain);
__publicField(Terrain, "type", "@trident/plugins/Terrain/Terrain");
Utils.TypeRegistry.set(TerrainData.type, TerrainData);

export { PaintPropData, Terrain, TerrainData };
