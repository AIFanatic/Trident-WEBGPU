import { TextureSampler, TextureSamplerParams } from "../TextureSampler";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTextureSampler implements TextureSampler {
    public readonly params: TextureSamplerParams;

    private sampler: GPUSampler;

    constructor(params: TextureSamplerParams) {
        this.params = params;

        const samplerDescriptor: GPUSamplerDescriptor = {}
        if (params && params.minFilter) samplerDescriptor.minFilter = params.minFilter;
        if (params && params.magFilter) samplerDescriptor.magFilter = params.magFilter;
        if (params && params.mipmapFilter) samplerDescriptor.mipmapFilter = params.mipmapFilter;
        if (params && params.addressModeU) samplerDescriptor.addressModeU = params.addressModeU;
        if (params && params.addressModeV) samplerDescriptor.addressModeV = params.addressModeV;
        if (params && params.compare) samplerDescriptor.compare = params.compare;
        if (params && params.maxAnisotropy) samplerDescriptor.maxAnisotropy = params.maxAnisotropy;
        this.sampler = WEBGPURenderer.device.createSampler(samplerDescriptor);
    }

    public GetBuffer(): GPUSampler { return this.sampler }
}