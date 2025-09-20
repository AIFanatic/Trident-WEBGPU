import { Renderer } from './Renderer.js';
import { RenderGraph } from './RenderGraph.js';
import { DeferredLightingPass } from './passes/DeferredLightingPass.js';
import { WEBGPUTimestampQuery } from './webgpu/WEBGPUTimestampQuery.js';
import { TextureViewer } from './passes/TextureViewer.js';
import { PrepareGBuffers } from './passes/PrepareGBuffers.js';
import { DeferredShadowMapPass } from './passes/DeferredShadowMapPass.js';
import { DeferredGBufferPass } from './passes/DeferredGBufferPass.js';
import { ForwardPass } from './passes/ForwardPass.js';

const PassParams = {
  DebugSettings: "DebugSettings",
  MainCamera: "MainCamera",
  depthTexture: "depthTexture",
  depthTexturePyramid: "depthTexturePyramid",
  GBufferAlbedo: "GBufferAlbedo",
  GBufferNormal: "GBufferNormal",
  GBufferERMO: "GBufferERMO",
  GBufferDepth: "GBufferDepth",
  Skybox: "Skybox",
  SkyboxIrradiance: "SkyboxIrradiance",
  SkyboxPrefilter: "SkyboxPrefilter",
  SkyboxBRDFLUT: "SkyboxBRDFLUT",
  ShadowPassDepth: "ShadowPassDepth",
  ShadowPassCascadeData: "ShadowPassCascadeData",
  LightingPassOutput: "LightingPassOutput"
};
class RenderingPipeline {
  renderer;
  renderGraph;
  frame = 0;
  previousTime = 0;
  beforeGBufferPasses = [];
  afterGBufferPasses = [];
  beforeLightingPasses = [];
  afterLightingPasses = [];
  beforeScreenOutputPasses = [];
  prepareGBuffersPass;
  get skybox() {
    return this.prepareGBuffersPass.skybox;
  }
  set skybox(skybox) {
    this.prepareGBuffersPass.skybox = skybox;
  }
  get skyboxIrradiance() {
    return this.prepareGBuffersPass.skyboxIrradiance;
  }
  set skyboxIrradiance(skyboxIrradiance) {
    this.prepareGBuffersPass.skyboxIrradiance = skyboxIrradiance;
  }
  get skyboxPrefilter() {
    return this.prepareGBuffersPass.skyboxPrefilter;
  }
  set skyboxPrefilter(skyboxPrefilter) {
    this.prepareGBuffersPass.skyboxPrefilter = skyboxPrefilter;
  }
  get skyboxBRDFLUT() {
    return this.prepareGBuffersPass.skyboxBRDFLUT;
  }
  set skyboxBRDFLUT(skyboxBRDFLUT) {
    this.prepareGBuffersPass.skyboxBRDFLUT = skyboxBRDFLUT;
  }
  constructor(renderer) {
    this.renderer = renderer;
    this.prepareGBuffersPass = new PrepareGBuffers();
    this.renderGraph = new RenderGraph();
    this.beforeGBufferPasses = [
      this.prepareGBuffersPass
    ];
    this.afterGBufferPasses = [
      new DeferredGBufferPass(),
      new DeferredShadowMapPass()
    ];
    this.beforeLightingPasses = [];
    this.afterLightingPasses = [
      new DeferredLightingPass(),
      new ForwardPass()
    ];
    this.beforeScreenOutputPasses = [
      new TextureViewer()
    ];
    this.UpdateRenderGraphPasses();
  }
  UpdateRenderGraphPasses() {
    this.renderGraph.passes = [];
    this.renderGraph.passes.push(
      ...this.beforeGBufferPasses,
      ...this.afterGBufferPasses,
      ...this.beforeLightingPasses,
      ...this.afterLightingPasses,
      ...this.beforeScreenOutputPasses
    );
    this.renderGraph.init();
  }
  AddPass(pass, order) {
    if (order === 0 /* BeforeGBuffer */) this.beforeGBufferPasses.push(pass);
    else if (order === 1 /* AfterGBuffer */) this.afterGBufferPasses.push(pass);
    else if (order === 2 /* BeforeLighting */) this.beforeLightingPasses.push(pass);
    else if (order === 3 /* AfterLighting */) this.afterLightingPasses.push(pass);
    else if (order === 4 /* BeforeScreenOutput */) this.beforeScreenOutputPasses.push(pass);
    this.UpdateRenderGraphPasses();
  }
  Render(scene) {
    Renderer.info.ResetFrame();
    Renderer.info.triangleCount = 0;
    const renderPipelineStart = performance.now();
    Renderer.BeginRenderFrame();
    this.renderGraph.execute();
    Renderer.EndRenderFrame();
    Renderer.info.cpuTime = performance.now() - renderPipelineStart;
    WEBGPUTimestampQuery.GetResult().then((frameTimes) => {
      if (frameTimes) {
        for (const [name, time] of frameTimes) {
          Renderer.info.SetPassTime(name, time);
        }
      }
    });
    const currentTime = performance.now();
    const elapsed = currentTime - this.previousTime;
    this.previousTime = currentTime;
    Renderer.info.fps = 1 / elapsed * 1e3;
    this.frame++;
  }
}

export { PassParams, RenderingPipeline };
