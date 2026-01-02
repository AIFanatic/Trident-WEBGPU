struct DrawBuffer {
    vertexCount: u32,
    instanceCount: atomic<u32>,
    firstVertex: u32,
    firstInstance: u32,
};

struct InstanceInfo {
    objectIndex: u32
};

struct MeshletParams {
    meshletCount: u32,
    isFrustumCullingEnabled: f32,
    isBackFaceCullingEnabled: f32,
    isOcclusionCullingEnabled: f32,
    isSmallFeaturesCullingEnabled: f32,

    isDebugDepthPassEnabled: f32,
    isDynamicLODEnabled: f32,
    staticLODValue: f32,
    dynamicLODErrorThresholdValue: f32
};

struct MeshletInfo {
    index_offset: u32,
    index_count: u32,
    _padding: vec2<u32>,
    bounding_sphere: vec4<f32>,
    error: vec4<f32>,
    parent_bounding_sphere: vec4<f32>,
    parent_error: vec4<f32>
};

struct MeshInfo {
    modelMatrix   : mat4x4<f32>,
};

struct MaterialInfo {
    AlbedoColor: vec4<f32>,
    EmissiveColor: vec4<f32>,
    Roughness: f32,
    Metalness: f32,
    Unlit: f32,
    AlphaCutoff: f32,
    RepeatOffset: vec4<f32>, // xy = repeat, zw = offset
    Wireframe: f32,
};

struct LodMeshInfo {
    lod                   : u32,
    meshIndex             : u32,
    baseVertexFloatOffset : u32,
    baseTriangleOffset    : u32,
    materialIndex         : u32,
};

struct ObjectInfo {
    meshletIndex           : u32,
    lodMeshIndex           : u32,
};
