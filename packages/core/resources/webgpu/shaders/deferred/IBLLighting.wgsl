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
    let r = normalize(reflect(-v, n));

    let NdotV = clamp(abs(dot(n, v)), 0.001, 1.0);
    let lod = surface.roughness * f32(textureNumLevels(skyboxPrefilterTexture) - 1u);

    let brdf = textureSample( skyboxBRDFLUT, brdfSampler, vec2f(NdotV, surface.roughness)).rg;

    let diffuseLight = textureSample(skyboxIrradianceTexture, textureSampler, n).rgb;
    // let specularLight = textureSampleLevel(skyboxPrefilterTexture, textureSampler, r, lod).rgb;

    // For rough specular IBL, a pure reflection vector can sample bright grazing directions too strongly, showing up as a pale rim on high-roughness spheres.
    // Blend toward the normal as roughness increases to approximate the dominant reflection direction.
    let dominantR = normalize(mix(r, n, surface.roughness * surface.roughness));
    let specularLight = textureSampleLevel(skyboxPrefilterTexture, textureSampler, dominantR, lod).rgb;

    let diffuseColor = surface.albedo * (vec3f(1.0) - vec3f(0.04)) * (1.0 - surface.metallic);
    let specularColor = mix(vec3f(0.04), surface.albedo, vec3f(surface.metallic));

    let diffuse = diffuseLight * diffuseColor;
    let specular = specularLight * (specularColor * brdf.x + brdf.y);

    return vec4f(diffuse + specular, 1.0);
}