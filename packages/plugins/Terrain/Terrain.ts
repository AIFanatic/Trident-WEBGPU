import { GameObject, Geometry, IndexAttribute, VertexAttribute, Components, Mathf, SerializeField, NonSerialized, Utils, GPU, Prefab, EventSystemLocal, Assets } from "@trident/core";
import { TerrainMaterial } from "./TerrainMaterial";
import { LODGroup } from "../LOD/LODGroup";
import { InstancedLODGroup } from "../LOD/InstancedLODGroup";

export class TerrainEvents {
    public static Changed = (terrain: Terrain, terrainData: TerrainData) => { };
    public static GeometryUpdated = (terrainData: TerrainData) => { };
}

export class PaintPropData {
    @SerializeField public id: string = Utils.UUID();
    @SerializeField(Prefab) public prop: Prefab;
    @SerializeField(Array) public matrices: Array<number> = [];

    private instancedPrefab: GameObject;
    private instancedLODGroup: InstancedLODGroup;

    // TODO: Check if LODGroup was changed
    public async RebuildProps(terrainGameObject: GameObject) {
        if (!this.instancedPrefab) {
            this.instancedPrefab = await terrainGameObject.scene.Instantiate(this.prop);
            this.instancedPrefab.enabled = false;
            this.instancedPrefab.flags = Utils.Flags.DontSaveInEditor | Utils.Flags.HideInHierarchy;
        }
        const lodGroup = this.instancedPrefab.GetComponent(LODGroup);
        if (!lodGroup) throw Error("No LODGroup found");
        if (lodGroup.lods.length === 0) throw Error("No LODGroup found");

        // Copy LODGroup
        if (!this.instancedLODGroup) {
            this.instancedLODGroup = terrainGameObject.AddComponent(InstancedLODGroup);
            this.instancedLODGroup.flags = Utils.Flags.DontSaveInEditor | Utils.Flags.HideInInspector;
            this.instancedLODGroup.lods = lodGroup.lods;
        }

        // Set matrices
        this.instancedLODGroup.SetMatricesBulk(new Float32Array(this.matrices));
    }

    public AddPropMatrix(matrix: Mathf.Matrix4) {
        const m = matrix.clone().mul(this.instancedPrefab.transform.localToWorldMatrix)
        this.matrices.push(...m.elements);
        this.instancedLODGroup.SetMatrixAt(this.instancedLODGroup.instanceCount, m);
    }

    public Destroy() {
        if (this.instancedLODGroup) {
            this.instancedLODGroup.gameObject.RemoveComponent(this.instancedLODGroup);
            this.instancedLODGroup = undefined as any;
        }

        if (this.instancedPrefab) {
            this.instancedPrefab.Destroy();
            this.instancedPrefab = undefined as any;
        }
    }
}

export class TerrainData {
    public static type = "@trident/plugins/Terrain/TerrainData";

    @SerializeField(PaintPropData) public paintPropData: PaintPropData[] = [];
    @SerializeField public size: Mathf.Vector3;

    @NonSerialized public geometry: Geometry;
    @SerializeField public material: TerrainMaterial;

    private _heights: Float32Array;
    @SerializeField(Float32Array) public get heights(): Float32Array { return this._heights };
    public set heights(heights: Float32Array) {
        const expectedSide = this.resolution + 1;
        if (heights.length !== expectedSide * expectedSide) {
            const srcSide = Math.round(Math.sqrt(heights.length));
            if (srcSide * srcSide !== heights.length) {
                throw Error(`Heights length ${heights.length} is not a square number`);
            }
            console.warn(`[TerrainData] Resampling heights ${srcSide}² → ${expectedSide}² (saved at older resolution)`);
            heights = TerrainData.resampleHeights(heights, expectedSide);
        }
        this._heights = heights;
        this.RebuildGeometry();
    }

    @SerializeField public paintMapResolution: number = 256;

    private _materialIdMapData: Uint8Array;
    @SerializeField(Uint8Array) public get materialIdMapData(): Uint8Array { return this._materialIdMapData; }
    public set materialIdMapData(data: Uint8Array) { this._materialIdMapData = data; }

    @NonSerialized public materialIdMapTexture: GPU.Texture;

    public resolution = 256;

    constructor() {
        this.size = new Mathf.Vector3(1000, 600, 1000);
        this.material = new TerrainMaterial();

        const verticesPerSide = this.resolution + 1;
        this.heights = new Float32Array(verticesPerSide * verticesPerSide);
        this.InitializePaintMapData();
    }

    private static resampleHeights(src: Float32Array, dstSide: number): Float32Array {
        const srcSide = Math.round(Math.sqrt(src.length));
        if (srcSide === dstSide) return src;

        const dst = new Float32Array(dstSide * dstSide);
        const srcMax = srcSide - 1;
        const dstMax = dstSide - 1;

        for (let ix = 0; ix < dstSide; ix++) {
            const sx = (ix / dstMax) * srcMax;
            const x0 = Math.floor(sx);
            const x1 = Math.min(x0 + 1, srcMax);
            const tx = sx - x0;
            for (let iz = 0; iz < dstSide; iz++) {
                const sz = (iz / dstMax) * srcMax;
                const z0 = Math.floor(sz);
                const z1 = Math.min(z0 + 1, srcMax);
                const tz = sz - z0;
                const a = src[x0 * srcSide + z0];
                const b = src[x0 * srcSide + z1];
                const c = src[x1 * srcSide + z0];
                const d = src[x1 * srcSide + z1];
                dst[ix * dstSide + iz] =
                    (a * (1 - tz) + b * tz) * (1 - tx) +
                    (c * (1 - tz) + d * tz) * tx;
            }
        }
        return dst;
    }

    private InitializePaintMapData(): void {
        const pixelCount = this.paintMapResolution * this.paintMapResolution;
        if (!this._materialIdMapData || this._materialIdMapData.length !== pixelCount * 4) {
            this._materialIdMapData = new Uint8Array(pixelCount * 4);
        }
    }

    public Resize(x: number, y: number, z: number): void {
        this.size.set(x, y, z);
        this.RebuildGeometry();
    }

    public async InitializePaintMaps() {
        this.InitializePaintMapData();
        this.materialIdMapTexture = GPU.Texture.Create(this.paintMapResolution, this.paintMapResolution, 1, "rgba8unorm");
        this.UploadPaintMaps();
        await this.BindPaintMaps();
    }

    public UploadPaintMaps(): void {
        const bytesPerRow = this.paintMapResolution * 4;
        this.materialIdMapTexture.SetData(this._materialIdMapData, bytesPerRow);
    }

    public async BindPaintMaps(): Promise<void> {
        if (this.material.pendingShaderCreation) {
            await this.material.pendingShaderCreation;
        }
        this.material.materialIdMap = this.materialIdMapTexture;
    }

    public GetProp(id: string): PaintPropData | undefined {
        return this.paintPropData.find(p => p.id === id);
    }

    public GetPropIndex(id: string): number {
        return this.paintPropData.findIndex(p => p.id === id);
    }

    public async AddProp(prefab: Prefab, terrainGameObject: GameObject): Promise<string> {
        const existing = this.paintPropData.find(p => p.prop.assetPath === prefab.assetPath);
        if (existing) return existing.id;

        const newProp = new PaintPropData();
        newProp.prop = prefab;
        await newProp.RebuildProps(terrainGameObject);
        this.paintPropData.push(newProp);
        return newProp.id;
    }

    public RemoveProp(id: string) {
        const idx = this.paintPropData.findIndex(p => p.id === id);
        if (idx === -1) throw Error(`Prop ${id} doesn't exist`);
        this.paintPropData[idx].Destroy();
        this.paintPropData.splice(idx, 1);
        // EventSystemLocal.emit(TerrainEvents.Changed, this, this, this);
    }

    public AddPropMatrix(id: string, matrix: Mathf.Matrix4) {
        const prop = this.GetProp(id);
        if (!prop) throw Error(`Prop ${id} doesn't exist`);
        prop.AddPropMatrix(matrix);
    }

    public RebuildGeometry(): void {
        const verticesPerSide = this.resolution + 1;
        this.geometry = TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);
        this.geometry.name = this.assetPath;
        EventSystemLocal.emit(TerrainEvents.GeometryUpdated, this, this);
    }

    private static GenerateGeometryFromHeights(verticesPerSide: number, heights: Float32Array, size: Mathf.Vector3): Geometry {
        if (heights.length !== verticesPerSide * verticesPerSide) throw Error(`Heights length (${heights.length} don't match terrain size of ${verticesPerSide}x${verticesPerSide}(${verticesPerSide * verticesPerSide})`);

        const vertices: number[] = [];
        const uvs: number[] = [];
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
        const indices: number[] = [];
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

    private smoothHeightsLaplacian(h: Float32Array, size: number, iters = 3, alpha = 0.5) {
        const out = new Float32Array(h);
        const idx = (x: number, y: number) => y * size + x;

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

    public async HeightmapFromTexture(texture: GPU.Texture, smoothHeights: boolean = true, heightMultiplier = 1): Promise<Float32Array> {
        if (texture.width !== texture.height) {
            throw Error(`Only square textures are supported, got ${texture.width}x${texture.height}`);
        }

        const srcSize = texture.width;
        const pixels = await texture.GetPixels(0, 0, srcSize, srcSize, 0);
        const totalPixels = srcSize * srcSize;

        // Pull the red channel out as a flat Float32Array in [0,1].
        const channels = pixels.length / totalPixels;
        if (!Number.isInteger(channels)) {
            throw Error(`HeightmapFromTexture: unexpected pixel layout for format ${texture.format}`);
        }
        const red = new Float32Array(totalPixels);
        if (pixels instanceof Uint8Array) for (let i = 0; i < totalPixels; i++) red[i] = pixels[i * channels] / 255;
        else if (pixels instanceof Float32Array || pixels instanceof Float16Array) for (let i = 0; i < totalPixels; i++) red[i] = pixels[i * channels];
        else throw Error(`HeightmapFromTexture: unsupported pixel array type for format ${texture.format}`);

        // Resample into the vertex grid, preserving the column/row swap the canvas path did.
        const verticesPerSide = this.resolution + 1;
        const heights = new Float32Array(verticesPerSide * verticesPerSide);
        const last = srcSize - 1;
        const denom = Math.max(1, verticesPerSide - 1);

        const sample = smoothHeights
            ? (sx: number, sy: number) => {
                const x0 = Math.floor(sx), y0 = Math.floor(sy);
                const x1 = Math.min(x0 + 1, last), y1 = Math.min(y0 + 1, last);
                const tx = sx - x0, ty = sy - y0;
                const a = red[y0 * srcSize + x0];
                const b = red[y0 * srcSize + x1];
                const c = red[y1 * srcSize + x0];
                const d = red[y1 * srcSize + x1];
                return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
            }
            : (sx: number, sy: number) => red[Math.round(sy) * srcSize + Math.round(sx)];

        for (let ix = 0; ix < verticesPerSide; ix++) {
            for (let iz = 0; iz < verticesPerSide; iz++) {
                const col = (ix / denom) * last;   // note: ix → image column, iz → image row
                const row = (iz / denom) * last;
                heights[ix * verticesPerSide + iz] = sample(col, row) * heightMultiplier;
            }
        }

        const finalHeights = smoothHeights
            ? this.smoothHeightsLaplacian(heights, verticesPerSide, 4, 0.6)
            : heights;

        if (this._heights && this._heights.length === finalHeights.length) {
            this._heights.set(finalHeights);
            this.ApplyHeightsToGeometry();
        } else {
            this.heights = finalHeights;
        }

        return finalHeights;
    }

    public ApplyHeightsToGeometry(): void {
        const geometry = this.geometry;
        const heights = this.heights;

        const positions = geometry.attributes.get("position");
        if (!positions) return;

        const vertices = positions.array as Float32Array;
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

    public Destroy() {
        if ((this as any).assetPath) Assets.RemoveInstance((this as any).assetPath);

        for (const prop of this.paintPropData) prop.Destroy();
        this.geometry?.Destroy();
        this.material?.Destroy();
        this.materialIdMapTexture?.Destroy();
    }
}

export class Terrain extends Components.Mesh {
    public static type = "@trident/plugins/Terrain/Terrain";

    private _terrainData: TerrainData;
    @SerializeField(TerrainData)
    public get terrainData(): TerrainData { return this._terrainData; }


    public set terrainData(td: TerrainData) {
        if (this._terrainData === td) return;
        this._terrainData = td;
        if (!td) return;
        this.SetTerrainData(td).catch(err => console.error("[Terrain] SetTerrainData failed", err));
    }

    private async SetTerrainData(td: TerrainData) {
        await td.InitializePaintMaps();
        await Promise.all(td.paintPropData.map(prop => prop.RebuildProps(this.gameObject)));
        if (td.heights?.length) td.RebuildGeometry();
        EventSystemLocal.emit(TerrainEvents.Changed, this, this, td);
    }

    @NonSerialized public get geometry(): Geometry { return this._terrainData.geometry }
    @NonSerialized public get material(): TerrainMaterial { return this._terrainData.material }

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.terrainData = new TerrainData();
    }

    public WorldToGrid(worldPoint: Mathf.Vector3, gridDim: number): { fx: number; fz: number } {
        const size = this._terrainData.size;
        const localX = (worldPoint.x - this.transform.position.x + size.x * 0.5) / size.x;
        const localZ = (worldPoint.z - this.transform.position.z + size.z * 0.5) / size.z;
        const max = gridDim - 1;
        return {
            fx: Math.max(0, Math.min(1, localX)) * max,
            fz: Math.max(0, Math.min(1, localZ)) * max,
        };
    }

    public SampleHeight(worldPosition: Mathf.Vector3): number {
        const heights = this._terrainData.heights;
        if (!heights) return 0;

        const sizeH = Math.sqrt(heights.length);
        const { fx, fz } = this.WorldToGrid(worldPosition, sizeH);

        const x0 = Math.floor(fx), z0 = Math.floor(fz);
        const x1 = Math.min(x0 + 1, sizeH - 1);
        const z1 = Math.min(z0 + 1, sizeH - 1);
        const tx = fx - x0, tz = fz - z0;
        const idx = (x: number, z: number) => x * sizeH + z;

        const h0 = heights[idx(x0, z0)] * (1 - tx) + heights[idx(x1, z0)] * tx;
        const h1 = heights[idx(x0, z1)] * (1 - tx) + heights[idx(x1, z1)] * tx;
        const height = (h0 * (1 - tz) + h1 * tz) * this._terrainData.size.y - this._terrainData.size.y * 0.5 + this.transform.position.y;

        worldPosition.y = height;
        return height;
    }

    public SampleNormal(worldPosition: Mathf.Vector3): Mathf.Vector3 {
        const heights = this._terrainData.heights;
        if (!heights) return new Mathf.Vector3(0, 1, 0);

        const size = this._terrainData.size;
        const sizeH = Math.sqrt(heights.length);
        const { fx, fz } = this.WorldToGrid(worldPosition, sizeH);

        const x = Math.floor(fx), z = Math.floor(fz);
        const x0 = Math.max(0, x - 1), x1 = Math.min(sizeH - 1, x + 1);
        const z0 = Math.max(0, z - 1), z1 = Math.min(sizeH - 1, z + 1);
        const idx = (x: number, z: number) => x * sizeH + z;

        const dx = (heights[idx(x1, z)] - heights[idx(x0, z)]) * size.y;
        const dz = (heights[idx(x, z1)] - heights[idx(x, z0)]) * size.y;
        const scaleX = size.x / (sizeH - 1);
        const scaleZ = size.z / (sizeH - 1);

        return new Mathf.Vector3(-dx / scaleX, 2.0, -dz / scaleZ).normalize();
    }

    public Destroy(): void {
        this._terrainData?.Destroy();
        super.Destroy();
    }
}

Utils.TypeRegistry.set(TerrainData.type, TerrainData);