struct VertexInput {
    @location(0) position : vec2<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vUv : vec2<f32>,
};

@group(0) @binding(0) var depthTextureInputSampler: sampler;
@group(0) @binding(1) var depthTextureInput: texture_depth_2d;
@group(0) @binding(2) var<storage, read> currentMip: f32;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4(input.position, 0.0, 1.0);
    output.vUv = input.uv;
    return output;
}

fn HZBReduce(mainTex: texture_depth_2d, inUV: vec2f, invSize: vec2f) -> f32 {
    var depth = vec4f(0.0);
    let uv0 = inUV + vec2f(-0.25f, -0.25f) * invSize;
    let uv1 = inUV + vec2f(0.25f, -0.25f) * invSize;
    let uv2 = inUV + vec2f(-0.25f, 0.25f) * invSize;
    let uv3 = inUV + vec2f(0.25f, 0.25f) * invSize;

    depth.x = textureSampleLevel(mainTex, depthTextureInputSampler, uv0, u32(currentMip));
    depth.y = textureSampleLevel(mainTex, depthTextureInputSampler, uv1, u32(currentMip));
    depth.z = textureSampleLevel(mainTex, depthTextureInputSampler, uv2, u32(currentMip));
    depth.w = textureSampleLevel(mainTex, depthTextureInputSampler, uv3, u32(currentMip));

    let reversed_z = false;
    if (reversed_z) {
        return min(min(depth.x, depth.y), min(depth.z, depth.w));
    }
    else {
        return max(max(depth.x, depth.y), max(depth.z, depth.w));
    }
}

@fragment
fn fragmentMain(input: VertexOutput) -> @builtin(frag_depth) f32 {
    let invSize = 1.0 / (vec2f(textureDimensions(depthTextureInput, u32(currentMip))));
    let inUV = input.vUv;

    let depth = HZBReduce(depthTextureInput, inUV, invSize);
    return depth;
}