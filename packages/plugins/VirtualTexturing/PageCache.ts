import { PageRequest } from "./PageTables";

export interface PageSlot {
    x: number;
    y: number;
}

export interface ResidencyDecision {
    slot: PageSlot | null;
    evicted: PageRequest | null;
}

type LRUNode = {
    value: PageRequest;
    prev: LRUNode | null;
    next: LRUNode | null;
};

class LRUList {
    public head: LRUNode | null = null;
    public tail: LRUNode | null = null;

    public push_front(value: PageRequest): LRUNode {
        const node: LRUNode = { value, prev: null, next: this.head };
        if (this.head) this.head.prev = node;
        this.head = node;
        if (!this.tail) this.tail = node;
        return node;
    }

    public move_to_front(node: LRUNode) {
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

    public remove(node: LRUNode) {
        if (node.prev) node.prev.next = node.next;
        if (node.next) node.next.prev = node.prev;
        if (this.head === node) this.head = node.next;
        if (this.tail === node) this.tail = node.prev;
        node.prev = null;
        node.next = null;
    }
}

function keyForRequest(request: PageRequest): string {
    return `${request.material}|${request.lod}|${request.x}|${request.y}`;
}

export class PageCache {
    private free_slots_: PageSlot[] = [];

    private lru_list_ = new LRUList();

    private lru_map_ = new Map<string, LRUNode>();
    private req_to_slot_ = new Map<string, PageSlot>();

    private capacity_: number;

    private min_pinned_lod_idx_: number;

    constructor(slots: { x: number; y: number }, min_pinned_lod_idx: number) {
        this.capacity_ = slots.x * slots.y;
        this.min_pinned_lod_idx_ = min_pinned_lod_idx;

        this.free_slots_.length = 0;
        //   this.free_slots_.reserve?.(this.capacity_);
        for (let y = 0; y < slots.y; ++y) {
            for (let x = 0; x < slots.x; ++x) {
                this.free_slots_.push({ x, y });
            }
        }
    }

    public Commit(request: PageRequest, slot: PageSlot): void {
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

    public Cancel(slot: PageSlot): void {
        this.free_slots_.push(slot);
    }

    public Touch(request: PageRequest): void {
        if (request.lod >= this.min_pinned_lod_idx_) return; // no-op for pinned lods
        const key = keyForRequest(request);
        const node = this.lru_map_.get(key);
        if (node) {
            this.lru_list_.move_to_front(node);
        }
    }

    public Acquire(request: PageRequest): ResidencyDecision {
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

            const slot = this.req_to_slot_.get(req_key);
            console.assert(slot !== undefined);

            this.lru_list_.remove(node);
            this.lru_map_.delete(req_key);
            this.req_to_slot_.delete(req_key);

            return { slot: slot ?? null, evicted: req };
        }

        const slot = this.free_slots_.pop()!;
        return { slot, evicted: null };
    }
}