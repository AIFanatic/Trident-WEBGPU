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
    @location(3) @interpolate(flat) instance : u32,


    @location(4) wp : vec3<f32>,
    @location(5) wn : vec3<f32>,
};

@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@group(0) @binding(3) var<storage, read> AlbedoColor: vec4f;
@group(0) @binding(4) var<storage, read> EmissiveColor: vec4f;
@group(0) @binding(5) var<storage, read> Roughness: f32;
@group(0) @binding(6) var<storage, read> Metalness: f32;

@group(0) @binding(7) var TextureSampler: sampler;

// These get optimized out based on "USE*" defines
@group(0) @binding(8) var AlbedoMap: texture_2d<f32>;
@group(0) @binding(9) var NormalMap: texture_2d<f32>;
@group(0) @binding(10) var HeightMap: texture_2d<f32>;
@group(0) @binding(11) var RoughnessMap: texture_2d<f32>;
@group(0) @binding(12) var MetalnessMap: texture_2d<f32>;
@group(0) @binding(13) var EmissiveMap: texture_2d<f32>;
@group(0) @binding(14) var AOMap: texture_2d<f32>;


@vertex
fn vertexMain(@builtin(instance_index) instanceIdx : u32, input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

    var modelMatrixInstance = modelMatrix[instanceIdx];
    var modelViewMatrix = viewMatrix * modelMatrixInstance;

    output.position = projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);
    
    // let worldPosition = (modelMatrixInstance * vec4(input.position, 1.0)).xyz;
    output.vPosition = (modelMatrixInstance * vec4(input.position, 1.0)).xyz;
    // output.vNormal = normalize((modelMatrixInstance * vec4(input.normal, 0.0)).xyz);
    // output.vNormal = (modelMatrixInstance * vec4(input.normal, 1.0)).xyz;
    output.vNormal = input.normal;
    output.vUv = input.uv;



    output.wp = input.position;
    output.wn = input.normal;
    
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

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;

    let uv = input.vUv;

    var roughness: f32 = Roughness;
    var metalness: f32 = Metalness;
    var occlusion: f32 = 1.0;

    var albedo = AlbedoColor;
    albedo = vec4(1);
    #if USE_ALBEDO_MAP
        albedo *= textureSample(AlbedoMap, TextureSampler, uv);
    #endif

    var normal = input.vNormal;
    #if USE_NORMAL_MAP
        let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
        let tbn = getNormalFromMap(input.wn, input.wp, uv);
        normal = tbn * normalSample;

        // let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
        // normal = normalSample.xyz;
    #endif
    var modelMatrixInstance = modelMatrix[input.instance];
    normal = normalize(modelMatrixInstance * vec4(normal, 1.0)).xyz;

    var height = vec4(0);
    #if USE_HEIGHT_MAP
        height *= textureSample(HeightMap, TextureSampler, uv);
    #endif

    #if USE_ROUGHNESS_MAP
        roughness *= textureSample(RoughnessMap, TextureSampler, uv).r;
    #endif

    #if USE_METALNESS_MAP
        metalness *= textureSample(MetalnessMap, TextureSampler, uv).r;
    #endif

    var emissive = EmissiveColor;
    #if USE_EMISSIVE_MAP
        emissive *= textureSample(EmissiveMap, TextureSampler, uv);
    #endif

    #if USE_AO_MAP
        occlusion *= textureSample(AOMap, TextureSampler, uv).r;
    #endif

    var scale = vec3(0.5);
    output.normal = vec4(normal, 1.0);
    output.albedo = albedo;
    output.RMO = vec4(roughness, metalness, occlusion, 0.0);
    return output;
}