#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

  struct VertexOutput {
      @builtin(position) position : vec4<f32>,
      @location(0) vPosition : vec3<f32>,
      @location(1) vNormal : vec3<f32>,
      @location(2) uv : vec2<f32>,
  };

  @group(0) @binding(3) var texture_sampler: sampler;
  @group(0) @binding(4) var z_tex: texture_2d<f32>;
  @group(0) @binding(5) var old_z_tex: texture_2d<f32>;
  @group(0) @binding(6) var collision_texture: texture_2d<f32>;
  @group(0) @binding(7) var old_collision_texture: texture_2d<f32>;

  struct Params {
    resolution: vec4f,
    TIME: vec4f
};
  @group(0) @binding(8) var<storage, read> params: Params;

  const p = array<vec2f, 3>(
      vec2f(-1.0, -1.0),
      vec2f( 3.0, -1.0),
      vec2f(-1.0,  3.0)
  );

  @vertex
  fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
      var out : VertexOutput;
      out.position = vec4f(p[vertexIndex], 0.0, 1.0);
      let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
      out.uv = vec2f(uv.x, 1.0 - uv.y);
      return out;
  }

  fn hash21(p: vec2f) -> f32 {
      return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
  }

  fn noise2(p: vec2f) -> f32 {
      let i = floor(p);
      let f = fract(p);
      let u = f * f * (3.0 - 2.0 * f);
      let a = hash21(i);
      let b = hash21(i + vec2f(1.0, 0.0));
      let c = hash21(i + vec2f(0.0, 1.0));
      let d = hash21(i + vec2f(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // ---- Procedural ocean: FBM with directional scroll ----
  fn oceanHeight(uv: vec2f, t: f32) -> f32 {
      let wind = normalize(vec2f(0.2, 0.2));
      let side = vec2f(-wind.y, wind.x);

    let z = 1.0;
      var h = 0.0;
      h = h + noise2(uv *  3.0 + wind * t * 0.05) * 0.50 * z;
      h = h + noise2(uv *  9.0 + side * t * 0.08) * 0.28 * z;
      h = h + noise2(uv * 22.0 + wind * t * 0.12) * 0.16 * z;
      h = h + noise2(uv * 55.0 - side * t * 0.15) * 0.06 * z;

      return h * 2.0 - 1.0;   // [-1, 1]
  }

fn texture(tex: texture_2d<f32>, uv: vec2f) -> vec4f {
    return textureSample(tex, texture_sampler, uv);
}
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {

    let grid_points = params.resolution.x;

    let collision_strength = 0.5;
    let wave_speed = 0.0125;

    let UV = input.uv;
	let pix_size = 1.0/grid_points;
	
	let z = wave_speed * (texture(z_tex, UV + vec2(pix_size, 0.0))
					   + texture(z_tex, UV - vec2(pix_size, 0.0))
					   + texture(z_tex, UV + vec2(0.0, pix_size)) 
					   + texture(z_tex, UV - vec2(0.0, pix_size)))
				  + (2.0 - 4.0 * wave_speed) * (texture(z_tex, UV)) - (texture(old_z_tex, UV));
				
	var z_new_pos = z.r; // positive waves are stored in the red channel
	var z_new_neg = z.g; // negative waves are stored in the green channel

	let collision_state_old = texture(old_collision_texture, UV).r;
	let collision_state_new = texture(collision_texture, UV).r;
	
	if (collision_state_new > 0.0 && collision_state_old == 0.0) {
		z_new_pos = collision_strength * collision_state_new;
	} else if (collision_state_new == 0.0 && collision_state_old > 0.0) {
		z_new_neg = collision_strength * collision_state_old;
	}
	
	// let land = texture(land_texture, UV).r;
	// if (land > 0.0f) {
	// 	z_new_pos = 0.0f;
	// 	z_new_neg = 0.0f;
	// }
	
	// COLOR.r = z_new_pos;
	// COLOR.g = z_new_neg;

	// COLOR.b = 0.0f;



    return vec4(z_new_pos, z_new_neg, 0.0, 1.0);



    //   // Time accumulator stashed in .b of the previous simulation frame.
    //   // All pixels write the same value, so sampling anywhere returns it.
    //   let t = params.TIME.x + 1.0 / 60.0;

    //   let h = oceanHeight(UV, t * 1.0);

    //   // Render shader reads height = s.r - s.g
    //   let pos = max( h, 0.0);
    //   let neg = max(-h, 0.0);

    //   return vec4f(pos, neg, t, 1.0);
}