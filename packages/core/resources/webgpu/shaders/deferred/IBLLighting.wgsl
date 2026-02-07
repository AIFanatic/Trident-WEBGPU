#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl";

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) vUv: vec2<f32>,
};

@group(0) @binding(0) var textureSampler: sampler;

@group(0) @binding(1) var albedoTexture: texture_2d<f32>;
@group(0) @binding(2) var normalTexture: texture_2d<f32>;
@group(0) @binding(3) var ermoTexture: texture_2d<f32>;
@group(0) @binding(4) var depthTexture: texture_depth_2d;

@group(0) @binding(7) var skyboxIrradianceTexture: texture_cube<f32>;
@group(0) @binding(8) var skyboxPrefilterTexture: texture_cube<f32>;
@group(0) @binding(9) var skyboxBRDFLUT: texture_2d<f32>;

@group(0) @binding(10) var brdfSampler: sampler;
@group(0) @binding(11) var skybox: texture_cube<f32>;

struct View {
    projectionOutputSize: vec4<f32>,
    viewPosition: vec4<f32>,
    projectionInverseMatrix: mat4x4<f32>,
    viewInverseMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    projectionMatrix: mat4x4<f32>,
};
@group(0) @binding(13) var<storage, read> view: View;


// Full-screen triangle (covers screen with 3 verts)
const p = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
);

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4(p[vertexIndex], 0.0, 1.0);
    let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
    output.vUv = vec2f(uv.x, 1.0 - uv.y);
    return output;
}

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

fn FresnelSchlick(cosTheta: f32, f0: vec3f) -> vec3f {
  return f0 + (1.0 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

fn FresnelSchlickRoughness(cosTheta: f32, f0: vec3f, roughness: f32) -> vec3f {
  return f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

fn clampedDot(x: vec3f, y: vec3f) -> f32
{
    return clamp(dot(x, y), 0.0, 1.0);
}

fn getIBLGGXFresnel(n: vec3f, v: vec3f, roughness: f32, F0: vec3f, specularWeight: f32) -> vec3f
{
    // see https://bruop.github.io/ibl/#single_scattering_results at Single Scattering Results
    // Roughness dependent fresnel, from Fdez-Aguera
    let NdotV = clampedDot(n, v);
    let brdfSamplePoint = clamp(vec2(NdotV, roughness), vec2(0.0, 0.0), vec2(1.0, 1.0));
    // let f_ab = texture(u_GGXLUT, brdfSamplePoint).rg;
    let f_ab = textureSample(skyboxBRDFLUT, textureSampler, brdfSamplePoint).rg;
    let Fr = max(vec3(1.0 - roughness), F0) - F0;
    let k_S = F0 + Fr * pow(1.0 - NdotV, 5.0);
    let FssEss = specularWeight * (k_S * f_ab.x + f_ab.y);

    // Multiple scattering, from Fdez-Aguera
    let Ems = (1.0 - (f_ab.x + f_ab.y));
    let F_avg = specularWeight * (F0 + (1.0 - F0) / 21.0);
    let FmsEms = Ems * FssEss * F_avg / (1.0 - F_avg * Ems);

    return FssEss + FmsEms;
}

const PI = 3.141592653589793;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.vUv;

    let pix = vec2<i32>(input.position.xy);
    let albedo = textureLoad(albedoTexture, pix, 0);
    let normal = textureLoad(normalTexture, pix, 0);
    let ermo   = textureLoad(ermoTexture,   pix, 0);
    let depth  = textureLoad(depthTexture,  pix, 0);    

    let worldPosition = reconstructWorldPosFromZ(
        input.position.xy,
        view.projectionOutputSize.xy,
        depth,
        view.projectionInverseMatrix,
        view.viewInverseMatrix
    );

    var surface: Surface;
    surface.depth          = depth;
    surface.albedo         = albedo.rgb;
    surface.roughness      = clamp(albedo.a, 0.01, 0.99);
    surface.occlusion      = normal.z;
    surface.metallic       = normal.a;
    surface.emissive       = ermo.rgb;
    surface.worldPosition  = worldPosition.xyz;
    
    surface.N              = OctDecode(normal.rg);
    surface.F0             = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));
    surface.V              = normalize(view.viewPosition.xyz - surface.worldPosition);


    let n = surface.N;
    let v = surface.V;
    let r = reflect(-v, n);

    // let irradiance = textureSample(skyboxIrradianceTexture, textureSampler, n).rgb;
    // let diffuse = irradiance * surface.albedo.xyz;

    // let f = FresnelSchlickRoughness(max(dot(n, v), 0.00001), surface.F0, surface.roughness);
    // let kS = f;
    // var kD = vec3f(1.0) - kS;
    // kD *= 1.0 - surface.metallic;

    // let MAX_REFLECTION_LOD = f32(textureNumLevels(skyboxPrefilterTexture) - 1u);
    // let prefilteredColor = textureSampleLevel(skyboxPrefilterTexture, textureSampler, r, surface.roughness * MAX_REFLECTION_LOD).rgb;
    // let brdf = textureSample(skyboxBRDFLUT, brdfSampler, vec2f(max(dot(n, v), 0.0), surface.roughness)).rg;
    // let specular = prefilteredColor * (f * brdf.x + brdf.y);

    // let ambient = kD * diffuse * (1.0 - surface.occlusion) + specular;

    // let color = ambient + surface.emissive;


    // return vec4f(color, 1.0);
    
    // let f_diffuse = diffuse;
    // let f_metal_fresnel_ibl = getIBLGGXFresnel(n, v, surface.roughness, surface.albedo.rgb, 1.0);
    // let f_metal_brdf_ibl = vec3f(0.0);

    // let f_specular_dielectric = vec3f(0.0);
    // let specularWeight = 1.0;
    // let f_dielectric_fresnel_ibl = getIBLGGXFresnel(n, v, surface.roughness, surface.F0, specularWeight);
    // let f_dielectric_brdf_ibl = mix(f_diffuse, f_specular_dielectric,  f_dielectric_fresnel_ibl);

    // let color = mix(f_dielectric_brdf_ibl, f_metal_brdf_ibl, surface.metallic) + surface.emissive;

    // return vec4f(color, 1.0);






  let NdotV = max(dot(n, v), 0.0);

  let MAX_REFLECTION_LOD = f32(textureNumLevels(skyboxPrefilterTexture) - 1u);
  let prefiltered = textureSampleLevel(
      skyboxPrefilterTexture,
      textureSampler,
      r,
      surface.roughness * MAX_REFLECTION_LOD
  ).rgb;

  let brdf = textureSample(
      skyboxBRDFLUT,
      brdfSampler,
      vec2f(NdotV, surface.roughness)
  ).rg;

  // diffuse from irradiance
  let irradiance = textureSample(skyboxIrradianceTexture, textureSampler, n).rgb;
  let diffuse = irradiance * surface.albedo;

  // fresnel term (glTF-style)
  let f_metal_fresnel_ibl = getIBLGGXFresnel(n, v, surface.roughness, surface.albedo, 1.0);
  let f_metal_brdf_ibl = prefiltered * f_metal_fresnel_ibl;

  // dielectrics: F0 is ~0.04
  let f_dielectric_fresnel_ibl = getIBLGGXFresnel(n, v, surface.roughness, surface.F0, 1.0);
  let f_dielectric_brdf_ibl = mix(diffuse, prefiltered * f_dielectric_fresnel_ibl, f_dielectric_fresnel_ibl);

  var color = mix(f_dielectric_brdf_ibl, f_metal_brdf_ibl, surface.metallic) + surface.emissive;

  let occlusionStrength = 1.0; // match glTF default
  color = color * (1.0 + occlusionStrength * (1.0 - surface.occlusion));

  return vec4f(color, 1.0);
}
