import { Components, Input, KeyCodes, Mathf, PBRMaterial, Prefab, Renderer, SerializeField, Utils } from "@trident/core";
import { EditorAPI } from "@trident/editor";
import { LineRenderer } from "@trident/plugins/LineRenderer";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier.js";
import { TerrainCollider } from "@trident/plugins/PhysicsRapier/colliders/TerrainCollider";
import { Terrain } from "@trident/plugins/Terrain/Terrain.js";
import { TerrainLayer } from "@trident/plugins/Terrain/TerrainMaterial.js";

enum EditType {
    RAISE,
    LOWER,
    SET_HEIGHT,
    PAINT_TEXTURE,
    PAINT_PREFAB,
    ERASE_PREFAB,
}

type DropCallback<T> = (value: T) => void;
type VNodeFactory = (type: string, props: object | null, ...children: any[]) => any;

export class TerrainEditor extends Components.Component {
    public static type = "@trident/plugins/Terrain/TerrainEditor";
    private terrain: Terrain;
    private terrainCollider: TerrainCollider;
    private lineRenderer: LineRenderer;

    private terrainLayersSignature = "";

    private readonly activeColor = "#3498db50";
    private readonly nonActiveColor = "#121212";
    private readonly dropAreaColor = "#222";

    @SerializeField(Prefab) public paintObjects: Prefab[] = [];
    @SerializeField public paintObjectID = 0;

    @SerializeField(TerrainLayer) public paintLayers: TerrainLayer[] = [];
    @SerializeField public paintMaterialId = 0;

    @SerializeField public paintRadius = 1;
    @SerializeField public paintStrength = 1;
    @SerializeField public paintTextureStrength = 1;

    @SerializeField public paintObjectMinScale = 1;
    @SerializeField public paintObjectMaxScale = 1;
    @SerializeField public paintObjectDensity = 0.5;

    @SerializeField(EditType) public editType: EditType = EditType.RAISE;

    public Start(): void {
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
        })
    }

    public Update(): void {
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

    private ApplyActiveTool(point: Mathf.Vector3): boolean {
        switch (Number(this.editType)) {
            case EditType.RAISE:
                this.ApplyHeightBrush(point, this.paintRadius, this.paintStrength, (height, amount) => height + amount);
                return true;

            case EditType.LOWER:
                this.ApplyHeightBrush(point, this.paintRadius, this.paintStrength, (height, amount) => height - amount);
                return true;

            case EditType.SET_HEIGHT:
                this.ApplyHeightBrush(point, this.paintRadius, this.paintStrength, (height, amount) => {
                    const targetHeight = 10;
                    return height + (targetHeight - height) * amount;
                });
                return true;

            case EditType.PAINT_TEXTURE:
                this.PaintMaterial(point, this.paintRadius, this.paintMaterialId, this.paintTextureStrength);
                return false;

            case EditType.PAINT_PREFAB:
                this.PaintProp(point);
                return false;

            case EditType.ERASE_PREFAB:
                this.EraseProps(point);
                return false;

            default:
                return false;
        }
    }

    private RaycastTerrain() {
        const camera = Components.Camera.mainCamera;
        const canvas = Renderer.canvas;
        const rect = canvas.getBoundingClientRect();

        const ndcX = ((Input.mousePosition.x - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((Input.mousePosition.y - rect.top) / rect.height) * 2 + 1;

        const invProj = camera.projectionMatrix.clone().invert();
        const viewDir = new Mathf.Vector3(ndcX, ndcY, 0).applyMatrix4(invProj);
        const dir = viewDir.transformDirection(camera.transform.localToWorldMatrix);

        return PhysicsRapier.Raycast(camera.transform.position, dir, 10000);
    }

    private ApplyTerrainLayers(): void {
        const validLayers = this.paintLayers.filter(layer => layer.albedoMap);
        if (validLayers.length > 0) {
            this.terrain.terrainData.material.terrainLayers = validLayers;
        }
    }

    private UpdateTerrainLayers(): void {
        const signature = this.paintLayers.map(layer => {
            return [
                layer.albedoMap?.id ?? "none",
                layer.normalMap?.id ?? "none",
                layer.armMap?.id ?? "none",
                layer.transform ? Array.from(layer.transform).join(",") : "none",
            ].join(":");
        }).join("|");

        if (signature === this.terrainLayersSignature) return;

        this.terrainLayersSignature = signature;
        this.ApplyTerrainLayers();
    }

    private UpdateTerrainCollider(): void {
        const heights = this.terrain.terrainData.GetHeights();
        const heightsSize = Math.sqrt(heights.length);

        this.terrainCollider.SetTerrainData(
            heightsSize - 1,
            heightsSize - 1,
            heights,
            this.terrain.terrainData.size,
        );
    }

    private UpdateDebugSphere(radius: number, position: Mathf.Vector3): void {
        const positions: number[] = [];
        const segments = 64;

        for (let i = 0; i < segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            const b = ((i + 1) / segments) * Math.PI * 2;

            positions.push(
                position.x + radius * Math.cos(a), position.y + radius * Math.sin(a), position.z,
                position.x + radius * Math.cos(b), position.y + radius * Math.sin(b), position.z,

                position.x + radius * Math.cos(a), position.y, position.z + radius * Math.sin(a),
                position.x + radius * Math.cos(b), position.y, position.z + radius * Math.sin(b),

                position.x, position.y + radius * Math.cos(a), position.z + radius * Math.sin(a),
                position.x, position.y + radius * Math.cos(b), position.z + radius * Math.sin(b),
            );
        }

        this.lineRenderer.SetPositions(new Float32Array(positions));
    }

    public ForEachBrushCell(worldPoint: Mathf.Vector3, radius: number, gridDim: number, cb: (x: number, z: number, dist01: number) => void): void {
        const size = this.terrain.terrainData.size;
        const { fx: cx, fz: cz } = this.terrain.WorldToGrid(worldPoint, gridDim);
        const max = gridDim - 1;
        const rx = (radius / size.x) * max;
        const rz = (radius / size.z) * max;
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

    private ApplyHeightBrush(worldPoint: Mathf.Vector3, radius: number, strength: number, editHeight: (height: number, amount: number) => number): void {
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

    private PaintMaterial(worldPoint: Mathf.Vector3, radius: number, materialId: number, strength: number): void {
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
                blendWeightMapData[offset + 2] / 255,
            ];
            weights[slot] += amount;

            const total = weights[0] + weights[1] + weights[2];
            if (total <= 0) return;

            for (let i = 0; i < slotCount; i++) {
                blendWeightMapData[offset + i] = Math.round((weights[i] / total) * 255);
            }
        });

        terrainData.UploadPaintMaps();
    }

    private RefreshPropHeights(center: Mathf.Vector3, radius: number): void {
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

                sample.x = x; sample.y = 0; sample.z = z;
                this.terrain.SampleHeight(sample);
                matrices[i + 13] = sample.y;
                touched = true;
            }

            if (touched) propData.RebuildProps(this.terrain.gameObject);
        }
    }

    private RemoveProp(index: number): void {
        const prop = this.paintObjects[index];
        if (!prop) return;

        this.paintObjects.splice(index, 1);

        const paintPropData = this.terrain.terrainData.paintPropData;
        const propDataIndex = paintPropData.findIndex(value => value.prop === prop);

        if (propDataIndex !== -1) {
            paintPropData[propDataIndex].matrices = [];
            paintPropData[propDataIndex].RebuildProps(this.gameObject);
            paintPropData.splice(propDataIndex, 1);
        }

        this.ClampSelections();
        EditorAPI.RepaintInspector();
    }

    private EraseProps(worldPoint: Mathf.Vector3): void {
        const selectedProp = this.paintObjects[this.paintObjectID];
        if (!selectedProp) return;

        const radiusSq = this.paintRadius * this.paintRadius;
        const propData = this.terrain.terrainData.paintPropData.find(value => value.prop === selectedProp);
        if (!propData) return;

        const kept: number[] = [];

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

    private async PaintProp(worldPoint: Mathf.Vector3) {
        const prop = this.paintObjects[this.paintObjectID];
        if (!prop) return;

        const propIndex = await this.terrain.terrainData.AddProp(prop);

        // sample a handful of candidates per frame; density gates how many actually land
        const samples = Math.max(1, Math.ceil(this.paintRadius));
        const minScale = this.paintObjectMinScale;
        const maxScale = this.paintObjectMaxScale;

        for (let i = 0; i < samples; i++) {
            if (Math.random() > this.paintObjectDensity) continue;

            // uniform sample inside the brush disk (sqrt for area-uniform)
            const r = Math.sqrt(Math.random()) * this.paintRadius;
            const a = Math.random() * Math.PI * 2;
            const point = new Mathf.Vector3(
                worldPoint.x + Math.cos(a) * r,
                0,
                worldPoint.z + Math.sin(a) * r,
            );
            this.terrain.SampleHeight(point); // mutates point.y to terrain surface

            const s = minScale + Math.random() * Math.max(0, maxScale - minScale);
            const scale = new Mathf.Vector3(s, s, s);

            const yaw = Math.random() * Math.PI * 2;
            const rotation = new Mathf.Quaternion(0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5));

            const matrix = new Mathf.Matrix4();
            matrix.compose(point, rotation, scale);
            this.terrain.terrainData.AddPropMatrix(propIndex, matrix);
        }
    }

    private FindPaintSlot(materialIdMapData: Uint8Array, blendWeightMapData: Uint8Array, offset: number, slotCount: number, materialId: number): number {
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

    private SmoothFalloff(distance01: number): number {
        const falloff = 1 - distance01;
        return falloff * falloff * (3 - 2 * falloff);
    }

    private CreateLayerFromMaterial(material: PBRMaterial): TerrainLayer {
        const layer = new TerrainLayer();

        layer.name = material.name;
        layer.albedoMap = material.params.albedoMap;
        layer.normalMap = material.params.normalMap;
        layer.armMap = material.params.armMap;
        layer.transform = new Float32Array([...material.params.repeat.elements, ...material.params.offset.elements]);

        return layer;
    }

    private ClampSelections(): void {
        this.paintMaterialId = this.ClampIndex(this.paintMaterialId, this.paintLayers.length);
        this.paintObjectID = this.ClampIndex(this.paintObjectID, this.paintObjects.length);
    }

    private ClampIndex(index: number, length: number): number {
        if (length <= 0) return 0;
        return Math.max(0, Math.min(index, length - 1));
    }

    private DropData(): any {
        return EditorAPI.ExtendedDataTransfer().data;
    }

    private IsValidDrop<T>(ctor: new (...args: any[]) => T): boolean {
        return this.DropData() instanceof ctor;
    }

    private SetDropActive(event: DragEvent, active: boolean): void {
        const target = event.currentTarget as HTMLElement;
        target.style.backgroundColor = active ? this.activeColor : this.dropAreaColor;
    }

    private DropEvents<T>(ctor: new (...args: any[]) => T, onDrop: DropCallback<T>) {
        return {
            onDragEnter: (event: DragEvent) => {
                if (!this.IsValidDrop(ctor)) return;

                event.preventDefault();
                event.stopPropagation();
                this.SetDropActive(event, true);
            },
            onDragOver: (event: DragEvent) => {
                if (!this.IsValidDrop(ctor)) return;

                event.preventDefault();
                event.stopPropagation();
            },
            onDragLeave: (event: DragEvent) => {
                this.SetDropActive(event, false);
            },
            onDrop: (event: DragEvent) => {
                event.preventDefault();
                event.stopPropagation();
                this.SetDropActive(event, false);

                const dropped = this.DropData();
                if (!(dropped instanceof ctor)) return;

                onDrop(dropped);
                this.ClampSelections();
                EditorAPI.RepaintInspector();
            },
        };
    }

    private RenderList<T>(h: VNodeFactory, items: T[], selectedIndex: number, emptyText: string, getName: (item: T) => string, onSelect: (index: number) => void, onRemove: (index: number) => void, btnStyle: object) {
        if (items.length === 0) return emptyText;

        return items.map((item, index) =>
            h("div", {
                style: Object.assign({}, btnStyle, { position: "relative", marginBottom: "4px", backgroundColor: selectedIndex === index ? this.activeColor : this.nonActiveColor }),
                onClick: () => {
                    onSelect(index);
                    EditorAPI.RepaintInspector();
                },
            },
                getName(item),
                h("div", {
                    style: { position: "absolute", top: "50%", right: "0.5rem", transform: "translateY(-50%)" },
                    onClick: (event: MouseEvent) => {
                        event.stopPropagation();
                        onRemove(index);
                        this.ClampSelections();
                        EditorAPI.RepaintInspector();
                    },
                }, "X"),
            ),
        );
    }

    private RenderTabButton(h: VNodeFactory, editType: EditType, label: string, btnStyle: object) {
        return h("button", {
            style: Object.assign({}, btnStyle, { borderRadius: "0px", flex: 1, backgroundColor: this.editType === editType ? this.activeColor : this.nonActiveColor }),
            onClick: () => {
                this.editType = editType;
                EditorAPI.RepaintInspector();
            }
        }, label);
    }

    public OnInspectorGUI() {
        const h: VNodeFactory = (type, props, ...children) => ({ type, props, children });
        const btnStyle = { backgroundColor: this.nonActiveColor, color: "inherit", fontSize: "inherit", borderRadius: "5px", border: "1px solid black", outline: "none", padding: "5px", cursor: "pointer" };
        const dropAreaStyle = { padding: "5px", margin: "5px 5px 5px 10px", border: "1px dashed #ffffff1f", borderRadius: "5px", background: this.dropAreaColor };

        let activeSection = h("div", {}, []);

        if (this.editType === EditType.RAISE || this.editType === EditType.LOWER || this.editType === EditType.SET_HEIGHT) {
            activeSection = h("section", null,
                h("div", { className: "row", style: { display: "block" } },
                    h("div", { style: "padding: 5px" },
                        h("select", {
                            style: Object.assign({}, { width: "100%" }, btnStyle), value: String(this.editType),
                            onChange: (event: Event) => { this.editType = Number((event.currentTarget as HTMLSelectElement).value) as EditType },
                        },
                            h("option", { value: String(EditType.RAISE) }, "Raise"),
                            h("option", { value: String(EditType.LOWER) }, "Lower"),
                            h("option", { value: String(EditType.SET_HEIGHT) }, "Set height"),
                        )
                    ),
                    EditorAPI.LayoutInspectorInput({ title: "Brush Size", value: this.paintRadius, min: 1, max: 64, step: 1, onChanged: value => this.paintRadius = parseFloat(value) }),
                    EditorAPI.LayoutInspectorInput({ title: "Brush Strength", value: this.paintStrength, min: 0, max: 1, step: 0.01, onChanged: value => this.paintStrength = parseFloat(value) }),
                ),
            );
        }
        else if (this.editType === EditType.PAINT_TEXTURE) {
            activeSection = h("section", null,
                h("div", { className: "row", style: { display: "block" } },
                    h("div", Object.assign({}, this.DropEvents(PBRMaterial, material => {
                        this.paintLayers.push(this.CreateLayerFromMaterial(material));
                    }), { style: dropAreaStyle }),
                        this.RenderList(
                            h,
                            this.paintLayers,
                            this.paintMaterialId,
                            "List is empty, drop materials",
                            layer => layer.name ?? "Material",
                            index => this.paintMaterialId = index,
                            index => this.paintLayers.splice(index, 1),
                            btnStyle,
                        ),
                    ),
                    EditorAPI.LayoutInspectorInput({ title: "Brush Size", value: this.paintRadius, min: 1, max: 64, step: 1, onChanged: value => this.paintRadius = parseFloat(value) }),
                    EditorAPI.LayoutInspectorInput({ title: "Brush Strength", value: this.paintTextureStrength, min: 0, max: 1, step: 0.01, onChanged: value => this.paintTextureStrength = parseFloat(value) }),
                ),
            );
        }
        else if (this.editType === EditType.PAINT_PREFAB) {
            activeSection = h("section", null,
                h("div", { className: "row", style: { display: "block" } },
                    h("div", { style: "padding: 5px" },
                        h("select", {
                            style: Object.assign({}, { width: "100%" }, btnStyle), value: String(this.editType),
                            onChange: (event: Event) => { this.editType = Number((event.currentTarget as HTMLSelectElement).value) as EditType },
                        },
                            h("option", { value: String(EditType.PAINT_PREFAB) }, "Add prop"),
                            h("option", { value: String(EditType.ERASE_PREFAB) }, "Remove prop"),
                        )
                    ),
                    h("div", Object.assign({}, this.DropEvents(Prefab, prefab => {
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
                            object => object.name,
                            index => this.paintObjectID = index,
                            index => this.RemoveProp(index),
                            btnStyle,
                        ),
                    ),
                    EditorAPI.LayoutInspectorInput({ title: "Brush Size", value: this.paintRadius, min: 1, max: 64, step: 1, onChanged: value => this.paintRadius = parseFloat(value) }),
                    EditorAPI.LayoutInspectorInput({ title: "Density", value: this.paintObjectDensity, min: 0, max: 1, step: 0.01, onChanged: value => this.paintObjectDensity = parseFloat(value) }),
                    EditorAPI.LayoutInspectorInput({ title: "Min Scale", value: this.paintObjectMinScale, min: 0.01, max: 10, step: 0.01, onChanged: value => this.paintObjectMinScale = parseFloat(value) }),
                    EditorAPI.LayoutInspectorInput({ title: "Max Scale", value: this.paintObjectMaxScale, min: 0.01, max: 10, step: 0.01, onChanged: value => this.paintObjectMaxScale = parseFloat(value) }),
                ),
            );
        }

        return h("div", { className: "inspector", style: { fontSize: "9px" } },
            h("div", { className: "tabs", style: { display: "flex" } },
                this.RenderTabButton(h, EditType.RAISE, "Edit Terrain", btnStyle),
                this.RenderTabButton(h, EditType.PAINT_TEXTURE, "Paint Material", btnStyle),
                this.RenderTabButton(h, EditType.PAINT_PREFAB, "Paint Props", btnStyle),
            ),
            activeSection,
        );
    }
}