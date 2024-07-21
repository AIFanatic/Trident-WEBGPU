#include "./CullStructs.wgsl"
#include "./SettingsStructs.wgsl"

struct VertexInput {
    @builtin(instance_index) instanceIndex : u32,
    @builtin(vertex_index) vertexIndex : u32,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) @interpolate(flat) meshID : u32,
    @location(1) vPosition : vec3<f32>,
    @location(2) vNormal : vec3<f32>,
    @location(3) vUv : vec2<f32>,
};

@group(0) @binding(0) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> instanceInfo: array<InstanceInfo>;
@group(0) @binding(3) var<storage, read> meshInfo: array<MeshInfo>;
@group(0) @binding(4) var<storage, read> objectInfo: array<ObjectInfo>;
@group(0) @binding(5) var<storage, read> settings: Settings;

struct Vertex {
    position: vec3<f32>,
    normal: vec3<f32>,
    uv: vec2<f32>
};

@group(0) @binding(6) var<storage, read> vertices: array<Vertex>;

@group(0) @binding(7) var textureSampler: sampler;
@group(0) @binding(8) var AlbedoMaps: texture_2d_array<f32>;
@group(0) @binding(9) var NormalMaps: texture_2d_array<f32>;
@group(0) @binding(10) var HeightMaps: texture_2d_array<f32>;

const modelMatrix = mat4x4<f32>();
@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let meshID = instanceInfo[input.instanceIndex].meshID;
    let object = objectInfo[meshID];
    let mesh = meshInfo[u32(object.meshID)];
    let modelMatrix = mesh.modelMatrix;
    
    let vertexID = input.vertexIndex + u32(object.meshletID) * u32(settings.maxTriangles * 3.0);
    let vertex = vertices[vertexID];
    let position = vertex.position;
    
    let modelViewMatrix = viewMatrix * modelMatrix;
    output.position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
    output.meshID = u32(meshID);
    output.vPosition = vertex.position;
    output.vNormal = vertex.normal;
    output.vUv = vertex.uv;

    return output;
}


fn rand(co: f32) -> f32 {
    return fract(sin((co + 1.0) * 12.9898) * 43758.5453);
}

fn inversesqrt(v: f32) -> f32 {
    return 1.0 / sqrt(v);
}

fn getNormalFromMap(N: vec3f, p: vec3f, uv: vec2f ) -> mat3x3<f32> {
    // get edge vectors of the pixel triangle
    let dp1 = dpdx( p );
    let dp2 = dpdy( p );
    let duv1 = dpdx( uv );
    let duv2 = dpdy( uv );

    // solve the linear system
    let dp2perp = cross( dp2, N );
    let dp1perp = cross( N, dp1 );
    let T = dp2perp * duv1.x + dp1perp * duv2.x;
    let B = dp2perp * duv1.y + dp1perp * duv2.y;

    // construct a scale-invariant frame 
    let invmax = inversesqrt( max( dot(T,T), dot(B,B) ) );
    return mat3x3( T * invmax, B * invmax, N );
}

fn triplanarMapping(s: texture_2d_array<f32>, textureIndex: i32, p: vec3f, n: vec3f, k: f32) -> vec4f {
    let x = textureSampleLevel(s, textureSampler, p.yz, textureIndex, 0);
    let y = textureSampleLevel(s, textureSampler, p.zx, textureIndex, 0);
    let z = textureSampleLevel(s, textureSampler, p.xy, textureIndex, 0);
    
    let w = pow( abs(n), vec3(k) );
    return (x*w.x + y*w.y + z*w.z) / (w.x + w.y + w.z);
}

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO : vec4f,
};

@fragment fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    let mesh = meshInfo[u32(input.meshID)];
    let albedoMapIndex = i32(mesh.mapIndex.x);
    let normalMapIndex = i32(mesh.mapIndex.y);
    let heightMapIndex = i32(mesh.mapIndex.z);

    var output: FragmentOutput;
    var color = mesh.AlbedoColor;
    // if (bool(settings.viewInstanceColors)) {
    //     let r = rand(f32(input.meshID) + 12.1212);
    //     let g = rand(f32(input.meshID) + 22.1212);
    //     let b = rand(f32(input.meshID) + 32.1212);
    //     color = vec4(r, g, b, 1.0);
    // }

    // if (albedoMapIndex != -1) {
    //     color = textureSampleLevel(AlbedoMaps, textureSampler, input.uv.xy, albedoMapIndex, 0);
    //     // color = triplanarMapping(albedoMaps, albedoMapIndex, input.test.xyz / 100.0, input.normal.xyz, 0.5);
    // }

    // if (normalMapIndex != -1) {
    //     color = textureSampleLevel(NormalMaps, textureSampler, input.uv.xy, normalMapIndex, 0);
    //     // color = triplanarMapping(albedoMaps, albedoMapIndex, input.test.xyz / 100.0, input.normal.xyz, 0.5);
    // }

    // if (heightMapIndex != -1) {
    //     color = textureSampleLevel(HeightMaps, textureSampler, input.uv.xy, heightMapIndex, 0);
    //     // color = triplanarMapping(albedoMaps, albedoMapIndex, input.test.xyz / 100.0, input.normal.xyz, 0.5);
    // }

    // color *= vec4(input.normal.xyz + 0.5, 1.0);






    var albedo = mesh.AlbedoColor;
    var roughness = mesh.Roughness;
    var metalness = mesh.Metalness;
    var occlusion = 1.0;
    var unlit = mesh.Unlit;
    
    var uv = input.vUv;
    let tbn = getNormalFromMap(input.vNormal, input.vPosition, uv);

    if (albedoMapIndex != -1) {
        albedo *= textureSampleLevel(AlbedoMaps, textureSampler, uv, albedoMapIndex, 0); // TODO: No mipmapping
        // albedo *= textureSampleLevel(AlbedoMaps, textureSampler, input.vPosition.xy / 100.0, albedoMapIndex, 0); // TODO: No mipmapping
        // albedo *= triplanarMapping(AlbedoMaps, albedoMapIndex, input.vPosition.xyz / 100.0, input.vNormal.xyz, 0.5);
    }

    var normal: vec3f = input.vNormal;
    if (normalMapIndex != -1) {
        let normalSample = textureSampleLevel(NormalMaps, textureSampler, uv, normalMapIndex, 0).xyz * 2.0 - 1.0; // TODO: No mipmapping
        // let normalSample = textureSampleLevel(NormalMaps, textureSampler, input.vPosition.xy / 100.0, normalMapIndex, 0).xyz * 2.0 - 1.0; // TODO: No mipmapping
        // let normalSample = triplanarMapping(NormalMaps, normalMapIndex, input.vPosition.xyz / 100.0, input.vNormal.xyz, 0.5).xyz * 2.0 - 1.0;
        normal = tbn * normalSample;
    }
    // Should be normal matrix
    normal = normalize(mesh.modelMatrix * vec4(vec3(normal), 0.0)).xyz;

    var emissive = mesh.EmissiveColor;

    output.normal = vec4(normal, 1.0);
    output.albedo = albedo;
    output.RMO = vec4(roughness, metalness, occlusion, unlit);
    
    output.albedo = vec4(albedo.rgb, roughness);
    output.normal = vec4(normal.xyz, metalness);
    output.RMO = vec4(emissive.rgb, unlit);

    return output;
    // return vec4f(1);
}