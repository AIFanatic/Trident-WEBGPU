import { Vector2 } from "../math/Vector2";
import { Renderer } from "./Renderer";
import { WEBGPUTexture } from "./webgpu/WEBGPUTexture";
import { WEBGPUBlit } from "./webgpu/utils/WEBGBPUBlit";

export interface SerializedTexture {
    name: string;
    id: string;
    width: number;
    height: number;
    depth: number;
    format: TextureFormat;
    type: TextureType;
    dimension: TextureDimension;
    mipLevels: number;
    data: ImageBitmap | string;
}

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
    | "r8unorm"
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

function CreateTexture(width: number, height: number, depth: number, format: TextureFormat, type: TextureType, dimension: TextureDimension, mipLevels: number) {
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, type, dimension, mipLevels);
    throw Error("Renderer type invalid");
}

export class Texture {
    public readonly id: string;
    public readonly width: number;
    public readonly height: number;
    public readonly depth: number;
    public readonly type: TextureType;
    public readonly dimension: TextureDimension;
    public readonly format: TextureFormat;
    public mipLevels: number;
    public name: string;

    public SetName(name: string) {}
    public GetName(): string {throw Error("Base class.")}

    public SetActiveLayer(layer: number) {}
    public GetActiveLayer(): number {throw Error("Base class.")}

    public SetActiveMip(layer: number) {}
    public GetActiveMip(): number {throw Error("Base class.")}

    public SetActiveMipCount(layer: number) {}
    public GetActiveMipCount(): number {throw Error("Base class.")}

    public GenerateMips() {}

    public Destroy() {}

    public SetData(data: BufferSource, bytesPerRow: number, rowsPerImage?: number) {}
    
    public Serialize(metadata: any = {}): SerializedTexture {throw Error("Base class.")}
    public static Deserialize(data: SerializedTexture): Texture {
        if (Renderer.type === "webgpu") return WEBGPUTexture.Deserialize(data);
        throw Error("Renderer type invalid");
    }

    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.IMAGE, "2d", mipLevels);
    }

    public static async Load(url: string | URL, format: TextureFormat = Renderer.SwapChainFormat, flipY: boolean = false): Promise<Texture> {
        const response = await fetch(url);
        const imageBitmap = await createImageBitmap(await response.blob());
        if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format);
        throw Error("Renderer type invalid");
    }

    public static async LoadImageSource(imageSource: ImageBitmapSource, format: TextureFormat = Renderer.SwapChainFormat): Promise<Texture> {
        const imageBitmap = await createImageBitmap(imageSource);
        if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format);
        throw Error("Renderer type invalid");
    }

    public static async Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale = new Vector2(1,1)) {
        if (Renderer.type === "webgpu") return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
        throw Error("Renderer type invalid");
    }
}

export class DepthTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = "depth24plus", mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.DEPTH, "2d", mipLevels);
    }
}

export class RenderTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.RENDER_TARGET, "2d", mipLevels);
    }
}

export class RenderTextureStorage extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "2d", mipLevels);
    }
}

export class RenderTextureStorage3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "3d", mipLevels);
    }
}

export class RenderTextureStorage2D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "2d", mipLevels);
    }
}

export class RenderTextureCube extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.RENDER_TARGET, "cube", mipLevels);
    }
}

export class TextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.IMAGE, "2d-array", mipLevels);
    }
}

export class Texture3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.IMAGE, "3d", mipLevels);
    }
}

export class CubeTexture extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.IMAGE, "cube", mipLevels);
    }
}

export class DepthTextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = "depth24plus", mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.DEPTH, "2d-array", mipLevels);
    }
}

export class RenderTextureArray extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.RENDER_TARGET, "2d-array", mipLevels);
    }
}

export class RenderTexture3D extends Texture {
    public static Create(width: number, height: number, depth: number = 1, format: TextureFormat = Renderer.SwapChainFormat, mipLevels = 1): Texture {
        return CreateTexture(width, height, depth, format, TextureType.RENDER_TARGET, "3d", mipLevels);
    }
}