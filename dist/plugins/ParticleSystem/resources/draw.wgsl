#include "@trident/plugins/ParticleSystem/resources/structs.wgsl";

struct VertexInput {
    @builtin(instance_index) instanceIdx : u32, 
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) rawPosition: vec3<f32>,
    @location(1) uv: vec2<f32>,
    @location(2) @interpolate(flat) instanceIdx: u32
};

@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
@group(0) @binding(3) var<storage, read> particles: array<Particle>;
@group(0) @binding(4) var texture: texture_2d<f32>;
@group(0) @binding(5) var textureSampler: sampler;
@group(0) @binding(6) var<storage, read> settings: SystemSettings;
@group(0) @binding(7) var colorOverLifetimeRamp: texture_2d<f32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

    let p = particles[input.instanceIdx];

    if (p.age.w < 0.5) {
        output.position = vec4(10000.0);
        return output;
    }

    // size for the quad (use your own source: velocity.w, a size attribute, etc.)
    let size = max(p.velocity.w, 0.001);

    // Particle center in VIEW space
    let centerVS = (viewMatrix * vec4(p.position.xyz, 1.0)).xyz;

    // Vertex's local quad coords (e.g., [-0.5..0.5] or [-1..1])
    let local = input.position.xy * size;

    // In view space, Right=(1,0,0), Up=(0,1,0), already camera-aligned
    let billboardVS = centerVS + vec3(local.x, local.y, 0.0);

    // Project to clip space
    output.position = projectionMatrix * vec4(billboardVS, 1.0);

    output.rawPosition = input.position;
    output.uv = input.uv;
    output.instanceIdx = input.instanceIdx;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let particle = particles[input.instanceIdx];

    // let color = vec3(1.0);
    // let a = clamp(1.0 - length(input.rawPosition), 0.0, 1.0); // no negatives
    // // optional: hard discard to avoid touching the background at all
    // // if (a <= 0.0) { discard; }
    // return vec4(color * a, a); // premultiplied

    if (length(input.rawPosition) > 1.0) {
        discard;
    }
    
    var color = vec4f(1.0);

    let t = particle.age.x / particle.age.y;
    // color = mix(settings.colorOverLifetime0, settings.colorOverLifetime1, t);
    color = textureSample(colorOverLifetimeRamp, textureSampler, vec2<f32>(clamp(t,0.0,1.0), 0.5));

    if (bool(settings.hasTexture)) {

        var tileIndex = 0.0;
        if (u32(settings.frameOvertime) == 0) {}
        else if (u32(settings.frameOvertime) == 1) { tileIndex = mix(0.0, settings.tiles.x * settings.tiles.y, t); }
        else if (u32(settings.frameOvertime) == 2) { tileIndex = particle.texture.x; }

        let scale = 1.0 / vec2<f32>(settings.tiles.xy);
        let tx = floor(tileIndex % settings.tiles.x);      // 0..cols-1
        let ty = floor(tileIndex / settings.tiles.x);      // 0..rows-1  <-- NOTE: divide by cols
        let tileOffset = vec2<f32>(tx, ty) * scale;
        color *= textureSample(texture, textureSampler, input.uv * scale + tileOffset);
        
        // if (length(color) < 0.001) {
        //     discard; // TODO: Blend
        // }
    }

    // return color;
    return vec4f(color.rgb * color.a, color.a);
}