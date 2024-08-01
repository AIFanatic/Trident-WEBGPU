#include "./CullStructs.wgsl"
#include "./SettingsStructs.wgsl"

struct VertexInput {
    @builtin(instance_index) instanceIndex : u32,
    @builtin(vertex_index) vertexIndex : u32,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) @interpolate(flat) meshID : u32,
    @location(1) @interpolate(flat) vertexID : u32,
    @location(2) vPosition : vec3<f32>,
    @location(3) vNormal : vec3<f32>,
    @location(4) vUv : vec2<f32>,
};

@group(0) @binding(0) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> instanceInfo: array<InstanceInfo>;
@group(0) @binding(3) var<storage, read> meshMaterialInfo: array<MeshMaterialInfo>;
@group(0) @binding(4) var<storage, read> meshMatrixInfo: array<MeshMatrixInfo>;
@group(0) @binding(5) var<storage, read> objectInfo: array<ObjectInfo>;
@group(0) @binding(6) var<storage, read> settings: Settings;

@group(0) @binding(7) var<storage, read> vertices: array<Vertex>;

@group(0) @binding(8) var textureSampler: sampler;
@group(0) @binding(9) var AlbedoMaps: texture_2d_array<f32>;
@group(0) @binding(10) var NormalMaps: texture_2d_array<f32>;
@group(0) @binding(11) var HeightMaps: texture_2d_array<f32>;

const modelMatrix = mat4x4<f32>();
@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let meshID = instanceInfo[input.instanceIndex].meshID;
    let object = objectInfo[meshID];
    // let modelMatrix = mesh.modelMatrix;
    var modelMatrix = meshMatrixInfo[u32(object.meshID)].modelMatrix;
    
    let vertexID = input.vertexIndex + u32(object.meshletID) * u32(settings.maxTriangles * 3.0);
    let vertex = vertices[vertexID];
    let position = vertex.position;
    
    let modelViewMatrix = viewMatrix * modelMatrix;
    output.position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
    output.meshID = u32(meshID);
    output.vertexID = u32(vertexID);
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
    let object = objectInfo[input.meshID];
    let meshMaterial = meshMaterialInfo[u32(object.meshID)];
    var modelMatrix = meshMatrixInfo[u32(object.meshID)].modelMatrix;

    let albedoMapIndex = i32(meshMaterial.mapIndex.x);
    let normalMapIndex = i32(meshMaterial.mapIndex.y);
    let heightMapIndex = i32(meshMaterial.mapIndex.z);

    var output: FragmentOutput;
    var color = meshMaterial.AlbedoColor;

    var albedo = meshMaterial.AlbedoColor;
    var emissive = meshMaterial.EmissiveColor;
    var roughness = meshMaterial.Roughness;
    var metalness = meshMaterial.Metalness;
    var occlusion = 1.0;
    var unlit = meshMaterial.Unlit;
    
    var uv = input.vUv;
    let tbn = getNormalFromMap(input.vNormal, input.vPosition, uv);



    if (bool(settings.useHeightMap) && heightMapIndex != -1) {
        // Lazy
        // let cameraPosition = -vec3(viewMatrix[3][0], viewMatrix[3][1], viewMatrix[3][2]);
        var viewDirection = normalize(settings.cameraPosition.xyz - (modelMatrix * vec4(input.vPosition, 1.0)).xyz);
        // var viewDirection = normalize(cameraPosition - input.vPosition);

        // Variables that control parallax occlusion mapping quality
        let heightScale = settings.heightScale;
        let minLayers = 8.0;
        let maxLayers = 64.0;
        let numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 1.0, 0.0), viewDirection)));
        let layerDepth = 1.0f / numLayers;
        var currentLayerDepth = 0.0;
        
        // Remove the z division if you want less aberated results
        let S = viewDirection.xz  * heightScale; 
        let deltaUVs = S / numLayers;
        
        var UVs = uv;
        var currentDepthMapValue = 1.0 - textureSampleLevel(HeightMaps, textureSampler, UVs, heightMapIndex, 0).r;
        
        // Loop till the point on the heightmap is "hit"
        while(currentLayerDepth < currentDepthMapValue) {
            UVs -= deltaUVs;
            currentDepthMapValue = 1.0 - textureSampleLevel(HeightMaps, textureSampler, UVs, heightMapIndex, 0).r;
            currentLayerDepth += layerDepth;
        }


        // Apply Occlusion (interpolation with prev value)
        let prevTexCoords = UVs + deltaUVs;
        let afterDepth  = currentDepthMapValue - currentLayerDepth;
        let beforeDepth = 1.0 - textureSampleLevel(HeightMaps, textureSampler, prevTexCoords, heightMapIndex, 0).r - currentLayerDepth + layerDepth;
        let weight = afterDepth / (afterDepth - beforeDepth);
        // UVs = prevTexCoords * weight + UVs * (1.0f - weight);
        UVs = mix(UVs, prevTexCoords, weight);

        // // Get rid of anything outside the normal range
        // if(UVs.x > 1.0 || UVs.y > 1.0 || UVs.x < 0.0 || UVs.y < 0.0) {
        //     discard;
        // }
        uv = UVs;


        // // // Parallax occlusion mapping
        // // let prev_uv = UVs + deltaUVs;
        // // let next = currentDepthMapValue - currentLayerDepth;
        // // let prev = textureSampleLevel(HeightMap, TextureSampler, prevTexCoords, 0).r - currentLayerDepth
        // //                 + layer_depth;
        // // let weight = next / (next - prev);
        // // uv = mix(UVs, prev_uv, weight);

        // // uv = parallax_uv(uv, viewDirection, 3);
            
    }

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
    normal = normalize(modelMatrix * vec4(vec3(normal), 0.0)).xyz;

    output.normal = vec4(normal, 1.0);
    output.albedo = albedo;
    output.RMO = vec4(roughness, metalness, occlusion, unlit);
    
    output.albedo = vec4(albedo.rgb, roughness);
    output.normal = vec4(normal.xyz, metalness);
    output.RMO = vec4(emissive.rgb, unlit);


    // Debug
    let vertexColor = vec3f(
        rand(f32(input.vertexID) + 12.1212),
        rand(f32(input.vertexID) + 22.1212),
        rand(f32(input.vertexID) + 32.1212),
    );
    let instanceColor = vec3f(
        rand(f32(input.meshID) + 12.1212),
        rand(f32(input.meshID) + 22.1212),
        rand(f32(input.meshID) + 32.1212),
    );
// ["Instances", "Instance+Triangles", "Albedo Map", "Normal Map", "Height Map", "Lighting"]
    if (u32(settings.viewType) == 0) {
        let c = instanceColor * 0.5;// + vertexColor * 0.1;
        output.albedo = vec4(c, 1.0);
        output.RMO = vec4(emissive.rgb, 1);
    }
        if (u32(settings.viewType) == 1) {
        let c = instanceColor * 0.5 + vertexColor * 0.1;
        output.albedo = vec4(c, 1.0);
        output.RMO = vec4(emissive.rgb, 1);
    }
    else if (u32(settings.viewType) == 2) {
        output.albedo = vec4(output.albedo.xyz, 1.0);
        output.RMO = vec4(emissive.rgb, 1);
    }
    else if (u32(settings.viewType) == 3) {
        output.albedo = vec4(output.normal.xyz, 1.0);
        output.RMO = vec4(emissive.rgb, 1);
    }
    else if (u32(settings.viewType) == 4) {
        // output.albedo = vec4(output.height.xyz, 1.0);
        // output.RMO = vec4(emissive.rgb, 1);
    }

    return output;
    // return vec4f(1);
}