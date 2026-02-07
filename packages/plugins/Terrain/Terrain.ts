import {
    GameObject,
    Geometry,
    IndexAttribute,
    VertexAttribute,
    Components,
    Mathf,
    Scene,
    PBRMaterial,
} from "@trident/core";
import { TerrainMaterial } from "./TerrainMaterial";

export class Terrain extends Components.Mesh {

    public get width(): number { return this.transform.scale.x }
    public get length(): number { return this.transform.scale.z }
    public get height(): number { return this.transform.scale.y }

    public set width(width: number) { this.transform.scale.x = width }
    public set length(length: number) { this.transform.scale.z = length }
    public set height(height: number) { this.transform.scale.y = height }

    public heights: Float32Array;

    public get material(): TerrainMaterial {
        return this._material as TerrainMaterial;
    }

    constructor(gameObject: GameObject) {
        super(gameObject);
        this._material = new TerrainMaterial(this.gameObject);
    }

    private GenerateGeometryFromHeights(size: number, heights: Float32Array): Geometry {
        if (heights.length !== size * size) throw Error(`Heights length (${heights.length} don't match terrain size of ${size}x${size}(${size * size})`);

        const vertices: number[] = [];
        const uvs: number[] = [];
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

        const indices: number[] = [];
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

    public async HeightmapFromPNG(url: string, smoothHeights: boolean = true, heightmapScale: number = 1): Promise<Float32Array> {
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
        ctx.translate(size / 2, size / 2); // move origin to center
        ctx.rotate((-90 * Math.PI) / 180); // apply rotation
        ctx.scale(-1, 1);
        ctx.drawImage(img, -size / 2, -size / 2, size, size); // draw centered
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

    public SampleHeight(worldPosition: Mathf.Vector3): number {
        if (!this.heights || !this.geometry) return 0;

        const size = Math.sqrt(this.heights.length); // heightmap dimension N x N

        // Convert world position to local [0,1] coordinate on heightmap
        const localX = (worldPosition.x - this.transform.position.x) / this.width;
        const localZ = (worldPosition.z - this.transform.position.z) / this.length;

        // Clamp to valid region
        const fx = Math.max(0, Math.min(1, localX)) * (size - 1);
        const fz = Math.max(0, Math.min(1, localZ)) * (size - 1);

        const x0 = Math.floor(fx);
        const z0 = Math.floor(fz);
        const x1 = Math.min(x0 + 1, size - 1);
        const z1 = Math.min(z0 + 1, size - 1);

        const tx = fx - x0;
        const tz = fz - z0;

        const idx = (x: number, z: number) => x * size + z;

        // Sample four surrounding height values (normalized 0–1)
        const h00 = this.heights[idx(x0, z0)];
        const h10 = this.heights[idx(x1, z0)];
        const h01 = this.heights[idx(x0, z1)];
        const h11 = this.heights[idx(x1, z1)];

        // Bilinear interpolation
        const h0 = h00 * (1 - tx) + h10 * tx;
        const h1 = h01 * (1 - tx) + h11 * tx;
        const height = h0 * (1 - tz) + h1 * tz;

        worldPosition.y = height * this.height;

        return height * this.height;
    }

    public SampleNormal(worldPosition: Mathf.Vector3): Mathf.Vector3 {
        if (!this.heights) return new Mathf.Vector3(0, 1, 0);

        const size = Math.sqrt(this.heights.length);

        // Convert world position → heightmap space (once)
        const localX = (worldPosition.x - this.transform.position.x) / this.width;
        const localZ = (worldPosition.z - this.transform.position.z) / this.length;

        const fx = Math.max(0, Math.min(1, localX)) * (size - 1);
        const fz = Math.max(0, Math.min(1, localZ)) * (size - 1);

        const x = Math.floor(fx);
        const z = Math.floor(fz);

        const idx = (x: number, z: number) => x * size + z;

        // Clamp neighbors
        const x0 = Math.max(0, x - 1);
        const x1 = Math.min(size - 1, x + 1);
        const z0 = Math.max(0, z - 1);
        const z1 = Math.min(size - 1, z + 1);

        // Sample heights directly (normalized 0–1)
        const hL = this.heights[idx(x0, z)];
        const hR = this.heights[idx(x1, z)];
        const hD = this.heights[idx(x, z0)];
        const hU = this.heights[idx(x, z1)];

        // World-space scale per heightmap cell
        const scaleX = this.width / (size - 1);
        const scaleZ = this.length / (size - 1);

        // Height differences in world units
        const dx = (hR - hL) * this.height;
        const dz = (hU - hD) * this.height;

        // Gradient → normal
        const normal = new Mathf.Vector3(
            -dx / scaleX,
            2.0,
            -dz / scaleZ
        );

        return normal.normalize();
    }
}