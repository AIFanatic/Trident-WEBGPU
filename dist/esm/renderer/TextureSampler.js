import { Renderer } from "./Renderer";
import { WEBGPUTextureSampler } from "./webgpu/WEBGPUTextureSampler";
;
const defaultSamplerParams = {
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
    compare: undefined,
    maxAnisotropy: 1
};
export class TextureSampler {
    params;
    static Create(params) {
        const samplerParams = Object.assign({}, defaultSamplerParams, params);
        if (Renderer.type === "webgpu")
            return new WEBGPUTextureSampler(samplerParams);
        throw Error("Renderer type invalid");
    }
}
//# sourceMappingURL=TextureSampler.js.map