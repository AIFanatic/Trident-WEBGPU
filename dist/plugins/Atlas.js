import { GPU } from '@trident/core';

class Rect {
  x;
  y;
  w;
  h;
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  fits_in(outer) {
    return outer.w >= this.w && outer.h >= this.h;
  }
  same_size_as(other) {
    return this.w == other.w && this.h == other.h;
  }
}
class Node {
  left;
  right;
  rect;
  filled;
  constructor() {
    this.left = null;
    this.right = null;
    this.rect = null;
    this.filled = false;
  }
  insert_rect(rect) {
    if (this.left !== null && this.right !== null) return this.left.insert_rect(rect) || this.right.insert_rect(rect);
    if (this.filled) return null;
    if (!this.rect) throw Error("Rect not defined");
    if (!rect.fits_in(this.rect)) return null;
    if (rect.same_size_as(this.rect)) {
      this.filled = true;
      return this;
    }
    this.left = new Node();
    this.right = new Node();
    var width_diff = this.rect.w - rect.w;
    var height_diff = this.rect.h - rect.h;
    var me = this.rect;
    if (width_diff > height_diff) {
      this.left.rect = new Rect(me.x, me.y, rect.w, me.h);
      this.right.rect = new Rect(me.x + rect.w, me.y, me.w - rect.w, me.h);
    } else {
      this.left.rect = new Rect(me.x, me.y, me.w, rect.h);
      this.right.rect = new Rect(me.x, me.y + rect.h, me.w, me.h - rect.h);
    }
    return this.left.insert_rect(rect);
  }
}
class Atlas {
  buffer;
  regions = [];
  size;
  regionData;
  start_node;
  constructor(size) {
    this.size = size;
    this.buffer = GPU.Texture.Create(size, size, 1, "bgra8unorm");
    this.start_node = new Node();
    this.start_node.rect = new Rect(0, 0, size, size);
  }
  AddTexture(texture) {
    const node = this.start_node.insert_rect(new Rect(0, 0, texture.width, texture.height));
    if (!node || !node.rect) throw Error("Failed to insert texture into atlas");
    const region = {
      uvOffset: [node.rect.x / this.size, node.rect.y / this.size],
      uvSize: [node.rect.w / this.size, node.rect.h / this.size]
    };
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.CopyTextureToTextureV3({ texture }, { texture: this.buffer, origin: [node.rect.x, node.rect.y] }, [node.rect.w, node.rect.h]);
    GPU.Renderer.EndRenderFrame();
    this.regions.push(region);
    this.UpdateRegionData();
    return region;
  }
  UpdateRegionData() {
    let regionData = [];
    for (const region of this.regions) regionData.push(
      region.uvOffset[0],
      region.uvOffset[1],
      region.uvSize[0],
      region.uvSize[1]
    );
    this.regionData = new Float32Array(regionData);
  }
}

export { Atlas };
