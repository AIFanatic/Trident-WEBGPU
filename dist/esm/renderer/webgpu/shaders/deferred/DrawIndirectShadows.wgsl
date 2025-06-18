#include "./CullStructs.wgsl"

struct VertexInput {
    @builtin(instance_index) instanceIndex : u32,
    @builtin(vertex_index) vertexIndex : u32,
};

@group(0) @binding(1) var<storage, read> projectionMatrix: array<mat4x4<f32>, 4>;
@group(0) @binding(2) var<storage, read> instanceInfo: array<InstanceInfo>;
@group(0) @binding(4) var<storage, read> meshMatrixInfo: array<MeshMatrixInfo>;
@group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;

@group(0) @binding(7) var<storage, read> vertices: array<f32>;

@group(0) @binding(8) var<storage, read> cascadeIndex: f32;

@vertex fn vertexMain(input: VertexInput) -> @builtin(position) vec4<f32> {
    let meshID = instanceInfo[input.instanceIndex].meshID;
    let object = objectInfo[meshID];
    var modelMatrix = meshMatrixInfo[u32(object.meshID)].modelMatrix;
    
    let maxTriangles = 128.0;
    let vertexID = input.vertexIndex + u32(object.meshletID) * u32(maxTriangles * 3.0);
    let position = vec3f(vertices[vertexID * 8 + 0], vertices[vertexID * 8 + 1], vertices[vertexID * 8 + 2]);
    return projectionMatrix[u32(cascadeIndex)] * modelMatrix * vec4(position.xyz, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4(1.0);
}