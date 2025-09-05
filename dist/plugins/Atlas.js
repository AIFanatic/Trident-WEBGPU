import { GPU, Geometry } from '@trident/core';

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
    this.buffer = GPU.Buffer.Create(size * size * 4, GPU.BufferType.STORAGE);
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
    const offset = (node.rect.y * this.size + node.rect.x) * 4;
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.CopyTextureToBufferV2(
      { texture, mipLevel: 0, origin: [0, 0, 0] },
      { buffer: this.buffer, offset, bytesPerRow: this.size * 4 }
    );
    GPU.Renderer.EndRenderFrame();
    this.regions.push(region);
    this.UpdateRegionData();
    return this.regions.length - 1;
  }
  AddBuffer(buffer) {
    function computeOptimalRect(dataSize) {
      const width = Math.floor(Math.sqrt(dataSize));
      const height = Math.ceil(dataSize / width);
      return new Rect(0, 0, width, height);
    }
    const node = this.start_node.insert_rect(computeOptimalRect(buffer.size * 0.5 * 0.5));
    if (!node || !node.rect) throw Error("Failed to insert texture into atlas");
    const region = {
      uvOffset: [node.rect.x / this.size, node.rect.y / this.size],
      uvSize: [node.rect.w / this.size, node.rect.h / this.size]
    };
    const offset = (node.rect.y * this.size + node.rect.x) * 4;
    console.log(node.rect);
    console.log(region);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.CopyBufferToBuffer(buffer, this.buffer, 0, offset, buffer.size);
    GPU.Renderer.EndRenderFrame();
    this.regions.push(region);
    this.UpdateRegionData();
    return this.regions.length - 1;
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
class AtlasViewer {
  name = "AtlasViewer";
  shader;
  quadGeometry;
  initialized = false;
  async init() {
    const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        struct AtlasRegion {
            uvOffset: vec2<f32>,
            uvSize: vec2<f32>,
        };

        @group(0) @binding(1) var<storage, read> atlasBuffer: array<f32>;
        @group(0) @binding(2) var<storage, read> atlasRegions: array<AtlasRegion>;

        @group(0) @binding(3) var<storage, read> atlasSize: f32;
        @group(0) @binding(4) var<storage, read> textureIndex: f32;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }

        // // Unpack a packed BGRA8 pixel stored in a u32 into a vec4<f32>
        // fn getPixel(globalUV: vec2<f32>, atlasSize: f32) -> vec4<f32> {
        //     let coord = vec2<u32>(globalUV * atlasSize);
        //     let index = coord.y * u32(atlasSize) + coord.x;
        //     let packed = atlasBuffer[index];
  
        //     // Unpack BGRA (each channel is 8 bits) and convert to normalized floats.
        //     let b = f32((packed >> 0u) & 0xFFu) / 255.0;
        //     let g = f32((packed >> 8u) & 0xFFu) / 255.0;
        //     let r = f32((packed >> 16u) & 0xFFu) / 255.0;
        //     let a = f32((packed >> 24u) & 0xFFu) / 255.0;
        //     return vec4f(r, g, b, a);
        // }

        // fn atlasSample(textureIndex: u32, uv: vec2<f32>) -> vec4<f32> {
        //     // Get the region for the selected texture.
        //     let region = atlasRegions[textureIndex];
        //     // Remap the incoming UV (0\u20131) to the region\u2019s area in the atlas.
        //     let globalUV = region.uvOffset + fract(uv) * region.uvSize;

        //     return getPixel(globalUV, atlasSize);
        // }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            // // return atlasSample(u32(textureIndex), input.vUv);

            // let p = atlasSample(u32(textureIndex), input.vUv);
            // if (p.r > -10.0) {
            //     // return vec4f(0.0, 1.0, 0.0, 1.0);
            // }
            // return vec4f(p.rgb, 1.0);

            // Map the incoming UV [0,1] to atlas pixel coordinates.
            let coord = vec2<u32>(input.vUv * atlasSize);
            let index = coord.y * u32(atlasSize) + coord.x;
            let value = atlasBuffer[index];
            // Output the value as a grayscale color.
            return vec4f(value, value, value, 1.0);

            // let coord = vec2<u32>(input.vUv * atlasSize);
            // let index = coord.y * u32(atlasSize) + coord.x;
            // let packed = atlasBuffer[index];
  
            // // Unpack the BGRA channels from the 32-bit packed value.
            // let b = f32((packed >> 0u) & 0xFFu) / 255.0;
            // let g = f32((packed >> 8u) & 0xFFu) / 255.0;
            // let r = f32((packed >> 16u) & 0xFFu) / 255.0;
            // let a = f32((packed >> 24u) & 0xFFu) / 255.0;
            // return vec4f(r, g, b, a);
        }
        `;
    this.shader = await GPU.Shader.Create({
      code,
      colorOutputs: [{ format: GPU.Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        uv: { location: 1, size: 2, type: "vec2" }
      },
      uniforms: {
        atlasBuffer: { group: 0, binding: 1, type: "storage" },
        atlasRegions: { group: 0, binding: 2, type: "storage" },
        atlasSize: { group: 0, binding: 3, type: "storage" },
        textureIndex: { group: 0, binding: 4, type: "storage" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    this.initialized = true;
  }
  async execute(atlas, textureIndex) {
    if (!this.initialized) await this.init();
    this.shader.SetBuffer("atlasBuffer", atlas.buffer);
    this.shader.SetArray("atlasRegions", atlas.regionData);
    this.shader.SetValue("atlasSize", atlas.size);
    this.shader.SetValue("textureIndex", textureIndex);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass(this.name, [{ clear: false }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
  }
}

export { Atlas, AtlasViewer };
