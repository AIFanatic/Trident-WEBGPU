import { TextureSampler } from "../TextureSampler";
import { WEBGPURenderer } from "./WEBGPURenderer";

export class WEBGPUTextureSampler implements TextureSampler {
    private sampler: GPUSampler;

    constructor() {
        this.sampler = WEBGPURenderer.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear',
        });
    }

    public GetBuffer(): GPUSampler { return this.sampler }
}