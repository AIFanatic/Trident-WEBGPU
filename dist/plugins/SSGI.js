import { GPU, Geometry, Components } from '@trident/core';
import { TextureBlender } from '@trident/plugins/TextureBlender.js';
import { BilateralFilter } from '@trident/plugins/BilateralFilter.js';
import { Upscaler } from '@trident/plugins/Upscaler.js';

class SSGIRenderPass extends GPU.RenderPass {
  name = "SSGIRenderPass";
  geometry;
  shader;
  output;
  bilateralFilter;
  upscaler;
  textureBlender;
  constructor() {
    super();
    this.bilateralFilter = new BilateralFilter();
    this.upscaler = new Upscaler();
    this.textureBlender = new TextureBlender();
  }
  async init(resources) {
    await this.bilateralFilter.init(resources);
    await this.upscaler.init(resources);
    await this.textureBlender.init(resources);
    this.shader = await GPU.Shader.Create({
      code: `
            #include "@trident/core/resources/webgpu/shaders/deferred/Common.wgsl";

            struct VertexInput {
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv: vec2<f32>
            };

            @group(0) @binding(0) var inputDepth: texture_depth_2d;
            @group(0) @binding(1) var inputNormal: texture_2d<f32>;
            @group(0) @binding(2) var inputLight: texture_2d<f32>;
            
            @group(0) @binding(3) var textureSampler: sampler;
            @group(0) @binding(4) var depthSampler: sampler;


            struct Settings {
                renderOutputSize: vec4<f32>,
                projectionOutputSize: vec4<f32>,
                projectionMatrix: mat4x4<f32>,
                projectionInverseMatrix: mat4x4<f32>,
                viewInverseMatrix: mat4x4<f32>,
                viewMatrix: mat4x4<f32>,
            };

            @group(0) @binding(5) var<storage, read> settings: Settings;
            
            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4f(input.position, 1.0);
                output.uv = input.uv;
                return output;
            }

            fn _mod(x: f32, y: f32) -> f32 {
                return x - y * floor(x / y);
            }

            // https://blog.demofox.org/2022/01/01/interleaved-gradient-noise-a-different-kind-of-low-discrepancy-sequence/
            fn randf(x: i32, y: i32) -> f32 {
                return _mod(52.9829189 * _mod(0.06711056 * f32(x) + 0.00583715 * f32(y), 1.0), 1.0);
            }

            // https://graphics.stanford.edu/%7Eseander/bithacks.html
            fn bitCount(_value: u32) -> u32 {
                var value = _value;
                value = value - ((value >> 1u) & 0x55555555u);
                value = (value & 0x33333333u) + ((value >> 2u) & 0x33333333u);
                return (((value + (value >> 4u)) & 0x0F0F0F0Fu) * 0x01010101u) >> 24u;
            }

            // https://cdrinmatane.github.io/posts/ssaovb-code/
            fn updateSectors(minHorizon: f32, maxHorizon: f32, outBitfield: u32) -> u32 {
                let startBit: u32 = u32(minHorizon * f32(sectorCount));
                let horizonAngle: u32 = u32(ceil((maxHorizon - minHorizon) * f32(sectorCount)));
                
                // let angleBit: u32 = horizonAngle > 0u ? u32(0xFFFFFFFFu >> (sectorCount - horizonAngle)) : 0u;
                var angleBit: u32 = 0u;
                if (horizonAngle > 0u) {
                    angleBit = u32(0xFFFFFFFFu >> (sectorCount - horizonAngle));
                }

                let currentBitfield: u32 = angleBit << startBit;
                return outBitfield | currentBitfield;
            }

            const pi: f32 = 3.14159265359;
            const twoPi: f32 = 2.0 * pi;
            const halfPi: f32 = 0.5 * pi;

            const sectorCount: u32 = 16u;
            const sliceCount = 4.0;
            const sampleCount = 4.0;
            const sampleRadius = 0.8;
            const hitThickness = 0.2;

            fn reconstructPosition(fragUV: vec2<f32>) -> vec3f {
                let screenSize = settings.projectionOutputSize.xy;
                let pixel      = fragUV * screenSize;
                let texel      = vec2<i32>(clamp(pixel, vec2<f32>(0.0), screenSize - vec2<f32>(1.0)));
                let depth      = textureLoad(inputDepth, texel, 0) * 2.0 - 1.0;
          
                var ndc = vec4<f32>(fragUV * 2.0 - vec2<f32>(1.0), depth, 1.0);
                ndc.y   = -ndc.y;
          
                var viewPos = settings.projectionInverseMatrix * ndc;
                viewPos    /= viewPos.w;
                return viewPos.xyz;
            }
          
            // get indirect lighting and ambient occlusion
            fn getVisibility(fragUV: vec2<f32>) -> vec4<f32> {
                let fragCoord = fragUV * settings.renderOutputSize.xy;
          
                var indirect : u32 = 0u;
                var occlusion: u32 = 0u;
          
                var visibility: f32   = 0.0;
                var lighting  : vec3<f32> = vec3(0.0);
                var frontBackHorizon  : vec2<f32> = vec2(0.0);
          
                let aspect = settings.projectionOutputSize.yx / settings.projectionOutputSize.x;
          
                let positionVS    = reconstructPosition(fragUV);
                let normalWS      = OctDecode(textureSample(inputNormal, textureSampler, fragUV).rg);
                let normalVS      = normalize((settings.viewMatrix * vec4<f32>(normalWS, 0.0)).xyz);
          
                let viewZ       = min(positionVS.z, -0.001);
                let cameraDirVS = normalize(-positionVS);
          
                let sliceRotation = twoPi / (sliceCount - 1.0);
                let sampleScale   = (-sampleRadius * settings.projectionMatrix[0][0]) / viewZ;
                let sampleOffset  = 0.01;
                let jitter        = randf(i32(fragCoord.x), i32(fragCoord.y)) - 0.5;
          
                for (var slice: f32 = 0.0; slice < sliceCount + 0.5; slice += 1.0) {
                    let phi    = sliceRotation * (slice + jitter) + pi;
                    let omega  = vec2<f32>(cos(phi), sin(phi));
                    let direction = vec3<f32>(omega, 0.0);
                    let orthoDirection = direction - dot(direction, cameraDirVS) * cameraDirVS;
                    let axis     = cross(direction, cameraDirVS);
                    let projNormal = normalVS - axis * dot(normalVS, axis);
                    let projLength = max(length(projNormal), 1e-4);
          
                    let signN = sign(dot(orthoDirection, projNormal));
                    let cosN  = clamp(dot(projNormal, cameraDirVS) / projLength, 0.0, 1.0);
                    let n     = signN * acos(cosN);
          
                    for (var currentSample: f32 = 0.0; currentSample < sampleCount + 0.5; currentSample += 1.0) {
                        let sampleStep = (currentSample + jitter) / sampleCount + sampleOffset;
                        let sampleUV   = clamp(fragUV - sampleStep * sampleScale * omega * aspect, vec2<f32>(0.0), vec2<f32>(1.0));
          
                        let samplePositionVS    = reconstructPosition(sampleUV);
                        let sampleNormalVS      = normalize((settings.viewMatrix * vec4<f32>(OctDecode(textureSample(inputNormal, textureSampler, sampleUV).rg), 0.0)).xyz);
          
                        let sampleLight     = textureSample(inputLight, textureSampler, sampleUV).rgb;
                        let sampleDistance  = samplePositionVS - positionVS;
                        let sampleLength    = max(length(sampleDistance), 1e-4);
                        let sampleHorizon   = sampleDistance / sampleLength;
          
                        frontBackHorizon.x = dot(sampleHorizon, cameraDirVS);
                        frontBackHorizon.y = dot(normalize(sampleDistance - cameraDirVS * hitThickness), cameraDirVS);
          
                        frontBackHorizon   = acos(frontBackHorizon);
                        frontBackHorizon   = clamp((frontBackHorizon + n + halfPi) / pi, vec2<f32>(0.0), vec2<f32>(1.0));
          
                        indirect = updateSectors(frontBackHorizon.x, frontBackHorizon.y, 0u);
                        lighting += (1.0 - f32(bitCount(indirect & ~occlusion)) / f32(sectorCount)) *
                                    sampleLight *
                                    clamp(dot(normalVS, sampleHorizon), 0.0, 1.0) *
                                    clamp(dot(sampleNormalVS, -sampleHorizon), 0.0, 1.0);
                        occlusion |= indirect;
                    }
          
                    visibility += 1.0 - f32(bitCount(occlusion)) / f32(sectorCount);
                }
          
                visibility /= sliceCount;
                lighting   /= sliceCount;
          
                return vec4<f32>(lighting, visibility);
            }
          
            @fragment
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                return getVisibility(input.uv);
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
        inputDepth: { group: 0, binding: 0, type: "depthTexture" },
        inputNormal: { group: 0, binding: 1, type: "texture" },
        inputLight: { group: 0, binding: 2, type: "texture" },
        textureSampler: { group: 0, binding: 3, type: "sampler" },
        depthSampler: { group: 0, binding: 4, type: "sampler-compare" },
        settings: { group: 0, binding: 5, type: "storage" }
      }
    });
    this.geometry = Geometry.Plane();
    this.shader.SetSampler("textureSampler", GPU.TextureSampler.Create());
    this.shader.SetSampler("depthSampler", GPU.TextureSampler.Create({ minFilter: "nearest", magFilter: "nearest", mipmapFilter: "nearest", compare: "less" }));
    const W = GPU.Renderer.width / 4;
    const H = GPU.Renderer.height / 4;
    this.output = GPU.RenderTexture.Create(W, H, 1, "rgba16float");
    this.initialized = true;
  }
  async preFrame(resources) {
    const inputDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    const inputNormal = resources.getResource(GPU.PassParams.GBufferNormal);
    const inputLight = resources.getResource(GPU.PassParams.LightingPassOutput);
    if (!inputDepth) return;
    this.shader.SetTexture("inputDepth", inputDepth);
    this.shader.SetTexture("inputNormal", inputNormal);
    this.shader.SetTexture("inputLight", inputLight);
    const mainCamera = Components.Camera.mainCamera;
    this.shader.SetArray("settings", new Float32Array([
      this.output.width,
      this.output.height,
      0,
      0,
      GPU.Renderer.width,
      GPU.Renderer.height,
      0,
      0,
      ...mainCamera.projectionMatrix.elements,
      ...mainCamera.projectionMatrix.clone().invert().elements,
      ...mainCamera.viewMatrix.clone().invert().elements,
      ...mainCamera.viewMatrix.elements
    ]));
  }
  async execute(resources) {
    if (!this.initialized) return;
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.output, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    const inputDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    const inputNormal = resources.getResource(GPU.PassParams.GBufferNormal);
    const inputLight = resources.getResource(GPU.PassParams.LightingPassOutput);
    const indirectBlurred = this.bilateralFilter.Process(this.output, inputDepth, inputNormal);
    const upscaled = this.upscaler.Process(indirectBlurred, GPU.Renderer.width, GPU.Renderer.height);
    const ta = this.textureBlender.Process(upscaled, inputLight);
    GPU.RendererContext.CopyTextureToTextureV3({ texture: ta }, { texture: inputLight });
  }
}

export { SSGIRenderPass };
