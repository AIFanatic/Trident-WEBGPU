#include "@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/ShadowUtils.wgsl";

// NDC -> UV, then remap into the 2×2 quadrant atlas inside ONE array layer.
fn worldToAtlasUVZSpot(worldPos: vec3<f32>, light: Light, cascadeIndex: i32) -> vec3<f32> {
    let m = light.csmProjectionMatrix0;
    let p = m * vec4(worldPos, 1.0);
    let ndc = p.xyz / p.w;

    // NDC -> [0,1], with y flipped to texture space
    var uv = ndc.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);

    return vec3<f32>(uv, ndc.z);
}

fn SampleCascadeShadowMapSpot(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, cascadeIndex: i32, lightIndex: u32) -> f32 {
    // Build atlas UV/Z for this cascade
    let uvz = worldToAtlasUVZSpot(surface.worldPosition, light, cascadeIndex);
    let uv  = uvz.xy;
    let z   = uvz.z;

    // Outside clip or outside atlas -> lit
    if (z <= 0.0 || z >= 1.0 || !inUnitSquare(uv)) {
        return 1.0;
    }

    // One textureDimensions() per pixel (ideally pass texel size from CPU)
    let texDim = vec2<f32>(textureDimensions(shadowTexture));
    let texel  = 1.0 / texDim;

    // Use fast 3×3 when radius <= 1, else bounded loop (max 5×5)
    let radius = i32(settings.pcfResolution); // interpret as radius
    if (radius <= 1) {
        return pcf3x3_quadrant(shadowTexture, shadowSampler, uv, z, i32(light.params1.w), texel);
    } else {
        return pcfBounded(shadowTexture, shadowSampler, uv, z, i32(light.params1.w), texel, radius);
    }
}

fn CalculateShadowCSMSpot(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {
    var out: ShadowCSM;

    // View-space depth for cascade selection
    let fragPosViewSpace = view.viewMatrix * vec4f(surface.worldPosition, 1.0);
    let depthValue  = abs(fragPosViewSpace.z);

    // Pick cascade (branchless)
    let selectedCascade = 0;
    out.selectedCascade = selectedCascade;

    // Primary cascade
    let visibility = SampleCascadeShadowMapSpot(shadowTexture, shadowSampler, surface, light, selectedCascade, lightIndex);

    out.visibility = clamp(visibility, 0.0, 1.0);
    return out;
}