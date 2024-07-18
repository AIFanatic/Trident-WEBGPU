#include "./CullStructs.wgsl"
#include "./SettingsStructs.wgsl"

struct VertexInput {
    @builtin(instance_index) instanceIndex : u32,
    @builtin(vertex_index) vertexIndex : u32,
    @location(0) position : vec3<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) @interpolate(flat) instance : u32,
};

@group(0) @binding(0) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> vertices: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read> instanceInfo: array<InstanceInfo>;
@group(0) @binding(4) var<storage, read> meshInfo: array<MeshInfo>;
@group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;
@group(0) @binding(6) var<storage, read> settings: Settings;


const modelMatrix = mat4x4<f32>();
@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let meshID = instanceInfo[input.instanceIndex].meshID;
    let object = objectInfo[meshID];
    let mesh = meshInfo[u32(object.meshID)];
    let modelMatrix = mesh.modelMatrix;
    
    let vertexID = input.vertexIndex + u32(object.meshletID) * u32(settings.maxTriangles * 3.0);
    let position = vertices[vertexID];
    
    let modelViewMatrix = viewMatrix * modelMatrix;
    output.position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
    output.instance = meshID;

    return output;
}


fn rand(co: f32) -> f32 {
    return fract(sin((co + 1.0) * 12.9898) * 43758.5453);
}

@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    var color = vec4(0.2);
    if (bool(settings.viewInstanceColors)) {
        let r = rand(f32(input.instance) + 12.1212);
        let g = rand(f32(input.instance) + 22.1212);
        let b = rand(f32(input.instance) + 32.1212);
        color = vec4(r, g, b, 1.0);
    }
    return color;
}