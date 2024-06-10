import { Renderer } from "./Renderer";
import { WEBGPUTexture } from "./webgpu/WEBGPUTexture";

export type TextureFormat =
    | "r16uint"
    | "r16sint"
    | "r16float"
    | "rg8unorm"
    | "rg8snorm"
    | "rg8uint"
    | "rg8sint"
    | "r32uint"
    | "r32sint"
    | "r32float"
    | "rg16uint"
    | "rg16sint"
    | "rg16float"
    | "rgba8unorm"
    | "rgba8unorm-srgb"
    | "rgba8snorm"
    | "rgba8uint"
    | "rgba8sint"
    | "bgra8unorm"
    | "bgra8unorm-srgb"
    | "rg32uint"
    | "rg32sint"
    | "rg32float"
    | "rgba16uint"
    | "rgba16sint"
    | "rgba16float"
    | "rgba32uint"
    | "rgba32sint"
    | "rgba32float"
    | "stencil8"
    | "depth16unorm"
    | "depth24plus"
    | "depth24plus-stencil8"
    | "depth32float"
    | "depth32float-stencil8"

export enum TextureType {
    IMAGE,
    DEPTH,
    RENDER_TARGET
};

export class Texture {
    public readonly id: string;
    public readonly width: number;
    public readonly height: number;

    public static Create(width: number, height: number, format: TextureFormat = "rgba32uint"): Texture {
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, TextureType.IMAGE);
        throw Error("Renderer type invalid");
    }

    public static async Load(url: string): Promise<Texture> {
        const response = await fetch(url);
        const imageBitmap = await createImageBitmap(await response.blob());

        if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height);
        throw Error("Renderer type invalid");
    }
}

export class DepthTexture extends Texture {
    public static Create(width: number, height: number, format: TextureFormat = "depth24plus"): Texture {
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, TextureType.DEPTH);
        throw Error("Renderer type invalid");
    }
}

export class RenderTexture extends Texture {
    public static Create(width: number, height: number, format: TextureFormat = "rgba32uint"): Texture {
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, format, TextureType.RENDER_TARGET);
        throw Error("Renderer type invalid");
    }
}