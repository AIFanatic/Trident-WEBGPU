import { TextureSampler, TextureSamplerParams } from "../TextureSampler";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTextureSampler implements TextureSampler {
    public readonly params: TextureSamplerParams;

    private sampler: GPUSampler;

    constructor(params: TextureSamplerParams) {
        this.params = params;

        const samplerDescriptor: GPUSamplerDescriptor = {}
        if (params?.minFilter) samplerDescriptor.minFilter = params.minFilter;
        if (params?.magFilter) samplerDescriptor.minFilter = params.magFilter;
        if (params?.mipmapFilter) samplerDescriptor.minFilter = params.mipmapFilter;
        if (params?.addressModeU) samplerDescriptor.addressModeU = params.addressModeU;
        if (params?.addressModeV) samplerDescriptor.addressModeV = params.addressModeV;
        if (params?.compare) samplerDescriptor.compare = params.compare;
        if (params?.maxAnisotropy) samplerDescriptor.maxAnisotropy = params.maxAnisotropy;
        this.sampler = WEBGPURenderer.device.createSampler(samplerDescriptor);
    }

    public GetBuffer(): GPUSampler { return this.sampler }
}