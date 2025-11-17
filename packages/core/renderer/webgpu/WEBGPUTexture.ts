import { UUID } from "../../utils";
import { Renderer } from "../Renderer";
import { SerializedTexture, Texture, TextureDimension, TextureFormat, TextureType } from "../Texture";
import { WEBGPUMipsGenerator } from "./utils/WEBGPUMipsGenerator";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTexture implements Texture {
    public readonly id = UUID();
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;
    public readonly format: TextureFormat;
    public readonly type: TextureType;
    public readonly dimension: TextureDimension;
    public mipLevels: number;
    public name: string;

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

        const textureBindingViewDimension = dimension === "cube" ? "cube": undefined;
        this.buffer = WEBGPURenderer.device.createTexture({
            size: {width: width, height: height, depthOrArrayLayers: depth},
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

        Renderer.info.gpuTextureSizeTotal += width * height * depth * 4; // account for format
        Renderer.info.gpuTextureCount++;
    }

    public GetBuffer(): GPUTexture { return this.buffer }

    public GetView(): GPUTextureView {
        const key = `${this.currentLayer}-${this.currentMip}`;
        let view = this.viewCache.get(key);
        if (!view) {
            const viewDimension = this.dimension === "cube" ? "2d" : this.dimension;
            view = this.buffer.createView({
                dimension: viewDimension,
                baseArrayLayer: this.currentLayer,
                arrayLayerCount: 1,
                baseMipLevel: this.currentMip,
                mipLevelCount: this.activeMipCount
            });
            this.viewCache.set(key, view);
        }

        return view;
    }

    public GenerateMips() {
        this.buffer = WEBGPUMipsGenerator.generateMips(this);
        // Needed for mipmapping "mipLevelCount: uniform.activeMipCount"
        const mipLevels = WEBGPUMipsGenerator.numMipLevels(this.width, this.height, this.depth);
        this.SetActiveMipCount(mipLevels);
        this.mipLevels = mipLevels;
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
        Renderer.info.gpuTextureSizeTotal -= this.buffer.width * this.buffer.height * this.buffer.depthOrArrayLayers * 4; // account for format
        Renderer.info.gpuTextureCount--;
        this.buffer.destroy();
    }

    public SetData(data: BufferSource, bytesPerRow: number, rowsPerImage?: number) {
        try {
            WEBGPURenderer.device.queue.writeTexture(
                {texture: this.buffer},
                data,
                {bytesPerRow: bytesPerRow, rowsPerImage: rowsPerImage},
                {width: this.width, height: this.height, depthOrArrayLayers: this.depth}
            );
        } catch (error) {
            console.warn(error)
        }
    }

    // Format and types are very limited for now
    // https://github.com/gpuweb/gpuweb/issues/2322
    public static FromImageBitmap(imageBitmap: ImageBitmap, width: number, height: number, format: TextureFormat): WEBGPUTexture {
        const texture = new WEBGPUTexture(width, height, 1, format, TextureType.RENDER_TARGET, "2d", 1);

        try {
            WEBGPURenderer.device.queue.copyExternalImageToTexture(
                { source: imageBitmap, flipY: false },
                { texture: texture.GetBuffer() },
                [imageBitmap.width, imageBitmap.height]
            );
        } catch (error) {
            console.warn(error)
        }

        texture.imageBitmap = imageBitmap;
        return texture;
    }

    public Serialize(metadata: any = {}): SerializedTexture {
        let cachedTexture = WEBGPUTexture.SerializedTextureCache.get(this.id);
        if (!cachedTexture) {
            let data: ImageBitmap | string = this.imageBitmap;
            if (metadata["base64Textures"] === true) {
                const canvas = new OffscreenCanvas(this.width, this.height);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(this.imageBitmap, 0, 0);
                data = new TextDecoder('latin1').decode(ctx.getImageData(0, 0, this.width, this.height).data);
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
        }

        return cachedTexture.serialized;
    }

    // TODO: Textures should deserialize to a global entry similar to gltf, otherwise many MB would be duplicated with each identical copy
    public static Deserialize(data: SerializedTexture): WEBGPUTexture {
        let cachedTexture = WEBGPUTexture.SerializedTextureCache.get(data.id);
        if (cachedTexture) return cachedTexture.texture;
        
        const texture = new WEBGPUTexture(data.width, data.height, data.depth, data.format, data.type, data.dimension, data.mipLevels);
        texture.name = data.name;
        let imageData = undefined;
        if (data.data instanceof ImageBitmap) imageData = data.data;
        else {
            const uint8 = new TextEncoder().encode(data.data);
            const blob = new Blob([uint8], { type: "image/png" });
            createImageBitmap(blob).then(imageBitmap => {
                throw Error("Not implemented")
            })
            throw Error("Not implemented")
        }
        try {
            WEBGPURenderer.device.queue.copyExternalImageToTexture(
                { source: imageData, flipY: false },
                { texture: texture.GetBuffer() },
                [data.width, data.height]
            );
        } catch (error) {
            console.warn(error)
        }

        cachedTexture = {serialized: data, texture: texture};
        WEBGPUTexture.SerializedTextureCache.set(data.id, cachedTexture); // What id to use? New or data one? Should ids be set, probably a unique path or crc should be used instead
        return texture;
    }

    private static SerializedTextureCache: Map<string, {serialized: SerializedTexture, texture: WEBGPUTexture}> = new Map();
}