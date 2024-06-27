struct VertexInput {
    @builtin(vertex_index) VertexIndex : u32,
    @location(0) position : vec2<f32>,
};


struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) vUv : vec2<f32>,
};

@group(0) @binding(0) var textureSampler: sampler;

struct View {
    gProj: mat4x4<f32>
};

@group(0) @binding(1) var<storage, read> view: View;

@group(0) @binding(2) var<storage, read> gBlurWeights: array<vec4f, 3>;
@group(0) @binding(3) var<storage, read> gInvRenderTargetSize: vec2<f32>;


@group(0) @binding(4) var gNormalMap: texture_2d<f32>;
@group(0) @binding(5) var gDepthMap: texture_depth_2d;
@group(0) @binding(6) var gInputMap: texture_2d<f32>;

@group(0) @binding(7) var<storage, read> blurHorizontal: f32;
@group(0) @binding(8) var<storage, read> blurRadius: f32;


@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    let gTexCoords = array<vec2f, 6>(
        vec2(0.0, 1.0),
        vec2(0.0, 0.0),
        vec2(1.0, 0.0),
        vec2(0.0, 1.0),
        vec2(1.0, 0.0),
        vec2(1.0, 1.0)
    );

    var output: VertexOutput;
    // output.vUv = input.uv;
    output.vUv = vec2(gTexCoords[input.VertexIndex].x, 1.0 - gTexCoords[input.VertexIndex].y);
    // output.position = vec4(2.0 * output.vUv.x - 1.0, 1.0 - 2.0 * output.vUv.y, 0.0, 1.0);
    output.position = vec4(2 * output.vUv.x - 1.0, 1.0 - 2 * output.vUv.y, 0.0, 1.0);
    return output;
}

fn NdcDepthToViewDepth(z_ndc: f32) -> f32 {
    // z_ndc = A + B/viewZ, where gProj[2,2]=A and gProj[3,2]=B.
    let viewZ = view.gProj[3][2] / (z_ndc - view.gProj[2][2]);
    return viewZ;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    // return vec4f(1.0);
    let uv = input.vUv;


    // unpack into float array.
    let blurWeights = array<f32, 12>(
        gBlurWeights[0].x, gBlurWeights[0].y, gBlurWeights[0].z, gBlurWeights[0].w,
        gBlurWeights[1].x, gBlurWeights[1].y, gBlurWeights[1].z, gBlurWeights[1].w,
        gBlurWeights[2].x, gBlurWeights[2].y, gBlurWeights[2].z, gBlurWeights[2].w,
    );

    let gBlurRadius = i32(blurRadius);
    let gHorizontalBlur = bool(blurHorizontal);

    var texOffset = vec2f(0);
    if(gHorizontalBlur) {
        texOffset = vec2f(gInvRenderTargetSize.x, 0.0);
    }
    else {
        texOffset = vec2f(0.0, gInvRenderTargetSize.y);
    }

    let TexC = input.vUv;
    var color = blurWeights[gBlurRadius] * textureSample(gInputMap, textureSampler, TexC);
    var totalWeight = blurWeights[gBlurRadius];

    let centerNormal = textureSample(gNormalMap, textureSampler, TexC).xyz;
    let centerDepth = NdcDepthToViewDepth(textureSample(gDepthMap, textureSampler, TexC));
    // let centerDepth = textureSample(gDepthMap, textureSampler, TexC);

    for(var i = -gBlurRadius; i <=gBlurRadius; i++) {
        // We already added in the center weight.
        if( i == 0 ) {
            continue;
        }

        let tex = TexC + f32(i) * texOffset;

        let neighborNormal = textureSample(gNormalMap, textureSampler, tex).xyz;
        let neighborDepth = NdcDepthToViewDepth(textureSample(gDepthMap, textureSampler, tex));
        // let neighborDepth = textureSample(gDepthMap, textureSampler, tex);

        //
        // If the center value and neighbor values differ too much (either in
        // normal or depth), then we assume we are sampling across a discontinuity.
        // We discard such samples from the blur.
        //
        if( dot(neighborNormal, centerNormal) >= 0.8f &&
            abs(neighborDepth - centerDepth) <= 0.2f )
        {
            let weight = blurWeights[i + gBlurRadius];

            // Add neighbor pixel to blur.
            color += weight * textureSampleLevel(gInputMap, textureSampler, tex, 0);

            totalWeight += weight;
        }
    }
    return color;
    // return vec4(centerNormal, 1.0);
    // return vec4(pow(centerDepth, 100));
}