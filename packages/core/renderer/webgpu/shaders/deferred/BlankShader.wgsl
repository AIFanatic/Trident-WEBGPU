struct VertexInput {
    @builtin(instance_index) instanceIdx : u32, 
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vPosition : vec3<f32>,
    @location(1) vNormal : vec3<f32>,
    @location(2) vUv : vec2<f32>,
};

@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
@group(0) @binding(3) var<storage, read> cameraPosition: vec4<f32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

    var modelMatrixInstance = modelMatrix[input.instanceIdx];
    var modelViewMatrix = viewMatrix * modelMatrixInstance;

    output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
    
    output.vPosition = input.position;
    output.vNormal = input.normal;
    output.vUv = input.uv;

    return output;
}

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO : vec4f,
};

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;

    var albedo = vec3f(1.0);
    var unlit = 0.0;
    output.albedo = vec4(albedo.rgb, 1.0);
    output.normal = vec4(input.vNormal.xyz, 0.0);
    output.RMO = vec4(vec3(0.0), unlit);

    return output;
}