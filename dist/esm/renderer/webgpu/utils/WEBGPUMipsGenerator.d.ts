/// <reference types="@webgpu/types" />
import { WEBGPUTexture } from "../WEBGPUTexture";
export declare class WEBGPUMipsGenerator {
    private static sampler;
    private static module;
    private static pipelineByFormat;
    static numMipLevels(...sizes: any[]): number;
    static generateMips(source: WEBGPUTexture): GPUTexture;
}
