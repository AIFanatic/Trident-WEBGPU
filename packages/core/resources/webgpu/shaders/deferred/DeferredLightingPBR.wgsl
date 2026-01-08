#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/ShadowMap.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/ShadowMapCSM.wgsl";

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
    @builtin(instance_index) instance : u32, 
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) vUv: vec2<f32>,
    @location(1) @interpolate(flat) lightIndex: u32,
};

@group(0) @binding(0) var textureSampler: sampler;

@group(0) @binding(1) var albedoTexture: texture_2d<f32>;
@group(0) @binding(2) var normalTexture: texture_2d<f32>;
@group(0) @binding(3) var ermoTexture: texture_2d<f32>;
@group(0) @binding(4) var depthTexture: texture_depth_2d;
@group(0) @binding(5) var shadowPassDepth: texture_depth_2d_array;

@group(0) @binding(6) var<storage, read> lights: array<Light>;
@group(0) @binding(7) var<storage, read> lightCount: u32;

struct View {
    projectionOutputSize: vec4<f32>,
    viewPosition: vec4<f32>,
    projectionInverseMatrix: mat4x4<f32>,
    viewInverseMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
};
@group(0) @binding(8) var<storage, read> view: View;


const numCascades = 4;

@group(0) @binding(9) var shadowSamplerComp: sampler_comparison;

@group(0) @binding(10) var<storage, read> settings: Settings;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let light = lights[input.instance];
    let lightType = u32(light.color.a);

    output.position = view.projectionMatrix * view.viewMatrix * light.lightModelMatrix * vec4(input.position, 1.0);
    if (lightType == DIRECTIONAL_LIGHT) {
        // Flip X so the quad becomes back-facing (survives front-face cull).
        // Place it at the far plane so it passes depthCompare "greater-equal".
        output.position = vec4(-input.position.x, input.position.y, 1.0, 1.0);
    }

    output.vUv = input.uv;
    output.lightIndex = input.instance;
    return output;
}

const PI = 3.141592653589793;

const SPOT_LIGHT: u32 = 0;
const DIRECTIONAL_LIGHT: u32 = 1;
const POINT_LIGHT: u32 = 2;
const AREA_LIGHT: u32 = 3;

fn reconstructWorldPosFromZ(
    coords: vec2<f32>,
    size: vec2<f32>,
    depth: f32,
    projInverse: mat4x4<f32>,
    viewInverse: mat4x4<f32>
    ) -> vec4<f32> {
    let uv = coords.xy / size;
    let x = uv.x * 2.0 - 1.0;
    let y = (1.0 - uv.y) * 2.0 - 1.0;
    let projectedPos = vec4(x, y, depth, 1.0);
    var worldPosition = projInverse * projectedPos;
    worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
    worldPosition = viewInverse * worldPosition;
    return worldPosition;
}

fn DistributionGGX(n: vec3f, h: vec3f, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let nDotH = max(dot(n, h), 0.0);
  let nDotH2 = nDotH * nDotH;
  var denom = (nDotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;
  return a2 / denom;
}

fn GeometrySchlickGGX(nDotV: f32, roughness: f32) -> f32 {
  let r = (roughness + 1.0);
  let k = (r * r) / 8.0;
  return nDotV / (nDotV * (1.0 - k) + k);
}

fn GeometrySmith(n: vec3f, v: vec3f, l: vec3f, roughness: f32) -> f32 {
  let nDotV = max(dot(n, v), 0.0);
  let nDotL = max(dot(n, l), 0.0);
  let ggx2 = GeometrySchlickGGX(nDotV, roughness);
  let ggx1 = GeometrySchlickGGX(nDotL, roughness);
  return ggx1 * ggx2;
}

fn FresnelSchlick(cosTheta: f32, f0: vec3f) -> vec3f {
  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
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

fn DirectionalLightRadiance(light: DirectionalLight, surface : Surface) -> vec3<f32> {
    return CalculateBRDF(surface, light.direction) * light.color * light.intensity;
}

fn rangeAttenuation(range : f32, distance : f32) -> f32 {
    if (range <= 0.0) {
        // Negative range means no cutoff
        return 1.0 / pow(distance, 2.0);
    }
    return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);
}

fn SpotLightRadiance(light : SpotLight, surface : Surface) -> vec3<f32> {
    // pointToLight is SURFACE -> LIGHT (as you already set)
    let dist = length(light.pointToLight);

    // For cone test we need LIGHT -> SURFACE
    let L_ls = normalize(-light.pointToLight);   // light -> surface
    let cd   = dot(light.direction, L_ls);       // cos(theta), 1 at center

    // Smooth falloff from edge to center: 0 at cos(angle), 1 at 1.0
    let spot = smoothstep(cos(light.angle), 1.0, cd);

    // Range attenuation as you have it
    let attenuation = rangeAttenuation(light.range, dist) * spot;

    // BRDF usually expects wi = SURFACE -> LIGHT
    let wi = -L_ls; // (surface -> light)
    let radiance = CalculateBRDF(surface, wi) * light.color * light.intensity * attenuation;
    return radiance;
}

fn PointLightRadiance(light: PointLight, surface: Surface) -> vec3<f32> {
    let dist = length(light.pointToLight);
    let wi   = normalize(light.pointToLight);        // surface -> light
    let att  = rangeAttenuation(light.range, dist);  // your smooth cutoff / r^2
    return CalculateBRDF(surface, wi) * light.color * light.intensity * att;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    // Load depth once
    let pix = vec2<i32>(input.position.xy);
    let depth = textureLoad(depthTexture, pix, 0);

    let fragCoord = input.position.xy;
    let screenSize = view.projectionOutputSize.xy;

    let uv = fragCoord / screenSize;

    let worldPosition = reconstructWorldPosFromZ(
        input.position.xy,
        view.projectionOutputSize.xy,
        depth,
        view.projectionInverseMatrix,
        view.viewInverseMatrix
    );

    let albedo = textureLoad(albedoTexture, pix, 0);
    let normal = textureLoad(normalTexture, pix, 0);
    let ermo   = textureLoad(ermoTexture,   pix, 0);

    let unlit = ermo.a;

    if (unlit > 0.5) {
        var color = albedo.rgb;
        return vec4f(color, 1.0);
    }

    var surface: Surface;
    surface.depth          = depth;
    surface.albedo         = albedo.rgb;
    surface.roughness      = clamp(albedo.a, 0.0, 0.99);
    surface.occlusion      = normal.z;
    surface.metallic       = normal.a;
    surface.emissive       = ermo.rgb;
    surface.worldPosition  = worldPosition.xyz;
    
    surface.N              = OctDecode(normal.rg);
    surface.F0             = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));
    surface.V              = normalize(view.viewPosition.xyz - surface.worldPosition);

    var lo = vec3f(0.0);
    var selectedCascade = 0;

    var light = lights[input.lightIndex];
    let lightType = u32(light.color.a);

    if (lightType == DIRECTIONAL_LIGHT) {
        var directionalLight: DirectionalLight;
        directionalLight.direction = normalize((light.viewMatrixInverse * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
        // directionalLight.direction = light.direction.xyz;
        directionalLight.color = light.color.rgb;
        directionalLight.intensity = light.params1.x;

        let castShadows = light.params1.z > 0.5;
        var shadow = 1.0;
        if (castShadows) {
            let shadowCSM = CalculateShadowCSM(shadowPassDepth, shadowSamplerComp, surface, light, input.lightIndex);
            shadow = shadowCSM.visibility;
            selectedCascade = shadowCSM.selectedCascade;
        }

        // lo += shadow * DirectionalLightRadiance(directionalLight, surface) * radiance;
        lo += shadow * DirectionalLightRadiance(directionalLight, surface);
    }

    else if (lightType == SPOT_LIGHT) {
        var spotLight: SpotLight;
        
        // light.position.x *= -1.0;
        // light.position.z *= -1.0;
        spotLight.pointToLight = light.position.xyz - surface.worldPosition;
        spotLight.color = light.color.rgb;
        spotLight.intensity = light.params1.r;
        spotLight.range = light.params1.g;
        spotLight.direction = normalize((light.viewMatrixInverse * vec4(0.0, 0.0, -1.0, 0.0)).xyz);
        // spotLight.direction = normalize(light.params2.xyz);
        // spotLight.direction = light.direction.xyz;
        spotLight.angle = light.params2.w;

        let castShadows = light.params1.z > 0.5;
        var shadow = 1.0;
        if (castShadows) {
            let shadowCSM = CalculateShadowCSMSpot(shadowPassDepth, shadowSamplerComp, surface, light, input.lightIndex);
            shadow = shadowCSM.visibility;
            selectedCascade = shadowCSM.selectedCascade;
            // shadow = SampleSpotShadowMap(surface, light); // <— single 2D map on this layer

        }

        lo += shadow * SpotLightRadiance(spotLight, surface);
    }

    else if (lightType == POINT_LIGHT) {
        var p: PointLight;
        p.pointToLight = light.position.xyz - surface.worldPosition;
        p.color        = light.color.rgb;
        p.intensity    = light.params1.x;
        p.range        = light.params1.y;

        var shadow = 1.0;
        let castShadows = light.params1.z > 0.5;
        // if (castShadows) {
        //     shadow = SamplePointShadow(surface, light, i);
        // }

        lo += shadow * PointLightRadiance(p, surface);
    }

    return vec4f(lo, 0.0);
}