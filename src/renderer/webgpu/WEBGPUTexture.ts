import { Utils } from "../../Utils";
import { Texture, TextureFormat, TextureType } from "../Texture";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTexture implements Texture {
    public readonly id = Utils.UUID();
    public readonly width: number;
    public readonly height: number;

    private buffer: GPUTexture;

    private view: GPUTextureView;

    constructor(width: number, height: number, format?: TextureFormat, type?: TextureType) {
        let textureFormat: GPUTextureFormat = "rgba32uint";
        let textureUsage: GPUTextureUsageFlags = GPUTextureUsage.COPY_DST;
        let textureType: GPUTextureUsageFlags = 0;

        if(format === undefined) textureFormat = WEBGPURenderer.presentationFormat;
        else if (format === TextureFormat.RGBA32F) textureFormat = "rgba32float";
        else if (format === TextureFormat.RGBA32) textureFormat = "rgba32uint";

        if (!type) textureType = GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING;
        else if (type === TextureType.DEPTH) {
            textureFormat = "depth24plus";
            textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING;
        }
        else if (type === TextureType.RENDER_TARGET) {
            textureFormat = WEBGPURenderer.presentationFormat;
            textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
        }

        else throw Error(`Unknown texture format ${format}`);

        this.buffer = WEBGPURenderer.device.createTexture({
            size: [width, height],
            format: textureFormat,
            usage: textureUsage | textureType,
        });

        this.width = width;
        this.height = height;
    }

    public GetBuffer(): GPUTexture { return this.buffer }
    
    public GetView(): GPUTextureView {
        if (!this.view) this.view = this.buffer.createView();
        return this.view;
    }
}