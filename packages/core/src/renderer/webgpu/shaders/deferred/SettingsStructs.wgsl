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

struct MeshletSettings {
    frustumCullingEnabled: f32,
    backFaceCullingEnabled: f32,
    occlusionCullingEnabled: f32,
    smallFeaturesCullingEnabled: f32,
    staticLOD: f32,
    dynamicLODErrorThreshold: f32,
    dynamicLODEnabled: f32,
    meshletsViewType: f32,
    maxTriangles: f32,
};