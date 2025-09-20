import { WEBGPURenderer } from './webgpu/WEBGPURenderer.js';
import { RendererInfo } from './RendererInfo.js';
import { EventSystem } from '../Events.js';

class RendererEvents {
  static Resized = (canvas) => {
  };
}
class Renderer {
  static type;
  static width;
  static height;
  static activeRenderer;
  static info = new RendererInfo();
  static canvas;
  static Create(canvas, type) {
    const aspectRatio = 1;
    canvas.width = canvas.parentElement.clientWidth * aspectRatio;
    canvas.height = canvas.parentElement.clientHeight * aspectRatio;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.userSelect = "none";
    const observer = new ResizeObserver((entries) => {
      canvas.width = canvas.parentElement.clientWidth * aspectRatio;
      canvas.height = canvas.parentElement.clientHeight * aspectRatio;
      Renderer.width = canvas.width;
      Renderer.height = canvas.height;
      EventSystem.emit(RendererEvents.Resized, canvas);
      console.log("Resized");
    });
    observer.observe(canvas);
    Renderer.canvas = canvas;
    Renderer.type = type;
    Renderer.width = canvas.width;
    Renderer.height = canvas.height;
    if (type === "webgpu") {
      this.activeRenderer = new WEBGPURenderer(canvas);
      return this.activeRenderer;
    }
    throw Error("Unknown render api type.");
  }
  static get SwapChainFormat() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.presentationFormat;
    throw Error("Unknown render api type.");
  }
  static BeginRenderFrame() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.BeginRenderFrame();
    throw Error("Unknown render api type.");
  }
  static EndRenderFrame() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.EndRenderFrame();
    throw Error("Unknown render api type.");
  }
  static HasActiveFrame() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.HasActiveFrame();
    throw Error("Unknown render api type.");
  }
  static OnFrameCompleted() {
    if (Renderer.type === "webgpu") return WEBGPURenderer.OnFrameCompleted();
    throw Error("Unknown render api type.");
  }
}

export { Renderer, RendererEvents };
