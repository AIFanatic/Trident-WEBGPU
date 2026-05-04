import { GameObject, Geometry, IndexAttribute, VertexAttribute, Components, Mathf, SerializeField, NonSerialized, Utils, GPU, Prefab, Runtime } from "@trident/core";
import { TerrainMaterial } from "./TerrainMaterial";
import { LODGroup } from "../LOD/LODGroup";
import { InstancedLODGroup } from "../LOD/InstancedLODGroup";

export class PaintPropData {
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
        if (!lodGroup) return;
        if (lodGroup.lods.length === 0) return;

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
        this.matrices.push(...matrix.elements);
        this.instancedLODGroup.SetMatrixAt(this.instancedLODGroup.instanceCount, matrix);
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
        this._heights = heights;
        this.RebuildGeometry();
    };

    @SerializeField public paintMapResolution: number = 256;

    private _materialIdMapData: Uint8Array;
    @SerializeField(Uint8Array) public get materialIdMapData(): Uint8Array { return this._materialIdMapData; }
    public set materialIdMapData(data: Uint8Array) { this._materialIdMapData = data; }

    private _blendWeightMapData: Uint8Array;
    @SerializeField(Uint8Array) public get blendWeightMapData(): Uint8Array { return this._blendWeightMapData; }
    public set blendWeightMapData(data: Uint8Array) { this._blendWeightMapData = data; }

    @NonSerialized public materialIdMapTexture: GPU.Texture;
    @NonSerialized public blendWeightMapTexture: GPU.Texture;

    public resolution = 64;

    @SerializeField public terrainGameObject: GameObject;

    constructor(gameObject: GameObject) {
        this.terrainGameObject = gameObject;
        this.size = new Mathf.Vector3(1000, 600, 1000);
        this.material = new TerrainMaterial();

        const verticesPerSide = this.resolution + 1;
        this.heights = new Float32Array(verticesPerSide * verticesPerSide);
        this.geometry = TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);

        this.InitializePaintMapData();
    }

    private InitializePaintMapData(): void {
        const pixelCount = this.paintMapResolution * this.paintMapResolution;
        if (!this._materialIdMapData || this._materialIdMapData.length !== pixelCount * 4) {
            this._materialIdMapData = new Uint8Array(pixelCount * 4);
            this._blendWeightMapData = new Uint8Array(pixelCount * 4);
            for (let i = 0; i < pixelCount; i++) {
                this._blendWeightMapData[i * 4] = 255;
            }
        }
    }

    public InitializePaintMaps(): void {
        this.InitializePaintMapData();
        this.materialIdMapTexture = GPU.Texture.Create(this.paintMapResolution, this.paintMapResolution, 1, "rgba8unorm");
        this.blendWeightMapTexture = GPU.TextureArray.Create(this.paintMapResolution, this.paintMapResolution, 1, "rgba8unorm");
        this.UploadPaintMaps();
        this.BindPaintMaps();
    }

    public UploadPaintMaps(): void {
        const bytesPerRow = this.paintMapResolution * 4;
        this.materialIdMapTexture.SetData(this._materialIdMapData, bytesPerRow);
        this.blendWeightMapTexture.SetData(this._blendWeightMapData, bytesPerRow, this.paintMapResolution);
    }

    public async BindPaintMaps(): Promise<void> {
        if (this.material.pendingShaderCreation) {
            await this.material.pendingShaderCreation;
        }
        this.material.materialIdMap = this.materialIdMapTexture;
        this.material.shader.SetTexture("blendWeightMaps", this.blendWeightMapTexture);
    }

    public async AddProp(prefab: Prefab): Promise<number> {
        const existingIndex = this.paintPropData.findIndex(value => value.prop.assetPath === prefab.assetPath);
        if (existingIndex !== -1) return existingIndex;

        const newProp = new PaintPropData();
        newProp.prop = prefab;
        await newProp.RebuildProps(this.terrainGameObject);
        this.paintPropData.push(newProp);

        return this.paintPropData.length - 1;
    }

    public AddPropMatrix(propIndex: number, matrix: Mathf.Matrix4) {
        if (propIndex >= this.paintPropData.length) throw Error("Prop doesnt exist");
        this.paintPropData[propIndex].AddPropMatrix(matrix);
    }

    public async OnDeserialized(): Promise<void> {
        this.RebuildGeometry();
        this.InitializePaintMaps();
        for (const prop of this.paintPropData) await prop.RebuildProps(this.terrainGameObject);
    }

    public RebuildGeometry(): void {
        const verticesPerSide = this.resolution + 1;
        this.geometry = TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);
        this.geometry.name = this.assetPath;
    }

    public static GenerateGeometryFromHeights(verticesPerSide: number, heights: Float32Array, size: Mathf.Vector3): Geometry {
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
                const height = heights[i] * size.y;
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

    public async HeightmapFromPNG(url: string, smoothHeights: boolean = true): Promise<Float32Array> {
        const img = new Image();
        img.src = url;

        await img.decode();

        if (img.width !== img.height) throw Error(`Only square images are supported, image has width=${img.width} and height=${img.height}`);

        const verticesPerSide = this.resolution + 1;

        const canvas = document.createElement("canvas");
        canvas.width = verticesPerSide;
        canvas.height = verticesPerSide;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

        ctx.imageSmoothingEnabled = smoothHeights;
        ctx.save();
        ctx.translate(verticesPerSide / 2, verticesPerSide / 2); // move origin to center
        ctx.rotate((-90 * Math.PI) / 180); // apply rotation
        ctx.scale(-1, 1);
        ctx.drawImage(img, -verticesPerSide / 2, -verticesPerSide / 2, verticesPerSide, verticesPerSide); // draw centered
        ctx.restore();

        const imageData = ctx.getImageData(0, 0, verticesPerSide, verticesPerSide);

        let heights = new Float32Array(imageData.data.length / 4);
        for (let i = 0, j = 0; i < imageData.data.length; i += 4, j++) {
            heights[j] = imageData.data[i] / 255;
        }

        this.heights = smoothHeights ? this.smoothHeightsLaplacian(heights, verticesPerSide, 4, 0.6) : heights;
        this.geometry = TerrainData.GenerateGeometryFromHeights(verticesPerSide, this.heights, this.size);
        return heights;
    }

    public ApplyHeightsToGeometry(): void {
        const geometry = this.GetGeometry();
        const heights = this.GetHeights();

        const positions = geometry.attributes.get("position");
        if (!positions) return;

        const vertices = positions.array as Float32Array;
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

    public GetHeights(): Float32Array { return this.heights }
    public GetGeometry(): Geometry { return this.geometry }
    public GetMaterial(): TerrainMaterial { return this.material }
}

export class Terrain extends Components.Mesh {
    public static type = "@trident/plugins/Terrain/Terrain";

    @SerializeField(TerrainData) public terrainData: TerrainData;

    @NonSerialized public get geometry(): Geometry { return this.terrainData.geometry }
    @NonSerialized public get material(): TerrainMaterial { return this.terrainData.material }

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.terrainData = new TerrainData(gameObject);
    }

    public Start(): void {
        super.Start();
    }

    public WorldToGrid(worldPoint: Mathf.Vector3, gridDim: number): { fx: number; fz: number } {
        const size = this.terrainData.size;
        const localX = (worldPoint.x - this.transform.position.x + size.x * 0.5) / size.x;
        const localZ = (worldPoint.z - this.transform.position.z + size.z * 0.5) / size.z;
        const max = gridDim - 1;
        return {
            fx: Math.max(0, Math.min(1, localX)) * max,
            fz: Math.max(0, Math.min(1, localZ)) * max,
        };
    }

    public SampleHeight(worldPosition: Mathf.Vector3): number {
        const heights = this.terrainData.GetHeights();
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
        const height = (h0 * (1 - tz) + h1 * tz) * this.terrainData.size.y;

        worldPosition.y = height;
        return height;
    }

    public SampleNormal(worldPosition: Mathf.Vector3): Mathf.Vector3 {
        const heights = this.terrainData.GetHeights();
        if (!heights) return new Mathf.Vector3(0, 1, 0);

        const size = this.terrainData.size;
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
}

Utils.TypeRegistry.set(TerrainData.type, TerrainData);