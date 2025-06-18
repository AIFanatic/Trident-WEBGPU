var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/plugins/ui/UIStats.ts
var Stat = class {
  statContainer;
  constructor(container, label) {
    this.statContainer = document.createElement("div");
    this.statContainer.classList.add("stat");
    container.appendChild(this.statContainer);
    if (label !== null) {
      const labelElement = document.createElement("label");
      labelElement.classList.add("title");
      labelElement.classList.add("title");
      labelElement.textContent = label;
      this.statContainer.append(labelElement);
    }
  }
  Disable() {
    this.statContainer.classList.add("disabled");
  }
  Enable() {
    this.statContainer.classList.remove("disabled");
  }
};
var UIDropdownStat = class extends Stat {
  selectElement;
  constructor(folder, label, options, onChanged, defaultIndex = 0) {
    super(folder.container, label);
    this.selectElement = document.createElement("select");
    this.selectElement.classList.add("value");
    for (let i2 = 0; i2 < options.length; i2++) {
      const option = options[i2];
      const optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.textContent = option;
      this.selectElement.append(optionElement);
      if (i2 === defaultIndex) {
        this.selectElement.value = option;
      }
    }
    this.statContainer.append(this.selectElement);
    this.selectElement.addEventListener("change", (event) => {
      onChanged(this.selectElement.selectedIndex, event.target.value);
    });
  }
};
var UIButtonStat = class extends Stat {
  button;
  state;
  onText;
  offText;
  constructor(folder, label, onClicked, defaultState = false, onText = "Enable", offText = "Disable") {
    super(folder.container, label);
    this.state = defaultState;
    this.onText = onText;
    this.offText = offText;
    this.button = document.createElement("button");
    this.button.classList.add("value");
    this.button.textContent = defaultState === true ? offText : onText;
    this.statContainer.append(this.button);
    this.button.addEventListener("click", (event) => {
      this.state = !this.state;
      if (this.state === true) this.button.textContent = this.offText;
      else this.button.textContent = this.onText;
      onClicked(this.state);
    });
  }
};
var UISliderStat = class extends Stat {
  constructor(folder, label, min, max, step, defaultValue, callback) {
    super(folder.container, label);
    const container = document.createElement("div");
    container.classList.add("value");
    container.style.display = "inline-flex";
    container.style.alignItems = "center";
    container.style.padding = "0px";
    const sliderElement = document.createElement("input");
    sliderElement.classList.add("slider");
    sliderElement.style.width = "60px";
    sliderElement.style.margin = "0px";
    sliderElement.type = "range";
    sliderElement.min = `${min}`;
    sliderElement.max = `${max}`;
    sliderElement.step = `${step}`;
    sliderElement.value = `${defaultValue}`;
    const textElement = document.createElement("input");
    textElement.style.width = "25px";
    textElement.style.marginLeft = "5px";
    textElement.value = defaultValue.toString();
    textElement.addEventListener("input", (event) => {
      sliderElement.value = textElement.value;
      callback(parseFloat(sliderElement.value));
    });
    textElement.addEventListener("change", (event) => {
      sliderElement.value = textElement.value;
      callback(parseFloat(sliderElement.value));
      if (textElement.value !== "") textElement.value = sliderElement.value;
    });
    sliderElement.addEventListener("input", (event) => {
      callback(parseFloat(sliderElement.value));
      textElement.value = sliderElement.value;
    });
    container.append(sliderElement, textElement);
    this.statContainer.append(container);
  }
};
var UITextStat = class extends Stat {
  textElement;
  previousValue;
  precision;
  unit;
  rolling;
  constructor(folder, label, defaultValue = 0, precision = 0, unit = "", rolling = false) {
    super(folder.container, label);
    this.previousValue = defaultValue;
    this.precision = precision;
    this.unit = unit;
    this.rolling = rolling;
    this.textElement = document.createElement("pre");
    this.textElement.classList.add("value");
    this.textElement.textContent = defaultValue.toFixed(precision);
    this.statContainer.append(this.textElement);
    setInterval(() => {
      this.Update();
    }, 100);
  }
  SetValue(value) {
    if (this.rolling === true) {
      value = this.previousValue * 0.95 + value * 0.05;
    }
    this.previousValue = value;
  }
  GetValue() {
    return this.previousValue;
  }
  // TODO: Current value
  GetPrecision() {
    return this.precision;
  }
  SetUnit(unit) {
    this.unit = unit;
  }
  Update() {
    const valueStr = this.precision === 0 ? this.previousValue.toString() : this.previousValue.toFixed(this.precision);
    this.textElement.textContent = valueStr + this.unit;
  }
};
var UIFolder = class extends Stat {
  folderElement;
  container;
  constructor(container, title) {
    super(container instanceof HTMLDivElement ? container : container.container, null);
    this.folderElement = document.createElement("details");
    const folderTitle = document.createElement("summary");
    folderTitle.textContent = title;
    this.container = document.createElement("div");
    this.folderElement.append(folderTitle, this.container);
    this.statContainer.append(this.folderElement);
  }
  SetPosition(position) {
    if (position.left) this.container.style.left = `${position.left}px`;
    if (position.right) this.container.style.right = `${position.right}px`;
    if (position.top) this.container.style.top = `${position.top}px`;
    if (position.bottom) this.container.style.bottom = `${position.bottom}px`;
  }
  Open() {
    this.folderElement.setAttribute("open", "");
  }
};

// src/plugins/Debugger.ts
var _Debugger = class {
  ui;
  container;
  constructor() {
    this.container = document.createElement("div");
    this.container.classList.add("stats-panel");
    document.body.append(this.container);
    this.ui = new UIFolder(this.container, "Debugger");
    this.ui.Open();
  }
  Enable() {
    this.container.style.display = "";
  }
  Disable() {
    this.container.style.display = "none";
  }
};
var Debugger = new _Debugger();

// src/EngineDebug.ts
var _EngineDebug = class {
  componentUpdate;
  engineFolder;
  constructor() {
    this.engineFolder = new UIFolder(Debugger.ui, "Engine");
    this.engineFolder.Open();
    this.componentUpdate = new UITextStat(this.engineFolder, "Component update", 0, 2, "", true);
  }
};
var EngineDebug = new _EngineDebug();

// src/Events.ts
var EventSystem = class {
  static events = /* @__PURE__ */ new Map();
  static on(event, callback) {
    const events = this.events.get(event) || [];
    events.push(callback);
    this.events.set(event, events);
  }
  static emit(event, ...args) {
    const callbacks = this.events.get(event);
    if (callbacks === void 0) return;
    for (let i2 = 0; i2 < callbacks.length; i2++) {
      callbacks[i2](...args);
    }
  }
};
var EventSystemLocal = class {
  static events = /* @__PURE__ */ new Map();
  static on(event, localId, callback) {
    const localEvents = this.events.get(event) || /* @__PURE__ */ new Map();
    const localEventsCallbacks = localEvents.get(localId) || [];
    localEventsCallbacks.push(callback);
    localEvents.set(localId, localEventsCallbacks);
    this.events.set(event, localEvents);
  }
  static emit(event, localId, ...args) {
    const localEvents = this.events.get(event);
    if (localEvents === void 0) return;
    const localEventsCallbacks = localEvents.get(localId);
    if (localEventsCallbacks === void 0) return;
    for (let i2 = 0; i2 < localEventsCallbacks.length; i2++) {
      localEventsCallbacks[i2](...args);
    }
  }
};

// src/utils/Utils.ts
var Utils = class {
  static UUID() {
    return Math.floor(Math.random() * 1e6).toString();
  }
  static StringFindAllBetween(source, start, end, exclusive = true) {
    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapeRegExp(start)}(.*?)${escapeRegExp(end)}`, "gs");
    const matches = [];
    let match;
    while ((match = regex.exec(source)) !== null) {
      if (exclusive) matches.push(match[1]);
      else matches.push(start + match[1] + end);
    }
    return matches;
  }
};

// src/components/Component.ts
var ComponentEvents = class {
  static CallUpdate = (component, shouldUpdate) => {
  };
  static AddedComponent = (component, scene) => {
  };
  static RemovedComponent = (component, scene) => {
  };
};
var Component = class _Component {
  id = Utils.UUID();
  enabled = true;
  hasStarted = false;
  name;
  gameObject;
  transform;
  constructor(gameObject) {
    this.gameObject = gameObject;
    this.transform = gameObject.transform;
    this.name = this.constructor.name;
    if (this.gameObject.scene.hasStarted) this.Start();
    if (this.constructor.prototype.Update !== _Component.prototype.Update) EventSystem.emit(ComponentEvents.CallUpdate, this, true);
    EventSystem.emit(ComponentEvents.AddedComponent, this, this.gameObject.scene);
  }
  Start() {
  }
  Update() {
  }
  LateUpdate() {
  }
  Destroy() {
  }
};

// src/renderer/webgpu/WEBGPURenderer.ts
var adapter = navigator ? await navigator.gpu.requestAdapter() : null;
if (!adapter) throw Error("WEBGPU not supported");
var requiredLimits = {};
for (const key in adapter.limits) requiredLimits[key] = adapter.limits[key];
var features = [];
if (adapter.features.has("timestamp-query")) features.push("timestamp-query");
var device = adapter ? await adapter.requestDevice({
  requiredFeatures: features,
  requiredLimits
}) : null;
var WEBGPURenderer = class _WEBGPURenderer {
  static adapter;
  static device;
  static context;
  static presentationFormat;
  static activeCommandEncoder = null;
  constructor(canvas) {
    if (!adapter || !device) throw Error("WEBGPU not supported");
    const context = canvas.getContext("webgpu");
    if (!context) throw Error("Could not get WEBGPU context");
    _WEBGPURenderer.adapter = adapter;
    _WEBGPURenderer.device = device;
    _WEBGPURenderer.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format: _WEBGPURenderer.presentationFormat });
    _WEBGPURenderer.adapter = adapter;
    _WEBGPURenderer.device = device;
    _WEBGPURenderer.context = context;
    _WEBGPURenderer.context.configure({
      device: _WEBGPURenderer.device,
      format: _WEBGPURenderer.presentationFormat,
      alphaMode: "opaque"
    });
  }
  static GetActiveCommandEncoder() {
    return _WEBGPURenderer.activeCommandEncoder;
  }
  static BeginRenderFrame() {
    if (_WEBGPURenderer.activeCommandEncoder !== null) {
      console.warn("Only one active encoder pipeline is allowed.");
      return;
    }
    _WEBGPURenderer.activeCommandEncoder = _WEBGPURenderer.device.createCommandEncoder();
  }
  static EndRenderFrame() {
    if (_WEBGPURenderer.activeCommandEncoder === null) {
      console.log("There is no active render pass.");
      return;
    }
    _WEBGPURenderer.device.queue.submit([_WEBGPURenderer.activeCommandEncoder.finish()]);
    _WEBGPURenderer.activeCommandEncoder = null;
  }
  static HasActiveFrame() {
    return _WEBGPURenderer.activeCommandEncoder !== null;
  }
  static OnFrameCompleted() {
    return _WEBGPURenderer.device.queue.onSubmittedWorkDone();
  }
};

// src/renderer/Renderer.ts
var Renderer = class _Renderer {
  static type;
  static width;
  static height;
  static activeRenderer;
  static Create(canvas, type) {
    _Renderer.type = type;
    _Renderer.width = canvas.width;
    _Renderer.height = canvas.height;
    if (type === "webgpu") {
      this.activeRenderer = new WEBGPURenderer(canvas);
      return this.activeRenderer;
    }
    throw Error("Unknown render api type.");
  }
  static get SwapChainFormat() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.presentationFormat;
    throw Error("Unknown render api type.");
  }
  static BeginRenderFrame() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.BeginRenderFrame();
    throw Error("Unknown render api type.");
  }
  static EndRenderFrame() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.EndRenderFrame();
    throw Error("Unknown render api type.");
  }
  static HasActiveFrame() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.HasActiveFrame();
    throw Error("Unknown render api type.");
  }
  static OnFrameCompleted() {
    if (_Renderer.type === "webgpu") return WEBGPURenderer.OnFrameCompleted();
    throw Error("Unknown render api type.");
  }
};

// src/renderer/RenderGraph.ts
var RenderPass = class {
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
};
var ResourcePool = class {
  resources = {};
  setResource(name, resource) {
    this.resources[name] = resource;
  }
  getResource(name) {
    return this.resources[name];
  }
};
var RenderGraph = class {
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
};

// src/Assets.ts
var Assets = class _Assets {
  static cache = /* @__PURE__ */ new Map();
  static async Load(url, type) {
    const cached = _Assets.cache.get(url);
    if (cached !== void 0) {
      return cached;
    }
    const promise = fetch(url).then((response) => {
      if (!response.ok) throw Error(`File not found ${url}`);
      if (type === "json") return response.json();
      else if (type === "text") return response.text();
      else if (type === "binary") return response.arrayBuffer();
    }).then((result) => {
      _Assets.cache.set(url, Promise.resolve(result));
      return result;
    }).catch((error) => {
      _Assets.cache.delete(url);
      throw error;
    });
    _Assets.cache.set(url, promise);
    return promise;
  }
};

// src/renderer/webgpu/shaders/deferred/Cull.wgsl
var Cull_default = "./resources/renderer/webgpu/shaders/deferred/Cull.wgsl";

// src/renderer/webgpu/shaders/deferred/CullStructs.wgsl
var CullStructs_default = "./resources/renderer/webgpu/shaders/deferred/CullStructs.wgsl";

// src/renderer/webgpu/shaders/deferred/SettingsStructs.wgsl
var SettingsStructs_default = "./resources/renderer/webgpu/shaders/deferred/SettingsStructs.wgsl";

// src/renderer/webgpu/shaders/deferred/DrawIndirectGBuffer.wgsl
var DrawIndirectGBuffer_default = "./resources/renderer/webgpu/shaders/deferred/DrawIndirectGBuffer.wgsl";

// src/renderer/webgpu/shaders/deferred/DrawGBuffer.wgsl
var DrawGBuffer_default = "./resources/renderer/webgpu/shaders/deferred/DrawGBuffer.wgsl";

// src/renderer/webgpu/shaders/Blit.wgsl
var Blit_default = "./resources/renderer/webgpu/shaders/Blit.wgsl";

// src/renderer/webgpu/shaders/BlitDepth.wgsl
var BlitDepth_default = "./resources/renderer/webgpu/shaders/BlitDepth.wgsl";

// src/renderer/webgpu/shaders/DepthDownsample.wgsl
var DepthDownsample_default = "./resources/renderer/webgpu/shaders/DepthDownsample.wgsl";

// src/renderer/webgpu/shaders/deferred/DeferredLightingPBR.wgsl
var DeferredLightingPBR_default = "./resources/renderer/webgpu/shaders/deferred/DeferredLightingPBR.wgsl";

// src/renderer/ShaderUtils.ts
var ShaderPreprocessor = class {
  static ProcessDefines(code, defines) {
    const coditions = Utils.StringFindAllBetween(code, "#if", "#endif", false);
    for (const condition of coditions) {
      const variable = Utils.StringFindAllBetween(condition, "#if ", "\n")[0];
      const value = condition.replaceAll(`#if ${variable}`, "").replaceAll("#endif", "");
      if (defines[variable] === true) code = code.replaceAll(condition, value);
      else code = code.replaceAll(condition, "");
    }
    return code;
  }
  static async ProcessIncludes(code, url = "./") {
    const basepath = url.substring(url.lastIndexOf("/"), -1) + "/";
    const includes = Utils.StringFindAllBetween(code, "#include", "\n", false);
    for (const includeStr of includes) {
      const filenameArray = Utils.StringFindAllBetween(includeStr, '"', '"', true);
      if (filenameArray.length !== 1) throw Error(`Invalid include ${filenameArray}`);
      const includeFullPath = filenameArray[0];
      const includePath = includeFullPath.substring(includeFullPath.lastIndexOf("/"), -1) + "/";
      const includeFilename = includeFullPath.substring(includeFullPath.lastIndexOf("/")).slice(1);
      const new_path = basepath + includePath + includeFilename;
      const newCode = await Assets.Load(new_path, "text");
      const includedCode = await this.ProcessIncludes(newCode, new_path);
      code = code.replace(includeStr, includedCode + "\n");
    }
    return code;
  }
};
var ShaderLoader = class _ShaderLoader {
  static async Load(shader_url) {
    if (Renderer.type === "webgpu") {
      if (shader_url === "") throw Error(`Invalid shader ${shader_url}`);
      let code = await Assets.Load(shader_url, "text");
      code = await ShaderPreprocessor.ProcessIncludes(code, shader_url);
      return code;
    }
    throw Error("Unknown api");
  }
  static get Cull() {
    return _ShaderLoader.Load(Cull_default);
  }
  static get CullStructs() {
    return _ShaderLoader.Load(CullStructs_default);
  }
  static get SettingsStructs() {
    return _ShaderLoader.Load(SettingsStructs_default);
  }
  static get DepthDownsample() {
    return _ShaderLoader.Load(DepthDownsample_default);
  }
  static get DrawIndirect() {
    return _ShaderLoader.Load(DrawIndirectGBuffer_default);
  }
  static get Draw() {
    return _ShaderLoader.Load(DrawGBuffer_default);
  }
  static get Blit() {
    return _ShaderLoader.Load(Blit_default);
  }
  static get BlitDepth() {
    return _ShaderLoader.Load(BlitDepth_default);
  }
  static get DeferredLighting() {
    return _ShaderLoader.Load(DeferredLightingPBR_default);
  }
};

// src/renderer/RendererDebug.ts
var _RendererDebug = class {
  isDebugDepthPassEnabled = false;
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
  heightScale;
  useHeightMapStat;
  viewTypeValue = 0;
  heightScaleValue = 0;
  useHeightMapValue = false;
  gpuBufferSizeTotal = 0;
  gpuTextureSizeTotal = 0;
  renderPassesFolder;
  framePassesStats = /* @__PURE__ */ new Map();
  constructor() {
    this.rendererFolder = new UIFolder(Debugger.ui, "Renderer");
    this.rendererFolder.Open();
    this.fps = new UITextStat(this.rendererFolder, "FPS", 0, 2, "", true);
    this.triangleCount = new UITextStat(this.rendererFolder, "Triangles: ");
    this.visibleTriangles = new UITextStat(this.rendererFolder, "Visible triangles: ");
    this.cpuTime = new UITextStat(this.rendererFolder, "CPU: ", 0, 2, "ms", true);
    this.gpuTime = new UITextStat(this.rendererFolder, "GPU: ", 0, 2, "ms", true);
    this.gpuBufferSizeStat = new UITextStat(this.rendererFolder, "GPU buffer size: ", 0, 2);
    this.gpuTextureSizeStat = new UITextStat(this.rendererFolder, "GPU texture size: ", 0, 2);
    this.bindGroupLayoutsStat = new UITextStat(this.rendererFolder, "Bind group layouts: ");
    this.bindGroupsStat = new UITextStat(this.rendererFolder, "Bind groups: ");
    this.drawCallsStat = new UITextStat(this.rendererFolder, "Draw calls: ");
    this.compiledShadersStat = new UITextStat(this.rendererFolder, "Compiled shaders: ");
    this.viewTypeStat = new UIDropdownStat(this.rendererFolder, "Final output:", ["Lighting", "Albedo Map", "Normal Map", "Metalness", "Roughness", "Emissive"], (index, value) => {
      this.viewTypeValue = index;
    }, this.viewTypeValue);
    this.heightScale = new UISliderStat(this.rendererFolder, "Height scale:", 0, 1, 0.01, this.heightScaleValue, (state) => {
      this.heightScaleValue = state;
    });
    this.useHeightMapStat = new UIButtonStat(this.rendererFolder, "Use heightmap:", (state) => {
      this.useHeightMapValue = state;
    }, this.useHeightMapValue);
    this.renderPassesFolder = new UIFolder(this.rendererFolder, "Frame passes");
    this.renderPassesFolder.Open();
  }
  SetPassTime(name, time) {
    let framePass = this.framePassesStats.get(name);
    if (!framePass) {
      framePass = new UITextStat(this.renderPassesFolder, name, 0, 2, "ms", true);
      this.framePassesStats.set(name, framePass);
    }
    framePass.SetValue(time / 1e6);
  }
  SetCPUTime(value) {
    this.cpuTime.SetValue(value);
  }
  SetTriangleCount(count) {
    this.triangleCount.SetValue(count);
  }
  IncrementTriangleCount(count) {
    this.triangleCount.SetValue(this.triangleCount.GetValue() + count);
  }
  SetVisibleTriangleCount(count) {
    this.visibleTriangles.SetValue(count);
  }
  IncrementVisibleTriangleCount(count) {
    this.visibleTriangles.SetValue(this.visibleTriangles.GetValue() + count);
  }
  SetFPS(count) {
    this.fps.SetValue(count);
    let totalGPUTime = 0;
    for (const [_, framePass] of this.framePassesStats) {
      totalGPUTime += framePass.GetValue();
    }
    this.gpuTime.SetValue(totalGPUTime);
  }
  IncrementBindGroupLayouts(value) {
    this.bindGroupLayoutsStat.SetValue(this.bindGroupLayoutsStat.GetValue() + value);
  }
  IncrementBindGroups(value) {
    this.bindGroupsStat.SetValue(this.bindGroupsStat.GetValue() + value);
  }
  FormatBytes(bytes, decimals = 2) {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i2 = Math.floor(Math.log(bytes) / Math.log(k));
    return { value: parseFloat((bytes / Math.pow(k, i2)).toFixed(decimals)), rank: sizes[i2] };
  }
  IncrementGPUBufferSize(value) {
    this.gpuBufferSizeTotal += value;
    const formatted = this.FormatBytes(this.gpuBufferSizeTotal, this.gpuBufferSizeStat.GetPrecision());
    this.gpuBufferSizeStat.SetUnit(formatted.rank);
    this.gpuBufferSizeStat.SetValue(formatted.value);
  }
  IncrementGPUTextureSize(value) {
    this.gpuTextureSizeTotal += value;
    const formatted = this.FormatBytes(this.gpuTextureSizeTotal, this.gpuTextureSizeStat.GetPrecision());
    this.gpuTextureSizeStat.SetUnit(formatted.rank);
    this.gpuTextureSizeStat.SetValue(formatted.value);
  }
  IncrementDrawCalls(count) {
    this.drawCallsStat.SetValue(this.drawCallsStat.GetValue() + count);
  }
  IncrementShaderCompiles(count) {
    this.compiledShadersStat.SetValue(this.compiledShadersStat.GetValue() + count);
  }
  ResetFrame() {
    this.drawCallsStat.SetValue(0);
  }
};
var RendererDebug = new _RendererDebug();

// src/renderer/webgpu/WEBGPUBuffer.ts
var BaseBuffer = class {
  id = Utils.UUID();
  buffer;
  size;
  set name(name) {
    this.buffer.label = name;
  }
  get name() {
    return this.buffer.label;
  }
  constructor(sizeInBytes, type) {
    RendererDebug.IncrementGPUBufferSize(sizeInBytes);
    let usage = void 0;
    if (type == 0 /* STORAGE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 1 /* STORAGE_WRITE */) usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 3 /* VERTEX */) usage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 4 /* INDEX */) usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 2 /* UNIFORM */) usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    else if (type == 5 /* INDIRECT */) usage = GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE;
    else if (type == 10) usage = GPUBufferUsage.INDEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST;
    if (!usage) throw Error("Invalid buffer usage");
    this.buffer = WEBGPURenderer.device.createBuffer({ size: sizeInBytes, usage });
    this.size = sizeInBytes;
  }
  GetBuffer() {
    return this.buffer;
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
    WEBGPURenderer.device.queue.writeBuffer(this.buffer, bufferOffset, array, dataOffset, size);
  }
  async GetData(sourceOffset = 0, destinationOffset = 0, size) {
    const readBuffer = WEBGPURenderer.device.createBuffer({
      size: size ? size : this.buffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    const commandEncoder = WEBGPURenderer.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(this.buffer, sourceOffset, readBuffer, destinationOffset, size ? size : this.buffer.size);
    WEBGPURenderer.device.queue.submit([commandEncoder.finish()]);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = readBuffer.getMappedRange().slice(0);
    readBuffer.unmap();
    readBuffer.destroy();
    return arrayBuffer;
  }
  Destroy() {
    RendererDebug.IncrementGPUBufferSize(-this.size);
    this.buffer.destroy();
  }
};
var WEBGPUBuffer = class extends BaseBuffer {
  constructor(sizeInBytes, type) {
    super(sizeInBytes, type);
  }
};
var WEBGPUDynamicBuffer = class extends BaseBuffer {
  minBindingSize;
  dynamicOffset = 0;
  constructor(sizeInBytes, type, minBindingSize) {
    super(sizeInBytes, type);
    this.minBindingSize = minBindingSize;
  }
};

// src/renderer/Buffer.ts
var Buffer3 = class {
  size;
  set name(name) {
  }
  get name() {
    return "Buffer";
  }
  constructor() {
  }
  static Create(size, type) {
    if (size === 0) throw Error("Tried to create a buffer with size 0");
    if (Renderer.type === "webgpu") return new WEBGPUBuffer(size, type);
    else throw Error("Renderer type invalid");
  }
  SetArray(array, bufferOffset = 0, dataOffset, size) {
  }
  async GetData(sourceOffset, destinationOffset, size) {
    return new ArrayBuffer(1);
  }
  Destroy() {
  }
};

// src/math/Vector2.ts
var Vector2 = class _Vector2 {
  _x;
  _y;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  _elements = new Float32Array(3);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    return this._elements;
  }
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
  }
  mul(v) {
    if (v instanceof _Vector2) this.x *= v.x, this.y *= v.y;
    else this.x *= v, this.y *= v;
    return this;
  }
  div(v) {
    if (v instanceof _Vector2) this.x /= v.x, this.y /= v.y;
    else this.x /= v, this.y /= v;
    return this;
  }
  add(v) {
    if (v instanceof _Vector2) this.x += v.x, this.y += v.y;
    else this.x += v, this.y += v;
    return this;
  }
  sub(v) {
    if (v instanceof _Vector2) this.x -= v.x, this.y -= v.y;
    else this.x -= v, this.y -= v;
    return this;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  clone() {
    return new _Vector2(this.x, this.y);
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  toString() {
    return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)})`;
  }
};

// src/renderer/webgpu/utils/WEBGPUMipsGenerator.ts
var WEBGPUMipsGenerator = class {
  static sampler;
  static module;
  static pipelineByFormat = {};
  static numMipLevels(...sizes) {
    return 1 + Math.log2(Math.max(...sizes)) | 0;
  }
  // TODO: Cannot call this twice because of texture usages
  static generateMips(source) {
    if (!WEBGPURenderer.device) throw Error("WEBGPU not initialized");
    const device2 = WEBGPURenderer.device;
    const sourceBuffer = source.GetBuffer();
    if (!this.module) {
      this.module = device2.createShaderModule({
        label: "textured quad shaders for mip level generation",
        code: `
                    struct VSOutput {
                        @builtin(position) position: vec4f,
                        @location(0) texcoord: vec2f,
                    };
                    
                    @vertex fn vs(@builtin(vertex_index) vertexIndex : u32) -> VSOutput {
                        const pos = array(
                            vec2f( 0.0,  0.0),  // center
                            vec2f( 1.0,  0.0),  // right, center
                            vec2f( 0.0,  1.0),  // center, top
                    
                            // 2st triangle
                            vec2f( 0.0,  1.0),  // center, top
                            vec2f( 1.0,  0.0),  // right, center
                            vec2f( 1.0,  1.0),  // right, top
                        );
                    
                        var vsOutput: VSOutput;
                        let xy = pos[vertexIndex];
                        vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
                        vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
                        return vsOutput;
                    }
                    
                    @group(0) @binding(0) var ourSampler: sampler;
                    @group(0) @binding(1) var ourTexture: texture_2d<f32>;
                    
                    @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
                        return textureSample(ourTexture, ourSampler, fsInput.texcoord);
                    }
                `
      });
      this.sampler = device2.createSampler({ minFilter: "linear", magFilter: "linear" });
    }
    if (!this.pipelineByFormat[sourceBuffer.format]) {
      this.pipelineByFormat[sourceBuffer.format] = device2.createRenderPipeline({
        label: "mip level generator pipeline",
        layout: "auto",
        vertex: { module: this.module },
        fragment: { module: this.module, targets: [{ format: sourceBuffer.format }] }
      });
    }
    const pipeline = this.pipelineByFormat[sourceBuffer.format];
    const encoder = device2.createCommandEncoder({ label: "mip gen encoder" });
    const destinationBuffer = device2.createTexture({
      label: "destinationBuffer",
      format: sourceBuffer.format,
      mipLevelCount: this.numMipLevels(source.width, source.height),
      size: [source.width, source.height, 1],
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT
    });
    let width = sourceBuffer.width;
    let height = sourceBuffer.height;
    encoder.copyTextureToTexture({ texture: sourceBuffer }, { texture: destinationBuffer }, [width, height]);
    let baseMipLevel = 0;
    while (width > 1 || height > 1) {
      width = Math.max(1, width / 2 | 0);
      height = Math.max(1, height / 2 | 0);
      const bindGroup = device2.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.sampler },
          { binding: 1, resource: destinationBuffer.createView({ baseMipLevel, mipLevelCount: 1 }) }
        ]
      });
      ++baseMipLevel;
      const renderPassDescriptor = {
        label: "WEBGPUMipsGenerator",
        colorAttachments: [
          {
            view: destinationBuffer.createView({ baseMipLevel, mipLevelCount: 1 }),
            loadOp: "clear",
            storeOp: "store"
          }
        ]
      };
      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
      pass.end();
    }
    const commandBuffer = encoder.finish();
    device2.queue.submit([commandBuffer]);
    return destinationBuffer;
  }
};

// src/renderer/webgpu/WEBGPUTexture.ts
var WEBGPUTexture = class _WEBGPUTexture {
  id = Utils.UUID();
  width;
  height;
  depth;
  format;
  type;
  dimension;
  mipLevels;
  buffer;
  viewCache = /* @__PURE__ */ new Map();
  currentLayer = 0;
  currentMip = 0;
  activeMipCount = 1;
  constructor(width, height, depth, format, type, dimension, mipLevels) {
    let textureUsage = GPUTextureUsage.COPY_DST;
    let textureType = GPUTextureUsage.TEXTURE_BINDING;
    if (!type) textureType = GPUTextureUsage.TEXTURE_BINDING;
    else if (type === 1 /* DEPTH */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    else if (type === 2 /* RENDER_TARGET */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC;
    else if (type === 3 /* RENDER_TARGET_STORAGE */) textureType = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC;
    else throw Error(`Unknown texture format ${format}`);
    let dim = "2d";
    if (dimension === "1d") dim = "1d";
    else if (dimension === "3d") dim = "3d";
    const textureBindingViewDimension = dimension === "cube" ? "cube" : void 0;
    this.buffer = WEBGPURenderer.device.createTexture({
      size: [width, height, depth],
      // @ts-ignore
      textureBindingViewDimension,
      dimension: dim,
      format,
      usage: textureUsage | textureType,
      mipLevelCount: mipLevels
    });
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.format = format;
    this.type = type;
    this.dimension = dimension;
    this.mipLevels = mipLevels;
  }
  GetBuffer() {
    return this.buffer;
  }
  GetView() {
    const key = `${this.currentLayer}-${this.currentMip}`;
    let view = this.viewCache.get(key);
    if (!view) {
      view = this.buffer.createView({
        dimension: this.dimension,
        baseArrayLayer: this.currentLayer,
        arrayLayerCount: 1,
        baseMipLevel: this.currentMip,
        mipLevelCount: this.activeMipCount
      });
      this.viewCache.set(key, view);
    }
    return view;
  }
  GenerateMips() {
    this.buffer = WEBGPUMipsGenerator.generateMips(this);
    this.SetActiveMipCount(WEBGPUMipsGenerator.numMipLevels(this.width, this.height));
  }
  SetActiveLayer(layer) {
    if (layer > this.depth) throw Error("Active layer cannot be bigger than depth size");
    this.currentLayer = layer;
  }
  GetActiveLayer() {
    return this.currentLayer;
  }
  SetActiveMip(mip) {
    if (mip > this.mipLevels) throw Error("Active mip cannot be bigger than mip levels size");
    this.currentMip = mip;
  }
  GetActiveMip() {
    return this.currentMip;
  }
  SetActiveMipCount(mipCount) {
    return this.activeMipCount = mipCount;
  }
  GetActiveMipCount() {
    return this.activeMipCount;
  }
  Destroy() {
    this.buffer.destroy();
  }
  SetData(data) {
    const extraBytes = this.format.includes("rgba32float") ? 4 : 1;
    console.log(extraBytes);
    try {
      WEBGPURenderer.device.queue.writeTexture(
        { texture: this.buffer },
        data,
        { bytesPerRow: this.width * 4 * extraBytes, rowsPerImage: this.depth },
        { width: this.width, height: this.height, depthOrArrayLayers: this.depth }
      );
    } catch (error) {
      console.warn(error);
    }
  }
  // Format and types are very limited for now
  // https://github.com/gpuweb/gpuweb/issues/2322
  static FromImageBitmap(imageBitmap, width, height, format, flipY) {
    const texture = new _WEBGPUTexture(width, height, 1, format, 2 /* RENDER_TARGET */, "2d", 1);
    try {
      WEBGPURenderer.device.queue.copyExternalImageToTexture(
        { source: imageBitmap, flipY },
        { texture: texture.GetBuffer() },
        [imageBitmap.width, imageBitmap.height]
      );
    } catch (error) {
      console.warn(error);
    }
    return texture;
  }
};

// src/math/Vector3.ts
var Vector3 = class _Vector3 {
  _x;
  _y;
  _z;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  set z(v) {
    this._z = v;
  }
  _elements = new Float32Array(3);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    this._elements[2] = this._z;
    return this._elements;
  }
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  setX(x) {
    this.x = x;
    return this;
  }
  setY(y) {
    this.y = y;
    return this;
  }
  setZ(z) {
    this.z = z;
    return this;
  }
  clone() {
    return new _Vector3(this.x, this.y, this.z);
  }
  copy(v) {
    return this.set(v.x, v.y, v.z);
  }
  mul(v) {
    if (v instanceof _Vector3) this.x *= v.x, this.y *= v.y, this.z *= v.z;
    else this.x *= v, this.y *= v, this.z *= v;
    return this;
  }
  div(v) {
    if (v instanceof _Vector3) this.x /= v.x, this.y /= v.y, this.z /= v.z;
    else this.x /= v, this.y /= v, this.z /= v;
    return this;
  }
  add(v) {
    if (v instanceof _Vector3) this.x += v.x, this.y += v.y, this.z += v.z;
    else this.x += v, this.y += v, this.z += v;
    return this;
  }
  sub(v) {
    if (v instanceof _Vector3) this.x -= v.x, this.y -= v.y, this.z -= v.z;
    else this.x -= v, this.y -= v, this.z -= v;
    return this;
  }
  subVectors(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }
  applyQuaternion(q) {
    const vx = this.x, vy = this.y, vz = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    this.set(
      vx + qw * tx + qy * tz - qz * ty,
      vy + qw * ty + qz * tx - qx * tz,
      vz + qw * tz + qx * ty - qy * tx
    );
    return this;
  }
  length() {
    return Math.hypot(this.x, this.y, this.z);
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  normalize() {
    return this.div(this.length() || 1);
  }
  distanceTo(v) {
    return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  distanceToSquared(v) {
    const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  cross(v) {
    return this.set(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
  }
  crossVectors(a, b) {
    const ax = a.x, ay = a.y, az = a.z;
    const bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
  }
  min(v) {
    this.x = Math.min(this.x, v.x);
    this.y = Math.min(this.y, v.y);
    this.z = Math.min(this.z, v.z);
    return this;
  }
  max(v) {
    this.x = Math.max(this.x, v.x);
    this.y = Math.max(this.y, v.y);
    this.z = Math.max(this.z, v.z);
    return this;
  }
  lerp(v, t) {
    this.x = this.x + t * (v.x - this.x);
    this.y = this.y + t * (v.y - this.y);
    this.z = this.z + t * (v.z - this.z);
    return this;
  }
  setFromSphericalCoords(radius, phi, theta) {
    const sinPhiRadius = Math.sin(phi) * radius;
    this.x = sinPhiRadius * Math.sin(theta);
    this.y = Math.cos(phi) * radius;
    this.z = sinPhiRadius * Math.cos(theta);
    return this;
  }
  setFromMatrixPosition(m) {
    const e = m.elements;
    this.x = e[12];
    this.y = e[13];
    this.z = e[14];
    return this;
  }
  equals(v) {
    const EPS = 1e-4;
    return Math.abs(v.x - this.x) < EPS && Math.abs(v.y - this.y) < EPS && Math.abs(v.z - this.z) < EPS;
  }
  abs() {
    this.x = Math.abs(this.x);
    this.y = Math.abs(this.y);
    this.z = Math.abs(this.z);
    return this;
  }
  sign() {
    this.x = Math.sign(this.x);
    this.y = Math.sign(this.y);
    this.z = Math.sign(this.z);
    return this;
  }
  transformDirection(m) {
    const x = this.x, y = this.y, z = this.z;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z;
    this.y = e[1] * x + e[5] * y + e[9] * z;
    this.z = e[2] * x + e[6] * y + e[10] * z;
    return this.normalize();
  }
  toString() {
    return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)}, ${this.z.toPrecision(2)})`;
  }
  static fromArray(array) {
    if (array.length < 3) throw Error("Array doesn't have enough data");
    return new _Vector3(array[0], array[1], array[2]);
  }
};
var ObservableVector3 = class extends Vector3 {
  onChange;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  set x(value) {
    if (value !== this.x) {
      this._x = value;
      if (this.onChange) {
        this.onChange();
      }
    }
  }
  set y(value) {
    if (value !== this.y) {
      this._y = value;
      if (this.onChange) this.onChange();
    }
  }
  set z(value) {
    if (value !== this.z) {
      this._z = value;
      if (this.onChange) this.onChange();
    }
  }
  constructor(onChange, x = 0, y = 0, z = 0) {
    super(x, y, z);
    this.onChange = onChange;
  }
};

// src/math/BoundingVolume.ts
var BoundingVolume = class _BoundingVolume {
  min;
  max;
  center;
  radius;
  constructor(min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), center = new Vector3(), radius = 0) {
    this.min = min;
    this.max = max;
    this.center = center;
    this.radius = radius;
  }
  static FromVertices(vertices) {
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    for (let i2 = 0; i2 < vertices.length; i2 += 3) {
      maxX = Math.max(maxX, vertices[i2]);
      minX = Math.min(minX, vertices[i2]);
      maxY = Math.max(maxY, vertices[i2 + 1]);
      minY = Math.min(minY, vertices[i2 + 1]);
      maxZ = Math.max(maxZ, vertices[i2 + 2]);
      minZ = Math.min(minZ, vertices[i2 + 2]);
    }
    const centerX = minX + (maxX - minX) / 2;
    const centerY = minY + (maxY - minY) / 2;
    const centerZ = minZ + (maxZ - minZ) / 2;
    const newCenter = new Vector3(centerX, centerY, centerZ);
    const halfWidth = (maxX - minX) / 2;
    const halfHeight = (maxY - minY) / 2;
    const halfDepth = (maxZ - minZ) / 2;
    const newRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight + halfDepth * halfDepth);
    return new _BoundingVolume(
      new Vector3(minX, minY, minZ),
      new Vector3(maxX, maxY, maxZ),
      newCenter,
      newRadius
    );
  }
};

// src/Geometry.ts
var GeometryAttribute = class {
  array;
  buffer;
  constructor(array, type) {
    if (array.length === 0) throw Error("GeometryAttribute data is empty");
    this.array = array;
    this.buffer = Buffer3.Create(array.byteLength, type);
    this.buffer.SetArray(this.array);
  }
  GetBuffer() {
    return this.buffer;
  }
};
var VertexAttribute = class extends GeometryAttribute {
  constructor(array) {
    super(array, 3 /* VERTEX */);
  }
};
var InterleavedVertexAttribute = class _InterleavedVertexAttribute extends GeometryAttribute {
  constructor(array, stride) {
    super(array, 3 /* VERTEX */);
    this.array = array;
    this.stride = stride;
  }
  static fromArrays(attributes, inputStrides, outputStrides) {
    function stridedCopy(target, values, offset2, inputStride, outputStride, interleavedStride2) {
      let writeIndex = offset2;
      for (let i2 = 0; i2 < values.length; i2 += inputStride) {
        for (let j = 0; j < inputStride && i2 + j < values.length; j++) {
          target[writeIndex + j] = values[i2 + j];
        }
        for (let j = inputStride; j < outputStride; j++) {
          target[writeIndex + j] = 0;
        }
        writeIndex += interleavedStride2;
      }
    }
    if (!outputStrides) outputStrides = inputStrides;
    const interleavedStride = outputStrides.reduce((a, b) => a + b, 0);
    let totalLength = 0;
    for (let i2 = 0; i2 < attributes.length; i2++) {
      totalLength += attributes[i2].length / inputStrides[i2] * outputStrides[i2];
    }
    const interleavedArray = new Float32Array(totalLength);
    let offset = 0;
    for (let i2 = 0; i2 < attributes.length; i2++) {
      const attribute = attributes[i2];
      const inputStride = inputStrides[i2];
      const outputStride = outputStrides[i2];
      stridedCopy(interleavedArray, attribute, offset, inputStride, outputStride, interleavedStride);
      offset += outputStride;
    }
    return new _InterleavedVertexAttribute(interleavedArray, interleavedStride);
  }
};
var IndexAttribute = class extends GeometryAttribute {
  constructor(array) {
    super(array, 4 /* INDEX */);
  }
};
var Geometry = class _Geometry {
  id = Utils.UUID();
  index;
  attributes = /* @__PURE__ */ new Map();
  enableShadows = true;
  _boundingVolume;
  get boundingVolume() {
    const positions = this.attributes.get("position");
    if (!positions) throw Error("Geometry has no position attribute");
    if (!this._boundingVolume) this._boundingVolume = BoundingVolume.FromVertices(positions.array);
    return this._boundingVolume;
  }
  ComputeBoundingVolume() {
    const positions = this.attributes.get("position");
    if (!positions) throw Error("Geometry has no position attribute");
    this._boundingVolume = BoundingVolume.FromVertices(positions.array);
  }
  Clone() {
    const clone = new _Geometry();
    for (const attribute of this.attributes) {
      clone.attributes.set(attribute[0], attribute[1]);
    }
    if (this.index) {
      clone.index = new IndexAttribute(this.index.array);
    }
    clone.enableShadows = this.enableShadows;
    return clone;
  }
  ApplyOperationToVertices(operation, vec) {
    let verts = this.attributes.get("position");
    if (!verts) throw Error("No verts");
    if (verts instanceof InterleavedVertexAttribute) throw Error("InterleavedVertexAttribute not implemented.");
    const center = this.boundingVolume.center;
    let vertsCentered = new Float32Array(verts.array.length);
    for (let i2 = 0; i2 < verts.array.length; i2 += 3) {
      if (operation === "+") {
        vertsCentered[i2 + 0] = verts.array[i2 + 0] + vec.x;
        vertsCentered[i2 + 1] = verts.array[i2 + 1] + vec.y;
        vertsCentered[i2 + 2] = verts.array[i2 + 2] + vec.z;
      } else if (operation === "*") {
        vertsCentered[i2 + 0] = verts.array[i2 + 0] * vec.x;
        vertsCentered[i2 + 1] = verts.array[i2 + 1] * vec.y;
        vertsCentered[i2 + 2] = verts.array[i2 + 2] * vec.z;
      }
    }
    const geometryCentered = this.Clone();
    geometryCentered.attributes.set("position", new VertexAttribute(vertsCentered));
    return geometryCentered;
  }
  Center() {
    const center = this.boundingVolume.center;
    return this.ApplyOperationToVertices("+", center.mul(-1));
  }
  Scale(scale) {
    return this.ApplyOperationToVertices("*", scale);
  }
  ComputeNormals() {
    let posAttrData = this.attributes.get("position")?.array;
    let indexAttrData = this.index?.array;
    if (!posAttrData || !indexAttrData) throw Error("Cannot compute normals without vertices and indices");
    let normalAttrData = new Float32Array(posAttrData.length);
    let trianglesCount = indexAttrData.length / 3;
    let point1 = new Vector3(0, 1, 0);
    let point2 = new Vector3(0, 1, 0);
    let point3 = new Vector3(0, 1, 0);
    let crossA = new Vector3(0, 1, 0);
    let crossB = new Vector3(0, 1, 0);
    for (let i2 = 0; i2 < trianglesCount; i2++) {
      let index1 = indexAttrData[i2 * 3];
      let index2 = indexAttrData[i2 * 3 + 1];
      let index3 = indexAttrData[i2 * 3 + 2];
      point1.set(posAttrData[index1 * 3], posAttrData[index1 * 3 + 1], posAttrData[index1 * 3 + 2]);
      point2.set(posAttrData[index2 * 3], posAttrData[index2 * 3 + 1], posAttrData[index2 * 3 + 2]);
      point3.set(posAttrData[index3 * 3], posAttrData[index3 * 3 + 1], posAttrData[index3 * 3 + 2]);
      crossA.copy(point1).sub(point2).normalize();
      crossB.copy(point1).sub(point3).normalize();
      let normal = crossA.clone().cross(crossB).normalize();
      normalAttrData[index1 * 3] = normalAttrData[index2 * 3] = normalAttrData[index3 * 3] = normal.x;
      normalAttrData[index1 * 3 + 1] = normalAttrData[index2 * 3 + 1] = normalAttrData[index3 * 3 + 1] = normal.y;
      normalAttrData[index1 * 3 + 2] = normalAttrData[index2 * 3 + 2] = normalAttrData[index3 * 3 + 2] = normal.z;
    }
    let normals = this.attributes.get("normal");
    if (!normals) normals = new VertexAttribute(normalAttrData);
    this.attributes.set("normal", normals);
  }
  static ToNonIndexed(vertices, indices) {
    const itemSize = 3;
    const array2 = new Float32Array(indices.length * itemSize);
    let index = 0, index2 = 0;
    for (let i2 = 0, l = indices.length; i2 < l; i2++) {
      index = indices[i2] * itemSize;
      for (let j = 0; j < itemSize; j++) {
        array2[index2++] = vertices[index++];
      }
    }
    return array2;
  }
  static Cube() {
    const vertices = new Float32Array([
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      -0.5,
      0.5,
      0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5,
      -0.5
    ]);
    const uvs = new Float32Array([
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      1,
      0
    ]);
    const normals = new Float32Array([
      1,
      0,
      0,
      1,
      0,
      -0,
      1,
      0,
      -0,
      1,
      0,
      -0,
      -1,
      0,
      0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      -0,
      -1,
      0,
      0,
      -0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1,
      0,
      0,
      -1
    ]);
    const indices = new Uint32Array([
      0,
      2,
      1,
      2,
      3,
      1,
      4,
      6,
      5,
      6,
      7,
      5,
      8,
      10,
      9,
      10,
      11,
      9,
      12,
      14,
      13,
      14,
      15,
      13,
      16,
      18,
      17,
      18,
      19,
      17,
      20,
      22,
      21,
      22,
      23,
      21
    ]);
    const geometry = new _Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.attributes.set("normal", new VertexAttribute(normals));
    geometry.index = new IndexAttribute(indices);
    return geometry;
  }
  static Plane() {
    const vertices = new Float32Array([
      -1,
      -1,
      0,
      // Bottom left
      1,
      -1,
      0,
      // Bottom right
      1,
      1,
      0,
      // Top right
      -1,
      1,
      0
      // Top left
    ]);
    const indices = new Uint32Array([
      0,
      1,
      2,
      // First triangle (bottom left to top right)
      2,
      3,
      0
      // Second triangle (top right to top left)
    ]);
    const uvs = new Float32Array([
      0,
      1,
      // Bottom left (now top left)
      1,
      1,
      // Bottom right (now top right)
      1,
      0,
      // Top right (now bottom right)
      0,
      0
      // Top left (now bottom left)
    ]);
    const normals = new Float32Array([
      0,
      0,
      1,
      // Normal for bottom left vertex
      0,
      0,
      1,
      // Normal for bottom right vertex
      0,
      0,
      1,
      // Normal for top right vertex
      0,
      0,
      1
      // Normal for top left vertex
    ]);
    const geometry = new _Geometry();
    geometry.attributes.set("position", new VertexAttribute(vertices));
    geometry.attributes.set("normal", new VertexAttribute(normals));
    geometry.attributes.set("uv", new VertexAttribute(uvs));
    geometry.index = new IndexAttribute(indices);
    return geometry;
  }
  static Sphere() {
    const radius = 0.5;
    const phiStart = 0;
    const phiLength = Math.PI * 2;
    const thetaStart = 0;
    const thetaLength = Math.PI;
    let widthSegments = 16;
    let heightSegments = 8;
    widthSegments = Math.max(3, Math.floor(widthSegments));
    heightSegments = Math.max(2, Math.floor(heightSegments));
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
    let index = 0;
    const grid = [];
    const vertex = new Vector3();
    const normal = new Vector3();
    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];
    for (let iy = 0; iy <= heightSegments; iy++) {
      const verticesRow = [];
      const v = iy / heightSegments;
      let uOffset = 0;
      if (iy === 0 && thetaStart === 0) uOffset = 0.5 / widthSegments;
      else if (iy === heightSegments && thetaEnd === Math.PI) uOffset = -0.5 / widthSegments;
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments;
        vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
        vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
        vertices.push(vertex.x, vertex.y, vertex.z);
        normal.copy(vertex).normalize();
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(u + uOffset, 1 - v);
        verticesRow.push(index++);
      }
      grid.push(verticesRow);
    }
    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = grid[iy][ix + 1];
        const b = grid[iy][ix];
        const c = grid[iy + 1][ix];
        const d = grid[iy + 1][ix + 1];
        if (iy !== 0 || thetaStart > 0) indices.push(a, b, d);
        if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d);
      }
    }
    const geometry = new _Geometry();
    geometry.index = new IndexAttribute(new Uint32Array(indices));
    geometry.attributes.set("position", new VertexAttribute(new Float32Array(vertices)));
    geometry.attributes.set("normal", new VertexAttribute(new Float32Array(normals)));
    geometry.attributes.set("uv", new VertexAttribute(new Float32Array(uvs)));
    return geometry;
  }
};

// src/renderer/webgpu/WEBGPUTimestampQuery.ts
var WEBGPUTimestampQuery = class {
  static querySet;
  static resolveBuffer;
  static resultBuffer;
  static isTimestamping = false;
  static links = /* @__PURE__ */ new Map();
  static currentLinkIndex = 0;
  static BeginRenderTimestamp(name) {
    if (this.links.has(name)) return void 0;
    if (!navigator.userAgent.toLowerCase().includes("chrome")) return void 0;
    if (this.isTimestamping === true) throw Error("Already timestamping");
    if (!this.querySet) {
      this.querySet = WEBGPURenderer.device.createQuerySet({
        type: "timestamp",
        count: 200
      });
    }
    if (!this.resolveBuffer) {
      this.resolveBuffer = WEBGPURenderer.device.createBuffer({
        size: this.querySet.count * 8,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
      });
    }
    if (!this.resultBuffer) {
      this.resultBuffer = WEBGPURenderer.device.createBuffer({
        size: this.querySet.count * 8,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });
    }
    this.isTimestamping = true;
    const currentLinkIndex = this.currentLinkIndex;
    this.currentLinkIndex += 2;
    this.links.set(name, currentLinkIndex);
    return { querySet: this.querySet, beginningOfPassWriteIndex: currentLinkIndex, endOfPassWriteIndex: currentLinkIndex + 1 };
  }
  static EndRenderTimestamp() {
    if (this.isTimestamping === false) return;
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.resultBuffer.mapState === "unmapped") {
      activeCommandEncoder.resolveQuerySet(this.querySet, 0, this.querySet.count, this.resolveBuffer, 0);
      activeCommandEncoder.copyBufferToBuffer(this.resolveBuffer, 0, this.resultBuffer, 0, this.resultBuffer.size);
    }
    this.isTimestamping = false;
  }
  static async GetResult() {
    if (!this.resultBuffer || this.resultBuffer.mapState !== "unmapped") return;
    await this.resultBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = this.resultBuffer.getMappedRange().slice(0);
    const times = new BigInt64Array(arrayBuffer);
    let visited = {};
    let frameTimes = /* @__PURE__ */ new Map();
    for (const [name, num] of this.links) {
      if (visited[name] === true) continue;
      const duration = Number(times[num + 1] - times[num]);
      frameTimes.set(name, duration);
      visited[name] = true;
    }
    this.resultBuffer.unmap();
    this.currentLinkIndex = 0;
    this.links.clear();
    return frameTimes;
  }
};

// src/renderer/webgpu/WEBGPURendererContext.ts
var WEBGPURendererContext = class {
  static activeRenderPass = null;
  static BeginRenderPass(name, renderTargets, depthTarget, timestamp) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    if (this.activeRenderPass) throw Error("There is already an active render pass");
    const renderPassDescriptor = { colorAttachments: [], label: "RenderPassDescriptor: " + name };
    if (timestamp === true) renderPassDescriptor.timestampWrites = WEBGPUTimestampQuery.BeginRenderTimestamp(name);
    const attachments = [];
    for (const renderTarget of renderTargets) {
      attachments.push({
        view: renderTarget.target ? renderTarget.target.GetView() : WEBGPURenderer.context.getCurrentTexture().createView(),
        clearValue: renderTarget.color,
        loadOp: renderTarget.clear ? "clear" : "load",
        storeOp: "store"
      });
    }
    renderPassDescriptor.colorAttachments = attachments;
    if (depthTarget?.target) {
      renderPassDescriptor.depthStencilAttachment = {
        view: depthTarget.target.GetView(),
        depthClearValue: 1,
        depthLoadOp: depthTarget.clear ? "clear" : "load",
        depthStoreOp: "store"
      };
    }
    this.activeRenderPass = activeCommandEncoder.beginRenderPass(renderPassDescriptor);
    this.activeRenderPass.label = "RenderPass: " + name;
  }
  static EndRenderPass() {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.end();
    this.activeRenderPass = null;
    WEBGPUTimestampQuery.EndRenderTimestamp();
  }
  static DrawGeometry(geometry, shader, instanceCount = 1) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    if (!shader.OnPreRender()) return;
    shader.Compile();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    RendererDebug.IncrementDrawCalls(1);
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i2 = 0; i2 < shader.bindGroups.length; i2++) {
      let dynamicOffsets = [];
      for (const buffer of shader.bindGroupsInfo[i2].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsets.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i2, shader.bindGroups[i2], dynamicOffsets);
    }
    for (const [name, attribute] of geometry.attributes) {
      const attributeSlot = shader.GetAttributeSlot(name);
      if (attributeSlot === void 0) continue;
      const attributeBuffer = attribute.buffer;
      this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
    }
    if (!shader.params.topology || shader.params.topology === "triangle-list" /* Triangles */) {
      if (!geometry.index) {
        const positions = geometry.attributes.get("position");
        this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount);
      } else {
        const indexBuffer = geometry.index.buffer;
        this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
        this.activeRenderPass.drawIndexed(indexBuffer.size / 4, instanceCount);
      }
    } else if (shader.params.topology === "line-list" /* Lines */) {
      const positions = geometry.attributes.get("position");
      this.activeRenderPass.draw(positions.GetBuffer().size / 3 / 4, instanceCount);
    }
  }
  static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    shader.Compile();
    if (!shader.pipeline) throw Error("Shader doesnt have a pipeline");
    this.activeRenderPass.setPipeline(shader.pipeline);
    for (let i2 = 0; i2 < shader.bindGroups.length; i2++) {
      let dynamicOffsetsV2 = [];
      for (const buffer of shader.bindGroupsInfo[i2].buffers) {
        if (buffer instanceof WEBGPUDynamicBuffer) {
          dynamicOffsetsV2.push(buffer.dynamicOffset);
        }
      }
      this.activeRenderPass.setBindGroup(i2, shader.bindGroups[i2], dynamicOffsetsV2);
    }
    for (const [name, attribute] of geometry.attributes) {
      const attributeSlot = shader.GetAttributeSlot(name);
      if (attributeSlot === void 0) continue;
      const attributeBuffer = attribute.buffer;
      this.activeRenderPass.setVertexBuffer(attributeSlot, attributeBuffer.GetBuffer());
    }
    if (!geometry.index) {
      this.activeRenderPass.drawIndirect(indirectBuffer.GetBuffer(), indirectOffset);
    } else {
      const indexBuffer = geometry.index.buffer;
      this.activeRenderPass.setIndexBuffer(indexBuffer.GetBuffer(), "uint32");
      this.activeRenderPass.drawIndexedIndirect(indirectBuffer.GetBuffer(), indirectOffset);
    }
  }
  static SetViewport(x, y, width, height, minDepth, maxDepth) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.setViewport(x, y, width, height, minDepth, maxDepth);
  }
  static SetScissor(x, y, width, height) {
    if (!this.activeRenderPass) throw Error("No active render pass");
    this.activeRenderPass.setScissorRect(x, y, width, height);
  }
  static CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.copyBufferToBuffer(source.GetBuffer(), sourceOffset, destination.GetBuffer(), destinationOffset, size);
  }
  static CopyBufferToTexture(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { buffer: source.buffer.GetBuffer(), offset: source.offset, bytesPerRow: source.bytesPerRow, rowsPerImage: source.rowsPerImage };
    const destinationParameters = { texture: destination.texture.GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin };
    const extents = copySize ? copySize : [destination.texture.width, destination.texture.height, destination.texture.depth];
    activeCommandEncoder.copyBufferToTexture(sourceParameters, destinationParameters, extents);
  }
  // CopyTexture(Texture src, int srcElement, int srcMip, Texture dst, int dstElement, int dstMip);
  static CopyTextureToTexture(source, destination, srcMip, dstMip, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToTexture({ texture: source.GetBuffer(), mipLevel: srcMip }, { texture: destination.GetBuffer(), mipLevel: dstMip }, extents);
  }
  static CopyTextureToBuffer(source, destination, srcMip, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToBuffer({ texture: source.GetBuffer(), mipLevel: srcMip }, { buffer: destination.GetBuffer(), bytesPerRow: source.width * 4 }, extents);
  }
  static CopyTextureToBufferV2(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { texture: source.texture.GetBuffer(), mipLevel: source.mipLevel, origin: source.origin };
    const destinationParameters = { buffer: destination.buffer.GetBuffer(), offset: destination.offset, bytesPerRow: destination.bytesPerRow, rowsPerImage: destination.rowsPerImage };
    const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
    activeCommandEncoder.copyTextureToBuffer(sourceParameters, destinationParameters, extents);
  }
  static CopyTextureToTextureV2(source, destination, srcMip, dstMip, size, depth) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const extents = size ? size : [source.width, source.height, source.depth];
    activeCommandEncoder.copyTextureToTexture(
      { texture: source.GetBuffer(), mipLevel: srcMip, origin: { x: 0, y: 0, z: 0 } },
      { texture: destination.GetBuffer(), mipLevel: dstMip, origin: { x: 0, y: 0, z: depth ? depth : 0 } },
      extents
    );
  }
  static CopyTextureToTextureV3(source, destination, copySize) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    const sourceParameters = { texture: source.texture.GetBuffer(), mipLevel: source.mipLevel, origin: source.origin };
    const destinationParameters = { texture: destination.texture.GetBuffer(), mipLevel: destination.mipLevel, origin: destination.origin };
    const extents = copySize ? copySize : [source.texture.width, source.texture.height, source.texture.depth];
    activeCommandEncoder.copyTextureToTexture(sourceParameters, destinationParameters, extents);
  }
  static ClearBuffer(buffer, offset, size) {
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) throw Error("No active command encoder!!");
    activeCommandEncoder.clearBuffer(buffer.GetBuffer(), offset, size);
  }
};

// src/renderer/RendererContext.ts
var RendererContext = class {
  constructor() {
  }
  static BeginRenderPass(name, renderTargets, depthTarget, timestamp = false) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.BeginRenderPass(name, renderTargets, depthTarget, timestamp);
    else throw Error("Unknown render api type.");
  }
  static EndRenderPass() {
    if (Renderer.type === "webgpu") WEBGPURendererContext.EndRenderPass();
    else throw Error("Unknown render api type.");
  }
  static SetViewport(x, y, width, height, minDepth = 0, maxDepth = 1) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.SetViewport(x, y, width, height, minDepth, maxDepth);
    else throw Error("Unknown render api type.");
  }
  static SetScissor(x, y, width, height) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.SetScissor(x, y, width, height);
    else throw Error("Unknown render api type.");
  }
  static DrawGeometry(geometry, shader, instanceCount) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.DrawGeometry(geometry, shader, instanceCount);
    else throw Error("Unknown render api type.");
  }
  static DrawIndirect(geometry, shader, indirectBuffer, indirectOffset = 0) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.DrawIndirect(geometry, shader, indirectBuffer, indirectOffset);
    else throw Error("Unknown render api type.");
  }
  static CopyBufferToBuffer(source, destination, sourceOffset = 0, destinationOffset = 0, size = void 0) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyBufferToBuffer(source, destination, sourceOffset, destinationOffset, size ? size : source.size);
    else throw Error("Unknown render api type.");
  }
  static CopyBufferToTexture(source, destination, copySize) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyBufferToTexture(source, destination, copySize);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToTexture(source, destination, srcMip = 0, dstMip = 0, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTexture(source, destination, srcMip, dstMip, size);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToBuffer(source, destination, srcMip, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToBuffer(source, destination, srcMip, size);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToBufferV2(source, destination, copySize) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToBufferV2(source, destination, copySize);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToTextureV2(source, destination, srcMip = 0, dstMip = 0, size, depth) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTextureV2(source, destination, srcMip, dstMip, size, depth);
    else throw Error("Unknown render api type.");
  }
  static CopyTextureToTextureV3(source, destination, copySize) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.CopyTextureToTextureV3(source, destination, copySize);
    else throw Error("Unknown render api type.");
  }
  static ClearBuffer(buffer, offset = 0, size) {
    if (Renderer.type === "webgpu") WEBGPURendererContext.ClearBuffer(buffer, offset, size ? size : buffer.size);
    else throw Error("Unknown render api type.");
  }
};

// src/renderer/webgpu/WEBGPUTextureSampler.ts
var WEBGPUTextureSampler = class {
  id = Utils.UUID();
  params;
  sampler;
  constructor(params) {
    this.params = params;
    const samplerDescriptor = {};
    if (params && params.minFilter) samplerDescriptor.minFilter = params.minFilter;
    if (params && params.magFilter) samplerDescriptor.magFilter = params.magFilter;
    if (params && params.mipmapFilter) samplerDescriptor.mipmapFilter = params.mipmapFilter;
    if (params && params.addressModeU) samplerDescriptor.addressModeU = params.addressModeU;
    if (params && params.addressModeV) samplerDescriptor.addressModeV = params.addressModeV;
    if (params && params.compare) samplerDescriptor.compare = params.compare;
    if (params && params.maxAnisotropy) samplerDescriptor.maxAnisotropy = params.maxAnisotropy;
    this.sampler = WEBGPURenderer.device.createSampler(samplerDescriptor);
  }
  GetBuffer() {
    return this.sampler;
  }
};

// src/renderer/TextureSampler.ts
var defaultSamplerParams = {
  magFilter: "linear",
  minFilter: "linear",
  mipmapFilter: "linear",
  addressModeU: "repeat",
  addressModeV: "repeat",
  compare: void 0,
  maxAnisotropy: 1
};
var TextureSampler = class {
  params;
  static Create(params) {
    const samplerParams = Object.assign({}, defaultSamplerParams, params);
    if (Renderer.type === "webgpu") return new WEBGPUTextureSampler(samplerParams);
    throw Error("Renderer type invalid");
  }
};

// src/renderer/webgpu/utils/WEBGBPUBlit.ts
var i = setInterval(async () => {
  if (Renderer.type === "webgpu") {
    WEBGPUBlit.blitShader = await Shader.Create({
      code: await ShaderLoader.Blit,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        texture: { group: 0, binding: 0, type: "texture" },
        textureSampler: { group: 0, binding: 1, type: "sampler" },
        mip: { group: 0, binding: 2, type: "storage" },
        uv_scale: { group: 0, binding: 3, type: "storage" }
      }
    });
    const textureSampler = TextureSampler.Create();
    WEBGPUBlit.blitShader.SetSampler("textureSampler", textureSampler);
    WEBGPUBlit.blitShader.SetValue("mip", 0);
    clearInterval(i);
  }
}, 100);
var WEBGPUBlit = class {
  static blitShader;
  static blitGeometry;
  static Blit(source, destination, width, height, uv_scale) {
    if (!this.blitShader) throw Error("Blit shader not created");
    if (!this.blitGeometry) this.blitGeometry = Geometry.Plane();
    this.blitShader.SetTexture("texture", source);
    this.blitShader.SetArray("uv_scale", uv_scale.elements);
    const activeCommandEncoder = WEBGPURenderer.GetActiveCommandEncoder();
    if (!activeCommandEncoder) Renderer.BeginRenderFrame();
    RendererContext.BeginRenderPass("Blit", [{ target: destination, clear: true }]);
    RendererContext.SetViewport(0, 0, width, height);
    RendererContext.DrawGeometry(this.blitGeometry, this.blitShader);
    RendererContext.EndRenderPass();
    if (!activeCommandEncoder) Renderer.EndRenderFrame();
  }
};

// src/renderer/Texture.ts
var Texture2 = class {
  id;
  width;
  height;
  depth;
  type;
  dimension;
  SetActiveLayer(layer) {
  }
  GetActiveLayer() {
    throw Error("Base class.");
  }
  SetActiveMip(layer) {
  }
  GetActiveMip() {
    throw Error("Base class.");
  }
  SetActiveMipCount(layer) {
  }
  GetActiveMipCount() {
    throw Error("Base class.");
  }
  GenerateMips() {
  }
  Destroy() {
  }
  SetData(data) {
  }
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 0 /* IMAGE */, "2d", mipLevels);
    throw Error("Renderer type invalid");
  }
  static async Load(url, format = Renderer.SwapChainFormat, flipY = false) {
    const response = await fetch(url);
    const imageBitmap = await createImageBitmap(await response.blob());
    RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4);
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
    throw Error("Renderer type invalid");
  }
  static async LoadImageSource(imageSource, format = Renderer.SwapChainFormat, flipY = false) {
    const imageBitmap = await createImageBitmap(imageSource);
    RendererDebug.IncrementGPUTextureSize(imageBitmap.width * imageBitmap.height * 1 * 4);
    if (Renderer.type === "webgpu") return WEBGPUTexture.FromImageBitmap(imageBitmap, imageBitmap.width, imageBitmap.height, format, flipY);
    throw Error("Renderer type invalid");
  }
  static async Blit(source, destination, width, height, uv_scale = new Vector2(1, 1)) {
    if (Renderer.type === "webgpu") return WEBGPUBlit.Blit(source, destination, width, height, uv_scale);
    throw Error("Renderer type invalid");
  }
};
var DepthTexture = class extends Texture2 {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 1);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d", mipLevels);
    throw Error("Renderer type invalid");
  }
};
var RenderTexture = class extends Texture2 {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 2 /* RENDER_TARGET */, "2d", mipLevels);
    throw Error("Renderer type invalid");
  }
};
var CubeTexture = class extends Texture2 {
  static Create(width, height, depth = 1, format = Renderer.SwapChainFormat, mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 4);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 0 /* IMAGE */, "cube", mipLevels);
    throw Error("Renderer type invalid");
  }
};
var DepthTextureArray = class extends Texture2 {
  static Create(width, height, depth = 1, format = "depth24plus", mipLevels = 1) {
    RendererDebug.IncrementGPUTextureSize(width * height * depth * 1);
    if (Renderer.type === "webgpu") return new WEBGPUTexture(width, height, depth, format, 1 /* DEPTH */, "2d-array", mipLevels);
    throw Error("Renderer type invalid");
  }
};

// src/renderer/webgpu/WEBGPUBaseShader.ts
var BindGroupLayoutCache = /* @__PURE__ */ new Map();
var BindGroupCache = /* @__PURE__ */ new Map();
var UniformTypeToWGSL = {
  "uniform": "uniform",
  "storage": "read-only-storage",
  "storage-write": "storage"
};
var WEBGPUBaseShader = class {
  id = Utils.UUID();
  needsUpdate = false;
  module;
  params;
  uniformMap = /* @__PURE__ */ new Map();
  valueArray = new Float32Array(1);
  _pipeline = null;
  _bindGroups = [];
  _bindGroupsInfo = [];
  get pipeline() {
    return this._pipeline;
  }
  get bindGroups() {
    return this._bindGroups;
  }
  get bindGroupsInfo() {
    return this._bindGroupsInfo;
  }
  bindGroupLayouts = [];
  constructor(params) {
    const code = params.defines ? ShaderPreprocessor.ProcessDefines(params.code, params.defines) : params.code;
    this.params = params;
    this.module = WEBGPURenderer.device.createShaderModule({ code });
    if (this.params.uniforms) {
      this.uniformMap = new Map(Object.entries(this.params.uniforms));
    }
  }
  // TODO: This needs cleaning
  BuildBindGroupLayouts() {
    const bindGroupsLayoutEntries = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!bindGroupsLayoutEntries[uniform.group]) bindGroupsLayoutEntries[uniform.group] = [];
      const layoutEntries = bindGroupsLayoutEntries[uniform.group];
      if (uniform.buffer instanceof WEBGPUBuffer) {
        const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        layoutEntries.push({ binding: uniform.binding, visibility, buffer: { type: UniformTypeToWGSL[uniform.type] } });
      } else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
        const visibility = uniform.type === "storage-write" ? GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        layoutEntries.push({
          binding: uniform.binding,
          visibility,
          buffer: {
            type: UniformTypeToWGSL[uniform.type],
            hasDynamicOffset: true,
            minBindingSize: uniform.buffer.minBindingSize
          }
        });
      } else if (uniform.buffer instanceof WEBGPUTexture) {
        let sampleType = uniform.type === "depthTexture" ? "depth" : "float";
        if (uniform.buffer.format.includes("32float")) sampleType = "unfilterable-float";
        else if (uniform.buffer.format.includes("32uint")) sampleType = "uint";
        else if (uniform.buffer.format.includes("32int")) sampleType = "sint";
        if (uniform.buffer.type === 3 /* RENDER_TARGET_STORAGE */) {
          layoutEntries.push({
            binding: uniform.binding,
            visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,
            storageTexture: {
              format: uniform.buffer.format,
              viewDimension: uniform.buffer.dimension,
              access: "read-write"
            }
          });
        } else {
          layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, texture: { sampleType, viewDimension: uniform.buffer.dimension } });
        }
      } else if (uniform.buffer instanceof WEBGPUTextureSampler) {
        let type = void 0;
        if (uniform.type === "sampler") type = "filtering";
        else if (uniform.type === "sampler-compare") type = "comparison";
        else if (uniform.type === "sampler-non-filterable") type = "non-filtering";
        layoutEntries.push({ binding: uniform.binding, visibility: GPUShaderStage.COMPUTE | GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, sampler: { type } });
      }
    }
    let bindGroupLayouts = [];
    for (const bindGroupsLayoutEntry of bindGroupsLayoutEntries) {
      const crc = JSON.stringify(bindGroupsLayoutEntry);
      let bindGroupLayout = BindGroupLayoutCache.get(crc);
      if (bindGroupLayout === void 0) {
        bindGroupLayout = WEBGPURenderer.device.createBindGroupLayout({ entries: bindGroupsLayoutEntry });
        BindGroupLayoutCache.set(crc, bindGroupLayout);
        RendererDebug.IncrementBindGroupLayouts(1);
      }
      bindGroupLayout.label = crc;
      bindGroupLayouts.push(bindGroupLayout);
    }
    return bindGroupLayouts;
  }
  BuildBindGroupsCRC() {
    const crcs = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!crcs[uniform.group]) crcs[uniform.group] = "";
      if (uniform.buffer) {
        crcs[uniform.group] += `${uniform.buffer.id},`;
      }
    }
    return crcs;
  }
  BuildBindGroups() {
    const bindGroupsInfo = [];
    for (const [name, uniform] of this.uniformMap) {
      if (!bindGroupsInfo[uniform.group]) bindGroupsInfo[uniform.group] = { entries: [], buffers: [] };
      const group = bindGroupsInfo[uniform.group];
      if (uniform.buffer instanceof WEBGPUBuffer) {
        group.entries.push({ binding: uniform.binding, resource: { buffer: uniform.buffer.GetBuffer() } });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUDynamicBuffer) {
        group.entries.push({
          binding: uniform.binding,
          resource: {
            buffer: uniform.buffer.GetBuffer(),
            offset: 0,
            size: uniform.buffer.minBindingSize
          }
        });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUTexture) {
        const view = {
          dimension: uniform.buffer.dimension,
          arrayLayerCount: uniform.buffer.dimension != "3d" ? uniform.buffer.GetBuffer().depthOrArrayLayers : 1,
          // arrayLayerCount: uniform.buffer.GetBuffer().depthOrArrayLayers,
          baseArrayLayer: 0,
          baseMipLevel: uniform.textureMip,
          mipLevelCount: uniform.activeMipCount
        };
        group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer().createView(view) });
        group.buffers.push(uniform.buffer);
      } else if (uniform.buffer instanceof WEBGPUTextureSampler) {
        group.entries.push({ binding: uniform.binding, resource: uniform.buffer.GetBuffer() });
        group.buffers.push(uniform.buffer);
      }
    }
    this._bindGroupsInfo = bindGroupsInfo;
    let bindGroupsCRC = this.BuildBindGroupsCRC();
    let bindGroups = [];
    for (let i2 = 0; i2 < bindGroupsInfo.length; i2++) {
      const crc = bindGroupsCRC[i2];
      const bindGroupInfo = bindGroupsInfo[i2];
      const bindGroupLayout = this.bindGroupLayouts[i2];
      let bindGroup = BindGroupCache.get(crc);
      if (bindGroup === void 0) {
        bindGroup = WEBGPURenderer.device.createBindGroup({ layout: bindGroupLayout, entries: bindGroupInfo.entries });
        RendererDebug.IncrementBindGroups(1);
        BindGroupCache.set(crc, bindGroup);
      }
      bindGroups.push(bindGroup);
    }
    return bindGroups;
  }
  GetValidUniform(name) {
    const uniform = this.uniformMap.get(name);
    if (!uniform) throw Error(`Shader does not have a parameter named ${name}`);
    return uniform;
  }
  SetUniformDataFromArray(name, data, dataOffset, bufferOffset = 0, size) {
    const uniform = this.GetValidUniform(name);
    if (!uniform.buffer) {
      let type = 0 /* STORAGE */;
      if (uniform.type === "uniform") type = 2 /* UNIFORM */;
      uniform.buffer = Buffer3.Create(data.byteLength, type);
      this.needsUpdate = true;
    }
    WEBGPURenderer.device.queue.writeBuffer(uniform.buffer.GetBuffer(), bufferOffset, data, dataOffset, size);
  }
  SetUniformDataFromBuffer(name, data) {
    if (!data) throw Error(`Invalid buffer ${name}`);
    const binding = this.GetValidUniform(name);
    if (!binding.buffer || binding.buffer.GetBuffer() !== data.GetBuffer()) {
      binding.buffer = data;
      this.needsUpdate = true;
    }
    if (data instanceof WEBGPUTexture) {
      binding.textureDimension = data.GetActiveLayer();
      binding.textureMip = data.GetActiveMip();
      binding.activeMipCount = data.GetActiveMipCount();
    }
  }
  SetArray(name, array, bufferOffset = 0, dataOffset, size) {
    this.SetUniformDataFromArray(name, array, bufferOffset, dataOffset, size);
  }
  SetValue(name, value) {
    this.valueArray[0] = value;
    this.SetUniformDataFromArray(name, this.valueArray);
  }
  SetMatrix4(name, matrix) {
    this.SetUniformDataFromArray(name, matrix.elements);
  }
  SetVector2(name, vector) {
    this.SetUniformDataFromArray(name, vector.elements);
  }
  SetVector3(name, vector) {
    this.SetUniformDataFromArray(name, vector.elements);
  }
  SetVector4(name, vector) {
    this.SetUniformDataFromArray(name, vector.elements);
  }
  SetTexture(name, texture) {
    this.SetUniformDataFromBuffer(name, texture);
  }
  SetSampler(name, sampler) {
    this.SetUniformDataFromBuffer(name, sampler);
  }
  SetBuffer(name, buffer) {
    this.SetUniformDataFromBuffer(name, buffer);
  }
  HasBuffer(name) {
    return this.uniformMap.get(name)?.buffer ? true : false;
  }
  Compile() {
  }
  OnPreRender() {
    return true;
  }
};

// src/renderer/webgpu/WEBGPUShader.ts
var pipelineLayoutCache = /* @__PURE__ */ new Map();
var pipelineCache = /* @__PURE__ */ new Map();
var WGSLShaderAttributeFormat = {
  vec2: "float32x2",
  vec3: "float32x3",
  vec4: "float32x4"
};
var WEBGPUShader = class extends WEBGPUBaseShader {
  vertexEntrypoint;
  fragmentEntrypoint;
  attributeMap = /* @__PURE__ */ new Map();
  _pipeline = null;
  get pipeline() {
    return this._pipeline;
  }
  constructor(params) {
    super(params);
    this.params = params;
    this.vertexEntrypoint = this.params.vertexEntrypoint;
    this.fragmentEntrypoint = this.params.fragmentEntrypoint;
    if (this.params.attributes) this.attributeMap = new Map(Object.entries(this.params.attributes));
  }
  // TODO: This needs cleaning
  Compile() {
    if (!(this.needsUpdate || !this.pipeline || !this.bindGroups)) {
      return;
    }
    let hasCompiled = false;
    this.bindGroupLayouts = this.BuildBindGroupLayouts();
    this._bindGroups = this.BuildBindGroups();
    let bindGroupLayoutsCRC = "";
    for (const b of this.bindGroupLayouts) bindGroupLayoutsCRC += b.label;
    let pipelineLayout = pipelineLayoutCache.get(bindGroupLayoutsCRC);
    if (pipelineLayout === void 0) {
      pipelineLayout = WEBGPURenderer.device.createPipelineLayout({
        bindGroupLayouts: this.bindGroupLayouts
      });
      pipelineLayout.label = Utils.UUID();
      pipelineLayoutCache.set(bindGroupLayoutsCRC, pipelineLayout);
      hasCompiled = true;
    }
    let targets = [];
    for (const output of this.params.colorOutputs) targets.push({
      format: output.format
      // blend: {
      //     color: {
      //       srcFactor: 'one',
      //       dstFactor: 'one-minus-src-alpha',
      //       operation: 'add',
      //     },
      //     alpha: {
      //       srcFactor: 'one',
      //       dstFactor: 'one-minus-src-alpha',
      //       operation: 'add',
      //     },
      // }
    });
    const pipelineDescriptor = {
      layout: pipelineLayout,
      vertex: { module: this.module, entryPoint: this.vertexEntrypoint, buffers: [] },
      fragment: { module: this.module, entryPoint: this.fragmentEntrypoint, targets },
      primitive: {
        topology: this.params.topology ? this.params.topology : "triangle-list",
        frontFace: this.params.frontFace ? this.params.frontFace : "ccw",
        cullMode: this.params.cullMode ? this.params.cullMode : "back"
      }
    };
    if (this.params.depthOutput) {
      pipelineDescriptor.depthStencil = {
        depthWriteEnabled: this.params.depthWriteEnabled !== void 0 ? this.params.depthWriteEnabled : true,
        depthCompare: this.params.depthCompare ? this.params.depthCompare : "less",
        depthBias: this.params.depthBias ? this.params.depthBias : void 0,
        depthBiasSlopeScale: this.params.depthBiasSlopeScale ? this.params.depthBiasSlopeScale : void 0,
        depthBiasClamp: this.params.depthBiasClamp ? this.params.depthBiasClamp : void 0,
        format: this.params.depthOutput
      };
    }
    const buffers = [];
    for (const [_, attribute] of this.attributeMap) {
      buffers.push({ arrayStride: attribute.size * 4, attributes: [{ shaderLocation: attribute.location, offset: 0, format: WGSLShaderAttributeFormat[attribute.type] }] });
    }
    pipelineDescriptor.vertex.buffers = buffers;
    pipelineDescriptor.label += "," + pipelineLayout.label;
    const pipelineDescriptorKey = JSON.stringify(pipelineDescriptor);
    let pipeline = pipelineCache.get(pipelineDescriptorKey);
    if (!pipeline) {
      pipeline = WEBGPURenderer.device.createRenderPipeline(pipelineDescriptor);
      pipelineCache.set(pipelineDescriptorKey, pipeline);
      hasCompiled = true;
    }
    this._pipeline = pipeline;
    if (hasCompiled === true) {
      console.warn("%c Compiling shader", "color: #3498db");
      RendererDebug.IncrementShaderCompiles(1);
    }
    this.needsUpdate = false;
  }
  GetAttributeSlot(name) {
    return this.attributeMap.get(name)?.location;
  }
};

// src/renderer/Shader.ts
var BaseShader = class {
  id;
  params;
  constructor() {
  }
  SetValue(name, value) {
  }
  SetMatrix4(name, matrix) {
  }
  SetVector2(name, vector) {
  }
  SetVector3(name, vector) {
  }
  SetVector4(name, vector) {
  }
  SetArray(name, array, bufferOffset, dataOffset, size) {
  }
  SetTexture(name, texture) {
  }
  SetSampler(name, texture) {
  }
  SetBuffer(name, buffer) {
  }
  HasBuffer(name) {
    return false;
  }
  OnPreRender(geometry) {
    return true;
  }
};
var Shader = class extends BaseShader {
  static async Create(params) {
    params.code = await ShaderPreprocessor.ProcessIncludes(params.code);
    if (Renderer.type === "webgpu") return new WEBGPUShader(params);
    throw Error("Unknown api");
  }
};

// src/math/Vector4.ts
var Vector4 = class _Vector4 {
  _x;
  _y;
  _z;
  _w;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  get w() {
    return this._w;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  set z(v) {
    this._z = v;
  }
  set w(v) {
    this._w = v;
  }
  _elements = new Float32Array(4);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    this._elements[2] = this._z;
    this._elements[3] = this._w;
    return this._elements;
  }
  constructor(x = 0, y = 0, z = 0, w = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  setX(x) {
    this.x = x;
    return this;
  }
  setY(y) {
    this.y = y;
    return this;
  }
  setZ(z) {
    this.z = z;
    return this;
  }
  setW(w) {
    this.w = w;
    return this;
  }
  clone() {
    return new _Vector4(this.x, this.y, this.z, this.w);
  }
  copy(v) {
    return this.set(v.x, v.y, v.z, v.w);
  }
  applyMatrix4(m) {
    const x = this.x, y = this.y, z = this.z, w = this.w;
    const e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z + e[12] * w;
    this.y = e[1] * x + e[5] * y + e[9] * z + e[13] * w;
    this.z = e[2] * x + e[6] * y + e[10] * z + e[14] * w;
    this.w = e[3] * x + e[7] * y + e[11] * z + e[15] * w;
    return this;
  }
  normalize() {
    let x = this.x;
    let y = this.y;
    let z = this.z;
    let w = this.w;
    let len = x * x + y * y + z * z + w * w;
    if (len > 0) len = 1 / Math.sqrt(len);
    this.x = x * len;
    this.y = y * len;
    this.z = z * len;
    this.w = w * len;
    return this;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }
  toString() {
    return `(${this.x.toPrecision(2)}, ${this.y.toPrecision(2)}, ${this.z.toPrecision(2)}, ${this.w.toPrecision(2)})`;
  }
};

// src/math/Color.ts
var Color = class _Color {
  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  _elements = new Float32Array([0, 0, 0, 0]);
  get elements() {
    this._elements.set([this.r, this.g, this.b, this.a]);
    return this._elements;
  }
  set(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  static fromVector(v) {
    return new _Color(v.x, v.y, v.z, v instanceof Vector4 ? v.w : 0);
  }
  static fromHex(hex) {
    return new _Color((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255);
  }
  mul(v) {
    if (v instanceof _Color) this.r *= v.r, this.g *= v.g, this.b *= v.b;
    else this.r *= v, this.g *= v, this.b *= v;
    return this;
  }
  toHex() {
    const r = Math.floor(this.r * 255).toString(16).padStart(2, "0");
    const g = Math.floor(this.g * 255).toString(16).padStart(2, "0");
    const b = Math.floor(this.b * 255).toString(16).padStart(2, "0");
    const a = Math.floor(this.a * 255).toString(16).padStart(2, "0");
    return "#" + r + g + b + a;
  }
};

// src/math/Matrix4.ts
var Matrix4 = class _Matrix4 {
  elements;
  constructor(n11 = 1, n12 = 0, n13 = 0, n14 = 0, n21 = 0, n22 = 1, n23 = 0, n24 = 0, n31 = 0, n32 = 0, n33 = 1, n34 = 0, n41 = 0, n42 = 0, n43 = 0, n44 = 1) {
    this.elements = new Float32Array(16);
    this.set(
      n11,
      n12,
      n13,
      n14,
      n21,
      n22,
      n23,
      n24,
      n31,
      n32,
      n33,
      n34,
      n41,
      n42,
      n43,
      n44
    );
  }
  copy(m) {
    const te = this.elements;
    const me = m.elements;
    te[0] = me[0];
    te[1] = me[1];
    te[2] = me[2];
    te[3] = me[3];
    te[4] = me[4];
    te[5] = me[5];
    te[6] = me[6];
    te[7] = me[7];
    te[8] = me[8];
    te[9] = me[9];
    te[10] = me[10];
    te[11] = me[11];
    te[12] = me[12];
    te[13] = me[13];
    te[14] = me[14];
    te[15] = me[15];
    return this;
  }
  set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
    const te = this.elements;
    te[0] = n11;
    te[4] = n12;
    te[8] = n13;
    te[12] = n14;
    te[1] = n21;
    te[5] = n22;
    te[9] = n23;
    te[13] = n24;
    te[2] = n31;
    te[6] = n32;
    te[10] = n33;
    te[14] = n34;
    te[3] = n41;
    te[7] = n42;
    te[11] = n43;
    te[15] = n44;
    return this;
  }
  setFromArray(array) {
    this.elements.set(array);
    return this;
  }
  clone() {
    return new _Matrix4().setFromArray(this.elements);
  }
  compose(position, quaternion, scale) {
    const te = this.elements;
    const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    const sx = scale.x, sy = scale.y, sz = scale.z;
    te[0] = (1 - (yy + zz)) * sx;
    te[1] = (xy + wz) * sx;
    te[2] = (xz - wy) * sx;
    te[3] = 0;
    te[4] = (xy - wz) * sy;
    te[5] = (1 - (xx + zz)) * sy;
    te[6] = (yz + wx) * sy;
    te[7] = 0;
    te[8] = (xz + wy) * sz;
    te[9] = (yz - wx) * sz;
    te[10] = (1 - (xx + yy)) * sz;
    te[11] = 0;
    te[12] = position.x;
    te[13] = position.y;
    te[14] = position.z;
    te[15] = 1;
    return this;
  }
  decompose(position, quaternion, scale) {
    const te = this.elements;
    let sx = _v1.set(te[0], te[1], te[2]).length();
    const sy = _v1.set(te[4], te[5], te[6]).length();
    const sz = _v1.set(te[8], te[9], te[10]).length();
    const det = this.determinant();
    if (det < 0) sx = -sx;
    position.x = te[12];
    position.y = te[13];
    position.z = te[14];
    _m1.copy(this);
    const invSX = 1 / sx;
    const invSY = 1 / sy;
    const invSZ = 1 / sz;
    _m1.elements[0] *= invSX;
    _m1.elements[1] *= invSX;
    _m1.elements[2] *= invSX;
    _m1.elements[4] *= invSY;
    _m1.elements[5] *= invSY;
    _m1.elements[6] *= invSY;
    _m1.elements[8] *= invSZ;
    _m1.elements[9] *= invSZ;
    _m1.elements[10] *= invSZ;
    quaternion.setFromRotationMatrix(_m1);
    scale.x = sx;
    scale.y = sy;
    scale.z = sz;
    return this;
  }
  mul(m) {
    return this.multiplyMatrices(this, m);
  }
  premultiply(m) {
    return this.multiplyMatrices(m, this);
  }
  multiplyMatrices(a, b) {
    const ae = a.elements;
    const be = b.elements;
    const te = this.elements;
    const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
    const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
    const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
    const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
    const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
    const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
    const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
    const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
    te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
    te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
    return this;
  }
  invert() {
    const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15], t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44, t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44, t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44, t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
    if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const detInv = 1 / det;
    te[0] = t11 * detInv;
    te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
    te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
    te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;
    te[4] = t12 * detInv;
    te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
    te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
    te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;
    te[8] = t13 * detInv;
    te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
    te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
    te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;
    te[12] = t14 * detInv;
    te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
    te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
    te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
    return this;
  }
  determinant() {
    const te = this.elements;
    const n11 = te[0], n12 = te[4], n13 = te[8], n14 = te[12];
    const n21 = te[1], n22 = te[5], n23 = te[9], n24 = te[13];
    const n31 = te[2], n32 = te[6], n33 = te[10], n34 = te[14];
    const n41 = te[3], n42 = te[7], n43 = te[11], n44 = te[15];
    return n41 * (+n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34) + n42 * (+n11 * n23 * n34 - n11 * n24 * n33 + n14 * n21 * n33 - n13 * n21 * n34 + n13 * n24 * n31 - n14 * n23 * n31) + n43 * (+n11 * n24 * n32 - n11 * n22 * n34 - n14 * n21 * n32 + n12 * n21 * n34 + n14 * n22 * n31 - n12 * n24 * n31) + n44 * (-n13 * n22 * n31 - n11 * n23 * n32 + n11 * n22 * n33 + n13 * n21 * n32 - n12 * n21 * n33 + n12 * n23 * n31);
  }
  transpose() {
    const te = this.elements;
    let tmp;
    tmp = te[1];
    te[1] = te[4];
    te[4] = tmp;
    tmp = te[2];
    te[2] = te[8];
    te[8] = tmp;
    tmp = te[6];
    te[6] = te[9];
    te[9] = tmp;
    tmp = te[3];
    te[3] = te[12];
    te[12] = tmp;
    tmp = te[7];
    te[7] = te[13];
    te[13] = tmp;
    tmp = te[11];
    te[11] = te[14];
    te[14] = tmp;
    return this;
  }
  perspective(fov, aspect, near, far) {
    const fovRad = fov;
    const f = 1 / Math.tan(fovRad / 2);
    const depth = 1 / (near - far);
    return this.set(f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * depth, -1, 0, 0, 2 * far * near * depth, 0);
  }
  perspectiveZO(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    this.elements[0] = f / aspect;
    this.elements[1] = 0;
    this.elements[2] = 0;
    this.elements[3] = 0;
    this.elements[4] = 0;
    this.elements[5] = f;
    this.elements[6] = 0;
    this.elements[7] = 0;
    this.elements[8] = 0;
    this.elements[9] = 0;
    this.elements[11] = -1;
    this.elements[12] = 0;
    this.elements[13] = 0;
    this.elements[15] = 0;
    if (far != null && far !== Infinity) {
      const nf = 1 / (near - far);
      this.elements[10] = far * nf;
      this.elements[14] = far * near * nf;
    } else {
      this.elements[10] = -1;
      this.elements[14] = -near;
    }
    return this;
  }
  perspectiveLH(fovy, aspect, near, far) {
    const out = this.elements;
    const f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = far / (far - near);
    out[11] = 1;
    out[12] = 0;
    out[13] = 0;
    out[14] = -near * far / (far - near);
    out[15] = 0;
    return this;
  }
  perspectiveWGPUMatrix(fieldOfViewYInRadians, aspect, zNear, zFar) {
    const f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewYInRadians);
    const te = this.elements;
    te[0] = f / aspect;
    te[1] = 0;
    te[2] = 0;
    te[3] = 0;
    te[4] = 0;
    te[5] = f;
    te[6] = 0;
    te[7] = 0;
    te[8] = 0;
    te[9] = 0;
    te[11] = -1;
    te[12] = 0;
    te[13] = 0;
    te[15] = 0;
    if (Number.isFinite(zFar)) {
      const rangeInv = 1 / (zNear - zFar);
      te[10] = zFar * rangeInv;
      te[14] = zFar * zNear * rangeInv;
    } else {
      te[10] = -1;
      te[14] = -zNear;
    }
    return this;
  }
  orthoZO(left, right, bottom, top, near, far) {
    var lr = 1 / (left - right);
    var bt = 1 / (bottom - top);
    var nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = near * nf;
    out[15] = 1;
    return this.setFromArray(out);
  }
  // public orthoZO(left: number, right: number, bottom: number, top: number, near: number, far: number): Matrix4 {
  // 	var lr = 1 / (left - right);
  // 	var bt = 1 / (bottom - top);
  // 	var nf = 1 / (far - near);
  // 	const out = new Float32Array(16);
  // 	out[0] = -2 * lr;
  // 	out[1] = 0;
  // 	out[2] = 0;
  // 	out[3] = 0;
  // 	out[4] = 0;
  // 	out[5] = -2 * bt;
  // 	out[6] = 0;
  // 	out[7] = 0;
  // 	out[8] = 0;
  // 	out[9] = 0;
  // 	out[10] = nf;
  // 	out[11] = 0;
  // 	out[12] = (left + right) * lr;
  // 	out[13] = (top + bottom) * bt;
  // 	out[14] = -near * nf;
  // 	out[15] = 1;
  // 	return this.setFromArray(out);
  // }
  identity() {
    this.elements[0] = 1;
    this.elements[1] = 0;
    this.elements[2] = 0;
    this.elements[3] = 0;
    this.elements[4] = 0;
    this.elements[5] = 1;
    this.elements[6] = 0;
    this.elements[7] = 0;
    this.elements[8] = 0;
    this.elements[9] = 0;
    this.elements[10] = 1;
    this.elements[11] = 0;
    this.elements[12] = 0;
    this.elements[13] = 0;
    this.elements[14] = 0;
    this.elements[15] = 1;
    return this;
  }
  // LH
  lookAt(eye, center, up) {
    let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
    z0 = center.x - eye.x;
    z1 = center.y - eye.y;
    z2 = center.z - eye.z;
    len = z0 * z0 + z1 * z1 + z2 * z2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      z0 *= len;
      z1 *= len;
      z2 *= len;
    }
    x0 = up.y * z2 - up.z * z1;
    x1 = up.z * z0 - up.x * z2;
    x2 = up.x * z1 - up.y * z0;
    len = x0 * x0 + x1 * x1 + x2 * x2;
    if (len > 0) {
      len = 1 / Math.sqrt(len);
      x0 *= len;
      x1 *= len;
      x2 *= len;
    }
    y0 = z1 * x2 - z2 * x1;
    y1 = z2 * x0 - z0 * x2;
    y2 = z0 * x1 - z1 * x0;
    const out = this.elements;
    out[0] = x0;
    out[1] = y0;
    out[2] = z0;
    out[3] = 0;
    out[4] = x1;
    out[5] = y1;
    out[6] = z1;
    out[7] = 0;
    out[8] = x2;
    out[9] = y2;
    out[10] = z2;
    out[11] = 0;
    out[12] = -(x0 * eye.x + x1 * eye.y + x2 * eye.z);
    out[13] = -(y0 * eye.x + y1 * eye.y + y2 * eye.z);
    out[14] = -(z0 * eye.x + z1 * eye.y + z2 * eye.z);
    out[15] = 1;
    return this;
  }
  translate(v) {
    this.set(
      1,
      0,
      0,
      v.x,
      0,
      1,
      0,
      v.y,
      0,
      0,
      1,
      v.z,
      0,
      0,
      0,
      1
    );
    return this;
  }
  scale(v) {
    const te = this.elements;
    const x = v.x, y = v.y, z = v.z;
    te[0] *= x;
    te[4] *= y;
    te[8] *= z;
    te[1] *= x;
    te[5] *= y;
    te[9] *= z;
    te[2] *= x;
    te[6] *= y;
    te[10] *= z;
    te[3] *= x;
    te[7] *= y;
    te[11] *= z;
    return this;
  }
  makeTranslation(v) {
    this.set(
      1,
      0,
      0,
      v.x,
      0,
      1,
      0,
      v.y,
      0,
      0,
      1,
      v.z,
      0,
      0,
      0,
      1
    );
    return this;
  }
  makeScale(v) {
    this.set(
      v.x,
      0,
      0,
      0,
      0,
      v.y,
      0,
      0,
      0,
      0,
      v.z,
      0,
      0,
      0,
      0,
      1
    );
    return this;
  }
};
var _v1 = new Vector3();
var _m1 = new Matrix4();

// src/math/Quaternion.ts
var EPSILON = 1e-4;
var Quaternion = class _Quaternion {
  _a = new Vector3();
  _b = new Vector3();
  _c = new Vector3();
  _x;
  _y;
  _z;
  _w;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  get w() {
    return this._w;
  }
  set x(v) {
    this._x = v;
  }
  set y(v) {
    this._y = v;
  }
  set z(v) {
    this._z = v;
  }
  set w(v) {
    this._w = v;
  }
  _elements = new Float32Array(4);
  get elements() {
    this._elements[0] = this._x;
    this._elements[1] = this._y;
    this._elements[2] = this._z;
    this._elements[3] = this._w;
    return this._elements;
  }
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  equals(v) {
    return Math.abs(v.x - this.x) < EPSILON && Math.abs(v.y - this.y) < EPSILON && Math.abs(v.z - this.z) < EPSILON && Math.abs(v.w - this.w) < EPSILON;
  }
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  clone() {
    return new _Quaternion(this.x, this.y, this.z, this.w);
  }
  copy(quaternion) {
    this.x = quaternion.x;
    this.y = quaternion.y;
    this.z = quaternion.z;
    this.w = quaternion.w;
    return this;
  }
  fromEuler(euler, inDegrees = false) {
    const roll = inDegrees ? euler.x * Math.PI / 180 : euler.x;
    const pitch = inDegrees ? euler.y * Math.PI / 180 : euler.y;
    const yaw = inDegrees ? euler.z * Math.PI / 180 : euler.z;
    const cr = Math.cos(roll * 0.5);
    const sr = Math.sin(roll * 0.5);
    const cp = Math.cos(pitch * 0.5);
    const sp = Math.sin(pitch * 0.5);
    const cy = Math.cos(yaw * 0.5);
    const sy = Math.sin(yaw * 0.5);
    this.w = cr * cp * cy + sr * sp * sy;
    this.x = sr * cp * cy - cr * sp * sy;
    this.y = cr * sp * cy + sr * cp * sy;
    this.z = cr * cp * sy - sr * sp * cy;
    return this;
  }
  toEuler(out, inDegrees = false) {
    if (!out) out = new Vector3();
    const sinr_cosp = 2 * (this.w * this.x + this.y * this.z);
    const cosr_cosp = 1 - 2 * (this.x * this.x + this.y * this.y);
    out.x = Math.atan2(sinr_cosp, cosr_cosp);
    const sinp = Math.sqrt(1 + 2 * (this.w * this.y - this.x * this.z));
    const cosp = Math.sqrt(1 - 2 * (this.w * this.y - this.x * this.z));
    out.y = 2 * Math.atan2(sinp, cosp) - Math.PI / 2;
    const siny_cosp = 2 * (this.w * this.z + this.x * this.y);
    const cosy_cosp = 1 - 2 * (this.y * this.y + this.z * this.z);
    out.z = Math.atan2(siny_cosp, cosy_cosp);
    if (inDegrees) {
      out.x *= 180 / Math.PI;
      out.y *= 180 / Math.PI;
      out.z *= 180 / Math.PI;
    }
    return out;
  }
  mul(b) {
    const qax = this._x, qay = this._y, qaz = this._z, qaw = this._w;
    const qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;
    this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    return this;
  }
  lookAt(eye, target, up) {
    const z = this._a.copy(eye).sub(target);
    if (z.length() === 0) z.z = 1;
    else z.normalize();
    const x = this._b.copy(up).cross(z);
    if (x.length() === 0) {
      const pup = this._c.copy(up);
      if (pup.z) pup.x += EPSILON;
      else if (pup.y) pup.z += EPSILON;
      else pup.y += EPSILON;
      x.cross(pup);
    }
    x.normalize();
    const y = this._c.copy(z).cross(x);
    const [sm11, sm12, sm13] = [x.x, x.y, x.z];
    const [sm21, sm22, sm23] = [y.x, y.y, y.z];
    const [sm31, sm32, sm33] = [z.x, z.y, z.z];
    const trace = sm11 + sm22 + sm33;
    if (trace > 0) {
      const S = Math.sqrt(trace + 1) * 2;
      return this.set((sm23 - sm32) / S, (sm31 - sm13) / S, (sm12 - sm21) / S, S / 4);
    } else if (sm11 > sm22 && sm11 > sm33) {
      const S = Math.sqrt(1 + sm11 - sm22 - sm33) * 2;
      return this.set(S / 4, (sm12 + sm21) / S, (sm31 + sm13) / S, (sm23 - sm32) / S);
    } else if (sm22 > sm33) {
      const S = Math.sqrt(1 + sm22 - sm11 - sm33) * 2;
      return this.set((sm12 + sm21) / S, S / 4, (sm23 + sm32) / S, (sm31 - sm13) / S);
    } else {
      const S = Math.sqrt(1 + sm33 - sm11 - sm22) * 2;
      return this.set((sm31 + sm13) / S, (sm23 + sm32) / S, S / 4, (sm12 - sm21) / S);
    }
  }
  setFromAxisAngle(axis, angle) {
    const halfAngle = angle / 2, s = Math.sin(halfAngle);
    this._x = axis.x * s;
    this._y = axis.y * s;
    this._z = axis.z * s;
    this._w = Math.cos(halfAngle);
    return this;
  }
  setFromRotationMatrix(m) {
    const te = m.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], trace = m11 + m22 + m33;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      this._w = 0.25 / s;
      this._x = (m32 - m23) * s;
      this._y = (m13 - m31) * s;
      this._z = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
      this._w = (m32 - m23) / s;
      this._x = 0.25 * s;
      this._y = (m12 + m21) / s;
      this._z = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
      this._w = (m13 - m31) / s;
      this._x = (m12 + m21) / s;
      this._y = 0.25 * s;
      this._z = (m23 + m32) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
      this._w = (m21 - m12) / s;
      this._x = (m13 + m31) / s;
      this._y = (m23 + m32) / s;
      this._z = 0.25 * s;
    }
    return this;
  }
  static fromArray(array) {
    if (array.length < 4) throw Error("Array doesn't have enough data");
    return new _Quaternion(array[0], array[1], array[2], array[3]);
  }
};
var ObservableQuaternion = class extends Quaternion {
  onChange;
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  get w() {
    return this._w;
  }
  set x(value) {
    if (value !== this.x) {
      this._x = value;
      if (this.onChange) this.onChange();
    }
  }
  set y(value) {
    if (value !== this.y) {
      this._y = value;
      if (this.onChange) this.onChange();
    }
  }
  set z(value) {
    if (value !== this.z) {
      this._z = value;
      if (this.onChange) this.onChange();
    }
  }
  set w(value) {
    if (value !== this.w) {
      this._w = value;
      if (this.onChange) this.onChange();
    }
  }
  constructor(onChange, x = 0, y = 0, z = 0, w = 1) {
    super(x, y, z, w);
    this.onChange = onChange;
  }
};

// src/components/Transform.ts
var TransformEvents = class {
  static Updated = () => {
  };
};
var Transform = class extends Component {
  tempRotation = new Quaternion();
  up = new Vector3(0, 1, 0);
  forward = new Vector3(0, 0, 1);
  right = new Vector3(1, 0, 0);
  _localToWorldMatrix = new Matrix4();
  _worldToLocalMatrix = new Matrix4();
  get localToWorldMatrix() {
    return this._localToWorldMatrix;
  }
  get worldToLocalMatrix() {
    return this._worldToLocalMatrix;
  }
  _position = new ObservableVector3(() => {
    this.onChanged();
  }, 0, 0, 0);
  _rotation = new ObservableQuaternion(() => {
    this.onChanged();
  });
  _scale = new ObservableVector3(() => {
    this.onChanged();
  }, 1, 1, 1);
  _eulerAngles = new ObservableVector3(() => {
    this.onEulerChanged();
  });
  get position() {
    return this._position;
  }
  set position(value) {
    this._position.copy(value);
    this.onChanged();
  }
  get rotation() {
    return this._rotation;
  }
  set rotation(value) {
    this._rotation.copy(value);
    this.onChanged();
  }
  get eulerAngles() {
    return this._eulerAngles;
  }
  set eulerAngles(value) {
    this.eulerAngles.copy(value);
    this.onEulerChanged();
  }
  get scale() {
    return this._scale;
  }
  set scale(value) {
    this._scale.copy(value);
    this.onChanged();
  }
  children = /* @__PURE__ */ new Set();
  _parent = null;
  get parent() {
    return this._parent;
  }
  set parent(parent) {
    if (parent === null) {
      if (this._parent !== null) this._parent.children.delete(this);
    } else {
      parent.children.add(this);
    }
    this._parent = parent;
  }
  onEulerChanged() {
    this._rotation.fromEuler(this._eulerAngles, true);
    EventSystem.emit(ComponentEvents.CallUpdate, this, true);
  }
  onChanged() {
    EventSystem.emit(ComponentEvents.CallUpdate, this, true);
  }
  UpdateMatrices() {
    this._localToWorldMatrix.compose(this.position, this.rotation, this.scale);
    this._worldToLocalMatrix.copy(this._localToWorldMatrix).invert();
    if (this.parent !== null) {
      this._localToWorldMatrix.premultiply(this.parent._localToWorldMatrix);
    }
    for (const child of this.children) {
      child.UpdateMatrices();
    }
    EventSystem.emit(TransformEvents.Updated);
    EventSystemLocal.emit(TransformEvents.Updated, this);
  }
  Update() {
    this.UpdateMatrices();
    EventSystem.emit(ComponentEvents.CallUpdate, this, false);
  }
  LookAt(target) {
    m1.lookAt(this.position, target, this.up);
    this.rotation.setFromRotationMatrix(m1);
    this.UpdateMatrices();
    this.onChanged();
  }
  LookAtV1(target) {
    this.rotation.lookAt(this.position, target, this.up);
    this.tempRotation.lookAt(this.position, target, this.up);
    if (!this.tempRotation.equals(this.rotation)) {
      this.rotation.copy(this.tempRotation);
      this.UpdateMatrices();
      this.onChanged();
    }
  }
  // public LookAtV2(target: Vector3): void {
  //     m1.lookAtV3(this.position, target, this.up, true);
  //     this.rotation.setFromRotationMatrix(m1);
  //     this.UpdateMatrices();
  //     this.onChanged();
  // }
};
var m1 = new Matrix4();

// src/components/Camera.ts
var CameraEvents = class {
  static Updated = (camera) => {
  };
};
var Camera = class extends Component {
  backgroundColor = new Color(0, 0, 0, 1);
  projectionMatrix = new Matrix4();
  viewMatrix = new Matrix4();
  static mainCamera;
  fov;
  aspect;
  near;
  far;
  SetPerspective(fov, aspect, near, far) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.projectionMatrix.perspectiveZO(fov * (Math.PI / 180), aspect, near, far);
  }
  SetOrthographic(left, right, top, bottom, near, far) {
    this.near = near;
    this.far = far;
    this.projectionMatrix.orthoZO(left, right, top, bottom, near, far);
  }
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(CameraEvents.Updated, this);
    });
  }
  Update() {
    this.viewMatrix.copy(this.transform.worldToLocalMatrix);
  }
};

// src/components/Light.ts
var LightEvents = class {
  static Updated = (light) => {
  };
};
var Light = class extends Component {
  camera;
  color = new Color(1, 1, 1);
  intensity = 1;
  range = 1e3;
  castShadows = true;
  Start() {
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(LightEvents.Updated, this);
    });
  }
};
var SpotLight = class extends Light {
  direction = new Vector3(0, -1, 0);
  angle = 1;
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1e3);
  }
};
var PointLight = class extends Light {
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
  }
};
var AreaLight = class extends Light {
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
  }
};
var DirectionalLight = class extends Light {
  direction = new Vector3(0, 1, 0);
  Start() {
    super.Start();
    this.camera = this.gameObject.AddComponent(Camera);
    const size = 1;
    this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
  }
};

// src/utils/MemoryAllocator.ts
var MemoryAllocator = class {
  memorySize;
  availableMemorySize;
  freeBlocks = [];
  usedBlocks = [];
  constructor(memorySize) {
    this.memorySize = memorySize;
    this.availableMemorySize = memorySize;
    this.freeBlocks.push({ offset: 0, size: memorySize });
  }
  allocate(size) {
    for (let i2 = 0; i2 < this.freeBlocks.length; i2++) {
      const block = this.freeBlocks[i2];
      if (block.size >= size) {
        const offset = block.offset;
        block.offset += size;
        block.size -= size;
        this.availableMemorySize -= size;
        if (block.size === 0) {
          this.freeBlocks.splice(i2, 1);
        }
        this.usedBlocks.push({ offset, size });
        return offset;
      }
    }
    throw Error("Not enough space.");
  }
  mergeFreeBlocks() {
    this.freeBlocks.sort((a, b) => a.offset - b.offset);
    for (let i2 = 0; i2 < this.freeBlocks.length - 1; ) {
      const currentBlock = this.freeBlocks[i2];
      const nextBlock = this.freeBlocks[i2 + 1];
      if (currentBlock.offset + currentBlock.size === nextBlock.offset) {
        currentBlock.size += nextBlock.size;
        this.freeBlocks.splice(i2 + 1, 1);
      } else {
        i2++;
      }
    }
  }
  free(offset) {
    for (let i2 = 0; i2 < this.usedBlocks.length; i2++) {
      const block = this.usedBlocks[i2];
      if (block.offset === offset) {
        this.usedBlocks.splice(i2, 1);
        this.freeBlocks.push(block);
        this.mergeFreeBlocks();
        this.availableMemorySize += block.size;
        return;
      }
    }
    throw new Error(`No allocated block found at offset ${offset}`);
  }
};
var BufferMemoryAllocator = class _BufferMemoryAllocator {
  allocator;
  buffer;
  links;
  static BYTES_PER_ELEMENT = Float32Array.BYTES_PER_ELEMENT;
  constructor(size) {
    this.allocator = new MemoryAllocator(size);
    this.buffer = Buffer3.Create(size * _BufferMemoryAllocator.BYTES_PER_ELEMENT, 0 /* STORAGE */);
    this.links = /* @__PURE__ */ new Map();
  }
  has(link) {
    return this.links.has(link);
  }
  set(link, data) {
    let bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) {
      bufferOffset = this.allocator.allocate(data.length);
      this.links.set(link, bufferOffset);
    }
    this.buffer.SetArray(data, bufferOffset * _BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
    return bufferOffset;
  }
  delete(link) {
    const bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) throw Error("Link not found");
    this.allocator.free(bufferOffset);
    this.links.delete(link);
  }
  getBuffer() {
    return this.buffer;
  }
  getAllocator() {
    return this.allocator;
  }
};
var DynamicBufferMemoryAllocator = class extends BufferMemoryAllocator {
  incrementAmount;
  constructor(size, incrementAmount) {
    super(size);
    this.incrementAmount = incrementAmount ? incrementAmount : size;
  }
  set(link, data) {
    let bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) {
      if (this.allocator.availableMemorySize - data.length < 0) {
        const o = this.allocator.memorySize;
        const incrementAmount = this.incrementAmount > data.length ? this.incrementAmount : data.length;
        const oldMemorySize = this.allocator.memorySize - this.allocator.availableMemorySize;
        this.allocator.memorySize += incrementAmount;
        this.allocator.availableMemorySize += incrementAmount;
        this.allocator.freeBlocks.push({ offset: oldMemorySize, size: incrementAmount });
        console.log(`Incrementing DynamicBuffer from ${o} to ${this.allocator.memorySize}`);
        const buffer = Buffer3.Create(this.allocator.memorySize * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0 /* STORAGE */);
        const hasActiveFrame = Renderer.HasActiveFrame();
        if (!hasActiveFrame) Renderer.BeginRenderFrame();
        RendererContext.CopyBufferToBuffer(this.buffer, buffer);
        if (!hasActiveFrame) Renderer.EndRenderFrame();
        const oldBuffer = this.buffer;
        Renderer.OnFrameCompleted().then(() => {
          oldBuffer.Destroy();
        });
        this.buffer = buffer;
      }
      bufferOffset = this.allocator.allocate(data.length);
      this.links.set(link, bufferOffset);
    }
    this.buffer.SetArray(data, bufferOffset * BufferMemoryAllocator.BYTES_PER_ELEMENT, 0, data.length);
    return bufferOffset;
  }
  delete(link) {
    const bufferOffset = this.links.get(link);
    if (bufferOffset === void 0) throw Error("Link not found");
    this.allocator.free(bufferOffset);
    this.links.delete(link);
  }
};

// src/renderer/passes/DeferredLightingPass.ts
var DeferredLightingPass = class extends RenderPass {
  name = "DeferredLightingPass";
  shader;
  sampler;
  quadGeometry;
  lightsBuffer;
  lightsCountBuffer;
  outputLightingPass;
  needsUpdate = true;
  initialized = false;
  dummyShadowPassDepth;
  constructor() {
    super({
      inputs: [
        PassParams.DebugSettings,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth,
        PassParams.ShadowPassDepth,
        PassParams.ShadowPassCascadeData
      ],
      outputs: [PassParams.LightingPassOutput]
    });
  }
  async init() {
    this.shader = await Shader.Create({
      code: await ShaderLoader.DeferredLighting,
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        albedoTexture: { group: 0, binding: 1, type: "texture" },
        normalTexture: { group: 0, binding: 2, type: "texture" },
        ermoTexture: { group: 0, binding: 3, type: "texture" },
        depthTexture: { group: 0, binding: 4, type: "depthTexture" },
        shadowPassDepth: { group: 0, binding: 5, type: "depthTexture" },
        skyboxTexture: { group: 0, binding: 6, type: "texture" },
        lights: { group: 0, binding: 7, type: "storage" },
        lightCount: { group: 0, binding: 8, type: "storage" },
        view: { group: 0, binding: 9, type: "storage" },
        shadowSamplerComp: { group: 0, binding: 10, type: "sampler-compare" },
        settings: { group: 0, binding: 11, type: "storage" }
      },
      colorOutputs: [{ format: "rgba16float" }]
    });
    this.sampler = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", addressModeU: "clamp-to-edge", addressModeV: "clamp-to-edge" });
    this.shader.SetSampler("textureSampler", this.sampler);
    const shadowSamplerComp = TextureSampler.Create({ minFilter: "linear", magFilter: "linear", compare: "less" });
    this.shader.SetSampler("shadowSamplerComp", shadowSamplerComp);
    this.quadGeometry = Geometry.Plane();
    this.lightsBuffer = new DynamicBufferMemoryAllocator(132 * 10);
    this.lightsCountBuffer = Buffer3.Create(1 * 4, 0 /* STORAGE */);
    this.shader.SetBuffer("lights", this.lightsBuffer.getBuffer());
    this.shader.SetBuffer("lightCount", this.lightsCountBuffer);
    this.outputLightingPass = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.dummyShadowPassDepth = DepthTextureArray.Create(1, 1, 1);
    EventSystem.on(LightEvents.Updated, (component) => {
      this.needsUpdate = true;
    });
    this.initialized = true;
  }
  updateLightsBuffer(resources) {
    const scene = Camera.mainCamera.gameObject.scene;
    const lights = [...scene.GetComponents(Light), ...scene.GetComponents(PointLight), ...scene.GetComponents(DirectionalLight), ...scene.GetComponents(SpotLight), ...scene.GetComponents(AreaLight)];
    for (let i2 = 0; i2 < lights.length; i2++) {
      const light = lights[i2];
      const params1 = new Float32Array([light.intensity, light.range, +light.castShadows, -1]);
      const params2 = new Float32Array(4);
      if (light instanceof DirectionalLight) {
        params2.set(light.direction.elements);
      } else if (light instanceof SpotLight) {
        params2.set(light.direction.elements);
        params2.set([light.angle], 3);
      }
      let lightType = 0 /* SPOT_LIGHT */;
      if (light instanceof SpotLight) lightType = 0 /* SPOT_LIGHT */;
      else if (light instanceof DirectionalLight) lightType = 1 /* DIRECTIONAL_LIGHT */;
      else if (light instanceof PointLight) lightType = 2 /* POINT_LIGHT */;
      else if (light instanceof AreaLight) lightType = 3 /* AREA_LIGHT */;
      let projectionMatrices = new Float32Array(16 * 4);
      let cascadeSplits = new Float32Array(4);
      const lightsShadowData = resources.getResource(PassParams.ShadowPassCascadeData);
      const lightShadowData = lightsShadowData ? lightsShadowData.get(light.id) : void 0;
      if (lightShadowData !== void 0) {
        projectionMatrices = lightShadowData.projectionMatrices;
        cascadeSplits = lightShadowData.cascadeSplits;
        params1[3] = lightShadowData.shadowMapIndex;
      }
      const lightData = new Float32Array([
        light.transform.position.x,
        light.transform.position.y,
        light.transform.position.z,
        1,
        ...light.camera.projectionMatrix.elements,
        // ...lightsCSMProjectionMatrix[i].slice(0, 16 * 4),
        ...projectionMatrices,
        ...cascadeSplits,
        ...light.camera.viewMatrix.elements,
        ...light.camera.viewMatrix.clone().invert().elements,
        light.color.r,
        light.color.g,
        light.color.b,
        lightType,
        ...params1,
        ...params2
      ]);
      this.lightsBuffer.set(light.id, lightData);
    }
    this.lightsCountBuffer.SetArray(new Uint32Array([lights.length]));
    this.shader.SetBuffer("lights", this.lightsBuffer.getBuffer());
    this.needsUpdate = false;
  }
  execute(resources) {
    if (!this.initialized) return;
    const camera = Camera.mainCamera;
    if (this.needsUpdate) {
    }
    this.updateLightsBuffer(resources);
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGbufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    const inputShadowPassDepth = resources.getResource(PassParams.ShadowPassDepth) || this.dummyShadowPassDepth;
    const inputSkybox = resources.getResource(PassParams.Skybox);
    RendererContext.BeginRenderPass("DeferredLightingPass", [{ target: this.outputLightingPass, clear: true }], void 0, true);
    this.shader.SetTexture("albedoTexture", inputGBufferAlbedo);
    this.shader.SetTexture("normalTexture", inputGBufferNormal);
    this.shader.SetTexture("ermoTexture", inputGbufferERMO);
    this.shader.SetTexture("depthTexture", inputGBufferDepth);
    this.shader.SetTexture("shadowPassDepth", inputShadowPassDepth);
    this.shader.SetTexture("skyboxTexture", inputSkybox);
    const view = new Float32Array(4 + 4 + 16 + 16 + 16);
    view.set([Renderer.width, Renderer.height, 0], 0);
    view.set(camera.transform.position.elements, 4);
    const tempMatrix = new Matrix4();
    tempMatrix.copy(camera.projectionMatrix).invert();
    view.set(tempMatrix.elements, 8);
    tempMatrix.copy(camera.viewMatrix).invert();
    view.set(tempMatrix.elements, 24);
    view.set(camera.viewMatrix.elements, 40);
    this.shader.SetArray("view", view);
    const settings = resources.getResource(PassParams.DebugSettings);
    this.shader.SetArray("settings", settings);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.LightingPassOutput, this.outputLightingPass);
  }
};

// src/renderer/passes/TextureViewer.ts
var TextureViewer = class extends RenderPass {
  name = "TextureViewer";
  shader;
  quadGeometry;
  constructor() {
    super({ inputs: [
      PassParams.LightingPassOutput,
      PassParams.depthTexturePyramid
    ] });
  }
  async init() {
    const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        @group(0) @binding(1) var texture: texture_2d<f32>;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        fn Tonemap_ACES(x: vec3f) -> vec3f {
            // Narkowicz 2015, "ACES Filmic Tone Mapping Curve"
            let a = 2.51;
            let b = 0.03;
            let c = 2.43;
            let d = 0.59;
            let e = 0.14;
            return (x * (a * x + b)) / (x * (c * x + d) + e);
        }
        
        fn OECF_sRGBFast(linear: vec3f) -> vec3f {
            return pow(linear, vec3(0.454545));
        }

        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;

            var color = textureSampleLevel(texture, textureSampler, uv, 0).rgb;
            // TODO: This is a post processing filter, it shouldn't be here
            color = Tonemap_ACES(color);
            color = OECF_sRGBFast(color);

            return vec4f(color, 1.0);
        }
        `;
    this.shader = await Shader.Create({
      code,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        uv: { location: 1, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        texture: { group: 0, binding: 1, type: "texture" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    const sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", sampler);
    this.initialized = true;
  }
  execute(resources) {
    if (this.initialized === false) return;
    const settings = resources.getResource(PassParams.DebugSettings);
    const LightingPassOutputTexture = resources.getResource(PassParams.LightingPassOutput);
    if (!LightingPassOutputTexture) return;
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass("TextureViewer", [{ clear: false }], void 0, true);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.EndRenderPass();
  }
};

// src/components/Mesh.ts
var Mesh = class extends Component {
  geometry;
  materialsMapped = /* @__PURE__ */ new Map();
  enableShadows = true;
  Start() {
  }
  AddMaterial(material) {
    if (!this.materialsMapped.has(material.constructor.name)) this.materialsMapped.set(material.constructor.name, []);
    this.materialsMapped.get(material.constructor.name)?.push(material);
  }
  GetMaterials(type) {
    if (!type) return Array.from(this.materialsMapped, ([name, value]) => value).flat(Infinity);
    return this.materialsMapped.get(type.name) || [];
  }
  SetGeometry(geometry) {
    this.geometry = geometry;
  }
  GetGeometry() {
    return this.geometry;
  }
};

// src/components/InstancedMesh.ts
var InstancedMesh = class extends Mesh {
  incrementInstanceCount = 1e3;
  _matricesBuffer = new DynamicBufferMemoryAllocator(this.incrementInstanceCount * 16);
  get matricesBuffer() {
    return this._matricesBuffer.getBuffer();
  }
  _instanceCount = 0;
  get instanceCount() {
    return this._instanceCount;
  }
  SetMatrixAt(index, matrix) {
    if (!this._matricesBuffer) throw Error("Matrices buffer not created.");
    this._instanceCount = Math.max(index, this._instanceCount);
    this._matricesBuffer.set(index, matrix.elements);
  }
};

// src/renderer/passes/DeferredShadowMapPass.ts
var _DeferredShadowMapPassDebug = class {
  shadowsFolder;
  shadowsUpdate;
  shadowsRoundToPixelSize;
  debugCascades;
  pcfResolution;
  blendThreshold;
  viewBlendThreshold;
  shadowsUpdateValue = true;
  roundToPixelSizeValue = true;
  debugCascadesValue = false;
  pcfResolutionValue = 1;
  blendThresholdValue = 0.3;
  viewBlendThresholdValue = false;
  constructor() {
    this.shadowsFolder = new UIFolder(Debugger.ui, "CSM Shadows");
    this.shadowsUpdate = new UIButtonStat(this.shadowsFolder, "Update shadows", (value) => {
      this.shadowsUpdateValue = value;
    }, this.shadowsUpdateValue);
    this.shadowsRoundToPixelSize = new UIButtonStat(this.shadowsFolder, "RoundToPixelSize", (value) => {
      this.roundToPixelSizeValue = value;
    }, this.roundToPixelSizeValue);
    this.debugCascades = new UIButtonStat(this.shadowsFolder, "Debug cascades", (value) => {
      this.debugCascadesValue = value;
    }, this.debugCascadesValue);
    this.pcfResolution = new UISliderStat(this.shadowsFolder, "PCF resolution", 0, 7, 1, this.pcfResolutionValue, (value) => {
      this.pcfResolutionValue = value;
    });
    this.blendThreshold = new UISliderStat(this.shadowsFolder, "Blend threshold", 0, 1, 0.01, this.blendThresholdValue, (value) => {
      this.blendThresholdValue = value;
    });
    this.viewBlendThreshold = new UIButtonStat(this.shadowsFolder, "View blend threshold", (value) => {
      this.viewBlendThresholdValue = value;
    }, this.viewBlendThresholdValue);
    this.shadowsFolder.Open();
  }
};
var DeferredShadowMapPassDebug = new _DeferredShadowMapPassDebug();

// src/renderer/passes/PrepareGBuffers.ts
var PrepareGBuffers = class extends RenderPass {
  name = "PrepareGBuffers";
  gBufferAlbedoRT;
  gBufferNormalRT;
  gBufferERMORT;
  depthTexture;
  depthTextureClone;
  // So it can be used on the same pass
  gBufferAlbedoRTClone;
  skybox;
  constructor() {
    super({ outputs: [
      PassParams.depthTexture,
      PassParams.GBufferAlbedo,
      PassParams.GBufferNormal,
      PassParams.GBufferERMO,
      PassParams.GBufferDepth
    ] });
  }
  async init(resources) {
    this.depthTexture = DepthTexture.Create(Renderer.width, Renderer.height);
    this.depthTextureClone = DepthTexture.Create(Renderer.width, Renderer.height);
    this.gBufferAlbedoRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferAlbedoRTClone = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferNormalRT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.gBufferERMORT = RenderTexture.Create(Renderer.width, Renderer.height, 1, "rgba16float");
    this.skybox = CubeTexture.Create(1, 1, 6);
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const colorTargets = [
      { target: this.gBufferAlbedoRT, clear: true },
      { target: this.gBufferNormalRT, clear: true },
      { target: this.gBufferERMORT, clear: true }
    ];
    RendererContext.CopyTextureToTexture(this.gBufferAlbedoRT, this.gBufferAlbedoRTClone);
    RendererContext.CopyTextureToTexture(this.depthTexture, this.depthTextureClone);
    RendererContext.BeginRenderPass(`PrepareGBuffers`, colorTargets, { target: this.depthTexture, clear: true }, true);
    RendererContext.EndRenderPass();
    resources.setResource(PassParams.depthTexture, this.depthTexture);
    resources.setResource(PassParams.GBufferDepth, this.depthTexture);
    resources.setResource(PassParams.GBufferDepthClone, this.depthTextureClone);
    resources.setResource(PassParams.GBufferAlbedo, this.gBufferAlbedoRT);
    resources.setResource(PassParams.GBufferAlbedoClone, this.gBufferAlbedoRTClone);
    resources.setResource(PassParams.GBufferNormal, this.gBufferNormalRT);
    resources.setResource(PassParams.GBufferERMO, this.gBufferERMORT);
    resources.setResource(PassParams.Skybox, this.skybox);
    const settings = new Float32Array([
      0,
      // +Debugger.isDebugDepthPassEnabled,
      0,
      // Debugger.debugDepthMipLevel,
      0,
      //Debugger.debugDepthExposure,
      RendererDebug.viewTypeValue,
      +RendererDebug.useHeightMapValue,
      0,
      //Debugger.heightScale,
      +DeferredShadowMapPassDebug.debugCascadesValue,
      DeferredShadowMapPassDebug.pcfResolutionValue,
      DeferredShadowMapPassDebug.blendThresholdValue,
      +DeferredShadowMapPassDebug.viewBlendThresholdValue,
      ...Camera.mainCamera.transform.position.elements,
      0,
      0,
      0
    ]);
    resources.setResource(PassParams.DebugSettings, settings);
  }
};

// src/renderer/passes/DebuggerTextureViewer.ts
var DebuggerTextureViewer = class extends RenderPass {
  name = "DebuggerTextureViewer";
  shader;
  quadGeometry;
  constructor() {
    super({ inputs: [
      PassParams.ShadowPassDepth
    ] });
  }
  async init() {
    const code = `
        struct VertexInput {
            @location(0) position : vec2<f32>,
            @location(1) uv : vec2<f32>,
        };

        struct VertexOutput {
            @builtin(position) position : vec4<f32>,
            @location(0) vUv : vec2<f32>,
        };

        @group(0) @binding(0) var textureSampler: sampler;
        // @group(0) @binding(1) var texture: texture_2d<f32>;
        @group(0) @binding(1) var texture: texture_depth_2d_array;

        @vertex fn vertexMain(input: VertexInput) -> VertexOutput {
            var output: VertexOutput;
            output.position = vec4(input.position, 0.0, 1.0);
            output.vUv = input.uv;
            return output;
        }
        
        @fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
            let uv = input.vUv;
                //    textureSampleLevel(shadowPassDepth, shadowSampler, shadowPos.xy, lightIndex, 0);
            var d = textureSampleLevel(texture, textureSampler, uv, 0, 0);
            return vec4(vec3(d), 1.0);
        }
        `;
    this.shader = await Shader.Create({
      code,
      colorOutputs: [{ format: Renderer.SwapChainFormat }],
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        uv: { location: 1, size: 2, type: "vec2" }
      },
      uniforms: {
        textureSampler: { group: 0, binding: 0, type: "sampler" },
        texture: { group: 0, binding: 1, type: "depthTexture" }
      }
    });
    this.quadGeometry = Geometry.Plane();
    const sampler = TextureSampler.Create();
    this.shader.SetSampler("textureSampler", sampler);
    this.initialized = true;
  }
  execute(resources) {
    if (this.initialized === false) return;
    const LightingPassOutputTexture = resources.getResource(PassParams.ShadowPassDepth);
    if (!LightingPassOutputTexture) return;
    this.shader.SetTexture("texture", LightingPassOutputTexture);
    RendererContext.BeginRenderPass("DebuggerTextureViewer", [{ clear: false }], void 0, true);
    RendererContext.SetViewport(Renderer.width - 100, 0, 100, 100);
    RendererContext.DrawGeometry(this.quadGeometry, this.shader);
    RendererContext.SetViewport(0, 0, Renderer.width, Renderer.height);
    RendererContext.EndRenderPass();
  }
};

// src/renderer/passes/DeferredGBufferPass.ts
var DeferredGBufferPass = class extends RenderPass {
  name = "DeferredMeshRenderPass";
  constructor() {
    super({
      inputs: [
        PassParams.MainCamera,
        PassParams.GBufferAlbedo,
        PassParams.GBufferNormal,
        PassParams.GBufferERMO,
        PassParams.GBufferDepth
      ],
      outputs: []
    });
  }
  async init(resources) {
    this.initialized = true;
  }
  execute(resources) {
    if (!this.initialized) return;
    const scene = Camera.mainCamera.gameObject.scene;
    const meshes = scene.GetComponents(Mesh);
    const instancedMeshes = scene.GetComponents(InstancedMesh);
    if (meshes.length === 0 && instancedMeshes.length === 0) return;
    const inputCamera = Camera.mainCamera;
    if (!inputCamera) throw Error(`No inputs passed to ${this.name}`);
    const backgroundColor = inputCamera.backgroundColor;
    const inputGBufferAlbedo = resources.getResource(PassParams.GBufferAlbedo);
    const inputGBufferNormal = resources.getResource(PassParams.GBufferNormal);
    const inputGBufferERMO = resources.getResource(PassParams.GBufferERMO);
    const inputGBufferDepth = resources.getResource(PassParams.GBufferDepth);
    RendererContext.BeginRenderPass(
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
    for (const mesh of meshes) {
      if (!mesh.enabled) continue;
      const geometry = mesh.GetGeometry();
      const materials = mesh.GetMaterials();
      for (const material of materials) {
        if (material.params.isDeferred === false) continue;
        if (!material.shader) {
          material.createShader().then((shader2) => {
          });
          continue;
        }
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetMatrix4("modelMatrix", mesh.transform.localToWorldMatrix);
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        RendererContext.DrawGeometry(geometry, shader, 1);
        if (geometry.index) {
          RendererDebug.IncrementTriangleCount(geometry.index.array.length / 3);
        }
      }
    }
    for (const instancedMesh of instancedMeshes) {
      const geometry = instancedMesh.GetGeometry();
      const materials = instancedMesh.GetMaterials();
      for (const material of materials) {
        if (material.params.isDeferred === false) continue;
        if (!material.shader) {
          material.createShader().then((shader2) => {
          });
          continue;
        }
        const shader = material.shader;
        shader.SetMatrix4("projectionMatrix", projectionMatrix);
        shader.SetMatrix4("viewMatrix", viewMatrix);
        shader.SetBuffer("modelMatrix", instancedMesh.matricesBuffer);
        shader.SetVector3("cameraPosition", inputCamera.transform.position);
        RendererContext.DrawGeometry(geometry, shader, instancedMesh.instanceCount + 1);
        if (geometry.index) {
          RendererDebug.IncrementTriangleCount(geometry.index.array.length / 3 * (instancedMesh.instanceCount + 1));
        } else {
          RendererDebug.IncrementTriangleCount(geometry.attributes.get("position").array.length / 3 / 3 * (instancedMesh.instanceCount + 1));
        }
      }
    }
    resources.setResource(PassParams.GBufferDepth, inputGBufferDepth);
    resources.setResource(PassParams.GBufferAlbedo, inputGBufferAlbedo);
    resources.setResource(PassParams.GBufferNormal, inputGBufferNormal);
    resources.setResource(PassParams.GBufferERMO, inputGBufferERMO);
    RendererContext.EndRenderPass();
  }
};

// src/renderer/RenderingPipeline.ts
var PassParams = {
  DebugSettings: "DebugSettings",
  MainCamera: "MainCamera",
  depthTexture: "depthTexture",
  depthTexturePyramid: "depthTexturePyramid",
  GBufferAlbedo: "GBufferAlbedo",
  GBufferAlbedoClone: "GBufferAlbedoClone",
  GBufferNormal: "GBufferNormal",
  GBufferERMO: "GBufferERMO",
  GBufferDepth: "GBufferDepth",
  GBufferDepthClone: "GBufferDepthClone",
  Skybox: "Skybox",
  ShadowPassDepth: "ShadowPassDepth",
  ShadowPassCascadeData: "ShadowPassCascadeData",
  LightingPassOutput: "LightingPassOutput"
};
var RenderingPipeline = class {
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
  constructor(renderer) {
    this.renderer = renderer;
    this.prepareGBuffersPass = new PrepareGBuffers();
    this.renderGraph = new RenderGraph();
    this.beforeGBufferPasses = [
      this.prepareGBuffersPass,
      new DeferredGBufferPass()
    ];
    this.afterGBufferPasses = [
      // new DeferredShadowMapPass(),
    ];
    this.beforeLightingPasses = [
      new DeferredLightingPass()
    ];
    this.afterLightingPasses = [];
    this.beforeScreenOutputPasses = [
      new TextureViewer(),
      new DebuggerTextureViewer()
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
    RendererDebug.ResetFrame();
    RendererDebug.SetTriangleCount(0);
    const renderPipelineStart = performance.now();
    Renderer.BeginRenderFrame();
    this.renderGraph.execute();
    Renderer.EndRenderFrame();
    RendererDebug.SetCPUTime(performance.now() - renderPipelineStart);
    WEBGPUTimestampQuery.GetResult().then((frameTimes) => {
      if (frameTimes) {
        for (const [name, time] of frameTimes) {
          RendererDebug.SetPassTime(name, time);
        }
      }
    });
    const currentTime = performance.now();
    const elapsed = currentTime - this.previousTime;
    this.previousTime = currentTime;
    RendererDebug.SetFPS(1 / elapsed * 1e3);
    this.frame++;
  }
};

// src/Scene.ts
var Scene = class {
  renderer;
  name = "Default scene";
  id = Utils.UUID();
  _hasStarted = false;
  get hasStarted() {
    return this._hasStarted;
  }
  gameObjects = [];
  toUpdate = /* @__PURE__ */ new Map();
  componentsByType = /* @__PURE__ */ new Map();
  renderPipeline;
  constructor(renderer) {
    this.renderer = renderer;
    this.renderPipeline = new RenderingPipeline(this.renderer);
    EventSystem.on(ComponentEvents.CallUpdate, (component, flag) => {
      if (flag) this.toUpdate.set(component, true);
      else this.toUpdate.delete(component);
    });
    EventSystem.on(ComponentEvents.AddedComponent, (component, scene) => {
      if (scene !== this) return;
      let componentsArray = this.componentsByType.get(component.name) || [];
      componentsArray.push(component);
      this.componentsByType.set(component.name, componentsArray);
    });
    EventSystem.on(ComponentEvents.RemovedComponent, (component, scene) => {
      let componentsArray = this.componentsByType.get(component.name);
      if (componentsArray) {
        const index = componentsArray.indexOf(component);
        if (index !== -1) {
          componentsArray.splice(index, 1);
          this.componentsByType.set(component.name, componentsArray);
        }
      }
    });
  }
  AddGameObject(gameObject) {
    this.gameObjects.push(gameObject);
  }
  GetGameObjects() {
    return this.gameObjects;
  }
  GetComponents(type) {
    return this.componentsByType.get(type.name) || [];
  }
  RemoveGameObject(gameObject) {
    const index = this.gameObjects.indexOf(gameObject);
    if (index !== -1) this.gameObjects.splice(index, 1);
  }
  Start() {
    if (this.hasStarted) return;
    for (const gameObject of this.gameObjects) gameObject.Start();
    this._hasStarted = true;
    this.Tick();
  }
  Tick() {
    const componentUpdateStart = performance.now();
    for (const [component, _] of this.toUpdate) component.Update();
    EngineDebug.componentUpdate.SetValue(performance.now() - componentUpdateStart);
    this.renderPipeline.Render(this);
    requestAnimationFrame(() => this.Tick());
  }
};

// src/GameObject.ts
var GameObject = class {
  id = Utils.UUID();
  name = "GameObject";
  scene;
  transform;
  componentsArray = [];
  componentsMapped = /* @__PURE__ */ new Map();
  constructor(scene) {
    this.scene = scene;
    this.transform = new Transform(this);
    this.scene.AddGameObject(this);
  }
  AddComponent(component) {
    try {
      let componentInstance = new component(this);
      if (!(componentInstance instanceof Component)) throw Error("Invalid component");
      if (componentInstance instanceof Transform) throw Error("A GameObject can only have one Transform");
      const AddComponentInternal = (component2, instance) => {
        if (!this.componentsMapped.has(component2.name)) this.componentsMapped.set(component2.name, []);
        this.componentsMapped.get(component2.name)?.push(instance);
        this.componentsArray.push(instance);
      };
      AddComponentInternal(component, componentInstance);
      let currentComponent = component;
      let i2 = 0;
      while (i2 < 10) {
        currentComponent = Object.getPrototypeOf(currentComponent);
        if (currentComponent.name === Component.name || currentComponent.name === "") {
          break;
        }
        AddComponentInternal(currentComponent, componentInstance);
        i2++;
      }
      if (componentInstance instanceof Camera && !Camera.mainCamera) Camera.mainCamera = componentInstance;
      if (this.scene.hasStarted) componentInstance.Start();
      return componentInstance;
    } catch (error) {
      throw Error(`Error creating component` + error);
    }
  }
  GetComponent(type) {
    const components = this.GetComponents(type);
    if (components.length > 0) return components[0];
    return null;
  }
  GetComponents(type) {
    return this.componentsMapped.get(type.name) || [];
  }
  Start() {
    for (const component of this.componentsArray) {
      if (!component.hasStarted) {
        component.Start();
        component.hasStarted = true;
      }
    }
  }
  Destroy() {
    for (const component of this.componentsArray) {
      component.Destroy();
    }
    this.componentsArray = [];
    this.componentsMapped.clear();
    this.scene.RemoveGameObject(this);
  }
};

// src/renderer/Material.ts
var Material = class {
  shader;
  params;
  async createShader() {
    throw Error("Not implemented");
  }
  constructor(params) {
    const defaultParams = {
      isDeferred: false
    };
    this.params = Object.assign({}, defaultParams, params);
  }
};
var PBRMaterial = class extends Material {
  id = Utils.UUID();
  initialParams;
  constructor(params) {
    super(params);
    this.initialParams = params;
    const defaultParams = {
      albedoColor: new Color(1, 1, 1, 1),
      emissiveColor: new Color(0, 0, 0, 0),
      roughness: 0,
      metalness: 0,
      albedoMap: void 0,
      normalMap: void 0,
      heightMap: void 0,
      metalnessMap: void 0,
      emissiveMap: void 0,
      aoMap: void 0,
      doubleSided: false,
      alphaCutoff: 0,
      unlit: false,
      wireframe: false,
      isDeferred: true
    };
    this.params = Object.assign({}, defaultParams, params);
  }
  async createShader() {
    const DEFINES = {
      USE_ALBEDO_MAP: this.initialParams?.albedoMap ? true : false,
      USE_NORMAL_MAP: this.initialParams?.normalMap ? true : false,
      USE_HEIGHT_MAP: this.initialParams?.heightMap ? true : false,
      USE_METALNESS_MAP: this.initialParams?.metalnessMap ? true : false,
      USE_EMISSIVE_MAP: this.initialParams?.emissiveMap ? true : false,
      USE_AO_MAP: this.initialParams?.aoMap ? true : false
    };
    let shaderParams = {
      code: await ShaderLoader.Draw,
      defines: DEFINES,
      colorOutputs: [
        { format: "rgba16float" },
        { format: "rgba16float" },
        { format: "rgba16float" }
      ],
      depthOutput: "depth24plus",
      attributes: {
        position: { location: 0, size: 3, type: "vec3" },
        normal: { location: 1, size: 3, type: "vec3" },
        uv: { location: 2, size: 2, type: "vec2" }
      },
      uniforms: {
        projectionMatrix: { group: 0, binding: 0, type: "storage" },
        viewMatrix: { group: 0, binding: 1, type: "storage" },
        modelMatrix: { group: 0, binding: 2, type: "storage" },
        material: { group: 0, binding: 3, type: "storage" },
        TextureSampler: { group: 0, binding: 4, type: "sampler" },
        AlbedoMap: { group: 0, binding: 5, type: "texture" },
        NormalMap: { group: 0, binding: 6, type: "texture" },
        HeightMap: { group: 0, binding: 7, type: "texture" },
        MetalnessMap: { group: 0, binding: 8, type: "texture" },
        EmissiveMap: { group: 0, binding: 9, type: "texture" },
        AOMap: { group: 0, binding: 10, type: "texture" },
        cameraPosition: { group: 0, binding: 11, type: "storage" }
      },
      cullMode: this.params.doubleSided ? "none" : void 0
    };
    shaderParams = Object.assign({}, shaderParams, this.params);
    const shader = await Shader.Create(shaderParams);
    if (DEFINES.USE_ALBEDO_MAP || DEFINES.USE_NORMAL_MAP || DEFINES.USE_HEIGHT_MAP || DEFINES.USE_METALNESS_MAP || DEFINES.USE_EMISSIVE_MAP || DEFINES.USE_AO_MAP) {
      const textureSampler = TextureSampler.Create();
      shader.SetSampler("TextureSampler", textureSampler);
    }
    shader.SetArray("material", new Float32Array([
      this.params.albedoColor.r,
      this.params.albedoColor.g,
      this.params.albedoColor.b,
      this.params.albedoColor.a,
      this.params.emissiveColor.r,
      this.params.emissiveColor.g,
      this.params.emissiveColor.b,
      this.params.emissiveColor.a,
      this.params.roughness,
      this.params.metalness,
      +this.params.unlit,
      this.params.alphaCutoff,
      +this.params.wireframe,
      0,
      0,
      0
    ]));
    if (DEFINES.USE_ALBEDO_MAP === true && this.params.albedoMap) shader.SetTexture("AlbedoMap", this.params.albedoMap);
    if (DEFINES.USE_NORMAL_MAP === true && this.params.normalMap) shader.SetTexture("NormalMap", this.params.normalMap);
    if (DEFINES.USE_HEIGHT_MAP === true && this.params.heightMap) shader.SetTexture("HeightMap", this.params.heightMap);
    if (DEFINES.USE_METALNESS_MAP === true && this.params.metalnessMap) shader.SetTexture("MetalnessMap", this.params.metalnessMap);
    if (DEFINES.USE_EMISSIVE_MAP === true && this.params.emissiveMap) shader.SetTexture("EmissiveMap", this.params.emissiveMap);
    if (DEFINES.USE_AO_MAP === true && this.params.aoMap) shader.SetTexture("AOMap", this.params.aoMap);
    this.shader = shader;
    return shader;
  }
};

// src/components/index.ts
var components_exports = {};
__export(components_exports, {
  AreaLight: () => AreaLight,
  Camera: () => Camera,
  CameraEvents: () => CameraEvents,
  Component: () => Component,
  ComponentEvents: () => ComponentEvents,
  DirectionalLight: () => DirectionalLight,
  InstancedMesh: () => InstancedMesh,
  Light: () => Light,
  LightEvents: () => LightEvents,
  Mesh: () => Mesh,
  PointLight: () => PointLight,
  SpotLight: () => SpotLight,
  Transform: () => Transform,
  TransformEvents: () => TransformEvents
});

// src/math/index.ts
var math_exports = {};
__export(math_exports, {
  BoundingVolume: () => BoundingVolume,
  Color: () => Color,
  Frustum: () => Frustum,
  Matrix4: () => Matrix4,
  ObservableQuaternion: () => ObservableQuaternion,
  ObservableVector3: () => ObservableVector3,
  Plane: () => Plane,
  Quaternion: () => Quaternion,
  Sphere: () => Sphere,
  Vector2: () => Vector2,
  Vector3: () => Vector3,
  Vector4: () => Vector4
});

// src/math/Sphere.ts
var Sphere = class _Sphere {
  center;
  radius;
  constructor(center = new Vector3(0, 0, 0), radius = 0) {
    this.center = center;
    this.radius = radius;
  }
  static fromAABB(minBounds, maxBounds) {
    const center = maxBounds.clone().add(minBounds).mul(0.5);
    const radius = maxBounds.distanceTo(minBounds) * 0.5;
    return new _Sphere(center, radius);
  }
  static fromVertices(vertices, indices, vertex_positions_stride) {
    let min = new Vector3(Infinity, Infinity, Infinity);
    let max = new Vector3(-Infinity, -Infinity, -Infinity);
    let vertex = new Vector3();
    for (const index of indices) {
      const x = vertices[index * vertex_positions_stride + 0];
      const y = vertices[index * vertex_positions_stride + 1];
      const z = vertices[index * vertex_positions_stride + 2];
      if (isNaN(x) || isNaN(y) || isNaN(z)) throw Error(`Invalid vertex [i ${index}, ${x}, ${y}, ${z}]`);
      vertex.set(x, y, z);
      min.min(vertex);
      max.max(vertex);
    }
    return _Sphere.fromAABB(min, max);
  }
  // Set the sphere to contain all points in the array
  SetFromPoints(points) {
    if (points.length === 0) {
      throw new Error("Point array is empty.");
    }
    let centroid = points.reduce((acc, cur) => acc.add(cur)).mul(1 / points.length);
    let maxRadius = points.reduce((max, p) => Math.max(max, centroid.distanceTo(p)), 0);
    this.center = centroid;
    this.radius = maxRadius;
  }
};

// src/math/Plane.ts
var Plane = class {
  normal;
  constant;
  constructor(normal = new Vector3(1, 0, 0), constant = 0) {
    this.normal = normal;
    this.constant = constant;
  }
  setComponents(x, y, z, w) {
    this.normal.set(x, y, z);
    this.constant = w;
    return this;
  }
  normalize() {
    const inverseNormalLength = 1 / this.normal.length();
    this.normal.mul(inverseNormalLength);
    this.constant *= inverseNormalLength;
    return this;
  }
};

// src/math/Frustum.ts
var Frustum = class {
  planes;
  constructor(p0 = new Plane(), p1 = new Plane(), p2 = new Plane(), p3 = new Plane(), p4 = new Plane(), p5 = new Plane()) {
    this.planes = [p0, p1, p2, p3, p4, p5];
  }
  setFromProjectionMatrix(m) {
    const planes = this.planes;
    const me = m.elements;
    const me0 = me[0], me1 = me[1], me2 = me[2], me3 = me[3];
    const me4 = me[4], me5 = me[5], me6 = me[6], me7 = me[7];
    const me8 = me[8], me9 = me[9], me10 = me[10], me11 = me[11];
    const me12 = me[12], me13 = me[13], me14 = me[14], me15 = me[15];
    planes[0].setComponents(me3 - me0, me7 - me4, me11 - me8, me15 - me12).normalize();
    planes[1].setComponents(me3 + me0, me7 + me4, me11 + me8, me15 + me12).normalize();
    planes[2].setComponents(me3 + me1, me7 + me5, me11 + me9, me15 + me13).normalize();
    planes[3].setComponents(me3 - me1, me7 - me5, me11 - me9, me15 - me13).normalize();
    planes[4].setComponents(me3 - me2, me7 - me6, me11 - me10, me15 - me14).normalize();
    planes[5].setComponents(me2, me6, me10, me14).normalize();
    return this;
  }
};

// src/plugins/OrbitControls.ts
var _v = new Vector3();
var OrbitControls = class {
  domElement;
  /** The center point to orbit around. Default is `0, 0, 0` */
  center = new Vector3();
  orbitSpeed = 0.01;
  panSpeed = 10;
  enableZoom = true;
  enablePan = true;
  minRadius = 0;
  maxRadius = Infinity;
  minTheta = -Infinity;
  maxTheta = Infinity;
  minPhi = 0;
  maxPhi = Math.PI;
  _camera;
  _element;
  _pointers = /* @__PURE__ */ new Map();
  constructor(domElement, camera) {
    this.domElement = domElement;
    this.domElement.style.touchAction = "none";
    this._camera = camera;
    this._camera.transform.LookAtV1(this.center);
    this.connect(domElement);
  }
  /**
   * Adjusts camera orbital zoom.
   */
  zoom(scale) {
    const radius = this._camera.transform.position.sub(this.center).length();
    this._camera.transform.position.mul(
      scale * (Math.min(this.maxRadius, Math.max(this.minRadius, radius * scale)) / (radius * scale))
    );
    this._camera.transform.position.add(this.center);
  }
  /**
   * Adjusts camera orbital position.
   */
  x = 0;
  y = 0;
  orbit(deltaX, deltaY) {
    const distance = this._camera.transform.position.distanceTo(this.center);
    this.x -= deltaX * this.orbitSpeed;
    this.y -= deltaY * this.orbitSpeed;
    const rotation = new Quaternion().fromEuler(new Vector3(this.y, this.x, 0));
    const position = new Vector3(0, 0, distance).applyQuaternion(rotation).add(this.center);
    this._camera.transform.rotation.copy(rotation);
    this._camera.transform.position.copy(position);
  }
  /**
   * Adjusts orthogonal camera pan.
   */
  pan(deltaX, deltaY) {
    this._camera.transform.position.sub(this.center);
    this.center.add(
      _v.set(-deltaX, deltaY, 0).applyQuaternion(this._camera.transform.rotation).mul(this.panSpeed / this._element.clientHeight)
    );
    this._camera.transform.position.add(this.center);
  }
  _onContextMenu(event) {
    event.preventDefault();
  }
  _onScroll(event) {
    this.zoom(1 + event.deltaY / 720);
  }
  _onPointerMove(event) {
    const prevPointer = this._pointers.get(event.pointerId);
    if (prevPointer) {
      const deltaX = (event.pageX - prevPointer.pageX) / this._pointers.size;
      const deltaY = (event.pageY - prevPointer.pageY) / this._pointers.size;
      const type = event.pointerType === "touch" ? this._pointers.size : event.buttons;
      if (type === 1 /* LEFT */) {
        this._element.style.cursor = "grabbing";
        this.orbit(deltaX, deltaY);
      } else if (type === 2 /* RIGHT */) {
        this._element.style.cursor = "grabbing";
        if (this.enablePan) this.pan(deltaX, deltaY);
      }
      if (event.pointerType === "touch" && this._pointers.size === 2) {
        const otherPointer = Array.from(this._pointers.values()).find((p) => p.pointerId !== event.pointerId);
        if (otherPointer) {
          const currentDistance = Math.hypot(
            event.pageX - otherPointer.pageX,
            event.pageY - otherPointer.pageY
          );
          const previousDistance = Math.hypot(
            prevPointer.pageX - otherPointer.pageX,
            prevPointer.pageY - otherPointer.pageY
          );
          const zoomFactor = previousDistance / currentDistance;
          this.zoom(zoomFactor);
        }
      }
    } else if (event.pointerType == "touch") {
      this._element.setPointerCapture(event.pointerId);
    }
    this._pointers.set(event.pointerId, event);
  }
  _onPointerUp(event) {
    this._element.style.cursor = "grab";
    this._element.style.touchAction = this.enableZoom || this.enablePan ? "none" : "pinch-zoom";
    if (event.pointerType == "touch") this._element.releasePointerCapture(event.pointerId);
    this._pointers.delete(event.pointerId);
  }
  /**
   * Connects controls' event handlers, enabling interaction.
   */
  connect(element) {
    element.addEventListener("contextmenu", (event) => {
      this._onContextMenu(event);
    });
    element.addEventListener("wheel", (event) => {
      this._onScroll(event);
    }, { passive: true });
    element.addEventListener("pointermove", (event) => {
      this._onPointerMove(event);
    });
    element.addEventListener("pointerup", (event) => {
      this._onPointerUp(event);
    });
    element.tabIndex = 0;
    this._element = element;
    this._element.style.cursor = "grab";
  }
};
export {
  Component,
  components_exports as Components,
  Debugger,
  GameObject,
  Geometry,
  math_exports as Math,
  OrbitControls,
  PBRMaterial,
  Renderer,
  Scene,
  Utils
};
