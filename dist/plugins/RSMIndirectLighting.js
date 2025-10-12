import { RSMRenderPass } from '@trident/plugins/RSM.js';
import { BilateralFilter } from '@trident/plugins/BilateralFilter.js';
import { Debugger } from '@trident/plugins/Debugger.js';
import { UIFolder, UIButtonStat, UISliderStat } from '@trident/plugins/ui/UIStats.js';
import { TextureBlender } from '@trident/plugins/TextureBlender.js';
import { Upscaler } from '@trident/plugins/Upscaler.js';
import { GPU, Geometry, Components, Mathf } from '@trident/core';

class RSMIndirectLighting extends GPU.RenderPass {
  name = "RSMIndirectLighting";
  light;
  RSMGenerator;
  indirectLighting;
  bilateralFilter;
  textureBlender;
  upscaler;
  geometry;
  shader;
  enabled = true;
  showIndirect = false;
  RSM_RES;
  NUM_SAMPLES;
  SAMPLES_TEX_SIZE;
  constructor(light, RSM_RES, NUM_SAMPLES) {
    super();
    this.light = light;
    this.RSM_RES = RSM_RES;
    this.NUM_SAMPLES = NUM_SAMPLES;
    this.SAMPLES_TEX_SIZE = 1;
    while (this.SAMPLES_TEX_SIZE < this.NUM_SAMPLES) this.SAMPLES_TEX_SIZE *= 2;
    this.RSMGenerator = new RSMRenderPass(light, RSM_RES);
    this.bilateralFilter = new BilateralFilter();
    this.textureBlender = new TextureBlender();
    this.upscaler = new Upscaler();
    this.indirectLighting = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "rgba16float");
    const rsmFolder = new UIFolder(Debugger.ui, "RSM");
    rsmFolder.Open();
    new UIButtonStat(rsmFolder, "Enable", (state) => {
      this.enabled = state;
    }, this.enabled);
    new UIButtonStat(rsmFolder, "Show indirect", (state) => {
      this.showIndirect = state;
    }, this.showIndirect);
    new UISliderStat(rsmFolder, "Filter size:", 1, 32, 1, this.bilateralFilter.filterSize, (state) => {
      this.bilateralFilter.filterSize = state;
    });
    new UISliderStat(rsmFolder, "Depth threshold:", 0, 0.1, 1e-3, this.bilateralFilter.blurDepthThreshold, (state) => {
      this.bilateralFilter.blurDepthThreshold = state;
    });
    new UISliderStat(rsmFolder, "Normal threshold:", 0, 1, 0.01, this.bilateralFilter.blurNormalThreshold, (state) => {
      this.bilateralFilter.blurNormalThreshold = state;
    });
  }
  async init(resources) {
    await this.RSMGenerator.init(resources);
    await this.bilateralFilter.init(resources);
    await this.textureBlender.init(resources);
    await this.upscaler.init(resources);
    this.shader = await GPU.Shader.Create({
      code: `
            @group(0) @binding(1) var gDepthTex: texture_depth_2d;
            @group(0) @binding(2) var gNormalTex: texture_2d<f32>;
            
            @group(0) @binding(3) var rNormalTex: texture_2d<f32>;
            @group(0) @binding(4) var rWorldPosTex: texture_2d<f32>;
            @group(0) @binding(5) var rFluxTex: texture_2d<f32>;
            @group(0) @binding(6) var samplesTex: texture_2d<f32>;

            @group(0) @binding(7) var texSampler: sampler;
            @group(0) @binding(8) var samplerSampler: sampler;

            struct View {
                projectionOutputSize: vec4<f32>,
                viewPosition: vec4<f32>,
                projectionInverseMatrix: mat4x4<f32>,
                viewInverseMatrix: mat4x4<f32>,
                viewMatrix: mat4x4<f32>,
            };
            @group(0) @binding(9) var<storage, read> view: View;

            @group(0) @binding(10) var<storage, read> lightProjection: mat4x4<f32>;
            @group(0) @binding(11) var<storage, read> lightView: mat4x4<f32>;
            @group(0) @binding(12) var<storage, read> indirectLightAmount: f32;

            struct VertexInput {
                @builtin(instance_index) instanceIdx : u32, 
                @location(0) position : vec3<f32>,
                @location(1) normal : vec3<f32>,
                @location(2) uv : vec2<f32>,
            };
            
            struct VertexOutput {
                @builtin(position) position : vec4<f32>,
                @location(0) uv : vec2<f32>,
            };

            @vertex
            fn vertexMain(input: VertexInput) -> VertexOutput {
                var output : VertexOutput;
                output.position = vec4(input.position, 1.0);
                output.uv = input.uv;
                // output.uv = 0.5 * (input.position.xy + 1.0);
                return output;
            }
            
            fn reconstructWorldPosFromZ(
                coords: vec2<f32>,
                size: vec2<f32>,
                depthTexture: texture_depth_2d,
                projInverse: mat4x4<f32>,
                viewInverse: mat4x4<f32>
                ) -> vec4<f32> {
                let uv = coords.xy / size;
                var depth = textureLoad(depthTexture, vec2<i32>(floor(coords)), 0);
                let x = uv.x * 2.0 - 1.0;
                let y = (1.0 - uv.y) * 2.0 - 1.0;
                let projectedPos = vec4(x, y, depth, 1.0);
                var worldPosition = projInverse * projectedPos;
                worldPosition = vec4(worldPosition.xyz / worldPosition.w, 1.0);
                worldPosition = viewInverse * worldPosition;
                return worldPosition;
            }

            // const texelSize = 1.0 / f32(${this.RSM_RES});
            // const indirectLightAmount = 1.0;
            const sampleRadius = 0.1;

            fn mod289Vec4(x: vec4f) -> vec4f {
                return x - floor(x * (1.0 / 289.0))* 289.0;
            }
            fn perm(x: vec4f) -> vec4f {
                return mod289Vec4(((x * 34.0) + 1.0) * x) ;
            }
            fn noise(p: vec3f) -> f32{
                var a: vec3f = floor(p);
                var d: vec3f = p - a;
                d = d * d * (3.0 - 2.0 * d);
            
                var b: vec4f = a.xxyy +  vec4f(0.0, 1.0, 0.0, 1.0);
                var k1: vec4f = perm(b.xyxy);
                var k2: vec4f = perm(k1.xyxy + b.zzww);
            
                var c: vec4f = k2 + a.zzzz;
                var k3: vec4f = perm(c);
                var k4: vec4f = perm(c + 1.0);
            
                var o1: vec4f = fract(k3 * (1.0 / 41.0));
                var o2: vec4f = fract(k4 * (1.0 / 41.0));
            
                var o3: vec4f = o2 * d.z + o1 * (1.0 - d.z);
                var o4: vec2f = o3.yw * d.x + o3.xz * (1.0 - d.x);
            
                return o4.y * d.y + o4.x * (1.0 - d.y);
            }

            @fragment    
            fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
                let P = reconstructWorldPosFromZ(
                    input.position.xy,
                    view.projectionOutputSize.xy,
                    gDepthTex,
                    view.projectionInverseMatrix,
                    view.viewInverseMatrix
                ).xyz;

                let edgeArtifactCorrection: f32 = 0.1;

                // let P: vec3f = textureSample(rWorldPosTex, texSampler, input.uv).xyz;
                let N: vec3f = textureSample(gNormalTex, texSampler, input.uv).xyz;
                
                let _texPos: vec4f = (lightProjection * lightView * vec4(P, 1.0));
                var texPos: vec3f = _texPos.xyz / _texPos.w;

                var indirect: vec3f = vec3(0.0, 0.0, 0.0);
                texPos = texPos.xyz * 0.5 + 0.5;
                texPos.y = 1.0 - texPos.y;

                let noiseFactor = 100.0;
                var angle: f32 = noise(P * noiseFactor);
                var c: f32 = cos(angle);
                var s: f32 = sin(angle);

                for(var i = 0; i < i32(${this.NUM_SAMPLES}); i++) {
                    var rsmSample: vec3f = textureSample(samplesTex, samplerSampler, vec2f(f32(i) / f32(${this.SAMPLES_TEX_SIZE}), 0.0)).xyz;

                    // if (uniforms.rsmInfo2.y == 1.0){
                    rsmSample = vec3f(rsmSample.x * c + rsmSample.y * s, -rsmSample.x * s + rsmSample.y * c, rsmSample.z);
                    // }

                    let offset: vec2f = rsmSample.xy;
                    let weight: f32 = rsmSample.z;
              
                    let coords: vec2f = texPos.xy + offset * sampleRadius;

                    var vplPos: vec3f = textureSample(rWorldPosTex, texSampler, coords).xyz;
                    let vplNormal: vec3f = textureSample(rNormalTex, texSampler, coords).xyz;
                    let vplFlux: vec3f = textureSample(rFluxTex, texSampler, coords).xyz;

                    vplPos -= vplNormal * edgeArtifactCorrection;

                    let dist2: f32 = dot(vplPos - P, vplPos - P);
                    indirect += vplFlux * weight * max(0., dot(N, vplPos - P)) * max(0., dot(vplNormal, P - vplPos)) / (dist2 * dist2);
                }

                let indirectLight = clamp(indirect * indirectLightAmount * 0.01, vec3f(0.0), vec3f(1.0));
                return vec4(indirectLight, 1.0);
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
        gDepthTex: { group: 0, binding: 1, type: "depthTexture" },
        gNormalTex: { group: 0, binding: 2, type: "texture" },
        rNormalTex: { group: 0, binding: 3, type: "texture" },
        rWorldPosTex: { group: 0, binding: 4, type: "texture" },
        rFluxTex: { group: 0, binding: 5, type: "texture" },
        samplesTex: { group: 0, binding: 6, type: "texture" },
        texSampler: { group: 0, binding: 7, type: "sampler" },
        samplerSampler: { group: 0, binding: 8, type: "sampler-non-filterable" },
        view: { group: 0, binding: 9, type: "storage" },
        lightProjection: { group: 0, binding: 10, type: "storage" },
        lightView: { group: 0, binding: 11, type: "storage" },
        indirectLightAmount: { group: 0, binding: 12, type: "storage" }
      }
    });
    this.geometry = Geometry.Plane();
    function generateSampleTexture(maxSamples) {
      const data = new Float32Array(maxSamples * 4);
      for (let i = 0; i < maxSamples; i++) {
        const xi1 = Math.random();
        const xi2 = Math.random();
        const x = xi1 * Math.sin(2 * Math.PI * xi2);
        const y = xi1 * Math.cos(2 * Math.PI * xi2);
        data[i * 4 + 0] = x;
        data[i * 4 + 1] = y;
        data[i * 4 + 2] = xi1 * xi1;
        data[i * 4 + 3] = 1;
      }
      return data;
    }
    const dat = generateSampleTexture(this.SAMPLES_TEX_SIZE);
    const samplesTexture = GPU.Texture.Create(this.SAMPLES_TEX_SIZE, 1, 1, "rgba32float");
    console.log(this.SAMPLES_TEX_SIZE);
    samplesTexture.SetData(new Float32Array(dat));
    this.shader.SetTexture("samplesTex", samplesTexture);
    this.shader.SetSampler("texSampler", GPU.TextureSampler.Create());
    this.shader.SetSampler("samplerSampler", GPU.TextureSampler.Create({ minFilter: "nearest", magFilter: "nearest", mipmapFilter: "nearest", addressModeU: "repeat", addressModeV: "repeat" }));
  }
  async execute(resources, ...args) {
    if (this.enabled === false) return;
    this.RSMGenerator.execute(resources);
    const lightingTex = resources.getResource(GPU.PassParams.LightingPassOutput);
    const gDepthTex = resources.getResource(GPU.PassParams.GBufferDepth);
    const gNormalTex = resources.getResource(GPU.PassParams.GBufferNormal);
    const rNormalTex = this.RSMGenerator.rsmNormal;
    const rWorldPosTex = this.RSMGenerator.rsmWorldPosition;
    const rFluxTex = this.RSMGenerator.rsmFlux;
    this.shader.SetTexture("gDepthTex", gDepthTex);
    this.shader.SetTexture("gNormalTex", gNormalTex);
    this.shader.SetTexture("rNormalTex", rNormalTex);
    this.shader.SetTexture("rWorldPosTex", rWorldPosTex);
    this.shader.SetTexture("rFluxTex", rFluxTex);
    const camera = Components.Camera.mainCamera;
    const view = new Float32Array(4 + 4 + 16 + 16 + 16);
    view.set([GPU.Renderer.width, GPU.Renderer.height, 0], 0);
    view.set(camera.transform.position.elements, 4);
    const tempMatrix = new Mathf.Matrix4();
    tempMatrix.copy(camera.projectionMatrix).invert();
    view.set(tempMatrix.elements, 8);
    tempMatrix.copy(camera.viewMatrix).invert();
    view.set(tempMatrix.elements, 24);
    view.set(camera.viewMatrix.elements, 40);
    this.shader.SetArray("view", view);
    this.shader.SetMatrix4("lightProjection", this.light.camera.projectionMatrix);
    this.shader.SetMatrix4("lightView", this.light.camera.viewMatrix);
    this.shader.SetValue("indirectLightAmount", this.light.intensity);
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.indirectLighting, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    const indirectBlurred = this.bilateralFilter.Process(this.indirectLighting, gDepthTex, gNormalTex);
    const ta = this.textureBlender.Process(indirectBlurred, lightingTex);
    resources.setResource(GPU.PassParams.LightingPassOutput, ta);
    if (this.showIndirect) {
      resources.setResource(GPU.PassParams.LightingPassOutput, indirectBlurred);
    }
  }
}

export { RSMIndirectLighting };
