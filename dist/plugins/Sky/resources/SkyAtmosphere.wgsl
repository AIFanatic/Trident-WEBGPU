#include "@trident/plugins/Sky/resources/Common.wgsl";
#include "@trident/plugins/Sky/resources/Vertex.wgsl";

@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var TransmittanceLUTTexture: texture_2d<f32>;

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

        let transmittance_to_sun = transmittance_from_lut(TransmittanceLUTTexture, sample_cos_theta, normalized_altitude);

        let ms = get_multiple_scattering(TransmittanceLUTTexture, sample_cos_theta, normalized_altitude, distance_to_earth_center);

        let S = sun_spectral_irradiance * (molecular_scattering * (molecular_phase * transmittance_to_sun + ms) + aerosol_scattering   * (aerosol_phase   * transmittance_to_sun + ms));

        let step_transmittance = exp(-dt * extinction);

        // Energy-conserving analytical integration
        // "Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite"
        // by Sébastien Hillaire
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