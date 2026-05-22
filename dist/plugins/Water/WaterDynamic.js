import { GPU, Runtime, Renderer, Geometry, Component, IndexAttribute, VertexAttribute } from '@trident/core';

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
  const normals = [];
  const uvs = [];
  for (let iy = 0; iy < gridY1; iy++) {
    const y = iy * segment_height - height_half;
    for (let ix = 0; ix < gridX1; ix++) {
      const x = ix * segment_width - width_half;
      vertices.push(x, -y, 0);
      normals.push(0, 0, 1);
      uvs.push(ix / gridX);
      uvs.push(1 - iy / gridY);
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
  geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
  geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
  return geometry;
}
const WaterSimulateWGSL = "./resources/WaterSimulate.wgsl";
const WaterRenderWGSL = "./resources/WaterRender.wgsl";
const old_collision_texture_url = "./resources/textures/old_collision_texture.png";
const collision_texture_url = "./resources/textures/collision_texture.png";
const uv_sampler_texture_url = "./resources/textures/Water_UV.png";
const normalmap_a_sampler_texture_url = "./resources/textures/Water_N_C.png";
const normalmap_b_sampler_texture_url = "./resources/textures/Water_N_B.png";
class WaterRenderPass extends GPU.RenderPass {
  name = "WaterRenderPass";
  collisionTexture;
  // Input collisions/land
  oldSimulationTexture;
  // Output
  simulationTexture;
  // Output
  simulationTextureRenderTarget;
  // Output
  simulateShader;
  renderShader;
  waterGeometries = [];
  quad;
  albedoClone;
  depthClone;
  async init(resources) {
    Runtime.Renderer.RenderPipeline.GBufferFormat;
    this.simulateShader = await GPU.Shader.Create({
      code: await GPU.ShaderLoader.LoadURL(new URL(WaterSimulateWGSL, import.meta.url)),
      colorOutputs: [{ format: "rgba16float" }]
    });
    const gbufferFormat = GPU.RenderingPipeline.GBufferFormat;
    this.renderShader = await GPU.Shader.Create({
      code: await GPU.ShaderLoader.LoadURL(new URL(WaterRenderWGSL, import.meta.url)),
      colorOutputs: [{ format: gbufferFormat }, { format: gbufferFormat }, { format: gbufferFormat }],
      depthOutput: "depth24plus",
      cullMode: "none"
    });
    const old_collision_texture = await GPU.Texture.Load(new URL(old_collision_texture_url, import.meta.url));
    const collision_texture = await GPU.Texture.Load(new URL(collision_texture_url, import.meta.url));
    const res = 512;
    const sampler = new GPU.TextureSampler({ addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    this.simulationTexture = GPU.RenderTexture.Create(res, res, 1, "rgba16float");
    this.oldSimulationTexture = GPU.RenderTexture.Create(res, res, 1, "rgba16float");
    this.simulationTextureRenderTarget = GPU.RenderTexture.Create(res, res, 1, "rgba16float");
    this.simulateShader.SetSampler("texture_sampler", sampler);
    this.simulateShader.SetTexture("z_tex", this.simulationTexture);
    this.simulateShader.SetTexture("old_z_tex", this.oldSimulationTexture);
    this.simulateShader.SetTexture("collision_texture", collision_texture);
    this.simulateShader.SetTexture("old_collision_texture", old_collision_texture);
    this.renderShader.SetSampler("texture_sampler", new GPU.TextureSampler());
    this.renderShader.SetTexture("uv_sampler", await GPU.Texture.Load(new URL(uv_sampler_texture_url, import.meta.url)));
    this.renderShader.SetTexture("normalmap_a_sampler", await GPU.Texture.Load(new URL(normalmap_a_sampler_texture_url, import.meta.url)));
    this.renderShader.SetTexture("normalmap_b_sampler", await GPU.Texture.Load(new URL(normalmap_b_sampler_texture_url, import.meta.url)));
    this.albedoClone = GPU.Texture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.depthClone = GPU.DepthTexture.Create(Renderer.width, Renderer.height);
    this.quad = Geometry.Plane();
    this.initialized = true;
  }
  async execute(resources) {
    if (!this.initialized) return;
    const FrameBuffer = resources.getResource(GPU.PassParams.FrameBuffer);
    const currentLightingPass = resources.getResource(GPU.PassParams.LightingPassOutput);
    const currentAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const currentNormal = resources.getResource(GPU.PassParams.GBufferNormal);
    const currentERMO = resources.getResource(GPU.PassParams.GBufferERMO);
    const currentDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!currentLightingPass || !currentDepth) return;
    const params = new Float32Array([
      512,
      0,
      0,
      0,
      performance.now() / 1e3,
      0,
      0,
      0
    ]);
    this.simulateShader.SetArray("params", params);
    this.renderShader.SetArray("params", params);
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.simulationTextureRenderTarget, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.quad, this.simulateShader);
    GPU.RendererContext.EndRenderPass();
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.simulationTexture }, { texture: this.oldSimulationTexture });
    GPU.RendererContext.CopyTextureToTextureV3({ texture: this.simulationTextureRenderTarget }, { texture: this.simulationTexture });
    this.renderShader.SetBuffer("frameBuffer", FrameBuffer);
    this.renderShader.SetTexture("simulation_texture", this.simulationTexture);
    GPU.RendererContext.CopyTextureToTextureV3({ texture: currentAlbedo }, { texture: this.albedoClone });
    GPU.RendererContext.CopyTextureToTextureV3({ texture: currentDepth }, { texture: this.depthClone });
    this.renderShader.SetTexture("DEPTH_TEXTURE", this.depthClone);
    this.renderShader.SetTexture("SCREEN_TEXTURE", this.albedoClone);
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: currentAlbedo, clear: false }, { target: currentNormal, clear: false }, { target: currentERMO, clear: false }], { target: currentDepth, clear: false }, true);
    for (const water of this.waterGeometries) {
      this.renderShader.SetMatrix4("modelMatrix", water.transform.localToWorldMatrix);
      GPU.RendererContext.DrawGeometry(water.geometry, this.renderShader);
    }
    GPU.RendererContext.EndRenderPass();
  }
}
class WaterDynamic extends Component {
  static type = "@trident/plugins/Water";
  // TODO: Hack, fix
  static WaterRenderPass;
  static WaterRenderPassScene;
  geometry;
  constructor(gameObject) {
    super(gameObject);
    if (!WaterDynamic.WaterRenderPass || WaterDynamic.WaterRenderPassScene !== gameObject.scene) {
      WaterDynamic.WaterRenderPass = new WaterRenderPass();
      WaterDynamic.WaterRenderPassScene = gameObject.scene;
      Runtime.Renderer.RenderPipeline.AddPass(WaterDynamic.WaterRenderPass, GPU.RenderPassOrder.BeforeLighting);
    }
    this.geometry = PlaneGeometry(1, 1, 256, 256);
    WaterDynamic.WaterRenderPass.waterGeometries.push({ geometry: this.geometry, transform: this.transform });
  }
}

export { WaterDynamic };
