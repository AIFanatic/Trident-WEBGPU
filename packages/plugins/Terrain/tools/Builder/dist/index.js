(() => {
  // index.ts
  var clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  var lerp = (a, b, t) => a + (b - a) * t;
  var smooth = (t) => t * t * (3 - 2 * t);
  var smoothstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));
  var gSeed = 1337;
  function setSeed(s) {
    gSeed = s | 0 || 0;
  }
  function hash2(x, y, seed) {
    let h = x * 374761393 ^ y * 668265263 ^ seed * 1274126177;
    h = h ^ h >>> 13 | 0;
    h = Math.imul(h, 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise2D(x, y, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = x0 + 1, y1 = y0 + 1;
    const sx = smooth(x - x0), sy = smooth(y - y0);
    const n00 = hash2(x0, y0, seed), n10 = hash2(x1, y0, seed);
    const n01 = hash2(x0, y1, seed), n11 = hash2(x1, y1, seed);
    const ix0 = lerp(n00, n10, sx), ix1 = lerp(n01, n11, sx);
    return ix0 + (ix1 - ix0) * sy;
  }
  function fbm2D(x, y, oct, lac, gain, seed) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * vnoise2D(x * freq, y * freq, seed + i * 1013);
      norm += amp;
      amp *= gain;
      freq *= lac;
    }
    return sum / norm;
  }
  var BIOMES = [
    { name: 0 /* TROPICAL_FOREST */, precipitation: { min: 0.6, max: 1 }, temperature: { min: 0.5, max: 1 }, color: "#1f4d29" },
    { name: 1 /* FOREST */, precipitation: { min: 0.4, max: 0.8 }, temperature: { min: 0.2, max: 0.8 }, color: "#19f064" },
    { name: 2 /* WOODLAND */, precipitation: { min: 0.2, max: 0.5 }, temperature: { min: 0.4, max: 1 }, color: "#3e2806" },
    { name: 3 /* SAVANNA */, precipitation: { min: 0.1, max: 0.35 }, temperature: { min: 0.5, max: 1 }, color: "#fb1100" },
    { name: 4 /* DESERT */, precipitation: { min: 0, max: 0.18 }, temperature: { min: 0.2, max: 1 }, color: "#fccd4c" },
    { name: 5 /* TUNDRA */, precipitation: { min: 0, max: 0.6 }, temperature: { min: 0, max: 0.25 }, color: "#06fac1" },
    // Extra biomes (climate ranges won't be used by the LUT)
    { name: 6 /* WATER */, precipitation: { min: 0, max: 1 }, temperature: { min: 0, max: 1 }, color: "#0086c8" },
    { name: 7 /* BEACH */, precipitation: { min: 0, max: 1 }, temperature: { min: 0, max: 1 }, color: "#f2dda0" },
    { name: 8 /* SNOW */, precipitation: { min: 0, max: 1 }, temperature: { min: 0, max: 1 }, color: "#ffffff" }
  ];
  var CLIMATE_BIOME_COUNT = 6;
  function hexRGB(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
  }
  var BIOME_RGB = BIOMES.map((b) => hexRGB(b.color));
  var BIOME_LUT = (() => {
    const lut = new Int8Array(256 * 256);
    lut.fill(-1);
    for (let py = 0; py < 256; py++) {
      const temp = py / 255;
      for (let px = 0; px < 256; px++) {
        const precip = px / 255;
        let idx = -1;
        for (let b = 0; b < CLIMATE_BIOME_COUNT; b++) {
          const bb = BIOMES[b];
          if (temp >= bb.temperature.min && temp <= bb.temperature.max && precip >= bb.precipitation.min && precip <= bb.precipitation.max) {
            idx = b;
            break;
          }
        }
        lut[py << 8 | px] = idx;
      }
    }
    return lut;
  })();
  var lastCfg = null;
  var lastFields = null;
  var lastSplats = null;
  function generateSplats(cfg2, fields) {
    const { rows, cols } = cfg2;
    const { biome } = fields;
    const N = rows * cols;
    const splat0 = new Float32Array(N * 4);
    const counts = new Int16Array(BIOMES.length);
    const radius = 5;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        counts.fill(0);
        for (let ny = y - radius; ny <= y + radius; ny++) {
          if (ny < 0 || ny >= rows) continue;
          for (let nx = x - radius; nx <= x + radius; nx++) {
            if (nx < 0 || nx >= cols) continue;
            const idx = biome[ny * cols + nx];
            if (idx >= 0 && idx < BIOMES.length) {
              counts[idx]++;
            }
          }
        }
        let b0 = -1, c0 = 0;
        let b1 = -1, c1 = 0;
        let b2 = -1, c2 = 0;
        for (let b = 0; b < BIOMES.length; b++) {
          const c = counts[b];
          if (c <= 0) continue;
          if (c > c0) {
            b2 = b1;
            c2 = c1;
            b1 = b0;
            c1 = c0;
            b0 = b;
            c0 = c;
          } else if (c > c1) {
            b2 = b1;
            c2 = c1;
            b1 = b;
            c1 = c;
          } else if (c > c2) {
            b2 = b;
            c2 = c;
          }
        }
        const total = Math.max(c0 + c1 + c2, 1);
        const w0 = c0 / total;
        const w1 = c1 / total;
        const w2 = c2 / total;
        const i = y * cols + x;
        const p4 = i * 4;
        splat0[p4 + 0] = w0;
        splat0[p4 + 1] = w1;
        splat0[p4 + 2] = w2;
        splat0[p4 + 3] = 255;
      }
    }
    return { splat0 };
  }
  var lastBiomeTriplets = null;
  function computeBiomeTriplets(cfg2, fields, radius = 5) {
    const { rows, cols } = cfg2;
    const { biome } = fields;
    const out = new Uint8Array(rows * cols * 3);
    const counts = new Int16Array(BIOMES.length);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        for (let b = 0; b < BIOMES.length; b++) counts[b] = 0;
        for (let ny = y - radius; ny <= y + radius; ny++) {
          if (ny < 0 || ny >= rows) continue;
          for (let nx = x - radius; nx <= x + radius; nx++) {
            if (nx < 0 || nx >= cols) continue;
            const idx = biome[ny * cols + nx];
            if (idx >= 0 && idx < BIOMES.length) {
              counts[idx]++;
            }
          }
        }
        let best1 = -1, best2 = -1, best3 = -1;
        let c1 = 0, c2 = 0, c3 = 0;
        for (let b = 0; b < BIOMES.length; b++) {
          const c = counts[b];
          if (c <= 0) continue;
          if (c > c1) {
            best3 = best2;
            c3 = c2;
            best2 = best1;
            c2 = c1;
            best1 = b;
            c1 = c;
          } else if (c > c2) {
            best3 = best2;
            c3 = c2;
            best2 = b;
            c2 = c;
          } else if (c > c3) {
            best3 = b;
            c3 = c;
          }
        }
        const p3 = (y * cols + x) * 3;
        out[p3 + 0] = best1 >= 0 ? best1 : 255;
        out[p3 + 1] = best2 >= 0 ? best2 : 255;
        out[p3 + 2] = best3 >= 0 ? best3 : 255;
        if (out[p3 + 0] === 255 && out[p3 + 1] === 255 && out[p3 + 2] === 255) {
          throw Error("Could not find 3 neighbors");
        }
      }
    }
    return out;
  }
  setTimeout(() => {
    console.log(lastBiomeTriplets);
  }, 1e3);
  function generateFields(cfg2) {
    setSeed(cfg2.seed);
    const seedElev = cfg2.seed * 73856093 ^ 999;
    const seedTemp = cfg2.seed * 19349663 ^ 12345;
    const seedMoist = cfg2.seed * 83492791 ^ 56789;
    const { rows, cols } = cfg2;
    const N = rows * cols;
    const elev = new Float32Array(N);
    const temp = new Float32Array(N);
    const moist = new Float32Array(N);
    const biome = new Int8Array(N);
    let maxelev = 0;
    for (let y = 0; y < rows; y++) {
      const dy = y / (rows - 1) * 2 - 1;
      for (let x = 0; x < cols; x++) {
        const dx = x / (cols - 1) * 2 - 1;
        const i = y * cols + x;
        let h = fbm2D(x * cfg2.elevScale, y * cfg2.elevScale, cfg2.elevOctaves, cfg2.elevLacunarity, cfg2.elevGain, seedElev);
        const dist = Math.hypot(dx, dy);
        const curve = cfg2.elevCurve ?? 1.25;
        h = Math.pow(h, curve);
        const edgeDrop = 0.25;
        h = clamp(h * cfg2.elevStrength - edgeDrop * clamp(dist));
        elev[i] = h;
        if (dist > cfg2.islandRadius) elev[i] = 0;
        const inner = Math.max(0, cfg2.islandRadius - cfg2.islandFade);
        const outer = cfg2.islandRadius + cfg2.islandFade;
        const mask = 1 - smoothstep(inner, outer, dist);
        elev[i] = h * mask;
        maxelev = Math.max(maxelev, elev[i]);
      }
    }
    console.log("maxelev", maxelev);
    const wl = Math.max(1e-6, Math.hypot(cfg2.windX, cfg2.windY));
    const wx = cfg2.windX / wl, wy = cfg2.windY / wl;
    const updx = Math.round(-wx * 6), updy = Math.round(-wy * 6);
    for (let y = 0; y < rows; y++) {
      const lat = y / (rows - 1);
      const dLat = Math.abs(lat - 0.5) / 0.5;
      let tLat = 1 - dLat;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const tNoise = fbm2D(x * cfg2.tempScale, y * cfg2.tempScale, 4, 2, 0.5, seedTemp);
        let T = clamp(tLat * 0.85 + tNoise * 0.3);
        T = clamp(T - elev[i] * cfg2.lapsePerElev);
        let M = fbm2D(x * cfg2.moistScale, y * cfg2.moistScale, 5, 2, 0.5, seedMoist);
        const ux = (x + updx + cols) % cols;
        const uy = (y + updy + rows) % rows;
        const upI = uy * cols + ux;
        const climb = clamp(elev[i] - elev[upI]);
        M = clamp(M + 0.35 * climb - 0.25 * Math.max(0, elev[upI] - elev[i]));
        if (elev[i] < cfg2.seaLevel) M = clamp(M + 0.2);
        if (elev[i] > 0.85) M = clamp(M - 0.1);
        temp[i] = T;
        moist[i] = M;
        const lutIdx = Math.round(T * 255) << 8 | Math.round(M * 255);
        let bIdx = BIOME_LUT[lutIdx];
        if (elev[i] < cfg2.seaLevel) {
          bIdx = 6 /* WATER */;
        } else if (elev[i] < cfg2.beachLevel) {
          bIdx = 7 /* BEACH */;
        } else if (T < 0.18 && elev[i] > cfg2.snowLine) {
          bIdx = 8 /* SNOW */;
        }
        if (bIdx < 0) bIdx = 1 /* FOREST */;
        biome[i] = bIdx;
      }
    }
    return { elev, temp, moist, biome };
  }
  function render(ctx2, cfg2, fields, splats, mode2) {
    const { rows, cols, seaLevel, beachLevel, snowLine } = cfg2;
    const { elev, temp, moist, biome } = fields;
    if (ctx2.canvas.width !== cols || ctx2.canvas.height !== rows) {
      ctx2.canvas.width = cols;
      ctx2.canvas.height = rows;
    }
    const img = ctx2.createImageData(cols, rows);
    const data = img.data;
    const N = rows * cols;
    for (let i = 0, p = 0; i < N; i++, p += 4) {
      if (mode2 === "elevation") {
        const v = Math.floor(clamp(elev[i]) * 255);
        data[p] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = 255;
        continue;
      }
      if (mode2 === "temperature") {
        const v = Math.floor(clamp(temp[i]) * 255);
        data[p] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = 255;
        continue;
      }
      if (mode2 === "precipitation") {
        const v = Math.floor(clamp(moist[i]) * 255);
        data[p] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = 255;
        continue;
      }
      if (mode2 === "splat0") {
        const { splat0 } = splats;
        const p4 = i * 4;
        data[p + 0] = Math.round(splat0[p4 + 0] * 255);
        data[p + 1] = Math.round(splat0[p4 + 1] * 255);
        data[p + 2] = Math.round(splat0[p4 + 2] * 255);
        data[p + 3] = 255;
        continue;
      }
      if (mode2 === "biome_ids") {
        if (!lastBiomeTriplets) {
          lastBiomeTriplets = computeBiomeTriplets(cfg2, fields);
        }
        const p3 = i * 3;
        data[p + 0] = lastBiomeTriplets[p3 + 0];
        data[p + 1] = lastBiomeTriplets[p3 + 1];
        data[p + 2] = lastBiomeTriplets[p3 + 2];
        data[p + 3] = 255;
        continue;
      }
      const bIdx = biome[i];
      if (bIdx >= 0 && bIdx < BIOME_RGB.length) {
        const [r, g, bv] = BIOME_RGB[bIdx];
        data[p + 0] = r;
        data[p + 1] = g;
        data[p + 2] = bv;
        data[p + 3] = 255;
      } else {
        const v = 140;
        data[p + 0] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = 255;
      }
    }
    ctx2.putImageData(img, 0, 0);
  }
  var $ = (q) => document.querySelector(q);
  var canvas = $("canvas");
  var ctx = canvas.getContext("2d");
  var cfg = {
    seed: 1337,
    rows: 1024,
    cols: 1024,
    seaLevel: 0.03,
    beachLevel: 0.05,
    snowLine: 0.82,
    lapsePerElev: 0.6,
    elevScale: 6e-3,
    elevOctaves: 5,
    elevLacunarity: 2,
    elevGain: 0.5,
    elevStrength: 1,
    elevCurve: 1.25,
    tempScale: 0.012,
    moistScale: 0.016,
    windX: 1,
    windY: 0,
    islandRadius: 0.5,
    islandFade: 0.5
  };
  var mode = "biome";
  function readNumber(id) {
    return Number($(`#${id}`).value);
  }
  function readText(id) {
    return $(`#${id}`).value;
  }
  function applyUI() {
    cfg.seed = Number(readText("seed")) || 0;
    cfg.rows = readNumber("rows");
    cfg.cols = readNumber("cols");
    cfg.seaLevel = readNumber("seaLevel");
    cfg.beachLevel = readNumber("beachLevel");
    cfg.snowLine = readNumber("snowLine");
    cfg.lapsePerElev = readNumber("lapsePerElev");
    cfg.elevScale = readNumber("elevScale");
    cfg.elevOctaves = readNumber("elevOctaves");
    cfg.elevLacunarity = readNumber("elevLacunarity");
    cfg.elevStrength = readNumber("elevStrength");
    cfg.elevCurve = readNumber("elevCurve");
    cfg.elevGain = readNumber("elevGain");
    cfg.tempScale = readNumber("tempScale");
    cfg.moistScale = readNumber("moistScale");
    cfg.windX = readNumber("windX");
    cfg.windY = readNumber("windY");
    cfg.islandRadius = readNumber("islandRadius");
    cfg.islandFade = readNumber("islandFade");
    mode = $("#renderMode").value;
  }
  function regenerate() {
    applyUI();
    lastCfg = { ...cfg };
    lastFields = generateFields(cfg);
    lastSplats = generateSplats(cfg, lastFields);
    lastBiomeTriplets = computeBiomeTriplets(cfg, lastFields);
    render(ctx, cfg, lastFields, lastSplats, mode);
  }
  function recolorOnly() {
    if (lastFields && lastCfg) {
      applyUI();
      if (lastCfg.rows !== cfg.rows || lastCfg.cols !== cfg.cols) {
        regenerate();
        return;
      }
      lastCfg.seaLevel = cfg.seaLevel;
      lastCfg.beachLevel = cfg.beachLevel;
      lastCfg.snowLine = cfg.snowLine;
      render(ctx, lastCfg, lastFields, lastSplats, mode);
    } else {
      regenerate();
    }
  }
  $("#regenerate").addEventListener("click", regenerate);
  $("#reroll").addEventListener("click", () => {
    const r = Math.floor(Math.abs(Math.sin(Date.now() * 1e-3 + Math.random()) * 2147483647));
    $("#seed").value = String(r);
    regenerate();
  });
  $("#savePng").addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = `terrain_${cfg.seed}_${mode}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  });
  $("#renderMode").addEventListener("input", recolorOnly);
  [
    "seed",
    "rows",
    "cols",
    "seaLevel",
    "beachLevel",
    "snowLine",
    "elevScale",
    "elevOctaves",
    "elevLacunarity",
    "elevGain",
    "elevStrength",
    "elevCurve",
    "tempScale",
    "moistScale",
    "lapsePerElev",
    "windX",
    "windY",
    "islandRadius",
    "islandFade"
  ].forEach((id) => $(`#${id}`).addEventListener("change", regenerate));
  regenerate();
})();
