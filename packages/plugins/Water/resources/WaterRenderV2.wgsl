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
@group(2) @binding(0) var<storage, read> waveSettings: WaveSettings;

struct WaterOutput {
    color : vec3f,
    normal : vec3f,
};

fn WaterRender(TIME: f32, UV: vec2f, SCREEN_UV: vec2f, VERTEX: vec3f, vertex_tangent: vec3f, vertex_binormal: vec3f, vertex_normal: vec3f, worldPosition: vec3f) -> WaterOutput {
	// Calculation of the UV with the UV motion sampler
	let	uv_offset: vec2f 					 = waveSettings.sampler_direction.xy * TIME;
	let 	uv_sampler_uv: vec2f 				 = UV * waveSettings.uv_sampler_scale.xy + uv_offset;
	let	uv_sampler_uv_offset: vec2f 		 = waveSettings.uv_sampler_strength.xy * textureSample(uv_sampler, texture_sampler, uv_sampler_uv).rg * 2.0 - 1.0;
	let 	uv: vec2f 							 = UV + uv_sampler_uv_offset;
	
	// Normalmap:
	// var normalmap					 = textureSample(normalmap_a_sampler, texture_sampler, uv - uv_offset*2.0).rgb * 0.75;		// 75 % sampler A
	// 		normalmap 					+= textureSample(normalmap_b_sampler, texture_sampler, uv + uv_offset).rgb * 0.25;			// 25 % sampler B
    var normalmap = textureSample(normalmap_a_sampler, texture_sampler, uv - uv_offset).rgb;		// 75 % sampler A
    // var normalmap = nonRepeatingTexture(normalmap_a_sampler, texture_sampler, uv - uv_offset).rgb;		// 75 % sampler A

    // var normalmap = nonRepeatingnormalMap( normalmap_a_sampler, uv - uv_offset, NORMAL_TEXTURE_SCALE);
	
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
	// var	color 						 = mix(screen_color*dye_color, dye_color*0.25, depth_blend_pow*0.5);
      var color = mix(screen_color*dye_color, dye_color*0.25, depth_blend_pow);
	


    let caustic_uv_screen = ref_uv_clamped;

    let caustic_depth_raw = textureLoad( DEPTH_TEXTURE, vec2<i32>(clamp(vec2<f32>(dims) * caustic_uv_screen, vec2f(0.0), vec2f(dims) - vec2f(1.0))), 0);

    let inv_mvp = frameBuffer.viewInverseMatrix * frameBuffer.projectionInverseMatrix;

    let caustic_screenPos = vec4f( caustic_uv_screen.x * 2.0 - 1.0, (1.0 - caustic_uv_screen.y) * 2.0 - 1.0, caustic_depth_raw, 1.0);

    var caustic_worldPos = inv_mvp * caustic_screenPos;
    caustic_worldPos = vec4f(caustic_worldPos.xyz / caustic_worldPos.w, caustic_worldPos.w);

    let caustic_Uv = caustic_worldPos.xz / vec2f(1024.0) + 0.5;
    let caustic_color = textureSampleLevel(caustic_sampler, texture_sampler, caustic_Uv * 300.0, 0.0);

    let caustic_depth = distance(caustic_worldPos.xyz, worldPosition);
    let caustic_fade = 1.0 - smoothstep(0.5, 8.0, caustic_depth);

    color *= 1.0 + pow(caustic_color.r, 1.5) * caustic_fade * (1.0 - depth_blend) * 6.0;



	let foam_depth = (1.0 - min(1.0, dist / 3.0));
    let foam_noise = clamp(pow(textureSample(foam_sampler, texture_sampler, (uv*4.0) - uv_offset).r, 10.0)*40.0, 0.0, 0.2);
    let foam_mix = clamp(pow(foam_depth, 8.0) * 0.4, 0.0, 1.0);

    color = mix(color, vec3(1.0), foam_mix * smoothstep(0.0, 1.0, waveSettings.foam_level.x - dist));
	
    var output: WaterOutput;
    output.color = color;
    output.normal = ref_normalmap;
    return output;
}