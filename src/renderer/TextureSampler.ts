import { Renderer } from "./Renderer";
import { WEBGPUTextureSampler } from "./webgpu/WEBGPUTextureSampler";

export class TextureSampler {
    public static Create(): TextureSampler {
        if (Renderer.type === "webgpu") return new WEBGPUTextureSampler();
        throw Error("Renderer type invalid");
    }
}