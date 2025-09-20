class RenderPass {
  name;
  inputs = [];
  outputs = [];
  initialized = false;
  initializing = false;
  constructor(params) {
    if (params.inputs) this.inputs = params.inputs;
    if (params.outputs) this.outputs = params.outputs;
  }
  async init(resources) {
  }
  execute(resources, ...args) {
  }
  set(data) {
    if (data.inputs) this.inputs = data.inputs;
    if (data.outputs) this.outputs = data.outputs;
  }
}
class ResourcePool {
  resources = {};
  setResource(name, resource) {
    this.resources[name] = resource;
  }
  getResource(name) {
    return this.resources[name];
  }
}
class RenderGraph {
  passes = [];
  resourcePool = new ResourcePool();
  addPass(pass) {
    this.passes.push(pass);
  }
  async init() {
    const sortedPasses = this.topologicalSort();
    for (const pass of sortedPasses) {
      if (pass.initialized === true || pass.initializing === true) continue;
      pass.initializing = true;
      await pass.init(this.resourcePool);
      pass.initialized = true;
    }
  }
  execute() {
    const sortedPasses = this.topologicalSort();
    for (const pass of sortedPasses) {
      if (!pass.initialized) {
        console.log(`didnt execute ${pass.name} because its not initialized`);
        return;
      }
      const inputs = pass.inputs.map((value) => this.resourcePool.getResource(value));
      pass.execute(this.resourcePool, ...inputs, ...pass.outputs);
    }
  }
  topologicalSort() {
    return this.passes;
  }
}

export { RenderGraph, RenderPass, ResourcePool };
