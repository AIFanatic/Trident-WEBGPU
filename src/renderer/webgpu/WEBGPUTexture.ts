import { Utils } from "../../Utils";
import { Renderer } from "../Renderer";
import { Texture, TextureFormat, TextureType } from "../Texture";
import { WEBGPUMipsGenerator } from "./WEBGPUMipsGenerator";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTexture implements Texture {
    public readonly id = Utils.UUID();
    public readonly width: number;
    public readonly height: number;
    public readonly type: TextureType;

    private buffer: GPUTexture;

    private view: GPUTextureView;

    constructor(width: number, height: number, format: TextureFormat, type: TextureType) {
        this.type = type;
        let textureUsage: GPUTextureUsageFlags = GPUTextureUsage.COPY_DST;
        let textureType: GPUTextureUsageFlags = GPUTextureUsage.TEXTURE_BINDING;

        if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
        else if (type === TextureType.DEPTH) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
        else if (type === TextureType.RENDER_TARGET) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;

        else throw Error(`Unknown texture format ${format}`);

        this.buffer = WEBGPURenderer.device.createTexture({
            size: [width, height],
            format: format,
            usage: textureUsage | textureType,
            label: "My texture"
        });

        this.width = width;
        this.height = height;
    }

    public GetBuffer(): GPUTexture { return this.buffer }

    public GetView(): GPUTextureView {
        if (!this.view) this.view = this.buffer.createView();
        return this.view;
    }

    public GenerateMips() {
        this.buffer = WEBGPUMipsGenerator.generateMips(this);
    }

    // Format and types are very limited for now
    // https://github.com/gpuweb/gpuweb/issues/2322
    public static FromImageBitmap(imageBitmap: ImageBitmap, width: number, height: number): WEBGPUTexture {
        const texture = new WEBGPUTexture(width, height, Renderer.SwapChainFormat, TextureType.RENDER_TARGET);

        WEBGPURenderer.device.queue.copyExternalImageToTexture(
            { source: imageBitmap },
            { texture: texture.GetBuffer() },
            [imageBitmap.width, imageBitmap.height]
        );

        return texture;
    }
}