import { UUID } from "../../utils";
import { Renderer } from "../Renderer";
import { SerializedTexture, Texture, TextureDimension, TextureFormat, TextureType } from "../Texture";
import { WEBGPUMipsGenerator } from "./utils/WEBGPUMipsGenerator";
import { WEBGPUCubeMipsGenerator } from "./utils/WEBGPUCubeMipsGenerator";
import { WEBGPURenderer } from "./WEBGPURenderer";
import { Assets } from "../../Assets";

import { Buffer, BufferType } from "../Buffer";
import { RendererContext } from "../../renderer";
import { Color } from "../../math";

const TextureFormatToBits: Partial<Record<TextureFormat, number>> = {
    rgba8unorm: 32, "rgba8unorm-srgb": 32, bgra8unorm: 32, "bgra8unorm-srgb": 32,
    rgba16float: 64, rg16float: 32, r16float: 16,
    rgba32float: 128, rg32float: 64, r32float: 32,
    rg8unorm: 16, r8unorm: 8,
    depth24plus: 32, "depth24plus-stencil8": 32, depth16unorm: 16,
};
function bytesPerPixel(format: TextureFormat): number {
    return (TextureFormatToBits[format] ?? 32) / 8;
}
function totalBytesForTexture(format: TextureFormat, width: number, height: number, depth: number, mipLevels: number): number {
    let w = width, h = height, d = depth, totalPixels = 0;
    for (let i = 0; i < mipLevels; i++) {
        totalPixels += Math.max(1, w) * Math.max(1, h) * Math.max(1, d);
        w = w > 1 ? w >> 1 : 1;
        h = h > 1 ? h >> 1 : 1;
        d = d > 1 ? d >> 1 : d;
    }
    return totalPixels * bytesPerPixel(format);
}

export class WEBGPUTexture implements Texture {
    private byteSize = 0;
    private lastBandwidthFrame = -1;

    public readonly id = UUID();
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;
    public readonly format: TextureFormat;
    public readonly type: TextureType;
    public readonly dimension: TextureDimension;
    public mipLevels: number;

    public get name(): string { return this.buffer.label };
    public set name(name: string) { this.buffer.label = name };

    private buffer: GPUTexture;

    private viewCache: Map<string, GPUTextureView> = new Map();

    private currentLayer: number = 0;
    private currentMip: number = 0;
    private activeMipCount: number = 1;

    private imageBitmap: ImageBitmap; // Used for Serialized/Deserialize

    constructor(width: number, height: number, depth: number, format: TextureFormat, type: TextureType, dimension: TextureDimension, mipLevels: number) {
        let textureUsage: GPUTextureUsageFlags = GPUTextureUsage.COPY_DST;
        let textureType: GPUTextureUsageFlags = GPUTextureUsage.TEXTURE_BINDING;

        if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
        else if (type === TextureType.DEPTH) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
        else if (type === TextureType.RENDER_TARGET) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
        else if (type === TextureType.RENDER_TARGET_STORAGE) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;

        else throw Error(`Unknown texture format ${format}`);

        let dim: GPUTextureDimension = "2d";
        if (dimension === "1d") dim = "1d";
        else if (dimension === "3d") dim = "3d";

        const textureBindingViewDimension = dimension === "cube" ? "cube" : undefined;
        this.buffer = WEBGPURenderer.device.createTexture({
            size: { width: width, height: height, depthOrArrayLayers: depth },
            // @ts-ignore
            textureBindingViewDimension: textureBindingViewDimension,
            dimension: dim,
            format: format,
            usage: textureUsage | textureType,
            mipLevelCount: mipLevels,
        });

        this.width = width;
        this.height = height;
        this.depth = depth;
        this.format = format;
        this.type = type;
        this.dimension = dimension;
        this.mipLevels = mipLevels;

        this.SetActiveMipCount(mipLevels);

        this.byteSize = totalBytesForTexture(this.format, this.width, this.height, this.depth, this.mipLevels);
        Renderer.info.gpuTextureSizeTotal += this.byteSize; // account for format
        Renderer.info.gpuTextureCount++;
    }

    public GetBuffer(): GPUTexture { return this.buffer }

    public GetView(): GPUTextureView {
        const key = `${this.currentLayer}-${this.currentMip}`;
        let view = this.viewCache.get(key);
        if (!view) {
            const viewDimension =
                this.dimension === "cube" ||
                    this.dimension === "2d-array" ||
                    this.dimension === "cube-array"
                    ? "2d"
                    : this.dimension;

            view = this.buffer.createView({
                dimension: viewDimension,
                baseArrayLayer: this.currentLayer,
                arrayLayerCount: 1,
                baseMipLevel: this.currentMip,
                mipLevelCount: this.activeMipCount,
            });
            this.viewCache.set(key, view);
        }

        if (Renderer.info.frame !== this.lastBandwidthFrame) {
            Renderer.info.gpuBandwidthInBytes += this.byteSize;
            this.lastBandwidthFrame = Renderer.info.frame;
        }
        return view;
    }

    public GenerateMips() {
        if (this.dimension === "cube") {
            this.buffer = WEBGPUCubeMipsGenerator.generateMips(this);
        } else {
            this.buffer = WEBGPUMipsGenerator.generateMips(this);
        }
        // Needed for mipmapping "mipLevelCount: uniform.activeMipCount"
        const mipLevels = WEBGPUMipsGenerator.numMipLevels(this.width, this.height, this.depth);
        this.SetActiveMipCount(mipLevels);
        this.mipLevels = mipLevels;
        this.viewCache.clear();
        this.byteSize = totalBytesForTexture(this.format, this.width, this.height, this.depth, this.mipLevels);
    }

    public SetActiveLayer(layer: number) {
        if (layer > this.depth) throw Error("Active layer cannot be bigger than depth size");
        this.currentLayer = layer;
    }

    public GetActiveLayer(): number {
        return this.currentLayer;
    }

    public SetActiveMip(mip: number) {
        if (mip > this.mipLevels) throw Error("Active mip cannot be bigger than mip levels size");
        this.currentMip = mip;
    }

    public GetActiveMip(): number {
        return this.currentMip;
    }

    public SetActiveMipCount(mipCount: number) {
        return this.activeMipCount = mipCount;
    }

    public GetActiveMipCount(): number {
        return this.activeMipCount;
    }

    public SetName(name: string) {
        this.name = name;
        this.buffer.label = name;
    }
    public GetName(): string {
        return this.buffer.label;
    }

    public Destroy() {
        Renderer.info.gpuTextureSizeTotal -= this.byteSize;
        Renderer.info.gpuTextureCount--;
        this.buffer.destroy();
    }

    public SetData(data: BufferSource, bytesPerRow: number, rowsPerImage?: number) {
        try {
            WEBGPURenderer.device.queue.writeTexture(
                { texture: this.buffer },
                data,
                { bytesPerRow: bytesPerRow, rowsPerImage: rowsPerImage },
                { width: this.width, height: this.height, depthOrArrayLayers: this.depth }
            );
        } catch (error) {
            console.warn(error)
        }
    }

    public SetSubData(data: BufferSource, width: number, height: number, mip: number, offsetX: number = 0, offsetY: number = 0, layer: number = 0) {
        try {
            const bpp = bytesPerPixel(this.format);
            const bytesPerRow = width * bpp;
            WEBGPURenderer.device.queue.writeTexture(
                {
                    texture: this.buffer,
                    mipLevel: mip,
                    origin: { x: offsetX, y: offsetY, z: layer }
                },
                data,
                { bytesPerRow, rowsPerImage: height },
                { width, height, depthOrArrayLayers: 1 }
            );
        } catch (error) {
            console.warn(error)
        }
    }

    public async GetPixels(x: number, y: number, blockWidth: number, blockHeight: number, mipLevel: number): Promise<Uint8Array | Uint16Array | Uint32Array | Float32Array> {
        if (Renderer.HasActiveFrame()) {
            throw Error("Texture.GetPixels() cannot run inside an active render frame. Call it after EndRenderFrame().");
        }

        const bppByFormat: Partial<Record<TextureFormat, number>> = {
            r8unorm: 1,
            rg8unorm: 2,
            rgba8unorm: 4,
            r16float: 2,
            rg16float: 4,
            rgba16float: 8,
            r32uint: 4,
            rg32uint: 8,
            rgba32uint: 16,
            r32float: 4,
            rg32float: 8,
            rgba32float: 16,
        };

        const bpp = bppByFormat[this.format];
        if (!bpp) throw Error(`GetPixels unsupported format: ${this.format}`);

        const bytesPerRow = Math.ceil((blockWidth * bpp) / 256) * 256;
        const size = bytesPerRow * blockHeight;

        const buffer = Buffer.Create(size, BufferType.STORAGE);

        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToBufferV2(
            { texture: this, mipLevel, origin: [x, y, 0] },
            { buffer, offset: 0, bytesPerRow },
            [blockWidth, blockHeight, 1]
        );
        Renderer.EndRenderFrame();
        await Renderer.OnFrameCompleted();

        const data = await buffer.GetData();
        const bytes = new Uint8Array(data as ArrayBuffer);

        // Strip row padding and return tightly packed pixels
        const packed = new Uint8Array(blockWidth * blockHeight * bpp);
        for (let row = 0; row < blockHeight; row++) {
            const src = row * bytesPerRow;
            const dst = row * blockWidth * bpp;
            packed.set(bytes.subarray(src, src + blockWidth * bpp), dst);
        }

        buffer.Destroy();

        if (this.format.endsWith("uint")) return new Uint32Array(packed.buffer);
        if (this.format.endsWith("sint")) return new Uint32Array(packed.buffer); // swap to Int32Array if you need signed
        if (this.format.endsWith("float")) return new Float32Array(packed.buffer); // note: rgba16float is NOT float32
        if (this.format.includes("16")) return new Uint16Array(packed.buffer);
        return packed;
    }

    // Format and types are very limited for now
    // https://github.com/gpuweb/gpuweb/issues/2322
    public static FromImageBitmap(imageBitmap: ImageBitmap, width: number, height: number, format: TextureFormat, flipY: boolean, generateMips: boolean): WEBGPUTexture {
        const texture = new WEBGPUTexture(width, height, 1, format, TextureType.RENDER_TARGET, "2d", 1);

        try {
            WEBGPURenderer.device.queue.copyExternalImageToTexture(
                { source: imageBitmap, flipY: flipY },
                { texture: texture.GetBuffer() },
                [imageBitmap.width, imageBitmap.height]
            );
        } catch (error) {
            console.warn(error)
        }

        texture.imageBitmap = imageBitmap;

        if (generateMips) texture.GenerateMips();

        return texture;
    }

    public Serialize(metadata: any = {}): SerializedTexture {
        let cachedTexture = WEBGPUTexture.SerializedTextureCache.get(this.id);
        if (cachedTexture) return cachedTexture.serialized;

        let data: { type: "AssetPath" | "ImageBitmap" | "Base64", data: any };

        if (this.assetPath) {
            data = { type: "AssetPath", data: this.assetPath };
        }
        else if (metadata["base64Textures"] === true) {
            const canvas = new OffscreenCanvas(this.width, this.height);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(this.imageBitmap, 0, 0);
            data = { type: "Base64", data: new TextDecoder('latin1').decode(ctx.getImageData(0, 0, this.width, this.height).data) }
        }
        else if (this.imageBitmap) {
            data = { type: "ImageBitmap", data: this.imageBitmap }
        }

        cachedTexture = {
            serialized: {
                name: this.name,
                id: this.id,
                width: this.width,
                height: this.height,
                depth: this.depth,
                format: this.format,
                type: this.type,
                dimension: this.dimension,
                mipLevels: this.mipLevels,
                data: data
            },
            texture: this
        };

        WEBGPUTexture.SerializedTextureCache.set(this.id, cachedTexture);

        return cachedTexture.serialized;
    }

    public static async Deserialize(data: SerializedTexture): Promise<WEBGPUTexture> {
        let cachedTexture = WEBGPUTexture.SerializedTextureCache.get(data.id);
        if (cachedTexture) return cachedTexture.texture;

        const texture = new WEBGPUTexture(data.width, data.height, data.depth, data.format, data.type, data.dimension, data.mipLevels);
        texture.name = data.name;
        let iamgeBitmap: ImageBitmap = undefined;
        if (data.data.type === "ImageBitmap") {
            iamgeBitmap = data.data.data;
        }
        else if (data.data.type === "Base64") {
            const uint8 = new TextEncoder().encode(data.data.data);
            const blob = new Blob([uint8], { type: "image/png" });
            iamgeBitmap = await createImageBitmap(blob);
        }
        else if (data.data.type === "AssetPath") {
            const bytes = await Assets.Load(data.data.data, "binary");
            const blob = new Blob([bytes]);
            iamgeBitmap = await createImageBitmap(blob);
        }
        try {
            WEBGPURenderer.device.queue.copyExternalImageToTexture(
                { source: iamgeBitmap, flipY: false },
                { texture: texture.GetBuffer() },
                [data.width, data.height]
            );
        } catch (error) {
            console.warn(error)
        }

        if (data.mipLevels > 1) texture.GenerateMips();

        cachedTexture = { serialized: data, texture: texture };
        WEBGPUTexture.SerializedTextureCache.set(data.id, cachedTexture); // What id to use? New or data one? Should ids be set, probably a unique path or crc should be used instead
        return texture;
    }

    private static SerializedTextureCache: Map<string, { serialized: SerializedTexture, texture: WEBGPUTexture }> = new Map();
}
