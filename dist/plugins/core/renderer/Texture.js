import { Vector2 } from '../math/Vector2.js';
import { Renderer } from './Renderer.js';
import { WEBGPUTexture } from './webgpu/WEBGPUTexture.js';
import { WEBGPUBlit } from './webgpu/utils/WEBGBPUBlit.js';

var TextureType = /* @__PURE__ */ ((TextureType2) => {
  TextureType2[TextureType2["IMAGE"] = 0] = "IMAGE";
  TextureType2[TextureType2["DEPTH"] = 1] = "DEPTH";
  TextureType2[TextureType2["RENDER_TARGET"] = 2] = "RENDER_TARGET";
  TextureType2[TextureType2["RENDER_TARGET_STORAGE"] = 3] = "RENDER_TARGET_STORAGE";
  return TextureType2;
})(TextureType || {});
function CreateTexture(width, height, depth, format, type, dimension, mipLevels) {
  Renderer.info.gpuTextureSizeTotal += width * height * depth * 4;
  if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, type, dimension, mipLevels);
  throw Error("Renderer type invalid");
}
class Texture {
  id;
  width;
  height;
  depth;
  type;
  dimension;
  format;
  name;
  SetName(name) {
  }
  GetName() {
    throw Error("Base class.");
  }
  SetActiveLayer(layer) {
  }
  GetActiveLayer() {
    throw Error("Base class.");
  }
  SetActiveMip(layer) {
  }
  GetActiveMip() {
    throw Error("Base class.");
  }
  SetActiveMipCount(layer) {
  }
  GetActiveMipCount() {
    throw Error("Base class.");
  }
  GenerateMips() {
  }
  Destroy() {
  }
  SetData(data, bytesPerRow, rowsPerImage) {
  }
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 0 /* IMAGE */, "2d", mipLevels);
  }
  static async Load(url, format = Renderer.SwapChainFormat, flipY = false) {
    const response = await fetch(url);
    const imageBitmap = await createImageBitmap(await response.blob());
    Renderer.info.gpuTextureSizeTotal += imageBitmap.width * imageBitmap.height * 1 * 4;
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
    throw Error("Renderer type invalid");
  }
  static async LoadImageSource(imageSource, format = Renderer.SwapChainFormat, flipY = false) {
    const imageBitmap = await createImageBitmap(imageSource);
    Renderer.info.gpuTextureSizeTotal += imageBitmap.width * imageBitmap.height * 1 * 4;
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
    throw Error("Renderer type invalid");
  }
  static async Blit(source, destination, width, height, uv_scale = new Vector2(1, 1)) {
    if (Renderer.type === "webgpu") return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
    throw Error("Renderer type invalid");
  }
}
class DepthTexture extends Texture {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 1 /* DEPTH */, "2d", mipLevels);
  }
}
class RenderTexture extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 2 /* RENDER_TARGET */, "2d", mipLevels);
  }
}
class CubeTexture extends Texture {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 0 /* IMAGE */, "cube", mipLevels);
  }
}
class DepthTextureArray extends Texture {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    return CreateTexture(width, height, depth, format, 1 /* DEPTH */, "2d-array", mipLevels);
  }
}

export { CubeTexture, DepthTexture, DepthTextureArray, RenderTexture, Texture, TextureType };
