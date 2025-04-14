import { Vector2 } from "../math/Vector2";
import { Debugger } from "../plugins/Debugger";
import { Renderer } from "./Renderer";
import { RendererDebug } from "./RendererDebug";
import { WEBGPUTexture } from "./webgpu/WEBGPUTexture";
import { WEBGPUBlit } from "./webgpu/utils/WEBGBPUBlit";

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
    | "depth24plus"
    | "depth24plus-stencil8"

export enum TextureType {
    IMAGE,
    DEPTH,
    RENDER_TARGET,
    RENDER_TARGET_STORAGE
};

export type TextureDimension = 
    | "1d"
    | "2d"
    | "2d-array"
    | "cube"
    | "cube-array"
    | "3d";

export class Texture {
    public readonly id: string;
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;
    public readonly type: TextureType;
    public readonly dimension: TextureDimension;

    public SetActiveLayer(layer: number) {}
    public GetActiveLayer(): number {throw Error("Base class.")}

    public SetActiveMip(layer: number) {}
    public GetActiveMip(): number {throw Error("Base class.")}

    public SetActiveMipCount(layer: number) {}
    public GetActiveMipCount(): number {throw Error("Base class.")}

    public GenerateMips() {}

    public Destroy() {}

    public SetData(data: BufferSource) {}

    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }

    public static async Load(url: string, format: TextureFormat = Renderer.SwapChainFormat, flipY: boolean = false): Promise<Texture> {
        const response = await fetch(url);
        const imageBitmap = await createImageBitmap(await response.blob());
        RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4); // account for format
        if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
        throw Error("Renderer type invalid");
    }

    public static async LoadImageSource(imageSource: ImageBitmapSource, format: TextureFormat = Renderer.SwapChainFormat, flipY = false): Promise<Texture> {
        const imageBitmap = await createImageBitmap(imageSource);
        RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4); // account for format
        if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
        throw Error("Renderer type invalid");
    }

    public static async Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale = new Vector2(1,1)) {
        if (Renderer.type === "webgpu") return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
        throw Error("Renderer type invalid");
    }
}

export class DepthTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = "depth24plus", mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 1); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.DEPTH, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class RenderTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class RenderTextureStorage extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class RenderTextureStorage3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "3d", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class RenderTextureCube extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "cube", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class TextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "2d-array", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class Texture3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "3d", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class CubeTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "cube", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class DepthTextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = "depth24plus", mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 1); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.DEPTH, "2d-array", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class RenderTextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET, "2d-array", mipLevels);
        throw Error("Renderer type invalid");
    }
}

export class RenderTexture3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET, "3d", mipLevels);
        throw Error("Renderer type invalid");
    }
}