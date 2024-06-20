import { Utils } from "../../Utils";
import { Renderer } from "../Renderer";
import { Texture, TextureDimension, TextureFormat, TextureType } from "../Texture";
import { WEBGPUMipsGenerator } from "./WEBGPUMipsGenerator";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTexture implements Texture {
    public readonly id = Utils.UUID();
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;
    public readonly type: TextureType;
    public readonly dimension: TextureDimension;

    private buffer: GPUTexture;

    private view: GPUTextureView[] = [];

    private currentLayer: number = 0;

    constructor(width: number, height: number, depth: number, format: TextureFormat, type: TextureType, dimension: TextureDimension) {
        this.type = type;
        this.dimension = dimension;
        let textureUsage: GPUTextureUsageFlags = GPUTextureUsage.COPY_DST;
        let textureType: GPUTextureUsageFlags = GPUTextureUsage.TEXTURE_BINDING;

        if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
        else if (type === TextureType.DEPTH) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
        else if (type === TextureType.RENDER_TARGET) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;

        else throw Error(`Unknown texture format ${format}`);

        this.buffer = WEBGPURenderer.device.createTexture({
            size: [width, height, depth],
            format: format,
            usage: textureUsage | textureType,
        });

        this.width = width;
        this.height = height;
        this.depth = depth;
    }

    public GetBuffer(): GPUTexture { return this.buffer }

    public GetView(): GPUTextureView {
        if (!this.view[this.currentLayer]) {
            this.view[this.currentLayer] = this.buffer.createView({
                dimension: this.dimension,
                baseArrayLayer: this.currentLayer,
                arrayLayerCount: 1
            });
        }

        return this.view[this.currentLayer];
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

    // Format and types are very limited for now
    // https://github.com/gpuweb/gpuweb/issues/2322
    public static FromImageBitmap(imageBitmap: ImageBitmap, width: number, height: number): WEBGPUTexture {
        const texture = new WEBGPUTexture(width, height, 1, Renderer.SwapChainFormat, TextureType.RENDER_TARGET, "2d");

        WEBGPURenderer.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: texture.GetBuffer() },
            [imageBitmap.width, imageBitmap.height]
        );

        return texture;
    }
}