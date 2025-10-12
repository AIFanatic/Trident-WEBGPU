struct DrawBuffer {
    vertexCount: u32,
    instanceCount: atomic<u32>,
    firstVertex: u32,
    firstInstance: u32,
};

struct InstanceInfo {
    objectIndex: u32
};

struct FrameBuffer {
    projectionMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    cameraPosition: vec3<f32>,
    frustum: array<vec4<f32>, 6>,
    meshletCount: f32,
    screenSize: vec2<f32>,
    cameraNearFar: vec2<f32>,
    projectionViewMatrix: mat4x4<f32>,

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
    vertex_offset: f32, // index into meshletVerticesBuffer (f32 elems)
    triangle_offset: f32, // index into meshletTrianglesBuffer (f32 elems)
    triangle_count: f32,
    vertex_count: f32,
    bounding_sphere: vec4<f32>, // xyz = center, w = radius
    parent_bounding_sphere: vec4<f32>, // xyz = center, w = radius
    cone_axis: vec4<f32>, // xyz = cone_axis, w = cone_cutoff
    cone_apex: vec4<f32>, // xyz = cone_apex, w = unused
    errors: vec4<f32> // x = parent_error, y = error, zw = unused
};

struct MeshInfo {
    modelMatrix   : mat4x4<f32>, // index into meshletVerticesBuffer (u32 elems)
};

struct LodMeshInfo {
    lod                   : u32,
    meshIndex             : u32,
    baseVertexFloatOffset : u32,
    baseVertexOffset      : u32,
    baseTriangleOffset    : u32
};

struct ObjectInfo {
    meshletIndex           : u32,
    lodMeshIndex           : u32,
};