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
    @location(5) tangent : vec3<f32>,
    @location(6) bitangent : vec3<f32>,
    @location(7) @interpolate(flat) instance : u32,
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
@group(2) @binding(4) var ARMMap: texture_2d<f32>;
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

fn CalcMipLevel(texture_coord: vec2f) -> f32 {
    let dx = dpdx(texture_coord);
    let dy = dpdy(texture_coord);
    let delta_max_sqr = max(dot(dx, dx), dot(dy, dy));
    
    return max(0.0, 0.5 * log2(delta_max_sqr));
}

@fragment fn fragmentMain(@builtin(front_facing) isFrontFace: bool, input: VertexOutput) -> FragmentOutput {
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

    // var albedo = mat.AlbedoColor;
    albedo *= textureSample(AlbedoMap, TextureSampler, uv);


    // https://bgolus.medium.com/anti-aliased-alpha-test-the-esoteric-alpha-to-coverage-8b177335ae4f
    let cutoff = mat.AlphaCutoff;
    let mipScale = 0.25;
    let albedoMapSize = vec2<f32>(textureDimensions(AlbedoMap));

    var alphaAA = albedo.a;
    alphaAA *= 1.0 + max(0.0, CalcMipLevel(uv * albedoMapSize)) * mipScale;
    alphaAA = (alphaAA - cutoff) / max(fwidth(alphaAA), 0.0001) + 0.5;

    if (cutoff > 0.0 && alphaAA < cutoff) {
        discard;
    }

    // if (albedo.a < mat.AlphaCutoff) {
    //     discard;
    // }

    var normal: vec3f = normalize(input.vNormal);
    var tbn: mat3x3<f32>;
    tbn[0] = input.tangent;      // column-major: T, B, N
    tbn[1] = input.bitangent;
    tbn[2] = input.vNormal;
    if (!isFrontFace) {
        // tbn[0] = -tbn[0];
        tbn[1] = -tbn[1];
        tbn[2] = -tbn[2];
    }
    let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
    normal = normalize(tbn * normalSample);

    let metalnessRoughness = textureSample(ARMMap, TextureSampler, uv);

    occlusion *= metalnessRoughness.r;
    roughness *= metalnessRoughness.g;
    metalness *= metalnessRoughness.b;

    // // Unity style - Mask map MT(R) AO(G) SM(A)
    // metalness *= metalnessRoughness.r;
    // occlusion *= metalnessRoughness.g; 
    // roughness *= metalnessRoughness.a;


    var emissive = mat.EmissiveColor;
    emissive *= textureSample(EmissiveMap, TextureSampler, uv);

    output.albedo = vec4(albedo.rgb, roughness);
    output.normal = vec4(OctEncode(normal.xyz), occlusion, metalness);
    output.RMO = vec4(emissive.rgb, mat.Unlit);

    return output;
}
