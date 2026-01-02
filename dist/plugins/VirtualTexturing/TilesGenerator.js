class TilesGenerator {
  static canvas = document.createElement("canvas");
  static ctx = TilesGenerator.canvas.getContext("2d", { willReadFrequently: true });
  static imageBitmapToImageData(bitmap) {
    this.canvas.width = bitmap.width;
    this.canvas.height = bitmap.height;
    this.ctx.drawImage(bitmap, 0, 0);
    return this.ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  }
  static copy(img) {
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.putImageData(img, 0, 0);
    return this.ctx.getImageData(0, 0, img.width, img.height);
  }
  static resize(img, w, h, filter) {
    const smoothing = filter !== "nearest";
    const src = document.createElement("canvas");
    src.width = img.width;
    src.height = img.height;
    src.getContext("2d", { willReadFrequently: true }).putImageData(img, 0, 0);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = smoothing;
    this.ctx.drawImage(src, 0, 0, w, h);
    return this.ctx.getImageData(0, 0, w, h);
  }
  static tilesForLevel(img, lod, tileW, tileH, pad) {
    const width = img.width;
    const height = img.height;
    const tiles_x = Math.floor(width / tileW);
    const tiles_y = Math.floor(height / tileH);
    const out_w = tileW + 2 * pad;
    const out_h = tileH + 2 * pad;
    const tiles = [];
    for (let ty = 0; ty < tiles_y; ty++) {
      for (let tx = 0; tx < tiles_x; tx++) {
        const base_x = tx * tileW - pad;
        const base_y = ty * tileH - pad;
        const tile = new ImageData(out_w, out_h);
        for (let j = 0; j < out_h; j++) {
          const sy = Math.max(0, Math.min(base_y + j, height - 1));
          for (let i = 0; i < out_w; i++) {
            const sx = Math.max(0, Math.min(base_x + i, width - 1));
            const si = (sy * width + sx) * 4;
            const di = (j * out_w + i) * 4;
            tile.data[di] = img.data[si];
            tile.data[di + 1] = img.data[si + 1];
            tile.data[di + 2] = img.data[si + 2];
            tile.data[di + 3] = img.data[si + 3];
          }
        }
        tiles.push({ lod, tile_x: tx, tile_y: ty, data: tile });
      }
    }
    return tiles;
  }
  static generate(img, tileW, tileH, pad = 0, filter = "box") {
    const inW = img.width, inH = img.height;
    if (tileW <= 0 || tileH <= 0) throw new Error("tile size must be positive");
    if (inW % tileW || inH % tileH) throw new Error("image must be divisible by tile size");
    if (pad < 0) throw new Error("padding must be non-negative");
    let current_image = this.copy(img);
    let current_width = current_image.width;
    let current_height = current_image.height;
    let lod = 0;
    const all = [];
    while (true) {
      all.push(...this.tilesForLevel(current_image, lod, tileW, tileH, pad));
      if (current_width === tileW || current_height === tileH) break;
      const nw = current_width / 2 | 0, nh = current_height / 2 | 0;
      if (nw < tileW || nh < tileH) break;
      current_image = this.resize(current_image, nw, nh, filter);
      current_width = nw;
      current_height = nh;
      lod++;
    }
    return all;
  }
}

export { TilesGenerator };
