import { GPU, Geometry, EventSystem, Scene, Components, Renderer } from '@trident/core';
import { UIFolder, UITextStat, UIDropdownStat } from '@trident/plugins/ui/UIStats.js';

var ViewTypes = /* @__PURE__ */ ((ViewTypes2) => {
  ViewTypes2[ViewTypes2["Lighting"] = 0] = "Lighting";
  ViewTypes2[ViewTypes2["Albedo"] = 1] = "Albedo";
  ViewTypes2[ViewTypes2["Normal"] = 2] = "Normal";
  ViewTypes2[ViewTypes2["Metalness"] = 3] = "Metalness";
  ViewTypes2[ViewTypes2["Roughness"] = 4] = "Roughness";
  ViewTypes2[ViewTypes2["Emissive"] = 5] = "Emissive";
  return ViewTypes2;
})(ViewTypes || {});
class DebuggerRenderPass extends GPU.RenderPass {
  name = "DebuggerRenderPass";
  currentViewType = 0 /* Lighting */;
  geometry;
  shader;
  constructor() {
    super({});
  }
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                    @location(1) normal : vec3<f32>,
                    @location(2) uv : vec2<f32>,
                };
                
                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                    @location(1) uv : vec2<f32>,
                };

                @group(0) @binding(0) var inputTexture: texture_2d<f32>;
                @group(0) @binding(1) var inputSampler: sampler;
                
                @group(0) @binding(2) var<storage, read> viewType: f32;
                
                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;
                    output.position = vec4(input.position, 1.0);
                    output.uv = input.uv;
                    return output;
                }
                
                struct FragmentOutput {
                    @location(0) albedo : vec4f,
                };
                
                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
                    var color = textureSample(inputTexture, inputSampler, input.uv);
                    if (u32(viewType) == 0) {} // Lighting
                    else if (u32(viewType) == 1) {} // Albedo
                    else if (u32(viewType) == 2) {} // Normal
                    else if (u32(viewType) == 3) { color = vec4(color.a); } // Metalness
                    else if (u32(viewType) == 4) { color = vec4(color.a); } // Roughness
                    else if (u32(viewType) == 5) { color = vec4(color.rgb, 1.0); } // Emissive
                    return vec4(color.rgb, 1.0);
                }
            `,
      colorOutputs: [{ format: "rgba16float" }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        inputTexture: { group: 0, binding: 0, type: "texture" },
        inputSampler: { group: 0, binding: 1, type: "sampler" },
        viewType: { group: 0, binding: 2, type: "storage" }
      }
    });
    this.geometry = Geometry.Plane();
    this.shader.SetSampler("inputSampler", GPU.TextureSampler.Create());
    this.initialized = true;
  }
  execute(resources, ...args) {
    if (this.currentViewType === 0 /* Lighting */) return;
    const GBufferAlbedo = resources.getResource(GPU.PassParams.GBufferAlbedo);
    const GBufferNormal = resources.getResource(GPU.PassParams.GBufferNormal);
    const GBufferERMO = resources.getResource(GPU.PassParams.GBufferERMO);
    const lightingOutput = resources.getResource(GPU.PassParams.LightingPassOutput);
    this.shader.SetTexture("inputTexture", GBufferAlbedo);
    if (this.currentViewType === 1 /* Albedo */) this.shader.SetTexture("inputTexture", GBufferAlbedo);
    else if (this.currentViewType === 2 /* Normal */) this.shader.SetTexture("inputTexture", GBufferNormal);
    else if (this.currentViewType === 3 /* Metalness */) this.shader.SetTexture("inputTexture", GBufferAlbedo);
    else if (this.currentViewType === 4 /* Roughness */) this.shader.SetTexture("inputTexture", GBufferNormal);
    else if (this.currentViewType === 5 /* Emissive */) this.shader.SetTexture("inputTexture", GBufferERMO);
    this.shader.SetValue("viewType", this.currentViewType);
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: lightingOutput, clear: true }]);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
  }
}
class _Debugger {
  ui;
  container;
  rendererFolder;
  fps;
  triangleCount;
  visibleTriangles;
  cpuTime;
  gpuTime;
  gpuBufferSizeStat;
  gpuTextureSizeStat;
  bindGroupLayoutsStat;
  bindGroupsStat;
  compiledShadersStat;
  drawCallsStat;
  viewTypeStat;
  // private heightScale: UISliderStat;
  // private useHeightMapStat: UIButtonStat;
  // public heightScaleValue: UITextStat;
  // public useHeightMapValue: boolean = false;
  gpuBufferSizeTotal;
  gpuTextureSizeTotal;
  visibleObjectsStat;
  renderPassesFolder;
  framePassesStats = /* @__PURE__ */ new Map();
  constructor() {
    this.container = document.createElement("div");
    this.container.classList.add("stats-panel");
    document.body.append(this.container);
    this.ui = new UIFolder(this.container, "Debugger");
    this.ui.Open();
    this.rendererFolder = new UIFolder(this.ui, "Renderer");
    this.rendererFolder.Open();
    this.fps = new UITextStat(this.rendererFolder, "FPS", 0, 2, "", true);
    this.triangleCount = new UITextStat(this.rendererFolder, "Triangles: ");
    this.visibleTriangles = new UITextStat(this.rendererFolder, "Visible triangles: ");
    this.cpuTime = new UITextStat(this.rendererFolder, "CPU: ", 0, 2, "ms", true);
    this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
    this.gpuBufferSizeTotal = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
    this.gpuTextureSizeTotal = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 2);
    this.bindGroupLayoutsStat = new UITextStat(this.rendererFolder, "Bind group layouts: ");
    this.bindGroupsStat = new UITextStat(this.rendererFolder, "Bind groups: ");
    this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
    this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");
    this.visibleObjectsStat = new UITextStat(this.rendererFolder, "Visible objects: ");
    const debuggerRenderPass = new DebuggerRenderPass();
    EventSystem.on(Scene.Events.OnStarted, (scene) => {
      const mainCamera = Components.Camera.mainCamera;
      mainCamera.gameObject.scene.renderPipeline.AddPass(debuggerRenderPass, GPU.RenderPassOrder.AfterLighting);
    });
    this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Final output:", Object.values(ViewTypes).filter((value) => typeof value === "string"), (index, value) => {
      debuggerRenderPass.currentViewType = index;
    }, 0);
    this.renderPassesFolder = new UIFolder(this.rendererFolder, "Frame passes");
    this.renderPassesFolder.Open();
    setInterval(() => {
      this.Update();
    }, 100);
  }
  Update() {
    this.fps.SetValue(Renderer.info.fps);
    this.triangleCount.SetValue(Renderer.info.triangleCount);
    this.visibleTriangles.SetValue(Renderer.info.visibleTriangles);
    this.cpuTime.SetValue(Renderer.info.cpuTime);
    this.gpuBufferSizeTotal.SetValue(Renderer.info.gpuBufferSizeTotal);
    this.gpuTextureSizeTotal.SetValue(Renderer.info.gpuTextureSizeTotal);
    this.bindGroupLayoutsStat.SetValue(Renderer.info.bindGroupLayoutsStat);
    this.bindGroupsStat.SetValue(Renderer.info.bindGroupsStat);
    this.drawCallsStat.SetValue(Renderer.info.drawCallsStat);
    this.compiledShadersStat.SetValue(Renderer.info.compiledShadersStat);
    this.visibleObjectsStat.SetValue(Renderer.info.visibleObjects);
    let totalGPUTime = 0;
    for (const [framePassName, framePassValue] of Renderer.info.framePassesStats) {
      let framePassStat = this.framePassesStats.get(framePassName);
      if (framePassStat === void 0) {
        framePassStat = new UITextStat(this.renderPassesFolder, framePassName, 0, 2, "ms", true);
        this.framePassesStats.set(framePassName, framePassStat);
      }
      totalGPUTime += framePassValue;
      framePassStat.SetValue(framePassValue);
    }
    this.gpuTime.SetValue(totalGPUTime);
  }
  Enable() {
    this.container.style.display = "";
  }
  Disable() {
    console.log("Running", this.container);
    this.container.style.display = "none";
  }
  static getInstance() {
    const g = globalThis;
    if (!g.__DebuggerInstance) {
      g.__DebuggerInstance = new _Debugger();
    }
    return g.__DebuggerInstance;
  }
}
const Debugger = _Debugger.getInstance();

export { Debugger };
