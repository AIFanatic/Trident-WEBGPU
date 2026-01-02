import { GPU } from "@trident/core";

export interface PageRequest {
    lod: number;
    x: number;
    y: number;
    material: number;
    // auto operator<=>(const PageRequest&) const = default;
};

export class PageTables {
    private tables: Array<Uint32Array<ArrayBuffer>> = [];
    private lods = 0;
    private texture: GPU.Texture;
    private pages_x: number;
    private pages_y: number;

    constructor(pages_x: number, pages_y: number) {
        // std::vector<std::vector<uint32_t>> tables_ {};
        this.pages_x = pages_x;
        this.pages_y = pages_y;

        let x = pages_x;
        let y = pages_y;
        while (true) {
            this.tables.push(new Uint32Array(x * y));

            if (x == 1 && y == 1) break;

            x = Math.max(x >> 1, 1);
            y = Math.max(y >> 1, 1);
        }

        this.lods = this.tables.length;

        this.texture = GPU.Texture.Create(pages_x, pages_y, 1, "r32uint", this.lods);
    }

    public Write(request: PageRequest, entry: number) {
        const row_width = this.pages_x >> request.lod;
        const idx = request.y * row_width + request.x;
        this.tables[request.lod][idx] = entry;
    }

    public Update() {
        for (let i = 0; i < this.lods; i++) {
            this.texture.SetSubData(this.tables[i], this.pages_x >> i, this.pages_y >> i, i);
        }
    }

    public IsResident(lod: number, page_x: number, page_y: number): boolean {
        const row_width = this.pages_x >> lod;
        const idx = page_y * row_width + page_x;
        return this.tables[lod][idx] & 1;
    }

    public LODs(): number { return this.lods; }

    public Texture(): GPU.Texture { return this.texture; }
}