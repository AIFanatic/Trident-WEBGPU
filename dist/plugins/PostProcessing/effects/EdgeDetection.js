import { GPU, Geometry, Mathf } from '@trident/core';

class PostProcessingEdgeDetection extends GPU.RenderPass {
  name = "PostProcessingEdgeDetection";
  enabled = true;
  edgeDetectionPass;
  quadGeometry2;
  edgeTex;
  sampleTexture;
  async init() {
    const format = GPU.Renderer.SwapChainFormat;
    this.edgeDetectionPass = await GPU.Shader.Create({
      code: `
struct VertexInput {
    @location(0) position : vec3<f32>,
    @location(1) normal : vec3<f32>,
    @location(2) uv : vec2<f32>,
};

struct VertexOutput {
    @builtin(position) position : vec4<f32>,
    @location(0) texcoord : vec2<f32>,
    @location(1) offset0 : vec4<f32>,
    @location(2) offset1 : vec4<f32>,
    @location(3) offset2 : vec4<f32>,
};

@group(0) @binding(0) var<storage, read> u_resolution : vec4<f32>; // (texelSize.x, texelSize.y, width, height)
@group(0) @binding(1) var colorTex : texture_2d<f32>;
@group(0) @binding(2) var colorTexSampler : sampler;

/* ------------------------------------------------------- */

fn mad(a: vec4f, b: vec4f, c: vec4f) -> vec4f {
    return a * b + c;
}

fn API_V_DIR(v: f32) -> f32 {
    return v; // matches your current GLSL orientation
}

/* ------------------------------------------------------- */

fn SMAAEdgeDetectionVS(texcoord: vec2f) -> array<vec4f, 3> {
    let t = u_resolution.xyxy;
    return array<vec4f, 3>(
        mad(t, vec4(-1.0,  0.0,  0.0, API_V_DIR(-1.0)), texcoord.xyxy),
        mad(t, vec4( 1.0,  0.0,  0.0, API_V_DIR( 1.0)), texcoord.xyxy),
        mad(t, vec4(-2.0,  0.0,  0.0, API_V_DIR(-2.0)), texcoord.xyxy)
    );
}

/* ------------------------------------------------------- */

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output : VertexOutput;

    output.texcoord = input.uv;

    let offsets = SMAAEdgeDetectionVS(output.texcoord);
    output.offset0 = offsets[0];
    output.offset1 = offsets[1];
    output.offset2 = offsets[2];

    output.position = vec4(input.position, 1.0);
    return output;
}

/* ------------------------------------------------------- */

const SMAA_THRESHOLD = 0.1;
const SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR = 2.0;

fn sample0(uv: vec2f) -> vec3f {
    return textureSampleLevel(colorTex, colorTexSampler, uv, 0.0).rgb;
}

fn SMAAColorEdgeDetectionPS(
    texcoord: vec2f,
    offset: array<vec4f, 3>
) -> vec2f {

    let threshold = vec2f(SMAA_THRESHOLD);
    var delta : vec4f;

    let C = sample0(texcoord);

    let Cleft = sample0(offset[0].xy);
    var t = abs(C - Cleft);
    delta.x = max(max(t.r, t.g), t.b);

    let Ctop = sample0(offset[0].zw);
    t = abs(C - Ctop);
    delta.y = max(max(t.r, t.g), t.b);

    var edges = step(threshold, delta.xy);

    if (dot(edges, vec2(1.0)) == 0.0) {
        discard;
    }

    let Cright = sample0(offset[1].xy);
    t = abs(C - Cright);
    delta.z = max(max(t.r, t.g), t.b);

    let Cbottom = sample0(offset[1].zw);
    t = abs(C - Cbottom);
    delta.w = max(max(t.r, t.g), t.b);

    var maxDelta = max(delta.xy, delta.zw);

    let Cleftleft = sample0(offset[2].xy);
    t = abs(C - Cleftleft);
    delta.z = max(max(t.r, t.g), t.b);

    let Ctoptop = sample0(offset[2].zw);
    t = abs(C - Ctoptop);
    delta.w = max(max(t.r, t.g), t.b);

    maxDelta = max(maxDelta, delta.zw);
    let finalDelta = max(maxDelta.x, maxDelta.y);

    let adapt = step(
        vec2f(finalDelta),
        SMAA_LOCAL_CONTRAST_ADAPTATION_FACTOR * delta.xy
    );

    edges *= adapt;
    return edges;
}

/* ------------------------------------------------------- */

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let offsets = array<vec4f, 3>(
        input.offset0,
        input.offset1,
        input.offset2
    );

    let edges = SMAAColorEdgeDetectionPS(input.texcoord, offsets);
    return vec4(edges, 0.0, 1.0);
}

            `,
      colorOutputs: [{ format }]
    });
    this.quadGeometry2 = Geometry.Plane();
    const w = 1920;
    const h = 572;
    const u_resolution = new Mathf.Vector4(1 / w, 1 / h, w, h);
    const u_viewport_size = new Mathf.Vector4(w, h, 0, 0);
    console.log(u_resolution, u_viewport_size, w, h);
    this.edgeTex = GPU.RenderTexture.Create(w, h, 1, format);
    this.sampleTexture = await GPU.Texture.Load(new URL("/extra/research/glsl-smaa-main/sample.png", import.meta.url), "rgba16float", false, false);
    this.edgeDetectionPass.SetSampler("colorTexSampler", GPU.TextureSampler.Create({ addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge", minFilter: "nearest", magFilter: "nearest" }));
    this.edgeDetectionPass.SetArray("u_resolution", u_resolution.elements);
    this.initialized = true;
  }
  async execute(resources) {
    if (this.initialized === false) return;
    if (this.enabled === false) return;
    const outputTex = this.sampleTexture;
    if (!outputTex) return;
    this.edgeDetectionPass.SetTexture("colorTex", outputTex);
    GPU.RendererContext.BeginRenderPass(this.name + " - Edge", [{ clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.quadGeometry2, this.edgeDetectionPass);
    GPU.RendererContext.EndRenderPass();
  }
}

export { PostProcessingEdgeDetection };
