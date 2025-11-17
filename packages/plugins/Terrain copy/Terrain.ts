import {
    GameObject,
    Geometry,
    IndexAttribute,
    VertexAttribute,
    Components,
    Component,
    Renderer,
    GPU,
    Scene,
    Mathf,
    Utils
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
        this._material = new TerrainMaterial();
    }

    private GenerateGeometryFromHeights(size: number, heights: Float32Array, scale: number, imageSize: number): Geometry {
        if (heights.length !== size * size) throw Error(`Heights length (${heights.length} don't match terrain size of ${size}x${size}(${size * size})`);

        const vertices: number[] = [];
        const uvs: number[] = [];

        let m = 0;
        let i = 0;
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const height = heights[i];
                vertices.push(x / size, height, z / size);
                uvs.push(x / (size - 1), z / (size - 1));
                i++;
                m = Math.max(m, x / size, x / scale / imageSize)
            }
        }
        console.log(scale, m, Math.sqrt(heights.length))

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
        this.geometry = this.GenerateGeometryFromHeights(size, this.heights, heightmapScale, img.width);
        return heights;
    }
}