#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";
#include "@trident/plugins/Water/resources/WaterRenderV2.wgsl"

struct VertexInput {
    @builtin(instance_index) instanceIdx : u32, 
    @location(0) position : vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vPosition : vec3<f32>,
    @location(1) vNormal : vec3<f32>,
    @location(2) vUv : vec2<f32>,

    @location(3) vertex_height: f32,
    @location(4) vertex_normal: vec3<f32>,
    @location(5) vertex_binormal: vec3<f32>,
    @location(6) vertex_tangent: vec3<f32>,

    @location(7) SCREEN_UV: vec2<f32>,

    @location(8) VERTEX: vec3<f32>,

    @location(9) UV : vec2<f32>,

    @location(10) worldPos: vec3<f32>,
};

@group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@group(0) @binding(4) var<storage, read> TIME: f32;



@group(1) @binding(0) var uv_sampler: texture_2d<f32>; // UV motion sampler for shifting the normalmap
@group(1) @binding(1) var normalmap_a_sampler: texture_2d<f32>; // Normalmap sampler A
@group(1) @binding(2) var normalmap_b_sampler: texture_2d<f32>; // Normalmap sampler B
@group(1) @binding(3) var foam_sampler: texture_2d<f32>; // Foam sampler
@group(1) @binding(4) var caustic_sampler: texture_2d<f32>; // Caustic sampler
@group(1) @binding(5) var SCREEN_TEXTURE: texture_2d<f32>;
@group(1) @binding(6) var DEPTH_TEXTURE: texture_depth_2d;
@group(1) @binding(7) var texture_sampler: sampler;
@group(1) @binding(8) var depth_texture_sampler: sampler_comparison;

@group(1) @binding(9) var perlin: texture_2d<f32>;

// Wave function:
struct WaveParams {
    displacement: vec4f,
    tangent: vec3f,
    binormal: vec3f
};

fn wave(parameter: vec4f, position: vec2f, time: f32) -> WaveParams {
    let wave_steepness = parameter.z;
    let wave_length = parameter.w;

    let k = 2.0 * 3.14159265359 / wave_length;
    let c = sqrt(9.8 / k);
    let d = normalize(parameter.xy);
    let f = k * (dot(d, position) - c * time);
    let a = wave_steepness / k;

    // Displacement
    let disp = vec4(
        d.x * (a * cos(f)),
        a * sin(f) ,
        d.y * (a * cos(f)),
        0.0
    );

    // Derivatives
    let tang = vec3(
        1.0 - d.x * d.x * (wave_steepness * sin(f)),
        d.x * (wave_steepness * cos(f)),
        -d.x * d.y * (wave_steepness * sin(f))
    );

    let bin = vec3(
        -d.x * d.y * (wave_steepness * sin(f)),
        d.y * (wave_steepness * cos(f)),
        1.0 - d.y * d.y * (wave_steepness * sin(f))
    );

    return WaveParams(disp, tang, bin);
}



@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let M = modelMatrix[input.instanceIdx];
    let V = frameBuffer.viewMatrix;
    let P = frameBuffer.projectionMatrix;

    let time = TIME * waveSettings.wave_speed.x;

    // 1) Base position in WORLD space (transform scale included)
    let localPos = vec4f(input.position, 1.0);
    let worldPos0 = (M * localPos).xyz;

    // 2) Waves in WORLD units (so wavelengths are stable)
    let waveA = wave(waveSettings.wave_a, worldPos0.xz, time);
    let waveB = wave(waveSettings.wave_b, worldPos0.xz, time);
    let waveC = wave(waveSettings.wave_c, worldPos0.xz, time);

    let dispW = (waveA.displacement + waveB.displacement + waveC.displacement).xyz;
    let tangentW = normalize(waveA.tangent + waveB.tangent + waveC.tangent);
    let binormW  = normalize(waveA.binormal + waveB.binormal + waveC.binormal);
    let normalW  = normalize(cross(binormW, tangentW));

    // 3) Apply displacement in WORLD space
    let worldPos = worldPos0 + dispW;

    // 4) Continue pipeline from WORLD
    let viewPos = (V * vec4f(worldPos, 1.0)).xyz;
    output.position = P * vec4f(viewPos, 1.0);

    output.VERTEX = viewPos;
    output.worldPos = worldPos;

    // Basis for your normalmap conversion (keep consistent space!)
    output.vertex_tangent  = tangentW;
    output.vertex_binormal = binormW;
    output.vertex_normal   = normalW;

    // Use world XZ for sampler UV so scaling the mesh doesn't stretch normals
    output.UV = worldPos.xz * waveSettings.sampler_scale.xy;
    output.vUv = output.UV;

    let ndc = output.position.xyz / output.position.w;
    output.SCREEN_UV = ndc.xy * 0.5 + 0.5;
    output.SCREEN_UV.y = 1.0 - output.SCREEN_UV.y;

    output.vertex_height = output.position.z;

    //             var modelMatrixInstance = modelMatrix[input.instanceIdx];
    //             var modelViewMatrix = frameBuffer.viewMatrix * modelMatrixInstance;
    // output.position = frameBuffer.projectionMatrix * modelViewMatrix * vec4(input.position, 1.0);

    return output;
}

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO : vec4f,
};

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    let UV = input.UV;
    let SCREEN_UV = input.SCREEN_UV;
    let VERTEX = input.VERTEX;

    let PROJECTION_MATRIX = frameBuffer.projectionMatrix;

    let vertex_tangent = input.vertex_tangent;
    let vertex_binormal = input.vertex_binormal;
    let vertex_normal = input.vertex_normal;

    let water = WaterRender(TIME, UV, SCREEN_UV, VERTEX, vertex_tangent, vertex_binormal, vertex_normal, input.worldPos);

    var output: FragmentOutput;
    output.albedo = vec4f(water.color, 0.2);
    output.normal = vec4(OctEncode(water.normal), 1.0, 0.1);
    output.RMO = vec4(vec3(0.0), 0.0);
    return output;
}