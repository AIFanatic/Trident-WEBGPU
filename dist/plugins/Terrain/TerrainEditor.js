import { Components, SerializeField, Prefab, Utils, Input, KeyCodes, Renderer, Mathf, PBRMaterial } from '@trident/core';
import { EditorAPI } from '@trident/editor';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';
import { PhysicsRapier } from '@trident/plugins/PhysicsRapier/PhysicsRapier.js';
import { TerrainCollider } from '@trident/plugins/PhysicsRapier/colliders/TerrainCollider.js';
import { Terrain } from '@trident/plugins/Terrain/Terrain.js';
import { TerrainLayer } from '@trident/plugins/Terrain/TerrainMaterial.js';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = array.length + 1 ;
  var initializers = (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  ((target = target.prototype), k < 5);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
      access.set = (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(void 0  , ctx), done._ = 1;
    __expectFn(it) && (initializers.unshift(it) );
  }
  return target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _editType_dec, _paintObjectDensity_dec, _paintObjectMaxScale_dec, _paintObjectMinScale_dec, _paintTextureStrength_dec, _paintStrength_dec, _paintRadius_dec, _paintMaterialId_dec, _paintLayers_dec, _paintObjectID_dec, _paintObjects_dec, _a, _init;
var EditType = /* @__PURE__ */ ((EditType2) => {
  EditType2[EditType2["RAISE"] = 0] = "RAISE";
  EditType2[EditType2["LOWER"] = 1] = "LOWER";
  EditType2[EditType2["SET_HEIGHT"] = 2] = "SET_HEIGHT";
  EditType2[EditType2["PAINT_TEXTURE"] = 3] = "PAINT_TEXTURE";
  EditType2[EditType2["PAINT_PREFAB"] = 4] = "PAINT_PREFAB";
  EditType2[EditType2["ERASE_PREFAB"] = 5] = "ERASE_PREFAB";
  return EditType2;
})(EditType || {});
class TerrainEditor extends (_a = Components.Component, _paintObjects_dec = [SerializeField(Prefab)], _paintObjectID_dec = [SerializeField], _paintLayers_dec = [SerializeField(TerrainLayer)], _paintMaterialId_dec = [SerializeField], _paintRadius_dec = [SerializeField], _paintStrength_dec = [SerializeField], _paintTextureStrength_dec = [SerializeField], _paintObjectMinScale_dec = [SerializeField], _paintObjectMaxScale_dec = [SerializeField], _paintObjectDensity_dec = [SerializeField], _editType_dec = [SerializeField(EditType)], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "terrain");
    __publicField(this, "terrainCollider");
    __publicField(this, "lineRenderer");
    __publicField(this, "terrainLayersSignature", "");
    __publicField(this, "activeColor", "#3498db50");
    __publicField(this, "nonActiveColor", "#121212");
    __publicField(this, "dropAreaColor", "#222");
    __publicField(this, "paintObjects", __runInitializers(_init, 8, this, [])), __runInitializers(_init, 11, this);
    __publicField(this, "paintObjectID", __runInitializers(_init, 12, this, 0)), __runInitializers(_init, 15, this);
    __publicField(this, "paintLayers", __runInitializers(_init, 16, this, [])), __runInitializers(_init, 19, this);
    __publicField(this, "paintMaterialId", __runInitializers(_init, 20, this, 0)), __runInitializers(_init, 23, this);
    __publicField(this, "paintRadius", __runInitializers(_init, 24, this, 1)), __runInitializers(_init, 27, this);
    __publicField(this, "paintStrength", __runInitializers(_init, 28, this, 1)), __runInitializers(_init, 31, this);
    __publicField(this, "paintTextureStrength", __runInitializers(_init, 32, this, 1)), __runInitializers(_init, 35, this);
    __publicField(this, "paintObjectMinScale", __runInitializers(_init, 36, this, 1)), __runInitializers(_init, 39, this);
    __publicField(this, "paintObjectMaxScale", __runInitializers(_init, 40, this, 1)), __runInitializers(_init, 43, this);
    __publicField(this, "paintObjectDensity", __runInitializers(_init, 44, this, 0.5)), __runInitializers(_init, 47, this);
    __publicField(this, "editType", __runInitializers(_init, 48, this, 0 /* RAISE */)), __runInitializers(_init, 51, this);
  }
  Start() {
    const terrain = this.gameObject.GetComponent(Terrain);
    const terrainCollider = this.gameObject.GetComponent(TerrainCollider);
    if (!terrain) throw Error("No terrain found");
    if (!terrainCollider) throw Error("No terrain collider found");
    this.terrain = terrain;
    this.terrainCollider = terrainCollider;
    this.lineRenderer = this.gameObject.GetComponent(LineRenderer) || this.gameObject.AddComponent(LineRenderer);
    this.lineRenderer.flags |= Utils.Flags.DontSaveInEditor | Utils.Flags.HideInInspector;
    this.ApplyTerrainLayers();
    this.terrain.terrainData.InitializePaintMaps();
    this.UpdateTerrainCollider();
    EditorAPI.Events.onSceneSaved(() => {
      EditorAPI.SaveAsset(this.terrain.terrainData);
      console.log("Saved TerrainData");
    });
  }
  Update() {
    this.UpdateTerrainLayers();
    const hit = this.RaycastTerrain();
    if (!hit) return;
    this.UpdateDebugSphere(this.paintRadius, hit.point);
    if (!Input.GetKey(KeyCodes.E)) return;
    const heightChanged = this.ApplyActiveTool(hit.point);
    if (heightChanged) {
      this.terrain.terrainData.ApplyHeightsToGeometry();
      this.RefreshPropHeights(hit.point, this.paintRadius);
      this.UpdateTerrainCollider();
    }
  }
  ApplyActiveTool(point) {
    switch (Number(this.editType)) {
      case 0 /* RAISE */:
        this.ApplyHeightBrush(point, this.paintRadius, this.paintStrength, (height, amount) => height + amount);
        return true;
      case 1 /* LOWER */:
        this.ApplyHeightBrush(point, this.paintRadius, this.paintStrength, (height, amount) => height - amount);
        return true;
      case 2 /* SET_HEIGHT */:
        this.ApplyHeightBrush(point, this.paintRadius, this.paintStrength, (height, amount) => {
          const targetHeight = 10;
          return height + (targetHeight - height) * amount;
        });
        return true;
      case 3 /* PAINT_TEXTURE */:
        this.PaintMaterial(point, this.paintRadius, this.paintMaterialId, this.paintTextureStrength);
        return false;
      case 4 /* PAINT_PREFAB */:
        this.PaintProp(point);
        return false;
      case 5 /* ERASE_PREFAB */:
        this.EraseProps(point);
        return false;
      default:
        return false;
    }
  }
  RaycastTerrain() {
    const camera = Components.Camera.mainCamera;
    const canvas = Renderer.canvas;
    const rect = canvas.getBoundingClientRect();
    const ndcX = (Input.mousePosition.x - rect.left) / rect.width * 2 - 1;
    const ndcY = -((Input.mousePosition.y - rect.top) / rect.height) * 2 + 1;
    const invProj = camera.projectionMatrix.clone().invert();
    const viewDir = new Mathf.Vector3(ndcX, ndcY, 0).applyMatrix4(invProj);
    const dir = viewDir.transformDirection(camera.transform.localToWorldMatrix);
    return PhysicsRapier.Raycast(camera.transform.position, dir, 1e4);
  }
  ApplyTerrainLayers() {
    const validLayers = this.paintLayers.filter((layer) => layer.albedoMap);
    if (validLayers.length > 0) {
      this.terrain.terrainData.material.terrainLayers = validLayers;
    }
  }
  UpdateTerrainLayers() {
    const signature = this.paintLayers.map((layer) => {
      return [
        layer.albedoMap?.id ?? "none",
        layer.normalMap?.id ?? "none",
        layer.armMap?.id ?? "none",
        layer.transform ? Array.from(layer.transform).join(",") : "none"
      ].join(":");
    }).join("|");
    if (signature === this.terrainLayersSignature) return;
    this.terrainLayersSignature = signature;
    this.ApplyTerrainLayers();
  }
  UpdateTerrainCollider() {
    const heights = this.terrain.terrainData.GetHeights();
    const heightsSize = Math.sqrt(heights.length);
    this.terrainCollider.SetTerrainData(
      heightsSize - 1,
      heightsSize - 1,
      heights,
      this.terrain.terrainData.size
    );
  }
  UpdateDebugSphere(radius, position) {
    const positions = [];
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2;
      const b = (i + 1) / segments * Math.PI * 2;
      positions.push(
        position.x + radius * Math.cos(a),
        position.y + radius * Math.sin(a),
        position.z,
        position.x + radius * Math.cos(b),
        position.y + radius * Math.sin(b),
        position.z,
        position.x + radius * Math.cos(a),
        position.y,
        position.z + radius * Math.sin(a),
        position.x + radius * Math.cos(b),
        position.y,
        position.z + radius * Math.sin(b),
        position.x,
        position.y + radius * Math.cos(a),
        position.z + radius * Math.sin(a),
        position.x,
        position.y + radius * Math.cos(b),
        position.z + radius * Math.sin(b)
      );
    }
    this.lineRenderer.SetPositions(new Float32Array(positions));
  }
  ForEachBrushCell(worldPoint, radius, gridDim, cb) {
    const size = this.terrain.terrainData.size;
    const { fx: cx, fz: cz } = this.terrain.WorldToGrid(worldPoint, gridDim);
    const max = gridDim - 1;
    const rx = radius / size.x * max;
    const rz = radius / size.z * max;
    if (rx <= 0 || rz <= 0) return;
    const minX = Math.max(0, Math.floor(cx - rx));
    const maxX = Math.min(max, Math.ceil(cx + rx));
    const minZ = Math.max(0, Math.floor(cz - rz));
    const maxZ = Math.min(max, Math.ceil(cz + rz));
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const dx = (x - cx) / rx;
        const dz = (z - cz) / rz;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 1) continue;
        cb(x, z, dist);
      }
    }
  }
  ApplyHeightBrush(worldPoint, radius, strength, editHeight) {
    const heights = this.terrain.terrainData.GetHeights();
    const size = this.terrain.terrainData.size;
    const sizeH = Math.sqrt(heights.length);
    const normalizedStrength = strength / size.y;
    this.ForEachBrushCell(worldPoint, radius, sizeH, (x, z, dist) => {
      const amount = normalizedStrength * this.SmoothFalloff(dist);
      const i = x * sizeH + z;
      heights[i] = Math.max(0, Math.min(1, editHeight(heights[i], amount)));
    });
  }
  PaintMaterial(worldPoint, radius, materialId, strength) {
    const terrainData = this.terrain.terrainData;
    const resolution = terrainData.paintMapResolution;
    const materialIdMapData = terrainData.materialIdMapData;
    const blendWeightMapData = terrainData.blendWeightMapData;
    const clampedMaterialId = Math.max(0, Math.min(255, Math.floor(materialId)));
    const slotCount = 3;
    this.ForEachBrushCell(worldPoint, radius, resolution, (x, z, dist) => {
      const offset = (z * resolution + x) * 4;
      const amount = Math.max(0, Math.min(1, strength * this.SmoothFalloff(dist)));
      const slot = this.FindPaintSlot(materialIdMapData, blendWeightMapData, offset, slotCount, clampedMaterialId);
      materialIdMapData[offset + slot] = clampedMaterialId;
      const weights = [
        blendWeightMapData[offset + 0] / 255,
        blendWeightMapData[offset + 1] / 255,
        blendWeightMapData[offset + 2] / 255
      ];
      weights[slot] += amount;
      const total = weights[0] + weights[1] + weights[2];
      if (total <= 0) return;
      for (let i = 0; i < slotCount; i++) {
        blendWeightMapData[offset + i] = Math.round(weights[i] / total * 255);
      }
    });
    terrainData.UploadPaintMaps();
  }
  RefreshPropHeights(center, radius) {
    const r2 = radius * radius;
    const sample = new Mathf.Vector3(0, 0, 0);
    for (const propData of this.terrain.terrainData.paintPropData) {
      const matrices = propData.matrices;
      if (matrices.length === 0) continue;
      let touched = false;
      for (let i = 0; i < matrices.length; i += 16) {
        const x = matrices[i + 12];
        const z = matrices[i + 14];
        const dx = x - center.x, dz = z - center.z;
        if (dx * dx + dz * dz > r2) continue;
        sample.x = x;
        sample.y = 0;
        sample.z = z;
        this.terrain.SampleHeight(sample);
        matrices[i + 13] = sample.y;
        touched = true;
      }
      if (touched) propData.RebuildProps(this.terrain.gameObject);
    }
  }
  RemoveProp(index) {
    const prop = this.paintObjects[index];
    if (!prop) return;
    this.paintObjects.splice(index, 1);
    const paintPropData = this.terrain.terrainData.paintPropData;
    const propDataIndex = paintPropData.findIndex((value) => value.prop === prop);
    if (propDataIndex !== -1) {
      paintPropData[propDataIndex].matrices = [];
      paintPropData[propDataIndex].RebuildProps(this.gameObject);
      paintPropData.splice(propDataIndex, 1);
    }
    this.ClampSelections();
    EditorAPI.RepaintInspector();
  }
  EraseProps(worldPoint) {
    const selectedProp = this.paintObjects[this.paintObjectID];
    if (!selectedProp) return;
    const radiusSq = this.paintRadius * this.paintRadius;
    const propData = this.terrain.terrainData.paintPropData.find((value) => value.prop === selectedProp);
    if (!propData) return;
    const kept = [];
    for (let i = 0; i < propData.matrices.length; i += 16) {
      const x = propData.matrices[i + 12];
      const y = propData.matrices[i + 13];
      const z = propData.matrices[i + 14];
      const dx = x - worldPoint.x;
      const dy = y - worldPoint.y;
      const dz = z - worldPoint.z;
      if (dx * dx + dy * dy + dz * dz <= radiusSq) {
        continue;
      }
      for (let j = 0; j < 16; j++) {
        kept.push(propData.matrices[i + j]);
      }
    }
    if (kept.length === propData.matrices.length) return;
    propData.matrices = kept;
    const propIndex = this.terrain.terrainData.paintPropData.indexOf(propData);
    this.terrain.terrainData.paintPropData[propIndex].RebuildProps(this.gameObject);
  }
  async PaintProp(worldPoint) {
    const prop = this.paintObjects[this.paintObjectID];
    if (!prop) return;
    const propIndex = await this.terrain.terrainData.AddProp(prop);
    const samples = Math.max(1, Math.ceil(this.paintRadius));
    const minScale = this.paintObjectMinScale;
    const maxScale = this.paintObjectMaxScale;
    for (let i = 0; i < samples; i++) {
      if (Math.random() > this.paintObjectDensity) continue;
      const r = Math.sqrt(Math.random()) * this.paintRadius;
      const a = Math.random() * Math.PI * 2;
      const point = new Mathf.Vector3(
        worldPoint.x + Math.cos(a) * r,
        0,
        worldPoint.z + Math.sin(a) * r
      );
      this.terrain.SampleHeight(point);
      const s = minScale + Math.random() * Math.max(0, maxScale - minScale);
      const scale = new Mathf.Vector3(s, s, s);
      const yaw = Math.random() * Math.PI * 2;
      const rotation = new Mathf.Quaternion(0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5));
      const matrix = new Mathf.Matrix4();
      matrix.compose(point, rotation, scale);
      this.terrain.terrainData.AddPropMatrix(propIndex, matrix);
    }
  }
  FindPaintSlot(materialIdMapData, blendWeightMapData, offset, slotCount, materialId) {
    for (let i = 0; i < slotCount; i++) {
      if (materialIdMapData[offset + i] === materialId) return i;
    }
    let weakestSlot = 0;
    for (let i = 1; i < slotCount; i++) {
      if (blendWeightMapData[offset + i] < blendWeightMapData[offset + weakestSlot]) {
        weakestSlot = i;
      }
    }
    blendWeightMapData[offset + weakestSlot] = 0;
    return weakestSlot;
  }
  SmoothFalloff(distance01) {
    const falloff = 1 - distance01;
    return falloff * falloff * (3 - 2 * falloff);
  }
  CreateLayerFromMaterial(material) {
    const layer = new TerrainLayer();
    layer.name = material.name;
    layer.albedoMap = material.params.albedoMap;
    layer.normalMap = material.params.normalMap;
    layer.armMap = material.params.armMap;
    layer.transform = new Float32Array([...material.params.repeat.elements, ...material.params.offset.elements]);
    return layer;
  }
  ClampSelections() {
    this.paintMaterialId = this.ClampIndex(this.paintMaterialId, this.paintLayers.length);
    this.paintObjectID = this.ClampIndex(this.paintObjectID, this.paintObjects.length);
  }
  ClampIndex(index, length) {
    if (length <= 0) return 0;
    return Math.max(0, Math.min(index, length - 1));
  }
  DropData() {
    return EditorAPI.ExtendedDataTransfer().data;
  }
  IsValidDrop(ctor) {
    return this.DropData() instanceof ctor;
  }
  SetDropActive(event, active) {
    const target = event.currentTarget;
    target.style.backgroundColor = active ? this.activeColor : this.dropAreaColor;
  }
  DropEvents(ctor, onDrop) {
    return {
      onDragEnter: (event) => {
        if (!this.IsValidDrop(ctor)) return;
        event.preventDefault();
        event.stopPropagation();
        this.SetDropActive(event, true);
      },
      onDragOver: (event) => {
        if (!this.IsValidDrop(ctor)) return;
        event.preventDefault();
        event.stopPropagation();
      },
      onDragLeave: (event) => {
        this.SetDropActive(event, false);
      },
      onDrop: (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.SetDropActive(event, false);
        const dropped = this.DropData();
        if (!(dropped instanceof ctor)) return;
        onDrop(dropped);
        this.ClampSelections();
        EditorAPI.RepaintInspector();
      }
    };
  }
  RenderList(h, items, selectedIndex, emptyText, getName, onSelect, onRemove, btnStyle) {
    if (items.length === 0) return emptyText;
    return items.map(
      (item, index) => h(
        "div",
        {
          style: Object.assign({}, btnStyle, { position: "relative", marginBottom: "4px", backgroundColor: selectedIndex === index ? this.activeColor : this.nonActiveColor }),
          onClick: () => {
            onSelect(index);
            EditorAPI.RepaintInspector();
          }
        },
        getName(item),
        h("div", {
          style: { position: "absolute", top: "50%", right: "0.5rem", transform: "translateY(-50%)" },
          onClick: (event) => {
            event.stopPropagation();
            onRemove(index);
            this.ClampSelections();
            EditorAPI.RepaintInspector();
          }
        }, "X")
      )
    );
  }
  RenderTabButton(h, editType, label, btnStyle) {
    return h("button", {
      style: Object.assign({}, btnStyle, { borderRadius: "0px", flex: 1, backgroundColor: this.editType === editType ? this.activeColor : this.nonActiveColor }),
      onClick: () => {
        this.editType = editType;
        EditorAPI.RepaintInspector();
      }
    }, label);
  }
  OnInspectorGUI() {
    const h = (type, props, ...children) => ({ type, props, children });
    const btnStyle = { backgroundColor: this.nonActiveColor, color: "inherit", fontSize: "inherit", borderRadius: "5px", border: "1px solid black", outline: "none", padding: "5px", cursor: "pointer" };
    const dropAreaStyle = { padding: "5px", margin: "5px 5px 5px 10px", border: "1px dashed #ffffff1f", borderRadius: "5px", background: this.dropAreaColor };
    let activeSection = h("div", {}, []);
    if (this.editType === 0 /* RAISE */ || this.editType === 1 /* LOWER */ || this.editType === 2 /* SET_HEIGHT */) {
      activeSection = h(
        "section",
        null,
        h(
          "div",
          { className: "row", style: { display: "block" } },
          h(
            "div",
            { style: "padding: 5px" },
            h(
              "select",
              {
                style: Object.assign({}, { width: "100%" }, btnStyle),
                value: String(this.editType),
                onChange: (event) => {
                  this.editType = Number(event.currentTarget.value);
                }
              },
              h("option", { value: String(0 /* RAISE */) }, "Raise"),
              h("option", { value: String(1 /* LOWER */) }, "Lower"),
              h("option", { value: String(2 /* SET_HEIGHT */) }, "Set height")
            )
          ),
          EditorAPI.LayoutInspectorInput({ title: "Brush Size", value: this.paintRadius, min: 1, max: 64, step: 1, onChanged: (value) => this.paintRadius = parseFloat(value) }),
          EditorAPI.LayoutInspectorInput({ title: "Brush Strength", value: this.paintStrength, min: 0, max: 1, step: 0.01, onChanged: (value) => this.paintStrength = parseFloat(value) })
        )
      );
    } else if (this.editType === 3 /* PAINT_TEXTURE */) {
      activeSection = h(
        "section",
        null,
        h(
          "div",
          { className: "row", style: { display: "block" } },
          h(
            "div",
            Object.assign({}, this.DropEvents(PBRMaterial, (material) => {
              this.paintLayers.push(this.CreateLayerFromMaterial(material));
            }), { style: dropAreaStyle }),
            this.RenderList(
              h,
              this.paintLayers,
              this.paintMaterialId,
              "List is empty, drop materials",
              (layer) => layer.name ?? "Material",
              (index) => this.paintMaterialId = index,
              (index) => this.paintLayers.splice(index, 1),
              btnStyle
            )
          ),
          EditorAPI.LayoutInspectorInput({ title: "Brush Size", value: this.paintRadius, min: 1, max: 64, step: 1, onChanged: (value) => this.paintRadius = parseFloat(value) }),
          EditorAPI.LayoutInspectorInput({ title: "Brush Strength", value: this.paintTextureStrength, min: 0, max: 1, step: 0.01, onChanged: (value) => this.paintTextureStrength = parseFloat(value) })
        )
      );
    } else if (this.editType === 4 /* PAINT_PREFAB */) {
      activeSection = h(
        "section",
        null,
        h(
          "div",
          { className: "row", style: { display: "block" } },
          h(
            "div",
            { style: "padding: 5px" },
            h(
              "select",
              {
                style: Object.assign({}, { width: "100%" }, btnStyle),
                value: String(this.editType),
                onChange: (event) => {
                  this.editType = Number(event.currentTarget.value);
                }
              },
              h("option", { value: String(4 /* PAINT_PREFAB */) }, "Add prop"),
              h("option", { value: String(5 /* ERASE_PREFAB */) }, "Remove prop")
            )
          ),
          h(
            "div",
            Object.assign({}, this.DropEvents(Prefab, (prefab) => {
              if (!this.paintObjects.includes(prefab)) {
                this.paintObjects.push(prefab);
                this.terrain.terrainData.AddProp(prefab);
              }
            }), { style: dropAreaStyle }),
            this.RenderList(
              h,
              this.paintObjects,
              this.paintObjectID,
              "List is empty, drop GameObjects",
              (object) => object.name,
              (index) => this.paintObjectID = index,
              (index) => this.RemoveProp(index),
              btnStyle
            )
          ),
          EditorAPI.LayoutInspectorInput({ title: "Brush Size", value: this.paintRadius, min: 1, max: 64, step: 1, onChanged: (value) => this.paintRadius = parseFloat(value) }),
          EditorAPI.LayoutInspectorInput({ title: "Density", value: this.paintObjectDensity, min: 0, max: 1, step: 0.01, onChanged: (value) => this.paintObjectDensity = parseFloat(value) }),
          EditorAPI.LayoutInspectorInput({ title: "Min Scale", value: this.paintObjectMinScale, min: 0.01, max: 10, step: 0.01, onChanged: (value) => this.paintObjectMinScale = parseFloat(value) }),
          EditorAPI.LayoutInspectorInput({ title: "Max Scale", value: this.paintObjectMaxScale, min: 0.01, max: 10, step: 0.01, onChanged: (value) => this.paintObjectMaxScale = parseFloat(value) })
        )
      );
    }
    return h(
      "div",
      { className: "inspector", style: { fontSize: "9px" } },
      h(
        "div",
        { className: "tabs", style: { display: "flex" } },
        this.RenderTabButton(h, 0 /* RAISE */, "Edit Terrain", btnStyle),
        this.RenderTabButton(h, 3 /* PAINT_TEXTURE */, "Paint Material", btnStyle),
        this.RenderTabButton(h, 4 /* PAINT_PREFAB */, "Paint Props", btnStyle)
      ),
      activeSection
    );
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 5, "paintObjects", _paintObjects_dec, TerrainEditor);
__decorateElement(_init, 5, "paintObjectID", _paintObjectID_dec, TerrainEditor);
__decorateElement(_init, 5, "paintLayers", _paintLayers_dec, TerrainEditor);
__decorateElement(_init, 5, "paintMaterialId", _paintMaterialId_dec, TerrainEditor);
__decorateElement(_init, 5, "paintRadius", _paintRadius_dec, TerrainEditor);
__decorateElement(_init, 5, "paintStrength", _paintStrength_dec, TerrainEditor);
__decorateElement(_init, 5, "paintTextureStrength", _paintTextureStrength_dec, TerrainEditor);
__decorateElement(_init, 5, "paintObjectMinScale", _paintObjectMinScale_dec, TerrainEditor);
__decorateElement(_init, 5, "paintObjectMaxScale", _paintObjectMaxScale_dec, TerrainEditor);
__decorateElement(_init, 5, "paintObjectDensity", _paintObjectDensity_dec, TerrainEditor);
__decorateElement(_init, 5, "editType", _editType_dec, TerrainEditor);
__decoratorMetadata(_init, TerrainEditor);
__publicField(TerrainEditor, "type", "@trident/plugins/Terrain/TerrainEditor");

export { TerrainEditor };
