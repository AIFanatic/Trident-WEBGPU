import { Utils } from "../../utils/Utils";
import { TextureType } from "../Texture";
import { WEBGPUMipsGenerator } from "./utils/WEBGPUMipsGenerator";
import { WEBGPURenderer } from "./WEBGPURenderer";
export class WEBGPUTexture {
    id = Utils.UUID();
    width;
    height;
    depth;
    format;
    type;
    dimension;
    mipLevels;
    buffer;
    viewCache = new Map();
    currentLayer = 0;
    currentMip = 0;
    activeMipCount = 1;
    constructor(width, height, depth, format, type, dimension, mipLevels) {
        let textureUsage = GPUTextureUsage.COPY_DST;
        let textureType = GPUTextureUsage.TEXTURE_BINDING;
        if (!type)
            textureType = GPUTextureUsage.TEXTURE_BINDING;
        else if (type === TextureType.DEPTH)
            textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
        else if (type === TextureType.RENDER_TARGET)
            textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
        else if (type === TextureType.RENDER_TARGET_STORAGE)
            textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
        else
            throw Error(`Unknown texture format ${format}`);
        let dim = "2d";
        if (dimension === "1d")
            dim = "1d";
        else if (dimension === "3d")
            dim = "3d";
        const textureBindingViewDimension = dimension === "cube" ? "cube" : undefined;
        this.buffer = WEBGPURenderer.device.createTexture({
            size: [width, height, depth],
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
    }
    GetBuffer() { return this.buffer; }
    GetView() {
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
    GenerateMips() {
        this.buffer = WEBGPUMipsGenerator.generateMips(this);
        // Needed for mipmapping "mipLevelCount: uniform.activeMipCount"
        this.SetActiveMipCount(WEBGPUMipsGenerator.numMipLevels(this.width, this.height));
    }
    SetActiveLayer(layer) {
        if (layer > this.depth)
            throw Error("Active layer cannot be bigger than depth size");
        this.currentLayer = layer;
    }
    GetActiveLayer() {
        return this.currentLayer;
    }
    SetActiveMip(mip) {
        if (mip > this.mipLevels)
            throw Error("Active mip cannot be bigger than mip levels size");
        this.currentMip = mip;
    }
    GetActiveMip() {
        return this.currentMip;
    }
    SetActiveMipCount(mipCount) {
        return this.activeMipCount = mipCount;
    }
    GetActiveMipCount() {
        return this.activeMipCount;
    }
    Destroy() {
        this.buffer.destroy();
    }
    SetData(data) {
        // This probably aint perfect
        const extraBytes = this.format.includes("rgba32float") ? 4 : 1;
        console.log(extraBytes);
        try {
            WEBGPURenderer.device.queue.writeTexture({ texture: this.buffer }, data, { bytesPerRow: this.width * 4 * extraBytes, rowsPerImage: this.depth }, { width: this.width, height: this.height, depthOrArrayLayers: this.depth });
        }
        catch (error) {
            console.warn(error);
        }
    }
    // Format and types are very limited for now
    // https://github.com/gpuweb/gpuweb/issues/2322
    static FromImageBitmap(imageBitmap, width, height, format, flipY) {
        const texture = new WEBGPUTexture(width, height, 1, format, TextureType.RENDER_TARGET, "2d", 1);
        try {
            WEBGPURenderer.device.queue.copyExternalImageToTexture({ source: imageBitmap, flipY: flipY }, { texture: texture.GetBuffer() }, [imageBitmap.width, imageBitmap.height]);
        }
        catch (error) {
            console.warn(error);
        }
        return texture;
    }
}
