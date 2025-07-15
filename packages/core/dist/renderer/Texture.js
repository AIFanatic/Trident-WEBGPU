import { Vector2 } from "../math/Vector2";
import { Renderer } from "./Renderer";
import { RendererDebug } from "./RendererDebug";
import { WEBGPUTexture } from "./webgpu/WEBGPUTexture";
import { WEBGPUBlit } from "./webgpu/utils/WEBGBPUBlit";
export var TextureType;
(function (TextureType) {
    TextureType[TextureType["IMAGE"] = 0] = "IMAGE";
    TextureType[TextureType["DEPTH"] = 1] = "DEPTH";
    TextureType[TextureType["RENDER_TARGET"] = 2] = "RENDER_TARGET";
    TextureType[TextureType["RENDER_TARGET_STORAGE"] = 3] = "RENDER_TARGET_STORAGE";
})(TextureType || (TextureType = {}));
;
export class Texture {
    id;
    width;
    height;
    depth;
    type;
    dimension;
    SetActiveLayer(layer) { }
    GetActiveLayer() { throw Error("Base class."); }
    SetActiveMip(layer) { }
    GetActiveMip() { throw Error("Base class."); }
    SetActiveMipCount(layer) { }
    GetActiveMipCount() { throw Error("Base class."); }
    GenerateMips() { }
    Destroy() { }
    SetData(data) { }
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }
    static async Load(url, format = Renderer.SwapChainFormat, flipY = false) {
        const response = await fetch(url);
        const imageBitmap = await createImageBitmap(await response.blob());
        RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4); // account for format
        if (Renderer.type === "webgpu")
            return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
        throw Error("Renderer type invalid");
    }
    static async LoadImageSource(imageSource, format = Renderer.SwapChainFormat, flipY = false) {
        const imageBitmap = await createImageBitmap(imageSource);
        RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4); // account for format
        if (Renderer.type === "webgpu")
            return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
        throw Error("Renderer type invalid");
    }
    static async Blit(source, destination, width, height, uv_scale = new Vector2(1, 1)) {
        if (Renderer.type === "webgpu")
            return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
        throw Error("Renderer type invalid");
    }
}
export class DepthTexture extends Texture {
    static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 1); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.DEPTH, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class RenderTexture extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class RenderTextureStorage extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "2d", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class RenderTextureStorage3D extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "3d", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class RenderTextureCube extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET_STORAGE, "cube", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class TextureArray extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "2d-array", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class Texture3D extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "3d", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class CubeTexture extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.IMAGE, "cube", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class DepthTextureArray extends Texture {
    static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 1); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.DEPTH, "2d-array", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class RenderTextureArray extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET, "2d-array", mipLevels);
        throw Error("Renderer type invalid");
    }
}
export class RenderTexture3D extends Texture {
    static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
        RendererDebug.IncrementGPUTextureSize(width * height * depth * 4); // account for format
        if (Renderer.type === "webgpu")
            return new WEBGPUTexture(width, height, depth, format, TextureType.RENDER_TARGET, "3d", mipLevels);
        throw Error("Renderer type invalid");
    }
}
