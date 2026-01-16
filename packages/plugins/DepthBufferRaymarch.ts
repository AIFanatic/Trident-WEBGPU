import {
    Components,
    GPU,
    Geometry,
    Mathf,
} from "@trident/core";

export class DepthBufferRaymarchPass extends GPU.RenderPass {
    public name: string = "DepthBufferRaymarchPass";
    public output: GPU.RenderTexture;

    private shader: GPU.Shader;
    private geometry: Geometry;

    constructor() {
        super();
        
        this.output = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
        this.output.name = this.name;
    }

    public async init(resources: GPU.ResourcePool) {
        this.shader = await GPU.Shader.Create({
            code: `
                #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(0) uv : vec2<f32>,
                };

                // Full-screen triangle (covers screen with 3 verts)
                const p = array<vec2f, 3>(
                    vec2f(-1.0, -1.0),
                    vec2f( 3.0, -1.0),
                    vec2f(-1.0,  3.0)
                );

                @vertex
                fn vertexMain(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
                    var output: VertexOutput;
                    output.position = vec4(p[vertexIndex], 0.0, 1.0);
                    let uv = 0.5 * (p[vertexIndex] + vec2f(1.0, 1.0));
                    output.uv = vec2f(uv.x, 1.0 - uv.y);
                    return output;
                }

                // Copyright (c) 2023 Tomasz Stachowiak
                //
                // This contribution is dual licensed under EITHER OF
                //
                //     Apache License, Version 2.0, (http://www.apache.org/licenses/LICENSE-2.0)
                //     MIT license (http://opensource.org/licenses/MIT)
                //
                // at your option.
                //
                // This is a port of the original ["raymarch.hlsl"] to WGSL. It's deliberately
                // kept as close as possible so that patches to the original "raymarch.hlsl"
                // have the greatest chances of applying to this version.
                //
                // ["raymarch.hlsl"]:
                // https://gist.github.com/h3r2tic/9c8356bdaefbe80b1a22ae0aaee192db

                // #import bevy_pbr::mesh_view_bindings::depth_prepass_texture
                // #import bevy_pbr::view_transformations::{
                //     direction_world_to_clip,
                //     ndc_to_uv,
                //     perspective_camera_near,
                //     position_world_to_ndc,
                // }

                struct View_Bindings {
                    clip_from_view: mat4x4<f32>,
                    clip_from_world: mat4x4<f32>,
                    world_from_clip: mat4x4<f32>,
                    
                    
                    
                    light_position: vec4<f32>,

                    projectionOutputSize: vec4<f32>,
                    viewPosition: vec4<f32>, // w = near
                    projectionInverseMatrix: mat4x4<f32>,
                    viewInverseMatrix: mat4x4<f32>,
                    viewMatrix: mat4x4<f32>,
                };

                @group(0) @binding(0) var<storage, read> view_bindings: View_Bindings;
                // Allows us to sample from the depth buffer with bilinear filtering.
                @group(0) @binding(1) var depth_linear_sampler: sampler;

                // Allows us to sample from the depth buffer with nearest-neighbor filtering.
                @group(0) @binding(2) var depth_nearest_sampler: sampler;

                @group(0) @binding(3) var depth_prepass_texture: texture_depth_2d;
                @group(0) @binding(4) var normal_texture: texture_2d<f32>;

                @group(0) @binding(5) var color_texture: texture_2d<f32>;

                fn ndc_to_uv(ndc: vec2<f32>) -> vec2<f32> {
                    return ndc * vec2(0.5, -0.5) + vec2(0.5);
                }

                /// Retrieve the perspective camera near clipping plane
                fn perspective_camera_near() -> f32 {
                    // return view_bindings::view.clip_from_view[3][2];
                    // return view_bindings.clip_from_view[3][2];
                    return view_bindings.viewPosition.w;
                }

                /// Convert a world space position to ndc space
                fn position_world_to_ndc(world_pos: vec3<f32>) -> vec3<f32> {
                    // let ndc_pos = view_bindings::view.clip_from_world * vec4(world_pos, 1.0);
                    let ndc_pos = view_bindings.clip_from_world * vec4(world_pos, 1.0);
                    return ndc_pos.xyz / ndc_pos.w;
                }

                /// Convert a world space direction to clip space
                fn direction_world_to_clip(world_dir: vec3<f32>) -> vec4<f32> {
                    // let clip_dir = view_bindings::view.clip_from_world * vec4(world_dir, 0.0);
                    let clip_dir = view_bindings.clip_from_world * vec4(world_dir, 0.0);
                    return clip_dir;
                }

                // Main code

                struct HybridRootFinder {
                    linear_steps: u32,
                    bisection_steps: u32,
                    use_secant: bool,
                    linear_march_exponent: f32,

                    jitter: f32,
                    min_t: f32,
                    max_t: f32,
                }

                fn hybrid_root_finder_new_with_linear_steps(v: u32) -> HybridRootFinder {
                    var res: HybridRootFinder;
                    res.linear_steps = v;
                    res.bisection_steps = 0u;
                    res.use_secant = false;
                    res.linear_march_exponent = 1.0;
                    res.jitter = 1.0;
                    res.min_t = 0.0;
                    res.max_t = 1.0;
                    return res;
                }

                fn hybrid_root_finder_find_root(
                    root_finder: ptr<function, HybridRootFinder>,
                    start: vec3<f32>,
                    end: vec3<f32>,
                    distance_fn: ptr<function, DepthRaymarchDistanceFn>,
                    hit_t: ptr<function, f32>,
                    miss_t: ptr<function, f32>,
                    hit_d: ptr<function, DistanceWithPenetration>,
                ) -> bool {
                    let dir = end - start;

                    var min_t = (*root_finder).min_t;
                    var max_t = (*root_finder).max_t;

                    var min_d = DistanceWithPenetration(0.0, false, 0.0);
                    var max_d = DistanceWithPenetration(0.0, false, 0.0);

                    let step_size = (max_t - min_t) / f32((*root_finder).linear_steps);

                    var intersected = false;

                    //
                    // Ray march using linear steps

                    if ((*root_finder).linear_steps > 0u) {
                        let candidate_t = mix(
                            min_t,
                            max_t,
                            pow(
                                (*root_finder).jitter / f32((*root_finder).linear_steps),
                                (*root_finder).linear_march_exponent
                            )
                        );

                        let candidate = start + dir * candidate_t;
                        let candidate_d = depth_raymarch_distance_fn_evaluate(distance_fn, candidate);
                        intersected = candidate_d.distance < 0.0 && candidate_d.valid;

                        if (intersected) {
                            max_t = candidate_t;
                            max_d = candidate_d;
                            // The "[min_t .. max_t]" interval contains an intersection. End the linear search.
                        } else {
                            // No intersection yet. Carry on.
                            min_t = candidate_t;
                            min_d = candidate_d;

                            for (var step = 1u; step < (*root_finder).linear_steps; step += 1u) {
                                let candidate_t = mix(
                                    (*root_finder).min_t,
                                    (*root_finder).max_t,
                                    pow(
                                        (f32(step) + (*root_finder).jitter) / f32((*root_finder).linear_steps),
                                        (*root_finder).linear_march_exponent
                                    )
                                );

                                let candidate = start + dir * candidate_t;
                                let candidate_d = depth_raymarch_distance_fn_evaluate(distance_fn, candidate);
                                intersected = candidate_d.distance < 0.0 && candidate_d.valid;

                                if (intersected) {
                                    max_t = candidate_t;
                                    max_d = candidate_d;
                                    // The "[min_t .. max_t]" interval contains an intersection.
                                    // End the linear search.
                                    break;
                                } else {
                                    // No intersection yet. Carry on.
                                    min_t = candidate_t;
                                    min_d = candidate_d;
                                }
                            }
                        }
                    }

                    *miss_t = min_t;
                    *hit_t = min_t;

                    //
                    // Refine the hit using bisection

                    if (intersected) {
                        for (var step = 0u; step < (*root_finder).bisection_steps; step += 1u) {
                            let mid_t = (min_t + max_t) * 0.5;
                            let candidate = start + dir * mid_t;
                            let candidate_d = depth_raymarch_distance_fn_evaluate(distance_fn, candidate);

                            if (candidate_d.distance < 0.0 && candidate_d.valid) {
                                // Intersection at the mid point. Refine the first half.
                                max_t = mid_t;
                                max_d = candidate_d;
                            } else {
                                // No intersection yet at the mid point. Refine the second half.
                                min_t = mid_t;
                                min_d = candidate_d;
                            }
                        }

                        if ((*root_finder).use_secant) {
                            // Finish with one application of the secant method
                            let total_d = min_d.distance + -max_d.distance;

                            let mid_t = mix(min_t, max_t, min_d.distance / total_d);
                            let candidate = start + dir * mid_t;
                            let candidate_d = depth_raymarch_distance_fn_evaluate(distance_fn, candidate);

                            // Only accept the result of the secant method if it improves upon
                            // the previous result.
                            //
                            // Technically root_finder should be "abs(candidate_d.distance) <
                            // min(min_d.distance, -max_d.distance) * frac", but root_finder seems
                            // sufficient.
                            if (abs(candidate_d.distance) < min_d.distance * 0.9 && candidate_d.valid) {
                                *hit_t = mid_t;
                                *hit_d = candidate_d;
                            } else {
                                *hit_t = max_t;
                                *hit_d = max_d;
                            }

                            return true;
                        } else {
                            *hit_t = max_t;
                            *hit_d = max_d;
                            return true;
                        }
                    } else {
                        // Mark the conservative miss distance.
                        *hit_t = min_t;
                        return false;
                    }
                }

                struct DistanceWithPenetration {
                    /// Distance to the surface of which a root we're trying to find
                    distance: f32,

                    /// Whether to consider this sample valid for intersection.
                    /// Mostly relevant for allowing the ray marcher to travel behind surfaces,
                    /// as it will mark surfaces it travels under as invalid.
                    valid: bool,

                    /// Conservative estimate of depth to which the ray penetrates the marched surface.
                    penetration: f32,
                }

                struct DepthRaymarchDistanceFn {
                    depth_tex_size: vec2<f32>,

                    march_behind_surfaces: bool,
                    depth_thickness: f32,

                    use_sloppy_march: bool,
                }

                fn ndc_depth_from_hw(d_hw: f32) -> f32 {
                    // hardware depth (0..1) -> NDC (-1..1)
                    return d_hw * 2.0 - 1.0;
                }

                fn scaled_linear_from_ndc(z_ndc: f32, proj_inv: mat4x4<f32>) -> f32 {
                    // Reconstruct view-space position at this z, then return 1/linearZ (scaled-linear)
                    let clip = vec4<f32>(0.0, 0.0, z_ndc, 1.0);
                    let view_h = proj_inv * clip;
                    let view = view_h.xyz / view_h.w;     // view space
                    let linear_z = -view.z;               // +forward
                    return 1.0 / max(linear_z, 1e-6);     // scaled-linear (matches Bevy math)
                }

  fn ndc_to_view_depth(ndc: vec3<f32>) -> f32 {
      let clip = vec4(ndc, 1.0);
      let view = view_bindings.projectionInverseMatrix * clip;
      return -view.z / max(view.w, 1e-6);
  }
  fn uv_depth_to_view_depth(uv: vec2<f32>, depth: f32) -> f32 {
      return ndc_to_view_depth(vec3(uv_to_ndc(uv), depth));
  }
        fn depth_raymarch_distance_fn_evaluate(
            distance_fn: ptr<function, DepthRaymarchDistanceFn>,
            ray_point_cs: vec3<f32>,
        ) -> DistanceWithPenetration {
            let interp_uv = ndc_to_uv(ray_point_cs.xy);

            let ray_depth = ndc_to_view_depth(ray_point_cs);

            let depth_tex_size = vec2f(textureDimensions(depth_prepass_texture));
            let depth_vals: vec4<f32> =
                textureGather(depth_prepass_texture, depth_nearest_sampler, interp_uv);
            let frac_px: vec2<f32> = fract(interp_uv * depth_tex_size - vec2<f32>(0.5));
            let filtered_depth_sample: f32 = mix(
                mix(depth_vals.w, depth_vals.z, frac_px.x),
                mix(depth_vals.x, depth_vals.y, frac_px.x),
                frac_px.y
            );
            let filtered_depth = uv_depth_to_view_depth(interp_uv, filtered_depth_sample);
            let nearest_depth = uv_depth_to_view_depth(
                interp_uv,
                textureSampleLevel(depth_prepass_texture, depth_nearest_sampler, interp_uv, 0u)
            );

            var max_depth = 0.0;
            var min_depth = 0.0;
            if ((*distance_fn).use_sloppy_march) {
                max_depth = nearest_depth;
                min_depth = nearest_depth;
            } else {
                max_depth = max(filtered_depth, nearest_depth);
                min_depth = min(filtered_depth, nearest_depth);
            }

            let bias = max_depth * 0.000002;

            var res: DistanceWithPenetration;
            res.distance = (max_depth + bias) - ray_depth;
            res.penetration = ray_depth - min_depth;

            if ((*distance_fn).march_behind_surfaces) {
                res.valid = res.penetration < (*distance_fn).depth_thickness;
            } else {
                res.valid = true;
            }

            return res;
        }

                struct DepthRayMarchResult {
                    /// True if the raymarch hit something.
                    hit: bool,

                    /// In case of a hit, the normalized distance to it.
                    ///
                    /// In case of a miss, the furthest the ray managed to travel, which could either be
                    /// exceeding the max range, or getting behind a surface further than the depth thickness.
                    ///
                    /// Range: "0..=1" as a lerp factor over "ray_start_cs..=ray_end_cs".
                    hit_t: f32,

                    /// UV corresponding to "hit_t".
                    hit_uv: vec2<f32>,

                    /// The distance that the hit point penetrates into the hit surface.
                    /// Will normally be non-zero due to limited precision of the ray march.
                    ///
                    /// In case of a miss: undefined.
                    hit_penetration: f32,

                    /// Ditto, within the range "0..DepthRayMarch::depth_thickness_linear_z"
                    ///
                    /// In case of a miss: undefined.
                    hit_penetration_frac: f32,
                }

                struct DepthRayMarch {
                    /// Number of steps to be taken at regular intervals to find an initial intersection.
                    /// Must not be zero.
                    linear_steps: u32,

                    /// Exponent to be applied in the linear part of the march.
                    ///
                    /// A value of 1.0 will result in equidistant steps, and higher values will compress
                    /// the earlier steps, and expand the later ones. This might be desirable in order
                    /// to get more detail close to objects in SSR or SSGI.
                    ///
                    /// For optimal performance, this should be a small compile-time unsigned integer,
                    /// such as 1 or 2.
                    linear_march_exponent: f32,

                    /// Number of steps in a bisection (binary search) to perform once the linear search
                    /// has found an intersection. Helps narrow down the hit, increasing the chance of
                    /// the secant method finding an accurate hit point.
                    ///
                    /// Useful when sampling color, e.g. SSR or SSGI, but pointless for contact shadows.
                    bisection_steps: u32,

                    /// Approximate the root position using the secant method -- by solving for line-line
                    /// intersection between the ray approach rate and the surface gradient.
                    ///
                    /// Useful when sampling color, e.g. SSR or SSGI, but pointless for contact shadows.
                    use_secant: bool,

                    /// Jitter to apply to the first step of the linear search; 0..=1 range, mapping
                    /// to the extent of a single linear step in the first phase of the search.
                    /// Use 1.0 if you don't want jitter.
                    jitter: f32,

                    /// Clip space coordinates (w=1) of the ray.
                    ray_start_cs: vec3<f32>,
                    ray_end_cs: vec3<f32>,

                    /// Should be used for contact shadows, but not for any color bounce, e.g. SSR.
                    ///
                    /// For SSR etc. this can easily create leaks, but with contact shadows it allows the rays
                    /// to pass over invalid occlusions (due to thickness), and find potentially valid ones ahead.
                    ///
                    /// Note that this will cause the linear search to potentially miss surfaces,
                    /// because when the ray overshoots and ends up penetrating a surface further than
                    /// "depth_thickness_linear_z", the ray marcher will just carry on.
                    ///
                    /// For this reason, this may require a lot of samples, or high depth thickness,
                    /// so that "depth_thickness_linear_z >= world space ray length / linear_steps".
                    march_behind_surfaces: bool,

                    /// If "true", the ray marcher only performs nearest lookups of the depth buffer,
                    /// resulting in aliasing and false occlusion when marching tiny detail.
                    /// It should work fine for longer traces with fewer rays though.
                    use_sloppy_march: bool,

                    /// When marching the depth buffer, we only have 2.5D information, and don't know how
                    /// thick surfaces are. We shall assume that the depth buffer fragments are little squares
                    /// with a constant thickness defined by this parameter.
                    depth_thickness_linear_z: f32,

                    /// Size of the depth buffer we're marching in, in pixels.
                    depth_tex_size: vec2<f32>,
                }

                fn depth_ray_march_new_from_depth(depth_tex_size: vec2<f32>) -> DepthRayMarch {
                    var res: DepthRayMarch;
                    res.jitter = 1.0;
                    res.linear_steps = 4u;
                    res.bisection_steps = 0u;
                    res.linear_march_exponent = 1.0;
                    res.depth_tex_size = depth_tex_size;
                    res.depth_thickness_linear_z = 1.0;
                    res.march_behind_surfaces = false;
                    res.use_sloppy_march = false;
                    return res;
                }

                fn depth_ray_march_to_cs_dir_impl(
                    raymarch: ptr<function, DepthRayMarch>,
                    dir_cs: vec4<f32>,
                    infinite: bool,
                ) {
                    var end_cs = vec4((*raymarch).ray_start_cs, 1.0) + dir_cs;

                    // Perform perspective division, but avoid dividing by zero for rays
                    // heading directly towards the eye.
                    end_cs /= select(-1.0, 1.0, end_cs.w >= 0.0) * max(1e-10, abs(end_cs.w));

                    // Clip ray start to the view frustum
                    var delta_cs = end_cs.xyz - (*raymarch).ray_start_cs;
                    let near_edge = select(vec3(-1.0, -1.0, 0.0), vec3(1.0, 1.0, 1.0), delta_cs < vec3(0.0));
                    let dist_to_near_edge = (near_edge - (*raymarch).ray_start_cs) / delta_cs;
                    let max_dist_to_near_edge = max(dist_to_near_edge.x, dist_to_near_edge.y);
                    (*raymarch).ray_start_cs += delta_cs * max(0.0, max_dist_to_near_edge);

                    // Clip ray end to the view frustum

                    delta_cs = end_cs.xyz - (*raymarch).ray_start_cs;
                    let far_edge = select(vec3(-1.0, -1.0, 0.0), vec3(1.0, 1.0, 1.0), delta_cs >= vec3(0.0));
                    let dist_to_far_edge = (far_edge - (*raymarch).ray_start_cs) / delta_cs;
                    let min_dist_to_far_edge = min(
                        min(dist_to_far_edge.x, dist_to_far_edge.y),
                        dist_to_far_edge.z
                    );

                    if (infinite) {
                        delta_cs *= min_dist_to_far_edge;
                    } else {
                        // If unbounded, would make the ray reach the end of the frustum
                        delta_cs *= min(1.0, min_dist_to_far_edge);
                    }

                    (*raymarch).ray_end_cs = (*raymarch).ray_start_cs + delta_cs;
                }

                /// March from a clip-space position (w = 1)
                fn depth_ray_march_from_cs(raymarch: ptr<function, DepthRayMarch>, v: vec3<f32>) {
                    (*raymarch).ray_start_cs = v;
                }

                /// March to a clip-space position (w = 1)
                ///
                /// Must be called after "from_cs", as it will clip the world-space ray to the view frustum.
                fn depth_ray_march_to_cs(raymarch: ptr<function, DepthRayMarch>, end_cs: vec3<f32>) {
                    let dir = vec4(end_cs - (*raymarch).ray_start_cs, 0.0) * sign(end_cs.z);
                    depth_ray_march_to_cs_dir_impl(raymarch, dir, false);
                }

                /// March towards a clip-space direction. Infinite (ray is extended to cover the whole view frustum).
                ///
                /// Must be called after "from_cs", as it will clip the world-space ray to the view frustum.
                fn depth_ray_march_to_cs_dir(raymarch: ptr<function, DepthRayMarch>, dir: vec4<f32>) {
                    depth_ray_march_to_cs_dir_impl(raymarch, dir, true);
                }

                /// March to a world-space position.
                ///
                /// Must be called after "from_cs", as it will clip the world-space ray to the view frustum.
                fn depth_ray_march_to_ws(raymarch: ptr<function, DepthRayMarch>, end: vec3<f32>) {
                    depth_ray_march_to_cs(raymarch, position_world_to_ndc(end));
                }

                /// March towards a world-space direction. Infinite (ray is extended to cover the whole view frustum).
                ///
                /// Must be called after "from_cs", as it will clip the world-space ray to the view frustum.
                fn depth_ray_march_to_ws_dir(raymarch: ptr<function, DepthRayMarch>, dir: vec3<f32>) {
                    depth_ray_march_to_cs_dir_impl(raymarch, direction_world_to_clip(dir), true);
                }

                /// Perform the ray march.
                fn depth_ray_march_march(raymarch: ptr<function, DepthRayMarch>) -> DepthRayMarchResult {
                    var res = DepthRayMarchResult(false, 0.0, vec2(0.0), 0.0, 0.0);

                    let ray_start_uv = ndc_to_uv((*raymarch).ray_start_cs.xy);
                    let ray_end_uv = ndc_to_uv((*raymarch).ray_end_cs.xy);

                    let ray_uv_delta = ray_end_uv - ray_start_uv;
                    let ray_len_px = ray_uv_delta * (*raymarch).depth_tex_size;

                    let min_px_per_step = 1u;
                    let step_count = max(
                        2,
                        min(i32((*raymarch).linear_steps), i32(floor(length(ray_len_px) / f32(min_px_per_step))))
                    );

                    let linear_z_to_scaled_linear_z = 1.0 / perspective_camera_near();
                    let depth_thickness = (*raymarch).depth_thickness_linear_z * linear_z_to_scaled_linear_z;

                    var distance_fn: DepthRaymarchDistanceFn;
                    distance_fn.depth_tex_size = (*raymarch).depth_tex_size;
                    distance_fn.march_behind_surfaces = (*raymarch).march_behind_surfaces;
                    distance_fn.depth_thickness = depth_thickness;
                    distance_fn.use_sloppy_march = (*raymarch).use_sloppy_march;

                    var hit: DistanceWithPenetration;

                    var hit_t = 0.0;
                    var miss_t = 0.0;
                    var root_finder = hybrid_root_finder_new_with_linear_steps(u32(step_count));
                    root_finder.bisection_steps = (*raymarch).bisection_steps;
                    root_finder.use_secant = (*raymarch).use_secant;
                    root_finder.linear_march_exponent = (*raymarch).linear_march_exponent;
                    root_finder.jitter = (*raymarch).jitter;
                    let intersected = hybrid_root_finder_find_root(
                        &root_finder,
                        (*raymarch).ray_start_cs,
                        (*raymarch).ray_end_cs,
                        &distance_fn,
                        &hit_t,
                        &miss_t,
                        &hit
                    );

                    res.hit_t = hit_t;

                    if (intersected && hit.penetration < depth_thickness && hit.distance < depth_thickness) {
                        res.hit = true;
                        res.hit_uv = mix(ray_start_uv, ray_end_uv, res.hit_t);
                        res.hit_penetration = hit.penetration / linear_z_to_scaled_linear_z;
                        res.hit_penetration_frac = hit.penetration / depth_thickness;
                        return res;
                    }

                    res.hit_t = miss_t;
                    res.hit_uv = mix(ray_start_uv, ray_end_uv, res.hit_t);

                    return res;
                }

                fn reconstructWorldPosFromDepth(
                    coords: vec2<f32>,
                    size: vec2<f32>,
                    depthTexture: texture_depth_2d,
                    projInverse: mat4x4<f32>,
                    viewInverse: mat4x4<f32>
                    ) -> vec4<f32> {
                    let uv = coords.xy / size;
                    var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);
                    let x = uv.x * 2.0 - 1.0;
                    let y = (1.0 - uv.y) * 2.0 - 1.0;
                    let projectedPos = vec4(x, y, depth, 1.0);
                    var worldPosition = projInverse * projectedPos;
                    worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
                    worldPosition = viewInverse * worldPosition;
                    return worldPosition;
                }

                fn ScreenSpaceShadows(P_world: vec3<f32>, R_world: vec3<f32>, uv: vec2<f32>) -> vec4<f32> {
                    // let light_direction = vec3f(-0.17609018126512477, -0.4402254531628119, -0.8804509063256238);
                    let light_direction = view_bindings.light_position.xyz;

                    let depth_size = vec2<f32>(textureDimensions(depth_prepass_texture));
                    var raymarch = depth_ray_march_new_from_depth(depth_size);
                    depth_ray_march_from_cs(&raymarch, position_world_to_ndc(P_world));
                    depth_ray_march_to_ws(&raymarch, P_world + light_direction * 0.3);
                    raymarch.linear_steps = 16;
                    raymarch.depth_thickness_linear_z = 0.5;
                    raymarch.jitter = 1.0;  // Disable jitter for now.
                    raymarch.march_behind_surfaces = true;

                    var shadow = 1.0;
                    let raymarch_result = depth_ray_march_march(&raymarch);
                    if (raymarch_result.hit) {
                        let occl = smoothstep(1.0, 0.5, raymarch_result.hit_penetration_frac);
                        shadow = 1.0 - occl;
                    }

                    let color = textureSampleLevel(color_texture, depth_linear_sampler, uv, 0.0);

                    return color * shadow;
                }

                fn ScreenSpaceReflections(R_world: vec3<f32>, P_world: vec3<f32>) -> vec4<f32> {
                    let depth_size = vec2<f32>(textureDimensions(depth_prepass_texture));

                    var raymarch = depth_ray_march_new_from_depth(depth_size);
                    depth_ray_march_from_cs(&raymarch, position_world_to_ndc(P_world));
                    depth_ray_march_to_ws_dir(&raymarch, normalize(R_world));
                    raymarch.linear_steps = 16;
                    raymarch.bisection_steps = 4;
                    raymarch.use_secant = true;
                    raymarch.depth_thickness_linear_z = 0.25;
                    raymarch.jitter = 1.0;  // Disable jitter for now.
                    raymarch.march_behind_surfaces = false;

                    let raymarch_result = depth_ray_march_march(&raymarch);
                    if (raymarch_result.hit) {
                        return vec4(textureSampleLevel(color_texture, depth_linear_sampler, raymarch_result.hit_uv, 0.0).rgb, 0.0);
                    }
                    return vec4f(0.0, 0.0, 0.0, 1.0);
                }


                /// Convert a ndc space position to world space
                fn position_ndc_to_world(ndc_pos: vec3<f32>) -> vec3<f32> {
                    let world_pos = view_bindings.world_from_clip * vec4(ndc_pos, 1.0);
                    return world_pos.xyz / world_pos.w;
                }
                    
                /// Convert uv [0.0 .. 1.0] coordinate to ndc space xy [-1.0 .. 1.0]
                fn uv_to_ndc(uv: vec2<f32>) -> vec2<f32> {
                    return uv * vec2(2.0, -2.0) + vec2(-1.0, 1.0);
                }

                /// returns the (0.0, 0.0) .. (1.0, 1.0) position within the viewport for the current render target
                /// [0 .. render target viewport size] eg. [(0.0, 0.0) .. (1280.0, 720.0)] to [(0.0, 0.0) .. (1.0, 1.0)]
                fn frag_coord_to_uv(frag_coord: vec2<f32>) -> vec2<f32> {
                    return (frag_coord - view_bindings.projectionOutputSize.xy) / view_bindings.projectionOutputSize.zw;
                }

                /// Convert frag coord to ndc
                fn frag_coord_to_ndc(frag_coord: vec4<f32>) -> vec3<f32> {
                    return vec3(uv_to_ndc(frag_coord_to_uv(frag_coord.xy)), frag_coord.z);
                }

                @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    // // Reconstruct world pos (consider a variant that takes 'depth' to avoid re-read inside)
                    let world_position = reconstructWorldPosFromDepth(
                        input.position.xy,
                        view_bindings.projectionOutputSize.zw,
                        depth_prepass_texture,
                        view_bindings.projectionInverseMatrix,
                        view_bindings.viewInverseMatrix
                    ).xyz;

                    // var frag_coord = input.position;
                    // frag_coord.z = textureLoad(depth_prepass_texture, vec2<i32>(frag_coord.xy), 0);
                    // let world_position2 = vec4(position_ndc_to_world(frag_coord_to_ndc(frag_coord)), 1.0);
                    // return vec4(world_position.xyz, 1.0);

                    let normalEncoded = textureSample(normal_texture, depth_linear_sampler, input.uv);
                    let N = normalize(OctDecode(normalEncoded.rg));
                    let V = normalize(view_bindings.viewPosition.xyz - world_position.xyz);

                    // Calculate the reflection vector.
                    let R = reflect(-V, N);

                    
                    
                    // let ssr_specular = ScreenSpaceReflections(R, world_position);
                    // return ssr_specular;

                    let R_world = R;
                    let P_world = world_position.xyz;
                    let sss_result = ScreenSpaceShadows(P_world, R_world, input.uv);
                    return sss_result;
                }
            `,
            colorOutputs: [{format: "rgba16float"}],
            uniforms: {
                view_bindings: {group: 0, binding: 0, type: "storage"},
                depth_linear_sampler: {group: 0, binding: 1, type: "sampler"},
                depth_nearest_sampler: {group: 0, binding: 2, type: "sampler-non-filterable"},
                depth_prepass_texture: {group: 0, binding: 3, type: "depthTexture"},
                normal_texture: {group: 0, binding: 4, type: "texture"},
                color_texture: {group: 0, binding: 5, type: "texture"},
            }
        });

        this.geometry = new Geometry();
        this.shader.SetSampler("depth_linear_sampler", GPU.TextureSampler.Create({minFilter: "linear", magFilter: "linear"}));
        this.shader.SetSampler("depth_nearest_sampler", GPU.TextureSampler.Create({minFilter: "nearest", magFilter: "nearest", mipmapFilter: "nearest", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge"}));

        this.initialized = true;
    }

    public async preFrame(resources: GPU.ResourcePool) {
        const gDepthTex = resources.getResource(GPU.PassParams.GBufferDepth);
        if (!gDepthTex) return;
    }

    public async execute(resources: GPU.ResourcePool) {
        if (!this.initialized) return;

        const gDepthTex = resources.getResource(GPU.PassParams.GBufferDepth);
        const gNormalTex = resources.getResource(GPU.PassParams.GBufferNormal);
        const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
        if (!gDepthTex || !gNormalTex) return;

        const camera = Components.Camera.mainCamera;
        const lights = camera.gameObject.scene.GetComponents(Components.DirectionalLight);

        this.shader.SetArray("view_bindings", new Float32Array([
            ...camera.projectionMatrix.clone().elements,
            ...camera.projectionMatrix.clone().mul(camera.viewMatrix).elements,
            ...camera.projectionMatrix.clone().mul(camera.viewMatrix).invert().elements,
            
            
            // Light
            ...lights[0].transform.position.elements, 0,

            0, 0, GPU.Renderer.width, GPU.Renderer.height,
            ...camera.transform.position.elements, camera.near,
            ...camera.projectionMatrix.clone().invert().elements,
            ...camera.viewMatrix.clone().invert().elements,
            ...camera.viewMatrix.elements

        ]));

        this.shader.SetTexture("depth_prepass_texture", gDepthTex);
        this.shader.SetTexture("normal_texture", gNormalTex);
        this.shader.SetTexture("color_texture", LightingPassOutput);

        GPU.RendererContext.BeginRenderPass(this.name, [{target: this.output, clear: true}], undefined, true);
        GPU.RendererContext.Draw(this.geometry, this.shader, 3);
        GPU.RendererContext.EndRenderPass();

        GPU.RendererContext.CopyTextureToTextureV3({texture: this.output}, {texture: LightingPassOutput});
    }
}