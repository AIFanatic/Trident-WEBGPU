import { GPU, Renderer, Components, Component, Geometry, IndexAttribute, VertexAttribute } from '@trident/core';
import { DataBackedBuffer } from '@trident/plugins/DataBackedBuffer.js';

const WaterPassWGSL = "./resources/WaterPass.wgsl";
const uv_sampler_texture_url = "./resources/textures/Water_UV.png";
const normalmap_a_sampler_texture_url = "./resources/textures/Water_N_A.png";
const normalmap_b_sampler_texture_url = "./resources/textures/Water_N_B.png";
const foam_sampler_texture_url = "./resources/textures/Foam.png";
function PlaneGeometry(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
  const width_half = width / 2;
  const height_half = height / 2;
  const gridX = Math.floor(widthSegments);
  const gridY = Math.floor(heightSegments);
  const gridX1 = gridX + 1;
  const gridY1 = gridY + 1;
  const segment_width = width / gridX;
  const segment_height = height / gridY;
  const indices = [];
  const vertices = [];
  for (let iy = 0; iy < gridY1; iy++) {
    const y = iy * segment_height - height_half;
    for (let ix = 0; ix < gridX1; ix++) {
      const x = ix * segment_width - width_half;
      vertices.push(x, -y, 0);
    }
  }
  for (let iy = 0; iy < gridY; iy++) {
    for (let ix = 0; ix < gridX; ix++) {
      const a = ix + gridX1 * iy;
      const b = ix + gridX1 * (iy + 1);
      const c = ix + 1 + gridX1 * (iy + 1);
      const d = ix + 1 + gridX1 * iy;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }
  const geometry = new Geometry();
  geometry.index = new IndexAttribute(new Uint32Array(indices));
  geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
  return geometry;
}
class WaterRenderPass extends GPU.RenderPass {
  name = "WaterRenderPass";
  albedoClone;
  depthClone;
  waterShader;
  // public readonly settings: DataBackedBuffer<WaterSettings>;
  waterGeometries;
  waterSettingsBuffer;
  constructor() {
    super({
      inputs: [
        GPU.PassParams.MainCamera,
        GPU.PassParams.GBufferAlbedo,
        GPU.PassParams.GBufferNormal,
        GPU.PassParams.GBufferERMO,
        GPU.PassParams.GBufferDepth
      ],
      outputs: []
    });
    this.waterGeometries = /* @__PURE__ */ new Map();
  }
  async init(resources) {
    this.waterShader = await GPU.Shader.Create({
      // code: await Assets.Load("./WaterPass.wgsl", "json"),
      code: await GPU.ShaderLoader.LoadURL(new URL(WaterPassWGSL, import.meta.url)),
      colorOutputs: [
        { format: "rgba16float" },
        { format: "rgba16float" },
        { format: "rgba16float" }
      ],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        viewMatrix: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 0, binding: 2, type: "storage" },
        cameraPosition: { group: 0, binding: 3, type: "storage" },
        TIME: { group: 0, binding: 4, type: "storage" },
        INV_PROJECTION_MATRIX: { group: 0, binding: 5, type: "storage" },
        INV_VIEW_MATRIX: { group: 0, binding: 6, type: "storage" },
        uv_sampler: { group: 1, binding: 0, type: "texture" },
        normalmap_a_sampler: { group: 1, binding: 1, type: "texture" },
        normalmap_b_sampler: { group: 1, binding: 2, type: "texture" },
        foam_sampler: { group: 1, binding: 3, type: "texture" },
        SCREEN_TEXTURE: { group: 1, binding: 4, type: "texture" },
        DEPTH_TEXTURE: { group: 1, binding: 5, type: "depthTexture" },
        texture_sampler: { group: 1, binding: 6, type: "sampler" },
        waveSettings: { group: 1, binding: 7, type: "storage" }
      }
    });
    const uv_sampler_texture = await GPU.Texture.Load(new URL(uv_sampler_texture_url, import.meta.url));
    const normalmap_a_sampler_texture = await GPU.Texture.Load(new URL(normalmap_a_sampler_texture_url, import.meta.url));
    const normalmap_b_sampler_texture = await GPU.Texture.Load(new URL(normalmap_b_sampler_texture_url, import.meta.url));
    const foam_sampler_texture = await GPU.Texture.Load(new URL(foam_sampler_texture_url, import.meta.url));
    this.waterShader.SetTexture("uv_sampler", uv_sampler_texture);
    this.waterShader.SetTexture("normalmap_a_sampler", normalmap_a_sampler_texture);
    this.waterShader.SetTexture("normalmap_b_sampler", normalmap_b_sampler_texture);
    this.waterShader.SetTexture("foam_sampler", foam_sampler_texture);
    this.waterShader.SetSampler("texture_sampler", GPU.TextureSampler.Create());
    this.albedoClone = GPU.RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.depthClone = GPU.DepthTexture.Create(Renderer.width, Renderer.height);
    this.waterSettingsBuffer = GPU.Buffer.Create(14 * 4 * 4, GPU.BufferType.STORAGE);
    this.waterShader.SetBuffer("waveSettings", this.waterSettingsBuffer);
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Components.Camera.mainCamera.gameObject.scene;
    const meshes = scene.GetComponents(Components.Mesh);
    if (meshes.length === 0) return;
    const inputCamera = Components.Camera.mainCamera;
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const backgroundColor = inputCamera.backgroundColor;
    const currentAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const currentDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!currentAlbedo || !currentDepth) return;
    GPU.RendererContext.CopyTextureToTexture(currentAlbedo, this.albedoClone);
    GPU.RendererContext.CopyTextureToTexture(currentDepth, this.depthClone);
    const inputGBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
    const inputGBufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    GPU.RendererContext.BeginRenderPass(
      this.name,
      [
        { target: inputGBufferAlbedo, clear: false, color: backgroundColor },
        { target: inputGBufferNormal, clear: false, color: backgroundColor },
        { target: inputGBufferERMO, clear: false, color: backgroundColor }
      ],
      { target: inputGBufferDepth, clear: false },
      true
    );
    const projectionMatrix = inputCamera.projectionMatrix;
    const viewMatrix = inputCamera.viewMatrix;
    this.waterShader.SetTexture("SCREEN_TEXTURE", this.albedoClone);
    this.waterShader.SetTexture("DEPTH_TEXTURE", this.depthClone);
    this.waterShader.SetValue("TIME", performance.now() / 1e3);
    this.waterShader.SetMatrix4("projectionMatrix", projectionMatrix);
    this.waterShader.SetMatrix4("INV_PROJECTION_MATRIX", projectionMatrix.clone().invert());
    this.waterShader.SetMatrix4("viewMatrix", viewMatrix);
    this.waterShader.SetMatrix4("INV_VIEW_MATRIX", viewMatrix.clone().invert());
    this.waterShader.SetVector3("cameraPosition", inputCamera.transform.position);
    for (const [geometry, waterInfo] of this.waterGeometries) {
      this.waterShader.SetBuffer("waveSettings", waterInfo.settings.buffer);
      this.waterShader.SetMatrix4("modelMatrix", waterInfo.transform.localToWorldMatrix);
      GPU.RendererContext.DrawGeometry(geometry, this.waterShader, 1);
    }
    GPU.RendererContext.EndRenderPass();
  }
}
class Water extends Component {
  settings;
  // Hack
  static WaterRenderPass;
  geometry;
  constructor(gameObject) {
    super(gameObject);
    if (!Water.WaterRenderPass) {
      Water.WaterRenderPass = new WaterRenderPass();
      this.gameObject.scene.renderPipeline.AddPass(Water.WaterRenderPass, GPU.RenderPassOrder.AfterGBuffer);
    }
    this.geometry = PlaneGeometry(128, 128, 256, 256);
    this.geometry.enableShadows = false;
    this.settings = new DataBackedBuffer({
      wave_speed: [0.5, 0, 0, 0],
      wave_a: [1, 0.4, 0.35, 3],
      wave_b: [-0.1, 0.6, 0.3, 1.55],
      wave_c: [-1, -0.8, 0.25, 0.9],
      sampler_scale: [0.25, 0.25, 0, 0],
      sampler_direction: [0.05, 0.04, 0, 0],
      uv_sampler_scale: [0.25, 0.25, 0, 0],
      uv_sampler_strength: [0.04, 0, 0, 0],
      foam_level: [0.75, 0, 0, 0],
      refraction: [0.075, 0, 0, 0],
      color_deep: [0.25, 1, 1.25, 1],
      color_shallow: [0.4, 0.9, 1, 1],
      beers_law: [2, 0, 0, 0],
      depth_offset: [-0.75, 0, 0, 0]
    });
    Water.WaterRenderPass.waterGeometries.set(this.geometry, {
      settings: this.settings,
      transform: this.transform
    });
  }
}

export { Water };
