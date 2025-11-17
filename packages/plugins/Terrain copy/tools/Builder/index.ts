// ======================= FAST, SINGLE-PASS GENERATOR =======================

// ---------- small utils ----------
const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const smoothstep = (a: number, b: number, x: number) => smooth(clamp((x - a) / (b - a)));

// ---------- seedable RNG for determinism ----------
let gSeed = 1337;
function setSeed(s: number) { gSeed = (s | 0) || 0; }
function frand() { return ((((Math.sin((gSeed++) * 12.9898) * 43758.5453) % 1) + 1) * 0.5); }

// ---------- value noise + fbm (fast & adequate) ----------
// ---- FAST integer hash (0..1), no trig ----
function hash2(x: number, y: number, seed: number) {
    // floor coords only are passed in vnoise; keep ints
    let h = (x * 374761393) ^ (y * 668265263) ^ (seed * 1274126177);
    h = (h ^ (h >>> 13)) | 0;
    h = Math.imul(h, 1274126177);
    h ^= h >>> 16;
    // convert to [0,1)
    return (h >>> 0) / 4294967296;
}

// value noise w/ the new hash (unchanged interface)
function vnoise2D(x: number, y: number, seed: number) {
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = x0 + 1, y1 = y0 + 1;
    const sx = smooth(x - x0), sy = smooth(y - y0);
    const n00 = hash2(x0, y0, seed), n10 = hash2(x1, y0, seed);
    const n01 = hash2(x0, y1, seed), n11 = hash2(x1, y1, seed);
    const ix0 = lerp(n00, n10, sx), ix1 = lerp(n01, n11, sx);
    return ix0 + (ix1 - ix0) * sy;
}

// fbm (unchanged), but small micro-opts
function fbm2D(x: number, y: number, oct: number, lac: number, gain: number, seed: number) {
    let amp = 0.5, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
        sum += amp * vnoise2D(x * freq, y * freq, seed + i * 1013);
        norm += amp; amp *= gain; freq *= lac;
    }
    return sum / norm;
}

// ---------- biome table ----------
enum BIOME {
    TROPICAL_FOREST,
    FOREST,
    WOODLAND,
    SAVANNA,
    DESERT,
    TUNDRA,
    WATER,
    BEACH,
    SNOW,
}

type BiomeType = { name: BIOME; precipitation: { min: number, max: number }; temperature: { min: number, max: number }; color: string; };

const BIOMES: BiomeType[] = [
    { name: BIOME.TROPICAL_FOREST, precipitation: { min: 0.60, max: 1.00 }, temperature:   { min: 0.50, max: 1.00 }, color: "#1f4d29"},
    { name: BIOME.FOREST,         precipitation: { min: 0.40, max: 0.80 }, temperature:   { min: 0.20, max: 0.80 }, color: "#19f064" },
    { name: BIOME.WOODLAND,       precipitation: { min: 0.20, max: 0.50 }, temperature:   { min: 0.40, max: 1.00 }, color: "#3e2806" },
    { name: BIOME.SAVANNA,        precipitation: { min: 0.10, max: 0.35 }, temperature:   { min: 0.50, max: 1.00 }, color: "#fb1100" },
    { name: BIOME.DESERT,         precipitation: { min: 0.00, max: 0.18 }, temperature:   { min: 0.20, max: 1.00 }, color: "#fccd4c" },
    { name: BIOME.TUNDRA,         precipitation: { min: 0.00, max: 0.60 }, temperature:   { min: 0.00, max: 0.25 }, color: "#06fac1" },

    // Extra biomes (climate ranges won't be used by the LUT)
    { name: BIOME.WATER,          precipitation: { min: 0.00, max: 1.00 }, temperature:   { min: 0.00, max: 1.00 }, color: "#0086c8" },
    { name: BIOME.BEACH,          precipitation: { min: 0.00, max: 1.00 }, temperature:   { min: 0.00, max: 1.00 }, color: "#f2dda0" },
    { name: BIOME.SNOW,           precipitation: { min: 0.00, max: 1.00 }, temperature:   { min: 0.00, max: 1.00 }, color: "#ffffff" },
];

// how many “climate” biomes are used in the LUT
const CLIMATE_BIOME_COUNT   = 6;

function hexRGB(hex: string) {
    return [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ] as [number, number, number];
}
const BIOME_RGB = BIOMES.map(b => hexRGB(b.color));

const BIOME_LUT: Int8Array = (() => {
    const lut = new Int8Array(256 * 256); 
    lut.fill(-1);

    for (let py = 0; py < 256; py++) {
        const temp = py / 255;
        for (let px = 0; px < 256; px++) {
            const precip = px / 255;
            let idx = -1;

            // NOTE: only scan “real” climate biomes, exclude water/beach/snow.
            for (let b = 0; b < CLIMATE_BIOME_COUNT; b++) {
                const bb = BIOMES[b];
                if (temp >= bb.temperature.min && temp <= bb.temperature.max &&
                    precip >= bb.precipitation.min && precip <= bb.precipitation.max) {
                    idx = b; 
                    break;
                }
            }
            lut[(py << 8) | px] = idx;
        }
    }
    return lut;
})();

// Soft membership of (T, M) in each biome.
// Returns an array of weights.length == BIOMES.length
function biomeWeights(T: number, M: number): Float32Array {
    const W = new Float32Array(BIOMES.length);

    for (let b = 0; b < BIOMES.length; b++) {
        const bb = BIOMES[b];

        // expand ranges slightly so they overlap a bit
        const tMin = bb.temperature.min;
        const tMax = bb.temperature.max;
        const mMin = bb.precipitation.min;
        const mMax = bb.precipitation.max;

        // if completely outside, weight = 0
        if (T < tMin || T > tMax || M < mMin || M > mMax) {
            W[b] = 0;
            continue;
        }

        // simple triangular falloff inside the range
        const tMid = 0.5 * (tMin + tMax);
        const mMid = 0.5 * (mMin + mMax);

        const tHalf = 0.5 * (tMax - tMin);
        const mHalf = 0.5 * (mMax - mMin);

        const dt = Math.abs(T - tMid) / (tHalf + 1e-6); // 0 at center, 1 at edge
        const dm = Math.abs(M - mMid) / (mHalf + 1e-6);

        // clamp so at edges weight goes to ~0
        const wt = clamp(1 - dt);
        const wm = clamp(1 - dm);

        // combine temp & moist membership
        W[b] = wt * wm;
    }

    // normalize to sum ≤ 1
    let sum = 0;
    for (let i = 0; i < W.length; i++) sum += W[i];
    if (sum > 0) {
        const inv = 1 / sum;
        for (let i = 0; i < W.length; i++) W[i] *= inv;
    }

    return W;
}

// ---------- config & state ----------
type RenderMode = "biome" | "elevation" | "temperature" | "precipitation" | "splat0" | "biome_ids";
interface FastConfig {
    seed: number;
    rows: number; cols: number;
    seaLevel: number; beachLevel: number; snowLine: number; lapsePerElev: number;
    elevScale: number; elevOctaves: number; elevLacunarity: number; elevGain: number;
    elevStrength: number; elevCurve: number;
    tempScale: number; moistScale: number;
    windX: number; windY: number;
    islandRadius: number; islandFade: number;
}
interface Fields { elev: Float32Array; temp: Float32Array; moist: Float32Array; biome: Int8Array; }

let lastCfg: FastConfig | null = null;
let lastFields: Fields | null = null;
let lastSplats: SplatMaps | null = null;

interface SplatMaps {
    // 2 × RGBA float images, size = rows * cols
    // layout: [R,G,B,A, R,G,B,A, ...]
    splat0: Float32Array; // layers 0,1,2,x
}

function generateSplats(cfg: FastConfig, fields: Fields): SplatMaps {
    const { rows, cols } = cfg;
    const { biome } = fields;
    const N = rows * cols;

    const splat0 = new Float32Array(N * 4);
    const counts = new Int16Array(BIOMES.length);

    const radius = 5; // larger radius = softer transitions

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // reset counts
            counts.fill(0);

            // accumulate neighbors
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

            // find top 3 and their counts
            let b0 = -1, c0 = 0;
            let b1 = -1, c1 = 0;
            let b2 = -1, c2 = 0;

            for (let b = 0; b < BIOMES.length; b++) {
                const c = counts[b];
                if (c <= 0) continue;
                if (c > c0) {
                    b2 = b1; c2 = c1;
                    b1 = b0; c1 = c0;
                    b0 = b;  c0 = c;
                } else if (c > c1) {
                    b2 = b1; c2 = c1;
                    b1 = b;  c1 = c;
                } else if (c > c2) {
                    b2 = b;  c2 = c;
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
            splat0[p4 + 3] = 255; // unused or 1.0 if you like
        }
    }

    return { splat0 };
}

let lastBiomeTriplets: Uint8Array | null = null;
function computeBiomeTriplets(cfg: FastConfig, fields: Fields, radius = 5): Uint8Array {
    const { rows, cols } = cfg;
    const { biome } = fields;

    // 3 bytes per pixel (R,G,B) = up to 3 biomes
    const out = new Uint8Array(rows * cols * 3);

    // small and reused: one counter per biome type
    const counts = new Int16Array(BIOMES.length);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // reset counts
            for (let b = 0; b < BIOMES.length; b++) counts[b] = 0;

            // accumulate neighbor biome counts
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

            // find top 3 distinct biomes by count
            let best1 = -1, best2 = -1, best3 = -1;
            let c1 = 0, c2 = 0, c3 = 0;

            for (let b = 0; b < BIOMES.length; b++) {
                const c = counts[b];
                if (c <= 0) continue;

                if (c > c1) {
                    best3 = best2; c3 = c2;
                    best2 = best1; c2 = c1;
                    best1 = b;     c1 = c;
                } else if (c > c2) {
                    best3 = best2; c3 = c2;
                    best2 = b;     c2 = c;
                } else if (c > c3) {
                    best3 = b;     c3 = c;
                }
            }

            const p3 = (y * cols + x) * 3;

            // Encode biome indices directly in 0..255.
            // If we don't have enough distinct biomes, fill with 255 as "none".
            out[p3 + 0] = best1 >= 0 ? best1 : 255;
            out[p3 + 1] = best2 >= 0 ? best2 : 255;
            out[p3 + 2] = best3 >= 0 ? best3 : 255;

            if (out[p3 + 0] === 255 && out[p3 + 1] === 255 && out[p3 + 2] === 255) {
                throw Error("Could not find 3 neighbors")

            }
        }
    }

    return out;
}

setTimeout(() => {
    
    console.log(lastBiomeTriplets)
}, 1000);

// ---------- core compute: whole map in one go ----------
function generateFields(cfg: FastConfig): Fields {
    setSeed(cfg.seed);
    const seedElev = (cfg.seed * 73856093) ^ 999;
    const seedTemp = (cfg.seed * 19349663) ^ 12345;
    const seedMoist = (cfg.seed * 83492791) ^ 56789;

    const { rows, cols } = cfg;
    const N = rows * cols;

    const elev = new Float32Array(N);
    const temp = new Float32Array(N);
    const moist = new Float32Array(N);
    const biome = new Int8Array(N);

    let maxelev = 0;

    // elevation pass + soft continent bias
    for (let y = 0; y < rows; y++) {
        const dy = (y / (rows - 1)) * 2 - 1;
        for (let x = 0; x < cols; x++) {
            const dx = (x / (cols - 1)) * 2 - 1;
            const i = y * cols + x;
            let h = fbm2D(x * cfg.elevScale, y * cfg.elevScale, cfg.elevOctaves, cfg.elevLacunarity, cfg.elevGain, seedElev);
            const dist = Math.hypot(dx, dy);
            const curve = cfg.elevCurve ?? 1.25;
            h = Math.pow(h, curve);

            // optional: tweak how much the center bias hurts
            const edgeDrop = 0.25; // or make this cfg.edgeDrop
            h = clamp(h * cfg.elevStrength - edgeDrop * clamp(dist));
            elev[i] = h;

            if (dist > cfg.islandRadius) elev[i] = 0;

            // radial fade mask: 1 inside `inner`, 0 outside `outer`, smooth in between
            const inner = Math.max(0, cfg.islandRadius - cfg.islandFade);
            const outer = cfg.islandRadius + cfg.islandFade;
            const mask = 1 - smoothstep(inner, outer, dist);
            elev[i] = h * mask;

            maxelev = Math.max(maxelev, elev[i]);
        }
    }

    console.log("maxelev", maxelev)

    // precompute upwind offset for orographic check
    const wl = Math.max(1e-6, Math.hypot(cfg.windX, cfg.windY));
    const wx = cfg.windX / wl, wy = cfg.windY / wl;
    const updx = Math.round(-wx * 6), updy = Math.round(-wy * 6);

    for (let y = 0; y < rows; y++) {
        const lat = y / (rows - 1);
        const dLat = Math.abs(lat - 0.5) / 0.5; // 0 at equator .. 1 at poles
        let tLat = 1 - dLat;

        for (let x = 0; x < cols; x++) {
            const i = y * cols + x;

            // temperature
            const tNoise = fbm2D(x * cfg.tempScale, y * cfg.tempScale, 4, 2, 0.5, seedTemp);
            let T = clamp(tLat * 0.85 + tNoise * 0.3);
            T = clamp(T - elev[i] * cfg.lapsePerElev);

            // moisture + crude rain shadow
            let M = fbm2D(x * cfg.moistScale, y * cfg.moistScale, 5, 2, 0.5, seedMoist);
            const ux = (x + updx + cols) % cols;
            const uy = (y + updy + rows) % rows;
            const upI = uy * cols + ux;
            const climb = clamp(elev[i] - elev[upI]);
            M = clamp(M + 0.35 * climb - 0.25 * Math.max(0, elev[upI] - elev[i]));
            if (elev[i] < cfg.seaLevel) M = clamp(M + 0.2);
            if (elev[i] > 0.85) M = clamp(M - 0.1);

            temp[i] = T;
            moist[i] = M;

            const lutIdx = (Math.round(T * 255) << 8) | Math.round(M * 255);
            let bIdx = BIOME_LUT[lutIdx];

            // Elevation/temperature overrides for water, beach, snow
            if (elev[i] < cfg.seaLevel) {
                bIdx = BIOME.WATER;
            } else if (elev[i] < cfg.beachLevel) {
                bIdx = BIOME.BEACH;
            } else if (T < 0.18 && elev[i] > cfg.snowLine) {
                bIdx = BIOME.SNOW;
            }

            // If still -1 for some reason, fall back to Forest or whatever you like
            if (bIdx < 0) bIdx = BIOME.FOREST;

            biome[i] = bIdx;
        }
    }

    return { elev, temp, moist, biome };
}

// ---------- render (no recompute required for mode switch) ----------
function blurImageDataWithFilter(ctx, imageData: ImageData, blurPx: number) {
    const canvas = ctx.canvas;

    // 1. Put ImageData into an offscreen canvas
    const tmp = document.createElement('canvas');
    tmp.width  = canvas.width;
    tmp.height = canvas.height;
    const tctx = tmp.getContext('2d');
    tctx.putImageData(imageData, 0, 0);

    // 2. Draw from the offscreen canvas to the main one with a blur filter
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `blur(${blurPx}px)`;
    ctx.drawImage(tmp, 0, 0);
    ctx.filter = 'none';
}

function render(ctx: CanvasRenderingContext2D, cfg: FastConfig, fields: Fields, splats: SplatMaps, mode: RenderMode) {
    const { rows, cols, seaLevel, beachLevel, snowLine } = cfg;
    const { elev, temp, moist, biome } = fields;

    if (ctx.canvas.width !== cols || ctx.canvas.height !== rows) {
        ctx.canvas.width = cols; ctx.canvas.height = rows; // pixel-perfect; scale via CSS
    }

    const img = ctx.createImageData(cols, rows);
    const data = img.data;

    const N = rows * cols;
    for (let i = 0, p = 0; i < N; i++, p += 4) {
        if (mode === "elevation") {
            const v = Math.floor(clamp(elev[i]) * 255);
            data[p] = v; data[p + 1] = v; data[p + 2] = v; data[p + 3] = 255; continue;
        }
        if (mode === "temperature") {
            const v = Math.floor(clamp(temp[i]) * 255);
            data[p] = v; data[p + 1] = v; data[p + 2] = v; data[p + 3] = 255; continue;
        }
        if (mode === "precipitation") {
            const v = Math.floor(clamp(moist[i]) * 255);
            data[p] = v; data[p + 1] = v; data[p + 2] = v; data[p + 3] = 255; continue;
        }
        if (mode === "splat0") {
            const { splat0 } = splats;
            const p4 = i * 4;
            data[p + 0] = Math.round(splat0[p4 + 0] * 255);
            data[p + 1] = Math.round(splat0[p4 + 1] * 255);
            data[p + 2] = Math.round(splat0[p4 + 2] * 255);
            data[p + 3] = 255;
            continue;
        }
        if (mode === "biome_ids") {
            
            if (!lastBiomeTriplets) {
                // safety: compute on-demand if somehow missing
                lastBiomeTriplets = computeBiomeTriplets(cfg, fields);
            }

            const p3 = i * 3;
            data[p + 0] = lastBiomeTriplets[p3 + 0]; // primary biome index
            data[p + 1] = lastBiomeTriplets[p3 + 1]; // secondary biome index
            data[p + 2] = lastBiomeTriplets[p3 + 2]; // tertiary biome index
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

    ctx.putImageData(img, 0, 0);

    // blurImageDataWithFilter(ctx, img, 6);
}

// ======================= UI / KNOBS =======================
type Mode = "biome" | "elevation" | "temperature" | "precipitation";
const $ = <T extends HTMLElement>(q: string) => document.querySelector(q) as T;

const canvas = $("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const cfg: FastConfig = {
    seed: 1337,
    rows: 1024, cols: 1024,
    seaLevel: 0.03, beachLevel: 0.05, snowLine: 0.82, lapsePerElev: 0.6,
    elevScale: 0.006, elevOctaves: 5, elevLacunarity: 2, elevGain: 0.5,
    elevStrength: 1.0, elevCurve: 1.25,
    tempScale: 0.012, moistScale: 0.016,
    windX: 1, windY: 0,
    islandRadius: 0.5, islandFade: 0.5
};

let mode: Mode = "biome";

function readNumber(id: string) { return Number(($<HTMLInputElement>(`#${id}`)).value); }
function readText(id: string) { return ($<HTMLInputElement>(`#${id}`)).value; }
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
    cfg.elevCurve    = readNumber("elevCurve");
    cfg.elevGain = readNumber("elevGain");

    cfg.tempScale = readNumber("tempScale");
    cfg.moistScale = readNumber("moistScale");

    cfg.windX = readNumber("windX");
    cfg.windY = readNumber("windY");

    cfg.islandRadius = readNumber("islandRadius");
    cfg.islandFade = readNumber("islandFade");

    mode = ($<HTMLSelectElement>("#renderMode")).value as Mode;

}

function regenerate() {
    applyUI();
    lastCfg = { ...cfg };
    lastFields = generateFields(cfg);    // single full compute
    lastSplats = generateSplats(cfg, lastFields);
    lastBiomeTriplets = computeBiomeTriplets(cfg, lastFields);
    render(ctx, cfg, lastFields, lastSplats, mode);  // one draw
}

function recolorOnly() {
    if (lastFields && lastCfg) {
        applyUI();
        // If rows/cols changed, we must regenerate
        if (lastCfg.rows !== cfg.rows || lastCfg.cols !== cfg.cols) {
            regenerate(); return;
        }
        // Otherwise just recolor with new overrides/sea/snow & mode
        lastCfg.seaLevel = cfg.seaLevel;
        lastCfg.beachLevel = cfg.beachLevel;
        lastCfg.snowLine = cfg.snowLine;
        render(ctx, lastCfg, lastFields, lastSplats, mode);
    } else {
        regenerate();
    }
}

// wire up controls
$("#regenerate")!.addEventListener("click", regenerate);
$("#reroll")!.addEventListener("click", () => {
    // quick 32-bit-ish reroll
    const r = Math.floor(Math.abs(Math.sin(Date.now() * 0.001 + Math.random()) * 2147483647));
    ($<HTMLInputElement>("#seed")).value = String(r);
    regenerate();
});
$("#savePng")!.addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = `terrain_${cfg.seed}_${mode}.png`;
    a.href = (canvas as HTMLCanvasElement).toDataURL("image/png");
    a.click();
});

// live recolor when just changing view/thresholds
$("#renderMode")!.addEventListener("input", recolorOnly);

// anything that affects fields needs full regenerate on change
[
    "seed", "rows", "cols",
    "seaLevel", "beachLevel", "snowLine",
    "elevScale", "elevOctaves", "elevLacunarity", "elevGain",
    "elevStrength", "elevCurve",
    "tempScale", "moistScale", "lapsePerElev", "windX", "windY", "islandRadius", "islandFade"
].forEach(id => $(`#${id}`)!.addEventListener("change", regenerate));

// initial draw
regenerate();
