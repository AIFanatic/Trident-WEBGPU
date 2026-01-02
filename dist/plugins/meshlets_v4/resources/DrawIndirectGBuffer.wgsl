#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
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
    @location(6) tangent : vec3<f32>,
    @location(7) bitangent : vec3<f32>,
    @location(8) @interpolate(flat) instance : u32,
};

@group(0) @binding(0) var<storage, read> frameBuffer : FrameBuffer;
// Buffers
@group(1) @binding(0) var<storage, read> vertexBuffer           : array<vec4<f32>>;   // interleaved: 12 floats per vertex
@group(1) @binding(1) var<storage, read> meshletTrianglesBuffer : array<u32>;   // global vertex ids
@group(1) @binding(2) var<storage, read> meshletBuffer          : array<MeshletInfo>;
@group(1) @binding(3) var<storage, read> meshBuffer             : array<MeshInfo>;
@group(1) @binding(4) var<storage, read> lodMeshBuffer          : array<LodMeshInfo>;
@group(1) @binding(5) var<storage, read> objectInfoBuffer       : array<ObjectInfo>;
@group(1) @binding(6) var<storage, read> instanceInfoBuffer     : array<InstanceInfo>;
@group(1) @binding(7) var<storage, read> materialInfoBuffer     : array<MaterialInfo>;

@group(2) @binding(0) var TextureSampler: sampler;
@group(2) @binding(1) var AlbedoMap: texture_2d<f32>;
@group(2) @binding(2) var NormalMap: texture_2d<f32>;
@group(2) @binding(3) var HeightMap: texture_2d<f32>;
@group(2) @binding(4) var MetalnessMap: texture_2d<f32>;
@group(2) @binding(5) var EmissiveMap: texture_2d<f32>;
@group(2) @binding(6) var AOMap: texture_2d<f32>;

@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let instanceInfo = instanceInfoBuffer[input.instanceIndex];
    let objectInfo = objectInfoBuffer[instanceInfo.objectIndex];
    let meshletInfo = meshletBuffer[objectInfo.meshletIndex];
    let lodMeshInfo = lodMeshBuffer[objectInfo.lodMeshIndex];
    let meshInfo = meshBuffer[lodMeshInfo.meshIndex];

    // Which micro-triangle and which corner?
    let triIndex    = input.vertexIndex / 3u;
    let triCount = u32(meshletInfo.index_count) / 3u;
    let corner      = input.vertexIndex % 3u;

    if (triIndex >= triCount) {
        output.position = vec4f(2.0, 2.0, 2.0, 1.0);
        return output;
    }

    // global vertex id directly from triangle buffer
    let globalVid = meshletTrianglesBuffer[u32(meshletInfo.index_offset) + lodMeshInfo.baseTriangleOffset + triIndex * 3u + corner];

    const STRIDE_V4 = 3u; // three vec4s per vertex
    let v4Base = (lodMeshInfo.baseVertexFloatOffset / 4u) + globalVid * STRIDE_V4;
    let v0 = vertexBuffer[v4Base + 0u];
    let v1 = vertexBuffer[v4Base + 1u];
    let v2 = vertexBuffer[v4Base + 2u];
    
    let pos    = v0.xyz;
    let normal = vec3f(v0.w, v1.x, v1.y);
    let uv     = v1.zw; // if needed
    let worldNormal = normalize(meshInfo.modelMatrix * vec4(normal.xyz, 0.0)).xyz;

    output.position = frameBuffer.viewProjectionMatrix * meshInfo.modelMatrix * vec4f(pos, 1.0);
    output.vNormal = worldNormal;
    output.vUv = uv;
    output.meshID = objectInfo.meshletIndex;


    let tangent = v2;
    let worldTangent = normalize(meshInfo.modelMatrix * vec4(tangent.xyz, 0.0)).xyz;
    let worldBitangent = cross(worldNormal, worldTangent) * tangent.w;

    output.tangent = worldTangent;
    output.bitangent = worldBitangent;
    
    output.instance = input.instanceIndex;

    return output;
}

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO    : vec4f,
};

@fragment fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;
    output.albedo = vec4(1.0);

    let instanceColor = vec3f(
        rand(f32(input.meshID) + 12.1212),
        rand(f32(input.meshID) + 22.1212),
        rand(f32(input.meshID) + 32.1212),
    );
    let c = instanceColor;// + vertexColor * 0.1;
    output.albedo = vec4(c, 1.0);



    let instanceInfo = instanceInfoBuffer[input.instance];
    let objectInfo = objectInfoBuffer[instanceInfo.objectIndex];
    let meshletInfo = meshletBuffer[objectInfo.meshletIndex];
    let lodMeshInfo = lodMeshBuffer[objectInfo.lodMeshIndex];
    let meshInfo = meshBuffer[lodMeshInfo.meshIndex];


    let mat = materialInfoBuffer[lodMeshInfo.materialIndex];

    var uv = input.vUv * mat.RepeatOffset.xy + mat.RepeatOffset.zw;

    var albedo = mat.AlbedoColor;
    var roughness = mat.Roughness;
    var metalness = mat.Metalness;
    var occlusion = 1.0;

    // #if USE_ALBEDO_MAP
        albedo *= textureSample(AlbedoMap, TextureSampler, uv);
    // #endif

    if (albedo.a < mat.AlphaCutoff) {
        discard;
    }

    var normal: vec3f = normalize(input.vNormal);
    // // #if USE_NORMAL_MAP
    //     var tbn: mat3x3<f32>;
    //     tbn[0] = input.tangent;      // column-major: T, B, N
    //     tbn[1] = input.bitangent;
    //     tbn[2] = input.vNormal;

    //     let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
    //     normal = normalize(tbn * normalSample);
    // // #endif

    // // #if USE_METALNESS_MAP
    //     let metalnessRoughness = textureSample(MetalnessMap, TextureSampler, uv);
    //     metalness *= metalnessRoughness.b;
    //     roughness *= metalnessRoughness.g;
    // // #endif

    var emissive = mat.EmissiveColor;
    // #if USE_EMISSIVE_MAP
    //     emissive *= textureSample(EmissiveMap, TextureSampler, uv);
    // #endif

    // #if USE_AO_MAP
    //     occlusion = textureSample(AOMap, TextureSampler, uv).r;
    // #endif

    output.albedo = vec4(albedo.rgb, roughness);

    output.normal = vec4(OctEncode(normal.xyz), occlusion, metalness);
    output.RMO = vec4(emissive.rgb, mat.Unlit);


    // // Wireframe
    // output.albedo *= 1.0 - edgeFactor(input.barycenticCoord) * mat.Wireframe;

    // // Flat shading
    // let xTangent: vec3f = dpdx( input.vPosition );
    // let yTangent: vec3f = dpdy( input.vPosition );
    // let faceNormal: vec3f = normalize( cross( xTangent, yTangent ) );

    // output.normal = vec4(OctEncode(faceNormal.xyz), occlusion, metalness);

    return output;
}
