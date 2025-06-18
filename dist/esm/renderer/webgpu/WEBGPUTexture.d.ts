/// <reference types="@webgpu/types" />
import { Texture, TextureDimension, TextureFormat, TextureType } from "../Texture";
export declare class WEBGPUTexture implements Texture {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    readonly depth: number;
    readonly format: TextureFormat;
    readonly type: TextureType;
    readonly dimension: TextureDimension;
    readonly mipLevels: number;
    private buffer;
    private viewCache;
    private currentLayer;
    private currentMip;
    private activeMipCount;
    constructor(width: number, height: number, depth: number, format: TextureFormat, type: TextureType, dimension: TextureDimension, mipLevels: number);
    GetBuffer(): GPUTexture;
    GetView(): GPUTextureView;
    GenerateMips(): void;
    SetActiveLayer(layer: number): void;
    GetActiveLayer(): number;
    SetActiveMip(mip: number): void;
    GetActiveMip(): number;
    SetActiveMipCount(mipCount: number): number;
    GetActiveMipCount(): number;
    Destroy(): void;
    SetData(data: BufferSource): void;
    static FromImageBitmap(imageBitmap: ImageBitmap, width: number, height: number, format: TextureFormat, flipY: boolean): WEBGPUTexture;
}
