struct VertexInput {
    @location(0) position : vec2<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};


struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vUv : vec2<f32>,
};

@group(0) @binding(0) var lightingTexture: texture_2d<f32>;
@group(0) @binding(1) var albedoTexture: texture_2d<f32>;
@group(0) @binding(2) var normalTexture: texture_2d<f32>;
@group(0) @binding(3) var depthTexture: texture_depth_2d;
@group(0) @binding(4) var lightingSampler: sampler;
@group(0) @binding(5) var lastFrameTexture: texture_2d<f32>;

struct View {
    projectionOutputSize: vec4<f32>,
    viewPosition: vec4<f32>,
    projectionMatrix: mat4x4<f32>,
    projectionInverseMatrix: mat4x4<f32>,
    viewMatrix: mat4x4<f32>,
    viewInverseMatrix: mat4x4<f32>,
};
@group(0) @binding(6) var<storage, read> view: View;

@group(0) @binding(7) var<storage, read> hasLastFrame: f32;
@group(0) @binding(8) var<storage, read> frame: f32;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4(input.position, 0.0, 1.0);
    output.vUv = input.uv;
    return output;
}

fn GetPerpendicularVector(v: vec3f) -> vec3f {
    let epsilon = 0.00000001; // For float equality checks

    // if (v == Vector3.zero) {
    //     return Vector3.zero;
    // }
    if (abs(v.x) < epsilon) {
        return vec3f(1, 0, 0);
    }
    else if (abs(v.y) < epsilon) {
        return vec3f(0, 1, 0);
    }
    else if (abs(v.z) < epsilon) {
        return vec3f(0, 0, 1);
    }
    else {
        return vec3f(1, 1, -(v.x + v.y) / v.z);
    }
}

// Get a cosine-weighted random vector centered around a specified normal direction.
fn GetCosHemisphereSample(rand1 : f32, rand2 : f32, hitNorm : vec3<f32>) -> vec3<f32> {
    // Get 2 random numbers to select our sample with
    let randVal = vec2<f32>(rand1, rand2);

    // Cosine weighted hemisphere sample from RNG
    let bitangent = GetPerpendicularVector(hitNorm);
    let tangent = cross(bitangent, hitNorm);
    let r = sqrt(randVal.x);
    let phi = 2.0 * 3.14159265 * randVal.y;

    // Get our cosine-weighted hemisphere lobe sample direction
    return tangent * (r * cos(phi)) + bitangent * (r * sin(phi)) + hitNorm * sqrt(max(0.0, 1.0 - randVal.x));
}

fn GetNormal(uv: vec2f) -> vec3f {
    return textureSample(normalTexture, lightingSampler, uv).rgb;
}
const frameCount = 1;

fn IGN(x: f32, y: f32, t: u32) -> f32 {
    let frame = t;
    
    //frame += WellonsHash2(WeylHash(uvec2(uv)/4u)) % 4u;
    
    var uv = vec2f(x, y);
    if((frame & 2u) != 0u) {
        uv = vec2(-uv.y, uv.x);
    }
    if((frame & 1u) != 0u) {
        uv.x = -uv.x;
    }

    //return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))) + float(frame)*0.41421356);
    //return fract(52.9829189 * fract(dot(uv, vec2(0.06711056, 0.00583715))));
    //return fract(IGN(uv)+float(frame)*0.41421356*1.0);
    
    // http://extremelearning.com.au/unreasonable-effectiveness-of-quasirandom-sequences/#dither
    return fract(uv.x*0.7548776662 + uv.y*0.56984029 + f32(frame)*0.41421356*1.0);
}


fn reconstructWorldPosFromZ(coords: vec2<f32>) -> vec4<f32> {
    let uv = coords.xy / vec2f(textureDimensions(depthTexture).xy);
    var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);
        let x = uv.x * 2.0 - 1.0;
        let y = (1.0 - uv.y) * 2.0 - 1.0;
        let projectedPos = vec4(x, y, depth, 1.0);
        var worldPosition = view.projectionInverseMatrix * projectedPos;
        worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
        worldPosition = view.viewInverseMatrix * worldPosition;
    return worldPosition;
}

fn hash(b: vec3f) -> vec3f {
    var a = b;
    a = fract(a * vec3(.8) );
    a += dot(a, a.yxz + 19.19);
    return fract((a.xxy + a.yxx)*a.zyx);
}

struct BinarySearchOutput {
    dir: vec3f,
    hitCoord: vec3f,
    output: vec3f,
    depth: f32
};

fn ProjectedCoordThingy(iprojectedCoord: vec4f) -> vec4f {
    var projectedCoord = iprojectedCoord;
    projectedCoord.x /= projectedCoord.w;
    projectedCoord.y /= projectedCoord.w;
    projectedCoord.x = projectedCoord.x * 0.5 + 0.5;
    projectedCoord.y = projectedCoord.y * 0.5 + 0.5;
    return projectedCoord;
}

fn BinarySearch(idir: vec3f, ihitCoord: vec3f) -> BinarySearchOutput {
    var output: BinarySearchOutput;
    output.dir = idir;
    output.hitCoord = ihitCoord;
    let SEARCH_STEPS = 7;

    var projectedCoord = vec4f(0.0);
    let Q = SEARCH_STEPS;
    var depth = 0.0;

    for(var i = 0; i < Q; i++){
        projectedCoord = view.projectionMatrix * vec4(output.hitCoord, 1.0);
        projectedCoord = ProjectedCoordThingy(projectedCoord);

        depth = getViewPos(projectedCoord.xy).z;
        
        output.depth = output.hitCoord.z - depth;
        if(output.depth > 0.0) {
            output.hitCoord += output.dir;
        }
        else {
            output.hitCoord -= output.dir;
        }
    }

    projectedCoord = view.projectionMatrix * vec4(output.hitCoord, 1.0);
    projectedCoord = ProjectedCoordThingy(projectedCoord);

    output.output = vec3(projectedCoord.xy, depth);
    return output;
}

struct Ray {
    hitCoord: vec3f,
    dir: vec3f,
    coords: vec4f
};

fn RayMarch(maxSteps: i32, idir: vec3f, ihitCoord: vec3f, stepSize: f32) -> Ray {
    var ray: Ray;
    var depth = 0.0;
    var steps = 0;
    var projectedCoord: vec4f = vec4f(0.0);

    ray.hitCoord = ihitCoord;
    ray.dir = idir * stepSize;

    var raymarcherDepth = 0.0;

    for(var i = 0; i < maxSteps; i++)   {
        ray.hitCoord += ray.dir;
        projectedCoord = view.projectionMatrix * vec4(ray.hitCoord, 1.0);
        projectedCoord = ProjectedCoordThingy(projectedCoord);

        // depth = getViewPosition(projectedCoord.xy, quadUV).z;
        depth = getViewPos(projectedCoord.xy).z;
        if(depth > 1000.0) {
            continue;
        }

        raymarcherDepth = ray.hitCoord.z - depth;
        if((ray.dir.z - raymarcherDepth) < 1.2) {
            if(raymarcherDepth <= 0.0) {
                let ResultBinSearch = BinarySearch(ray.dir, ray.hitCoord);

                ray.coords = vec4(ResultBinSearch.output, 1.0);
                ray.hitCoord = ResultBinSearch.hitCoord;
                ray.dir = ResultBinSearch.dir;
                raymarcherDepth = ResultBinSearch.depth;
                return ray;
            }
        }
        steps++;
    }

    ray.coords = vec4(projectedCoord.xy, depth, 0.0);
    return ray;
}

fn getViewPos(coord: vec2f) -> vec3f {
	let depth = textureSampleLevel(depthTexture, lightingSampler, coord, 0);
	
	//Turn the current pixel from ndc to world coordinates
	let pixel_pos_ndc = vec3(coord*2.0-1.0, depth*2.0-1.0); 
    let pixel_pos_clip = view.projectionInverseMatrix * vec4(pixel_pos_ndc,1.0);
    let pixel_pos_cam = pixel_pos_clip.xyz / pixel_pos_clip.w;
	return pixel_pos_cam;
}

fn getViewNormal(coord: vec2f) -> vec3f {
    let texSize = textureDimensions(depthTexture, 0);

    let pW = 1.0/f32(texSize.x);
    let pH = 1.0/f32(texSize.y);
    
    let p1 = getViewPos(coord+vec2(pW,0.0)).xyz;
    let p2 = getViewPos(coord+vec2(0.0,pH)).xyz;
    let p3 = getViewPos(coord+vec2(-pW,0.0)).xyz;
    let p4 = getViewPos(coord+vec2(0.0,-pH)).xyz;

    let vP = getViewPos(coord);
    
    var dx = vP-p1;
    var dy = p2-vP;
    let dx2 = p3-vP;
    let dy2 = vP-p4;
    
    // if(length(dx2) < length(dx) && coord.x - pW >= 0.0 || coord.x + pW > 1.0) {
    //     dx = dx2;
    // }
    // if(length(dy2) < length(dy) && coord.y - pH >= 0.0 || coord.y + pH > 1.0) {
    //     dy = dy2;
    // }
    if(length(dx2) < length(dx) && (coord.x - pW >= 0.0 || coord.x + pW > 1.0)) {
        dx = dx2;
    }
    if(length(dy2) < length(dy) && (coord.y - pH >= 0.0 || coord.y + pH > 1.0)) {
        dy = dy2;
    }
    
    return normalize(-cross( dx , dy ).xyz);
}

fn getLogDepth(uv: vec2f) -> f32 {
    return textureSampleLevel(depthTexture, lightingSampler, uv, 0);
}

fn viewSpacePositionFromDepth(logarithimicDepth: f32, texCoords: vec2f) -> vec3f {
    let z = logarithimicDepth * 2.0 - 1.0;

    let clipSpacePosition = vec4(texCoords * 2.0 - 1.0, z, 1.0);
    var viewSpacePosition = view.projectionInverseMatrix * clipSpacePosition;
    viewSpacePosition /= viewSpacePosition.w;

    return viewSpacePosition.rgb;
}

fn normalFromDepth(logarithimicDepth: f32, texCoords: vec2f) -> vec3f {
    let bufferResolution = vec2f(textureDimensions(depthTexture, 0));
    let texelSize = 1. / bufferResolution;
    let texCoords1 = texCoords + vec2(0., 1.) * texelSize;
    let texCoords2 = texCoords + vec2(1., 0.) * texelSize;

    let depth1 = getLogDepth(texCoords1);
    let depth2 = getLogDepth(texCoords2);

    let P0 = viewSpacePositionFromDepth(logarithimicDepth, texCoords);
    let P1 = viewSpacePositionFromDepth(depth1, texCoords1);
    let P2 = viewSpacePositionFromDepth(depth2, texCoords2);

    return normalize(cross(P2 - P0, P1 - P0));
}

fn getViewPosition(coords: vec2f, quadUV: vec2f) -> vec3f {
    let depth = getLogDepth(coords);
    return viewSpacePositionFromDepth(depth, quadUV);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.vUv;
    let pixelDepth = getLogDepth(uv);
    if (pixelDepth == 0.) {
        discard;
    }


    let worldNormal = GetNormal(uv);



    let screenResolution = vec2f(960, 609);
    let pos = uv * screenResolution;
    let normalLength : f32 = length(worldNormal);

    let noise : f32 = IGN(pos.x, pos.y, frameCount); // Animated Interleaved Gradient Noise
    var stochasticNormal = GetCosHemisphereSample(noise, noise, worldNormal);
    stochasticNormal = normalize(stochasticNormal);



    let viewPos = getViewPos(uv).xyz;
    let viewDir = stochasticNormal;
    let dir = normalize(vec4(viewDir, 1.0) * view.viewMatrix).xyz;

    let stepSize = 1.0;
    let maxSteps = 10;
    let intensity = 1.0;
    var jitt = vec3(hash(viewPos));
    let step = stepSize * (clamp(jitt.x, 0., 1.) + clamp(jitt.y, 0., 1.)) + stepSize;

    let ray = RayMarch(maxSteps, dir, viewPos, step);

    var tracedAlbedo = textureSample(albedoTexture, lightingSampler, ray.coords.xy); // previousFrame

    let CLAMP_MIN = 0.1;
    let CLAMP_MAX = 0.9;
    let dCoords = smoothstep(vec2(CLAMP_MIN), vec2(CLAMP_MAX), abs(vec2(0.5) - ray.coords.xy));
    let screenEdgefactor = clamp(1.0 - (dCoords.x + dCoords.y), 0.0, 1.0);

    let reflected = normalize(reflect(normalize(ray.hitCoord), ray.dir));
    let reflectionMultiplier = screenEdgefactor * -reflected.z;

    var color = vec4(tracedAlbedo.rgb * clamp(reflectionMultiplier, 0.0, 1.) * intensity, 1.);

    if (hasLastFrame > 0.5) {
        let lf = textureSample(lastFrameTexture, lightingSampler, uv);
        color = mix(color, lf, 1.0 - fract(frame * 0.001));
    }
    return color;

    // return textureSample(albedoTexture, lightingSampler, uv);
    // return vec4(viewPos.xyz, 1.0);
}