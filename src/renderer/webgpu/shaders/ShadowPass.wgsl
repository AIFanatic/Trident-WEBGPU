struct VertexInput {
    @builtin(instance_index) instanceIdx : u32, 
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};


struct VertexOutput {
    @builtin(position) position : vec4<f32>,
};

@group(0) @binding(0) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
@group(0) @binding(1) var<storage, read> cascadeIndex: f32;

@group(1) @binding(0) var<storage, read> modelMatrix: array<mat4x4<f32>>;


const numCascades = 4;

@vertex
fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
    var output : VertexOutput;

    let modelMatrixInstance = modelMatrix[input.instanceIdx];
    let lightProjectionViewMatrix = projectionMatrix[u32(cascadeIndex)];

    return lightProjectionViewMatrix * modelMatrixInstance * vec4(input.position, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4(1.0);
}