#include "@trident/plugins/Sky/resources/Common.wgsl";
#include "@trident/plugins/Sky/resources/Vertex.wgsl";

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