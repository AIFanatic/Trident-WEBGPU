struct InstanceInfo {
    meshID: u32
};

struct CullData {
    projectionMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    cameraPosition: vec3<f32>,
    frustum: array<vec4<f32>, 6>,
    meshCount: f32,
    screenSize: vec2<f32>,
    cameraNearFar: vec2<f32>,
    projectionMatrixTransposed: mat4x4<f32>,
};

struct MeshletInfo {
    cone_apex: vec4<f32>,
    cone_axis: vec4<f32>,
    cone_cutoff: f32,

    boundingSphere: vec4<f32>,
    parentBoundingSphere: vec4<f32>,
    error: vec4<f32>,
    parentError: vec4<f32>,
    lod: vec4<f32>,

    bboxMin: vec4<f32>,
    bboxMax: vec4<f32>,
};

struct MeshInfo {
    modelMatrix: mat4x4<f32>,
    position: vec4<f32>,
    scale: vec4<f32>,
    mapIndex: vec4<f32>,

    AlbedoColor: vec4<f32>,
    EmissiveColor: vec4<f32>,
    Roughness: f32,
    Metalness: f32,
    Unlit: f32
};

struct ObjectInfo {
    meshID: f32,
    meshletID: f32,
    padding: vec2<f32>,
};