struct VertexInput {
    @builtin(instance_index) instanceIdx : u32, 
    @builtin(vertex_index) vertexIndex : u32,
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
    #if USE_NORMAL_MAP
        @location(3) tangent : vec4<f32>,
    #endif
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vPosition : vec3<f32>,
    @location(1) vNormal : vec3<f32>,
    @location(2) vUv : vec2<f32>,
    @location(3) @interpolate(flat) instance : u32,
    @location(4) barycenticCoord : vec3<f32>,
    @location(5) tangent : vec3<f32>,
    @location(6) bitangent : vec3<f32>,
};

@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@group(0) @binding(4) var TextureSampler: sampler;

// These get optimized out based on "USE*" defines
@group(0) @binding(5) var AlbedoMap: texture_2d<f32>;
@group(0) @binding(6) var NormalMap: texture_2d<f32>;
@group(0) @binding(7) var HeightMap: texture_2d<f32>;
@group(0) @binding(8) var MetalnessMap: texture_2d<f32>;
@group(0) @binding(9) var EmissiveMap: texture_2d<f32>;
@group(0) @binding(10) var AOMap: texture_2d<f32>;


@group(0) @binding(11) var<storage, read> cameraPosition: vec3<f32>;


struct Material {
    AlbedoColor: vec4<f32>,
    EmissiveColor: vec4<f32>,
    Roughness: f32,
    Metalness: f32,
    Unlit: f32,
    AlphaCutoff: f32,
    Wireframe: f32
};

@group(0) @binding(3) var<storage, read> material: Material;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

    var modelMatrixInstance = modelMatrix[input.instanceIdx];
    var modelViewMatrix = viewMatrix * modelMatrixInstance;

    output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
    
    output.vPosition = input.position;
    output.vNormal = input.normal;
    output.vUv = input.uv;

    output.instance = input.instanceIdx;

    // emit a barycentric coordinate
    output.barycenticCoord = vec3f(0);
    output.barycenticCoord[input.vertexIndex % 3] = 1.0;

    let worldNormal = normalize(modelMatrixInstance * vec4(input.normal, 0.0)).xyz;
    output.vNormal = worldNormal;

    #if USE_NORMAL_MAP
        let worldTangent = normalize(modelMatrixInstance * vec4(input.tangent.xyz, 0.0)).xyz;
        let worldBitangent = cross(worldNormal, worldTangent) * input.tangent.w;

        output.tangent = worldTangent;
        output.bitangent = worldBitangent;
    #endif

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

fn edgeFactor(bary: vec3f) -> f32 {
    let lineThickness = 1.0;
    let d = fwidth(bary);
    let a3 = smoothstep(vec3f(0.0), d * lineThickness, bary);
    return min(min(a3.x, a3.y), a3.z);
}

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;

    let mat = material;

    var uv = input.vUv;// * vec2(4.0, 2.0);

    var modelMatrixInstance = modelMatrix[input.instance];

    var albedo = mat.AlbedoColor;
    var roughness = mat.Roughness;
    var metalness = mat.Metalness;
    var occlusion = 1.0;
    var unlit = mat.Unlit;

    // var albedo = mat.AlbedoColor;
    #if USE_ALBEDO_MAP
        albedo *= textureSample(AlbedoMap, TextureSampler, uv);
    #endif

    if (albedo.a < mat.AlphaCutoff) {
        discard;
    }

    var normal: vec3f = input.vNormal;
    #if USE_NORMAL_MAP
        var tbn: mat3x3<f32>;
        tbn[0] = input.tangent;
        tbn[1] = input.bitangent;
        tbn[2] = input.vNormal;
        
        let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0; // [0 - 1] -> [-1, -1] from brga8unorm to float
        normal = tbn * normalSample;
    #endif

    #if USE_METALNESS_MAP
        let metalnessRoughness = textureSample(MetalnessMap, TextureSampler, uv);
        metalness *= metalnessRoughness.b;
        roughness *= metalnessRoughness.g;
    #endif

    var emissive = mat.EmissiveColor;
    #if USE_EMISSIVE_MAP
        emissive *= textureSample(EmissiveMap, TextureSampler, uv);
    #endif

    #if USE_AO_MAP
        occlusion = textureSample(AOMap, TextureSampler, uv).r;
        occlusion = 1.0;
    #endif

    output.albedo = vec4(albedo.rgb, roughness);
    output.normal = vec4(normal, metalness);
    // output.normal = vec4(input.tangent.xyz, metalness);
    output.RMO = vec4(emissive.rgb, unlit);


    // Wireframe
    output.albedo *= 1.0 - edgeFactor(input.barycenticCoord) * mat.Wireframe;

    // // Flat shading
    // let xTangent: vec3f = dpdx( input.vPosition );
    // let yTangent: vec3f = dpdy( input.vPosition );
    // let faceNormal: vec3f = normalize( cross( xTangent, yTangent ) );

    // output.normal = vec4(faceNormal.xyz, metalness);

    return output;
}