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
    // direction: vec4<f32>,
    color: vec4<f32>,
    params1: vec4<f32>,
    params2: vec4<f32>,
};

struct DirectionalLight {
    direction: vec3<f32>,
    color: vec3<f32>,
    intensity: f32
};

struct SpotLight {
    pointToLight: vec3<f32>,
    color: vec3<f32>,
    direction: vec3<f32>,
    range: f32,
    intensity: f32,
    angle: f32,
};

struct PointLight {
    pointToLight: vec3<f32>,
    color: vec3<f32>,
    range: f32,
    intensity: f32,
};