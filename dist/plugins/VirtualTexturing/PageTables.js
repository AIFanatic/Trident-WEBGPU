import { GPU } from '@trident/core';

class PageTables {
  tables = [];
  lods = 0;
  texture;
  pages_x;
  pages_y;
  constructor(pages_x, pages_y) {
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
  Write(request, entry) {
    const row_width = this.pages_x >> request.lod;
    const idx = request.y * row_width + request.x;
    this.tables[request.lod][idx] = entry;
  }
  Update() {
    for (let i = 0; i < this.lods; i++) {
      this.texture.SetSubData(this.tables[i], this.pages_x >> i, this.pages_y >> i, i);
    }
  }
  IsResident(lod, page_x, page_y) {
    const row_width = this.pages_x >> lod;
    const idx = page_y * row_width + page_x;
    return this.tables[lod][idx] & 1;
  }
  LODs() {
    return this.lods;
  }
  Texture() {
    return this.texture;
  }
}

export { PageTables };
