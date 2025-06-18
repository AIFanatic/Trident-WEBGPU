/// <reference types="@webgpu/types" />
import { TextureSampler, TextureSamplerParams } from "../TextureSampler";
export declare class WEBGPUTextureSampler implements TextureSampler {
    readonly id: string;
    readonly params: TextureSamplerParams;
    private sampler;
    constructor(params: TextureSamplerParams);
    GetBuffer(): GPUSampler;
}
