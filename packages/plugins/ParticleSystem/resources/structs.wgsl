struct SystemSettings {
    instanceCount: f32,
    dt: f32,
    startSize: f32,
    startLifetime: f32,
    startSpeed: vec4<f32>,
    emitterPosition: vec4<f32>,

    // Emission
    timeMs: f32,              // total time
    rateOverTime: f32,        // particles per second

    // Shape
    shapeType: f32, // 0=Sphere, 1=HemiSphere, 2=Cone, 3=Box
    emitFromShell: f32, // >0.5 => surface only (Sphere/HemiSphere)
    radius: f32,
    coneAngle: f32,
    coneHeight: f32,
    boxHalfExtents: vec3<f32>,

    // Texture sheet animation
    hasTexture: f32,
    tiles: vec2<f32>,
    frameOvertime: f32, // 0=constant, 1=over lifetime, 2=random

    gravity: vec4<f32>
};

struct Particle {
    position : vec4<f32>,   // xyz, w unused
    velocity : vec4<f32>,   // xyz, w = size
    fromColor: vec4<f32>,   // rgba
    toColor  : vec4<f32>,   // rgba
    age      : vec4<f32>,   // x = current, y = lifetime, z = alive
    texture  : vec4<f32>,   // x = sheetId)
};