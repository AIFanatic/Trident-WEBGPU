import { Renderer } from "./Renderer";
import { WEBGPUTexture } from "./webgpu/WEBGPUTexture";

export enum TextureFormat {
    RGBA32F,
    RGBA32,
};

export enum TextureType {
    IMAGE,
    DEPTH,
    RENDER_TARGET
};

export class Texture {
    public readonly id: string;
    public readonly width: number;
    public readonly height: number;

    public static Create(width: number, height: number, format?: TextureFormat): Texture {
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, TextureType.IMAGE);
        throw Error("Renderer type invalid");
    }
}

export class DepthTexture extends Texture {
    public static Create(width: number, height: number): Texture {
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, TextureFormat.RGBA32, TextureType.DEPTH);
        throw Error("Renderer type invalid");
    }
}

export class RenderTexture extends Texture {
    public static Create(width: number, height: number): Texture {
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, TextureFormat.RGBA32, TextureType.RENDER_TARGET);
        throw Error("Renderer type invalid");
    }
}