import { GPU, Mathf } from "@trident/core";
import { PageCache } from "./PageCache";
import { PageTables, PageRequest } from "./PageTables";

export interface PageSlot {
    x: number;
    y: number;
}

export interface PendingUpload {
    request: PageRequest;
    page_slot: PageSlot;
    image: ImageData;
}

export interface PendingFailure {
    request: PageRequest;
    page_slot: PageSlot;
}

const slots_in_cache = { x: 8, y: 8 };
const min_pinned_lod_idx = 4;

type LoaderResult =
    | { ok: true; value: ImageBitmap }
    | { ok: false; error: string };

class ImageLoader {
    public LoadAsync(path: string, cb: (result: LoaderResult) => void) {
        fetch(path)
            .then(res => res.blob())
            .then(blob => createImageBitmap(blob))
            .then(image => cb({ ok: true, value: image }))
            .catch(err => cb({ ok: false, error: String(err) }));
    }
}

function keyForRequest(request: PageRequest): string {
    return `${request.lod}|${request.x}|${request.y}`;
}

export class PageManager {
    private page_cache_: PageCache;
    private page_tables_: PageTables;

    private slot_size_: Mathf.Vector2 = new Mathf.Vector2(0.0, 0.0);
    private atlas_size_: Mathf.Vector2 = new Mathf.Vector2(0.0, 0.0);

    private atlas_: GPU.Texture;

    private upload_queue_: PendingUpload[] = [];
    private failure_queue_: PendingFailure[] = [];

    private loader_: ImageLoader = new ImageLoader();

    private processing_: Set<string> = new Set();

    public ImageRequest: (request: PageRequest) => ImageData;

    constructor(virtual_size: Mathf.Vector2, page_padding: Mathf.Vector2, page_size: Mathf.Vector2) {
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

        // // preload pinned pages
        // for (let lod = min_pinned_lod_idx; lod < this.LODs(); ++lod) {
        //     const rows = Math.max((virtual_size.y / this.page_size_.y) >> lod, 1);
        //     const cols = Math.max((virtual_size.x / this.page_size_.x) >> lod, 1);
        //     for (let row = 0; row < rows; row++) {
        //         for (let col = 0; col < cols; col++) {
        //             this.RequestPage({ lod, x: col, y: row });
        //         }
        //     }
        // }
    }

    public IngestFeedback(feedback: Uint32Array | number[]): void {
        const requests = new Map<string, PageRequest>();

        for (const v of feedback) {
            const packed = (v >>> 0);                // force uint32

            if (packed !== 0xFFFFFFFF) {             // sentinel
                const request: PageRequest = {
                    lod: packed & 0x1F,
                    x: (packed >>> 5) & 0xFF,
                    y: (packed >>> 13) & 0xFF,
                    material: (packed >>> 21) & 0xFF,
                    // material: (packed >>> 21) & 0x7FF, // if you need it
                };
                requests.set(keyForRequest(request), request);
            }
        }

        for (const request of requests.values()) {
            this.page_cache_.Touch(request);
            if (
                !this.page_tables_.IsResident(request.lod, request.x, request.y) &&
                !this.processing_.has(keyForRequest(request))
            ) {
                console.log(request)
                this.RequestPage(request);
            }
        }
    }

    public FlushUploadQueue(): void {
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

            const entry = (0x1 | ((u.page_slot.x & 0xFF) << 1) | ((u.page_slot.y & 0xFF) << 9)) >>> 0;

            this.page_tables_.Write(u.request, entry);
            this.page_cache_.Commit(u.request, u.page_slot);
            this.processing_.delete(keyForRequest(u.request));
        }
    }

    public RequestPage(request: PageRequest): void {
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
        // const path = `assets/pages/${request.lod}_${request.x}_${request.y}.png`;
        const path = `/extra/research/virtual-textures/assets/pages/${request.lod}_${request.x}_${request.y}.png`;
        this.processing_.add(keyForRequest(request));

        const data = this.ImageRequest(request);
        this.upload_queue_.push({
            request,
            page_slot: slot,
            image: data
        });
        // this.loader_.LoadAsync(path, (loader_result) => {
        //     if (loader_result.ok) {
        //         this.upload_queue_.push({
        //             request,
        //             page_slot: slot,
        //             image: loader_result.value
        //         });
        //     } else {
        //         console.log(loader_result.error);
        //         this.failure_queue_.push({ request, page_slot: slot });
        //     }
        // });
    }

    public UpdatePageTables(): void { this.page_tables_.Update(); }

    public AtlasSize(): Mathf.Vector2 { return this.atlas_size_; }

    public LODs(): number { return this.page_tables_.LODs(); }

    public Atlas(): GPU.Texture {
        return this.atlas_;
    }

    public PageTables(): GPU.Texture {
        return this.page_tables_.Texture();
    }
}