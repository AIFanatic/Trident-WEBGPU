struct Settings {
    debugDepthPass: f32,
    debugDepthMipLevel: f32,
    debugDepthExposure: f32,
    viewType: f32,
    useHeightMap: f32,
    heightScale: f32,

    debugShadowCascades: f32,
    pcfResolution: f32,
    blendThreshold: f32,
    viewBlendThreshold: f32,

    cameraPosition: vec4<f32>,
};

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
@group(0) @binding(5) var shadowPassDepth: texture_depth_2d_array;
@group(0) @binding(6) var skyboxTexture: texture_cube<f32>;


struct Light {
    position: vec4<f32>,
    projectionMatrix: mat4x4<f32>,
    // // Using an array of mat4x4 causes the render time to go from 3ms to 9ms for some reason
    // csmProjectionMatrix: array<mat4x4<f32>, 4>,
    csmProjectionMatrix0: mat4x4<f32>,
    csmProjectionMatrix1: mat4x4<f32>,
    csmProjectionMatrix2: mat4x4<f32>,
    csmProjectionMatrix3: mat4x4<f32>,
    cascadeSplits: vec4<f32>,
    viewMatrix: mat4x4<f32>,
    viewMatrixInverse: mat4x4<f32>,
    color: vec4<f32>,
    params1: vec4<f32>,
    params2: vec4<f32>,
};

@group(0) @binding(7) var<storage, read> lights: array<Light>;
@group(0) @binding(8) var<storage, read> lightCount: u32;






struct View {
    projectionOutputSize: vec4<f32>,
    viewPosition: vec4<f32>,
    projectionInverseMatrix: mat4x4<f32>,
    viewInverseMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
};
@group(0) @binding(9) var<storage, read> view: View;


const numCascades = 4;
const debug_cascadeColors = array<vec4<f32>, 5>(
    vec4<f32>(1.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 1.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 0.0, 1.0)
);
@group(0) @binding(10) var shadowSamplerComp: sampler_comparison;

@group(0) @binding(11) var<storage, read> settings: Settings;


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
    intensity: f32
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
    depth: f32
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
    return CalculateBRDF(surface, light.direction) * light.color * light.intensity;
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

struct ShadowCSM {
    visibility: f32,
    selectedCascade: i32
};

fn ShadowLayerSelection(depthValue: f32, light: Light) -> i32 {
    var layer = -1;
    for (var i = 0; i < numCascades; i++) {
        let splitDist = light.cascadeSplits[i];

        if (depthValue < splitDist) {
            layer = i;
            break;
        }
    }

    if (layer == -1) {
        layer = numCascades - 1;
    }

    return layer;
}

fn SampleCascadeShadowMap(
    surface: Surface,
    light: Light,
    cascadeIndex: i32,
    lightIndex: u32
) -> f32 {
    // 1) Choose correct matrix
    var csm = light.csmProjectionMatrix0;
    if (cascadeIndex == 1) {
        csm = light.csmProjectionMatrix1;
    } else if (cascadeIndex == 2) {
        csm = light.csmProjectionMatrix2;
    } else if (cascadeIndex == 3) {
        csm = light.csmProjectionMatrix3;
    }

    // 2) Transform worldPos → Light space
    let fragPosLightSpace = csm * vec4(surface.worldPosition, 1.0);
    let projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    var shadowMapCoords = vec3<f32>(
        projCoords.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5),
        projCoords.z
    );

    // 3) Adjust for array layout (your approach of splitting the atlas into 4 quadrants)
    if (cascadeIndex >= 2) {
        shadowMapCoords.x += 1.0;
    }
    if (cascadeIndex % 2 != 0) {
        shadowMapCoords.y += 1.0;
    }
    shadowMapCoords.x /= 2.0;
    shadowMapCoords.y /= 2.0;

    // // Example 3x3 PCF or a single sample; up to you:
    // let visibility = textureSampleCompareLevel(
    //     shadowPassDepth, 
    //     shadowSamplerComp, 
    //     shadowMapCoords.xy, 
    //     lightIndex,
    //     shadowMapCoords.z
    // );

    // let fragPosViewSpace = view.viewMatrix * vec4f(surface.worldPosition, 1.0);
    // let depthValue = abs(fragPosViewSpace.z);

    // PCF
    var visibility = 0.0;
    let pcfResolution = i32(settings.pcfResolution);
    let offset = 1.0 / vec2<f32>(textureDimensions(shadowPassDepth));
    for (var i = -pcfResolution; i <= pcfResolution; i = i + 1) {
        for (var j = -pcfResolution; j <= pcfResolution; j = j + 1) {
            visibility += textureSampleCompareLevel(
                shadowPassDepth,
                shadowSamplerComp,
                shadowMapCoords.xy + vec2<f32>(f32(i), f32(j)) * offset,
                //lightIndex,
                i32(light.params1.w), // params1.w == shadowMapIndex
                shadowMapCoords.z
            );

            // if (surface.depth <= pcfDepth) {
            //     visibility += 1.0;
            // }
        }
    }
    
    visibility /= pow(f32(pcfResolution * 2 + 1), 2);
    // visibility /= 9.0;

    return clamp(visibility, 0.0, 1.0);
}

fn lerp(k0: f32, k1: f32, t: f32) -> f32 {
    return k0 + t * (k1 - k0);
}

fn CalculateShadowCSM(surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {
    var shadow: ShadowCSM;
    
    let fragPosViewSpace = view.viewMatrix * vec4f(surface.worldPosition, 1.0);
    let depthValue = abs(fragPosViewSpace.z);

    // 1) Get cascade selection (primary + possibly a secondary to blend with)
    let selectedCascade = ShadowLayerSelection(depthValue, light);
    shadow.selectedCascade = selectedCascade;

    // If no valid cascade, return early or assign some fallback:
    if (selectedCascade == -1) {
        // No shadow
        shadow.visibility = 1.0;
        shadow.selectedCascade = -1;
        return shadow;
    }

    // 2) Evaluate shadow from the primary cascade
    shadow.visibility = SampleCascadeShadowMap(surface, light, selectedCascade, lightIndex);

    // Sample the next cascade, and blend between the two results to
    // smooth the transition
    let BlendThreshold = settings.blendThreshold;


    let nextSplit = light.cascadeSplits[selectedCascade];
    
    var splitSize = 0.0;
    if (selectedCascade == 0) { splitSize = nextSplit; }
    else { splitSize = nextSplit - light.cascadeSplits[selectedCascade - 1]; }

    let fadeFactor = (nextSplit - depthValue) / splitSize;

    if(fadeFactor <= BlendThreshold && selectedCascade != numCascades - 1) {
        let nextSplitVisibility = SampleCascadeShadowMap(surface, light, selectedCascade + 1, lightIndex);
        let lerpAmt = smoothstep(0.0f, BlendThreshold, fadeFactor);
        shadow.visibility = lerp(nextSplitVisibility, shadow.visibility, lerpAmt);
        
        if (u32(settings.viewBlendThreshold) == 1) {
            shadow.visibility *= fadeFactor;
        }
    }
 
    return shadow;
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

// simple Reinhard tone mapping
fn ToneMap_Reinhard(c: vec3<f32>) -> vec3<f32> {
    return c / (c + vec3<f32>(1.0));
}

// gamma (linear → sRGB)
fn Gamma(c: vec3<f32>) -> vec3<f32> {
    return pow(c, vec3<f32>(1.0 / 2.2));
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.vUv;
    let albedo = textureSample(albedoTexture, textureSampler, uv);
    let normal = textureSample(normalTexture, textureSampler, uv);
    let ermo = textureSample(ermoTexture, textureSampler, uv);

    // let cutoff = 0.0001;
    // let albedoSum = albedo.r + albedo.g + albedo.b;
    // if (albedoSum < cutoff) {
    //     discard;
    // }

    // if (albedo.a < mat.AlphaCutoff) {
    //     discard;
    // }

    var color: vec3f = vec3(0);

    let worldPosition = reconstructWorldPosFromZ(
        input.position.xy,
        view.projectionOutputSize.xy,
        depthTexture,
        view.projectionInverseMatrix,
        view.viewInverseMatrix
    );

    var depth = textureLoad(depthTexture, vec2<i32>(floor(input.position.xy)), 0);

    var surface: Surface;
    surface.depth = depth;
    // surface.albedo = albedo.rgb * skyColor.rgb;
    surface.albedo = albedo.rgb;
    surface.roughness = albedo.a;
    surface.metallic = normal.a;
    surface.emissive = ermo.rgb;
    surface.occlusion = 1.0;
    surface.worldPosition = worldPosition.xyz;
    surface.N = normalize(normal.rgb);
    surface.F0 = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));
    surface.V = normalize(view.viewPosition.xyz - surface.worldPosition);

    var worldNormal: vec3f = normalize(surface.N);
    var eyeToSurfaceDir: vec3f = normalize(surface.worldPosition - view.viewPosition.xyz);
    var direction: vec3f = reflect(eyeToSurfaceDir, worldNormal);
    var environmentColor = textureSample(skyboxTexture, textureSampler, direction) * 0.5;

    // let maxMips = /* # of mips in your cubemap */;
    // let lod    = surface.roughness * f32(maxMips - 1);
    // let environmentColor = textureSampleLevel(skyboxTexture, textureSampler, direction, lod);

    
    // Convert screen coordinate to NDC space [-1, 1]
    let ndc = vec3<f32>(
        (input.position.x / view.projectionOutputSize.x) * 2.0 - 1.0,
        (input.position.y / view.projectionOutputSize.y) * 2.0 - 1.0,
        1.0
    );
    
    // Reconstruct the view ray in view space
    let viewRay4 = view.projectionInverseMatrix * vec4(ndc, 1.0);
    var viewRay = normalize(viewRay4.xyz / viewRay4.w);
    viewRay.y *= -1.0;

    // Transform the view-space ray to world space using the inverse view matrix
    var worldRay = normalize((view.viewInverseMatrix * vec4(viewRay, 0.0)).xyz);
    
    // Sample the sky cube using the view ray as direction
    let skyColor = textureSample(skyboxTexture, textureSampler, worldRay) * 0.5;
    
    // For example, if the depth is near the far plane, we assume it’s background:
    if (depth >= 0.9999999) {
        return skyColor;
    }

    if (ermo.w > 0.5) {
        return vec4(surface.albedo.rgb, 1.0);
    }
    
    var selectedCascade = 0;
    var Lo = vec3(0.0);
    for (var i : u32 = 0u; i < lightCount; i = i + 1u) {
        let light = lights[i];
        let lightType = u32(light.color.a);

        if (lightType == SPOT_LIGHT) {
            var spotLight: SpotLight;
            
            let lightViewInverse = light.viewMatrixInverse;
            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);

            spotLight.pointToLight = light.position.xyz - surface.worldPosition;
            spotLight.color = light.color.rgb;
            spotLight.intensity = light.params1.r;
            spotLight.range = light.params1.g;
            spotLight.direction = lightDir;
            spotLight.angle = light.params2.w;

            if (distance(light.position.xyz, surface.worldPosition) > spotLight.range) {
                continue;
            }

            // let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);

            let castShadows = light.params1.z > 0.5;
            var shadow = 1.0;
            if (castShadows) {
                let shadowCSM = CalculateShadowCSM(surface, light, i);
                shadow = shadowCSM.visibility;
                selectedCascade = shadowCSM.selectedCascade;
            }

            Lo += shadow * SpotLightRadiance(spotLight, surface);
        }
        else if (lightType == POINT_LIGHT) {
            var pointLight: PointLight;
            
            pointLight.pointToLight = light.position.xyz - surface.worldPosition;
            pointLight.color = light.color.rgb;
            pointLight.intensity = light.params1.x;
            pointLight.range = light.params1.y;

            // let shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);
            let shadow = 0.0;
            Lo += (1.0 - shadow) * PointLightRadiance(pointLight, surface);
        }
        else if (lightType == DIRECTIONAL_LIGHT) {
            var directionalLight: DirectionalLight;
            let lightViewInverse = light.viewMatrixInverse;
            let lightDir = normalize((lightViewInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
            directionalLight.direction = lightDir;
            directionalLight.color = light.color.rgb;
            directionalLight.intensity = light.params1.x;

            // var shadow = CalculateShadow(surface.worldPosition, surface.N, light, i);
            // shadow = 1.0 - shadow;
            // shadow += 0.5;

            let castShadows = light.params1.z > 0.5;
            var shadow = 1.0;
            if (castShadows) {
                let shadowCSM = CalculateShadowCSM(surface, light, i);
                shadow = shadowCSM.visibility;
                selectedCascade = shadowCSM.selectedCascade;
            }

            // let shadow = 1.0;

            Lo += (shadow) * DirectionalLightRadiance(directionalLight, surface);
        }
    }



    let ambientColor = vec3(0.01);
    let specularIBL = environmentColor.rgb * surface.F0;
    Lo += specularIBL * surface.occlusion;
    
    color = ambientColor * surface.albedo + Lo * surface.occlusion;

    if (u32(settings.debugShadowCascades) == 1) {
        color += debug_cascadeColors[selectedCascade].rgb * 0.05;
    }

    color += surface.emissive;

    // color = Tonemap_ACES(color);
    // color = OECF_sRGBFast(color);

    // color *= 0.01;
    // color = ToneMap_Reinhard(color);
    // color = Gamma(color);


    if (u32(settings.viewType) == 1) { color = surface.albedo.rgb; }
    else if (u32(settings.viewType) == 2) { color = surface.N.xyz; }
    else if (u32(settings.viewType) == 3) { color = vec3(surface.metallic); }
    else if (u32(settings.viewType) == 4) { color = vec3(surface.roughness); }
    else if (u32(settings.viewType) == 5) { color = surface.emissive; }
    

    return vec4(color, 1.0);

    // return vec4(pow(projectedDepth, 20.0));
    // return vec4(shadowPos, 1.0);
    // return vec4(Lo, 1.0);
    // return vec4(surface.albedo.rgb, 1.0);
    // return vec4(worldPosition.xyz, 1.0);
    // return vec4(surface.N, 1.0);

    // var s = textureSampleLevel(shadowPassDepth, shadowSampler, input.vUv, 0);
    // return vec4(vec3f(s) / 1.0, 1.0);
}