struct VertexInput {
    @location(0) position : vec2<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};


struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vUv : vec2<f32>,
};

@group(0) @binding(0) var texture: texture_2d<f32>;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var<storage, read> multiplier: f32;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4(input.position, 0.0, 1.0);
    output.vUv = input.uv;
    return output;
}

fn texture2D_bilinear(t: texture_2d<f32>, uv: vec2f, textureSize: vec2f, texelSize: vec2f) -> vec4f {
    let tl = textureSample(t, textureSampler, uv);
    let tr = textureSample(t, textureSampler, uv + vec2(texelSize.x, 0.0));
    let bl = textureSample(t, textureSampler, uv + vec2(0.0, texelSize.y));
    let br = textureSample(t, textureSampler, uv + vec2(texelSize.x, texelSize.y));
    let f = fract( uv * textureSize );
    let tA = mix( tl, tr, f.x );
    let tB = mix( bl, br, f.x );
    return mix( tA, tB, f.y );
}

fn texture2D_bilinear_v2(t: texture_2d<f32>, iuv: vec2f, textureSize: vec2f, texelSize: vec2f) -> vec4f {
    var uv = iuv;
    let f = fract( uv * textureSize );
    uv += ( .5 - f ) * texelSize;    // move uv to texel centre
    let tl = textureSample(t, textureSampler, uv);
    let tr = textureSample(t, textureSampler, uv + vec2(texelSize.x, 0.0));
    let bl = textureSample(t, textureSampler, uv + vec2(0.0, texelSize.y));
    let br = textureSample(t, textureSampler, uv + vec2(texelSize.x, texelSize.y));
    let tA = mix( tl, tr, f.x );
    let tB = mix( bl, br, f.x );
    return mix( tA, tB, f.y );
}


@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.vUv;
    let color = textureSample(texture, textureSampler, uv);
    return color;

    // let res = vec2f(textureDimensions(texture, 0)) * 2.0;

    // var col = textureSample(texture, textureSampler, uv).rgb / 2.0;
    // col += textureSample(texture, textureSampler, uv + vec2(1., 1.) / res).rgb / 8.0;
    // col += textureSample(texture, textureSampler, uv + vec2(1., -1.) / res).rgb / 8.0;
    // col += textureSample(texture, textureSampler, uv + vec2(-1., 1.) / res).rgb / 8.0;
    // col += textureSample(texture, textureSampler, uv + vec2(-1., -1.) / res).rgb / 8.0;
    // return vec4(col, 1.0);

    // let dim = vec2f(textureDimensions(texture));
    // let texelSize = 1.0 / dim;
    // return texture2D_bilinear_v2(texture, uv, dim, texelSize);
}