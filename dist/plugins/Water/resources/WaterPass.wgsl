struct VertexInput {
    @builtin(instance_index) instanceIdx : u32, 
    @location(0) position : vec3<f32>,
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

    @location(10) p : vec3<f32>,
};

@group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
@group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@group(0) @binding(3) var<storage, read> cameraPosition: vec3<f32>;

@group(0) @binding(4) var<storage, read> TIME: f32;
@group(0) @binding(5) var<storage, read> INV_PROJECTION_MATRIX: mat4x4<f32>;
@group(0) @binding(6) var<storage, read> INV_VIEW_MATRIX: mat4x4<f32>;



struct WaveSettings {
    wave_speed: vec4<f32>,
    wave_a: vec4<f32>,
    wave_b: vec4<f32>,
    wave_c: vec4<f32>,

    sampler_scale: vec4<f32>,
    sampler_direction: vec4<f32>,

    uv_sampler_scale: vec4<f32>,
    uv_sampler_strength: vec4<f32>,

    foam_level: vec4<f32>,
    
    refraction: vec4<f32>,

    color_deep: vec4<f32>,
    color_shallow: vec4<f32>,

    beers_law: vec4<f32>,
    depth_offset: vec4<f32>,
};



@group(1) @binding(0) var uv_sampler: texture_2d<f32>; // UV motion sampler for shifting the normalmap
@group(1) @binding(1) var normalmap_a_sampler: texture_2d<f32>; // Normalmap sampler A
@group(1) @binding(2) var normalmap_b_sampler: texture_2d<f32>; // Normalmap sampler B
@group(1) @binding(3) var foam_sampler: texture_2d<f32>; // Foam sampler
@group(1) @binding(4) var SCREEN_TEXTURE: texture_2d<f32>;
@group(1) @binding(5) var DEPTH_TEXTURE: texture_depth_2d;
@group(1) @binding(6) var texture_sampler: sampler;
@group(1) @binding(7) var depth_texture_sampler: sampler_comparison;
@group(1) @binding(8) var<storage, read> waveSettings: WaveSettings;

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
        a * sin(f) * 0.25,
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
    var output : VertexOutput;

    var modelMatrixInstance = modelMatrix[input.instanceIdx];
    var modelViewMatrix = viewMatrix * modelMatrixInstance;

    let time = TIME * waveSettings.wave_speed[0];

    var	vertex: vec4f = vec4(input.position, 1.0);
    let vertex_position = (modelMatrixInstance * vertex).xyz;

    let tang: vec3f = vec3(0.0, 0.0, 0.0);
    let bin: vec3f = vec3(0.0, 0.0, 0.0);

    let waveA = wave(waveSettings.wave_a, vertex_position.xz, time);
    let waveB = wave(waveSettings.wave_b, vertex_position.xz, time);
    let waveC = wave(waveSettings.wave_c, vertex_position.xz, time);
    
    let displacement = waveA.displacement + waveB.displacement + waveC.displacement;
    let tangent = normalize(waveA.tangent + waveB.tangent + waveC.tangent);
    let binormal = normalize(waveA.binormal + waveB.binormal + waveC.binormal);
    
    vertex += displacement;
    
    output.vertex_tangent = tangent;
    output.vertex_binormal = binormal;
    output.vertex_normal = normalize(cross(binormal, tangent));
    
    output.vertex_height = (projectionMatrix * modelViewMatrix * vertex).z;

    // output.vertex_tangent = wavePass.tangent;
    // output.vertex_binormal = wavePass.binormal;
    output.vertex_normal = normalize(cross(output.vertex_binormal, output.vertex_tangent));

    
    output.position = projectionMatrix * modelViewMatrix * vertex;
    output.VERTEX = (modelViewMatrix * vec4(vertex.xyz, 1.0)).xyz;
    output.vUv = (modelMatrixInstance * vec4(vertex.xyz, 1.0)).xz * waveSettings.sampler_scale.xy;
    
    let ndc: vec3f = output.position.xyz / output.position.w;
    output.SCREEN_UV = ndc.xy * 0.5 + 0.5;
    output.SCREEN_UV.y = 1.0 - output.SCREEN_UV.y;

    return output;
}

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO : vec4f,
};

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;

    let UV = input.vUv;

    // Calculation of the UV with the UV motion sampler
    let	uv_offset: vec2f = waveSettings.sampler_direction.xy * TIME;
    let uv_sampler_uv: vec2f = UV * waveSettings.uv_sampler_scale.xy + uv_offset;
    let	uv_sampler_uv_offset: vec2f = waveSettings.uv_sampler_strength[0] * textureSample(uv_sampler, texture_sampler, uv_sampler_uv).rg * 2.0 - 1.0;
    let uv: vec2f = UV + uv_sampler_uv_offset;
    
    // Normalmap:
    var normalmap: vec3f = textureSample(normalmap_a_sampler, texture_sampler, uv - uv_offset*2.0).rgb * 0.75;		// 75 % sampler A
    normalmap += textureSample(normalmap_b_sampler, texture_sampler, uv + uv_offset).rgb * 0.25;			// 25 % sampler B
    
    // Refraction UV:
    var	ref_normalmap: vec3f = normalmap * 2.0 - 1.0;
    ref_normalmap = normalize(input.vertex_tangent*ref_normalmap.x + input.vertex_binormal*ref_normalmap.y + input.vertex_normal*ref_normalmap.z);
    let ref_uv: vec2f = input.SCREEN_UV + (ref_normalmap.xy * waveSettings.refraction[0]) / -input.VERTEX.z;

    // Ground depth:
    let ref_value = input.position.z / input.position.w;
    let depth_raw: f32 = textureSampleCompare(DEPTH_TEXTURE, depth_texture_sampler, input.SCREEN_UV, ref_value);

    let ndc = vec4f(ref_uv * 2.0 - 1.0, depth_raw, 1.0);
    let view_pos_h = INV_PROJECTION_MATRIX * ndc;
    let view_pos = view_pos_h.xyz / view_pos_h.w;
    var dist = input.VERTEX.z - view_pos.z;
    dist = pow(dist * 0.1, 1.0 / 2.2);

    var depth_blend = exp((dist + waveSettings.depth_offset[0]) * -waveSettings.beers_law[0]);
    depth_blend = clamp(1.0 - depth_blend, 0.0, 1.0);
    let depth_blend_pow = clamp(pow(depth_blend, 2.5), 0.0, 1.0);
    
    // Ground color:
    // let screen_color: vec3f = textureLod(SCREEN_TEXTURE, ref_uv, depth_blend_pow * 2.5).rgb;
    let screen_color: vec3f = textureSampleLevel(SCREEN_TEXTURE, texture_sampler, ref_uv, depth_blend_pow * 2.5).rgb;

    let dye_color: vec3f = mix(waveSettings.color_shallow.rgb, waveSettings.color_deep.rgb, depth_blend_pow);
    var color: vec3f = mix(screen_color*dye_color, dye_color*0.25, depth_blend_pow*0.5);



    // let foam_depth = (1.0 - min(1.0, dist / 3.0));
    // let foam_noise = clamp(pow(textureSample(foam_sampler, texture_sampler, (uv*4.0) - uv_offset).r, 10.0)*40.0, 0.0, 0.2);
    // let foam_mix = clamp(pow(foam_depth + foam_noise, 8.0) * foam_noise * 0.4, 0.0, 1.0);
    // color = mix(color, vec3(1.0), foam_mix * smoothstep(0.0, 1.0, waveSettings.foam_level[0] - dist));

    
    // output.albedo = vec4(ref_uv, 0, 0.2);
    // output.albedo = vec4(input.VERTEX, 0.2);
    // output.albedo = vec4f(vec3f(dist * 0.1), 1.0);
    // output.albedo = vec4f(vec3f(noisy_dist * 0.1), 1.0);
    let normalized_dist = clamp(dist / 4.0, 0.0, 1.0);
    // let blend = exp((normalized_dist + waveSettings.depth_offset[0]) * -waveSettings.beers_law[0]);
    // output.albedo = vec4f((mix(screen_color*dye_color, dye_color*0.25, blend*0.5)), 0.2);
    // output.albedo = vec4f(vec3(depth_blend_pow), 0.2);
    output.albedo = vec4f(color, 0.2);
    // output.albedo = vec4f(vec3(UV, 0.0), 0.2);

    output.normal = vec4(ref_normalmap, 0.1);
    output.RMO = vec4(vec3(0.0), 0.0);

    return output;
}