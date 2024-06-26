struct VertexInput {
    @location(0) position : vec2<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vUv : vec2<f32>,
};

@group(0) @binding(0) var textureSampler: sampler;

@group(0) @binding(1) var albedoTexture: texture_2d<f32>;
@group(0) @binding(2) var normalTexture: texture_2d<f32>;
@group(0) @binding(3) var ermoTexture: texture_2d<f32>;
@group(0) @binding(4) var depthTexture: texture_depth_2d;
// @group(0) @binding(5) var shadowPassDepth: texture_depth_2d;

@group(0) @binding(5) var shadowPassDepth: texture_depth_2d_array;



struct Light {
    position: vec4<f32>,
    projectionMatrix: mat4x4<f32>,
    csmProjectionMatrix: array<mat4x4<f32>, numCascades>,
    viewMatrix: mat4x4<f32>,
    viewMatrixInverse: mat4x4<f32>,
    color: vec4<f32>,
    params1: vec4<f32>,
    params2: vec4<f32>,
};

@group(0) @binding(6) var<storage, read> lights: array<Light>;
@group(0) @binding(7) var<storage, read> lightCount: u32;






struct View {
    projectionOutputSize: vec4<f32>,
    viewPosition: vec4<f32>,
    projectionInverseMatrix: mat4x4<f32>,
    viewInverseMatrix: mat4x4<f32>,
};
@group(0) @binding(8) var<storage, read> view: View;


@group(0) @binding(9) var shadowSampler: sampler;






const numCascades = 4;
const debug_cascadeColors = array<vec4<f32>, 5>(
    vec4<f32>(1.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 1.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 0.0, 1.0)
);
@group(0) @binding(10) var shadowSamplerComp: sampler_comparison;


@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4(input.position, 0.0, 1.0);
    output.vUv = input.uv;
    return output;
}
const PI = 3.141592653589793;

const SPOT_LIGHT = 0;
const DIRECTIONAL_LIGHT = 1;
const POINT_LIGHT = 2;
const AREA_LIGHT = 3;

struct SpotLight {
    pointToLight: vec3<f32>,
    color: vec3<f32>,
    direction: vec3<f32>,
    range: f32,
    intensity: f32,
    angle: f32,
}

struct DirectionalLight {
    direction: vec3<f32>,
    color: vec3<f32>,
}

struct PointLight {
    pointToLight: vec3<f32>,
    color: vec3<f32>,
    range: f32,
    intensity: f32,
}

struct AreaLight {
    pointToLight: vec3<f32>,
    direction: vec3<f32>,
    color: vec3<f32>,
    range: f32,
    intensity: f32,
}

struct Surface {
    albedo: vec3<f32>,
    emissive: vec3<f32>,
    metallic: f32,
    roughness: f32,
    occlusion: f32,
    worldPosition: vec3<f32>,
    N: vec3<f32>,
    F0: vec3<f32>,
    V: vec3<f32>,
};

fn reconstructWorldPosFromZ(
    coords: vec2<f32>,
    size: vec2<f32>,
    depthTexture: texture_depth_2d,
    projInverse: mat4x4<f32>,
    viewInverse: mat4x4<f32>
    ) -> vec4<f32> {
    let uv = coords.xy / size;
    var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);
        let x = uv.x * 2.0 - 1.0;
        let y = (1.0 - uv.y) * 2.0 - 1.0;
        let projectedPos = vec4(x, y, depth, 1.0);
        var worldPosition = projInverse * projectedPos;
        worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
        worldPosition = viewInverse * worldPosition;
    return worldPosition;
}

fn DistributionGGX(N: vec3<f32>, H: vec3<f32>, roughness: f32) -> f32 {
    let a      = roughness*roughness;
    let a2     = a*a;
    let NdotH  = max(dot(N, H), 0.0);
    let NdotH2 = NdotH*NdotH;

    let num   = a2;
    var denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
    return num / denom;
}

fn GeometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
    let r = (roughness + 1.0);
    let k = (r*r) / 8.0;

    let num   = NdotV;
    let denom = NdotV * (1.0 - k) + k;

    return num / denom;
}

fn GeometrySmith(N: vec3<f32>, V: vec3<f32>, L: vec3<f32>, roughness: f32) -> f32 {
    let NdotV = max(dot(N, V), 0.0);
    let NdotL = max(dot(N, L), 0.0);
    let ggx2  = GeometrySchlickGGX(NdotV, roughness);
    let ggx1  = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

fn FresnelSchlick(cosTheta: f32, F0: vec3<f32>) -> vec3<f32> {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
} 

fn rangeAttenuation(range : f32, distance : f32) -> f32 {
    if (range <= 0.0) {
        // Negative range means no cutoff
        return 1.0 / pow(distance, 2.0);
    }
    return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);
}

fn CalculateBRDF(surface: Surface, pointToLight: vec3<f32>) -> vec3<f32> {
    // cook-torrance brdf
    let L = normalize(pointToLight);
    let H = normalize(surface.V + L);
    let distance = length(pointToLight);

    let NDF = DistributionGGX(surface.N, H, surface.roughness);
    let G = GeometrySmith(surface.N, surface.V, L, surface.roughness);
    let F = FresnelSchlick(max(dot(H, surface.V), 0.0), surface.F0);

    let kD = (vec3(1.0, 1.0, 1.0) - F) * (1.0 - surface.metallic);

    let NdotL = max(dot(surface.N, L), 0.0);

    let numerator = NDF * G * F;
    let denominator = max(4.0 * max(dot(surface.N, surface.V), 0.0) * NdotL, 0.001);
    let specular = numerator / vec3(denominator, denominator, denominator);

    return (kD * surface.albedo.rgb / vec3(PI, PI, PI) + specular) * NdotL;
}

fn PointLightRadiance(light : PointLight, surface : Surface) -> vec3<f32> {
    let distance = length(light.pointToLight);
    let attenuation = rangeAttenuation(light.range, distance);
    let radiance = CalculateBRDF(surface, light.pointToLight) * light.color * light.intensity * attenuation;
    return radiance;
}

fn DirectionalLightRadiance(light: DirectionalLight, surface : Surface) -> vec3<f32> {
    return CalculateBRDF(surface, light.direction) * light.color;
}

fn SpotLightRadiance(light : SpotLight, surface : Surface) -> vec3<f32> {
    let L = normalize(light.pointToLight);
    let distance = length(light.pointToLight);

    let angle = acos(dot(light.direction, L));

    // Check if the point is within the light cone
    if angle > light.angle {
        return vec3(0.0, 0.0, 0.0); // Outside the outer cone
    }

    let intensity = smoothstep(light.angle, 0.0, angle);
    let attenuation = rangeAttenuation(light.range, distance) * intensity;

    let radiance = CalculateBRDF(surface, light.pointToLight) * light.color * light.intensity * attenuation;
    return radiance;
}

fn Tonemap_ACES(x: vec3f) -> vec3f {
    // Narkowicz 2015, "ACES Filmic Tone Mapping Curve"
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    return (x * (a * x + b)) / (x * (c * x + d) + e);
}

fn OECF_sRGBFast(linear: vec3f) -> vec3f {
    return pow(linear, vec3(0.454545));
}

fn CalculateShadow(worldPosition: vec3f, normal: vec3f, light: Light, lightIndex: u32) -> f32 {
    var posFromLight = light.projectionMatrix * light.viewMatrix * vec4(worldPosition, 1.0);
    posFromLight = vec4(posFromLight.xyz / posFromLight.w, 1.0);
    let shadowPos = vec3(posFromLight.xy * vec2(0.5,-0.5) + vec2(0.5, 0.5), posFromLight.z);
    // let inRange = shadowPos.x >= 0.0 && shadowPos.x <= 1.0 && shadowPos.y >= 0.0 && shadowPos.y <= 1.0 && shadowPos.z >= 0.0 && shadowPos.z <= 1.0;
    var visibility = 0.0;

    let shadowIndex = lightIndex;

    let lightDirection = normalize(light.position.xyz - worldPosition);
    
    if (shadowPos.z <= 1.0) {
        let sampleRadius = 2.0;
        let pixelSize = 1.0 / vec2f(textureDimensions(shadowPassDepth));
        // let pixelSize = 1.0 / vec2f(1024);

		let bias = max(0.00025 * (1.0 - dot(normal, lightDirection)), 0.00009);
        // let bias = 0.0009;

        // // Naive Soft shadows
        // for (var y = -sampleRadius; y <= sampleRadius; y+=1.0) {
        //     for (var x = -sampleRadius; x <= sampleRadius; x+=1.0) {
        //         let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy + vec2(x,y) * pixelSize, shadowIndex, 0);
        //         // if (projectedDepth <= posFromLight.z - bias) {
        //         if (posFromLight.z > projectedDepth + bias) {
        //             visibility += 1.0;
        //         }
        //     }
        // }
        // visibility /= pow((sampleRadius * 2.0 + 1.0), 2.0);
        
        // Hard shadows
        let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);
        if (posFromLight.z > projectedDepth + bias) {
            visibility = 1.0;
        }
    }
    
    return visibility;
}

fn CalculateDirectionalLightShadow(worldPosition: vec3<f32>, normal: vec3<f32>, light: Light, directionalLight: DirectionalLight, lightIndex: u32) -> f32 {
    var posFromLight = light.projectionMatrix * light.viewMatrix * vec4(worldPosition, 1.0);
    posFromLight = vec4(posFromLight.xyz / posFromLight.w, 1.0);
    let shadowPos = vec3(posFromLight.xy * vec2(0.5,-0.5) + vec2(0.5, 0.5), posFromLight.z);
    var visibility = 0.0;

    let lightDirection = normalize(light.position.xyz - worldPosition);
    // let bias = max(0.00025 * (1.0 - dot(normal, directionalLight.direction)), 0.00009);
    let bias = 0.00009;
    // Hard shadows
    let projectedDepth = textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);
    if (posFromLight.z > projectedDepth + bias) {
        visibility = 1.0;
    }
    
    return visibility;
}

struct ShadowCSM {
    visibility: f32,
    selectedCascade: i32
};

fn CalculateShadowCSM(surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {
    var selectedCascade = numCascades;
    var hasNextCascade = false;
    var shadowMapCoords = vec3<f32>(-1.0);
    for (var i = 0; i < numCascades; i += 1) {
        // ideally these operations should be performed in the vs
        var csmShadowMapCoords = light.csmProjectionMatrix[i] * vec4(surface.worldPosition, 1.0);
        csmShadowMapCoords = csmShadowMapCoords / csmShadowMapCoords.w;
        shadowMapCoords = vec3<f32>(csmShadowMapCoords.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), csmShadowMapCoords.z);

        if (all(shadowMapCoords > vec3<f32>(0.0)) && all(shadowMapCoords < vec3<f32>(1.0))) {
            selectedCascade = i;
            if (i < numCascades - 1) {
                var nextShadowCoords = light.csmProjectionMatrix[i + 1] * vec4(surface.worldPosition, 1.0);
                nextShadowCoords = nextShadowCoords / nextShadowCoords.w;
                let uvShadowMapCoords = vec3<f32>(csmShadowMapCoords.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5), csmShadowMapCoords.z);
                hasNextCascade = all(uvShadowMapCoords > vec3<f32>(0.0)) && all(uvShadowMapCoords < vec3<f32>(1.0));
            }
            break;
        }
    }

    let lightViewInverse = light.viewMatrixInverse;
    let lightDirection = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
    
    let pcfResolution = 2;
    let minBias = 0.0005;
    let maxBias = 0.001;

    let bias = max(minBias, maxBias * (1.0 - dot(lightDirection, surface.N)));
    
    let threshold = vec3<f32>(0.2);
    var edgeAdditionalVisibility = clamp((shadowMapCoords.xyz - (1.0 - threshold)) / threshold, vec3<f32>(0.0), vec3<f32>(1.0));
    edgeAdditionalVisibility = max(edgeAdditionalVisibility, 1.0 - clamp(shadowMapCoords.xyz / threshold, vec3<f32>(0.0), vec3<f32>(1.0)));
    
    var cascadeShadowMapCoords = shadowMapCoords;

    if (selectedCascade >= 2) {
        cascadeShadowMapCoords.x = cascadeShadowMapCoords.x + 1.0;
    }
    if (selectedCascade % 2 != 0) {
        cascadeShadowMapCoords.y = cascadeShadowMapCoords.y + 1.0;
    }
    cascadeShadowMapCoords.x = cascadeShadowMapCoords.x / 2.0;
    cascadeShadowMapCoords.y = cascadeShadowMapCoords.y / 2.0;


    // PCF
    var visibility: f32 = 0.0;
    let offset = 1.0 / vec2<f32>(textureDimensions(shadowPassDepth));
    for (var i = -pcfResolution; i <= pcfResolution; i = i + 1) {
        for (var j = -pcfResolution; j <= pcfResolution; j = j + 1) {
            visibility = visibility + textureSampleCompareLevel(
                shadowPassDepth,
                shadowSamplerComp,
                cascadeShadowMapCoords.xy + vec2<f32>(f32(i), f32(j)) * offset, lightIndex, cascadeShadowMapCoords.z - bias
            );
        }
    }

    let fadeOut = select(max(max(edgeAdditionalVisibility.x, edgeAdditionalVisibility.y), edgeAdditionalVisibility.z), 0.0, hasNextCascade);
    visibility = visibility / f32((pcfResolution + pcfResolution + 1) * (pcfResolution + pcfResolution + 1)) + fadeOut;

    var shadow: ShadowCSM;
    shadow.visibility = clamp(visibility, 0.0, 1.0);
    shadow.selectedCascade = selectedCascade;
    
    return shadow;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.vUv;
    let albedo = textureSample(albedoTexture, textureSampler, uv);
    let normal = textureSample(normalTexture, textureSampler, uv);
    let ermo = textureSample(ermoTexture, textureSampler, uv);

    let cutoff = 0.0001;
    let albedoSum = albedo.r + albedo.g + albedo.b;
    if (albedoSum < cutoff) {
        discard;
    }

    var color: vec3f = vec3(0);

    let worldPosition = reconstructWorldPosFromZ(
        input.position.xy,
        view.projectionOutputSize.xy,
        depthTexture,
        view.projectionInverseMatrix,
        view.viewInverseMatrix
    );

    var surface: Surface;
    surface.albedo = albedo.rgb;
    surface.roughness = albedo.a;
    surface.metallic = normal.a;
    surface.emissive = ermo.rgb;
    surface.occlusion = 1.0;
    surface.worldPosition = worldPosition.xyz;
    surface.N = normalize(normal.rgb);
    surface.F0 = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));
    surface.V = normalize(view.viewPosition.xyz - surface.worldPosition);

    if (ermo.w > 0.5) {
        return vec4(surface.albedo.rgb, 1.0);
    }
    
    var selectedCascade = 0;
    var Lo = vec3(0.0);
    for (var i : u32 = 0u; i < lightCount; i = i + 1u) {
        let light = lights[i];
        let lightType = light.color.a;

        if (lightType == SPOT_LIGHT) {
            var spotLight: SpotLight;
            
            let lightViewInverse = light.viewMatrixInverse; // Assuming you can calculate or pass this
            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);

            spotLight.pointToLight = light.position.xyz - surface.worldPosition;
            spotLight.color = light.color.rgb;
            spotLight.intensity = light.params1.r;
            spotLight.range = light.params1.g;
            spotLight.direction = lightDir;
            spotLight.angle = light.params1.b;

            let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);
            Lo += (1.0 - shadow) * SpotLightRadiance(spotLight, surface);
        }
        else if (lightType == POINT_LIGHT) {
            var pointLight: PointLight;
            
            pointLight.pointToLight = light.position.xyz - surface.worldPosition;
            pointLight.color = light.color.rgb;
            pointLight.intensity = light.params1.x;
            pointLight.range = light.params1.y;

            let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);
            Lo += (1.0 - shadow) * PointLightRadiance(pointLight, surface);
        }
        else if (lightType == DIRECTIONAL_LIGHT) {
            var directionalLight: DirectionalLight;
            let lightViewInverse = light.viewMatrixInverse; // Assuming you can calculate or pass this
            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
            directionalLight.direction = lightDir;
            directionalLight.color = light.color.rgb;

            // var shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);
            let shadowCSM = CalculateShadowCSM(surface, light, i);
            let shadow = shadowCSM.visibility;
            selectedCascade = shadowCSM.selectedCascade;

            Lo += (shadow) * DirectionalLightRadiance(directionalLight, surface);

            // let finalColor = shadow * DirectionalLightRadiance(directionalLight, surface);
            // Lo += mix(finalColor, debug_cascadeColors[selectedCascade].rgb, 0.01);
        }
    }


    let ambientColor = vec3(0.01);
    color = ambientColor * surface.albedo + Lo * surface.occlusion;

    // color += debug_cascadeColors[selectedCascade].rgb * 0.05;
    color += surface.emissive;

    color = Tonemap_ACES(color);
    color = OECF_sRGBFast(color);


    return vec4(color, 1.0);
    // return vec4(pow(projectedDepth, 20.0));
    // return vec4(shadowPos, 1.0);
    // return vec4(Lo, 1.0);
    // return vec4(surface.albedo.rgb, 1.0);
    // return vec4(worldPosition.xyz, 1.0);
    // return vec4(surface.N, 1.0);
}