// Based on https://www.shadertoy.com/view/33cXW8

import { Components, GPU, SerializeField } from "@trident/core";
import { Terrain } from "@trident/plugins/Terrain/Terrain";

class TerrainProceduralParams {
    @SerializeField public RESOLUTION = 1024;

    @SerializeField public SEED = 0;
    // The overall erosion scale.
    // This is the most important parameter to get right first when applying the erosion
    // filter to a height function. Try with the width of a mountain divided by five to ten.
    // Value changes can cause abrupt changes in output, especially far away from the origin,
    // so this parameter is not well suited for animation or for modulation by other functions.
    @SerializeField public EROSION_SCALE = 0.08333;

    // The depth of the gullies created.
    // The erosion strength is relative to the erosion scale, and values between 0 and 0.5
    // usually produce good results.
    @SerializeField public EROSION_STRENGTH = 0.16;

    // The frequency of gullies is based on the slope length raised to the slope power.
    // Note that at sufficiently low gully frequencies, the depth decreases too, since cosine
    // wave peaks from different cells blend together. This means gullies effectively disappear
    // at flat slopes, such as at mountain peaks. The slope power controls the falloff.
    //
    // 1.0 : Produces smooth mountain peaks and ridges.
    // 0.5 : Produces shaper mountain peaks and ridges.
    @SerializeField public EROSION_SLOPE_POWER = 0.6;

    // Gullies are based on stripes within Voronoi-like cells. The cell scale is relative to
    // the overall erosion scale, and values close to 1 usually produce good results. Smaller
    // values produce more grainy gullies while larger values produce longer unbroken gullies.
    // Tiny values make erosion disappear while huge values produce chaotic curved gullies.
    // Value changes can cause abrupt changes in output, especially far away from the origin,
    // so this parameter is not well suited for animation or for modulation by other functions.
    @SerializeField public EROSION_CELL_SCALE = 1.0;

    // A value between -1.0 and 1.0 which controls the degree to which the erosion raises or
    // lowers the terrain height.
    //
    // -1.0 : Only lowers the terrain.
    // -0.5 : Mostly lowers the terrain, but peaks may be slightly raised.
    //  0.0 : In theory neutral, but in practise it raises more than lowers.
    //  1.0 : Only raises the terrain.
    @SerializeField public EROSION_HEIGHT_OFFSET = -0.5;

    @SerializeField public EROSION_OCTAVES = 5;

    @SerializeField public EROSION_GAIN = 0.5;

    @SerializeField public EROSION_LACUNARITY = 2.0;

    // Base height noise parameters
    @SerializeField public HEIGHT_TILES = 3.0;
    @SerializeField public HEIGHT_OCTAVES = 3.0;
    @SerializeField public HEIGHT_AMP = 0.25;
    // @SerializeField public HEIGHT_AMP = 1,
    @SerializeField public HEIGHT_GAIN = 0.1;
    @SerializeField public HEIGHT_LACUNARITY = 2.0;

    @SerializeField public WATER_HEIGHT = 0.465;
    @SerializeField public TERRAIN_SCROLL_X = 0;
    @SerializeField public TERRAIN_SCROLL_Y = 0;

    @SerializeField public IS_ISLAND = 0;
}

export class TerrainProcedural extends Components.Component {
    public runInEditMode: boolean = true;
    public static type = "@trident/plugins/TerrainProcedural";

    private baseTerrainShader: GPU.Shader;
    private terrainPaintShader: GPU.Shader;

    public terrain: Terrain;

    private terrainTexture: GPU.RenderTexture;
    private materialIdMap: GPU.RenderTexture;
    private blendWeightMap: GPU.RenderTexture;

    @SerializeField public params = new TerrainProceduralParams();

    private async Load() {
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
        `
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
                    let wobble = noised(uv * 4.0).x * 0.5;   // ±0.05 coast variation
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
        })


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
                { format: "rgba8unorm" },
            ],
        })

        this.terrainPaintShader.SetSampler("terrainSampler", new GPU.TextureSampler());
    }

    private RecreateTextures(resolution: number) {
        if (!this.terrainTexture || !this.materialIdMap || !this.blendWeightMap ||
            this.terrainTexture.width !== resolution || this.materialIdMap.width !== resolution ||
            this.blendWeightMap.width !== resolution
        ) {
            this.terrainTexture = GPU.RenderTexture.Create(resolution, resolution, 1, "rgba16float");
            this.materialIdMap = GPU.RenderTexture.Create(resolution, resolution, 1, "rgba8unorm");
            this.blendWeightMap = GPU.RenderTexture.Create(resolution, resolution, 1, "rgba8unorm");

            this.terrainTexture.name = "TerrainTexture";
            this.materialIdMap.name = "MaterialIDMap";
            this.blendWeightMap.name = "BlendHeightMap";
        }
    }

    public async Generate() {
        if (!this.terrain) throw Error("Need a terrain attached");

        await this.Load();

        const resolution = this.params.RESOLUTION;

        this.RecreateTextures(resolution);
        // TODO: This is silly, here because TerrainMaterial does createShader in the constructor, no await...
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