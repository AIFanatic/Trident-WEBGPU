struct SpaceTransforms {
  worldViewProjMatrix: mat4x4f,
  worldViewMatrix: mat4x4f,
}

struct VertexInput {
  // Shader assumes the missing 4th float is 1.0
  @location(0) position : vec4f,
  @location(1) normal : vec3f,
  @location(2) uv : vec2f,
  @location(3) vert_tan: vec3f,
  @location(4) vert_bitan: vec3f,
}

struct VertexOutput {
  @builtin(position) posCS : vec4f,    // vertex position in clip space
  @location(0) uv : vec2f,             // vertex texture coordinate
}

// Uniforms
@group(0) @binding(0) var<uniform> spaceTransform : SpaceTransforms;

// Texture info
@group(1) @binding(0) var textureSampler: sampler;
@group(1) @binding(1) var normalTexture: texture_2d<f32>;


@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output : VertexOutput;

  output.posCS = spaceTransform.worldViewProjMatrix * input.position;
  output.uv = input.uv;

  return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var uv : vec2f = input.uv;
    var normalSample = textureSample(normalTexture, textureSampler, uv);
    return vec4f(normalSample.rgb, 1.0);
}
