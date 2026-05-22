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
    @location(2) uv : vec2<f32>,
    @location(3) tangent : vec3<f32>,
    @location(4) bitangent : vec3<f32>,
    @location(5) SCREEN_UV : vec2<f32>,
    @location(6) VERTEX : vec3<f32>,
    @location(7) vertex_height : f32,
    @location(8) UV : vec2<f32>,
};

struct FragmentOutput {
    @location(0) albedo : vec4f,
    @location(1) normal : vec4f,
    @location(2) RMO : vec4f,
};

@group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
@group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;

@group(0) @binding(3) var texture_sampler: sampler;
@group(0) @binding(5) var simulation_texture: texture_2d<f32>;

    struct Params {
        resolution: vec4f,
        TIME: vec4f
    };
@group(0) @binding(6) var<storage, read> params: Params;

    @group(0) @binding(7) var SCREEN_TEXTURE: texture_2d<f32>;
    @group(0) @binding(8) var DEPTH_TEXTURE: texture_depth_2d;

@group(0) @binding(9) var normalmap_a_sampler: texture_2d<f32>; // Normalmap sampler A
@group(0) @binding(10) var normalmap_b_sampler: texture_2d<f32>; // Normalmap sampler B
@group(0) @binding(11) var uv_sampler: texture_2d<f32>; // UV motion sampler for shifting the normalmap

const HEIGHT_SCALE = 10.0;

fn waterHeight(uv: vec2f) -> f32 {
    let s = textureSampleLevel(simulation_texture, texture_sampler, uv, 0.0);
    return (s.r - s.g) * HEIGHT_SCALE;
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let M = modelMatrix[input.instanceIdx];
    let V = frameBuffer.viewMatrix;
    let P = frameBuffer.projectionMatrix;

    var p = input.position;
    let height = waterHeight(input.uv);
    p.z += height;

    let worldPos = (M * vec4f(p, 1.0)).xyz;

    output.position = P * V * vec4f(worldPos, 1.0);
    output.vPosition = worldPos;
    output.uv = input.uv;





    output.tangent = (M * vec4f(1.0, 0.0, 0.0, 0.0)).xyz;
    output.bitangent = (M * vec4f(0.0, 1.0, 0.0, 0.0)).xyz;
    output.vNormal = (M * vec4f(0.0, 0.0, 1.0, 0.0)).xyz;

    let ndc = output.position.xyz / output.position.w;
    output.SCREEN_UV   = ndc.xy * 0.5 + 0.5;
    output.SCREEN_UV.y = 1.0 - output.SCREEN_UV.y;
    output.vertex_height = height;

    let sampler_scale = vec2f(0.125, 0.125);
    output.UV = worldPos.xz * sampler_scale.xy;



  let viewPos = (V * vec4f(worldPos, 1.0)).xyz;

  output.VERTEX = viewPos;


    

    return output;
}

fn sampleHeight(uv: vec2f) -> f32 {
    let s = textureSampleLevel(simulation_texture, texture_sampler, uv, 0.0);
    return s.r - s.g;
}

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    let eps = 1.0 / params.resolution.x;
    let amp = HEIGHT_SCALE;


    let dims = vec2f(textureDimensions(simulation_texture, 0));
    let texel = 1.0 / dims;

    let hL = waterHeight(input.uv - vec2f(texel.x, 0.0));
    let hR = waterHeight(input.uv + vec2f(texel.x, 0.0));
    let hD = waterHeight(input.uv - vec2f(0.0, texel.y));
    let hU = waterHeight(input.uv + vec2f(0.0, texel.y));

    let U = input.vNormal;

    // Keep tangent/bitangent unnormalized here because their length contains model scale.
    let dPdu = input.tangent * (2.0 * texel.x) + U * (hR - hL);
    let dPdv = input.bitangent * (2.0 * texel.y) + U * (hU - hD);

    let N_world = normalize(cross(dPdu, dPdv));



    let UV = input.UV;
    let SCREEN_UV = input.SCREEN_UV;
    let VERTEX = input.VERTEX;

    let PROJECTION_MATRIX = frameBuffer.projectionMatrix;

    let vertex_tangent = input.tangent;
    let vertex_binormal = input.bitangent;
    let vertex_normal = input.vNormal;
    let vertex_height = input.vertex_height;

    let sampler_direction = vec2f(0.01, 0.02);
    let uv_sampler_scale = vec2f(0.1, 0.1);
    let uv_sampler_strength = vec2f(0.04, 0.0);
    let	uv_offset: vec2f 					 = sampler_direction.xy * params.TIME.x;
	let 	uv_sampler_uv: vec2f 				 = UV * uv_sampler_scale.xy + uv_offset;
	// let	uv_sampler_uv_offset: vec2f 		 = uv_sampler_strength.xy * textureSample(uv_sampler, texture_sampler, uv_sampler_uv).rg * 2.0 - 1.0;
    let uv_sampler_uv_offset = uv_sampler_strength.xy * (textureSample(uv_sampler, texture_sampler, uv_sampler_uv).rg * 2.0 - 1.0);
	let 	uv: vec2f 							 = UV + uv_sampler_uv_offset;

    var normalmap = textureSample(normalmap_a_sampler, texture_sampler, uv - uv_offset).rgb;		// 75 % sampler A
	var	ref_normalmap				 = normalmap * 2.0 - 1.0;
			ref_normalmap				 = normalize(vertex_tangent*ref_normalmap.x + vertex_binormal*ref_normalmap.y + vertex_normal*ref_normalmap.z);





let T_world = normalize(dPdu);
let B_world = normalize(cross(N_world, T_world));
// Or, depending on handedness:
// let B_world = normalize(cross(T_world, N_world));

let n_ts = textureSample(normalmap_a_sampler, texture_sampler, uv - uv_offset).rgb * 2.0 - 1.0;

let N_detail = normalize(
    T_world * n_ts.x +
    B_world * n_ts.y +
    N_world * n_ts.z
);

            
    let refraction: f32 = 0.075;
      // N_world is already in world space — project into view space for screen-correct refraction
      let N_view = (frameBuffer.viewMatrix * vec4f(N_detail, 0.0)).xyz;
      let ref_uv = SCREEN_UV + (N_view.xy * refraction) / -VERTEX.z;
      let ref_uv_clamped = clamp(ref_uv, vec2f(0.001), vec2f(0.999));

    // Ground depth:
    let dims2 = textureDimensions(DEPTH_TEXTURE, 0); // vec2u
    let 	depth_raw					 = textureLoad(DEPTH_TEXTURE, vec2<i32>(vec2<f32>(dims2) * SCREEN_UV), 0);

    let ndc_xy = vec2(SCREEN_UV.x, 1.0 - SCREEN_UV.y) * 2.0 - 1.0;
    let 	depth_view					 = frameBuffer.projectionInverseMatrix * vec4(ndc_xy, depth_raw, 1.0);
    let 	dist						 = distance(VERTEX, depth_view.xyz / depth_view.w);
    
    let beers_law: f32 = 0.2;
    let depth_offset: f32 = 0.75;
    let color_shallow: vec3f = vec3f(0.0, 0.4, 0.45);
    let color_deep: vec3f = vec3f(0.0, 0.0, 0.0);

    var 	depth_blend 				 = exp((dist + depth_offset) * -beers_law);
    		depth_blend 				 = clamp(1.0 - depth_blend, 0.0, 1.0);
    let	depth_blend_pow				 = clamp(pow(depth_blend, 2.5), 0.0, 1.0);

    // Ground color:
    let screen_color = textureSampleLevel(SCREEN_TEXTURE, texture_sampler, ref_uv_clamped, depth_blend_pow * 2.5).rgb;
    
    let 	dye_color 					 = mix(color_shallow.rgb, color_deep.rgb, depth_blend_pow);
    var	color 						 = mix(screen_color*dye_color, dye_color*0.25, depth_blend_pow);



    var output: FragmentOutput;
    output.albedo = vec4f(vec3f(color), 0.2);
    output.normal = vec4(OctEncode(N_detail), 1.0, 0.1);
    output.RMO = vec4(vec3(0.0), 0.0);
    return output;
}