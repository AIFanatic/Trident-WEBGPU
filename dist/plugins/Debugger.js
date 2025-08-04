import { Renderer } from '@trident/core';
import { UIFolder, UITextStat } from '@trident/plugins/ui/UIStats.js';

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
  // private viewTypeStat: UIDropdownStat;
  // private heightScale: UISliderStat;
  // private useHeightMapStat: UIButtonStat;
  viewTypeValue;
  // public heightScaleValue: UITextStat;
  // public useHeightMapValue: boolean = false;
  gpuBufferSizeTotal;
  gpuTextureSizeTotal;
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
