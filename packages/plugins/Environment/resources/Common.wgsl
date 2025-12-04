// From: https://www.shadertoy.com/view/msXXDS

// Configurable parameters

// #define ANIMATE_SUN 1
// // 0=equirectangular, 1=fisheye, 2=projection
// #define CAMERA_TYPE 2
// // 0=Background, 1=Desert Dust, 2=Maritime Clean, 3=Maritime Mineral,
// // 4=Polar Antarctic, 5=Polar Artic, 6=Remote Continental, 7=Rural, 8=Urban
// #define AEROSOL_TYPE 8

struct Params {
    SUN_ELEVATION_DEGREES: f32,
    SUN_AZIMUTH_DEGREES: f32,
    EYE_ALTITUDE: f32,
    AEROSOL_TURBIDITY: f32,
    // EARTH_RADIUS: f32,
    // ATMOSPHERE_THICKNESS: f32,
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
// const aerosol_absorption_cross_section = vec4(2.8722e-24, 4.6168e-24, 7.9706e-24, 1.3578e-23);
// const aerosol_scattering_cross_section = vec4(1.5908e-22, 1.7711e-22, 2.0942e-22, 2.4033e-22);
// const aerosol_base_density = 1.3681e20;
// const aerosol_background_density = 2e6;
// const aerosol_height_scale = 0.73;

const aerosol_absorption_cross_section = vec4(6.3312e-19, 7.5567e-19, 9.2627e-19, 1.0391e-18);
const aerosol_scattering_cross_section = vec4(4.6539e-26, 2.721e-26, 4.1104e-26, 5.6249e-26);
const aerosol_base_density = 2.0266e17;
const aerosol_background_density = 2e6;
const aerosol_height_scale = 0.9;

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

// Extraterrestial Solar Irradiance Spectra, units W * m^-2 * nm^-1
// https://www.nrel.gov/grid/solar-resource/spectra.html
const sun_spectral_irradiance = vec4(1.679, 1.828, 1.986, 1.307);
// Rayleigh scattering coefficient at sea level, units km^-1
// "Rayleigh-scattering calculations for the terrestrial atmosphere"
// by Anthony Bucholtz (1995).
const molecular_scattering_coefficient_base = vec4(6.605e-3, 1.067e-2, 1.842e-2, 3.156e-2);
// Ozone absorption cross section, units m^2 / molecules
// "High spectral resolution ozone absorption cross-sections"
// by V. Gorshelev et al. (2014).
const ozone_absorption_cross_section = vec4(3.472e-21, 3.914e-21, 1.349e-21, 11.03e-23) * 1e-4f;

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