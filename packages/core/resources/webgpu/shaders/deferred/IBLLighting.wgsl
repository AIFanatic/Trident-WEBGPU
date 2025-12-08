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

fn fixCubeHandedness(d: vec3f) -> vec3f {
    return vec3f(-d.x, d.y, d.z);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.vUv;
    let pix   = vec2<i32>(floor(input.position.xy));

    let depth = textureLoad(depthTexture, pix, 0);
    let albedo = textureSample(albedoTexture, textureSampler, uv);
    let normal = textureSample(normalTexture, textureSampler, uv);
    let ermo   = textureSample(ermoTexture,   textureSampler, uv);

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
    surface.roughness      = clamp(albedo.a, 0.0, 0.99);
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

    let irradiance = textureSample(skyboxIrradianceTexture, textureSampler, fixCubeHandedness(n)).rgb;
    let diffuse = irradiance * surface.albedo.xyz;

    let f = FresnelSchlickRoughness(max(dot(n, v), 0.00001), surface.F0, surface.roughness);
    let kS = f;
    var kD = vec3f(1.0) - kS;
    kD *= 1.0 - surface.metallic;

    const MAX_REFLECTION_LOD = 4.0;
    let prefilteredColor = textureSampleLevel(skyboxPrefilterTexture, textureSampler, fixCubeHandedness(r), surface.roughness * MAX_REFLECTION_LOD).rgb;
    let brdf = textureSample(skyboxBRDFLUT, brdfSampler, vec2f(max(dot(n, v), 0.0), surface.roughness)).rg;
    let specular = prefilteredColor * (f * brdf.x + brdf.y);

    let ambient = kD * diffuse * surface.occlusion + specular;

    let color = ambient + surface.emissive;

    return vec4f(color, 1.0);
}