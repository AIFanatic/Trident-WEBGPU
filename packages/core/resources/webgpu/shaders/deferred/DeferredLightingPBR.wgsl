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
@group(0) @binding(7) var skyboxIrradianceTexture: texture_cube<f32>;
@group(0) @binding(8) var skyboxPrefilterTexture: texture_cube<f32>;
@group(0) @binding(9) var skyboxBRDFLUT: texture_2d<f32>;

@group(0) @binding(10) var brdfSampler: sampler;


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

@group(0) @binding(11) var<storage, read> lights: array<Light>;
@group(0) @binding(12) var<storage, read> lightCount: u32;






struct View {
    projectionOutputSize: vec4<f32>,
    viewPosition: vec4<f32>,
    projectionInverseMatrix: mat4x4<f32>,
    viewInverseMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
};
@group(0) @binding(13) var<storage, read> view: View;


const numCascades = 4;
const debug_cascadeColors = array<vec4<f32>, 5>(
    vec4<f32>(1.0, 0.0, 0.0, 1.0),
    vec4<f32>(0.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 1.0, 1.0),
    vec4<f32>(1.0, 1.0, 0.0, 1.0),
    vec4<f32>(0.0, 0.0, 0.0, 1.0)
);
@group(0) @binding(14) var shadowSamplerComp: sampler_comparison;

@group(0) @binding(15) var<storage, read> settings: Settings;


@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4(input.position, 0.0, 1.0);
    output.vUv = input.uv;
    return output;
}
const PI = 3.141592653589793;

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

fn toneMapping(color: vec3f) -> vec3f {
    let a = vec3f(1.6);
    let d = vec3f(0.977);
    let hdrMax = vec3f(8.0);
    let midIn = vec3f(0.18);
    let midOut = vec3f(0.267);

    let b = (-pow(midIn, a) + pow(hdrMax, a) * midOut) / ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);
    let c = (pow(hdrMax, a * d) * pow(midIn, a) - pow(hdrMax, a) * pow(midIn, a * d) * midOut) / ((pow(hdrMax, a * d) - pow(midIn, a * d)) * midOut);

    return pow(color, a) / (pow(color, a * d) * b + c);
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

fn FresnelSchlickRoughness(cosTheta: f32, f0: vec3f, roughness: f32) -> vec3f {
  return f0 + (max(vec3(1.0 - roughness), f0) - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

fn fixCubeHandedness(d: vec3f) -> vec3f {
    // try flipping X first; if that’s wrong, flip Z instead
    return vec3f(-d.x, d.y, d.z);
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
    surface.albedo = albedo.rgb;
    surface.roughness = clamp(albedo.a, 0.0, 0.99);
    surface.metallic = normal.a;
    surface.emissive = ermo.rgb;
    surface.occlusion = ermo.a;
    surface.worldPosition = worldPosition.xyz;
    surface.N = normalize(normal.rgb);
    surface.F0 = mix(vec3(0.04), surface.albedo.rgb, vec3(surface.metallic));
    surface.V = normalize(view.viewPosition.xyz - surface.worldPosition);

    var worldNormal: vec3f = normalize(surface.N);
    var eyeToSurfaceDir: vec3f = normalize(surface.worldPosition - view.viewPosition.xyz);
    var direction: vec3f = reflect(eyeToSurfaceDir, worldNormal);
    var environmentColor = textureSample(skyboxTexture, textureSampler, direction);

    const MAX_REFLECTION_LOD = 4.0;

    let n = surface.N;
    let v = surface.V;
    // let r = direction;
    let r = reflect(-v, n);
    // let r = reflect(-eyeToSurfaceDir, surface.N);

    let f0 = mix(vec3f(0.04), surface.albedo, surface.metallic);
    let ao = 1.0;

    var lo = vec3f(0.0);

    for (var i = 0; i < i32(lightCount); i++) {
        let l = normalize(lights[i].position.xyz - worldPosition.xyz);
        let h = normalize(v + l);

        let distance = length(lights[i].position - worldPosition);
        let attenuation = 1.0 / (distance * distance);
        let radiance = lights[i].color.xyz * attenuation;

        let d = DistributionGGX(n, h, surface.roughness);
        let g = GeometrySmith(n, v, l, surface.roughness);
        let f = FresnelSchlick(max(dot(h, v), 0.0), f0);

        let numerator = d * g * f;
        let denominator = 4.0 * max(dot(n, v), 0.0) * max(dot(n, l), 0.0) + 0.00001;
        let specular = numerator / denominator;

        let kS = f;
        var kD = vec3f(1.0) - kS;
        kD *= 1.0 - surface.metallic;

        let nDotL = max(dot(n, l), 0.00001);
        lo += (kD * surface.albedo / PI + specular) * radiance * nDotL;
    }

    let f = FresnelSchlickRoughness(max(dot(n, v), 0.00001), f0, surface.roughness);
    let kS = f;
    var kD = vec3f(1.0) - kS;
    kD *= 1.0 - surface.metallic;

    let irradiance = textureSample(skyboxIrradianceTexture, textureSampler, fixCubeHandedness(n)).rgb;
    let diffuse = irradiance * surface.albedo.xyz;

    let prefilteredColor = textureSampleLevel(skyboxPrefilterTexture, textureSampler, fixCubeHandedness(r), surface.roughness * MAX_REFLECTION_LOD).rgb;
    let brdf = textureSample(skyboxBRDFLUT, brdfSampler, vec2f(max(dot(n, v), 0.0), surface.roughness)).rg;
    let specular = prefilteredColor * (f * brdf.x + brdf.y);

    let ambient = (kD * diffuse + specular) * ao;

    var color = ambient + lo;



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
    // viewRay.x *= -1.0;

    // Transform the view-space ray to world space using the inverse view matrix
    var worldRay = normalize((view.viewInverseMatrix * vec4(viewRay, 0.0)).xyz);
    
    // Sample the sky cube using the view ray as direction
    var skyColor = textureSample(skyboxTexture, textureSampler, worldRay).rgb;
    
    // For example, if the depth is near the far plane, we assume it’s background:
    if (depth >= 0.9999999) {
        color = skyColor;
    }

    color = toneMapping(color);
    color = pow(color, vec3f(1.0 / 2.2));

    return vec4f(color, 1.0);
}