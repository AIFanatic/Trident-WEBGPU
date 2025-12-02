@group(0) @binding(1) var hdrTexture: texture_2d<f32>;
@group(0) @binding(2) var hdrSampler: sampler;

@group(0) @binding(3) var<storage, read> face: vec4<f32>;

struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

@vertex
fn vertexMain(@location(0) position: vec3f) -> VSOut {
    var o: VSOut;
    o.pos = vec4f(position.xy, 0.0, 1.0);
    o.uv  = position.xy; // [-1,1]
    return o;
}

fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
    let u = x;
    let v = y;
    switch face {
        case 0u { return normalize(vec3( 1.0,  v, -u)); } // +X
        case 1u { return normalize(vec3(-1.0,  v,  u)); } // -X
        case 2u { return normalize(vec3( u,  1.0, -v)); } // +Y
        case 3u { return normalize(vec3( u, -1.0,  v)); } // -Y
        case 4u { return normalize(vec3( u,  v,  1.0)); } // +Z
        default { return normalize(vec3(-u,  v, -1.0)); } // -Z
    }
}


const PI = 3.14159265358979323846;
const INV_PI = 0.31830988618379067154;
fn sampleSkyViewLUT(v: vec3f) -> vec2f {
    let azimuth = atan2(v.z, v.x) * 0.5 * INV_PI + 0.5;
    let elev    = asin(v.y);
    let signElev = select(-1.0, 1.0, elev >= 0.0);
    let t = sqrt(abs(elev) / (0.5 * PI));
    let lutV = 0.5 * (signElev * t + 1.0);
    return vec2(azimuth, lutV);
}

// @fragment
// fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
//     let pix   = vec2<i32>(floor(input.position.xy));

//     let depth = textureLoad(depthTexture, pix, 0);
    
//     if (depth <= 0.9999999) {
//         discard;
//     }

//     let uv = input.position.xy / view.projectionOutputSize.xy;
//     let fragCoord = uv * view.projectionOutputSize.xy;
//     let camera = compute_camera_angles(fragCoord, view.projectionOutputSize.xy);


//     let azimuth = camera.phi / PI * 0.5 + 0.5;
//     // Undo the non-linear transformation from the sky-view LUT
//     let elev = sqrt(abs(camera.theta) / (PI * 0.5)) * sign(camera.theta) * 0.5 + 0.5;

//     let col = textureSample(skyboxTexture, textureSampler, vec2(azimuth, elev)).rgb;
//     return vec4f(col, 1.0);
// }

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
    let dir = dirFromFaceUV(u32(face.x), uv.x, uv.y);
    let st  = sampleSkyViewLUT(dir);
    let col = textureSample(hdrTexture, hdrSampler, st).rgb;
    return vec4f(col, 1.0);
}