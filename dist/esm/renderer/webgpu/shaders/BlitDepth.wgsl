struct VertexInput {
    @location(0) position : vec2<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vUv : vec2<f32>,
};

@group(0) @binding(0) var textureDepth: texture_depth_2d;
@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var<storage, read> mip: f32;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4(input.position, 0.0, 1.0);
    output.vUv = input.uv;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @builtin(frag_depth) f32 {
    let uv = input.vUv;
    let color = textureSampleLevel(textureDepth, textureSampler, uv, u32(mip));
    return color;
}