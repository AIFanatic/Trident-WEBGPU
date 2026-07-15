import { GPU, Mathf } from '@trident/core';
import { PageManager } from '../VirtualTexturing/PageManager.js';
import { TilesGenerator } from '../VirtualTexturing/TilesGenerator.js';

const VT_PAGE = 512;
const VT_GRID = 16;
const VT_SLOTS = 12;
const BINDLESS_VT_WGSL = `
    @group(0) @binding(2) var vtAtlas: texture_2d<f32>;
    @group(0) @binding(3) var vtPageTable: texture_2d<u32>;
    @group(0) @binding(4) var vtSampler: sampler;

    const VT_GRID = ${VT_GRID}.0;
    const VT_PAGE = ${VT_PAGE}.0;
    const VT_PAD  = 4.0;
    const VT_ATLAS_SIZE = ${VT_SLOTS}.0 * (VT_PAGE + VT_PAD);

    fn SampleVT(vuv: vec2f) -> vec4f {
        let page = clamp(floor(vuv * VT_GRID), vec2f(0.0), vec2f(VT_GRID - 1.0));
        let entry = textureLoad(vtPageTable, vec2<i32>(page), 0).r;
        if ((entry & 1u) == 0u) { return vec4f(1.0); }
        let slot = vec2f(vec2u((entry >> 1u) & 0xFFu, (entry >> 9u) & 0xFFu));
        let local = fract(vuv * VT_GRID);
        let texel = slot * (VT_PAGE + VT_PAD) + VT_PAD * 0.5 + local * VT_PAGE;
        return textureSampleLevel(vtAtlas, vtSampler, texel / VT_ATLAS_SIZE, 0.0);
    }

    fn SampleRegion(region: vec4f, uv: vec2f) -> vec4f {
        return SampleVT(region.xy + fract(uv) * region.zw);
    }
`;
class BindlessVT {
  static _manager;
  static tiles = /* @__PURE__ */ new Map();
  static regions = /* @__PURE__ */ new Map();
  static nextPage = 0;
  static sampler;
  static Bind(shader) {
    if (!this.sampler) this.sampler = new GPU.TextureSampler();
    shader.SetTexture("vtAtlas", this.manager.Atlas());
    shader.SetTexture("vtPageTable", this.manager.PageTables());
    shader.SetSampler("vtSampler", this.sampler);
  }
  static get manager() {
    if (!this._manager) {
      this._manager = new PageManager(
        new Mathf.Vector2(VT_PAGE * VT_GRID, VT_PAGE * VT_GRID),
        new Mathf.Vector2(4, 4),
        new Mathf.Vector2(VT_PAGE, VT_PAGE),
        { x: VT_SLOTS, y: VT_SLOTS },
        0
      );
      this._manager.ImageRequest = (r) => this.tiles.get(`${r.lod}|${r.x}|${r.y}`);
    }
    return this._manager;
  }
  // Call once per frame (BindlessDrawPass.preFrame).
  static Update() {
    if (!this._manager) return;
    this._manager.FlushUploadQueue();
    this._manager.UpdatePageTables();
  }
  static workQueue = Promise.resolve();
  static AllocateFromTexture(texture) {
    const cached = this.regions.get(texture);
    if (cached) return Promise.resolve(cached);
    if (this.nextPage >= VT_GRID * VT_GRID) throw new Error("BindlessVT: virtual space full");
    const page = this.nextPage++;
    const px = page % VT_GRID, py = Math.floor(page / VT_GRID);
    const region = [px / VT_GRID, py / VT_GRID, 1 / VT_GRID, 1 / VT_GRID];
    this.regions.set(texture, region);
    const work = this.workQueue.then(async () => {
      const image = await this.TextureToImageData(texture, VT_PAGE);
      for (const t of TilesGenerator.generate(image, VT_PAGE, VT_PAGE, 2)) {
        this.tiles.set(`${t.lod}|${px + t.tile_x}|${py + t.tile_y}`, t.data);
      }
      this.manager.RequestPage({ lod: 0, x: px, y: py, material: 0 });
      return region;
    });
    this.workQueue = work.catch(() => {
    });
    return work;
  }
  // GPU texture -> downscaled ImageData (handles GLB-embedded textures with no source file).
  static async TextureToImageData(texture, size) {
    const bytesPerRow = Math.ceil(texture.width * 4 / 256) * 256;
    const buffer = new GPU.Buffer(bytesPerRow * texture.height, GPU.BufferType.STORAGE);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.CopyTextureToBufferV2({ texture }, { buffer, bytesPerRow, rowsPerImage: texture.height });
    GPU.Renderer.EndRenderFrame();
    const raw = new Uint8Array(await buffer.GetData());
    buffer.Destroy();
    const img = new ImageData(texture.width, texture.height);
    for (let y = 0; y < texture.height; y++) {
      img.data.set(raw.subarray(y * bytesPerRow, y * bytesPerRow + texture.width * 4), y * texture.width * 4);
    }
    const src = document.createElement("canvas");
    src.width = img.width;
    src.height = img.height;
    src.getContext("2d").putImageData(img, 0, 0);
    const dst = document.createElement("canvas");
    dst.width = size;
    dst.height = size;
    const ctx = dst.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(src, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size);
  }
}

export { BINDLESS_VT_WGSL, BindlessVT, VT_GRID, VT_PAGE, VT_SLOTS };
