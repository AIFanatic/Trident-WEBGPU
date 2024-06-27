struct VertexInput {
    @builtin(instance_index) instanceIdx : u32, 
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
};

@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@group(0) @binding(4) var TextureSampler: sampler;

// These get optimized out based on "USE*" defines
@group(0) @binding(5) var AlbedoMap: texture_2d<f32>;
@group(0) @binding(6) var NormalMap: texture_2d<f32>;
@group(0) @binding(7) var HeightMap: texture_2d<f32>;
@group(0) @binding(8) var RoughnessMap: texture_2d<f32>;
@group(0) @binding(9) var MetalnessMap: texture_2d<f32>;
@group(0) @binding(10) var EmissiveMap: texture_2d<f32>;
@group(0) @binding(11) var AOMap: texture_2d<f32>;


@group(0) @binding(12) var<storage, read> cameraPosition: vec3<f32>;


struct Material {
    AlbedoColor: vec4<f32>,
    EmissiveColor: vec4<f32>,
    Roughness: f32,
    Metalness: f32,
    Unlit: f32
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

    let mat = material;

    var uv = input.vUv;// * vec2(4.0, 2.0);
    let tbn = getNormalFromMap(input.vNormal, input.vPosition, uv);
    var modelMatrixInstance = modelMatrix[input.instance];

    #if USE_HEIGHT_MAP
        var viewDirection = normalize(cameraPosition - (modelMatrixInstance * vec4(input.vPosition, 1.0)).xyz);
        // var viewDirection = normalize(cameraPosition - input.vPosition);

        // Variables that control parallax occlusion mapping quality
        let heightScale = 0.05;
        let minLayers = 8.0;
        let maxLayers = 64.0;
        let numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 1.0, 0.0), viewDirection)));
        let layerDepth = 1.0f / numLayers;
        var currentLayerDepth = 0.0;
        
        // Remove the z division if you want less aberated results
        let S = viewDirection.xz  * heightScale; 
        let deltaUVs = S / numLayers;
        
        var UVs = uv;
        var currentDepthMapValue = 1.0 - textureSample(HeightMap, TextureSampler, UVs).r;
        
        // Loop till the point on the heightmap is "hit"
        while(currentLayerDepth < currentDepthMapValue) {
            UVs -= deltaUVs;
            currentDepthMapValue = 1.0 - textureSampleLevel(HeightMap, TextureSampler, UVs, 0).r;
            currentLayerDepth += layerDepth;
        }


        // Apply Occlusion (interpolation with prev value)
        let prevTexCoords = UVs + deltaUVs;
        let afterDepth  = currentDepthMapValue - currentLayerDepth;
        let beforeDepth = 1.0 - textureSample(HeightMap, TextureSampler, prevTexCoords).r - currentLayerDepth + layerDepth;
        let weight = afterDepth / (afterDepth - beforeDepth);
        // UVs = prevTexCoords * weight + UVs * (1.0f - weight);
        UVs = mix(UVs, prevTexCoords, weight);

        // // Get rid of anything outside the normal range
        // if(UVs.x > 1.0 || UVs.y > 1.0 || UVs.x < 0.0 || UVs.y < 0.0) {
        //     discard;
        // }
        uv = UVs;


        // // Parallax occlusion mapping
        // let prev_uv = UVs + deltaUVs;
        // let next = currentDepthMapValue - currentLayerDepth;
        // let prev = textureSampleLevel(HeightMap, TextureSampler, prevTexCoords, 0).r - currentLayerDepth
        //                 + layer_depth;
        // let weight = next / (next - prev);
        // uv = mix(UVs, prev_uv, weight);

        // uv = parallax_uv(uv, viewDirection, 3);
            
    #endif
    

    var albedo = mat.AlbedoColor;
    var roughness = mat.Roughness;
    var metalness = mat.Metalness;
    var occlusion = 1.0;
    var unlit = mat.Unlit;

    // var albedo = mat.AlbedoColor;
    #if USE_ALBEDO_MAP
        albedo *= textureSample(AlbedoMap, TextureSampler, uv);
    #endif

    var normal: vec3f = input.vNormal;
    #if USE_NORMAL_MAP
        let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
        normal = tbn * normalSample;

        // let normalSample = textureSample(NormalMap, TextureSampler, uv).xyz * 2.0 - 1.0;
        // normal = normalSample.xyz;
    #endif
    // Should be normal matrix
    normal = normalize(modelMatrixInstance * vec4(vec3(normal), 0.0)).xyz;

    #if USE_ROUGHNESS_MAP
        roughness *= textureSample(RoughnessMap, TextureSampler, uv).r;
    #endif

    #if USE_METALNESS_MAP
        metalness *= textureSample(MetalnessMap, TextureSampler, uv).r;
    #endif

    var emissive = mat.EmissiveColor;
    #if USE_EMISSIVE_MAP
        emissive *= textureSample(EmissiveMap, TextureSampler, uv);
    #endif

    #if USE_AO_MAP
        occlusion = textureSample(AOMap, TextureSampler, uv).r;
        occlusion = 1.0;
    #endif

    output.normal = vec4(normal, 1.0);
    output.albedo = albedo;
    output.RMO = vec4(roughness, metalness, occlusion, unlit);
    
    output.albedo = vec4(albedo.rgb, roughness);
    output.normal = vec4(normal.xyz, metalness);
    output.RMO = vec4(emissive.rgb, unlit);

    return output;
}