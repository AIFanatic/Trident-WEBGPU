import { Vector2 } from "../math/Vector2";
export type TextureFormat = "r16uint" | "r16sint" | "r16float" | "rg8unorm" | "rg8snorm" | "rg8uint" | "rg8sint" | "r32uint" | "r32sint" | "r32float" | "rg16uint" | "rg16sint" | "rg16float" | "rgba8unorm" | "rgba8unorm-srgb" | "rgba8snorm" | "rgba8uint" | "rgba8sint" | "bgra8unorm" | "bgra8unorm-srgb" | "rg32uint" | "rg32sint" | "rg32float" | "rgba16uint" | "rgba16sint" | "rgba16float" | "rgba32uint" | "rgba32sint" | "rgba32float" | "stencil8" | "depth16unorm" | "depth24plus" | "depth24plus-stencil8" | "depth24plus" | "depth24plus-stencil8";
export declare enum TextureType {
    IMAGE = 0,
    DEPTH = 1,
    RENDER_TARGET = 2,
    RENDER_TARGET_STORAGE = 3
}
export type TextureDimension = "1d" | "2d" | "2d-array" | "cube" | "cube-array" | "3d";
export declare class Texture {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    readonly depth: number;
    readonly type: TextureType;
    readonly dimension: TextureDimension;
    SetActiveLayer(layer: number): void;
    GetActiveLayer(): number;
    SetActiveMip(layer: number): void;
    GetActiveMip(): number;
    SetActiveMipCount(layer: number): void;
    GetActiveMipCount(): number;
    GenerateMips(): void;
    Destroy(): void;
    SetData(data: BufferSource): void;
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
    static Load(url: string, format?: TextureFormat, flipY?: boolean): Promise<Texture>;
    static LoadImageSource(imageSource: ImageBitmapSource, format?: TextureFormat, flipY?: boolean): Promise<Texture>;
    static Blit(source: Texture, destination: Texture, width: number, height: number, uv_scale?: Vector2): Promise<void>;
}
export declare class DepthTexture extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class RenderTexture extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class RenderTextureStorage extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class RenderTextureStorage3D extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class RenderTextureCube extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class TextureArray extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class Texture3D extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class CubeTexture extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class DepthTextureArray extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class RenderTextureArray extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
export declare class RenderTexture3D extends Texture {
    static Create(width: number, height: number, depth?: number, format?: TextureFormat, mipLevels?: number): Texture;
}
//# sourceMappingURL=Texture.d.ts.map