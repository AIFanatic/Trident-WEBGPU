class RendererInfo {
  fps = 0;
  triangleCount = 0;
  visibleTriangles = 0;
  cpuTime = 0;
  bindGroupLayoutsStat = 0;
  bindGroupsStat = 0;
  compiledShadersStat = 0;
  drawCallsStat = 0;
  gpuBufferSizeTotal = 0;
  gpuTextureSizeTotal = 0;
  visibleObjects = 0;
  framePassesStats = /* @__PURE__ */ new Map();
  SetPassTime(name, time) {
    this.framePassesStats.set(name, time / 1e6);
  }
  ResetFrame() {
    this.drawCallsStat = 0;
  }
}

export { RendererInfo };
