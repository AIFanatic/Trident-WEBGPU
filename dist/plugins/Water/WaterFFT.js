import { GPU, Renderer, Component, Runtime, Geometry, IndexAttribute, VertexAttribute } from '@trident/core';

function PlaneGeometry(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
  const widthHalf = width / 2;
  const heightHalf = height / 2;
  const gridX = Math.floor(widthSegments);
  const gridY = Math.floor(heightSegments);
  const gridX1 = gridX + 1;
  const gridY1 = gridY + 1;
  const segmentWidth = width / gridX;
  const segmentHeight = height / gridY;
  const indices = [];
  const vertices = [];
  const normals = [];
  const uvs = [];
  for (let iy = 0; iy < gridY1; iy++) {
    const y = iy * segmentHeight - heightHalf;
    for (let ix = 0; ix < gridX1; ix++) {
      const x = ix * segmentWidth - widthHalf;
      vertices.push(x, -y, 0);
      normals.push(0, 0, 1);
      uvs.push(ix / gridX, 1 - iy / gridY);
    }
  }
  for (let iy = 0; iy < gridY; iy++) {
    for (let ix = 0; ix < gridX; ix++) {
      const a = ix + gridX1 * iy;
      const b = ix + gridX1 * (iy + 1);
      const c = ix + 1 + gridX1 * (iy + 1);
      const d = ix + 1 + gridX1 * iy;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new Geometry();
  geometry.index = new IndexAttribute(new Uint32Array(indices));
  geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
  geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
  geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
  return geometry;
}
const FullscreenVertexWGSL = `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

const FULLSCREEN_TRIANGLE = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f( 3.0, -1.0),
    vec2f(-1.0,  3.0)
);

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var output: VertexOutput;
    let p = FULLSCREEN_TRIANGLE[vertexIndex];
    output.position = vec4f(p, 0.0, 1.0);
    output.uv = p * 0.5 + vec2f(0.5);
    return output;
}
`;
const SeedPhaseWGSL = `
${FullscreenVertexWGSL}

struct SimParams {
    resolution_size_windx_windy: vec4f,
    delta_choppiness_unused_unused: vec4f,
};

@group(0) @binding(0) var<storage, read> simParams: SimParams;

fn hash21(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453123);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let resolution = simParams.resolution_size_windx_windy.x;
    let pixel = floor(input.uv * resolution);
    let phase = hash21(pixel) * 6.28318530718;
    return vec4f(phase, 0.0, 0.0, 1.0);
}
`;
const InitialSpectrumWGSL = `
${FullscreenVertexWGSL}

struct SimParams {
    resolution_size_windx_windy: vec4f,
    delta_choppiness_unused_unused: vec4f,
};

@group(0) @binding(0) var<storage, read> simParams: SimParams;

const PI = 3.14159265359;
const G = 9.81;
const KM = 370.0;
const CM = 0.23;

fn square(x: f32) -> f32 {
    return x * x;
}

fn omega(k: f32) -> f32 {
    return sqrt(G * k * (1.0 + square(k / KM)));
}

fn tanh_approx(x: f32) -> f32 {
    let e = exp(-2.0 * x);
    return (1.0 - e) / (1.0 + e);
}

fn centeredIndex(v: f32, resolution: f32) -> f32 {
    var out = v;
    if (out >= resolution * 0.5) {
        out = out - resolution;
    }
    return out;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let resolution = simParams.resolution_size_windx_windy.x;
    let size = simParams.resolution_size_windx_windy.y;
    let wind = simParams.resolution_size_windx_windy.zw;

    let coordinates = floor(input.uv * resolution);
    let n = centeredIndex(coordinates.x, resolution);
    let m = centeredIndex(coordinates.y, resolution);
    let K = (2.0 * PI * vec2f(n, m)) / size;
    let k = length(K);

    if (k < 0.000001) {
        return vec4f(0.0);
    }

    let windLength = max(length(wind), 0.001);
    let Omega = 0.84;
    let kp = G * square(Omega / windLength);

    let c = omega(k) / k;
    let cp = omega(kp) / kp;

    let Lpm = exp(-1.25 * square(kp / k));
    let gamma = 1.7;
    let sigma = 0.08 * (1.0 + 4.0 * pow(Omega, -3.0));
    let Gamma = exp(-square(sqrt(k / kp) - 1.0) / (2.0 * square(sigma)));
    let Jp = pow(gamma, Gamma);
    let Fp = Lpm * Jp * exp(-Omega / sqrt(10.0) * (sqrt(k / kp) - 1.0));
    let alphap = 0.006 * sqrt(Omega);
    let Bl = 0.5 * alphap * cp / c * Fp;

    let z0 = max(0.000037 * square(windLength) / G * pow(windLength / cp, 0.9), 0.000001);
    let uStar = 0.41 * windLength / log(10.0 / z0);
    var alpham = 0.01 * (1.0 + 3.0 * log(max(uStar / CM, 0.000001)));
    if (uStar < CM) {
        alpham = 0.01 * (1.0 + log(max(uStar / CM, 0.000001)));
    }

    let Fm = exp(-0.25 * square(k / KM - 1.0));
    let Bh = 0.5 * alpham * CM / c * Fm * Lpm;

    let a0 = log(2.0) / 4.0;
    let am = 0.13 * uStar / CM;
    let Delta = tanh_approx(a0 + 4.0 * pow(c / cp, 2.5) + am * pow(CM / c, 2.5));

    let cosPhi = dot(normalize(wind), normalize(K));
    let S = (1.0 / (2.0 * PI)) * pow(k, -4.0) * (Bl + Bh) * (1.0 + Delta * (2.0 * cosPhi * cosPhi - 1.0));
    let dk = 2.0 * PI / size;
    let h = sqrt(max(S, 0.0) / 2.0) * dk;

    return vec4f(h, 0.0, 0.0, 1.0);
}
`;
const PhaseWGSL = `
${FullscreenVertexWGSL}

struct SimParams {
    resolution_size_windx_windy: vec4f,
    delta_choppiness_unused_unused: vec4f,
};

@group(0) @binding(0) var<storage, read> simParams: SimParams;
@group(0) @binding(1) var u_sampler: sampler;
@group(0) @binding(2) var u_phases: texture_2d<f32>;

const PI = 3.14159265359;
const G = 9.81;
const KM = 370.0;

fn omega(k: f32) -> f32 {
    return sqrt(G * k * (1.0 + (k / KM) * (k / KM)));
}

fn centeredIndex(v: f32, resolution: f32) -> f32 {
    var out = v;
    if (out >= resolution * 0.5) {
        out = out - resolution;
    }
    return out;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let resolution = simParams.resolution_size_windx_windy.x;
    let size = simParams.resolution_size_windx_windy.y;
    let deltaTime = simParams.delta_choppiness_unused_unused.x;

    let coordinates = floor(input.uv * resolution);
    let n = centeredIndex(coordinates.x, resolution);
    let m = centeredIndex(coordinates.y, resolution);
    let waveVector = (2.0 * PI * vec2f(n, m)) / size;

    var phase = textureSampleLevel(u_phases, u_sampler, input.uv, 0.0).r;
    phase += omega(length(waveVector)) * deltaTime;
    phase = phase - floor(phase / (2.0 * PI)) * (2.0 * PI);

    return vec4f(phase, 0.0, 0.0, 1.0);
}
`;
const SpectrumWGSL = `
${FullscreenVertexWGSL}

struct SimParams {
    resolution_size_windx_windy: vec4f,
    delta_choppiness_unused_unused: vec4f,
};

@group(0) @binding(0) var<storage, read> simParams: SimParams;
@group(0) @binding(1) var u_sampler: sampler;
@group(0) @binding(2) var u_phases: texture_2d<f32>;
@group(0) @binding(3) var u_initialSpectrum: texture_2d<f32>;

const PI = 3.14159265359;

fn multiplyComplex(a: vec2f, b: vec2f) -> vec2f {
    return vec2f(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

fn multiplyByI(z: vec2f) -> vec2f {
    return vec2f(-z.y, z.x);
}

fn centeredIndex(v: f32, resolution: f32) -> f32 {
    var out = v;
    if (out >= resolution * 0.5) {
        out = out - resolution;
    }
    return out;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let resolution = simParams.resolution_size_windx_windy.x;
    let size = simParams.resolution_size_windx_windy.y;
    let choppiness = simParams.delta_choppiness_unused_unused.y;

    let coordinates = floor(input.uv * resolution);
    let n = centeredIndex(coordinates.x, resolution);
    let m = centeredIndex(coordinates.y, resolution);
    let waveVector = (2.0 * PI * vec2f(n, m)) / size;
    let waveLength = length(waveVector);

    if (waveLength < 0.000001) {
        return vec4f(0.0);
    }

    let phase = textureSampleLevel(u_phases, u_sampler, input.uv, 0.0).r;
    let phaseVector = vec2f(cos(phase), sin(phase));

    let h0 = textureSampleLevel(u_initialSpectrum, u_sampler, input.uv, 0.0).rg;
    var h0Star = textureSampleLevel(u_initialSpectrum, u_sampler, fract(vec2f(1.0) - input.uv + vec2f(1.0 / resolution)), 0.0).rg;
    h0Star.y *= -1.0;

    let h = multiplyComplex(h0, phaseVector) + multiplyComplex(h0Star, vec2f(phaseVector.x, -phaseVector.y));
    let hX = -multiplyByI(h * (waveVector.x / waveLength)) * choppiness;
    let hZ = -multiplyByI(h * (waveVector.y / waveLength)) * choppiness;

    return vec4f(hX + multiplyByI(h), hZ);
}
`;
function FFTWGSL(horizontal) {
  const axisIndex = horizontal ? "input.position.x" : "input.position.y";
  const evenCoord = horizontal ? "vec2i(i32(evenIndex), i32(input.position.y))" : "vec2i(i32(input.position.x), i32(evenIndex))";
  const oddCoord = horizontal ? "vec2i(i32(evenIndex + transformSize * 0.5), i32(input.position.y))" : "vec2i(i32(input.position.x), i32(evenIndex + transformSize * 0.5))";
  return `
${FullscreenVertexWGSL}

struct FFTParams {
    transformSize_subtransformSize_unused_unused: vec4f,
};

@group(0) @binding(0) var<storage, read> fftParams: FFTParams;
@group(0) @binding(1) var u_input: texture_2d<f32>;

const PI = 3.14159265359;

fn multiplyComplex(a: vec2f, b: vec2f) -> vec2f {
    return vec2f(a.x * b.x - a.y * b.y, a.y * b.x + a.x * b.y);
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let transformSize = fftParams.transformSize_subtransformSize_unused_unused.x;
    let subtransformSize = fftParams.transformSize_subtransformSize_unused_unused.y;
    let index = ${axisIndex} - 0.5;
    let evenIndex = floor(index / subtransformSize) * (subtransformSize * 0.5) + (index - floor(index / (subtransformSize * 0.5)) * (subtransformSize * 0.5));

    let even = textureLoad(u_input, ${evenCoord}, 0);
    let odd = textureLoad(u_input, ${oddCoord}, 0);

    let twiddleArgument = -2.0 * PI * (index / subtransformSize);
    let twiddle = vec2f(cos(twiddleArgument), sin(twiddleArgument));

    let outputA = even.xy + multiplyComplex(twiddle, odd.xy);
    let outputB = even.zw + multiplyComplex(twiddle, odd.zw);

    return vec4f(outputA, outputB);
}
`;
}
const NormalWGSL = `
${FullscreenVertexWGSL}

struct SimParams {
    resolution_size_windx_windy: vec4f,
    delta_choppiness_unused_unused: vec4f,
};

@group(0) @binding(0) var<storage, read> simParams: SimParams;
@group(0) @binding(1) var u_sampler: sampler;
@group(0) @binding(2) var u_displacementMap: texture_2d<f32>;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let resolution = simParams.resolution_size_windx_windy.x;
    let size = simParams.resolution_size_windx_windy.y;
    let texel = 1.0 / resolution;
    let texelSize = size / resolution;

    let uv = input.uv;
    let displacementScale = simParams.delta_choppiness_unused_unused.z;
    let center = textureSampleLevel(u_displacementMap, u_sampler, uv, 0.0).rgb * displacementScale;
    let right = vec3f(texelSize, 0.0, 0.0) + textureSampleLevel(u_displacementMap, u_sampler, uv + vec2f(texel, 0.0), 0.0).rgb * displacementScale - center;
    let left = vec3f(-texelSize, 0.0, 0.0) + textureSampleLevel(u_displacementMap, u_sampler, uv - vec2f(texel, 0.0), 0.0).rgb * displacementScale - center;
    let top = vec3f(0.0, 0.0, -texelSize) + textureSampleLevel(u_displacementMap, u_sampler, uv - vec2f(0.0, texel), 0.0).rgb * displacementScale - center;
    let bottom = vec3f(0.0, 0.0, texelSize) + textureSampleLevel(u_displacementMap, u_sampler, uv + vec2f(0.0, texel), 0.0).rgb * displacementScale - center;

    let normal = normalize(cross(right, top) + cross(top, left) + cross(left, bottom) + cross(bottom, right));
    return vec4f(normal, 1.0);
}
`;
const RenderWGSL = `
#include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

struct VertexInput {
    @builtin(instance_index) instanceIdx: u32,
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPosition: vec3f,
    @location(1) uv: vec2f,
    @location(2) screenUV: vec2f,
    @location(3) viewPosition: vec3f,
};

struct FragmentOutput {
    @location(0) albedo: vec4f,
    @location(1) normal: vec4f,
    @location(2) RMO: vec4f,
};

struct RenderParams {
    displacementScale_roughness_refraction_unused: vec4f,
    oceanColor: vec4f,
    shallowColor: vec4f,
};

@group(0) @binding(0) var<storage, read> frameBuffer: FrameBuffer;
@group(0) @binding(1) var<storage, read> modelMatrix: array<mat4x4<f32>>;
@group(0) @binding(2) var u_sampler: sampler;
@group(0) @binding(3) var u_displacementMap: texture_2d<f32>;
@group(0) @binding(4) var u_normalMap: texture_2d<f32>;
@group(0) @binding(5) var u_screenTexture: texture_2d<f32>;
@group(0) @binding(6) var u_depthTexture: texture_depth_2d;
@group(0) @binding(7) var<storage, read> renderParams: RenderParams;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    let M = modelMatrix[input.instanceIdx];
    let displacementScale = renderParams.displacementScale_roughness_refraction_unused.x;
    let fftScale = renderParams.displacementScale_roughness_refraction_unused.w;

    let displacement = textureSampleLevel(u_displacementMap, u_sampler, input.uv, 0.0).rgb * displacementScale * fftScale;
    let localDisplacement = vec3f(displacement.x * 0.25, displacement.z * 0.25, displacement.y);
    let localPosition = input.position + localDisplacement;
    let worldPosition = (M * vec4f(localPosition, 1.0)).xyz;
    let viewPosition = (frameBuffer.viewMatrix * vec4f(worldPosition, 1.0)).xyz;

    output.position = frameBuffer.projectionMatrix * vec4f(viewPosition, 1.0);
    output.worldPosition = worldPosition;
    output.viewPosition = viewPosition;
    output.uv = input.uv;

    let ndc = output.position.xyz / output.position.w;
    output.screenUV = ndc.xy * 0.5 + vec2f(0.5);
    output.screenUV.y = 1.0 - output.screenUV.y;

    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> FragmentOutput {
    var output: FragmentOutput;

    let roughness = renderParams.displacementScale_roughness_refraction_unused.y;
    let refraction = renderParams.displacementScale_roughness_refraction_unused.z;
    let oceanColor = renderParams.oceanColor.rgb;
    let shallowColor = renderParams.shallowColor.rgb;

    let normalOld = textureSampleLevel(u_normalMap, u_sampler, input.uv, 0.0).rgb;
    let normalLocal = normalize(vec3f(normalOld.x, normalOld.z, normalOld.y));
    let normalWorld = normalize((modelMatrix[0] * vec4f(normalLocal, 0.0)).xyz);
    let normalView = normalize((frameBuffer.viewMatrix * vec4f(normalWorld, 0.0)).xyz);

    let screenUV = input.screenUV;
    let refractedUV = clamp(screenUV + (normalView.xy * refraction) / max(-input.viewPosition.z, 0.001), vec2f(0.001), vec2f(0.999));

    let depthDims = textureDimensions(u_depthTexture, 0);
    let depthRaw = textureLoad(u_depthTexture, vec2i(vec2f(depthDims) * screenUV), 0);
    let ndcXY = vec2f(screenUV.x, 1.0 - screenUV.y) * 2.0 - 1.0;
    let depthView = frameBuffer.projectionInverseMatrix * vec4f(ndcXY, depthRaw, 1.0);
    let sceneViewPosition = depthView.xyz / depthView.w;
    let waterDepth = clamp(distance(input.viewPosition, sceneViewPosition) * 0.06, 0.0, 1.0);

    let sceneColor = textureSampleLevel(u_screenTexture, u_sampler, refractedUV, waterDepth * 2.0).rgb;
    let waterTint = mix(shallowColor, oceanColor, waterDepth);
    let color = mix(sceneColor * waterTint, waterTint, 0.65 + waterDepth * 0.25);

    output.albedo = vec4f(color, roughness);
    output.normal = vec4f(OctEncode(normalWorld), 1.0, 0.0);
    output.RMO = vec4f(0.0);
    return output;
}
`;
class WaterFFTRenderPass extends GPU.RenderPass {
  name = "WaterFFTRenderPass";
  resolution = 64;
  oceanSize = 250;
  choppiness = 0.35;
  windX = 10;
  windY = 10;
  displacementScale = 0.25;
  roughness = 0.025;
  refraction = 0.035;
  waterGeometries = /* @__PURE__ */ new Map();
  seedPhaseShader;
  initialSpectrumShader;
  phaseShader;
  spectrumShader;
  fftHorizontalShader;
  fftVerticalShader;
  normalShader;
  renderShader;
  initialSpectrum;
  phaseA;
  phaseB;
  spectrum;
  transformPing;
  transformPong;
  displacementMap;
  normalMap;
  albedoClone;
  depthClone;
  nearestClampSampler;
  nearestRepeatSampler;
  linearRepeatSampler;
  phaseAIsCurrent = true;
  generatedInitialTextures = false;
  previousTime = 0;
  simParams = new Float32Array(8);
  fftParams = new Float32Array(4);
  renderParams = new Float32Array([
    this.displacementScale,
    this.roughness,
    this.refraction,
    1 / (this.resolution * this.resolution),
    5e-3,
    0.025,
    0.055,
    1,
    0,
    0.32,
    0.36,
    1
  ]);
  async init() {
    const gBufferFormat = GPU.RenderingPipeline.GBufferFormat;
    this.seedPhaseShader = await GPU.Shader.Create({ code: SeedPhaseWGSL, colorOutputs: [{ format: "rgba16float" }], cullMode: "none" });
    this.initialSpectrumShader = await GPU.Shader.Create({ code: InitialSpectrumWGSL, colorOutputs: [{ format: "rgba16float" }], cullMode: "none" });
    this.phaseShader = await GPU.Shader.Create({ code: PhaseWGSL, colorOutputs: [{ format: "rgba16float" }], cullMode: "none" });
    this.spectrumShader = await GPU.Shader.Create({ code: SpectrumWGSL, colorOutputs: [{ format: "rgba16float" }], cullMode: "none" });
    this.fftHorizontalShader = await GPU.Shader.Create({ code: FFTWGSL(true), colorOutputs: [{ format: "rgba16float" }], cullMode: "none" });
    this.fftVerticalShader = await GPU.Shader.Create({ code: FFTWGSL(false), colorOutputs: [{ format: "rgba16float" }], cullMode: "none" });
    this.normalShader = await GPU.Shader.Create({ code: NormalWGSL, colorOutputs: [{ format: "rgba16float" }], cullMode: "none" });
    this.renderShader = await GPU.Shader.Create({
      code: RenderWGSL,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      colorOutputs: [{ format: gBufferFormat }, { format: gBufferFormat }, { format: gBufferFormat }],
      depthOutput: "depth24plus",
      depthCompare: "less-equal",
      cullMode: "none"
    });
    this.nearestClampSampler = new GPU.TextureSampler({
      minFilter: "nearest",
      magFilter: "nearest",
      mipmapFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    this.nearestRepeatSampler = new GPU.TextureSampler({
      minFilter: "nearest",
      magFilter: "nearest",
      mipmapFilter: "nearest",
      addressModeU: "repeat",
      addressModeV: "repeat"
    });
    this.linearRepeatSampler = new GPU.TextureSampler({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat"
    });
    this.initialSpectrum = this.createFFTTexture("FFT Initial Spectrum");
    this.phaseA = this.createFFTTexture("FFT Phase A");
    this.phaseB = this.createFFTTexture("FFT Phase B");
    this.spectrum = this.createFFTTexture("FFT Spectrum");
    this.transformPing = this.createFFTTexture("FFT Transform Ping");
    this.transformPong = this.createFFTTexture("FFT Transform Pong");
    this.displacementMap = this.createFFTTexture("FFT Displacement");
    this.normalMap = this.createFFTTexture("FFT Normal");
    this.albedoClone = GPU.Texture.Create(Renderer.width, Renderer.height, 1, gBufferFormat);
    this.albedoClone.name = "WaterFFT Albedo Clone";
    this.depthClone = GPU.DepthTexture.Create(Renderer.width, Renderer.height);
    this.depthClone.name = "WaterFFT Depth Clone";
    this.seedPhaseShader.SetArray("simParams", this.simParams);
    this.initialSpectrumShader.SetArray("simParams", this.simParams);
    this.phaseShader.SetArray("simParams", this.simParams);
    this.phaseShader.SetSampler("u_sampler", this.nearestClampSampler);
    this.spectrumShader.SetArray("simParams", this.simParams);
    this.spectrumShader.SetSampler("u_sampler", this.nearestRepeatSampler);
    this.normalShader.SetArray("simParams", this.simParams);
    this.normalShader.SetSampler("u_sampler", this.linearRepeatSampler);
    this.fftHorizontalShader.SetArray("fftParams", this.fftParams);
    this.fftVerticalShader.SetArray("fftParams", this.fftParams);
    this.renderShader.SetSampler("u_sampler", this.linearRepeatSampler);
    this.renderShader.SetTexture("u_displacementMap", this.displacementMap);
    this.renderShader.SetTexture("u_normalMap", this.normalMap);
    this.renderShader.SetArray("renderParams", this.renderParams);
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized || this.waterGeometries.size === 0) return;
    const frameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    const currentAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const currentNormal = resources.getResource(GPU.PassParams.GBufferNormal);
    const currentERMO = resources.getResource(GPU.PassParams.GBufferERMO);
    const currentDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!frameBuffer || !currentAlbedo || !currentNormal || !currentERMO || !currentDepth) return;
    this.updateScreenClones(currentAlbedo, currentDepth);
    this.updateSimParams();
    if (!this.generatedInitialTextures) {
      this.drawFullscreen("WaterFFT Seed Phase", this.phaseA, this.seedPhaseShader);
      this.drawFullscreen("WaterFFT Initial Spectrum", this.initialSpectrum, this.initialSpectrumShader);
      this.phaseAIsCurrent = true;
      this.generatedInitialTextures = true;
    }
    this.updatePhase();
    this.updateSpectrum();
    this.updateFFT();
    this.updateNormalMap();
    GPU.RendererContext.CopyTextureToTextureV3({ texture: currentAlbedo }, { texture: this.albedoClone });
    GPU.RendererContext.CopyTextureToTextureV3({ texture: currentDepth }, { texture: this.depthClone });
    this.renderShader.SetBuffer("frameBuffer", frameBuffer);
    this.renderShader.SetTexture("u_screenTexture", this.albedoClone);
    this.renderShader.SetTexture("u_depthTexture", this.depthClone);
    this.renderShader.SetTexture("u_displacementMap", this.displacementMap);
    this.renderShader.SetTexture("u_normalMap", this.normalMap);
    GPU.RendererContext.BeginRenderPass(this.name, [
      { target: currentAlbedo, clear: false },
      { target: currentNormal, clear: false },
      { target: currentERMO, clear: false }
    ], { target: currentDepth, clear: false }, true);
    for (const water of this.waterGeometries.values()) {
      this.renderShader.SetMatrix4("modelMatrix", water.transform.localToWorldMatrix);
      GPU.RendererContext.DrawGeometry(water.geometry, this.renderShader);
    }
    GPU.RendererContext.EndRenderPass();
  }
  createFFTTexture(name) {
    const texture = GPU.RenderTexture.Create(this.resolution, this.resolution, 1, "rgba16float");
    texture.name = name;
    return texture;
  }
  updateSimParams() {
    const now = performance.now() / 1e3;
    const deltaTime = this.previousTime === 0 ? 1 / 60 : Math.min(now - this.previousTime, 1 / 20);
    this.previousTime = now;
    this.simParams[0] = this.resolution;
    this.simParams[1] = this.oceanSize;
    this.simParams[2] = this.windX;
    this.simParams[3] = this.windY;
    this.simParams[4] = deltaTime;
    this.simParams[5] = this.choppiness;
    this.simParams[6] = this.displacementScale / (this.resolution * this.resolution);
    this.simParams[7] = 0;
    this.seedPhaseShader.SetArray("simParams", this.simParams);
    this.initialSpectrumShader.SetArray("simParams", this.simParams);
    this.phaseShader.SetArray("simParams", this.simParams);
    this.spectrumShader.SetArray("simParams", this.simParams);
    this.normalShader.SetArray("simParams", this.simParams);
  }
  updateScreenClones(currentAlbedo, currentDepth) {
    if (this.albedoClone.width !== currentAlbedo.width || this.albedoClone.height !== currentAlbedo.height) {
      this.albedoClone.Destroy();
      this.albedoClone = GPU.Texture.Create(currentAlbedo.width, currentAlbedo.height, 1, currentAlbedo.format);
      this.albedoClone.name = "WaterFFT Albedo Clone";
    }
    if (this.depthClone.width !== currentDepth.width || this.depthClone.height !== currentDepth.height) {
      this.depthClone.Destroy();
      this.depthClone = GPU.DepthTexture.Create(currentDepth.width, currentDepth.height, 1, currentDepth.format);
      this.depthClone.name = "WaterFFT Depth Clone";
    }
  }
  updatePhase() {
    const source = this.phaseAIsCurrent ? this.phaseA : this.phaseB;
    const target = this.phaseAIsCurrent ? this.phaseB : this.phaseA;
    this.phaseShader.SetTexture("u_phases", source);
    this.drawFullscreen("WaterFFT Phase", target, this.phaseShader);
    this.phaseAIsCurrent = !this.phaseAIsCurrent;
  }
  updateSpectrum() {
    const currentPhase = this.phaseAIsCurrent ? this.phaseA : this.phaseB;
    this.spectrumShader.SetTexture("u_phases", currentPhase);
    this.spectrumShader.SetTexture("u_initialSpectrum", this.initialSpectrum);
    this.drawFullscreen("WaterFFT Spectrum", this.spectrum, this.spectrumShader);
  }
  updateFFT() {
    const stages = Math.log2(this.resolution);
    const iterations = stages * 2;
    let input = this.spectrum;
    for (let i = 0; i < iterations; i++) {
      const target = i === iterations - 1 ? this.displacementMap : i % 2 === 0 ? this.transformPing : this.transformPong;
      const shader = i < stages ? this.fftHorizontalShader : this.fftVerticalShader;
      this.fftParams[0] = this.resolution;
      this.fftParams[1] = Math.pow(2, i % stages + 1);
      this.fftParams[2] = 0;
      this.fftParams[3] = 0;
      shader.SetArray("fftParams", this.fftParams);
      shader.SetTexture("u_input", input);
      this.drawFullscreen(i < stages ? "WaterFFT Horizontal FFT" : "WaterFFT Vertical FFT", target, shader);
      input = target;
    }
  }
  updateNormalMap() {
    this.normalShader.SetTexture("u_displacementMap", this.displacementMap);
    this.drawFullscreen("WaterFFT Normal", this.normalMap, this.normalShader);
  }
  drawFullscreen(name, target, shader) {
    GPU.RendererContext.BeginRenderPass(name, [{ target, clear: true }], void 0, true);
    GPU.RendererContext.DrawVertex(shader, 3);
    GPU.RendererContext.EndRenderPass();
  }
}
class WaterFFT extends Component {
  static type = "@trident/plugins/WaterFFT";
  runInEditMode = true;
  static renderPass;
  static renderPassScene;
  geometry;
  constructor(gameObject) {
    super(gameObject);
    if (!WaterFFT.renderPass || WaterFFT.renderPassScene !== gameObject.scene) {
      WaterFFT.renderPass = new WaterFFTRenderPass();
      WaterFFT.renderPassScene = gameObject.scene;
      Runtime.Renderer.RenderPipeline.AddPass(WaterFFT.renderPass, GPU.RenderPassOrder.BeforeLighting);
    }
    this.geometry = PlaneGeometry(512, 512, 160, 160);
    WaterFFT.renderPass.waterGeometries.set(this, {
      geometry: this.geometry,
      transform: this.transform
    });
  }
  Destroy() {
    WaterFFT.renderPass?.waterGeometries.delete(this);
    super.Destroy();
  }
}

export { WaterFFT };
