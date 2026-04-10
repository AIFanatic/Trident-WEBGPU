import { UUID } from "../utils";
import { Renderer } from "./Renderer";

export interface TextureSamplerParams {
    magFilter?: "linear" | "nearest";
    minFilter?: "linear" | "nearest";
    mipmapFilter?: "linear" | "nearest";
    addressModeU?: "clamp-to-edge" | "repeat" | "mirror-repeat";
    addressModeV?: "clamp-to-edge" | "repeat" | "mirror-repeat";
    compare?: "never" | "less" | "equal" | "less-equal" | "greater" | "not-equal" | "greater-equal" | "always";
    maxAnisotropy?: number;
};

const defaultSamplerParams: TextureSamplerParams = {
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
    compare: undefined,
    maxAnisotropy: 1
}

export class TextureSampler implements TextureSampler {
    public readonly id = UUID();
    public readonly params: TextureSamplerParams;

    private sampler: GPUSampler;

    constructor(params?: TextureSamplerParams) {
        const samplerParams = Object.assign({}, defaultSamplerParams, params);
        this.params = samplerParams;

        const samplerDescriptor: GPUSamplerDescriptor = {}
        if (samplerParams.minFilter) samplerDescriptor.minFilter = samplerParams.minFilter;
        if (samplerParams.magFilter) samplerDescriptor.magFilter = samplerParams.magFilter;
        if (samplerParams.mipmapFilter) samplerDescriptor.mipmapFilter = samplerParams.mipmapFilter;
        if (samplerParams.addressModeU) samplerDescriptor.addressModeU = samplerParams.addressModeU;
        if (samplerParams.addressModeV) samplerDescriptor.addressModeV = samplerParams.addressModeV;
        if (samplerParams.compare) samplerDescriptor.compare = samplerParams.compare;
        if (samplerParams.maxAnisotropy) samplerDescriptor.maxAnisotropy = samplerParams.maxAnisotropy;
        this.sampler = Renderer.device.createSampler(samplerDescriptor);
    }

    public GetBuffer(): GPUSampler { return this.sampler }
}