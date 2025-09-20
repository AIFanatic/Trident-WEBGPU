import { UUID } from '../../utils/StringUtils.js';
import { WEBGPURenderer } from './WEBGPURenderer.js';

class WEBGPUTextureSampler {
  id = UUID();
  params;
  sampler;
  constructor(params) {
    this.params = params;
    const samplerDescriptor = {};
    if (params && params.minFilter) samplerDescriptor.minFilter = params.minFilter;
    if (params && params.magFilter) samplerDescriptor.magFilter = params.magFilter;
    if (params && params.mipmapFilter) samplerDescriptor.mipmapFilter = params.mipmapFilter;
    if (params && params.addressModeU) samplerDescriptor.addressModeU = params.addressModeU;
    if (params && params.addressModeV) samplerDescriptor.addressModeV = params.addressModeV;
    if (params && params.compare) samplerDescriptor.compare = params.compare;
    if (params && params.maxAnisotropy) samplerDescriptor.maxAnisotropy = params.maxAnisotropy;
    this.sampler = WEBGPURenderer.device.createSampler(samplerDescriptor);
  }
  GetBuffer() {
    return this.sampler;
  }
}

export { WEBGPUTextureSampler };
