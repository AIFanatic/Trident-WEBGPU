import { WEBGPUTexture } from "../WEBGPUTexture";
export declare class WEBGPUMipsGenerator {
    private static sampler;
    private static module;
    private static pipelineByFormat;
    static numMipLevels(...sizes: number[]): number;
    static generateMips(source: WEBGPUTexture): GPUTexture;
}
//# sourceMappingURL=WEBGPUMipsGenerator.d.ts.map