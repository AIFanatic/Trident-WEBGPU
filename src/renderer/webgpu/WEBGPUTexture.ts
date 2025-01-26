import { Utils } from "../../utils/Utils";
import { Renderer } from "../Renderer";
import { Texture, TextureDimension, TextureFormat, TextureType } from "../Texture";
import { WEBGPUMipsGenerator } from "./utils/WEBGPUMipsGenerator";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTexture implements Texture {
    public readonly id = Utils.UUID();
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;
    public readonly format: TextureFormat;
    public readonly type: TextureType;
    public readonly dimension: TextureDimension;
    public readonly mipLevels: number;
    
    private buffer: GPUTexture;
    
    private viewCache: Map<string, GPUTextureView> = new Map();
    
    private currentLayer: number = 0;
    private currentMip: number = 0;
    private activeMipCount: number = 1;

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
        
        this.buffer = WEBGPURenderer.device.createTexture({
            size: [width, height, depth],
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
    }

    public GetBuffer(): GPUTexture { return this.buffer }

    public GetView(): GPUTextureView {
        const key = `${this.currentLayer}-${this.currentMip}`;
        let view = this.viewCache.get(key);
        if (!view) {
            view = this.buffer.createView({
                dimension: this.dimension,
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
        this.buffer.destroy();
    }

    // Format and types are very limited for now
    // https://github.com/gpuweb/gpuweb/issues/2322
    public static FromImageBitmap(imageBitmap: ImageBitmap, width: number, height: number, format: TextureFormat, flipY: boolean): WEBGPUTexture {
        const texture = new WEBGPUTexture(width, height, 1, format, TextureType.RENDER_TARGET, "2d", 1);

        WEBGPURenderer.device.queue.copyExternalImageToTexture(
            { source: imageBitmap, flipY: flipY},
            { texture: texture.GetBuffer() },
            [imageBitmap.width, imageBitmap.height]
        );

        return texture;
    }
}