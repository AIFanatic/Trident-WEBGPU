import { GPU, Mathf, Geometry, Components } from '@trident/core';

function buildSSSDispatchList(lightProj, viewport, minBounds, maxBounds, expandedZ = false, waveSize = 64) {
  const [vpW, vpH] = viewport;
  const [minX, minY] = minBounds;
  const [maxX, maxY] = maxBounds;
  const result = {
    lightCoordShader: new Float32Array(4),
    dispatches: []
  };
  let xy_w = lightProj[3];
  const FP_limit = 2e-6 * waveSize;
  if (xy_w >= 0 && xy_w < FP_limit) xy_w = FP_limit;
  if (xy_w < 0 && xy_w > -FP_limit) xy_w = -FP_limit;
  const lightX = (lightProj[0] / xy_w * 0.5 + 0.5) * vpW;
  const lightY = (lightProj[1] / xy_w * -0.5 + 0.5) * vpH;
  let lightZ = lightProj[3] === 0 ? 0 : lightProj[2] / lightProj[3];
  const dirSign = lightProj[3] > 0 ? 1 : -1;
  if (expandedZ) {
    lightZ = lightZ * 0.5 + 0.5;
  }
  result.lightCoordShader[0] = lightX;
  result.lightCoordShader[1] = lightY;
  result.lightCoordShader[2] = lightZ;
  result.lightCoordShader[3] = dirSign;
  const lightXYi = [Math.floor(lightX + 0.5), Math.floor(lightY + 0.5)];
  const biased = [
    minX - lightXYi[0],
    // left
    -(maxY - lightXYi[1]),
    // bottom (note Y flip)
    maxX - lightXYi[0],
    // right
    -(minY - lightXYi[1])
    // top
  ];
  for (let q = 0; q < 4; q++) {
    const vertical = q === 0 || q === 3;
    const b0 = Math.max(0, q & 1 ? biased[0] : -biased[2]) / waveSize;
    const b1 = Math.max(0, q & 2 ? biased[1] : -biased[3]) / waveSize;
    const b2 = Math.max(0, (q & 1 ? biased[2] : -biased[0]) + waveSize * (vertical ? 1 : 2) - 1) / waveSize;
    const b3 = Math.max(0, (q & 2 ? biased[3] : -biased[1]) + waveSize * (vertical ? 2 : 1) - 1) / waveSize;
    const bx0 = Math.floor(b0);
    const by0 = Math.floor(b1);
    const bx1 = Math.floor(b2);
    const by1 = Math.floor(b3);
    if (bx1 - bx0 > 0 && by1 - by0 > 0) {
      const biasX = q === 2 || q === 3 ? 1 : 0;
      const biasY = q === 1 || q === 3 ? 1 : 0;
      const disp = {
        waveCountX: waveSize,
        // waves along X dimension (same as Bend)
        waveCountY: bx1 - bx0,
        waveCountZ: by1 - by0,
        waveOffsetX: (q & 1 ? bx0 : -bx1) + biasX,
        waveOffsetY: (q & 2 ? -by1 : by0) + biasY
      };
      let axis_delta = +biased[0] - biased[1];
      if (q === 1) axis_delta = +biased[2] + biased[1];
      if (q === 2) axis_delta = -biased[0] - biased[3];
      if (q === 3) axis_delta = -biased[2] + biased[3];
      axis_delta = Math.floor((axis_delta + waveSize - 1) / waveSize);
      const pushIfValid = (d) => {
        if (d.waveCountY > 0 && d.waveCountZ > 0) result.dispatches.push(d);
      };
      if (axis_delta > 0) {
        const disp2 = { ...disp };
        if (q === 0) {
          disp2.waveCountZ = Math.min(disp.waveCountZ, axis_delta);
          disp.waveCountZ -= disp2.waveCountZ;
          disp2.waveOffsetY = disp.waveOffsetY + disp.waveCountZ;
          disp2.waveOffsetX--;
          disp2.waveCountY++;
        }
        if (q === 1) {
          disp2.waveCountY = Math.min(disp.waveCountY, axis_delta);
          disp.waveCountY -= disp2.waveCountY;
          disp2.waveOffsetX = disp.waveOffsetX + disp.waveCountY;
          disp2.waveCountZ++;
        }
        if (q === 2) {
          disp2.waveCountY = Math.min(disp.waveCountY, axis_delta);
          disp.waveCountY -= disp2.waveCountY;
          disp.waveOffsetX += disp2.waveCountY;
          disp2.waveCountZ++;
          disp2.waveOffsetY--;
        }
        if (q === 3) {
          disp2.waveCountZ = Math.min(disp.waveCountZ, axis_delta);
          disp.waveCountZ -= disp2.waveCountZ;
          disp.waveOffsetY += disp2.waveCountZ;
          disp2.waveCountY++;
        }
        pushIfValid(disp2);
        pushIfValid(disp);
      } else {
        pushIfValid(disp);
      }
    }
  }
  for (const d of result.dispatches) {
    d.waveOffsetX *= waveSize;
    d.waveOffsetY *= waveSize;
  }
  return result;
}
class SSSRenderPass extends GPU.RenderPass {
  name = "SSSRenderPass";
  output;
  light;
  compute;
  blendShader;
  blendGeometry;
  blendOutput;
  /* Settings */
  Enabled = true;
  BlendShadowStrength = 0.5;
  // Visual configuration
  SurfaceThickness = 5e-3;
  BilinearThreshold = 0.02;
  ShadowContrast = 4;
  IgnoreEdgePixels = false;
  UsePrecisionOffset = false;
  BilinearSamplingOffsetMode = false;
  DebugOutputEdgeMask = false;
  DebugOutputThreadIndex = false;
  DebugOutputWaveIndex = false;
  // Culling / Early out
  DepthBounds = new Mathf.Vector2(0, 1);
  UseEarlyOut = false;
  // Renderer-specific
  FarDepthValue = 1;
  NearDepthValue = 0;
  SettingsArray = new ArrayBuffer(112);
  Settings = {
    SurfaceThickness: new Float32Array(this.SettingsArray, 0, 1),
    BilinearThreshold: new Float32Array(this.SettingsArray, 4, 1),
    ShadowContrast: new Float32Array(this.SettingsArray, 8, 1),
    IgnoreEdgePixels: new Uint32Array(this.SettingsArray, 12, 1),
    UsePrecisionOffset: new Uint32Array(this.SettingsArray, 16, 1),
    BilinearSamplingOffsetMode: new Uint32Array(this.SettingsArray, 20, 1),
    DebugOutputEdgeMask: new Uint32Array(this.SettingsArray, 24, 1),
    DebugOutputThreadIndex: new Uint32Array(this.SettingsArray, 28, 1),
    DebugOutputWaveIndex: new Uint32Array(this.SettingsArray, 32, 1),
    DepthBounds: new Float32Array(this.SettingsArray, 40, 2),
    UseEarlyOut: new Uint32Array(this.SettingsArray, 48, 1),
    _pad0: new Uint32Array(this.SettingsArray, 52, 1),
    LightCoordinate: new Float32Array(this.SettingsArray, 64, 4),
    FarDepthValue: new Float32Array(this.SettingsArray, 80, 1),
    NearDepthValue: new Float32Array(this.SettingsArray, 84, 1),
    InvDepthTextureSize: new Float32Array(this.SettingsArray, 88, 2)
  };
  constructor(light) {
    super();
    this.light = light;
  }
  async init(resources) {
    this.compute = await GPU.Compute.Create({
      code: `
            //------------------------------------------------------------------------------
            // Bend Studio - Screen Space Shadow Projection (WGSL / WebGPU)
            // Ported from HLSL DX12 compute version
            // Notes:
            //  - Subgroup/wave intrinsics are not used; we keep barriers uniform.
            //  - Early-out is per-thread (no workgroup-wide return) to satisfy WGSL rules.
            //  - WebGPU lacks clamp-to-border; we emulate it by returning FarDepthValue
            //    when UVs are out of [0,1].
            //  - Both depth samples use uv + (minor-axis) offset; texel-offset sampling
            //    is not available in WGSL.
            //------------------------------------------------------------------------------

            //------------------------------------------------------------------------------
            // Pipeline-time constants (override at pipeline creation if desired)
            //------------------------------------------------------------------------------
            override WAVE_SIZE            : u32 = 64u; // must match @workgroup_size.x
            override SAMPLE_COUNT         : u32 = 60u;
            override HARD_SHADOW_SAMPLES  : u32 = 4u;
            override FADE_OUT_SAMPLES     : u32 = 8u;

            // Derived constant: number of bilinear reads per thread
            // const READ_COUNT : u32 = SAMPLE_COUNT / WAVE_SIZE + 2u;
            const READ_COUNT : u32 = 60u / 64u + 2u;

            // Tune if you see grid artifacts
            const USE_HALF_PIXEL_OFFSET : bool = false;

            //------------------------------------------------------------------------------
            // Uniform parameters (fields separated by commas per WGSL syntax)
            //------------------------------------------------------------------------------
            struct Params {
                // Visual configuration
                // These values will require manual tuning.
                // All shadow computation is performed in non-linear depth space (not in world space), so tuned value choices will depend on scene depth distribution (as determined by the Projection Matrix setup).

                SurfaceThickness           : f32,  // This is the assumed thickness of each pixel for shadow-casting, measured as a percentage of the difference in non-linear depth between the sample and FarDepthValue.
                                                   // Recommended starting value: 0.005 (0.5%)

                BilinearThreshold          : f32,  // Percentage threshold for determining if the difference between two depth values represents an edge, and should not perform interpolation.
                                                   // To tune this value, set 'DebugOutputEdgeMask' to true to visualize where edges are being detected.
                                                   // Recommended starting value: 0.02 (2%)

                ShadowContrast             : f32,  // A contrast boost is applied to the transition in/out of shadow.
										           // Recommended starting value: 2 or 4. Values >= 1 are valid.

                IgnoreEdgePixels           : u32,  // If an edge is detected, the edge pixel will not contribute to the shadow.
                                                   // If a very flat surface is being lit and rendered at an grazing angles, the edge detect may incorrectly detect multiple 'edge' pixels along that flat surface.
                                                   // In these cases, the grazing angle of the light may subsequently produce aliasing artefacts in the shadow where these incorrect edges were detected.
                                                   // Setting this value to true would mean that those pixels would not cast a shadow, however it can also thin out otherwise valid shadows, especially on foliage edges.
                                                   // Recommended starting value: false, unless typical scenes have numerous large flat surfaces, in which case true.

                UsePrecisionOffset         : u32,  // A small offset is applied to account for an imprecise depth buffer (recommend off)

                BilinearSamplingOffsetMode : u32,  // There are two modes to compute bilinear samples for shadow depth:
                                                   // true = sampling points for pixels are offset to the wavefront shared ray, shadow depths and starting depths are the same. Can project more jagged/aliased shadow lines in some cases.
                                                   // false = sampling points for pixels are not offset and start from pixel centers. Shadow depths are biased based on depth gradient across the current pixel bilinear sample. Has more issues in back-face / grazing areas.
                                                   // Both modes have subtle visual differences, which may / may not exaggerate depth buffer aliasing that gets projected in to the shadow.
                                                   // Evaluating the visual difference between each mode is recommended, then hard-coding the mode used to optimize the shader.
                                                   // Recommended starting value: false

	            // Debug views
                DebugOutputEdgeMask        : u32,  // Use this to visualize edges, for tuning the 'BilinearThreshold' value.
                DebugOutputThreadIndex     : u32,  // Debug output to visualize layout of compute threads
                DebugOutputWaveIndex       : u32,  // Debug output to visualize layout of compute wavefronts, useful to sanity check the Light Coordinate is being computed correctly.

                // Culling / Early out
                DepthBounds                : vec2<f32>, // Depth Bounds (min, max) for the on-screen volume of the light. Typically (0,1) for directional lights. Only used when 'UseEarlyOut' is true.

                UseEarlyOut                : u32,  // Set to true to early-out when depth values are not within [DepthBounds] - otherwise DepthBounds is unused
                                                   // [Optionally customize the 'EarlyOutPixel()' function to perform your own early-out logic, e.g. skipping pixels that a shadow map indicates are already fully occluded]
                                                   // This can dramatically reduce cost when only a small portion of the pixels need a shadow term (e.g., cull out sky pixels), however it does have some overhead (~15%) in worst-case where nothing early-outs
                                                   // Note; Early-out is most efficient when WAVE_SIZE matches the hardware wavefront size - otherwise cross wave communication is required.
                                                   
                _pad0                      : u32,

                // Runtime data (from BuildDispatchList)
                LightCoordinate            : vec4<f32>, // xy=light pos (pixels), z=light depth, w=dir sign (+/-)

                // Renderer-specific
                FarDepthValue              : f32,
                NearDepthValue             : f32,

                // Sampling data
                InvDepthTextureSize        : vec2<f32>,  // 1.0 / depth tex size
            };

            @group(0) @binding(0) var<uniform> g_params : Params;
            
            // Depth texture (non-linear)
            @group(0) @binding(1) var g_depthTex : texture_depth_2d;
            @group(0) @binding(2) var g_pointSampler : sampler;

            
            // Output texture (single-channel shadow)
            @group(0) @binding(3) var g_outShadow : texture_storage_2d<r32float, write>;
            
            @group(0) @binding(4) var<uniform> WaveOffset : vec2<i32>;

            //------------------------------------------------------------------------------
            // Workgroup shared data
            //------------------------------------------------------------------------------
            var<workgroup> gDepthData : array<f32, READ_COUNT * WAVE_SIZE>;

            //------------------------------------------------------------------------------
            // Helpers
            //------------------------------------------------------------------------------
            fn saturate(x: f32) -> f32 {
                return clamp(x, 0.0, 1.0);
            }

            fn saturate4(x: vec4<f32>) -> vec4<f32> {
                return clamp(x, vec4<f32>(0.0), vec4<f32>(1.0));
            }

            fn frac(x: f32) -> f32 {
                return x - floor(x);
            }

            // Emulate clamp-to-border (border = FarDepthValue)
            fn sampleDepthWithBorder(read_xy: vec2<f32>) -> f32 {
                var uv = read_xy * g_params.InvDepthTextureSize;
                let inBounds = all(uv >= vec2<f32>(0.0)) && all(uv <= vec2<f32>(1.0));
                if (!inBounds) {
                    return g_params.FarDepthValue;
                }
                // return textureSampleLevel(g_depthTex, g_pointSampler, uv, 0.0).r;
                return textureLoad(g_depthTex, vec2i(read_xy), 0);
            }

            struct ExtentsOut {
                deltaXY        : vec2<f32>,
                pixelXY        : vec2<f32>,
                pixelDistance  : f32,
                majorAxisX     : bool,
            };

            fn computeWavefrontExtents(groupID: vec3<u32>, localX: u32) -> ExtentsOut {
                // int2 xy = inGroupID.yz * WAVE_SIZE + WaveOffset
                var xy_i = vec2<i32>(
                    i32(groupID.y) * i32(WAVE_SIZE) + WaveOffset.x,
                    i32(groupID.z) * i32(WAVE_SIZE) + WaveOffset.y
                );

                var light_xy = floor(g_params.LightCoordinate.xy) + vec2<f32>(0.5);
                var light_xy_fraction = g_params.LightCoordinate.xy - light_xy;
                let reverse_direction = g_params.LightCoordinate.w > 0.0;

                // sign(xy)
                let sign_xy = vec2<i32>(select(-1, 1, xy_i.x >= 0), select(-1, 1, xy_i.y >= 0));
                let horizontal = abs(f32(xy_i.x + sign_xy.y)) < abs(f32(xy_i.y - sign_xy.x));

                var axis = vec2<i32>(0, 0);
                axis.x = select(0, sign_xy.y, horizontal);
                axis.y = select(-sign_xy.x, 0, horizontal);

                // Apply wave offset on X dimension (groupID.x)
                xy_i = axis * i32(groupID.x) + xy_i;
                let xy_f = vec2<f32>(xy_i);

                let x_axis_major = abs(xy_f.x) > abs(xy_f.y);
                let major_axis   = select(xy_f.y, xy_f.x, x_axis_major);

                let major_axis_start = abs(major_axis);
                let major_axis_end   = abs(major_axis) - f32(WAVE_SIZE);

                var ma_light_frac = select(light_xy_fraction.y, light_xy_fraction.x, x_axis_major);
                ma_light_frac = select(ma_light_frac, -ma_light_frac, major_axis > 0.0);

                let start_xy = xy_f + light_xy;

                // Ensure inner ring interpolation to pixel centers
                let end_xy = mix(
                    g_params.LightCoordinate.xy,
                    start_xy,
                    (major_axis_end + ma_light_frac) / (major_axis_start + ma_light_frac)
                );

                let xy_delta = (start_xy - end_xy);

                // Reverse read order if needed
                let thread_step = f32((localX) ^ (select(WAVE_SIZE - 1u, 0u, reverse_direction)));

                let pixel_xy = mix(start_xy, end_xy, thread_step / f32(WAVE_SIZE));
                let pixel_distance = major_axis_start - thread_step + ma_light_frac;

                return ExtentsOut(xy_delta, pixel_xy, pixel_distance, x_axis_major);
            }

            fn earlyOutPixel(depth: f32) -> bool {
                return depth >= g_params.DepthBounds.y || depth <= g_params.DepthBounds.x;
            }

            //------------------------------------------------------------------------------
            // Main compute
            //------------------------------------------------------------------------------
            @compute @workgroup_size(WAVE_SIZE, 1, 1)
            fn cs_main(@builtin(workgroup_id) workgroup_id : vec3<u32>, @builtin(local_invocation_id) local_id : vec3<u32>) {
                let localX = local_id.x;

                // Geometry for this invocation
                let ext = computeWavefrontExtents(workgroup_id, localX);

                // Per-thread buffers
                var sampling_depth        : array<f32, READ_COUNT>;
                var shadowing_depth       : array<f32, READ_COUNT>;
                var depth_thickness_scale : array<f32, READ_COUNT>;
                var sample_distance       : array<f32, READ_COUNT>;

                let direction = -g_params.LightCoordinate.w;
                let z_sign    = select(1.0, -1.0, g_params.NearDepthValue > g_params.FarDepthValue);

                var pixel_xy = ext.pixelXY;
                var is_edge  = false;
                var skip_pixel = false;
                let write_xy = floor(pixel_xy);

                // Read depth samples (two per step, pick bilinear/point)
                for (var i: u32 = 0u; i < READ_COUNT; i = i + 1u) {
                    var read_xy = floor(pixel_xy);
                    let minor_axis = select(pixel_xy.y, pixel_xy.x, ext.majorAxisX);

                    let bilinear = frac(minor_axis) - 0.5;

                    if (USE_HALF_PIXEL_OFFSET) {
                        read_xy = read_xy + vec2<f32>(0.5);
                    }

                    // offset on the minor axis only
                    let bias = select(-1.0, 1.0, bilinear > 0.0);
                    let offset_xy = vec2<f32>(
                        select(bias, 0.0, ext.majorAxisX), // if major is X, offset Y; else offset X
                        select(0.0, bias, ext.majorAxisX)
                    );

                    let d0 = sampleDepthWithBorder(read_xy);
                    let d1 = sampleDepthWithBorder(read_xy + offset_xy);

                    depth_thickness_scale[i] = abs(g_params.FarDepthValue - d0);

                    // point vs bilinear pick
                    let use_point_filter = abs(d0 - d1) > depth_thickness_scale[i] * g_params.BilinearThreshold;

                    if (i == 0u) {
                        is_edge = use_point_filter;
                    }

                    if (g_params.BilinearSamplingOffsetMode != 0u) {
                        let lerp_amt = select(0.0, abs(bilinear), use_point_filter);
                        let s = mix(d0, d1, lerp_amt);
                        sampling_depth[i]  = s;
                        shadowing_depth[i] = select(s, 1e20, (g_params.IgnoreEdgePixels != 0u) && use_point_filter);
                    } else {
                        sampling_depth[i] = d0;
                        let edge_depth = select(d0, 1e20, (g_params.IgnoreEdgePixels != 0u));
                        let shadow_depth = d0 + abs(d0 - d1) * z_sign;
                        shadowing_depth[i] = select(shadow_depth, edge_depth, use_point_filter);
                    }

                    sample_distance[i] = ext.pixelDistance + f32(WAVE_SIZE) * f32(i) * direction;

                    // Advance by WAVE_SIZE pixels along the ray
                    pixel_xy = pixel_xy + ext.deltaXY * direction;
                }

                // Per-thread early-out flag (no non-uniform barrier/return yet)
                let earlyOutEnabled =
                    (g_params.UseEarlyOut != 0u) &&
                    (g_params.DebugOutputEdgeMask == 0u) &&
                    (g_params.DebugOutputThreadIndex == 0u) &&
                    (g_params.DebugOutputWaveIndex == 0u);

                skip_pixel = earlyOutEnabled && earlyOutPixel(sampling_depth[0u]);

                // Store projected shadow depths to shared memory
                for (var i: u32 = 0u; i < READ_COUNT; i = i + 1u) {
                    var stored_depth = (shadowing_depth[i] - g_params.LightCoordinate.z) / sample_distance[i];

                    if (i != 0u) {
                        // ignore overshoot near light
                        stored_depth = select(1e10, stored_depth, sample_distance[i] > 0.0);
                    }

                    let idx = i * WAVE_SIZE + localX;
                    gDepthData[idx] = stored_depth;
                }

                // This barrier is in uniform control flow
                workgroupBarrier();

                // After the uniform barrier, it is safe to return per-thread
                if (skip_pixel) {
                    return; // mirrors HLSL early-out (caller should pre-clear output as desired)
                }

                // Start with this pixel's depth
                var start_depth = sampling_depth[0u];

                if (g_params.UsePrecisionOffset != 0u) {
                    start_depth = mix(start_depth, g_params.FarDepthValue, -1.0 / 65535.0);
                }

                start_depth = (start_depth - g_params.LightCoordinate.z) / sample_distance[0u];

                // Index into shared list (skip first entry)
                let sample_index = localX + 1u;

                var shadow_value = vec4<f32>(1.0);
                var hard_shadow  = 1.0;

                // Depth scaling (see original comments)
                let depth_scale =
                    min(sample_distance[0u] + direction, 1.0 / g_params.SurfaceThickness) *
                    sample_distance[0u] / depth_thickness_scale[0u];

                start_depth = start_depth * depth_scale - z_sign;

                // Hard shadow region
                for (var i: u32 = 0u; i < HARD_SHADOW_SAMPLES; i = i + 1u) {
                    let d = abs(start_depth - gDepthData[sample_index + i] * depth_scale);
                    hard_shadow = min(hard_shadow, d);
                }

                // Averaged region (4 lanes)
                for (var i: u32 = HARD_SHADOW_SAMPLES; i < SAMPLE_COUNT - FADE_OUT_SAMPLES; i = i + 1u) {
                    let lane = i & 3u;
                    let d = abs(start_depth - gDepthData[sample_index + i] * depth_scale);
                    shadow_value[lane] = min(shadow_value[lane], d);
                }

                // Fade-out tail
                for (var i: u32 = SAMPLE_COUNT - FADE_OUT_SAMPLES; i < SAMPLE_COUNT; i = i + 1u) {
                    let lane = i & 3u;
                    let fade_out = f32(i + 1u - (SAMPLE_COUNT - FADE_OUT_SAMPLES)) / f32(FADE_OUT_SAMPLES + 1u) * 0.75;
                    let d = abs(start_depth - gDepthData[sample_index + i] * depth_scale);
                    shadow_value[lane] = min(shadow_value[lane], d + fade_out);
                }

                // Contrast curve
                shadow_value = saturate4(shadow_value * g_params.ShadowContrast + (1.0 - g_params.ShadowContrast));
                hard_shadow  = saturate(hard_shadow  * g_params.ShadowContrast + (1.0 - g_params.ShadowContrast));

                // Combine
                var result = dot(shadow_value, vec4<f32>(0.25));
                result = min(hard_shadow, result);

                // Debug modes
                if (g_params.DebugOutputEdgeMask != 0u) {
                    result = select(0.0, 1.0, is_edge);
                }
                if (g_params.DebugOutputThreadIndex != 0u) {
                    result = f32(localX) / f32(WAVE_SIZE);
                }
                if (g_params.DebugOutputWaveIndex != 0u) {
                    result = fract(f32(workgroup_id.x) / f32(WAVE_SIZE));
                }

                // Write result
                let write_xy_i = vec2<i32>(i32(write_xy.x), i32(write_xy.y));
                textureStore(g_outShadow, write_xy_i, vec4<f32>(result, 0.0, 0.0, 0.0));
            }

            `,
      uniforms: {
        g_params: { group: 0, binding: 0, type: "uniform" },
        g_depthTex: { group: 0, binding: 1, type: "depthTexture" },
        g_pointSampler: { group: 0, binding: 2, type: "sampler" },
        g_outShadow: { group: 0, binding: 3, type: "texture" },
        WaveOffset: { group: 0, binding: 4, type: "uniform" }
      }
    });
    this.blendShader = await GPU.Shader.Create({
      code: `
            @group(0) @binding(0) var SSSOutput: texture_storage_2d<r32float, read_write>;
            @group(0) @binding(1) var LightingPassOutput: texture_2d<f32>;
            @group(0) @binding(2) var textureSampler: sampler;
            @group(0) @binding(3) var<storage, read> BlendShadowStrength: f32;

            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
            };

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4(input.position, 1.0);
                output.uv = input.uv;
                return output;
            }

            @fragment    
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let dims  = vec2<i32>(textureDimensions(SSSOutput));
                let coord = vec2<i32>(clamp(input.uv * vec2<f32>(dims), vec2<f32>(0.0), vec2<f32>(dims - 1)));
                let shadowValue = textureLoad(SSSOutput, coord).r;
                
                var color = textureSample(LightingPassOutput, textureSampler, input.uv);
                color = vec4f(color.rgb * mix(1.0, shadowValue, BlendShadowStrength), color.a);

                return color;
            }
            `,
      colorOutputs: [{ format: "rgba16float" }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        SSSOutput: { group: 0, binding: 0, type: "storage-write" },
        LightingPassOutput: { group: 0, binding: 1, type: "texture" },
        textureSampler: { group: 0, binding: 2, type: "sampler" },
        BlendShadowStrength: { group: 0, binding: 3, type: "storage" }
      }
    });
    this.blendGeometry = Geometry.Plane();
    this.blendOutput = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.blendShader.SetSampler("textureSampler", GPU.TextureSampler.Create());
    this.output = GPU.RenderTextureStorage2D.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "r32float");
    this.output.name = "SSS";
    this.compute.SetTexture("g_outShadow", this.output);
    this.compute.SetSampler("g_pointSampler", GPU.TextureSampler.Create());
    this.WaveOffsetBuffer = GPU.DynamicBuffer.Create(10 * 256, GPU.BufferType.UNIFORM, 256);
    this.settingsBuffer = GPU.Buffer.Create(this.SettingsArray.byteLength, GPU.BufferType.UNIFORM);
    this.initialized = true;
  }
  WaveOffsetBuffer;
  _sssDispatchList;
  settingsBuffer;
  async preFrame(resources) {
    const gDepthTex = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!gDepthTex) return;
    this.compute.SetTexture("g_depthTex", gDepthTex);
    const camera = Components.Camera.mainCamera;
    if (!camera) return;
    const lightPos = this.light.transform.position;
    const clip = new Mathf.Vector4(lightPos.x, lightPos.y, lightPos.z, 0).applyMatrix4(camera.projectionScreenMatrix);
    this._sssDispatchList = buildSSSDispatchList(
      [clip.x, clip.y, clip.z, clip.w],
      [gDepthTex.width, gDepthTex.height],
      [0, 0],
      // min render bounds
      [gDepthTex.width - 1, gDepthTex.height - 1],
      // max render bounds
      /* expandedZ = */
      false,
      // WebGPU/D3D-style depth
      /* waveSize  = */
      64
    );
    for (let i = 0; i < this._sssDispatchList.dispatches.length; i++) {
      const d = this._sssDispatchList.dispatches[i];
      this.WaveOffsetBuffer.SetArray(new Int32Array([d.waveOffsetX, d.waveOffsetY]), i * 256);
    }
    this.Settings.SurfaceThickness.set([this.SurfaceThickness]);
    this.Settings.BilinearThreshold.set([this.BilinearThreshold]);
    this.Settings.ShadowContrast.set([this.ShadowContrast]);
    this.Settings.IgnoreEdgePixels.set([+this.IgnoreEdgePixels]);
    this.Settings.UsePrecisionOffset.set([+this.UsePrecisionOffset]);
    this.Settings.BilinearSamplingOffsetMode.set([+this.BilinearSamplingOffsetMode]);
    this.Settings.DebugOutputEdgeMask.set([+this.DebugOutputEdgeMask]);
    this.Settings.DebugOutputThreadIndex.set([+this.DebugOutputThreadIndex]);
    this.Settings.DebugOutputWaveIndex.set([+this.DebugOutputWaveIndex]);
    this.Settings.DepthBounds.set(this.DepthBounds.elements);
    this.Settings.UseEarlyOut.set([+this.UseEarlyOut]);
    this.Settings.LightCoordinate.set(this._sssDispatchList.lightCoordShader);
    this.Settings.FarDepthValue.set([this.FarDepthValue]);
    this.Settings.NearDepthValue.set([this.NearDepthValue]);
    this.Settings.InvDepthTextureSize.set([1 / gDepthTex.width, 1 / gDepthTex.height]);
    this.settingsBuffer.SetArray(this.SettingsArray);
    this.compute.SetBuffer("g_params", this.settingsBuffer);
    this.compute.SetBuffer("WaveOffset", this.WaveOffsetBuffer);
    const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    if (!LightingPassOutput) return;
    this.blendShader.SetTexture("SSSOutput", this.output);
    this.blendShader.SetTexture("LightingPassOutput", LightingPassOutput);
    this.blendShader.SetValue("BlendShadowStrength", this.BlendShadowStrength);
  }
  async execute(resources) {
    if (!this.initialized) return;
    const gDepthTex = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!gDepthTex) return;
    GPU.RendererContext.BeginRenderPass(this.name + " - clear", [{ target: this.output, clear: true }]);
    GPU.RendererContext.EndRenderPass();
    if (!this.Enabled) return;
    if (!this._sssDispatchList) return;
    GPU.ComputeContext.BeginComputePass(this.name, true);
    for (let i = 0; i < this._sssDispatchList.dispatches.length; i++) {
      const d = this._sssDispatchList.dispatches[i];
      this.WaveOffsetBuffer.dynamicOffset = i * 256;
      GPU.ComputeContext.Dispatch(this.compute, d.waveCountX, d.waveCountY, d.waveCountZ);
    }
    GPU.ComputeContext.EndComputePass();
    const LightingPassOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    GPU.RendererContext.BeginRenderPass(this.name + " - blend", [{ target: this.blendOutput, clear: true }]);
    GPU.RendererContext.DrawGeometry(this.blendGeometry, this.blendShader);
    GPU.RendererContext.EndRenderPass();
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.blendOutput }, { texture: LightingPassOutput });
  }
}

export { SSSRenderPass, buildSSSDispatchList };
