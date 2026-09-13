import { Assets, AssetMeta } from "../Assets";
import { EventSystem } from "../Events";
import { Vector2 } from "../math/Vector2";
import { UUID } from "../utils";
import { Buffer, BufferType } from "./Buffer";
import { Renderer, RendererEvents } from "./Renderer";
import { RendererContext } from "./RendererContext";
import { WEBGPUBlit } from "./webgpu/utils/WEBGBPUBlit";
import { WEBGPUCubeMipsGenerator } from "./webgpu/utils/WEBGPUCubeMipsGenerator";
import { WEBGPUMipsGenerator } from "./webgpu/utils/WEBGPUMipsGenerator";

export interface ImageLoadOptions {
    name?: string;
    format?: TextureFormat;
    flipY?: boolean;
    generateMips?: boolean;
    resizeWidth?: number;
    resizeHeight?: number;
    storeSource?: boolean;
};

const DefaultOptions: ImageLoadOptions = {
    name: "Image",
    format: "rgba8unorm",
    flipY: false,
    generateMips: true,
    resizeWidth: undefined,
    resizeHeight: undefined,
    storeSource: false
};

export type TextureFormat =
    | "r8unorm"
    | "r16uint" | "r16sint" | "r16float"
    | "r32uint" | "r32sint" | "r32float"

    | "rg8unorm" | "rg8snorm" | "rg8uint" | "rg8sint"
    | "rg16uint" | "rg16sint" | "rg16float"
    | "rg32uint" | "rg32sint" | "rg32float"

    | "rgba8unorm" | "rgba8unorm-srgb" | "rgba8snorm" | "rgba8uint" | "rgba8sint"
    | "bgra8unorm" | "bgra8unorm-srgb"
    | "rgba16uint" | "rgba16sint" | "rgba16float"
    | "rgba32uint" | "rgba32sint" | "rgba32float"

    | "stencil8"
    | "depth16unorm"
    | "depth24plus" | "depth24plus-stencil8" | "depth24plus"

export enum TextureType {
    IMAGE,
    DEPTH,
    RENDER_TARGET,
    RENDER_TARGET_STORAGE
};

export type TextureDimension = | "1d" | "2d" | "2d-array" | "cube" | "cube-array" | "3d";

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

export class Texture {
    public static readonly type = "@trident/core/Texture";
    private byteSize = 0;
    private lastBandwidthFrame = -1;

    public readonly id = UUID();
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;
    public readonly format: TextureFormat;
    public readonly textureType: TextureType;
    public readonly dimension: TextureDimension;
    public mipLevels: number;

    public get name(): string { return this.buffer?.label ?? ""; }
    public set name(name: string) { if (this.buffer) this.buffer.label = name; }

    private buffer: GPUTexture;

    private viewCache: Map<string, GPUTextureView> = new Map();

    private currentLayer: number = 0;
    private currentMip: number = 0;
    private activeMipCount: number = 1;

    public blob: Blob;
    public assetPath: string;



    private static _WhiteTexture: Texture;
    private static _BlackTexture: Texture;
    private static _NormalTexture: Texture;
    private static _ARMTexture: Texture;
    private static _DepthTexture: Texture;


    private static CreateTextureWithData(data: BufferSource): Texture {
        const texture = Texture.Create(1, 1, 1, "bgra8unorm");
        texture.SetData(data, 4);
        return texture;
    }

    public static get WhiteTexture(): Texture {
        if (!this._WhiteTexture) Texture._WhiteTexture = Texture.CreateTextureWithData(new Uint8Array([255, 255, 255, 255]));
        return Texture._WhiteTexture;
    }

    public static get BlackTexture(): Texture {
        if (!this._BlackTexture) Texture._BlackTexture = Texture.CreateTextureWithData(new Uint8Array([0, 0, 0, 255]));
        return Texture._BlackTexture;
    }

    public static get NormalTexture(): Texture {
        if (!this._NormalTexture) Texture._NormalTexture = Texture.CreateTextureWithData(new Uint8Array([255, 128, 128, 255]));
        return Texture._NormalTexture;
    }

    public static get ARMTexture(): Texture {
        if (!this._ARMTexture) Texture._ARMTexture = Texture.CreateTextureWithData(new Uint8Array([0, 255, 255, 255]));
        return Texture._ARMTexture;
    }

    public static get DepthTexture(): Texture {
        if (!this._DepthTexture) {
            Texture._DepthTexture = TextureArray.Create(1, 1, 1, "depth24plus"); // Does this always work? For now only used as a blank in DeferredLightingPass
        }
        return Texture._DepthTexture;
    }

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
        this.buffer = Renderer.device.createTexture({
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
        this.textureType = type;
        this.dimension = dimension;
        this.mipLevels = mipLevels;

        this.SetActiveMipCount(mipLevels);

        this.byteSize = totalBytesForTexture(this.format, this.width, this.height, this.depth, this.mipLevels);
        Renderer.info.gpuTextureSizeTotal += this.byteSize; // account for format
        Renderer.info.gpuTextureCount++;
    }

    public GetBuffer(): GPUTexture { return this.buffer }

    public GetView(): GPUTextureView {
        const key = `${this.currentLayer}-${this.currentMip}-${this.activeMipCount}`;
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
            Renderer.info.textureViews++;
        }

        if (Renderer.info.frame !== this.lastBandwidthFrame) {
            Renderer.info.gpuBandwidthInBytes += this.byteSize;
            this.lastBandwidthFrame = Renderer.info.frame;
        }
        return view;
    }

    public GetBindingView(baseMipLevel: number, mipLevelCount: number): GPUTextureView {
        const arrayLayerCount = this.dimension !== "3d" ? this.depth : 1;
        const key = `binding-${this.dimension}-${baseMipLevel}-${mipLevelCount}-${arrayLayerCount}`;

        let view = this.viewCache.get(key);
        if (!view) {
            view = this.buffer.createView({
                dimension: this.dimension,
                arrayLayerCount,
                baseArrayLayer: 0,
                baseMipLevel,
                mipLevelCount,
            });

            this.viewCache.set(key, view);
            Renderer.info.textureViews++;
        }

        return view;
    }

    public GenerateMips() {
        const name = this.name;
        const mipLevels = WEBGPUMipsGenerator.numMipLevels(this.width, this.height, this.depth);

        const destination = this.mipLevels === mipLevels ? this : undefined;

        const oldBuffer = this.buffer;
        const oldByteSize = this.byteSize;

        if (this.dimension === "cube") this.buffer = WEBGPUCubeMipsGenerator.generateMips(this, destination);
        else this.buffer = WEBGPUMipsGenerator.generateMips(this, destination);

        const bufferWasReplaced = this.buffer !== oldBuffer;

        this.name = name;
        this.SetActiveMip(0);
        this.SetActiveMipCount(mipLevels);
        this.mipLevels = mipLevels;

        if (bufferWasReplaced) {
            Renderer.info.textureViews -= this.viewCache.size;
            this.viewCache.clear();

            oldBuffer.destroy();

            Renderer.info.gpuTextureSizeTotal -= oldByteSize;
            Renderer.info.gpuTextureCount--;
        }

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

    public Destroy() {
        if (!this.buffer) return;
        const buf = this.buffer;
        this.buffer = null as any;
        Renderer.info.gpuTextureSizeTotal -= this.byteSize;
        Renderer.info.gpuTextureCount--;
        Renderer.info.textureViews -= this.viewCache.size;
        this.viewCache.clear();
        EventSystem.once(RendererEvents.FrameEnded, () => buf.destroy());
    }

    public SetData(data: BufferSource, bytesPerRow: number, rowsPerImage?: number) {
        try {
            Renderer.device.queue.writeTexture(
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
            Renderer.device.queue.writeTexture(
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

    public async GetPixels(x?: number, y?: number, blockWidth?: number, blockHeight?: number, mipLevel?: number): Promise<Uint8Array | Uint16Array | Uint32Array | Float32Array | Float16Array> {
        x = x ?? 0;
        y = y ?? 0;
        blockWidth = blockWidth ?? this.width;
        blockHeight = blockHeight ?? this.height;
        mipLevel = mipLevel ?? 0;

        if (Renderer.HasActiveFrame()) {
            throw Error("Texture.GetPixels() cannot run inside an active render frame. Call it after EndRenderFrame().");
        }

        const bppByFormat: Partial<Record<TextureFormat, number>> = {
            r8unorm: 1,
            rg8unorm: 2,
            rgba8unorm: 4,
            bgra8unorm: 4,
            "bgra8unorm-srgb": 4,
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

        const buffer = new Buffer(size, BufferType.STORAGE);

        Renderer.BeginRenderFrame();
        RendererContext.CopyTextureToBufferV2(
            { texture: this, mipLevel, origin: [x, y, 0] },
            { buffer, offset: 0, bytesPerRow },
            [blockWidth, blockHeight, 1]
        );
        Renderer.EndRenderFrame();
        // await Renderer.OnFrameCompleted();

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
        if (this.format.endsWith("sint")) return new Uint32Array(packed.buffer);
        if (this.format.includes("16float")) return new Float16Array(packed.buffer);
        if (this.format.endsWith("float")) return new Float32Array(packed.buffer);

        return packed;
    }

    private static Chunk(type: string, data: Uint8Array): Uint8Array {
        const out = new Uint8Array(12 + data.length), v = new DataView(out.buffer);
        for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
        out.set(data, 8);
        v.setUint32(0, data.length);
        let c = -1;
        for (const b of out.subarray(4, 8 + data.length)) { c ^= b; for (let i = 8; i--;) c = c >>> 1 ^ (c & 1 ? 0xedb88320 : 0); }
        v.setUint32(8 + data.length, (c ^ -1) >>> 0);
        return out;
    }

    private static ToRGBA8(px: ArrayLike<number>, w: number, h: number, format: string, srgb = false): Uint8Array {
        const out = new Uint8Array(w * h * 4), isFloat = format.includes("float"), bgra = format.startsWith("bgra");
        const enc = (c: number) => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        for (let i = 0; i < w * h * 4; i++) {
            let c = isFloat ? Math.min(1, Math.max(0, px[i])) : px[i] / 255;
            if (srgb && isFloat && i % 4 !== 3) c = enc(c);
            out[i] = c * 255 + 0.5;
        }
        if (bgra) for (let i = 0; i < w * h; i++) { const t = out[i * 4]; out[i * 4] = out[i * 4 + 2]; out[i * 4 + 2] = t; }
        return out;
    }

    public async EncodeToPNG(srgb = false): Promise<Uint8Array> {
        const w = this.width;
        const h = this.height;
        const rgba = Texture.ToRGBA8(await this.GetPixels(), w, h, this.format, srgb);
        const raw = new Uint8Array(h * (w * 4 + 1));                       // leading filter byte 0 per row
        for (let y = 0; y < h; y++) raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
        const idat = new Uint8Array(await new Response(                     // deflate == zlib stream == IDAT
            new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate"))).arrayBuffer());
        const ihdr = new Uint8Array(13), v = new DataView(ihdr.buffer);
        v.setUint32(0, w); v.setUint32(4, h); ihdr.set([8, 6, 0, 0, 0], 8); // 8bpc, RGBA
        const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), Texture.Chunk("IHDR", ihdr), Texture.Chunk("IDAT", idat), Texture.Chunk("IEND", new Uint8Array(0))];
        const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
        parts.reduce((o, p) => (out.set(p, o), o + p.length), 0);
        return out;
    }

    public async EncodeToJPG(quality = 0.92): Promise<Uint8Array> {
        throw Error("Test this");
        const w = this.width;
        const h = this.height;
        const rgba = Texture.ToRGBA8(await this.GetPixels(), w, h, this.format);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), w, h), 0, 0);
        return new Promise(res => c.toBlob(async b => res(await b?.bytes()), "image/jpeg", quality));

        // return new Promise(res => c.toBlob(b => res(b!), "image/jpeg", quality));
    }

    // Format and types are very limited for now
    // https://github.com/gpuweb/gpuweb/issues/2322
    public static async LoadBlob(blob: Blob, options?: ImageLoadOptions): Promise<Texture> {
        const _options = Object.assign({}, DefaultOptions, options);
        const imageBitmap = await createImageBitmap(blob, {
            resizeWidth: _options.resizeWidth,
            resizeHeight: _options.resizeHeight,
            premultiplyAlpha: "none",
            colorSpaceConversion: "none",
        });

        const texture = new Texture(imageBitmap.width, imageBitmap.height, 1, _options.format || Renderer.SwapChainFormat, TextureType.RENDER_TARGET, "2d", 1);
        texture.name = _options.name || "Texture";

        try {
            Renderer.device.queue.copyExternalImageToTexture(
                { source: imageBitmap, flipY: _options.flipY },
                { texture: texture.GetBuffer() },
                [imageBitmap.width, imageBitmap.height]
            );
        } catch (error) {
            console.warn(error)
        }

        if (_options.storeSource) texture.blob = blob;
        if (_options.generateMips) texture.GenerateMips();

        return texture;
    }

    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.IMAGE, "2d", mipLevels);
    }

    public static async Load(url: string | URL, options?: ImageLoadOptions): Promise<Texture> {
        const response = await fetch(url);
        return Texture.LoadBlob(await response.blob(), options);
    }

    public static async Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale = new Vector2(1, 1)) {
        return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
    }

    public static async BlitDepth(source: DepthTexture, destination: DepthTexture, width: number, height: number, uv_scale = new Vector2(1, 1)) {
        return WEBGPUBlit.BlitDepth(source, destination, width, height, uv_scale);
    }

    public static async Deserialize(assetPath: string, data?: ImageLoadOptions, bytes?: ArrayBuffer): Promise<Texture> {
        const options = Object.assign({}, data, await AssetMeta.Load<ImageLoadOptions>(assetPath));
        const buffer = bytes ?? await Assets.Load(assetPath, "binary");
        const texture = await Texture.LoadBlob(new Blob([buffer]), options);
        texture.assetPath = assetPath;
        return texture;
    }
}

export class DepthTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = "depth24plus", mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.DEPTH, "2d", mipLevels);
    }
}

export class RenderTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.RENDER_TARGET, "2d", mipLevels);
    }
}

export class RenderTextureStorage extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "2d", mipLevels);
    }
}

export class RenderTextureStorage3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "3d", mipLevels);
    }
}

export class RenderTextureStorage2D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "2d", mipLevels);
    }
}

export class RenderTextureCube extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.RENDER_TARGET, "cube", mipLevels);
    }
}

export class TextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.IMAGE, "2d-array", mipLevels);
    }
}

export class Texture3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.IMAGE, "3d", mipLevels);
    }
}

export class CubeTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.IMAGE, "cube", mipLevels);
    }
}

export class DepthTextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = "depth24plus", mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.DEPTH, "2d-array", mipLevels);
    }
}

export class RenderTextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.RENDER_TARGET, "2d-array", mipLevels);
    }
}

export class RenderTexture3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return new Texture(width, height, depth, format, TextureType.RENDER_TARGET, "3d", mipLevels);
    }
}