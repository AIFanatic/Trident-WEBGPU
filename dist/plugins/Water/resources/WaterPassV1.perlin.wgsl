#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

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

// Perlin-noise height in WORLD-XZ. Tweak the 1/1024 divisor for wavelength.
  fn waveHeight(world_xz: vec2f, t: f32) -> f32 {
      let base = world_xz * (1.0 / 1024.0);
      let n =
          textureSampleLevel(perlin, texture_sampler, base *  3.0 + vec2f( t * 0.03,  t * 0.01), 0.0).r * 0.6 +
          textureSampleLevel(perlin, texture_sampler, base *  9.0 + vec2f(-t * 0.08,  t * 0.04), 0.0).r * 0.3 +
          textureSampleLevel(perlin, texture_sampler, base * 21.0 + vec2f( t * 0.12, -t * 0.06), 0.0).r * 0.1;
      return (n - 0.5) * 10.75;
  }

  @vertex
  fn vertexMain(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;

      let M = modelMatrix[input.instanceIdx];
      let V = frameBuffer.viewMatrix;
      let P = frameBuffer.projectionMatrix;

      let time = TIME * waveSettings.wave_speed.x;

      // 1) Base position in WORLD space (transform scale included).
      let localPos  = vec4f(input.position, 1.0);
      let worldPos0 = (M * localPos).xyz;

      // 2) Sample height at vertex + two neighbors for finite-difference normal.
      let eps  = 1.0;  // world units; lower = sharper, higher = smoother.
      let h    = waveHeight(worldPos0.xz,                    time);
      let h_dx = waveHeight(worldPos0.xz + vec2f(eps, 0.0),  time);
      let h_dz = waveHeight(worldPos0.xz + vec2f(0.0, eps),  time);

      // 3) Displace along world +Y.
      let worldPos = worldPos0 + vec3f(0.0, h, 0.0);

      // 4) Orthonormal basis from gradient.
      let tangentW = normalize(vec3f(eps, h_dx - h, 0.0));
      let binormW  = normalize(vec3f(0.0, h_dz - h, eps));
      let normalW  = normalize(cross(binormW, tangentW));  // ≈ +Y

      // 5) View → clip.
      let viewPos     = (V * vec4f(worldPos, 1.0)).xyz;
      output.position = P * vec4f(viewPos, 1.0);

      output.VERTEX   = viewPos;
      output.worldPos = worldPos;

      output.vertex_tangent  = tangentW;
      output.vertex_binormal = binormW;
      output.vertex_normal   = normalW;

      // World-XZ for sampler UV so mesh scaling doesn't stretch normal maps.
      output.UV  = worldPos.xz * waveSettings.sampler_scale.xy;
      output.vUv = output.UV;

      // Screen UV for refraction / depth lookup (Y flipped for top-left texel origin).
      let ndc = output.position.xyz / output.position.w;
      output.SCREEN_UV   = ndc.xy * 0.5 + 0.5;
      output.SCREEN_UV.y = 1.0 - output.SCREEN_UV.y;

      output.vertex_height = output.position.z;
      output.vNormal       = input.normal;

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
    let vertex_height = input.vertex_height;

	// Calculation of the UV with the UV motion sampler
	let	uv_offset: vec2f 					 = waveSettings.sampler_direction.xy * TIME;
	let 	uv_sampler_uv: vec2f 				 = UV * waveSettings.uv_sampler_scale.xy + uv_offset;
	let	uv_sampler_uv_offset: vec2f 		 = waveSettings.uv_sampler_strength.xy * textureSample(uv_sampler, texture_sampler, uv_sampler_uv).rg * 2.0 - 1.0;
	let 	uv: vec2f 							 = UV + uv_sampler_uv_offset;
	
	// Normalmap:
	var normalmap					 = textureSample(normalmap_a_sampler, texture_sampler, uv - uv_offset*2.0).rgb * 0.75;		// 75 % sampler A
			normalmap 					+= textureSample(normalmap_b_sampler, texture_sampler, uv + uv_offset).rgb * 0.25;			// 25 % sampler B
	
	// Refraction UV:
	var	ref_normalmap				 = normalmap * 2.0 - 1.0;
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
	var	color 						 = mix(screen_color*dye_color, dye_color*0.25, depth_blend_pow*0.5);
	


    // let caustic_uv_screen = ref_uv_clamped;

    // let caustic_depth_raw = textureLoad( DEPTH_TEXTURE, vec2<i32>(clamp(vec2<f32>(dims) * caustic_uv_screen, vec2f(0.0), vec2f(dims) - vec2f(1.0))), 0);

    // let inv_mvp = frameBuffer.viewInverseMatrix * frameBuffer.projectionInverseMatrix;

    // let caustic_screenPos = vec4f( caustic_uv_screen.x * 2.0 - 1.0, (1.0 - caustic_uv_screen.y) * 2.0 - 1.0, caustic_depth_raw, 1.0);

    // var caustic_worldPos = inv_mvp * caustic_screenPos;
    // caustic_worldPos = vec4f(caustic_worldPos.xyz / caustic_worldPos.w, caustic_worldPos.w);

    // let caustic_Uv = caustic_worldPos.xz / vec2f(1024.0) + 0.5;
    // let caustic_color = textureSampleLevel(caustic_sampler, texture_sampler, caustic_Uv * 300.0, 0.0);

    // let caustic_depth = distance(caustic_worldPos.xyz, input.worldPos);
    // let caustic_fade = 1.0 - smoothstep(0.5, 8.0, caustic_depth);

    // color *= 1.0 + pow(caustic_color.r, 1.5) * caustic_fade * (1.0 - depth_blend) * 6.0;



	// let foam_depth = (1.0 - min(1.0, dist / 3.0));
    // let foam_noise = clamp(pow(textureSample(foam_sampler, texture_sampler, (uv*4.0) - uv_offset).r, 10.0)*40.0, 0.0, 0.2);
    // let foam_mix = clamp(pow(foam_depth + foam_noise, 8.0) * foam_noise * 0.4, 0.0, 1.0);

    // color = mix(color, vec3(1.0), foam_mix * smoothstep(0.0, 1.0, waveSettings.foam_level.x - dist));
	
    var output: FragmentOutput;
    output.albedo = vec4f(color, 0.2);
    output.normal = vec4(OctEncode(ref_normalmap), 1.0, 0.0);
    output.RMO = vec4(vec3(0.0), 0.0);


    // var output: FragmentOutput;
    // output.albedo = vec4f(vec3(1.0), 0.2);
    // output.normal = vec4(OctEncode(input.vertex_normal), 1.0, 0.1);
    // output.RMO = vec4(vec3(0.0), 0.0);

    return output;
}