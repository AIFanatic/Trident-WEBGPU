struct VertexInput {
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

@group(0) @binding(3) var albedoSampler: sampler;
@group(0) @binding(4) var albedoMap: texture_2d<f32>;
@group(0) @binding(5) var<storage, read> albedoColor: vec4f;
@group(0) @binding(6) var<storage> useAlbedoMap: u32;

@vertex
fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

    var modelMatrixInstance = modelMatrix[instanceIdx];
    var modelViewMatrix = viewMatrix * modelMatrixInstance;

    output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
    
    // let worldPosition = (modelMatrixInstance * vec4(input.position, 1.0)).xyz;
    output.vPosition = (modelMatrixInstance * vec4(input.position, 1.0)).xyz;
    output.vNormal = normalize((modelMatrixInstance * vec4(input.normal, 0.0)).xyz);
    output.vUv = input.uv;
    
    // output.vPosition = input.position;
    // output.vNormal = input.normal;

    return output;
}

struct FragmentOutput {
    @location(0) position : vec4f,
    @location(1) albedo : vec4f,
    @location(2) normal : vec4f,
};

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;
    output.position = vec4(input.vPosition, 1.0);
    output.normal = normalize(vec4(input.vNormal, 1.0));

    var albedo = albedoColor;
    if (useAlbedoMap > 0) {
        albedo *= textureSample(albedoMap, albedoSampler, input.vUv);
        // albedo *= textureLoad(albedoMap, vec2i(floor(input.position.xy)), 0);
    }
    
    output.albedo = albedo;
    return output;
}