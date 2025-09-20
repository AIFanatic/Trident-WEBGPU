import { Renderer } from './Renderer.js';
import { WEBGPUTextureSampler } from './webgpu/WEBGPUTextureSampler.js';

const defaultSamplerParams = {
  magFilter: "linear",
  minFilter: "linear",
  mipmapFilter: "linear",
  addressModeU: "repeat",
  addressModeV: "repeat",
  compare: void 0,
  maxAnisotropy: 1
};
class TextureSampler {
  params;
  static Create(params) {
    const samplerParams = Object.assign({}, defaultSamplerParams, params);
    if (Renderer.type === "webgpu") return new WEBGPUTextureSampler(samplerParams);
    throw Error("Renderer type invalid");
  }
}

export { TextureSampler };
