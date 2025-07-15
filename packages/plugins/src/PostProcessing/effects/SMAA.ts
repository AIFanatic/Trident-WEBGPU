import { Geometry } from "../../../Geometry";
import { Vector2 } from "../../../math/Vector2";
import { Vector4 } from "../../../math/Vector4";
import { RenderPass, ResourcePool } from "../../../renderer/RenderGraph";
import { Renderer } from "../../../renderer/Renderer";
import { RendererContext } from "../../../renderer/RendererContext";
import { PassParams } from "../../../renderer/RenderingPipeline";
import { Shader } from "../../../renderer/Shader";
import { RenderTexture, Texture } from "../../../renderer/Texture";
import { TextureSampler } from "../../../renderer/TextureSampler";

import AreaTexPNG from "./AreaTexDX10.png";
import SearchTexPNG from "./SearchTex.png";
import NoAAPNG from "./no-aa.png";

// High preset
const SMAA_THRESHOLD = 0.1;
const SMAA_MAX_SEARCH_STEPS = 16;
const SMAA_MAX_SEARCH_STEPS_DIAG = 8;
const SMAA_CORNER_ROUNDING = 25;

const pass1 = `
struct VertexInput {
    @location(0) a_position : vec3<f32>,
    @location(1) a_uv : vec2<f32>,
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
@group(0) @binding(2) var colorTexSampler: sampler;

fn mad(a: vec4f, b: vec4f, c: vec4f) -> vec4f {
    return (a * b + c);
}

fn API_V_DIR(v: f32) -> f32 {
    return -(v);
}

fn SMAAEdgeDetectionVS(texcoord: vec2f) -> array<vec4f, 3> {
    return array(
        mad(u_resolution.xyxy, vec4(-1.0, 0.0, 0.0, API_V_DIR(-1.0)), texcoord.xyxy),
        mad(u_resolution.xyxy, vec4( 1.0, 0.0, 0.0, API_V_DIR(1.0)), texcoord.xyxy),
        mad(u_resolution.xyxy, vec4(-2.0, 0.0, 0.0, API_V_DIR(-2.0)), texcoord.xyxy)
    );
}

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.texcoord = input.a_uv;

    let offset = SMAAEdgeDetectionVS(output.texcoord);
    output.offset0 = offset[0];
    output.offset1 = offset[1];
    output.offset2 = offset[2];

    output.position = vec4(input.a_position, 1.0);
    return output;
}




const SMAA_THRESHOLD = ${SMAA_THRESHOLD};
const SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR = 2.0;

fn SMAAColorEdgeDetectionPS(texcoord: vec2f, offset: array<vec4f, 3>, colorTex: texture_2d<f32>, colorTexSampler: sampler) -> vec2f {
    let threshold: vec2f = vec2f(SMAA_THRESHOLD, SMAA_THRESHOLD);

    var delta: vec4f;
    let C: vec3f = textureSample(colorTex, colorTexSampler, texcoord).rgb;

    let Cleft: vec3f = textureSample(colorTex, colorTexSampler, offset[0].xy).rgb;
    var t: vec3f = abs(C - Cleft);
    delta.x = max(max(t.r, t.g), t.b);

    let Ctop: vec3f  = textureSample(colorTex, colorTexSampler, offset[0].zw).rgb;
    t = abs(C - Ctop);
    delta.y = max(max(t.r, t.g), t.b);

    var edges: vec2f = step(threshold, delta.xy);

    if (dot(edges, vec2(1.0, 1.0)) == 0.0) { discard; }

    let Cright: vec3f = textureSample(colorTex, colorTexSampler, offset[1].xy).rgb;
    t = abs(C - Cright);
    delta.z = max(max(t.r, t.g), t.b);

    let Cbottom: vec3f  = textureSample(colorTex, colorTexSampler, offset[1].zw).rgb;
    t = abs(C - Cbottom);
    delta.w = max(max(t.r, t.g), t.b);

    var maxDelta: vec2f = max(delta.xy, delta.zw);

    let Cleftleft: vec3f  = textureSample(colorTex, colorTexSampler, offset[2].xy).rgb;
    t = abs(C - Cleftleft);
    delta.z = max(max(t.r, t.g), t.b);

    let Ctoptop: vec3f = textureSample(colorTex, colorTexSampler, offset[2].zw).rgb;
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
    return vec4(SMAAColorEdgeDetectionPS(texcoord, offset, colorTex, colorTexSampler), 0.0, 0.0);
}
`

const pass2 = `
struct VertexInput {
    @location(0) a_position : vec3<f32>,
    @location(1) a_uv : vec2<f32>,
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

fn API_V_DIR(v: f32) -> f32 {
    return -(v);
}

const SMAA_MAX_SEARCH_STEPS = ${SMAA_MAX_SEARCH_STEPS};

struct SMAABlending {
    pixcoord: vec2<f32>,
    offset: array<vec4f, 3>
};

fn SMAABlendingWeightCalculationVS(texcoord: vec2f, resolution: vec4f) -> SMAABlending {
    var out: SMAABlending;
    out.pixcoord = texcoord * resolution.zw;

    out.offset[0] = mad(resolution.xyxy, vec4(-0.25, API_V_DIR(-0.125), 1.25, API_V_DIR(-0.125)), texcoord.xyxy);
    out.offset[1] = mad(resolution.xyxy, vec4(-0.125, API_V_DIR(-0.25), -0.125, API_V_DIR(1.25)), texcoord.xyxy);
    out.offset[2] = mad(
                    resolution.xxyy,
                    vec4(-2.0, 2.0, API_V_DIR(-2.0), API_V_DIR(2.0)) * f32(SMAA_MAX_SEARCH_STEPS),
                    vec4(out.offset[0].xz, out.offset[1].yw)
                );
    return out;
}

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.texcoord = input.a_uv;
    output.resolution = u_resolution;

    let ret = SMAABlendingWeightCalculationVS(output.texcoord, output.resolution);
    output.pixcoord = ret.pixcoord;
    output.offset0 = ret.offset[0];
    output.offset1 = ret.offset[1];
    output.offset2 = ret.offset[2];

    output.position = vec4(input.a_position, 1.0);
    return output;
}






const SMAA_MAX_SEARCH_STEPS_DIAG = ${SMAA_MAX_SEARCH_STEPS_DIAG};
const SMAA_CORNER_ROUNDING = ${SMAA_CORNER_ROUNDING};

const SMAA_AREATEX_MAX_DISTANCE = 16;
const SMAA_AREATEX_MAX_DISTANCE_DIAG = 20;
const SMAA_AREATEX_PIXEL_SIZE = (1.0 / vec2(160.0, 560.0));
const SMAA_AREATEX_SUBTEX_SIZE = (1.0 / 7.0);
const SMAA_SEARCHTEX_SIZE = vec2(66.0, 33.0);
const SMAA_SEARCHTEX_PACKED_SIZE = vec2(64.0, 16.0);
const SMAA_CORNER_ROUNDING_NORM = (f32(SMAA_CORNER_ROUNDING) / 100.0);

fn sampleLevelZero(tex: texture_2d<f32>, texSampler: sampler, coord: vec2<f32>) -> vec4<f32> {
    return textureSampleLevel(tex, texSampler, coord, 0.0);
}
fn sampleLevelZeroOffset(tex: texture_2d<f32>, texSampler: sampler, coord: vec2<f32>, offset: vec2<f32>) -> vec4<f32> {
    let textureSize = vec2f(textureDimensions(tex));
    let offsetUV = coord + offset * textureSize;
    return textureSampleLevel(tex, texSampler, offsetUV, 0.0);

    // return textureLodOffset(tex, coord, 0.0, offset);
}
fn saturate(a: f32) -> f32 {
    return clamp(a, 0.0, 1.0);
}

fn saturate_vec2f(a: vec2f) -> vec2f {
    return clamp(a, vec2f(0.0, 0.0), vec2f(1.0, 1.0));
}

fn API_V_COORD(v: f32) -> f32 {
    return (1.0 - v);
}
fn API_V_BELOW(v1: f32, v2: f32) -> bool {
    return v1 < v2;
}
fn API_V_ABOVE(v1: f32, v2: f32) -> bool {
    return v1 > v2;
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
    let o1 = SMAAMovc1(cond.xy, variable.xy, value.xy);
    let o2 = SMAAMovc1(cond.zw, variable.zw, value.zw);
    return vec4f(o1, o2);
}

fn SMAADecodeDiagBilinearAccess1(_e: vec2f) -> vec2f {
    var e = _e;
    e.r = e.r * abs(5.0 * e.r - 5.0 * 0.75);
    return round(e);
}

fn SMAADecodeDiagBilinearAccess2(_e: vec4f) -> vec4f {
    var e = _e;
    // e.rb = e.rb * abs(5.0 * e.rb - 5.0 * 0.75);
    let erb = e.rb * abs(5.0 * e.rb - 5.0 * 0.75);
    e.r = erb.x;
    e.b = erb.y;
    return round(e);
}

struct SMAASearchDiag {
    ret: vec2f,
    e: vec2f
};

fn SMAASearchDiag1(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, texcoord: vec2f, _dir: vec2f, _e: vec2f, _resolution: vec4f) -> SMAASearchDiag {
    var e = _e;
    var dir = _dir;
    dir.y = API_V_DIR(dir.y);

    var coord: vec4f = vec4f(texcoord, -1.0, 1.0);
    let t: vec3f = vec3(_resolution.xy, 1.0);

    while (coord.z < f32(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9) {
        let o = mad_vec3f(t, vec3(dir, 1.0), coord.xyz);
        coord.x = o.x;
        coord.y = o.y;
        coord.z = o.z;
        e = sampleLevelZero(edgesTex, edgesTexSampler, coord.xy).rg;
        coord.w = dot(e, vec2(0.5, 0.5));
    }

    var out: SMAASearchDiag;
    out.ret = coord.zw;
    out.e = e;
    return out;
}

fn SMAASearchDiag2(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, texcoord: vec2f, _dir: vec2f, _e: vec2f, _resolution: vec4f) -> SMAASearchDiag {
    var e = _e;
    var dir = _dir;
    dir.y = API_V_DIR(dir.y);

    var coord = vec4(texcoord, -1.0, 1.0);
    coord.x += 0.25 * _resolution.x;

    let t = vec3(_resolution.xy, 1.0);

    while (coord.z < f32(SMAA_MAX_SEARCH_STEPS_DIAG - 1) && coord.w > 0.9) {
        // coord.xyz = mad(t, vec3(dir, 1.0), coord.xyz);
        let o = mad_vec3f(t, vec3(dir, 1.0), coord.xyz);
        coord.x = o.x;
        coord.y = o.y;
        coord.z = o.z;

        e = sampleLevelZero(edgesTex, edgesTexSampler, coord.xy).rg;
        e = SMAADecodeDiagBilinearAccess1(e);

        coord.w = dot(e, vec2(0.5, 0.5));
    }

    var out: SMAASearchDiag;
    out.ret = coord.zw;
    out.e = e;
    return out;
}

fn SMAAAreaDiag(areaTex: texture_2d<f32>, areaTexSampler: sampler, dist: vec2f, e: vec2f, offset: f32) -> vec2f {
    var texcoord = mad_vec2f(vec2(SMAA_AREATEX_MAX_DISTANCE_DIAG, SMAA_AREATEX_MAX_DISTANCE_DIAG), e, dist);

    texcoord = mad_vec2f(SMAA_AREATEX_PIXEL_SIZE, texcoord, 0.5 * SMAA_AREATEX_PIXEL_SIZE);
    texcoord.x += 0.5;
    texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;
    texcoord.y = API_V_COORD(texcoord.y);

    return sampleLevelZero(areaTex, areaTexSampler, texcoord).rg;
}

fn SMAACalculateDiagWeights(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, areaTex: texture_2d<f32>, areaTexSampler: sampler, texcoord: vec2f, e: vec2f, subsampleIndices: vec4f, resolution: vec4f) -> vec2f {
    var weights: vec2f = vec2(0.0, 0.0);
    var d: vec4f;
    var end: vec2f;

    if (e.r > 0.0) {
        // d.xz = SMAASearchDiag1(edgesTex, edgesTexSampler, texcoord, vec2(-1.0, 1.0), end, resolution);
        let o: SMAASearchDiag = SMAASearchDiag1(edgesTex, edgesTexSampler, texcoord, vec2(-1.0, 1.0), end, resolution);
        d.x = o.ret.x;
        d.z = o.ret.y;
        end = o.e;
        d.x += f32(end.y > 0.9);
    } else {
        // d.xz = vec2(0.0, 0.0);
        d.x = 0.0;
        d.z = 0.0;
    }

    // d.yw = SMAASearchDiag1(edgesTex, edgesTexSampler, texcoord, vec2(1.0, -1.0), end, resolution);
    let o: SMAASearchDiag = SMAASearchDiag1(edgesTex, edgesTexSampler, texcoord, vec2(1.0, -1.0), end, resolution);
    d.y = o.ret.x;
    d.w = o.ret.y;
    end = o.e;

    if (d.x + d.y > 2.0) {
        let coords = mad(vec4(-d.x + 0.25, API_V_DIR(d.x), d.y, API_V_DIR(-d.y - 0.25)), resolution.xyxy, texcoord.xyxy);
        var c: vec4f;
        // c.xy = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.xy, vec2f(-1, 0)).rg;
        let o1 = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.xy, vec2f(-1, 0)).rg;
        c.x = o1.r;
        c.y = o1.g;
        // c.zw = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.zw, vec2f(1, 0)).rg;
        let o2 = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.zw, vec2f(1, 0)).rg;
        c.z = o2.r;
        c.w = o2.g;
        // c.yxwz = SMAADecodeDiagBilinearAccess2(c.xyzw);
        let o3 = SMAADecodeDiagBilinearAccess2(c.xyzw);
        c.y = o3.x;
        c.x = o3.y;
        c.w = o3.w;
        c.z = o3.z;

        var cc: vec2f = mad_vec2f(vec2(2.0, 2.0), c.xz, c.yw);

        let o4 = SMAAMovc1(vec2<bool>(step(vec2f(0.9, 0.9), d.zw)), cc, vec2(0.0, 0.0));
        cc = o4;

        weights += SMAAAreaDiag(areaTex, areaTexSampler, d.xy, cc, subsampleIndices.z);
        return vec2f(cc.xy);
    }


    // d.xz = SMAASearchDiag2(edgesTex, edgesTexSampler, texcoord, vec2(-1.0, -1.0), end, resolution);
    let o1: SMAASearchDiag = SMAASearchDiag2(edgesTex, edgesTexSampler, texcoord, vec2(-1.0, -1.0), end, resolution);
    d.x = o1.ret.x;
    d.z = o1.ret.y;
    end = o1.e;

    if (sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord, vec2f(1, 0)).r > 0.0) {
        // d.yw = SMAASearchDiag2(edgesTex, edgesTexSampler, texcoord, vec2(1.0, 1.0), end, resolution);
        let o2: SMAASearchDiag = SMAASearchDiag2(edgesTex, edgesTexSampler, texcoord, vec2(1.0, 1.0), end, resolution);
        d.y = o2.ret.x;
        d.w = o2.ret.y;
        end = o2.e;

        d.y += f32(end.y > 0.9);
    } else {
        // d.yw = vec2(0.0, 0.0);
        d.y = 0.0;
        d.w = 0.0;
    }

    if (d.x + d.y > 2.0) {
        let coords = mad(vec4(-d.x, API_V_DIR(-d.x), d.y, API_V_DIR(d.y)), resolution.xyxy, texcoord.xyxy);
        var c: vec4f;
        c.x = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.xy, vec2f(-1, 0)).g;
        c.y = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.xy, vec2f(0, API_V_DIR(-1))).r;
        // c.zw = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.zw, vec2f(1, 0)).gr;
        let o3 = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.zw, vec2f(1, 0)).gr;
        c.z = o3.g;
        c.w = o3.r;
        var cc = mad_vec2f(vec2(2.0, 2.0), c.xz, c.yw);

        let o5 = SMAAMovc1(vec2<bool>(step(vec2f(0.9, 0.9), d.zw)), cc, vec2(0.0, 0.0));
        cc = o5;

        weights += SMAAAreaDiag(areaTex, areaTexSampler, d.xy, cc, subsampleIndices.w).gr;
    }

    return weights;
}

fn SMAASearchLength(searchTex: texture_2d<f32>, searchTexSampler: sampler, e: vec2f, offset: f32) -> f32 {
    var scale: vec2f = SMAA_SEARCHTEX_SIZE * vec2(0.5, -1.0);
    var bias: vec2f = SMAA_SEARCHTEX_SIZE * vec2(offset, 1.0);

    scale += vec2(-1.0, 1.0);
    bias += vec2(0.5, -0.5);

    scale *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;
    bias *= 1.0 / SMAA_SEARCHTEX_PACKED_SIZE;

    var coord = mad_vec2f(scale, e, bias);
    coord.y = API_V_COORD(coord.y);

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

    while (API_V_BELOW(texcoord.y, end) && e.r > 0.8281 && e.g == 0.0) {
        e = sampleLevelZero(edgesTex, edgesTexSampler, texcoord).rg;
        texcoord = mad_vec2f(-vec2(0.0, API_V_DIR(2.0)), resolution.xy, texcoord);
    }

    let offset = mad_f32(-(255.0 / 127.0), SMAASearchLength(searchTex, searchTexSampler, e.gr, 0.0), 3.25);

    return mad_f32(resolution.y, API_V_DIR(offset), texcoord.y);
}

fn SMAASearchYDown(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, searchTex: texture_2d<f32>, searchTexSampler: sampler, _texcoord: vec2f, end: f32, resolution: vec4f) -> f32 {
    var texcoord: vec2f = _texcoord;
    var e = vec2(1.0, 0.0);

    while (API_V_ABOVE(texcoord.y, end) && e.r > 0.8281 && e.g == 0.0) {
        e = sampleLevelZero(edgesTex, edgesTexSampler, texcoord).rg;
        texcoord = mad_vec2f(vec2(0.0, API_V_DIR(2.0)), resolution.xy, texcoord);
    }

    let offset = mad_f32(-(255.0 / 127.0), SMAASearchLength(searchTex, searchTexSampler, e.gr, 0.5), 3.25);

    return mad_f32(-resolution.y, API_V_DIR(offset), texcoord.y);
}

fn SMAAArea(areaTex: texture_2d<f32>, areaTexSampler: sampler, dist: vec2f, e1: f32, e2: f32, offset: f32) -> vec2f {
    var texcoord: vec2f = mad_vec2f(vec2(SMAA_AREATEX_MAX_DISTANCE, SMAA_AREATEX_MAX_DISTANCE), round(4.0 * vec2(e1, e2)), dist);

    texcoord = mad_vec2f(SMAA_AREATEX_PIXEL_SIZE, texcoord, 0.5 * SMAA_AREATEX_PIXEL_SIZE);
    texcoord.y = mad_f32(SMAA_AREATEX_SUBTEX_SIZE, offset, texcoord.y);
    texcoord.y = API_V_COORD(texcoord.y);

    return sampleLevelZero(areaTex, areaTexSampler, texcoord).rg;
}

// weights are inout
fn SMAADetectHorizontalCornerPattern(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, weights: vec2f, texcoord: vec4f, d: vec2f) -> vec2f {
    let leftRight: vec2f = step(d.xy, d.yx);
    var rounding = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

    rounding /= leftRight.x + leftRight.y;

    var factor = vec2(1.0, 1.0);
    factor.x -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(0, API_V_DIR(1))).r;
    factor.x -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(1, API_V_DIR(1))).r;
    factor.y -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(0, API_V_DIR(-2))).r;
    factor.y -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(1, API_V_DIR(-2))).r;

    return weights * saturate_vec2f(factor);
}

// weights are inout
fn SMAADetectVerticalCornerPattern(edgesTex: texture_2d<f32>, edgesTexSampler: sampler, weights: vec2f, texcoord: vec4f, d: vec2f) -> vec2f {
    let leftRight: vec2f = step(d.xy, d.yx);
    var rounding: vec2f = (1.0 - SMAA_CORNER_ROUNDING_NORM) * leftRight;

    rounding /= leftRight.x + leftRight.y;

    var factor: vec2f = vec2(1.0, 1.0);
    factor.x -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(1, 0)).g;
    factor.x -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(1, API_V_DIR(1))).g;
    factor.y -= rounding.x * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.xy, vec2f(-2, 0)).g;
    factor.y -= rounding.y * sampleLevelZeroOffset(edgesTex, edgesTexSampler, texcoord.zw, vec2f(-2, API_V_DIR(1))).g;

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
        let o1 = SMAACalculateDiagWeights(edgesTex, edgesTexSampler, areaTex, areaTexSampler, texcoord, e, subsampleIndices, resolution);
        weights.r = o1.x;
        weights.g = o1.y;

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
            let o2 = SMAAArea(areaTex, areaTexSampler, sqrt_d, e1, e2, subsampleIndices.y);
            weights.r = o2.x;
            weights.g = o2.y;

            coords.y = texcoord.y;
            let o3 = SMAADetectHorizontalCornerPattern(edgesTex, edgesTexSampler, weights.rg, coords.xyzy, d);
            weights.r = o3.x;
            weights.g = o3.y;
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
        let e2 = sampleLevelZeroOffset(edgesTex, edgesTexSampler, coords.xz, vec2f(0, API_V_DIR(1))).g;

        // weights.ba = SMAAArea(areaTex, areaTexSampler, sqrt_d, e1, e2, subsampleIndices.x);
        let o4 = SMAAArea(areaTex, areaTexSampler, sqrt_d, e1, e2, subsampleIndices.x);
        weights.b = o4.x;
        weights.a = o4.y;

        coords.x = texcoord.x;
        let o5 = SMAADetectVerticalCornerPattern(edgesTex, edgesTexSampler, weights.ba, coords.xyxz, d);
        weights.b = o5.x;
        weights.a = o5.y;
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

`

const pass3 = `
struct VertexInput {
    @location(0) a_position : vec3<f32>,
    @location(1) a_uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) texcoord : vec2<f32>,
    @location(1) offset : vec4<f32>,
    @location(2) resolution : vec4<f32>
};

@group(0) @binding(0) var<storage, read> u_resolution: vec4<f32>;
@group(0) @binding(1) var colorTex: texture_2d<f32>;
@group(0) @binding(2) var colorTexSampler: sampler;
@group(0) @binding(3) var blendTex: texture_2d<f32>;
@group(0) @binding(4) var blendTexSampler: sampler;

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

fn API_V_DIR(v: f32) -> f32 {
    return -(v);
}

fn SMAANeighborhoodBlendingVS(texcoord: vec2f, resolution: vec4f) -> vec4f {
    return mad(resolution.xyxy, vec4( 1.0, 0.0, 0.0, API_V_DIR(1.0)), texcoord.xyxy);
}

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.texcoord = input.a_uv;
    output.resolution = u_resolution;

    output.offset = SMAANeighborhoodBlendingVS(output.texcoord, output.resolution);

    output.position = vec4(input.a_position.xy, 0.0, 1.0);
    return output;
}




fn sampleLevelZero(tex: texture_2d<f32>, texSampler: sampler, coord: vec2<f32>) -> vec4<f32> {
    return textureSampleLevel(tex, texSampler, coord, 0.0);
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
    let o1 = SMAAMovc1(cond.xy, variable.xy, value.xy);
    let o2 = SMAAMovc1(cond.zw, variable.zw, value.zw);
    return vec4f(o1, o2);
}

fn toSrgb(linearRGB: vec4f) -> vec4f {
    let cutoff: vec4<bool> = linearRGB < vec4(0.0031308);
    let higher = vec4(1.055) * pow(linearRGB, vec4(1.0/2.4)) - vec4(0.055);
    let lower = linearRGB * vec4(12.92);

    // return vec4(mix(higher, lower, cutoff).rgb, linearRGB.a);
    return vec4<f32>(
        select(lower.rgb, higher.rgb, cutoff.rgb),
        linearRGB.a
    );
}

fn SMAANeighborhoodBlendingPS(
    texcoord: vec2f,
    offset: vec4f,
    colorTex: texture_2d<f32>,
    colorTexSampler: sampler,
    blendTex: texture_2d<f32>,
    blendTexSampler: sampler,
    resolution: vec4f
    ) -> vec4f {
    var a: vec4f;
    a.x = textureSample(blendTex, blendTexSampler, offset.xy).a;
    a.y = textureSample(blendTex, blendTexSampler, offset.zw).g;
    // a.wz = texture(blendTex, texcoord).xz;
    let o1 = textureSample(blendTex, blendTexSampler, texcoord).xz;
    a.w = o1.x;
    a.z = o1.y;

    if (dot(a, vec4(1.0, 1.0, 1.0, 1.0)) < 1e-5) {
      let color = sampleLevelZero(colorTex, colorTexSampler, texcoord);
      return toSrgb(color);
    } else {
      let h: bool = max(a.x, a.z) > max(a.y, a.w);

      var blendingOffset: vec4f = vec4(0.0, API_V_DIR(a.y), 0.0, API_V_DIR(a.w));
      var blendingWeight: vec2f = a.yw;
      blendingOffset = SMAAMovc2(vec4<bool>(h, h, h, h), blendingOffset, vec4(a.x, 0.0, a.z, 0.0));
      blendingWeight = SMAAMovc1(vec2<bool>(h, h), blendingWeight, a.xz);
      blendingWeight /= dot(blendingWeight, vec2(1.0, 1.0));

      let blendingCoord: vec4f = mad(blendingOffset, vec4(resolution.xy, -resolution.xy), texcoord.xyxy);
      var color: vec4f = blendingWeight.x * sampleLevelZero(colorTex, colorTexSampler, blendingCoord.xy);
      color += blendingWeight.y * sampleLevelZero(colorTex, colorTexSampler, blendingCoord.zw);

      return toSrgb(color);
    }
  }

  @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let texcoord = input.texcoord;
    let offset: vec4f = input.offset;
    let resolution = input.resolution;

    return SMAANeighborhoodBlendingPS(texcoord, offset, colorTex, colorTexSampler, blendTex, blendTexSampler, resolution);
}

`;

export class PostProcessingSMAA extends RenderPass {
    public name: string = "SMAA";
    private shader1: Shader;
    private shader2: Shader;
    private shader3: Shader;

    private quadGeometry: Geometry;

    private edgeTex: RenderTexture;
    private blendTex: RenderTexture;
    private finalTex: RenderTexture;

    constructor() {
        super({inputs: [
            PassParams.LightingPassOutput,
        ]});
    }

    public async init() {
        this.shader1 = await Shader.Create({
            code: pass1,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                u_resolution: {group: 0, binding: 0, type: "storage"},
                colorTex: {group: 0, binding: 1, type: "texture"},
                colorTexSampler: {group: 0, binding: 2, type: "sampler"},
            }
        });

        this.shader2 = await Shader.Create({
            code: pass2,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                position: { location: 0, size: 3, type: "vec3" },
                uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                u_resolution: {group: 0, binding: 0, type: "storage"},
                edgesTex: {group: 0, binding: 1, type: "texture"},
                edgesTexSampler: {group: 0, binding: 2, type: "sampler"},
                areaTex: {group: 0, binding: 3, type: "texture"},
                areaTexSampler: {group: 0, binding: 4, type: "sampler"},
                searchTex: {group: 0, binding: 5, type: "texture"},
                searchTexSampler: {group: 0, binding: 6, type: "sampler"},
            }
        });

        this.shader3 = await Shader.Create({
            code: pass3,
            colorOutputs: [{format: Renderer.SwapChainFormat}],
            attributes: {
                a_position: { location: 0, size: 3, type: "vec3" },
                a_uv: { location: 1, size: 2, type: "vec2" }
            },
            uniforms: {
                u_resolution: {group: 0, binding: 0, type: "storage"},
                colorTex: {group: 0, binding: 1, type: "texture"},
                colorTexSampler: {group: 0, binding: 2, type: "storage"},
                blendTex: {group: 0, binding: 3, type: "texture"},
                blendTexSampler: {group: 0, binding: 4, type: "storage"},
            }
        });

        this.quadGeometry = Geometry.Plane();

        this.edgeTex = RenderTexture.Create(Renderer.width, Renderer.height);
        this.blendTex = RenderTexture.Create(Renderer.width, Renderer.height);
        this.finalTex = RenderTexture.Create(Renderer.width, Renderer.height);



        const areaTex = await Texture.Load(AreaTexPNG, Renderer.SwapChainFormat, false);
        const searchTex = await Texture.Load(SearchTexPNG, Renderer.SwapChainFormat, false);
        const colorTex = await Texture.Load(NoAAPNG, Renderer.SwapChainFormat, false);

        const colorTexSampler = TextureSampler.Create({addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"});
        const edgesTexSampler = TextureSampler.Create({addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"});
        const areaTexSampler = TextureSampler.Create({addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"});
        const searchTexSampler = TextureSampler.Create({addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"});
        const blendTexSampler = TextureSampler.Create();
        const u_resolution = new Vector4(1 / Renderer.width, 1 / Renderer.height, Renderer.width, Renderer.height);

        this.shader1.SetSampler("colorTexSampler", colorTexSampler);
        this.shader2.SetSampler("edgesTexSampler", edgesTexSampler);
        this.shader2.SetSampler("areaTexSampler", areaTexSampler);
        this.shader2.SetSampler("searchTexSampler", searchTexSampler);
        this.shader3.SetSampler("colorTexSampler", colorTexSampler);
        this.shader3.SetSampler("blendTexSampler", blendTexSampler);

        
        this.shader2.SetTexture("areaTex", areaTex);
        this.shader2.SetTexture("searchTex", searchTex);
        
        this.shader1.SetTexture("colorTex", colorTex);
        this.shader3.SetTexture("colorTex", colorTex);

        this.shader1.SetArray("u_resolution", u_resolution.elements);
        this.shader2.SetArray("u_resolution", u_resolution.elements);
        this.shader3.SetArray("u_resolution", u_resolution.elements);

        this.initialized = true;
    }

    public execute(resources: ResourcePool) {
        if (this.initialized === false) return;

        const outputTex = resources.getResource(PassParams.LightingPassOutput);
        if (!outputTex) return;

        // this.shader1.SetTexture("colorTex", colorTex);
        // this.shader3.SetTexture("colorTex", colorTex);

        // Edge detection
        RendererContext.BeginRenderPass(this.name + " - Edge", [{clear: true, target: this.edgeTex}], undefined, true);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader1);
        RendererContext.EndRenderPass();


        this.shader2.SetTexture("edgesTex", this.edgeTex);

        RendererContext.BeginRenderPass(this.name + " - Blend", [{clear: true, target: this.blendTex}], undefined, true);
        RendererContext.DrawGeometry(this.quadGeometry, this.shader2);
        RendererContext.EndRenderPass();


        // this.shader3.SetTexture("blendTex", this.blendTex);
        // RendererContext.BeginRenderPass(this.name + " - Final", [{clear: true, target: this.finalTex}], undefined, true);
        // RendererContext.DrawGeometry(this.quadGeometry, this.shader2);
        // RendererContext.EndRenderPass();
        
        RendererContext.CopyTextureToTexture(this.blendTex, outputTex);

        // resources.setResource(PassParams.LightingPassOutput, LightingPassOutputTexture);
    }
}