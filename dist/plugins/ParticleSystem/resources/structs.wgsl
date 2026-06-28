struct SystemSettings {
    instanceCount: f32,
    dt: f32,
    startSize: f32,
    startLifetime: f32,
    startSpeed: vec4<f32>,
    emitterPosition: vec4<f32>,

    timeMs: f32,
    rateOverTime: f32,

    shapeType: f32,
    emitFromShell: f32,
    radius: f32,
    coneAngle: f32,
    coneHeight: f32,

    boxHalfExtents: vec3<f32>,
    hasTexture: f32,

    tiles: vec2<f32>,
    frameOvertime: f32,

    gravity: vec4<f32>,

    arcLoop: f32,
    arcPhase: f32,
};

struct Particle {
    position : vec4<f32>,   // xyz, w unused
    velocity : vec4<f32>,   // xyz, w = size
    fromColor: vec4<f32>,   // rgba
    toColor  : vec4<f32>,   // rgba
    age      : vec4<f32>,   // x = current, y = lifetime, z = alive
    texture  : vec4<f32>,   // x = sheetId)
};