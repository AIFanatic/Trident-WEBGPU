import { Components, GPU, SerializeField } from '@trident/core';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = array.length + 1 ;
  var initializers = (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  ((target = target.prototype), k < 5);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
      access.set = (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(void 0  , ctx), done._ = 1;
    __expectFn(it) && (initializers.unshift(it) );
  }
  return target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _IS_ISLAND_dec, _TERRAIN_SCROLL_Y_dec, _TERRAIN_SCROLL_X_dec, _WATER_HEIGHT_dec, _HEIGHT_LACUNARITY_dec, _HEIGHT_GAIN_dec, _HEIGHT_AMP_dec, _HEIGHT_OCTAVES_dec, _HEIGHT_TILES_dec, _EROSION_LACUNARITY_dec, _EROSION_GAIN_dec, _EROSION_OCTAVES_dec, _EROSION_HEIGHT_OFFSET_dec, _EROSION_CELL_SCALE_dec, _EROSION_SLOPE_POWER_dec, _EROSION_STRENGTH_dec, _EROSION_SCALE_dec, _SEED_dec, _RESOLUTION_dec, _init, _params_dec, _a, _init2;
_RESOLUTION_dec = [SerializeField], _SEED_dec = [SerializeField], _EROSION_SCALE_dec = [SerializeField], _EROSION_STRENGTH_dec = [SerializeField], _EROSION_SLOPE_POWER_dec = [SerializeField], _EROSION_CELL_SCALE_dec = [SerializeField], _EROSION_HEIGHT_OFFSET_dec = [SerializeField], _EROSION_OCTAVES_dec = [SerializeField], _EROSION_GAIN_dec = [SerializeField], _EROSION_LACUNARITY_dec = [SerializeField], _HEIGHT_TILES_dec = [SerializeField], _HEIGHT_OCTAVES_dec = [SerializeField], _HEIGHT_AMP_dec = [SerializeField], _HEIGHT_GAIN_dec = [SerializeField], _HEIGHT_LACUNARITY_dec = [SerializeField], _WATER_HEIGHT_dec = [SerializeField], _TERRAIN_SCROLL_X_dec = [SerializeField], _TERRAIN_SCROLL_Y_dec = [SerializeField], _IS_ISLAND_dec = [SerializeField];
class TerrainProceduralParams {
  constructor() {
    __publicField(this, "RESOLUTION", __runInitializers(_init, 8, this, 1024)), __runInitializers(_init, 11, this);
    __publicField(this, "SEED", __runInitializers(_init, 12, this, 0)), __runInitializers(_init, 15, this);
    __publicField(this, "EROSION_SCALE", __runInitializers(_init, 16, this, 0.08333)), __runInitializers(_init, 19, this);
    __publicField(this, "EROSION_STRENGTH", __runInitializers(_init, 20, this, 0.16)), __runInitializers(_init, 23, this);
    __publicField(this, "EROSION_SLOPE_POWER", __runInitializers(_init, 24, this, 0.6)), __runInitializers(_init, 27, this);
    __publicField(this, "EROSION_CELL_SCALE", __runInitializers(_init, 28, this, 1)), __runInitializers(_init, 31, this);
    __publicField(this, "EROSION_HEIGHT_OFFSET", __runInitializers(_init, 32, this, -0.5)), __runInitializers(_init, 35, this);
    __publicField(this, "EROSION_OCTAVES", __runInitializers(_init, 36, this, 5)), __runInitializers(_init, 39, this);
    __publicField(this, "EROSION_GAIN", __runInitializers(_init, 40, this, 0.5)), __runInitializers(_init, 43, this);
    __publicField(this, "EROSION_LACUNARITY", __runInitializers(_init, 44, this, 2)), __runInitializers(_init, 47, this);
    __publicField(this, "HEIGHT_TILES", __runInitializers(_init, 48, this, 3)), __runInitializers(_init, 51, this);
    __publicField(this, "HEIGHT_OCTAVES", __runInitializers(_init, 52, this, 3)), __runInitializers(_init, 55, this);
    __publicField(this, "HEIGHT_AMP", __runInitializers(_init, 56, this, 0.25)), __runInitializers(_init, 59, this);
    __publicField(this, "HEIGHT_GAIN", __runInitializers(_init, 60, this, 0.1)), __runInitializers(_init, 63, this);
    __publicField(this, "HEIGHT_LACUNARITY", __runInitializers(_init, 64, this, 2)), __runInitializers(_init, 67, this);
    __publicField(this, "WATER_HEIGHT", __runInitializers(_init, 68, this, 0.465)), __runInitializers(_init, 71, this);
    __publicField(this, "TERRAIN_SCROLL_X", __runInitializers(_init, 72, this, 0)), __runInitializers(_init, 75, this);
    __publicField(this, "TERRAIN_SCROLL_Y", __runInitializers(_init, 76, this, 0)), __runInitializers(_init, 79, this);
    __publicField(this, "IS_ISLAND", __runInitializers(_init, 80, this, 0)), __runInitializers(_init, 83, this);
  }
}
_init = __decoratorStart(null);
__decorateElement(_init, 5, "RESOLUTION", _RESOLUTION_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "SEED", _SEED_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_SCALE", _EROSION_SCALE_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_STRENGTH", _EROSION_STRENGTH_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_SLOPE_POWER", _EROSION_SLOPE_POWER_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_CELL_SCALE", _EROSION_CELL_SCALE_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_HEIGHT_OFFSET", _EROSION_HEIGHT_OFFSET_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_OCTAVES", _EROSION_OCTAVES_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_GAIN", _EROSION_GAIN_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "EROSION_LACUNARITY", _EROSION_LACUNARITY_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "HEIGHT_TILES", _HEIGHT_TILES_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "HEIGHT_OCTAVES", _HEIGHT_OCTAVES_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "HEIGHT_AMP", _HEIGHT_AMP_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "HEIGHT_GAIN", _HEIGHT_GAIN_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "HEIGHT_LACUNARITY", _HEIGHT_LACUNARITY_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "WATER_HEIGHT", _WATER_HEIGHT_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "TERRAIN_SCROLL_X", _TERRAIN_SCROLL_X_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "TERRAIN_SCROLL_Y", _TERRAIN_SCROLL_Y_dec, TerrainProceduralParams);
__decorateElement(_init, 5, "IS_ISLAND", _IS_ISLAND_dec, TerrainProceduralParams);
__decoratorMetadata(_init, TerrainProceduralParams);
class TerrainProcedural extends (_a = Components.Component, _params_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "runInEditMode", true);
    __publicField(this, "baseTerrainShader");
    __publicField(this, "terrainPaintShader");
    __publicField(this, "terrain");
    __publicField(this, "terrainTexture");
    __publicField(this, "materialIdMap");
    __publicField(this, "blendWeightMap");
    __publicField(this, "params", __runInitializers(_init2, 8, this, new TerrainProceduralParams())), __runInitializers(_init2, 11, this);
  }
  async Load() {
    if (this.baseTerrainShader) return;
    const COMMON = `
            struct Params {
                RESOLUTION: f32,
                SEED: f32,
                EROSION_SCALE: f32,
                EROSION_STRENGTH: f32,
                EROSION_SLOPE_POWER: f32,
                EROSION_CELL_SCALE: f32,
                EROSION_HEIGHT_OFFSET: f32,
                EROSION_OCTAVES: f32,
                EROSION_GAIN: f32,
                EROSION_LACUNARITY: f32,

                // Base height noise parameters
                HEIGHT_TILES: f32,
                HEIGHT_OCTAVES: f32,
                HEIGHT_AMP: f32,
                HEIGHT_GAIN: f32,
                HEIGHT_LACUNARITY: f32,
    
                WATER_HEIGHT: f32,

                TERRAIN_SCROLL_X: f32,
                TERRAIN_SCROLL_Y: f32,
                
                IS_ISLAND: f32
            };
            @group(0) @binding(0) var<storage, read> params: Params;
            
            const PI = 3.14159265358979;
            const DEG_TO_RAD = (PI / 180.0);

            fn seed01(seed: f32) -> f32 {
                return fract(sin(seed * 12.9898) * 43758.5453);
            }
                
            fn hash(_x: vec2<f32>) -> vec2<f32> {
                const k: vec2<f32> = vec2<f32>(0.3183099, 0.3678794);
                // let x = _x * k + k.yx;
                let x = _x * k + k.yx + seed01(params.SEED);
                return -1.0 + 2.0 * fract(16.0 * k * fract(x.x * x.y * (x.x + x.y)));
            }
            fn noised(p: vec2<f32>) -> vec3<f32> {
                var i: vec2<f32> = floor(p);
                var f: vec2<f32> = fract(p);
                var u: vec2<f32> = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
                var du: vec2<f32> = 30.0 * f * f * (f * (f - 2.0) + 1.0);
                var ga: vec2<f32> = hash(i + vec2<f32>(0.0, 0.0));
                var gb: vec2<f32> = hash(i + vec2<f32>(1.0, 0.0));
                var gc: vec2<f32> = hash(i + vec2<f32>(0.0, 1.0));
                var gd: vec2<f32> = hash(i + vec2<f32>(1.0, 1.0));
                var va: f32 = dot(ga, f - vec2<f32>(0.0, 0.0));
                var vb: f32 = dot(gb, f - vec2<f32>(1.0, 0.0));
                var vc: f32 = dot(gc, f - vec2<f32>(0.0, 1.0));
                var vd: f32 = dot(gd, f - vec2<f32>(1.0, 1.0));
                return vec3<f32>(va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd), ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * (va - vb - vc + vd) + vec2<f32>(vb, vc) - va));
            }

            fn breakupNoiseNormal(uv: vec2f) -> vec3f {
                var color = vec3(0.0);
                
                var a = 0.5;
                var f = 2.0;
                for (var i: i32 = 0; i < 8; i++)
                {
                    color += noised(uv * f) * a;
                    a *= 0.95;
                    f *= 2.0;
                }

                return color;
            }

            fn Gullies(p: vec2<f32>, slope: vec2<f32>) -> vec3<f32> {
                var sideDir: vec2<f32> = slope.yx * vec2<f32>(-1.0, 1.0) * 2.0 * PI;
                var pInt: vec2<f32> = floor(p);
                var pFrac: vec2<f32> = fract(p);
                var heightAndSlope: vec3<f32> = vec3<f32>(0.0);
                var weightSum: f32 = 0.0;
                for (var i: i32 = -1; i <= 2; i++) {
                    for (var j: i32 = -1; j <= 2; j++) {
                        var gridOffset: vec2<f32> = vec2<f32>(f32(i), f32(j));
                        var gridPoint: vec2<f32> = pInt + gridOffset;
                        var randomOffset: vec2<f32> = hash(gridPoint) * 0.5;
                        var vectorFromCellPoint: vec2<f32> = pFrac - gridOffset - randomOffset;
                        var sqrDist: f32 = dot(vectorFromCellPoint, vectorFromCellPoint);
                        var weight: f32 = max(0.0, exp(-sqrDist * 2.0) - 0.01111);
                        weightSum += weight;
                        var waveInput: f32 = dot(vectorFromCellPoint, sideDir);
                        heightAndSlope += vec3<f32>(cos(waveInput), -sin(waveInput) * sideDir) * weight;
                    }
                }
                return heightAndSlope / weightSum;
            }
            fn Erosion(p: vec2<f32>, _heightAndSlope: vec3<f32>, scale: f32, _strength: f32, slopePower: f32, cellScale: f32, octaves: i32, gain: f32, lacunarity: f32) -> vec3<f32> {
                var heightAndSlope = _heightAndSlope;
                var inputHeightAndSlope: vec3<f32> = heightAndSlope;
                var freq: f32 = 1.0 / (scale * cellScale);
                var strength = _strength;
                strength *= scale;
                for (var i: i32 = 0; i < octaves; i++) {
                    var sqrLen: f32 = dot(heightAndSlope.yz, heightAndSlope.yz);
                    var inputSlope: vec2<f32> = heightAndSlope.yz * pow(sqrLen, 0.5 * (slopePower - 1.0));
                    heightAndSlope += Gullies(p * freq, inputSlope * cellScale) * strength * vec3<f32>(1.0, freq, freq);
                    strength *= gain;
                    freq *= lacunarity;
                }
                return heightAndSlope - inputHeightAndSlope;
            }
            fn FractalNoise(p: vec2<f32>, freq: f32, octaves: i32, lacunarity: f32, gain: f32) -> vec3<f32> {
                var n: vec3<f32> = vec3<f32>(0.0);
                var nf: f32 = freq;
                var na: f32 = 1.0;
                for (var i: i32 = 0; i < octaves; i++) {
                    n += noised(p * nf) * na * vec3<f32>(1.0, nf, nf);
                    na *= gain;
                    nf *= lacunarity;
                }
                return n;
            }
            fn MagnitudeSum(octaves: i32, gain: f32) -> f32 {
                return (1.0 - pow(gain, f32(octaves))) / (1.0 - gain);
            }
            fn Heightmap(p: vec2<f32>) -> vec2<f32> {
                var n: vec3<f32> = FractalNoise(p, params.HEIGHT_TILES, i32(params.HEIGHT_OCTAVES), params.HEIGHT_LACUNARITY, params.HEIGHT_GAIN) * params.HEIGHT_AMP;
                n = n * 0.5 + vec3<f32>(0.5, 0, 0);
                var strength: f32 = params.EROSION_STRENGTH;
                strength *= smoothstep(params.WATER_HEIGHT - 0.1, params.WATER_HEIGHT + 0.1, n.x);
                var octaves: i32 = i32(params.EROSION_OCTAVES);
                var h: vec3<f32> = Erosion(p, n, params.EROSION_SCALE, strength, params.EROSION_SLOPE_POWER, params.EROSION_CELL_SCALE, octaves, params.EROSION_GAIN, params.EROSION_LACUNARITY);
                var erosionMagnitude: f32 = params.EROSION_SCALE * strength * MagnitudeSum(octaves, params.EROSION_GAIN);
                var offset: f32 = erosionMagnitude * params.EROSION_HEIGHT_OFFSET;
                return vec2<f32>(n.x + h.x + offset, h.x / erosionMagnitude);
            }
        `;
    this.baseTerrainShader = await GPU.Shader.Create({
      code: `
                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                    @location(0) uv: vec2<f32>,
                };
                
                // Full-screen triangle (covers screen with 3 verts)
                const p = array<vec2f, 3>(
                    vec2f(-1.0, -1.0),
                    vec2f( 3.0, -1.0),
                    vec2f(-1.0,  3.0)
                );
    
                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(p[vertexIndex], 0.0, 1.0);
                    output.uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
                    output.uv.y = 1.0 - output.uv.y;
                    return output;
                }
    
                ${COMMON}
    
                fn islandMask(uv: vec2f) -> f32 {
                    let d = length(uv - vec2(0.5));
                    let wobble = noised(uv * 4.0).x * 0.5;   // \xB10.05 coast variation
                    return 1.0 - smoothstep(0.25 + wobble, 0.4 + wobble, d);
                }
                    
                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                    let uv = input.uv + vec2(params.TERRAIN_SCROLL_X, params.TERRAIN_SCROLL_Y);

                    let uv1 = uv + vec2(1.0, 0.0) / params.RESOLUTION;
                    let uv2 = uv + vec2(0.0, 1.0) / params.RESOLUTION;

                    let h  = Heightmap(uv);
                    let h1 = Heightmap(uv1);
                    let h2 = Heightmap(uv2);

                    let v1 = vec3(uv1 - uv, (h1.x - h.x));
                    let v2 = vec3(uv2 - uv, (h2.x - h.x));
                    var normal = normalize(cross(v1, v2)).xzy;

                    let breakup = breakupNoiseNormal(uv);
                    normal = normalize(normal + vec3(-breakup.y, 0.0, -breakup.z) * 0.1);

                    let hx = mix(params.WATER_HEIGHT - 0.05, h.x, select(1.0, islandMask(input.uv), params.IS_ISLAND > 0.5));
                    return vec4(hx, normal.xz, h.y);
                }
                
            `,
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.terrainPaintShader = await GPU.Shader.Create({
      code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                struct VertexOutput {
                    @builtin(position) position: vec4<f32>,
                    @location(0) uv: vec2<f32>,
                };
                
                // Full-screen triangle (covers screen with 3 verts)
                const p = array<vec2f, 3>(
                    vec2f(-1.0, -1.0),
                    vec2f( 3.0, -1.0),
                    vec2f(-1.0,  3.0)
                );

                @group(1) @binding(0) var terrainTexture: texture_2d<f32>;
                @group(1) @binding(1) var terrainSampler: sampler;

                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(p[vertexIndex], 0.0, 1.0);
                    output.uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
                    output.uv.y = 1.0 - output.uv.y;
                    return output;
                }

                ${COMMON}

                struct FragmentOutput {
                    @location(0) materialIdMap: vec4f,
                    @location(1) blendWeightMap: vec4f
                };

                fn moistureMap(uv: vec2<f32>, height: f32, normalY: f32) -> f32 {
                    // Different offset so moisture is not identical to elevation noise
                    let p = uv + vec2<f32>(43.17, 91.73);

                    var m = FractalNoise( p, 2.0, 4, 2.0, 0.5).x;

                    // Convert noise from roughly -1..1 to 0..1
                    m = m * 0.5 + 0.5;

                    // Cheap terrain-aware bias:
                    // - low/coastal terrain wetter
                    // - high terrain drier
                    // - flatter terrain wetter
                    let coastWetness = 1.0 - smoothstep( params.WATER_HEIGHT, params.WATER_HEIGHT + 0.18, height);

                    let highDryness = smoothstep( params.WATER_HEIGHT + 0.25, 1.0, height);
                    let flatWetness = smoothstep( 0.55, 0.95, normalY);

                    m = m * 0.65;
                    m += coastWetness * 0.10;
                    m += flatWetness * 0.15;
                    m -= highDryness * 0.25;

                    return clamp(m, 0.0, 1.0);
                }

                fn biomeElevation(height: f32) -> f32 {
                    let minH = params.WATER_HEIGHT;

                    // Stable expected land-height range, independent of HEIGHT_AMP.
                    let biomeHeightRange = 0.135;

                    let e = (height - minH) / biomeHeightRange;
                    return clamp(e, 0.0, 1.0);
                }

                fn biomeMoisture(rawM: f32) -> f32 {
                    var m = saturate(rawM);

                    // Push values away from the middle.
                    // Higher number = more dramatic dry/wet separation.
                    m = smoothstep(0.25, 0.85, m);

                    // Make the world drier overall.
                    // > 1.0 means more desert.
                    m = pow(m, 1.8);

                    return saturate(m);
                }

                const LAYER_OCEAN     = vec4f(0.02, 0.10, 0.22, 0.0);
                const LAYER_BEACH     = vec4f(0.63, 0.56, 0.47, 1.0);
                const LAYER_DESERT    = vec4f(0.80, 0.75, 0.55, 2.0);  // temperate + subtropical desert
                const LAYER_GRASSLAND = vec4f(0.53, 0.67, 0.33, 3.0);  // bright green
                const LAYER_FOREST    = vec4f(0.40, 0.58, 0.35, 4.0);  // shrubland/taiga/deciduous/seasonal
                const LAYER_RAINFOREST= vec4f(0.20, 0.47, 0.33, 5.0);  // temperate + tropical rain forest
                const LAYER_ROCK      = vec4f(0.45, 0.45, 0.45, 6.0);  // scorched + bare
                const LAYER_TUNDRA    = vec4f(0.73, 0.73, 0.67, 7.0);
                const LAYER_SNOW      = vec4f(1.00, 1.00, 1.00, 8.0);

                fn biome(height: f32, moisture: f32) -> vec4f {
                    if (height < params.WATER_HEIGHT) { return LAYER_OCEAN; }

                    let e = biomeElevation(height);
                    let m = biomeMoisture(moisture);
                    if (e < 0.05) { return LAYER_BEACH; }

                    // High alpine
                    if (e > 0.8) {
                        if (m < 0.25) { return LAYER_ROCK; }
                        if (m < 0.55) { return LAYER_TUNDRA; }
                        return LAYER_SNOW;
                    }

                    // Upper montane
                    if (e > 0.6) {
                        if (m < 0.35) { return LAYER_ROCK; }
                        return LAYER_FOREST;
                    }

                    // Lowland + mid
                    if (m < 0.30) { return LAYER_DESERT; }
                    if (m < 0.55) { return LAYER_GRASSLAND; }
                    if (m < 0.80) { return LAYER_FOREST; }
                    return LAYER_RAINFOREST;
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> FragmentOutput {
                    let terrain = textureSample(terrainTexture, terrainSampler, input.uv);
                    var normal = terrain.yzz;
                    normal.y = sqrt(1.0 - dot(normal.xz, normal.xz));

                    let height = terrain.x;
                    
                    var output: FragmentOutput;
                    let moisture = moistureMap(input.uv, height, normal.y);
                    output.materialIdMap   = vec4f(vec3f(biome(height, moisture).w) / 255.0, 1.0);
                    // output.materialIdMap   = vec4f(vec3f(biome(height, moisture).rgb), 1.0);

                    // output.blendWeightMap  = vec4f(nW, 1.0);
                    output.blendWeightMap  = vec4f(0.5);
                    return output;
                }
            `,
      colorOutputs: [
        { format: "rgba8unorm" },
        { format: "rgba8unorm" }
      ]
    });
    this.terrainPaintShader.SetSampler("terrainSampler", new GPU.TextureSampler());
  }
  RecreateTextures(resolution) {
    if (!this.terrainTexture || !this.materialIdMap || !this.blendWeightMap || this.terrainTexture.width !== resolution || this.materialIdMap.width !== resolution || this.blendWeightMap.width !== resolution) {
      this.terrainTexture = GPU.RenderTexture.Create(resolution, resolution, 1, "rgba16float");
      this.materialIdMap = GPU.RenderTexture.Create(resolution, resolution, 1, "rgba8unorm");
      this.blendWeightMap = GPU.RenderTexture.Create(resolution, resolution, 1, "rgba8unorm");
      this.terrainTexture.name = "TerrainTexture";
      this.materialIdMap.name = "MaterialIDMap";
      this.blendWeightMap.name = "BlendHeightMap";
    }
  }
  async Generate() {
    if (!this.terrain) throw Error("Need a terrain attached");
    await this.Load();
    const resolution = this.params.RESOLUTION;
    this.RecreateTextures(resolution);
    if (this.terrain.material.pendingShaderCreation) {
      await this.terrain.material.pendingShaderCreation;
    }
    const params = new Float32Array([...Object.values(this.params), 0]);
    this.baseTerrainShader.SetArray("params", params);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass("Terrain Generator", [{ target: this.terrainTexture, clear: true }]);
    GPU.RendererContext.DrawVertex(this.baseTerrainShader, 3);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
    this.terrainPaintShader.SetTexture("terrainTexture", this.terrainTexture);
    this.terrainPaintShader.SetArray("params", params);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass("Terrain Generator", [{ target: this.materialIdMap, clear: true }, { target: this.blendWeightMap, clear: true }]);
    GPU.RendererContext.DrawVertex(this.terrainPaintShader, 3);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
    await this.terrain.terrainData.HeightmapFromTexture(this.terrainTexture, false, 1);
    this.terrain.material.materialIdMap = this.materialIdMap;
    this.terrain.material.blendWeightMap = this.blendWeightMap;
  }
}
_init2 = __decoratorStart(_a);
__decorateElement(_init2, 5, "params", _params_dec, TerrainProcedural);
__decoratorMetadata(_init2, TerrainProcedural);
__publicField(TerrainProcedural, "type", "@trident/plugins/TerrainProcedural");

export { TerrainProcedural };
