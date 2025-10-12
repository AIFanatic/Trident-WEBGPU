#include "./Structs.wgsl"

struct VertexInput {
    @builtin(instance_index) instanceIndex : u32,
    @builtin(vertex_index)   vertexIndex   : u32,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) @interpolate(flat) meshID : u32,
    @location(1) @interpolate(flat) vertexID : u32,
    @location(2) vPosition : vec3<f32>,
    @location(3) vNormal   : vec3<f32>,
    @location(4) vUv       : vec2<f32>,
    @location(5) barycenticCoord : vec3<f32>,
};

@group(0) @binding(0) var<storage, read> frameBuffer : FrameBuffer;
// Buffers
@group(1) @binding(0) var<storage, read> vertexBuffer           : array<vec4<f32>>;   // interleaved: 8 floats per vertex
@group(1) @binding(1) var<storage, read> meshletVerticesBuffer  : array<u32>;   // global vertex ids
@group(1) @binding(2) var<storage, read> meshletTrianglesBuffer : array<u32>;   // local ids (expanded from u8)
@group(1) @binding(3) var<storage, read> meshletBuffer          : array<MeshletInfo>;
@group(1) @binding(4) var<storage, read> meshBuffer             : array<MeshInfo>;
@group(1) @binding(5) var<storage, read> lodMeshBuffer          : array<LodMeshInfo>;
@group(1) @binding(6) var<storage, read> objectInfoBuffer       : array<ObjectInfo>;
@group(1) @binding(7) var<storage, read> instanceInfoBuffer     : array<InstanceInfo>;

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let instanceInfo = instanceInfoBuffer[input.instanceIndex];
    let objectInfo = objectInfoBuffer[instanceInfo.objectIndex];
    let meshletInfo = meshletBuffer[objectInfo.meshletIndex];
    let lodMeshInfo = lodMeshBuffer[objectInfo.lodMeshIndex];
    let meshInfo = meshBuffer[lodMeshInfo.meshIndex];

    // Which micro-triangle and which corner?
    let triIndex    = input.vertexIndex / 3u;
    let corner      = input.vertexIndex % 3u;

    // // Guard (optional): avoid reading past the triangle_count
    // // If your DrawIndirect provides exact counts, this isn't needed.
    // if (triIndex >= meshletInfo.triangle_count) {
    //     output.position = vec4<f32>(0.0);
    //     return output;
    // }

    // 1) local vertex id (0..vertex_count-1)
    let localVid = meshletTrianglesBuffer[u32(meshletInfo.triangle_offset) + lodMeshInfo.baseTriangleOffset + triIndex * 3u + corner];

    // 2) global vertex id via meshletVerticesBuffer
    let globalVid = meshletVerticesBuffer[u32(meshletInfo.vertex_offset) + lodMeshInfo.baseVertexOffset + localVid];

    const STRIDE_V4 = 2u; // two vec4s per vertex
    let v4Base = (lodMeshInfo.baseVertexFloatOffset / 4u) + globalVid * STRIDE_V4;
    let v0 = vertexBuffer[v4Base + 0u];
    let v1 = vertexBuffer[v4Base + 1u];
    
    let pos    = v0.xyz;
    let normal = vec3f(v0.w, v1.x, v1.y);
    let uv     = v1.zw; // if needed

    output.position = frameBuffer.projectionViewMatrix * meshInfo.modelMatrix * vec4f(pos, 1.0);
    output.vNormal = normal;
    output.vUv = uv;
    output.meshID = objectInfo.meshletIndex;
    return output;
}

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO    : vec4f,
};

fn rand(co: f32) -> f32 {
    return fract(sin((co + 1.0) * 12.9898) * 43758.5453);
}

@fragment fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;
    output.albedo = vec4(input.vNormal, 1.0);
    output.normal = vec4(0.5, 0.5, 1.0, 1.0);
    output.RMO    = vec4(0.0);


    let instanceColor = vec3f(
        rand(f32(input.meshID) + 12.1212),
        rand(f32(input.meshID) + 22.1212),
        rand(f32(input.meshID) + 32.1212),
    );
    let c = instanceColor;// + vertexColor * 0.1;
    output.albedo = vec4(c, 1.0);
    
    return output;
}