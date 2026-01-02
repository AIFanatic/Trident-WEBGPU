import { GPU, Mathf, Scene, Components } from '@trident/core';
import { VTFeedbackPass } from './VTFeedbackPass.js';
import { PageManager } from './PageManager.js';
import { VTPaintPass } from './VTPaintPass.js';

class VirtualTexturingPass extends GPU.RenderPass {
  vtFeedbackPass;
  vtPainPass;
  page_manager;
  params;
  constructor() {
    super();
    const window_size = new Mathf.Vector2(GPU.Renderer.width, GPU.Renderer.height);
    const virtual_size = new Mathf.Vector2(8192, 8192);
    const buffer_size = window_size.clone().div(4);
    const page_size = new Mathf.Vector2(512, 512);
    const page_padding = new Mathf.Vector2(4, 4);
    const pages = virtual_size.clone().div(page_size);
    const bufferScreenRatio = new Mathf.Vector2(0.25, 0.25);
    this.vtFeedbackPass = new VTFeedbackPass(buffer_size.x, buffer_size.y);
    this.page_manager = new PageManager(virtual_size, page_padding, page_size);
    this.vtPainPass = new VTPaintPass(this.page_manager.Atlas(), this.page_manager.PageTables());
    const atlasSize = this.page_manager.AtlasSize();
    const mip_range = new Mathf.Vector2(0, this.page_manager.LODs() - 1);
    this.params = new Float32Array([
      virtual_size.x,
      virtual_size.y,
      // u_VirtualSize: vec2f,
      pages.x,
      pages.y,
      // u_PageGrid: vec2f,
      atlasSize.x,
      atlasSize.y,
      // u_AtlasSize: vec2f,
      page_size.x,
      page_size.y,
      // u_PageSize: vec2f,
      page_padding.x,
      page_padding.y,
      // u_PagePadding: vec2f,
      mip_range.x,
      mip_range.y,
      // u_MinMaxMipLevel: vec2f,
      bufferScreenRatio.x,
      bufferScreenRatio.y,
      // u_BufferScreenRatio: vec2f,
      0,
      0
      // padding
    ]);
  }
  async init(resources) {
    await this.vtPainPass.init(resources);
    await this.vtFeedbackPass.init(resources);
    this.vtFeedbackPass.shader.SetArray("params", this.params);
    this.vtPainPass.shader.SetArray("params", this.params);
    this.initialized = true;
  }
  pendingFeedback = null;
  async preFrame(resources) {
    if (this.pendingFeedback) {
      const data = await this.pendingFeedback;
      this.pendingFeedback = null;
      this.page_manager.IngestFeedback(new Uint32Array(data));
    }
    this.page_manager.FlushUploadQueue();
    this.page_manager.UpdatePageTables();
    const renderables = Scene.mainScene.GetComponents(Components.Renderable);
    this.vtFeedbackPass.renderables = renderables;
    this.vtPainPass.renderables = renderables;
    await this.vtFeedbackPass.preFrame(resources);
    await this.vtPainPass.preFrame(resources);
  }
  async execute(resources) {
    await this.vtFeedbackPass.execute(resources);
    this.pendingFeedback = this.vtFeedbackPass.feedback_buffer.GetData();
    await this.vtPainPass.execute(resources);
  }
}

export { VirtualTexturingPass };
