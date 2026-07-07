#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

struct VertexInput {
    @builtin(instance_index) instance : u32, 
    @builtin(vertex_index) vertex : u32,
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,

    @location(3) tangent : vec4<f32>,
    #if USE_SKINNING
        @location(4) joints: vec4<u32>,
        @location(5) weights: vec4<f32>,
    #endif
};

struct Material {
    AlbedoColor: vec4<f32>,
    EmissiveColor: vec4<f32>,
    Roughness: f32,
    Metalness: f32,
    Unlit: f32,
    AlphaCutoff: f32,
    RepeatOffset: vec4<f32>, // xy = repeat, zw = offset
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vPosition : vec3<f32>,
    @location(1) vNormal : vec3<f32>,
    @location(2) vUv : vec2<f32>,
    @location(3) @interpolate(flat) instance : u32,
    @location(4) tangent : vec3<f32>,
    @location(5) bitangent : vec3<f32>,
    @location(6) normal : vec3<f32>,
};

@group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
@group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;
@group(0) @binding(2) var<storage, read> material: Material;
@group(0) @binding(3) var TextureSampler: sampler;

// These get optimized out based on "USE*" defines
@group(0) @binding(4) var albedoMap: texture_2d<f32>;
@group(0) @binding(5) var normalMap: texture_2d<f32>;
@group(0) @binding(6) var heightMap: texture_2d<f32>;
@group(0) @binding(7) var armMap: texture_2d<f32>;
@group(0) @binding(8) var emissiveMap: texture_2d<f32>;


#if USE_SKINNING
    @group(1) @binding(0) var<storage, read> boneMatrices: array<mat4x4<f32>>;
#endif

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

      var finalPosition = vec4(input.position, 1.0);
      var finalNormal = vec4(input.normal, 0.0);

    #if USE_SKINNING
        var skinnedPosition = vec4(0.0);
        var skinnedNormal = vec4(0.0);

        let skinMatrix: mat4x4<f32> = 
            boneMatrices[input.joints[0]] * input.weights[0] +
            boneMatrices[input.joints[1]] * input.weights[1] +
            boneMatrices[input.joints[2]] * input.weights[2] +
            boneMatrices[input.joints[3]] * input.weights[3];
        
        finalPosition = skinMatrix * vec4(input.position, 1.0);
        finalNormal   = normalize(skinMatrix * vec4(input.normal, 0.0));
    #endif

    let cameraPos = frameBuffer.viewInverseMatrix[3].xyz;

    let modelMatrixInstance = modelMatrix[input.instance];
    let modelViewMatrix = frameBuffer.viewMatrix * modelMatrixInstance;

    let worldNormal = normalize(modelMatrixInstance * vec4(finalNormal.xyz, 0.0)).xyz;
    let worldTangent = normalize(modelMatrixInstance * vec4(input.tangent.xyz, 0.0)).xyz;
    let worldBitangent = cross(worldNormal, worldTangent) * input.tangent.w;

    output.instance = input.instance;
    output.position = frameBuffer.projectionMatrix * modelViewMatrix * vec4(finalPosition.xyz, 1.0);
    output.vPosition = finalPosition.xyz;
    output.vUv = input.uv;
    
    output.vNormal = worldNormal;
    output.normal = finalNormal.xyz;
    output.tangent = worldTangent;
    output.bitangent = worldBitangent;

    return output;
}

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO : vec4f,
};

fn inversesqrt(v: f32) -> f32 {
    return 1.0 / sqrt(v);
}

fn CalcMipLevel(texture_coord: vec2f) -> f32 {
    let dx = dpdx(texture_coord);
    let dy = dpdy(texture_coord);
    let delta_max_sqr = max(dot(dx, dx), dot(dy, dy));
    
    return max(0.0, 0.5 * log2(delta_max_sqr));
}

@fragment
fn fragmentMain(@builtin(front_facing) isFrontFace: bool, input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;


    let mat = material;

    var uv = input.vUv * mat.RepeatOffset.xy + mat.RepeatOffset.zw;

    var albedo = mat.AlbedoColor;
    var roughness = mat.Roughness;
    var metalness = mat.Metalness;
    var occlusion = 1.0;

    // var albedo = mat.AlbedoColor;
    albedo *= textureSample(albedoMap, TextureSampler, uv);


    // https://bgolus.medium.com/anti-aliased-alpha-test-the-esoteric-alpha-to-coverage-8b177335ae4f
    let cutoff = mat.AlphaCutoff;
    let mipScale = 0.25;
    let albedoMapSize = vec2<f32>(textureDimensions(albedoMap));

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
    let normalSample = textureSample(normalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
    normal = normalize(tbn * normalSample);

    let metalnessRoughness = textureSample(armMap, TextureSampler, uv);

    occlusion *= metalnessRoughness.r;
    roughness *= metalnessRoughness.g;
    metalness *= metalnessRoughness.b;

    // // Unity style - Mask map MT(R) AO(G) SM(A)
    // metalness *= metalnessRoughness.r;
    // occlusion *= metalnessRoughness.g; 
    // roughness *= metalnessRoughness.a;


    var emissive = mat.EmissiveColor;
    emissive *= textureSample(emissiveMap, TextureSampler, uv);

    output.albedo = vec4(albedo.rgb, roughness);
    output.normal = vec4(OctEncode(normal.xyz), occlusion, metalness);
    output.RMO = vec4(emissive.rgb, mat.Unlit);


    // // Flat shading
    // let xTangent: vec3f = dpdx( input.vPosition );
    // let yTangent: vec3f = dpdy( input.vPosition );
    // let faceNormal: vec3f = normalize( cross( xTangent, yTangent ) );

    // output.normal = vec4(OctEncode(faceNormal.xyz), occlusion, metalness);

    return output;
}