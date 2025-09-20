#include "@trident/core/resources/webgpu/shaders/deferred/SurfaceStruct.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/LightStruct.wgsl";
#include "@trident/core/resources/webgpu/shaders/deferred/ShadowUtils.wgsl";

fn selectCascade(depthValue: f32, splits: vec4<f32>) -> i32 {
    // count how many splits we have passed (0..3)
    var layer = 0;
    layer += select(0, 1, depthValue >= splits.x);
    layer += select(0, 1, depthValue >= splits.y);
    layer += select(0, 1, depthValue >= splits.z);
    return clamp(layer, 0, numCascades - 1);
}

fn csmMatrix(light: Light, idx: i32) -> mat4x4<f32> {
    if (idx == 0) { return light.csmProjectionMatrix0; }
    if (idx == 1) { return light.csmProjectionMatrix1; }
    if (idx == 2) { return light.csmProjectionMatrix2; }
    return light.csmProjectionMatrix3;
}

fn ShadowLayerSelection(depthValue: f32, light: Light) -> i32 {
    return selectCascade(depthValue, light.cascadeSplits);
}

// NDC -> UV, then remap into the 2×2 quadrant atlas inside ONE array layer.
fn worldToAtlasUVZ(worldPos: vec3<f32>, light: Light, cascadeIndex: i32) -> vec3<f32> {
    let m = csmMatrix(light, cascadeIndex);
    let p = m * vec4(worldPos, 1.0);
    let ndc = p.xyz / p.w;

    // NDC -> [0,1], with y flipped to texture space
    var uv = ndc.xy * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5, 0.5);

    // Quadrant packing: [0]=BL, [1]=TL, [2]=BR, [3]=TR (matches your original logic)
    if (cascadeIndex >= 2) { uv.x += 1.0; }
    if ((cascadeIndex & 1) == 1) { uv.y += 1.0; }
    uv *= 0.5;

    return vec3<f32>(uv, ndc.z);
}

fn SampleCascadeShadowMap(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, cascadeIndex: i32, lightIndex: u32) -> f32 {
    // Build atlas UV/Z for this cascade
    let uvz = worldToAtlasUVZ(surface.worldPosition, light, cascadeIndex);
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

fn lerp(k0: f32, k1: f32, t: f32) -> f32 {
    return k0 + t * (k1 - k0);
}

fn CalculateShadowCSM(shadowTexture: texture_depth_2d_array, shadowSampler: sampler_comparison, surface: Surface, light: Light, lightIndex: u32) -> ShadowCSM {
    var out: ShadowCSM;

    // View-space depth for cascade selection
    let fragPosViewSpace = view.viewMatrix * vec4f(surface.worldPosition, 1.0);
    let depthValue  = abs(fragPosViewSpace.z);

    // Early accept: beyond last split, no shadow work
    let lastSplit = light.cascadeSplits[numCascades - 1];
    if (depthValue > lastSplit) {
        out.visibility = 1.0;
        out.selectedCascade = numCascades - 1;
        return out;
    }

    // Pick cascade (branchless)
    let selectedCascade = ShadowLayerSelection(depthValue, light);
    out.selectedCascade = selectedCascade;

    // Primary cascade
    var visibility = SampleCascadeShadowMap(shadowTexture, shadowSampler, surface, light, selectedCascade, lightIndex);

    // Blend near the split to hide seams
    let blendThreshold   = settings.blendThreshold;
    let nextSplit  = light.cascadeSplits[selectedCascade];

    var splitSize = nextSplit;
    if (selectedCascade > 0) { splitSize = nextSplit - light.cascadeSplits[selectedCascade - 1]; }

    let fadeFactor = (nextSplit - depthValue) / max(splitSize, 1e-6);

    if (fadeFactor <= blendThreshold && selectedCascade != numCascades - 1) {
        let nextSplitVisibility = SampleCascadeShadowMap(shadowTexture, shadowSampler, surface, light, selectedCascade + 1, lightIndex);
        let lerpAmount = smoothstep(0.0, blendThreshold, fadeFactor);
        visibility = lerp(nextSplitVisibility, visibility, lerpAmount);

        if (u32(settings.viewBlendThreshold) == 1u) {
            visibility *= fadeFactor; // debug view
        }
    }

    out.visibility = clamp(visibility, 0.0, 1.0);
    return out;
}