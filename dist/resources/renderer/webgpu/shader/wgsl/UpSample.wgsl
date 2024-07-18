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

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.vUv;
    // let color = textureSample(texture, textureSampler, uv);

    // let res = vec2f(textureDimensions(texture, 0)) * multiplier;

    // var col = textureSample(texture, textureSampler, uv).rgb / 2.0;
    // col += textureSample(texture, textureSampler, uv + vec2(1., 1.) / res).rgb / 8.0;
    // col += textureSample(texture, textureSampler, uv + vec2(1., -1.) / res).rgb / 8.0;
    // col += textureSample(texture, textureSampler, uv + vec2(-1., 1.) / res).rgb / 8.0;
    // col += textureSample(texture, textureSampler, uv + vec2(-1., -1.) / res).rgb / 8.0;

    // return vec4(col, 1.0);


    let sampleScale = 2.0;

    let texelSize = 1.0 / vec2f(textureDimensions(texture, 0));
    let d = texelSize.xyxy * vec4f(-1, -1, 1, 1);

    var s = vec4f(0);
    s = textureSample(texture, textureSampler, uv + d.xy);
    s += textureSample(texture, textureSampler, uv + d.zy);
    s += textureSample(texture, textureSampler, uv + d.xw);
    s += textureSample(texture, textureSampler, uv + d.zw);

    return vec4(vec3(s.rgb * 0.25), 1.0);
}