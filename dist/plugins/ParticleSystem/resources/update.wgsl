#include "@trident/plugins/ParticleSystem/resources/structs.wgsl";

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> settings: SystemSettings;

const PI: f32 = 3.141592653589793;

// 1D: hash a single float -> [0,1)
fn hash11(n: f32) -> f32 {
    return fract(sin(n) * 43758.5453123);
}

fn rng3(seed: f32, idx: u32) -> vec3<f32> {
    let i = f32(idx);
    return vec3(
        hash11(seed + i * 1.0),
        hash11(seed + i * 2.0),
        hash11(seed + i * 3.0)
    );
}

fn onUnitSphere(u: vec2<f32>) -> vec3<f32> {
    // uniform over sphere surface
    let z = 1.0 - 2.0 * u.x;
    let a = 2.0 * PI * u.y;
    let r = sqrt(max(0.0, 1.0 - z*z));
    return vec3(r * cos(a), r * sin(a), z);
}
fn inUnitSphere(u: vec3<f32>) -> vec3<f32> {
    // uniform in volume via r^(1/3)
    let dir = onUnitSphere(u.xy);
    let r = pow(u.z, 1.0 / 3.0);
    return dir * r;
}
fn hemi(dir: vec3<f32>) -> vec3<f32> {
    // keep +Y hemisphere (like Unity default)
    return vec3(dir.x, abs(dir.y), dir.z);
}
fn coneDir(u: vec2<f32>, angle: f32) -> vec3<f32> {
    // uniform within a cone around +Y
    let cosMax = cos(angle);
    let cosT = mix(cosMax, 1.0, u.x);
    let sinT = sqrt(1.0 - cosT*cosT);
    let phi  = 2.0 * PI * u.y;
    return vec3(sinT * cos(phi), cosT, sinT * sin(phi));
}

fn resetParticle(idx: u32, _p: Particle, grid: vec3<f32>) -> Particle {
    var p = _p;

    let r3 = rng3(1337.0, idx);        // base RNG
    let r3b = rng3(7331.0, idx);       // secondary RNG
    var pos = settings.emitterPosition.xyz;
    var dir = vec3(0.0);

    // Sphere / HemiSphere
    let shapeType = u32(settings.shapeType);
    if (shapeType == 0u || shapeType == 1u) {
        let d = onUnitSphere(r3.xy);
        let dH = select(d, hemi(d), shapeType == 1u);
        let r = select(pow(r3.z, 1.0/3.0), 1.0, settings.emitFromShell > 0.5);
        pos = pos + dH * settings.radius * r;
        dir = normalize(dH);
    }

    // Cone (around +Y, apex at emitterPosition)
    if (shapeType == 2u) {
        let d = coneDir(r3.xy, settings.coneAngle);
        // spawn along cone axis (optional), cheap & decent:
        let h = settings.coneHeight * r3.z;
        pos = pos + vec3(0.0, h, 0.0) + d * settings.radius;   // radius acts like “base radius”
        dir = normalize(d);
    }

    // Box (centered at emitterPosition)
    if (shapeType == 3u) {
        let q = (r3 * 2.0 - 1.0) * settings.boxHalfExtents;
        pos = pos + q;
        // shoot outward from center or random unit:
        dir = normalize(select(q, onUnitSphere(r3b.xy), length(q) > 1e-5));
    }

    p.position = vec4f(pos, 1.0);
    // p.velocity = vec4(dir, settings.startSize);
    p.velocity = vec4(dir * settings.startSpeed.xyz, settings.startSize);
    p.age.y = settings.startLifetime * 1000.0;
    p.age.w = 1.0;
    p.texture.x = floor(hash11(settings.timeMs * settings.dt * pos.x * pos.y * pos.z) * settings.tiles.x * settings.tiles.y);
    return p;
}

const blockSize: u32 = 4;

@compute @workgroup_size(blockSize, blockSize, blockSize)
fn main(@builtin(global_invocation_id) grid: vec3<u32>,
        @builtin(num_workgroups) numWg: vec3<u32>) {

    let N: u32 = u32(settings.instanceCount);

    let dimX = numWg.x * blockSize;
    let dimY = numWg.y * blockSize;
    let idx  = grid.x + grid.y * dimX + grid.z * dimX * dimY;
    if (idx >= N) { return; }

    var p = particles[idx];

    // N = particle count, idx = this particle index
    let rate = max(settings.rateOverTime, 1e-4);
    let win  = f32(N) / rate;          // window length in seconds (units cancel out anyway)
    
    // normalized times in [0,1)
    let t0 = fract((settings.timeMs - settings.dt) / (win * 1000.0));
    let t1 = fract( settings.timeMs              / (win * 1000.0));
    var span = t1 - t0;
    span = span + select(0.0, 1.0, span < 0.0);   // wrap-safe span in (0,1]
    
    // per-particle phase in [0,1)
    let phase = f32(idx) / f32(N);
    var rel = phase - t0;
    rel = rel + select(0.0, 1.0, rel <= 0.0);     // distance from t0 to phase, wrap-safe
    
    let crossed = rel <= span;                    // true if phase hit this frame
    

    if (crossed) {
        // (re)spawn this particle now
        p = resetParticle(idx, p, vec3f(grid));
        p.age.x = 0.0;                               // age ms
        p.age.y = settings.startLifetime * 1000.0;   // life ms
        p.age.w = 1.0;                               // alive flag
    }

    // --- simulate alive particles ---
    let dt_s = settings.dt / 1000.0;

    if (p.age.w >= 0.5) {
        p.velocity += settings.gravity * dt_s;
        p.position = vec4f(p.position.xyz + p.velocity.xyz * dt_s, 1.0);

        p.age.x += settings.dt;
        if (p.age.x >= p.age.y) { p.age.w = 0.0; }
    }

    particles[idx] = p;
}