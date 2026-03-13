import { GPU, Geometry } from '@trident/core';

class FullscreenQuad extends GPU.RenderPass {
  name = "FullscreenQuad";
  shader;
  geometry;
  params;
  constructor(params) {
    super();
    this.params = params;
  }
  async init(resources) {
    this.shader = await GPU.Shader.Create({
      code: this.params.code,
      colorOutputs: [
        { format: "rgba16float" }
      ]
    });
    this.geometry = Geometry.Plane();
    if (this.params.init) this.params.init(resources, this.shader);
  }
  async preFrame(resources) {
    if (this.params.preFrame) this.params.preFrame(resources, this.shader);
  }
  async execute(resources, ...args) {
    GPU.RendererContext.BeginRenderPass(this.name, [{ target: this.params.target, clear: true }], void 0, true);
    GPU.RendererContext.DrawGeometry(this.geometry, this.shader);
    GPU.RendererContext.EndRenderPass();
    if (this.params.afterExecute) this.params.afterExecute(resources, this.shader);
  }
}

export { FullscreenQuad };
