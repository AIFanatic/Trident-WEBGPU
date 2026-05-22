#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

@group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@group(0) @binding(4) var<storage, read> TIME: f32;

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
@group(1) @binding(4) var caustic_sampler: texture_2d<f32>; // Caustic sampler
@group(1) @binding(5) var SCREEN_TEXTURE: texture_2d<f32>;
@group(1) @binding(6) var DEPTH_TEXTURE: texture_depth_2d;
@group(1) @binding(7) var texture_sampler: sampler;
@group(1) @binding(8) var depth_texture_sampler: sampler_comparison;
@group(1) @binding(9) var<storage, read> waveSettings: WaveSettings;

@group(1) @binding(10) var perlin: texture_2d<f32>;

fn hash(_p: vec3<f32>) -> vec3<f32> {
    let p = vec3<f32>(dot(_p, vec3<f32>(127.1, 311.7, 74.7)), dot(_p, vec3<f32>(269.5, 183.3, 246.1)), dot(_p, vec3<f32>(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
fn noised(x: vec3<f32>) -> vec4<f32> {
    var i: vec3<f32> = floor(x);
    var f: vec3<f32> = fract(x);
    var u: vec3<f32> = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    var du: vec3<f32> = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    var ga: vec3<f32> = hash(i + vec3<f32>(0.0, 0.0, 0.0));
    var gb: vec3<f32> = hash(i + vec3<f32>(1.0, 0.0, 0.0));
    var gc: vec3<f32> = hash(i + vec3<f32>(0.0, 1.0, 0.0));
    var gd: vec3<f32> = hash(i + vec3<f32>(1.0, 1.0, 0.0));
    var ge: vec3<f32> = hash(i + vec3<f32>(0.0, 0.0, 1.0));
    var gf: vec3<f32> = hash(i + vec3<f32>(1.0, 0.0, 1.0));
    var gg: vec3<f32> = hash(i + vec3<f32>(0.0, 1.0, 1.0));
    var gh: vec3<f32> = hash(i + vec3<f32>(1.0, 1.0, 1.0));
    var va: f32 = dot(ga, f - vec3<f32>(0.0, 0.0, 0.0));
    var vb: f32 = dot(gb, f - vec3<f32>(1.0, 0.0, 0.0));
    var vc: f32 = dot(gc, f - vec3<f32>(0.0, 1.0, 0.0));
    var vd: f32 = dot(gd, f - vec3<f32>(1.0, 1.0, 0.0));
    var ve: f32 = dot(ge, f - vec3<f32>(0.0, 0.0, 1.0));
    var vf: f32 = dot(gf, f - vec3<f32>(1.0, 0.0, 1.0));
    var vg: f32 = dot(gg, f - vec3<f32>(0.0, 1.0, 1.0));
    var vh: f32 = dot(gh, f - vec3<f32>(1.0, 1.0, 1.0));
    var k0: f32 = va - vb - vc + vd;
    var g0: vec3<f32> = ga - gb - gc + gd;
    var k1: f32 = va - vc - ve + vg;
    var g1: vec3<f32> = ga - gc - ge + gg;
    var k2: f32 = va - vb - ve + vf;
    var g2: vec3<f32> = ga - gb - ge + gf;
    var k3: f32 = -va + vb + vc - vd + ve - vf - vg + vh;
    var g3: vec3<f32> = -ga + gb + gc - gd + ge - gf - gg + gh;
    var k4: f32 = vb - va;
    var g4: vec3<f32> = gb - ga;
    var k5: f32 = vc - va;
    var g5: vec3<f32> = gc - ga;
    var k6: f32 = ve - va;
    var g6: vec3<f32> = ge - ga;
    return vec4<f32>(va + k4 * u.x + k5 * u.y + k6 * u.z + k0 * u.x * u.y + k1 * u.y * u.z + k2 * u.z * u.x + k3 * u.x * u.y * u.z, ga + g4 * u.x + g5 * u.y + g6 * u.z + g0 * u.x * u.y + g1 * u.y * u.z + g2 * u.z * u.x + g3 * u.x * u.y * u.z + du * (vec3<f32>(k4, k5, k6) + vec3<f32>(k0, k1, k2) * u.yzx + vec3<f32>(k2, k0, k1) * u.zxy + k3 * u.yzx * u.zxy));
}
// fn mainImage(fragColor: ptr<function, vec4<f32>>, fragCoord: vec2<f32>) {
//     var p: vec2<f32> = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
//     var n: vec4<f32> = noised(12.0 * vec3<f32>(p, 0.0));
//     var normal: vec3<f32> = normalize(vec3<f32>(-n.y, -n.z, 1.0));
//     *fragColor = vec4<f32>(0.5 + 0.5 * select(n.xxx, normal, p.x > 0.0), 1.0);
// }

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

    @location(3) vertex_tangent  : vec3<f32>,
    @location(4) vertex_binormal : vec3<f32>,
    @location(5) vertex_normal   : vec3<f32>,
    @location(6) vertex_height   : f32,
    @location(7) UV   : vec2<f32>,
    @location(8) VERTEX   : vec3<f32>,
    @location(9) SCREEN_UV   : vec2<f32>,
};

 @vertex
  fn vertexMain(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;

      let M = modelMatrix[input.instanceIdx];
      let V = frameBuffer.viewMatrix;
      let P = frameBuffer.projectionMatrix;

      let noise_scale  = 12.0;
      let height_scale = 2.0;
      let slope_factor = noise_scale * height_scale;   // 120

      let n = noised(noise_scale * input.position + vec3f( TIME * 0.3, TIME * 0.3, TIME * 0.3));

      var p = input.position;
      p.z += n.x * height_scale;

      let worldPos = (M * vec4f(p, 1.0)).xyz;
      output.position  = P * V * vec4f(worldPos, 1.0);
      output.vPosition = input.position.xyz;
      output.vUv       = input.uv;
      output.VERTEX = (V * vec4f(worldPos, 1.0)).xyz;

      let Tw = (M * vec4f(1.0, 0.0, 0.0, 0.0)).xyz;
      let Bw = (M * vec4f(0.0, 1.0, 0.0, 0.0)).xyz;
      let Nw = (M * vec4f(0.0, 0.0, 1.0, 0.0)).xyz;

      let stride_u = max(length(Tw), 1e-4);
      let stride_v = max(length(Bw), 1e-4);
      let T = Tw / stride_u;
      let B = Bw / stride_v;
      let N = normalize(Nw);

      // World slope = local slope / world units per local unit
      let su = slope_factor * n.y / stride_u;
      let sv = slope_factor * n.z / stride_v;
      output.vNormal = normalize(N - su * T - sv * B);

    output.vertex_tangent  = T;
    output.vertex_binormal = B;
    output.vertex_normal   = output.vNormal;
    output.vertex_height   = n.x * height_scale;

    output.UV = worldPos.xz * waveSettings.sampler_scale.xy;

    let ndc = output.position.xyz / output.position.w;
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
    


    let vertex_tangent = input.vertex_tangent;
    let vertex_binormal = input.vertex_binormal;
    let vertex_normal = input.vertex_normal;
    let vertex_height = input.vertex_height;

    let SCREEN_UV = input.SCREEN_UV;
    let VERTEX = input.VERTEX;
    let UV = input.UV;
	// Calculation of the UV with the UV motion sampler
    let sampler_direction = vec2f(-0.02, 0.02);
	let	uv_offset: vec2f 					 = sampler_direction.xy * TIME;
	let 	uv_sampler_uv: vec2f 				 = UV * waveSettings.uv_sampler_scale.xy + uv_offset;
	let	uv_sampler_uv_offset: vec2f 		 = waveSettings.uv_sampler_strength.xy * textureSample(uv_sampler, texture_sampler, uv_sampler_uv).rg * 2.0 - 1.0;
	let 	uv: vec2f 							 = UV + uv_sampler_uv_offset;
	
                var normalmap = textureSample(normalmap_a_sampler, texture_sampler, uv * 0.05 - uv_offset).rgb;
    // var normalmap = nonRepeatingTexture(normalmap_a_sampler, texture_sampler, uv - uv_offset).rgb;		// 75 % sampler A
	var	ref_normalmap				 = normalmap * 2.0 - 1.0;

    // var	ref_normalmap				 = normalmap;

	// Refraction UV:
			ref_normalmap				 = normalize(vertex_tangent*ref_normalmap.x + vertex_binormal*ref_normalmap.y + vertex_normal*ref_normalmap.z);


let 	ref_uv						 = SCREEN_UV + (ref_normalmap.xy * waveSettings.refraction.x) / -VERTEX.z;
    let ref_uv_clamped = clamp(ref_uv, vec2f(0.001), vec2f(0.999));

	
	// Ground depth:
    let dims = textureDimensions(DEPTH_TEXTURE, 0); // vec2u
	let 	depth_raw					 = textureLoad(DEPTH_TEXTURE, vec2<i32>(vec2<f32>(dims) * SCREEN_UV), 0);

    let ndc_xy = vec2(SCREEN_UV.x, 1.0 - SCREEN_UV.y) * 2.0 - 1.0;
	let 	depth_view					 = frameBuffer.projectionInverseMatrix * vec4(ndc_xy, depth_raw, 1.0);
	let 	dist						 = distance(VERTEX, depth_view.xyz / depth_view.w);
	
	var 	depth_blend 				 = exp((dist + waveSettings.depth_offset.x) * -waveSettings.beers_law.x);
			depth_blend 				 = clamp(1.0 - depth_blend, 0.0, 1.0);
	let	depth_blend_pow				 = clamp(pow(depth_blend, 2.5), 0.0, 1.0);

	// Ground color:
    let screen_color = textureSampleLevel(SCREEN_TEXTURE, texture_sampler, ref_uv_clamped, depth_blend_pow * 2.5).rgb;
	
	let 	dye_color 					 = mix(waveSettings.color_deep.rgb, waveSettings.color_shallow.rgb, depth_blend_pow);
	var	color 						 = mix(screen_color*dye_color, dye_color*0.25, depth_blend_pow);


    var output: FragmentOutput;
    output.albedo = vec4f(color, 0.2);
    output.normal = vec4(OctEncode(ref_normalmap), 1.0, 0.1);
    output.RMO = vec4(vec3(0.0), 0.0);
    return output;
}