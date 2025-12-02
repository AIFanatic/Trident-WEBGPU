import { GPU, Mathf, Geometry, Components } from '@trident/core';

class Sky extends GPU.RenderPass {
  name = "Sky";
  output0;
  output1;
  geometry;
  shader0;
  shader1;
  sunDirection = new Mathf.Vector3(0, 0.11, -1);
  rayleigh = 3;
  turbidity = 4;
  mieCoefficient = 5e-3;
  mieDirectionalG = 0.7;
  SUN_ELEVATION_DEGREES = 0;
  EYE_ALTITUDE = 0.5;
  constructor() {
    super();
  }
  async init() {
    const common = `
            // Configurable parameters

            // #define ANIMATE_SUN 1
            // // 0=equirectangular, 1=fisheye, 2=projection
            // #define CAMERA_TYPE 2
            // // 0=Background, 1=Desert Dust, 2=Maritime Clean, 3=Maritime Mineral,
            // // 4=Polar Antarctic, 5=Polar Artic, 6=Remote Continental, 7=Rural, 8=Urban
            // #define AEROSOL_TYPE 8

            struct Params {
                SUN_ELEVATION_DEGREES: f32,
                EYE_ALTITUDE: f32,
                pad0: f32,
                pad1: f32,
            };
            @group(0) @binding(0) var<storage, read> params: Params;

            // const SUN_ELEVATION_DEGREES = 0.0;    // 0=horizon, 90=zenith
            // const EYE_ALTITUDE          = 0.5;    // km
            const MONTH                 = 0;      // 0-11, January to December
            const AEROSOL_TURBIDITY     = 1.0;
            const GROUND_ALBEDO         = vec4(0.3);
            // Ray marching steps. More steps mean better accuracy but worse performance
            const TRANSMITTANCE_STEPS     = 32;
            const IN_SCATTERING_STEPS     = 32;

            // // Debug
            // #define ENABLE_SPECTRAL 1
            // #define ENABLE_MULTIPLE_SCATTERING 1
            // #define ENABLE_AEROSOLS 1
            // #define SHOW_RELATIVE_LUMINANCE 0
            // #define TONEMAPPING_TECHNIQUE 0 // 0=ACES, 1=simple

            // -----------------------------------------------------------------------------
            // Constants

            // All parameters that depend on wavelength (vec4) are sampled at
            // 630, 560, 490, 430 nanometers

            const PI = 3.14159265358979323846;
            const INV_PI = 0.31830988618379067154;
            const INV_4PI = 0.25 * INV_PI;
            const PHASE_ISOTROPIC = INV_4PI;
            const RAYLEIGH_PHASE_SCALE = (3.0 / 16.0) * INV_PI;
            const g = 0.8;
            const gg = g*g;

            const EARTH_RADIUS = 6371.0; // km
            const ATMOSPHERE_THICKNESS = 100.0; // km
            const ATMOSPHERE_RADIUS = EARTH_RADIUS + ATMOSPHERE_THICKNESS;
            // const EYE_DISTANCE_TO_EARTH_CENTER = EARTH_RADIUS + params.EYE_ALTITUDE;
            // const SUN_ZENITH_COS_ANGLE = cos(radians(90.0 - params.SUN_ELEVATION_DEGREES));
            // const SUN_DIR = vec3(-sqrt(1.0 - SUN_ZENITH_COS_ANGLE*SUN_ZENITH_COS_ANGLE), 0.0, SUN_ZENITH_COS_ANGLE);

            // #elif AEROSOL_TYPE == 8 // Urban
            const aerosol_absorption_cross_section = vec4(2.8722e-24, 4.6168e-24, 7.9706e-24, 1.3578e-23);
            const aerosol_scattering_cross_section = vec4(1.5908e-22, 1.7711e-22, 2.0942e-22, 2.4033e-22);
            const aerosol_base_density = 1.3681e20;
            const aerosol_background_density = 2e6;
            const aerosol_height_scale = 0.73;

            const aerosol_background_divided_by_base_density = aerosol_background_density / aerosol_base_density;

            const ozone_mean_monthly_dobson = array<f32, 12>(
                347.0, // January
                370.0, // February
                381.0, // March
                384.0, // April
                372.0, // May
                352.0, // June
                333.0, // July
                317.0, // August
                298.0, // September
                285.0, // October
                290.0, // November
                315.0  // December
            );

            const ozone_absorption_cross_section = vec4(3.472e-21, 3.914e-21, 1.349e-21, 11.03e-23) * 1e-4f;
            const molecular_scattering_coefficient_base = vec4(6.605e-3, 1.067e-2, 1.842e-2, 3.156e-2);

            /*
            * Return the molecular volume scattering coefficient (km^-1) for a given altitude
            * in kilometers.
            */
            fn get_molecular_scattering_coefficient(h: f32) -> vec4f {
                return molecular_scattering_coefficient_base * exp(-0.07771971 * pow(h, 1.16364243));
            }
                
            /*
            * Return the molecular volume absorption coefficient (km^-1) for a given altitude
            * in kilometers.
            */
            fn get_molecular_absorption_coefficient(_h: f32) -> vec4f
            {
                let h = _h + 1e-4; // Avoid division by 0
                let t = log(h) - 3.22261;
                let density = 3.78547397e20 * (1.0 / h) * exp(-t * t * 5.55555555);
                return ozone_absorption_cross_section * ozone_mean_monthly_dobson[MONTH] * density;
            }

            /*
            * Returns the distance between ro and the first intersection with the sphere
            * or -1.0 if there is no intersection. The sphere's origin is (0,0,0).
            * -1.0 is also returned if the ray is pointing away from the sphere.
            */
            fn ray_sphere_intersection(ro: vec3f, rd: vec3f, radius: f32) -> f32 {
                let b = dot(ro, rd);
                let c = dot(ro, ro) - radius*radius;
                if (c > 0.0 && b > 0.0) { return -1.0; }
                let d = b*b - c;
                if (d < 0.0) { return -1.0; }
                if (d > b*b) { return (-b+sqrt(d)); }
                return (-b-sqrt(d));
            }

            fn get_aerosol_density(h: f32) -> f32 {
            // #if AEROSOL_TYPE == 0 // Only for the Background aerosol type, no dependency on height
            //     return aerosol_base_density * (1.0 + aerosol_background_divided_by_base_density);
            // #else
                return aerosol_base_density * (exp(-h / aerosol_height_scale) + aerosol_background_divided_by_base_density);
            // #endif
            }

            struct CollisionCoefficients {
                aerosol_absorption: vec4f,
                aerosol_scattering: vec4f,
                molecular_absorption: vec4f,
                molecular_scattering: vec4f,
                extinction: vec4f
            };
            /*
            * Get the collision coefficients (scattering and absorption) of the
            * atmospheric medium for a given point at an altitude h.
            */
            fn get_atmosphere_collision_coefficients(_h: f32) -> CollisionCoefficients {
                var out: CollisionCoefficients;

                let h = max(_h, 0.0); // In case height is negative
            // #if ENABLE_AEROSOLS == 0
            //     // out.aerosol_absorption = vec4(0.0);
            //     // out.aerosol_scattering = vec4(0.0);
            // #else
                let aerosol_density = get_aerosol_density(h);
                out.aerosol_absorption = aerosol_absorption_cross_section * aerosol_density * AEROSOL_TURBIDITY;
                out.aerosol_scattering = aerosol_scattering_cross_section * aerosol_density * AEROSOL_TURBIDITY;
            // #endif
                out.molecular_absorption = get_molecular_absorption_coefficient(h);
                out.molecular_scattering = get_molecular_scattering_coefficient(h);
                out.extinction = out.aerosol_absorption + out.aerosol_scattering + out.molecular_absorption + out.molecular_scattering;
                
                return out;
            }
        `;
    this.shader0 = await GPU.Shader.Create({
      code: `
            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv: vec2<f32>,
            };

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4(input.position, 1.0f);
                output.uv = input.uv;
                // output.uv.y = 1.0 - output.uv.y;
                return output;
            }

            ${common}

            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {

                let uv = input.uv;

                let sun_cos_theta = uv.x * 2.0 - 1.0;
                let sun_dir = vec3(-sqrt(1.0 - sun_cos_theta*sun_cos_theta), 0.0, sun_cos_theta);

                let distance_to_earth_center = mix(EARTH_RADIUS, ATMOSPHERE_RADIUS, uv.y);
                let ray_origin = vec3(0.0, 0.0, distance_to_earth_center);

                let t_d = ray_sphere_intersection(ray_origin, sun_dir, ATMOSPHERE_RADIUS);
                let dt = t_d / f32(TRANSMITTANCE_STEPS);

                var result: vec4f = vec4(0.0);

                for (var i: i32 = 0; i < TRANSMITTANCE_STEPS; i++) {
                    let t = (f32(i) + 0.5) * dt;
                    let x_t = ray_origin + sun_dir * t;

                    let altitude = length(x_t) - EARTH_RADIUS;

                    let out = get_atmosphere_collision_coefficients(altitude);
                    let aerosol_absorption = out.aerosol_absorption;
                    let aerosol_scattering = out.aerosol_scattering;
                    let molecular_absorption = out.molecular_absorption;
                    let molecular_scattering = out.molecular_scattering;
                    let extinction = out.extinction;

                    result += extinction * dt;
                }

                let transmittance = exp(-result);
                return transmittance;
            }
            `,
      colorOutputs: [
        { format: "rgba16float" }
      ],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        params: { group: 0, binding: 0, type: "storage" }
      }
    });
    this.shader1 = await GPU.Shader.Create({
      code: `
            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv: vec2<f32>,
            };

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4(input.position, 1.0f);
                output.uv = input.uv;
                // output.uv.y = 1.0 - output.uv.y;
                return output;
            }

            ${common}

            @group(0) @binding(1) var textureSampler: sampler;
            @group(0) @binding(2) var iChannel0: texture_2d<f32>;

            // Extraterrestial Solar Irradiance Spectra, units W * m^-2 * nm^-1
            // https://www.nrel.gov/grid/solar-resource/spectra.html
            const sun_spectral_irradiance = vec4(1.679, 1.828, 1.986, 1.307);

            const M = mat4x3<f32>(
                137.672389239975, -8.632904716299537, -1.7181567391931372,
                32.549094028629234, 91.29801417199785, -12.005406444382531,
                -38.91428392614275, 34.31665471469816, 29.89044807197628,
                8.572844237945445, -11.103384660054624, 117.47585277566478
            );

            fn linear_srgb_from_spectral_samples(L: vec4f) -> vec3f {
                return M * L;
            }

            fn get_multiple_scattering(transmittance_lut: texture_2d<f32>, cos_theta: f32, normalized_height: f32, d: f32) -> vec4f {
            // #if ENABLE_MULTIPLE_SCATTERING == 1
                // Solid angle subtended by the planet from a point at d distance
                // from the planet center.
                let omega = 2.0 * PI * (1.0 - sqrt(d*d - EARTH_RADIUS*EARTH_RADIUS) / d);

                let T_to_ground = transmittance_from_lut(transmittance_lut, cos_theta, 0.0);

                let T_ground_to_sample = transmittance_from_lut(transmittance_lut, 1.0, 0.0) / transmittance_from_lut(transmittance_lut, 1.0, normalized_height);

                // 2nd order scattering from the ground
                let L_ground = PHASE_ISOTROPIC * omega * (GROUND_ALBEDO / PI) * T_to_ground * T_ground_to_sample * cos_theta;

                // Fit of Earth's multiple scattering coming from other points in the atmosphere
                let L_ms = 0.02 * vec4(0.217, 0.347, 0.594, 1.0) * (1.0 / (1.0 + 5.0 * exp(-17.92 * cos_theta)));

                return L_ms + L_ground;
            // #else
            //     return vec4(0.0);
            // #endif
            }

            /*
            * Helper function to obtain the transmittance to the top of the atmosphere
            * from Buffer A.
            */
            fn transmittance_from_lut(lut: texture_2d<f32>, cos_theta: f32, normalized_altitude: f32) -> vec4f {
                let u = clamp(cos_theta * 0.5 + 0.5, 0.0, 1.0);
                let v = clamp(normalized_altitude, 0.0, 1.0);
                return textureSampleLevel(lut, textureSampler, vec2(u, v), 0.0);
            }

            /*
            * Rayleigh phase function.
            */
            fn molecular_phase_function(cos_theta: f32) -> f32
            {
                return RAYLEIGH_PHASE_SCALE * (1.0 + cos_theta*cos_theta);
            }

            /*
            * Henyey-Greenstrein phase function.
            */
            fn aerosol_phase_function(cos_theta: f32) -> f32
            {
                let den = 1.0 + gg + 2.0 * g * cos_theta;
                return INV_4PI * (1.0 - gg) / (den * sqrt(den));
            }
                
            fn get_sun_direction() -> vec3f {
                let SUN_ZENITH_COS_ANGLE = cos(radians(90.0 - params.SUN_ELEVATION_DEGREES));
                let SUN_DIR = vec3(-sqrt(1.0 - SUN_ZENITH_COS_ANGLE*SUN_ZENITH_COS_ANGLE), 0.0, SUN_ZENITH_COS_ANGLE);
                return SUN_DIR;
            }

            struct ComputeInscattering {
                transmittance: vec4f,
                L_inscattering: vec4f
            };

            fn compute_inscattering(ray_origin: vec3f, ray_dir: vec3f, t_d: f32) -> ComputeInscattering {
                var out: ComputeInscattering;

                let sun_dir = get_sun_direction();
                let cos_theta = dot(-ray_dir, sun_dir);

                let molecular_phase = molecular_phase_function(cos_theta);
                let aerosol_phase = aerosol_phase_function(cos_theta);

                let dt = t_d / f32(IN_SCATTERING_STEPS);

                var L_inscattering = vec4(0.0);
                var transmittance = vec4(1.0);

                for (var i: i32 = 0; i < IN_SCATTERING_STEPS; i++) {
                    let t = (f32(i) + 0.5) * dt;
                    let x_t = ray_origin + ray_dir * t;

                    let distance_to_earth_center = length(x_t);
                    let zenith_dir = x_t / distance_to_earth_center;
                    let altitude = distance_to_earth_center - EARTH_RADIUS;
                    let normalized_altitude = altitude / ATMOSPHERE_THICKNESS;

                    let sample_cos_theta = dot(zenith_dir, sun_dir);

                    let collisionCoefficients = get_atmosphere_collision_coefficients(altitude);

                    let aerosol_absorption = collisionCoefficients.aerosol_absorption;
                    let aerosol_scattering = collisionCoefficients.aerosol_scattering;
                    let molecular_absorption = collisionCoefficients.molecular_absorption;
                    let molecular_scattering = collisionCoefficients.molecular_scattering;
                    let extinction = collisionCoefficients.extinction;

                    let transmittance_to_sun = transmittance_from_lut(iChannel0, sample_cos_theta, normalized_altitude);

                    let ms = get_multiple_scattering(iChannel0, sample_cos_theta, normalized_altitude, distance_to_earth_center);

                    let S = sun_spectral_irradiance * (molecular_scattering * (molecular_phase * transmittance_to_sun + ms) + aerosol_scattering   * (aerosol_phase   * transmittance_to_sun + ms));

                    let step_transmittance = exp(-dt * extinction);

                    // Energy-conserving analytical integration
                    // "Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite"
                    // by S\xE9bastien Hillaire
                    let S_int = (S - S * step_transmittance) / max(extinction, vec4f(1e-7));
                    L_inscattering += transmittance * S_int;
                    transmittance *= step_transmittance;
                }

                out.L_inscattering = L_inscattering;
                return out;
            }
                
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let uv = input.uv;

                let azimuth = 2.0 * PI * uv.x;

                // Apply a non-linear transformation to the elevation to dedicate more
                // texels to the horizon, where having more detail matters.
                let l = uv.y * 2.0 - 1.0;
                let elev = l*l * sign(l) * PI * 0.5; // [-pi/2, pi/2]

                let ray_dir = vec3(cos(elev) * cos(azimuth), cos(elev) * sin(azimuth), sin(elev));

                let EYE_DISTANCE_TO_EARTH_CENTER = EARTH_RADIUS + params.EYE_ALTITUDE;
                var ray_origin = vec3(0.0, 0.0, EYE_DISTANCE_TO_EARTH_CENTER);

                let atmos_dist  = ray_sphere_intersection(ray_origin, ray_dir, ATMOSPHERE_RADIUS);
                let ground_dist = ray_sphere_intersection(ray_origin, ray_dir, EARTH_RADIUS);
                var t_d: f32;
                if (params.EYE_ALTITUDE < ATMOSPHERE_THICKNESS) {
                    // We are inside the atmosphere
                    if (ground_dist < 0.0) {
                        // No ground collision, use the distance to the outer atmosphere
                        t_d = atmos_dist;
                    } else {
                        // We have a collision with the ground, use the distance to it
                        t_d = ground_dist;
                    }
                } else {
                    // We are in outer space
                    if (atmos_dist < 0.0) {
                        // No collision with the atmosphere, just return black
                        return vec4(0.0, 0.0, 0.0, 1.0);
                    } else {
                        // Move the ray origin to the atmosphere intersection
                        ray_origin = ray_origin + ray_dir * (atmos_dist + 1e-3);
                        if (ground_dist < 0.0) {
                            // No collision with the ground, so the ray is exiting through
                            // the atmosphere.
                            let second_atmos_dist = ray_sphere_intersection(ray_origin, ray_dir, ATMOSPHERE_RADIUS);
                            t_d = second_atmos_dist;
                        } else {
                            t_d = ground_dist - atmos_dist;
                        }
                    }
                }

                let inscattering = compute_inscattering(ray_origin, ray_dir, t_d);
                let L = inscattering.L_inscattering;
                let transmittance = inscattering.transmittance;

            // #if ENABLE_SPECTRAL == 1
                return vec4(linear_srgb_from_spectral_samples(L), 1.0);
            // #else
            //     fragColor = vec4(L.rgb, 1.0);
            // #endif
            }
            `,
      colorOutputs: [
        { format: "rgba16float" }
      ],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        params: { group: 0, binding: 0, type: "storage" },
        textureSampler: { group: 0, binding: 1, type: "sampler" },
        iChannel0: { group: 0, binding: 2, type: "texture" }
      }
    });
    this.geometry = Geometry.Plane();
    this.output0 = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.output1 = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    this.shader1.SetSampler("textureSampler", GPU.TextureSampler.Create());
    this.initialized = true;
  }
  async preFrame() {
    Components.Camera.mainCamera;
    const params = new Float32Array([
      this.SUN_ELEVATION_DEGREES,
      // SUN_ELEVATION_DEGREES
      this.EYE_ALTITUDE,
      // EYE_ALTITUDE
      0,
      0
    ]);
    this.shader0.SetArray("params", params);
    this.shader1.SetArray("params", params);
  }
  async execute() {
    if (!this.initialized) return;
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.output0, clear: true }]);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader0);
    GPU.RendererContext.EndRenderPass();
    this.shader1.SetTexture("iChannel0", this.output0);
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.output1, clear: true }]);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader1);
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
  }
}

export { Sky };
