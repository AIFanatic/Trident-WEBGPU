import {
    Geometry,
    Mathf,
    GPU,
} from "@trident/core";
import { SMAATextures } from "./resources/SMAATextures";

// Ultra preset
const SMAA_THRESHOLD = 0.1;
const SMAA_MAX_SEARCH_STEPS = 16;
const SMAA_CORNER_ROUNDING = 25;

export class PostProcessingSMAA extends GPU.RenderPass {
    public name: string = "SMAA";
    public enabled = true;
    private edgeDetectionPass: GPU.Shader;
    private weightsShader: GPU.Shader;
    private blendShader: GPU.Shader;

    private quadGeometry: Geometry;

    private edgeTex: GPU.RenderTexture;
    private weightsTex: GPU.RenderTexture;
    private blendTex: GPU.RenderTexture;

    // private sampleTexture: GPU.RenderTexture;

    public async init() {
        const common = `
            const SMAA_THRESHOLD = ${SMAA_THRESHOLD};
            const SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR = 2.0;
            const SMAA_MAX_SEARCH_STEPS = ${SMAA_MAX_SEARCH_STEPS};

            const SMAA_CORNER_ROUNDING = ${SMAA_CORNER_ROUNDING};

            const SMAA_AREATEX_MAX_DISTANCE = 16;
            const SMAA_AREATEX_PIXEL_SIZE = (1.0 / vec2(160.0, 560.0));
            const SMAA_AREATEX_SUBTEX_SIZE = (1.0 / 7.0);
            const SMAA_SEARCHTEX_SIZE = vec2(66.0, 33.0);
            const SMAA_SEARCHTEX_PACKED_SIZE = vec2(64.0, 16.0);
            const SMAA_CORNER_ROUNDING_NORM = (f32(SMAA_CORNER_ROUNDING) / 100.0);
                
            fn mad(a: vec4f, b: vec4f, c: vec4f) -> vec4f {
                return (a * b + c);
            }

            fn mad_vec3f(a: vec3f, b: vec3f, c: vec3f) -> vec3f {
                return (a * b + c);
            }

            fn mad_vec2f(a: vec2f, b: vec2f, c: vec2f) -> vec2f {
                return (a * b + c);
            }

            fn mad_f32(a: f32, b: f32, c: f32) -> f32 {
                return (a * b + c);
            }

            // VARIABLE = INOUT
            fn SMAAMovc1(cond: vec2<bool>, _variable: vec2f, value: vec2f) -> vec2f {
                var variable = _variable;
                if (cond.x) { variable.x = value.x; }
                if (cond.y) { variable.y = value.y; }
                return variable;
            }

            // VARIABLE = INOUT
            fn SMAAMovc2(cond: vec4<bool>, variable: vec4f, value: vec4f) -> vec4f {
                return vec4f(SMAAMovc1(cond.xy, variable.xy, value.xy), SMAAMovc1(cond.zw, variable.zw, value.zw));
            }

            fn sampleLevelZero(tex: texture_2d<f32>, texSampler: sampler, coord: vec2<f32>) -> vec4<f32> {
                return textureSampleLevel(tex, texSampler, coord, 0.0);
            }
            fn sampleLevelZeroOffset(tex: texture_2d<f32>, texSampler: sampler, coord: vec2<f32>, offset: vec2<f32>) -> vec4<f32> {
                return textureSampleLevel(tex, texSampler, coord + offset * u_resolution.xy, 0.0);
            }
            fn saturate(a: f32) -> f32 {
                return clamp(a, 0.0, 1.0);
            }

            fn saturate_vec2f(a: vec2f) -> vec2f {
                return clamp(a, vec2f(0.0, 0.0), vec2f(1.0, 1.0));
            }
        `;
        const format = "rgba16float";
        this.edgeDetectionPass = await GPU.Shader.Create({
            code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) texcoord : vec2<f32>,
                    @location(1) offset0 : vec4<f32>,
                    @location(2) offset1 : vec4<f32>,
                    @location(3) offset2 : vec4<f32>
                };

                @group(0) @binding(0) var<storage, read> u_resolution: vec4<f32>;
                @group(0) @binding(1) var colorTex: texture_2d<f32>;
                @group(0) @binding(2) var nearestSampler: sampler;

                ${common}

                fn SMAAEdgeDetectionVS(texcoord: vec2f) -> array<vec4f, 3> {
                    return array(
                        mad(u_resolution.xyxy, vec4(-1.0, 0.0, 0.0, -1.0), texcoord.xyxy),
                        mad(u_resolution.xyxy, vec4( 1.0, 0.0, 0.0, 1.0), texcoord.xyxy),
                        mad(u_resolution.xyxy, vec4(-2.0, 0.0, 0.0, -2.0), texcoord.xyxy)
                    );
                }

                @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    output.texcoord = input.uv;

                    let offset = SMAAEdgeDetectionVS(output.texcoord);
                    output.offset0 = offset[0];
                    output.offset1 = offset[1];
                    output.offset2 = offset[2];

                    output.position = vec4(input.position, 1.0);
                    return output;
                }

                fn SMAAColorEdgeDetectionPS(texcoord: vec2f, offset: array<vec4f, 3>, colorTex: texture_2d<f32>) -> vec2f {
                    let threshold: vec2f = vec2f(SMAA_THRESHOLD, SMAA_THRESHOLD);

                    var delta: vec4f;
                    let C: vec3f = textureSample(colorTex, nearestSampler, texcoord).rgb;
                    
                    let Cleft: vec3f = textureSample(colorTex, nearestSampler, offset[0].xy).rgb;
                    var t: vec3f = abs(C - Cleft);
                    delta.x = max(max(t.r, t.g), t.b);

                    let Ctop: vec3f  = textureSample(colorTex, nearestSampler, offset[0].zw).rgb;
                    t = abs(C - Ctop);
                    delta.y = max(max(t.r, t.g), t.b);

                    var edges: vec2f = step(threshold, delta.xy);

                    if (dot(edges, vec2(1.0, 1.0)) == 0.0) { discard; }

                    let Cright: vec3f = textureSample(colorTex, nearestSampler, offset[1].xy).rgb;
                    t = abs(C - Cright);
                    delta.z = max(max(t.r, t.g), t.b);

                    let Cbottom: vec3f  = textureSample(colorTex, nearestSampler, offset[1].zw).rgb;
                    t = abs(C - Cbottom);
                    delta.w = max(max(t.r, t.g), t.b);

                    var maxDelta: vec2f = max(delta.xy, delta.zw);

                    let Cleftleft: vec3f  = textureSample(colorTex, nearestSampler, offset[2].xy).rgb;
                    t = abs(C - Cleftleft);
                    delta.z = max(max(t.r, t.g), t.b);

                    let Ctoptop: vec3f = textureSample(colorTex, nearestSampler, offset[2].zw).rgb;
                    t = abs(C - Ctoptop);
                    delta.w = max(max(t.r, t.g), t.b);

                    maxDelta = max(maxDelta.xy, delta.zw);
                    let finalDelta = max(maxDelta.x, maxDelta.y);

                    let o = step(vec2f(finalDelta, finalDelta), SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy);
                    edges.x *= o.x;
                    edges.y *= o.y;

                    return edges;
                }

                @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    let texcoord = input.texcoord;
                    let offset: array<vec4f, 3> = array(
                        input.offset0,
                        input.offset1,
                        input.offset2,
                    );

                    return vec4(SMAAColorEdgeDetectionPS(texcoord, offset, colorTex), 0.0, 1.0);
                }
            `,
            colorOutputs: [{ format: format }],
        });

        this.weightsShader = await GPU.Shader.Create({
            code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) texcoord : vec2<f32>,
                    @location(1) offset0 : vec4<f32>,
                    @location(2) offset1 : vec4<f32>,
                    @location(3) offset2 : vec4<f32>,
                    @location(4) pixcoord : vec2<f32>,
                    @location(5) resolution : vec4<f32>
                };

                @group(0) @binding(0) var<storage, read> u_resolution: vec4<f32>;
                @group(0) @binding(1) var edgesTex: texture_2d<f32>;
                @group(0) @binding(2) var edgesTexSampler: sampler;
                @group(0) @binding(3) var areaTex: texture_2d<f32>;
                @group(0) @binding(4) var areaTexSampler: sampler;
                @group(0) @binding(5) var searchTex: texture_2d<f32>;
                @group(0) @binding(6) var searchTexSampler: sampler;

                ${common}

                struct SMAABlending {
                    pixcoord: vec2<f32>,
                    offset: array<vec4f, 3>
                };

                fn SMAABlendingWeightCalculationVS(texcoord: vec2f, resolution: vec4f) -> SMAABlending {
                    var out: SMAABlending;
                    out.pixcoord = texcoord * resolution.zw;

                    out.offset[0] = mad(resolution.xyxy, vec4(-0.25, -0.125, 1.25, -0.125), texcoord.xyxy);
                    out.offset[1] = mad(resolution.xyxy, vec4(-0.125, -0.25, -0.125, 1.25), texcoord.xyxy);
                    out.offset[2] = mad(
                                    resolution.xxyy,
                                    vec4(-2.0, 2.0, -2.0, 2.0) * f32(SMAA_MAX_SEARCH_STEPS),
                                    vec4(out.offset[0].xz, out.offset[1].yw)
                                );
                    return out;
                }

                @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    output.texcoord = input.uv;
                    output.resolution = u_resolution;

                    let ret = SMAABlendingWeightCalculationVS(output.texcoord, output.resolution);
                    output.pixcoord = ret.pixcoord;
                    output.offset0 = ret.offset[0];
                    output.offset1 = ret.offset[1];
                    output.offset2 = ret.offset[2];

                    output.position = vec4(input.position, 1.0);
                    return output;
                }

                fn SMAASearchLength(searchTex: texture_2d<f32>, searchTexSampler: sampler, e: vec2f, offset: f32) -> f32 {
                    var scale: vec2f = SMAA_SEARCHTEX_SIZE * vec2(0.5, -1.0);
                    var bias: vec2f = SMAA_SEARCHTEX_SIZE * vec2(offset, 1.0);

                    scale += vec2(-1.0, 1.0);
                    bias += vec2(0.5, -0.5);

                    scale *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;
                    bias *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;

                    var coord = mad_vec2f(scale, e, bias);
                    coord.y = coord.y;

                    return sampleLevelZero(searchTex, searchTexSampler, coord).r;
                }

                fn SMAASearchXLeft(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, searchTex: texture_2d<f32>, searchTexSampler: sampler, _texcoord: vec2f, end: f32, resolution: vec4f) -> f32 {
                    var texcoord: vec2f = _texcoord;
                    var e: vec2f = vec2(0.0, 1.0);

                    while (texcoord.x > end && e.g > 0.8281 && e.r == 0.0) {
                        e = sampleLevelZero(edgesTex, edgesTexSampler, texcoord).rg;
                        texcoord = mad_vec2f(-vec2(2.0, 0.0), resolution.xy, texcoord);
                    }

                    let offset = mad_f32(-(255.0 / 127.0), SMAASearchLength(searchTex, searchTexSampler, e, 0.0), 3.25);

                    return mad_f32(resolution.x, offset, texcoord.x);
                }

                fn SMAASearchXRight(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, searchTex: texture_2d<f32>, searchTexSampler: sampler, _texcoord: vec2f, end: f32, resolution: vec4f) -> f32 {
                    var texcoord: vec2f = _texcoord;
                    var e = vec2(0.0, 1.0);

                    while (texcoord.x < end && e.g > 0.8281 && e.r == 0.0) {
                        e = sampleLevelZero(edgesTex, edgesTexSampler, texcoord).rg;
                        texcoord = mad_vec2f(vec2(2.0, 0.0), resolution.xy, texcoord);
                    }

                    let offset = mad_f32(-(255.0 / 127.0), SMAASearchLength(searchTex, searchTexSampler, e, 0.5), 3.25);

                    return mad_f32(-resolution.x, offset, texcoord.x);
                }

                fn SMAASearchYUp(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, searchTex: texture_2d<f32>, searchTexSampler: sampler, _texcoord: vec2f, end: f32, resolution: vec4f) -> f32 {
                    var texcoord: vec2f = _texcoord;
                    var e = vec2(1.0, 0.0);

                    while (texcoord.y > end && e.r > 0.8281 && e.g == 0.0) {
                        e = sampleLevelZero(edgesTex, edgesTexSampler, texcoord).rg;
                        texcoord = mad_vec2f(-vec2(0.0, 2.0), resolution.xy, texcoord);
                    }

                    let offset = mad_f32(-(255.0 / 127.0), SMAASearchLength(searchTex, searchTexSampler, e.gr, 0.0), 3.25);

                    return mad_f32(resolution.y, offset, texcoord.y);
                }

                fn SMAASearchYDown(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, searchTex: texture_2d<f32>, searchTexSampler: sampler, _texcoord: vec2f, end: f32, resolution: vec4f) -> f32 {
                    var texcoord: vec2f = _texcoord;
                    var e = vec2(1.0, 0.0);

                    while (texcoord.y < end && e.r > 0.8281 && e.g == 0.0) {
                        e = sampleLevelZero(edgesTex, edgesTexSampler, texcoord).rg;
                        texcoord = mad_vec2f(vec2(0.0, 2.0), resolution.xy, texcoord);
                    }

                    let offset = mad_f32(-(255.0 / 127.0), SMAASearchLength(searchTex, searchTexSampler, e.gr, 0.5), 3.25);

                    return mad_f32(-resolution.y, offset, texcoord.y);
                }

                fn SMAAArea(areaTex: texture_2d<f32>, areaTexSampler: sampler, dist: vec2f, e1: f32, e2: f32, offset: f32) -> vec2f {
                    var texcoord: vec2f = mad_vec2f(vec2(f32(SMAA_AREATEX_MAX_DISTANCE), f32(SMAA_AREATEX_MAX_DISTANCE)), round(4.0 * vec2(e1, e2)), dist);

                    texcoord = mad_vec2f(SMAA_AREATEX_PIXEL_SIZE, texcoord, 0.5 * SMAA_AREATEX_PIXEL_SIZE);
                    texcoord.y = mad_f32(SMAA_AREATEX_SUBTEX_SIZE, offset, texcoord.y);
                    texcoord.y = texcoord.y;

                    return sampleLevelZero(areaTex, areaTexSampler, texcoord).rg;
                }

                // weights are inout
                fn SMAADetectHorizontalCornerPattern(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, weights: vec2f, texcoord: vec4f, d: vec2f) -> vec2f {
                    let leftRight: vec2f = step(d.xy, d.yx);
                    var rounding = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

                    rounding /= leftRight.x + leftRight.y;

                    var factor = vec2(1.0, 1.0);
                    factor.x -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(0, 1)).r;
                    factor.x -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(1, 1)).r;
                    factor.y -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(0, -2)).r;
                    factor.y -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(1, -2)).r;

                    return weights * saturate_vec2f(factor);
                }

                // weights are inout
                fn SMAADetectVerticalCornerPattern(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, weights: vec2f, texcoord: vec4f, d: vec2f) -> vec2f {
                    let leftRight: vec2f = step(d.xy, d.yx);
                    var rounding: vec2f = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

                    rounding /= leftRight.x + leftRight.y;

                    var factor: vec2f = vec2(1.0, 1.0);
                    factor.x -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(1, 0)).g;
                    factor.x -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(1, 1)).g;
                    factor.y -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(-2, 0)).g;
                    factor.y -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(-2, 1)).g;

                    return weights * saturate_vec2f(factor);
                }

                fn SMAABlendingWeightCalculationPS(
                    texcoord: vec2f,
                    pixcoord: vec2f,
                    offset: array<vec4f, 3>,
                    edgesTex: texture_2d<f32>,
                    edgesTexSampler: sampler,
                    areaTex: texture_2d<f32>,
                    areaTexSampler: sampler,
                    searchTex: texture_2d<f32>,
                    searchTexSampler: sampler,
                    subsampleIndices: vec4f,
                    resolution: vec4f
                ) -> vec4f {
                    var weights: vec4f = vec4(0.0, 0.0, 0.0, 0.0);

                    var e: vec2f = textureSample(edgesTex, edgesTexSampler, texcoord).rg;

                    if (e.g > 0.0) {
                        // weights.rg = SMAACalculateDiagWeights(edgesTex, edgesTexSampler, areaTex, areaTexSampler, texcoord, e, subsampleIndices, resolution);
                        // let o1 = SMAACalculateDiagWeights(edgesTex, edgesTexSampler, areaTex, areaTexSampler, texcoord, e, subsampleIndices, resolution);
                        // weights.r = o1.x;
                        // weights.g = o1.y;

                        if (weights.r == -weights.g) {
                            var d: vec2f;
                            var coords: vec3f;

                            coords.x = SMAASearchXLeft(edgesTex, edgesTexSampler, searchTex, searchTexSampler, offset[0].xy, offset[2].x, resolution);
                            coords.y = offset[1].y;
                            d.x = coords.x;

                            let e1 = sampleLevelZero(edgesTex, edgesTexSampler, coords.xy).r;

                            coords.z = SMAASearchXRight(edgesTex, edgesTexSampler, searchTex, searchTexSampler, offset[0].zw, offset[2].y, resolution);
                            d.y = coords.z;
                            d = abs(round(mad_vec2f(resolution.zz, d, -pixcoord.xx)));

                            let sqrt_d: vec2f = sqrt(d);
                            let e2 = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.zy, vec2f(1, 0)).r;

                            // weights.rg = SMAAArea(areaTex, areaTexSampler, sqrt_d, e1, e2, subsampleIndices.y);
                            weights = vec4(SMAAArea(areaTex, areaTexSampler, sqrt_d, e1, e2, subsampleIndices.y), weights.ba);

                            coords.y = texcoord.y;
                            weights = vec4(SMAADetectHorizontalCornerPattern(edgesTex, edgesTexSampler, weights.rg, coords.xyzy, d), weights.ba);
                        } else {
                            e.r = 0.0;
                        }
                    }

                    if (e.r > 0.0) {
                        var d: vec2f;
                        var coords: vec3f;

                        coords.y = SMAASearchYUp(edgesTex, edgesTexSampler, searchTex, searchTexSampler, offset[1].xy, offset[2].z, resolution);
                        coords.x = offset[0].x;
                        d.x = coords.y;

                        let e1 = sampleLevelZero(edgesTex, edgesTexSampler, coords.xy).g;

                        coords.z = SMAASearchYDown(edgesTex, edgesTexSampler, searchTex, searchTexSampler, offset[1].zw, offset[2].w, resolution);
                        d.y = coords.z;
                        d = abs(round(mad_vec2f(resolution.ww, d, -pixcoord.yy)));

                        let sqrt_d: vec2f = sqrt(d);
                        let e2 = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.xz, vec2f(0, 1)).g;

                        weights = vec4(weights.rg, SMAAArea(areaTex, areaTexSampler, sqrt_d, e1, e2, subsampleIndices.x));

                        coords.x = texcoord.x;
                        weights = vec4(weights.rg, SMAADetectVerticalCornerPattern(edgesTex, edgesTexSampler, weights.ba, coords.xyxz, d));
                    }

                    return weights;
                }

                @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    let texcoord = input.texcoord;
                    let pixcoord = input.pixcoord;
                    let offset: array<vec4f, 3> = array(
                        input.offset0,
                        input.offset1,
                        input.offset2,
                    );
                    let subsampleIndices: vec4f = vec4(0.0);
                    let resolution = input.resolution;

                    return SMAABlendingWeightCalculationPS(
                        texcoord,
                        pixcoord,
                        offset,
                        edgesTex,
                        edgesTexSampler,
                        areaTex,
                        areaTexSampler,
                        searchTex,
                        searchTexSampler,
                        subsampleIndices,
                        resolution
                    );
                }
            `,
            colorOutputs: [{ format: format }],
        });

        this.blendShader = await GPU.Shader.Create({
            code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) texcoord : vec2<f32>,
                    @location(1) offset : vec4<f32>,
                    @location(2) resolution : vec4<f32>
                };

                @group(0) @binding(0) var<storage, read> u_resolution: vec4<f32>;
                @group(0) @binding(1) var colorTex: texture_2d<f32>;
                @group(0) @binding(2) var weightsTex: texture_2d<f32>;
                @group(0) @binding(3) var linearSampler: sampler;

                ${common}

                fn SMAANeighborhoodBlendingVS(texcoord: vec2f, resolution: vec4f) -> vec4f {
                    return mad(resolution.xyxy, vec4(1.0, 0.0, 0.0, 1.0), texcoord.xyxy);
                }

                @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output: VertexOutput;
                    output.texcoord = input.uv;
                    output.resolution = u_resolution;

                    output.offset = SMAANeighborhoodBlendingVS(output.texcoord, output.resolution);

                    output.position = vec4(input.position, 1.0);
                    return output;
                }

                
                fn SMAANeighborhoodBlendingPS(
                    texcoord: vec2f,
                    offset: vec4f,
                    colorTex: texture_2d<f32>,
                    weightsTex: texture_2d<f32>,
                    resolution: vec4f
                ) -> vec4f {
                    var a: vec4f;
                    a.x = textureSample(weightsTex, linearSampler, offset.xy).a;
                    a.y = textureSample(weightsTex, linearSampler, offset.zw).g;
                    // a.wz = texture(weightsTex, texcoord).xz;
                    let o1 = textureSample(weightsTex, linearSampler, texcoord).xz;
                    a.w = o1.x;
                    a.z = o1.y;

                    if (dot(a, vec4(1.0, 1.0, 1.0, 1.0)) < 1e-5) {
                        let color = sampleLevelZero(colorTex, linearSampler, texcoord);
                        return color;
                    }
                    else {
                        let h: bool = max(a.x, a.z) > max(a.y, a.w);

                        var blendingOffset: vec4f = vec4(0.0, a.y, 0.0, a.w);
                        var blendingWeight: vec2f = a.yw;
                        blendingOffset = SMAAMovc2(vec4<bool>(h, h, h, h), blendingOffset, vec4(a.x, 0.0, a.z, 0.0));
                        blendingWeight = SMAAMovc1(vec2<bool>(h, h), blendingWeight, a.xz);
                        blendingWeight /= dot(blendingWeight, vec2(1.0, 1.0));

                        let blendingCoord: vec4f = mad(blendingOffset, vec4(resolution.xy, -resolution.xy), texcoord.xyxy);
                        var color: vec4f = blendingWeight.x * sampleLevelZero(colorTex, linearSampler, blendingCoord.xy);
                        color += blendingWeight.y * sampleLevelZero(colorTex, linearSampler, blendingCoord.zw);

                        return color;
                    }
                }

                @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    let texcoord = input.texcoord;
                    let offset: vec4f = input.offset;
                    let resolution = input.resolution;

                    return SMAANeighborhoodBlendingPS(texcoord, offset, colorTex, weightsTex, resolution);
                }
            `,
            colorOutputs: [{ format: "rgba16float" }],
        });

        this.quadGeometry = Geometry.Plane();

        const w = GPU.Renderer.width;
        const h = GPU.Renderer.height;
        const u_resolution = new Mathf.Vector4(1 / w, 1 / h, w, h);

        this.edgeTex = GPU.RenderTexture.Create(w, h, 1, format);
        this.weightsTex = GPU.RenderTexture.Create(w, h, 1, format);
        this.blendTex = GPU.RenderTexture.Create(w, h, 1, "rgba16float");


        const searchTex = await GPU.Texture.Load(new URL(SMAATextures.search, import.meta.url), "rgba16float", true);
        const areaTex = await GPU.Texture.Load(new URL(SMAATextures.area, import.meta.url), "rgba16float", false);

        const nearestSampler = GPU.TextureSampler.Create({ addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge", minFilter: "nearest", magFilter: "nearest" });
        const linearSampler = GPU.TextureSampler.Create({ addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge", minFilter: "linear", magFilter: "linear" });

        this.edgeDetectionPass.SetSampler("nearestSampler", nearestSampler);

        this.weightsShader.SetSampler("edgesTexSampler", linearSampler);
        this.weightsShader.SetSampler("searchTexSampler", nearestSampler);
        this.weightsShader.SetSampler("areaTexSampler", linearSampler);

        this.blendShader.SetSampler("linearSampler", linearSampler);

        this.weightsShader.SetTexture("searchTex", searchTex);
        this.weightsShader.SetTexture("areaTex", areaTex);

        this.edgeDetectionPass.SetArray("u_resolution", u_resolution.elements);
        this.weightsShader.SetArray("u_resolution", u_resolution.elements);
        this.blendShader.SetArray("u_resolution", u_resolution.elements);

        // this.sampleTexture = await GPU.Texture.Load(new URL("/extra/research/glsl-smaa-main/sample.png", import.meta.url), "rgba16float", false);

        this.initialized = true;
    }

    public async execute(resources: GPU.ResourcePool) {
        if (this.initialized === false) return;
        if (this.enabled === false) return;

        const lightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
        if (!lightingOutput) return;
        const output = lightingOutput; // this.sampleTexture;

        this.edgeDetectionPass.SetTexture("colorTex", output);

        GPU.RendererContext.BeginRenderPass(this.name + " - Edge", [{ clear: true, target: this.edgeTex, color: new Mathf.Color(0,0,0,1) }], undefined, true);
        GPU.RendererContext.DrawGeometry(this.quadGeometry, this.edgeDetectionPass);
        GPU.RendererContext.EndRenderPass();

        this.weightsShader.SetTexture("edgesTex", this.edgeTex);
        GPU.RendererContext.BeginRenderPass(this.name + " - Weights", [{ clear: true, target: this.weightsTex }], undefined, true);
        GPU.RendererContext.DrawGeometry(this.quadGeometry, this.weightsShader);
        GPU.RendererContext.EndRenderPass();

        this.blendShader.SetTexture("colorTex", output);
        this.blendShader.SetTexture("weightsTex", this.weightsTex);
        GPU.RendererContext.BeginRenderPass(this.name + " - Blend", [{ clear: true, target: this.blendTex }], undefined, true);
        GPU.RendererContext.DrawGeometry(this.quadGeometry, this.blendShader);
        GPU.RendererContext.EndRenderPass();

        GPU.RendererContext.CopyTextureToTexture(this.blendTex, lightingOutput);
    }
}