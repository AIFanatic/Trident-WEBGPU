class LRUList {
  head = null;
  tail = null;
  push_front(value) {
    const node = { value, prev: null, next: this.head };
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
    return node;
  }
  move_to_front(node) {
    if (this.head === node) return;
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.tail === node) this.tail = node.prev;
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }
  remove(node) {
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (this.head === node) this.head = node.next;
    if (this.tail === node) this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }
}
function keyForRequest(request) {
  return `${request.material}|${request.lod}|${request.x}|${request.y}`;
}
class PageCache {
  free_slots_ = [];
  lru_list_ = new LRUList();
  lru_map_ = /* @__PURE__ */ new Map();
  req_to_slot_ = /* @__PURE__ */ new Map();
  capacity_;
  min_pinned_lod_idx_;
  constructor(slots, min_pinned_lod_idx) {
    this.capacity_ = slots.x * slots.y;
    this.min_pinned_lod_idx_ = min_pinned_lod_idx;
    this.free_slots_.length = 0;
    for (let y = 0; y < slots.y; ++y) {
      for (let x = 0; x < slots.x; ++x) {
        this.free_slots_.push({ x, y });
      }
    }
  }
  Commit(request, slot) {
    const key = keyForRequest(request);
    const already_resident = this.req_to_slot_.has(key);
    if (already_resident) {
      console.assert(!already_resident);
      return;
    }
    this.req_to_slot_.set(key, slot);
    const node = this.lru_list_.push_front(request);
    this.lru_map_.set(key, node);
  }
  Cancel(slot) {
    this.free_slots_.push(slot);
  }
  Touch(request) {
    if (request.lod >= this.min_pinned_lod_idx_) return;
    const key = keyForRequest(request);
    const node = this.lru_map_.get(key);
    if (node) {
      this.lru_list_.move_to_front(node);
    }
  }
  Acquire(request) {
    const key = keyForRequest(request);
    const existing = this.req_to_slot_.get(key);
    if (existing) {
      return { slot: existing, evicted: null };
    }
    if (this.free_slots_.length === 0) {
      let node = this.lru_list_.tail;
      while (node) {
        if (node.value.lod < this.min_pinned_lod_idx_) {
          break;
        }
        node = node.prev;
      }
      if (!node) {
        return { slot: null, evicted: null };
      }
      const req = node.value;
      const req_key = keyForRequest(req);
      const slot2 = this.req_to_slot_.get(req_key);
      console.assert(slot2 !== void 0);
      this.lru_list_.remove(node);
      this.lru_map_.delete(req_key);
      this.req_to_slot_.delete(req_key);
      return { slot: slot2 ?? null, evicted: req };
    }
    const slot = this.free_slots_.pop();
    return { slot, evicted: null };
  }
}

export { PageCache };
