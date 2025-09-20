struct ShadowCSM {
    visibility: f32,
    selectedCascade: i32
};

fn inUnitSquare(u: vec2<f32>) -> bool {
    return all(u >= vec2<f32>(0.0)) && all(u <= vec2<f32>(1.0));
}

fn pcf3x3_quadrant(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, uv: vec2<f32>, z: f32, layer: i32, texel: vec2<f32>) -> f32 {
    // Early accept: fully lit center → 1.0
    let center = textureSampleCompareLevel(shadowTexture, shadowSampler, uv, layer, z);
    if (center >= 1.0) { return 1.0; }

    var sum = 0.0;
    // Row -1
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(-texel.x, -texel.y), layer, z);
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(         0.0, -texel.y), layer, z);
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2( texel.x, -texel.y), layer, z);
    // Row  0
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(-texel.x,          0.0), layer, z);
    sum += center;
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2( texel.x,          0.0), layer, z);
    // Row +1
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(-texel.x,  texel.y), layer, z);
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2(         0.0,  texel.y), layer, z);
    sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2( texel.x,  texel.y), layer, z);

    return sum * (1.0 / 9.0);
}

const MAX_RADIUS : i32 = 2; // up to 5×5
fn pcfBounded(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, uv: vec2<f32>, z: f32, layer: i32, texel: vec2<f32>, radius: i32) -> f32 {
    let r = clamp(radius, 0, MAX_RADIUS);
    if (r <= 1) { return pcf3x3_quadrant(shadowTexture, shadowSampler, uv, z, layer, texel); }

    var sum = 0.0;
    for (var j = -r; j <=  r; j = j + 1) {
        for (var i = -r; i <=  r; i = i + 1) {
            sum += textureSampleCompareLevel(shadowTexture, shadowSampler, uv + vec2<f32>(f32(i), f32(j)) * texel, layer, z);
        }
    }
    let taps = f32((2 * r + 1) * (2 * r + 1));
    return sum / taps;
}