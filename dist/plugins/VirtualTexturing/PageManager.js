import { Mathf, GPU } from '@trident/core';
import { PageCache } from './PageCache.js';
import { PageTables } from './PageTables.js';

const slots_in_cache = { x: 8, y: 8 };
const min_pinned_lod_idx = 4;
class ImageLoader {
  LoadAsync(path, cb) {
    fetch(path).then((res) => res.blob()).then((blob) => createImageBitmap(blob)).then((image) => cb({ ok: true, value: image })).catch((err) => cb({ ok: false, error: String(err) }));
  }
}
function keyForRequest(request) {
  return `${request.lod}|${request.x}|${request.y}`;
}
class PageManager {
  page_cache_;
  page_tables_;
  slot_size_ = new Mathf.Vector2(0, 0);
  atlas_size_ = new Mathf.Vector2(0, 0);
  atlas_;
  upload_queue_ = [];
  failure_queue_ = [];
  loader_ = new ImageLoader();
  processing_ = /* @__PURE__ */ new Set();
  ImageRequest;
  constructor(virtual_size, page_padding, page_size) {
    this.page_cache_ = new PageCache(slots_in_cache, min_pinned_lod_idx);
    const pages_x = Math.max(Math.floor(virtual_size.x / page_size.x), 1);
    const pages_y = Math.max(Math.floor(virtual_size.y / page_size.y), 1);
    this.page_tables_ = new PageTables(pages_x, pages_y);
    this.slot_size_ = new Mathf.Vector2(page_size.x + page_padding.x, page_size.y + page_padding.y);
    this.atlas_size_ = new Mathf.Vector2(this.slot_size_.x * slots_in_cache.x, this.slot_size_.y * slots_in_cache.y);
    this.atlas_ = GPU.Texture.Create(
      this.atlas_size_.x,
      this.atlas_size_.y,
      1,
      "rgba8unorm"
    );
  }
  IngestFeedback(feedback) {
    const requests = /* @__PURE__ */ new Map();
    for (const v of feedback) {
      const packed = v >>> 0;
      if (packed !== 4294967295) {
        const request = {
          lod: packed & 31,
          x: packed >>> 5 & 255,
          y: packed >>> 13 & 255,
          material: packed >>> 21 & 255
          // material: (packed >>> 21) & 0x7FF, // if you need it
        };
        requests.set(keyForRequest(request), request);
      }
    }
    for (const request of requests.values()) {
      this.page_cache_.Touch(request);
      if (!this.page_tables_.IsResident(request.lod, request.x, request.y) && !this.processing_.has(keyForRequest(request))) {
        console.log(request);
        this.RequestPage(request);
      }
    }
  }
  FlushUploadQueue() {
    const uploads = this.upload_queue_;
    const failures = this.failure_queue_;
    this.upload_queue_ = [];
    this.failure_queue_ = [];
    for (const f of failures) {
      this.page_cache_.Cancel(f.page_slot);
      this.processing_.delete(keyForRequest(f.request));
    }
    for (const u of uploads) {
      this.atlas_.SetSubData(
        u.image.data,
        this.slot_size_.x,
        this.slot_size_.y,
        0,
        this.slot_size_.x * u.page_slot.x,
        this.slot_size_.y * u.page_slot.y,
        0
      );
      const entry = (1 | (u.page_slot.x & 255) << 1 | (u.page_slot.y & 255) << 9) >>> 0;
      this.page_tables_.Write(u.request, entry);
      this.page_cache_.Commit(u.request, u.page_slot);
      this.processing_.delete(keyForRequest(u.request));
    }
  }
  RequestPage(request) {
    const alloc_result = this.page_cache_.Acquire(request);
    if (!alloc_result.slot) {
      console.log("No evictable slot available at the moment");
      this.processing_.delete(keyForRequest(request));
      return;
    }
    if (alloc_result.evicted) {
      this.page_tables_.Write(alloc_result.evicted, 0);
    }
    const slot = alloc_result.slot;
    `/extra/research/virtual-textures/assets/pages/${request.lod}_${request.x}_${request.y}.png`;
    this.processing_.add(keyForRequest(request));
    const data = this.ImageRequest(request);
    this.upload_queue_.push({
      request,
      page_slot: slot,
      image: data
    });
  }
  UpdatePageTables() {
    this.page_tables_.Update();
  }
  AtlasSize() {
    return this.atlas_size_;
  }
  LODs() {
    return this.page_tables_.LODs();
  }
  Atlas() {
    return this.atlas_;
  }
  PageTables() {
    return this.page_tables_.Texture();
  }
}

export { PageManager };
