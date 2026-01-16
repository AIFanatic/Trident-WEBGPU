import { Component, Mathf, Geometry, GPU, Components } from '@trident/core';
import { Irradiance } from './Irradiance.js';
import { Prefilter } from './Prefilter.js';

class IBLProbeVolume extends Component {
  static type = "@trident/plugins/Environment/IBLProbeVolume";
  center = new Mathf.Vector3(0, 0, 0);
  radius = 5;
  fade = 1;
  // smooth transition thickness
  maxBlend = 1;
  // 0..1 scale
  probeTexture;
  probeIrradiance;
  probePrefilter;
  skyIrradiance;
  skyPrefilter;
  blendedIrradiance;
  blendedPrefilter;
  quad;
  sampler;
  blendShader;
  faceBuffer;
  mipBlendBuffer;
  lastWeight = -1;
  ready = false;
  constructor(gameObject, probeTexture) {
    super(gameObject);
    this.probeTexture = probeTexture;
    this.init();
  }
  SetVolume(center, radius, fade = 1, maxBlend = 1) {
    this.center.copy(center);
    this.radius = radius;
    this.fade = fade;
    this.maxBlend = maxBlend;
  }
  async init() {
    const irradiance = new Irradiance();
    const prefilter = new Prefilter();
    await irradiance.init();
    await prefilter.init();
    irradiance.Update(this.probeTexture);
    prefilter.Update(this.probeTexture);
    this.probeIrradiance = irradiance.irradianceTexture;
    this.probePrefilter = prefilter.prefilterTexture;
    this.quad = Geometry.Plane();
    this.sampler = GPU.TextureSampler.Create({
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    this.faceBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    this.mipBlendBuffer = GPU.Buffer.Create(4 * 4, GPU.BufferType.STORAGE);
    this.blendShader = await GPU.Shader.Create({
      code: `
                  @group(0) @binding(0) var cubeSampler: sampler;
                  @group(0) @binding(1) var cubeA: texture_cube<f32>;
                  @group(0) @binding(2) var cubeB: texture_cube<f32>;
                  @group(0) @binding(3) var<storage, read> face: vec4<f32>;
                  @group(0) @binding(4) var<storage, read> mipBlend: vec4<f32>; // x=mip, y=blend

                  struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

                  @vertex
                  fn vertexMain(@location(0) position: vec3f) -> VSOut {
                      var o: VSOut;
                      o.pos = vec4f(position.xy, 0.0, 1.0);
                      o.uv = position.xy; // [-1,1]
                      return o;
                  }

                  fn dirFromFaceUV(face: u32, x: f32, y: f32) -> vec3f {
                      let u = x; let v = y;
                      switch face {
                      case 0u { return normalize(vec3( 1.0,  v, -u)); }
                      case 1u { return normalize(vec3(-1.0,  v,  u)); }
                      case 2u { return normalize(vec3( u,  1.0, -v)); }
                      case 3u { return normalize(vec3( u, -1.0,  v)); }
                      case 4u { return normalize(vec3( u,  v,  1.0)); }
                      default { return normalize(vec3(-u,  v, -1.0)); }
                      }
                  }

                  @fragment
                  fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
                      let dir = dirFromFaceUV(u32(face.x), uv.x, uv.y);
                      let mip = mipBlend.x;
                      let blend = mipBlend.y;

                      let a = textureSampleLevel(cubeA, cubeSampler, dir, mip).rgb;
                      let b = textureSampleLevel(cubeB, cubeSampler, dir, mip).rgb;

                      return vec4f(mix(a, b, blend), 1.0);
                  }
              `,
      attributes: { position: { location: 0, size: 3, type: "vec3" } },
      uniforms: {
        cubeSampler: { group: 0, binding: 0, type: "sampler" },
        cubeA: { group: 0, binding: 1, type: "texture" },
        cubeB: { group: 0, binding: 2, type: "texture" },
        face: { group: 0, binding: 3, type: "storage" },
        mipBlend: { group: 0, binding: 4, type: "storage" }
      },
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.blendShader.SetSampler("cubeSampler", this.sampler);
    this.blendShader.SetBuffer("face", this.faceBuffer);
    this.blendShader.SetBuffer("mipBlend", this.mipBlendBuffer);
    this.ready = true;
  }
  Update() {
    if (!this.ready) return;
    if (!Components.Camera.mainCamera) return;
    const scene = this.gameObject.scene;
    if (!scene.renderPipeline.skyboxIrradiance || !scene.renderPipeline.skyboxPrefilter) return;
    if (!this.skyIrradiance || !this.skyPrefilter) {
      this.skyIrradiance = scene.renderPipeline.skyboxIrradiance;
      this.skyPrefilter = scene.renderPipeline.skyboxPrefilter;
    }
    const dist = Components.Camera.mainCamera.transform.position.distanceTo(this.center);
    let weight = 0;
    if (this.radius > 0) {
      if (this.fade <= 0) {
        weight = dist < this.radius ? 1 : 0;
      } else {
        const t = Math.min(Math.max((this.radius - dist) / this.fade, 0), 1);
        weight = t * t * (3 - 2 * t);
      }
    }
    weight = Math.min(Math.max(weight * this.maxBlend, 0), 1);
    if (Math.abs(weight - this.lastWeight) < 0.01) return;
    this.lastWeight = weight;
    if (weight <= 0) {
      scene.renderPipeline.skyboxIrradiance = this.skyIrradiance;
      scene.renderPipeline.skyboxPrefilter = this.skyPrefilter;
      return;
    }
    if (weight >= 1) {
      scene.renderPipeline.skyboxIrradiance = this.probeIrradiance;
      scene.renderPipeline.skyboxPrefilter = this.probePrefilter;
      return;
    }
    this.ensureBlendTargets();
    this.blendCube(this.blendedIrradiance, this.skyIrradiance, this.probeIrradiance, weight);
    this.blendCube(this.blendedPrefilter, this.skyPrefilter, this.probePrefilter, weight);
    scene.renderPipeline.skyboxIrradiance = this.blendedIrradiance;
    scene.renderPipeline.skyboxPrefilter = this.blendedPrefilter;
  }
  ensureBlendTargets() {
    if (!this.blendedIrradiance) {
      this.blendedIrradiance = GPU.RenderTextureCube.Create(
        this.skyIrradiance.width,
        this.skyIrradiance.height,
        6,
        this.skyIrradiance.format,
        1
      );
    }
    if (!this.blendedPrefilter) {
      this.blendedPrefilter = GPU.RenderTextureCube.Create(
        this.skyPrefilter.width,
        this.skyPrefilter.height,
        6,
        this.skyPrefilter.format,
        this.skyPrefilter.mipLevels
      );
    }
  }
  blendCube(target, a, b, blend) {
    this.blendShader.SetTexture("cubeA", a);
    this.blendShader.SetTexture("cubeB", b);
    const mipCount = target.mipLevels || 1;
    for (let mip = 0; mip < mipCount; mip++) {
      const width = target.width >> mip;
      const height = target.height >> mip;
      this.mipBlendBuffer.SetArray(new Float32Array([mip, blend, 0, 0]));
      for (let face = 0; face < 6; face++) {
        this.faceBuffer.SetArray(new Float32Array([face, 0, 0, 0]));
        GPU.Renderer.BeginRenderFrame();
        target.SetActiveLayer(face);
        target.SetActiveMip(mip);
        target.SetActiveMipCount(1);
        GPU.RendererContext.BeginRenderPass(`IBLProbeBlend_${mip}_${face}`, [{ target, clear: true }]);
        GPU.RendererContext.SetViewport(0, 0, width, height, 0, 1);
        GPU.RendererContext.DrawGeometry(this.quad, this.blendShader);
        GPU.RendererContext.EndRenderPass();
        GPU.Renderer.EndRenderFrame();
      }
    }
    target.SetActiveMip(0);
    target.SetActiveMipCount(mipCount);
  }
}

export { IBLProbeVolume };
