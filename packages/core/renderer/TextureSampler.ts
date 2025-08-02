import { Renderer } from "./Renderer";
import { WEBGPUTextureSampler } from "./webgpu/WEBGPUTextureSampler";

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

export class TextureSampler {
    public readonly params: TextureSamplerParams;
    public static Create(params?: TextureSamplerParams): TextureSampler {
        const samplerParams = Object.assign({}, defaultSamplerParams, params);
        if (Renderer.type === "webgpu") return new WEBGPUTextureSampler(samplerParams);
        throw Error("Renderer type invalid");
    }
}