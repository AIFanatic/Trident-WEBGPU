import { Renderer, Scene, GameObject, Mathf, Component as Component$1, Prefab, Geometry, PBRMaterial, GPU, Utils, Components, Input, Assets } from '@trident/core';
import { OrbitControls } from '@trident/plugins/OrbitControls.js';
import { Environment } from '@trident/plugins/Environment/Environment.js';
import { Sky } from '@trident/plugins/Environment/Sky.js';
import { GLTFLoader } from '@trident/plugins/GLTF/GLTFLoader.js';
import { PostProcessingPass } from '@trident/plugins/PostProcessing/PostProcessingPass.js';
import { PostProcessingSMAA } from '@trident/plugins/PostProcessing/effects/SMAA.js';

class TridentAPI {
  currentScene;
  gameObjectRefs = /* @__PURE__ */ new WeakSet();
  createRenderer(canvas) {
    Renderer.Create(canvas, "webgpu");
  }
  createScene() {
    this.currentScene = new Scene(Renderer);
    return this.currentScene;
  }
  createGameObject(scene) {
    const gameObject = new GameObject(scene);
    this.gameObjectRefs.add(gameObject);
    return gameObject;
  }
  isEngineGameObject(obj) {
    return this.gameObjectRefs.has(obj);
  }
  createVector3(x, y, z) {
    const vec3 = new Mathf.Vector3(x, y, z);
    return vec3;
  }
  isVector3(vector3) {
    return vector3.constructor === Mathf.Vector3;
  }
  createVector2(x, y, z) {
    const vec2 = new Mathf.Vector2(x, y);
    return vec2;
  }
  isVector2(vector2) {
    return vector2.constructor === Mathf.Vector2;
  }
  createColor(r, g, b, a) {
    const color = new Mathf.Color(r, g, b, a);
    return color;
  }
  isColor(color) {
    return color.constructor === Mathf.Color;
  }
  isComponent(component) {
    return component.constructor === Component$1;
  }
  isPrefab(prefab) {
    return prefab.constructor === Prefab;
  }
  isGeometry(geometry) {
    return geometry.constructor === Prefab;
  }
  isMaterial(material) {
    return material.constructor === Prefab;
  }
  createPlaneGeometry() {
    return Geometry.Plane();
  }
  createCubeGeometry() {
    return Geometry.Cube();
  }
  createSphereGeometry() {
    return Geometry.Sphere();
  }
  createCapsuleGeometry() {
    return Geometry.Capsule();
  }
  createPBRMaterial(args) {
    return new PBRMaterial(args);
  }
  createPrefab() {
    return new Prefab();
  }
  deserializeGeometry(serialized) {
    return Geometry.Deserialize(serialized);
  }
  deserializeMaterial(serialized) {
    return GPU.Material.Deserialize(serialized);
  }
  deserializePrefab(serialized) {
    return Prefab.Deserialize(serialized);
  }
  GetSerializedFields = Utils.GetSerializedFields;
}

const createElement = (type, props, ...children) => {
  if (props === null) props = {};
  return { type, props, children };
};
const setAttribute = (dom, key, value) => {
  if (typeof value == "function" && key.startsWith("on")) {
    const eventType = key.slice(2).toLowerCase();
    dom.__gooactHandlers = dom.__gooactHandlers || {};
    dom.removeEventListener(eventType, dom.__gooactHandlers[eventType]);
    dom.__gooactHandlers[eventType] = value;
    dom.addEventListener(eventType, dom.__gooactHandlers[eventType]);
  } else if (key == "checked" || key == "value" || key == "className") dom[key] = value;
  else if (key == "style" && typeof value == "object") Object.assign(dom.style, value);
  else if (key == "ref" && typeof value == "function") value(dom);
  else if (key == "key") dom.__gooactKey = value;
  else if (typeof value != "object" && typeof value != "function") dom.setAttribute(key, value);
};
const render = (vdom, parent = null) => {
  const mount = parent ? (el) => {
    parent.appendChild(el);
    return el;
  } : (el) => el;
  if (typeof vdom == "string" || typeof vdom == "number") return mount(document.createTextNode(String(vdom)));
  else if (typeof vdom == "boolean" || vdom === null) return mount(document.createTextNode(""));
  else if (typeof vdom == "object" && typeof vdom.type == "function") return Component.render(vdom, parent);
  else if (typeof vdom == "object" && typeof vdom.type == "string") {
    const dom = mount(document.createElement(vdom.type));
    for (const child of [].concat(...vdom.children)) {
      render(child, dom);
    }
    for (const prop in vdom.props) {
      setAttribute(dom, prop, vdom.props[prop]);
    }
    return dom;
  } else throw new Error(`Invalid VDOM: ${vdom}.`);
};
const patch = (dom, vdom, parent = dom.parentNode) => {
  const replace = parent ? (el) => (parent.replaceChild(el, dom), el) : (el) => el;
  if (typeof vdom == "object" && vdom !== null && typeof vdom.type == "function") return Component.patch(dom, vdom, parent);
  else if ((typeof vdom != "object" || vdom === null) && dom instanceof Text) return dom.textContent != String(vdom) ? replace(render(vdom, parent)) : dom;
  else if (typeof vdom != "object" || vdom === null) return dom instanceof Text ? dom.textContent != String(vdom) ? replace(render(vdom, parent)) : dom : replace(render(vdom, parent));
  else if (typeof vdom == "object" && dom instanceof Text) return replace(render(vdom, parent));
  else if (typeof vdom == "object" && dom.nodeName != vdom.type.toString().toUpperCase()) return replace(render(vdom, parent));
  else if (typeof vdom == "object" && dom.nodeName == vdom.type.toString().toUpperCase()) {
    const pool = {};
    const active = document.activeElement;
    [].concat(...dom.childNodes).map((child, index) => {
      const key = child.__gooactKey || `__index_${index}`;
      pool[key] = child;
    });
    const newChildren = [].concat(...vdom.children);
    const domChildren = dom.childNodes;
    let i = 0;
    for (const child of newChildren) {
      const key = child && child.props && child.props.key || `__index_${i}`;
      let existing = pool[key];
      let updatedNode;
      if (existing) {
        updatedNode = patch(existing, child);
        delete pool[key];
      } else {
        updatedNode = render(child, null);
      }
      const currentNodeAtIndex = domChildren[i];
      if (currentNodeAtIndex !== updatedNode) {
        dom.insertBefore(updatedNode, currentNodeAtIndex || null);
      }
      i++;
    }
    for (const key in pool) {
      const leftover = pool[key];
      const instance = leftover.__gooactInstance;
      if (instance) instance.componentWillUnmount();
      if (leftover.parentNode) {
        leftover.parentNode.removeChild(leftover);
      }
    }
    for (const key in pool) {
      const instance = pool[key].__gooactInstance;
      if (instance) instance.componentWillUnmount();
      pool[key].remove();
    }
    for (const attr of dom.attributes) dom.removeAttribute(attr.name);
    for (const prop in vdom.props) setAttribute(dom, prop, vdom.props[prop]);
    active && active.focus();
    return dom;
  }
  return dom;
};
class Component {
  props;
  state;
  base;
  constructor(props) {
    this.props = props || {};
    this.state = null;
  }
  static render(vdom, parent = null) {
    const props = Object.assign({}, vdom.props, { children: vdom.children });
    if (Component.isPrototypeOf(vdom.type)) {
      const Ctor = vdom.type;
      const instance = new Ctor(props);
      instance.componentWillMount();
      instance.base = render(instance.render(), parent);
      instance.base.__gooactInstance = instance;
      instance.base.__gooactKey = vdom.props && vdom.props.key;
      instance.componentDidMount();
      return instance.base;
    } else {
      const func = vdom.type;
      return render(func(props), parent);
    }
  }
  static patch(dom, vdom, parent = dom.parentNode) {
    const props = Object.assign({}, vdom.props, { children: vdom.children });
    if (dom.__gooactInstance && dom.__gooactInstance.constructor == vdom.type) {
      dom.__gooactInstance.componentWillReceiveProps(props);
      dom.__gooactInstance.props = props;
      return patch(dom, dom.__gooactInstance.render(), parent);
    } else if (Component.isPrototypeOf(vdom.type)) {
      const ndom = Component.render(vdom, parent);
      return parent ? (parent.replaceChild(ndom, dom), ndom) : ndom;
    } else if (!Component.isPrototypeOf(vdom.type)) {
      const func = vdom.type;
      return patch(dom, func(props), parent);
    }
    return dom;
  }
  // Note: the original behavior passes (this.props, nextState) to shouldComponentUpdate.
  setState(next) {
    const compat = (a) => typeof this.state == "object" && this.state !== null && typeof a == "object" && a !== null;
    if (this.base && this.shouldComponentUpdate(this.props, next)) {
      const prevState = this.state;
      this.componentWillUpdate(this.props, next);
      this.state = compat(next) ? Object.assign({}, this.state, next) : next;
      patch(this.base, this.render());
      this.componentDidUpdate(this.props, prevState);
    } else {
      this.state = compat(next) ? Object.assign({}, this.state, next) : next;
    }
  }
  shouldComponentUpdate(nextProps, nextState) {
    return nextProps != this.props || nextState != this.state;
  }
  componentWillReceiveProps(nextProps) {
    return void 0;
  }
  componentWillUpdate(nextProps, nextState) {
    return void 0;
  }
  componentDidUpdate(prevProps, prevState) {
    return void 0;
  }
  componentWillMount() {
    return void 0;
  }
  componentDidMount() {
    return void 0;
  }
  componentWillUnmount() {
    return void 0;
  }
  render(_) {
    return null;
  }
}

class LayoutResizer extends Component {
  manageResize(md, sizeProp, posProp) {
    var r = md.target;
    var prev = r.previousElementSibling;
    var next = r.nextElementSibling;
    if (!prev || !next) {
      return;
    }
    md.preventDefault();
    var prevSize = prev[sizeProp];
    var nextSize = next[sizeProp];
    var sumSize = prevSize + nextSize;
    var prevGrow = Number(prev.style.flexGrow);
    var nextGrow = Number(next.style.flexGrow);
    var sumGrow = prevGrow + nextGrow;
    var lastPos = md[posProp];
    function onMouseMove(mm) {
      var pos = mm[posProp];
      var d = pos - lastPos;
      prevSize += d;
      nextSize -= d;
      if (prevSize < 0) {
        nextSize += prevSize;
        pos -= prevSize;
        prevSize = 0;
      }
      if (nextSize < 0) {
        prevSize += nextSize;
        pos += nextSize;
        nextSize = 0;
      }
      var prevGrowNew = sumGrow * (prevSize / sumSize);
      var nextGrowNew = sumGrow * (nextSize / sumSize);
      prev.style.flexGrow = prevGrowNew;
      next.style.flexGrow = nextGrowNew;
      lastPos = pos;
    }
    function onMouseUp(mu) {
      if (posProp === "pageX") {
        r.style.cursor = "ew-resize";
      } else {
        r.style.cursor = "ns-resize";
      }
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }
  onMouseDown(event) {
    var target = event.target;
    var parent = target.parentNode;
    var h = parent.classList.contains("h");
    var v = parent.classList.contains("v");
    if (h && v) return;
    else if (h) {
      target.style.cursor = "col-resize";
      this.manageResize(event, "offsetWidth", "pageX");
    } else if (v) {
      target.style.cursor = "row-resize";
      this.manageResize(event, "offsetHeight", "pageY");
    }
  }
  render() {
    return /* @__PURE__ */ createElement("flex-resizer", { onMouseDown: (event) => {
      this.onMouseDown(event);
    } });
  }
}

const IComponents = {
  Camera: Components.Camera,
  SpotLight: Components.SpotLight,
  PointLight: Components.PointLight,
  DirectionalLight: Components.DirectionalLight,
  Mesh: Components.Mesh
};

class ComponentEvents {
  static Created = (gameObject, component) => {
  };
  static Deleted = (gameObject, component) => {
  };
}
class GameObjectEvents {
  static Selected = (gameObject) => {
  };
  static Created = (gameObject) => {
  };
  static Deleted = (gameObject) => {
  };
  static Changed = (gameObject) => {
  };
}
class ProjectEvents {
  static Opened = () => {
  };
}
class FileEvents {
  static Created = (path, handle) => {
  };
  static Changed = (path, handle) => {
  };
  static Deleted = (path, handle) => {
  };
}
class DirectoryEvents {
  static Created = (path, handle) => {
  };
  static Deleted = (path, handle) => {
  };
}
class LayoutHierarchyEvents {
  static Selected = (gameObject) => {
  };
}
class SceneEvents {
  static Loaded = (scene) => {
  };
}
class EventSystem {
  static events = /* @__PURE__ */ new Map();
  static on(event, callback) {
    const events = this.events.get(event) || [];
    events.push(callback);
    this.events.set(event, events);
  }
  static emit(event, ...args) {
    const callbacks = this.events.get(event);
    if (callbacks === void 0) return;
    for (let i = 0; i < callbacks.length; i++) {
      callbacks[i](...args);
    }
  }
}

const DYNAMIC_SLOT_BYTES = 256;
const DYNAMIC_SLOT_FLOATS = DYNAMIC_SLOT_BYTES / 4;
class Raycaster {
  shader;
  renderTarget;
  idMap;
  initialized = false;
  constructor() {
    this.init();
  }
  async init() {
    this.shader = await GPU.Shader.Create({
      code: `
                struct VertexInput {
                    @location(0) position : vec3<f32>,
                };

                struct VertexOutput {
                    @builtin(position) position : vec4<f32>,
                };

                @group(0) @binding(0) var<storage, read> projectionMatrix: mat4x4<f32>;
                @group(0) @binding(1) var<storage, read> viewMatrix: mat4x4<f32>;
                @group(0) @binding(2) var<storage, read> modelMatrix: array<mat4x4<f32>>;
                @group(0) @binding(3) var<storage, read> id: f32;

                @vertex
                fn vertexMain(input: VertexInput) -> VertexOutput {
                    var output : VertexOutput;
                    output.position = projectionMatrix * viewMatrix * modelMatrix[0] * vec4(input.position, 1.0);
                    return output;
                }

                                  
                fn rand(x: f32) -> f32 {
                    return fract(sin(x) * 43758.5453123);
                }

                @fragment
                fn fragmentMain(input: VertexOutput) -> @location(0) u32 {
                    // store object id in red channel
                    return u32(id);
                }
              `,
      colorOutputs: [{ format: "r32uint" }]
    });
    this.renderTarget = GPU.RenderTexture.Create(GPU.Renderer.width, GPU.Renderer.height, 1, "r32uint");
    this.idMap = GPU.DynamicBuffer.Create(1e4 * DYNAMIC_SLOT_BYTES * 4, GPU.BufferType.STORAGE, DYNAMIC_SLOT_BYTES);
    this.shader.SetBuffer("id", this.idMap);
    this.initialized = true;
  }
  mouseToPixel() {
    const mousePosition = Input.mousePosition;
    const rect = GPU.Renderer.canvas.getBoundingClientRect();
    const u = (mousePosition.x - rect.left) / rect.width;
    const v = (mousePosition.y - rect.top) / rect.height;
    const texWidth = this.renderTarget.width;
    const texHeight = this.renderTarget.height;
    const x = Math.floor(u * texWidth);
    const y = Math.floor(v * texHeight);
    return {
      x: Math.max(0, Math.min(texWidth - 1, x)),
      y: Math.max(0, Math.min(texHeight - 1, y))
    };
  }
  async execute() {
    if (!this.initialized) return;
    const resources = Scene.mainScene.renderPipeline.renderGraph.resourcePool;
    const gBufferDepth = resources.getResource(GPU.PassParams.GBufferDepth);
    if (!gBufferDepth) return;
    const camera = Components.Camera.mainCamera;
    this.shader.SetMatrix4("projectionMatrix", camera.projectionMatrix);
    this.shader.SetMatrix4("viewMatrix", camera.viewMatrix);
    const all = Scene.mainScene.GetComponents(Components.Renderable);
    const pickables = all.filter((r) => !!r.geometry);
    const ids = new Float32Array(pickables.length * DYNAMIC_SLOT_FLOATS);
    for (let slot = 0; slot < pickables.length; slot++) {
      pickables[slot].OnPreRender(this.shader);
      ids[slot * DYNAMIC_SLOT_FLOATS] = slot + 1;
    }
    this.idMap.SetArray(ids);
    GPU.Renderer.BeginRenderFrame();
    GPU.RendererContext.BeginRenderPass("Raycaster", [{ target: this.renderTarget, clear: true }], gBufferDepth, true);
    for (let slot = 0; slot < pickables.length; slot++) {
      this.idMap.dynamicOffset = slot * DYNAMIC_SLOT_BYTES;
      pickables[slot].OnRenderObject(this.shader);
    }
    GPU.RendererContext.EndRenderPass();
    GPU.Renderer.EndRenderFrame();
    const mousePixel = this.mouseToPixel();
    const id = (await this.renderTarget.GetPixels(mousePixel.x, mousePixel.y, 1, 1, 0))[0];
    if (id > 0) {
      return pickables[id - 1].gameObject;
    }
    return null;
  }
}

class LayoutCanvas extends Component {
  async canvasRef(canvas) {
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.width = 1280;
    canvas.height = 720;
    const EngineAPI = this.props.engineAPI;
    EngineAPI.createRenderer(canvas);
    const currentScene = EngineAPI.createScene();
    const mainCameraGameObject = EngineAPI.createGameObject(currentScene);
    mainCameraGameObject.name = "MainCamera";
    const camera = mainCameraGameObject.AddComponent(IComponents.Camera);
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 5e4);
    EventSystem.on(GPU.RendererEvents.Resized, () => {
      camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 5e4);
    });
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
    const controls = new OrbitControls(canvas, camera);
    const lightGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
    lightGameObject.name = "Light";
    lightGameObject.transform.position.set(-10, 10, 10);
    lightGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
    const light = lightGameObject.AddComponent(IComponents.DirectionalLight);
    light.castShadows = true;
    const floorGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
    floorGameObject.name = "Floor";
    floorGameObject.transform.eulerAngles.x = -90;
    floorGameObject.transform.position.y = -2;
    floorGameObject.transform.scale.set(100, 100, 100);
    const floorMesh = floorGameObject.AddComponent(IComponents.Mesh);
    floorMesh.geometry = EngineAPI.createPlaneGeometry();
    floorMesh.material = EngineAPI.createPBRMaterial();
    const cubeGameObject = EngineAPI.createGameObject(EngineAPI.currentScene);
    cubeGameObject.name = "Cube";
    const cubeMesh = cubeGameObject.AddComponent(IComponents.Mesh);
    cubeMesh.geometry = EngineAPI.createCubeGeometry();
    cubeMesh.material = EngineAPI.createPBRMaterial();
    const sky = new Sky();
    sky.SUN_ELEVATION_DEGREES = 60;
    await sky.init();
    const skyTexture = sky.skyTextureCubemap;
    const environment = new Environment(EngineAPI.currentScene, skyTexture);
    await environment.init();
    const raycaster = new Raycaster();
    let mouseDownPosition = { x: 0, y: 0 };
    let mouseUpPosition = { x: 0, y: 0 };
    canvas.addEventListener("mousedown", (event) => {
      mouseDownPosition = { x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener("mouseup", async (event) => {
      mouseUpPosition = { x: event.clientX, y: event.clientY };
      const mouseDrif = { x: mouseDownPosition.x - mouseUpPosition.x, y: mouseDownPosition.y - mouseUpPosition.y };
      if (mouseDrif.x == 0 && mouseDrif.y == 0) {
        const pickedGameObject = await raycaster.execute();
        if (pickedGameObject) {
          EventSystem.emit(GameObjectEvents.Selected, pickedGameObject);
        }
      }
    });
    EventSystem.on(LayoutHierarchyEvents.Selected, (pickedGameObject) => {
      console.log("TRIGGGEr");
      controls.center.copy(pickedGameObject.transform.position);
    });
    EventSystem.on(SceneEvents.Loaded, (scene) => {
      const mainCamera = Components.Camera.mainCamera;
      new OrbitControls(canvas, mainCamera);
    });
    {
      canvas.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      canvas.addEventListener("drop", async (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const prefab = await GLTFLoader.LoadFromURL(url, "glb");
        currentScene.Instantiate(prefab);
      });
    }
    const postProcessing = new PostProcessingPass();
    const smaa = new PostProcessingSMAA();
    postProcessing.effects.push(smaa);
    currentScene.renderPipeline.AddPass(postProcessing, GPU.RenderPassOrder.BeforeScreenOutput);
    currentScene.Start();
  }
  render() {
    return /* @__PURE__ */ createElement("canvas", { ref: (canvas) => this.canvasRef(canvas) });
  }
}

var MODE = /* @__PURE__ */ ((MODE2) => {
  MODE2[MODE2["R"] = 0] = "R";
  MODE2[MODE2["W"] = 1] = "W";
  MODE2[MODE2["A"] = 2] = "A";
  return MODE2;
})(MODE || {});
class _FileBrowser {
  rootFolderHandle;
  constructor() {
    if (!window.showDirectoryPicker) {
      alert("FileSystem API not supported.");
      throw Error("FileSystem API not supported.");
    }
  }
  setRootFolderHandle(handle) {
    this.rootFolderHandle = handle;
  }
  getRootFolderHandle() {
    return this.rootFolderHandle;
  }
  init() {
    return new Promise((resolve, reject) => {
      window.showDirectoryPicker().then((folderHandle) => {
        this.rootFolderHandle = folderHandle;
        resolve();
      }).catch((error) => {
        reject(error);
      });
    });
  }
  async opendir(path) {
    if (!this.rootFolderHandle) {
      alert("Trying to open a directory without initializing the File System.");
      return;
    }
    if (path == "") return this.rootFolderHandle;
    const pathArray = path.split("/");
    let currentDirectoryHandle = this.rootFolderHandle;
    for (const entry of pathArray) {
      if (entry == "") continue;
      currentDirectoryHandle = await currentDirectoryHandle.getDirectoryHandle(entry);
    }
    if (currentDirectoryHandle.kind == "directory" && currentDirectoryHandle.name == pathArray[pathArray.length - 1]) {
      return currentDirectoryHandle;
    }
    throw Error(`Directory not found at "${path}"`);
  }
  async readdir(folderHandle) {
    let files = [];
    const values = folderHandle.values();
    for await (const entry of values) {
      files.push(entry);
    }
    return files;
  }
  mkdir(path) {
    const pathArray = path.split("/");
    const directoryName = pathArray[pathArray.length - 1];
    const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");
    return this.opendir(pathWithoutDirectory).then((folderHandle) => {
      return folderHandle.getDirectoryHandle(directoryName, {
        create: true
      });
    });
  }
  rmdir(path) {
    const pathArray = path.split("/");
    const directoryName = pathArray[pathArray.length - 1];
    const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");
    this.opendir(pathWithoutDirectory).then(async (folderHandle) => {
      const files = await this.readdir(folderHandle);
      for (let file of files) {
        if (file.kind == "directory" && file.name == directoryName) {
          folderHandle.removeEntry(directoryName);
          break;
        }
      }
    });
  }
  fopen(path, mode) {
    if (mode == 2 /* A */) {
      console.warn("MODE.A not implemented.");
    }
    const pathArray = path.split("/");
    const filename = pathArray[pathArray.length - 1];
    const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");
    return this.opendir(pathWithoutDirectory).then((folderHandle) => {
      return folderHandle.getFileHandle(filename, {
        create: mode == 2 /* A */ || mode == 1 /* W */ ? true : false
      });
    });
  }
  // TODO: Make more efficient by chunking
  fread(file, start, end) {
    return file.getFile().then((value) => {
      return value.slice(start, end);
    });
  }
  // TODO: Do append
  fwrite(file, buf) {
    return file.createWritable().then((writableStream) => {
      writableStream.write(buf);
      return writableStream.close();
    });
  }
  remove(path) {
    const pathArray = path.split("/");
    const filename = pathArray[pathArray.length - 1];
    const pathWithoutDirectory = pathArray.splice(0, pathArray.length - 1).join("/");
    this.opendir(pathWithoutDirectory).then(async (folderHandle) => {
      const files = await this.readdir(folderHandle);
      for (let file of files) {
        if (file.kind == "file" && file.name == filename) {
          folderHandle.removeEntry(filename);
          break;
        }
      }
    });
  }
  is_directory(path) {
    return this.opendir(path).then((folderHandle) => {
      return true;
    }).catch((error) => {
      return false;
    });
  }
  exists(path) {
    return this.is_directory(path).then((isDirectory) => {
      if (isDirectory) {
        return true;
      }
      return this.fopen(path, 0 /* R */).then((file) => {
        return true;
      }).catch((error) => {
        return false;
      });
    });
  }
}
const FileBrowser = new _FileBrowser();

class FileWatcher {
  watches;
  constructor() {
    this.watches = /* @__PURE__ */ new Map();
    setInterval(() => this.update(), 500);
  }
  watch(directoryPath) {
    FileBrowser.opendir(directoryPath).then((directoryHandle) => {
      this.watches.set(directoryPath, {
        path: directoryPath,
        handle: directoryHandle,
        files: /* @__PURE__ */ new Map()
      });
    }).catch((error) => {
      console.warn("error", error);
    });
  }
  unwatch(directoryPath) {
    if (this.watches.has(directoryPath)) {
      this.watches.delete(directoryPath);
    }
  }
  getWatchMap() {
    return this.watches;
  }
  async update() {
    for (const [directoryPath, directoryWatch] of this.watches) {
      if (directoryPath[0] == ".") continue;
      const directoryPathExists = await FileBrowser.exists(directoryPath);
      if (!directoryPathExists) {
        this.watches.delete(directoryPath);
        EventSystem.emit(DirectoryEvents.Deleted, directoryPath, directoryWatch.handle);
        continue;
      }
      for (let watchFilesPair of directoryWatch.files) {
        const watchFilePath = watchFilesPair[0];
        const watchFile = watchFilesPair[1];
        const fileExists = await FileBrowser.exists(watchFilePath);
        if (!fileExists) {
          directoryWatch.files.delete(watchFile.path);
          if (watchFile.handle instanceof FileSystemFileHandle) {
            EventSystem.emit(FileEvents.Deleted, watchFile.path, watchFile.handle);
          }
        }
      }
      const files = await FileBrowser.readdir(directoryWatch.handle);
      for (let file of files) {
        if (file.name[0] == ".") continue;
        if (file.kind == "file") {
          const fileHandle = await file.getFile();
          const filePath = directoryPath + "/" + file.name;
          if (!directoryWatch.files.has(filePath)) {
            directoryWatch.files.set(filePath, {
              path: filePath,
              handle: file,
              lastModified: fileHandle.lastModified
            });
            EventSystem.emit(FileEvents.Created, filePath, file);
          } else {
            const storedFile = directoryWatch.files.get(filePath);
            if (storedFile.lastModified != fileHandle.lastModified) {
              storedFile.lastModified = fileHandle.lastModified;
              EventSystem.emit(FileEvents.Changed, filePath, file);
            }
          }
        } else if (file.kind == "directory") {
          const directoryDirectoryPath = directoryPath + "/" + file.name;
          if (!directoryWatch.files.has(directoryDirectoryPath)) {
            directoryWatch.files.set(directoryDirectoryPath, {
              path: directoryDirectoryPath,
              handle: file,
              lastModified: 0
            });
            EventSystem.emit(DirectoryEvents.Created, directoryDirectoryPath, file);
          }
        }
      }
    }
  }
}

var ITreeMapType = /* @__PURE__ */ ((ITreeMapType2) => {
  ITreeMapType2[ITreeMapType2["Folder"] = 0] = "Folder";
  ITreeMapType2[ITreeMapType2["File"] = 1] = "File";
  return ITreeMapType2;
})(ITreeMapType || {});

class StringUtils {
  static CamelCaseToArray(str) {
    return str.split(/(?=[A-Z])/);
  }
  static CapitalizeStrArray(strArr) {
    let output = [];
    for (let word of strArr) {
      output.push(word[0].toUpperCase() + word.slice(1));
    }
    return output;
  }
  static GetEnumKeyByEnumValue(myEnum, enumValue) {
    let keys = Object.keys(myEnum).filter((x) => myEnum[x] == enumValue);
    return keys.length > 0 ? keys[0] : null;
  }
  static GetNameForPath(path) {
    const extensionIndex = path.lastIndexOf(".");
    return path.slice(path.lastIndexOf("/") + 1, extensionIndex !== -1 ? extensionIndex : path.length);
  }
  static Dirname(path) {
    const pathArr = path.split("/");
    const parentPath = pathArr.slice(0, pathArr.length - 1);
    return parentPath.join("/");
  }
}

class Arrow extends Component {
  render() {
    return /* @__PURE__ */ createElement("span", { style: `display: inline-block; rotate: ${this.props.isOpen ? "-90deg" : "180deg"}` }, "\u3031");
  }
}

class Folder extends Component {
  folderRef;
  constructor(props) {
    super(props);
    this.state = { isOpen: false, isSelected: false };
  }
  FolderRefCreated(ref) {
    this.folderRef = ref;
  }
  handleToggle(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.props.onToggled) {
      this.props.onToggled(this.props.item);
    }
    this.setState({ isOpen: !this.state.isOpen, isSelected: this.state.isSelected });
  }
  onDragStart(event) {
    event.dataTransfer.setData("from-uuid", this.props.item.id);
  }
  onDrop(event) {
    console.log("Folder onDrop");
    this.folderRef.style.backgroundColor = "";
    const fromUuid = event.dataTransfer.getData("from-uuid");
    if (fromUuid != "") {
      this.props.onDropped(fromUuid, this.props.item.id);
    }
    event.preventDefault();
    event.stopPropagation();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  onClicked(event) {
    this.props.onClicked(this.props.item);
  }
  onDoubleClicked(event) {
    if (this.props.onDoubleClicked) {
      this.props.onDoubleClicked(this.props.item);
    }
  }
  onDragEnter(event) {
    this.folderRef.style.backgroundColor = "#3498db80";
  }
  onDragLeave(event) {
    this.folderRef.style.backgroundColor = "";
  }
  render() {
    let classes = "item-title";
    if (this.props.item.isSelected) classes += " active";
    return /* @__PURE__ */ createElement(
      "div",
      {
        className: "item",
        ref: (ref) => this.FolderRefCreated(ref)
      },
      /* @__PURE__ */ createElement(
        "div",
        {
          style: { display: "flex", alignItems: "center" },
          className: classes,
          draggable: true,
          onDragStart: (event) => this.onDragStart(event),
          onDragEnter: (event) => this.onDragEnter(event),
          onDragLeave: (event) => this.onDragLeave(event),
          onDrop: (event) => this.onDrop(event),
          onDragOver: (event) => this.onDragOver(event),
          onPointerDown: (event) => this.onClicked(event),
          onDblClick: (event) => this.onDoubleClicked(event)
        },
        /* @__PURE__ */ createElement(
          "span",
          {
            style: { width: "15px", height: "15px", fontSize: "10px" },
            onPointerDown: (event) => {
              this.handleToggle(event);
            }
          },
          /* @__PURE__ */ createElement(Arrow, { isOpen: this.state.isOpen })
        ),
        /* @__PURE__ */ createElement("span", null, this.props.item.name)
      ),
      /* @__PURE__ */ createElement(
        "div",
        {
          className: "item-content",
          style: {
            height: this.state.isOpen ? "auto" : "0"
          }
        },
        this.props.children
      )
    );
  }
}

class File extends Component {
  FileRef;
  FileRefCreated(ref) {
    this.FileRef = ref;
  }
  constructor(props) {
    super(props);
    this.state = { isSelected: false };
  }
  onDragStart(event) {
    event.dataTransfer.setData("from-uuid", this.props.data.id);
    if (this.props.onDragStarted) {
      this.props.onDragStarted(event, this.props.data);
    }
  }
  onDrop(event) {
    this.FileRef.style.backgroundColor = "";
    const fromUuid = event.dataTransfer.getData("from-uuid");
    if (fromUuid != "") {
      this.props.onDropped(fromUuid, this.props.data.id);
    }
    event.preventDefault();
    event.stopPropagation();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  lastClickTs = 0;
  dblMs = 220;
  onPointerDown(event) {
    this.props.onClicked(this.props.data);
    const now = performance.now();
    const elapsed = now - this.lastClickTs;
    this.lastClickTs = now;
    if (elapsed < this.dblMs && this.props.onDoubleClicked) this.props.onDoubleClicked(this.props.data);
  }
  onDragEnter(event) {
    this.FileRef.style.backgroundColor = "#3498db80";
  }
  onDragLeave(event) {
    this.FileRef.style.backgroundColor = "";
  }
  render() {
    let classes = "item-title";
    if (this.props.data.isSelected) classes += " active";
    return /* @__PURE__ */ createElement(
      "div",
      {
        className: "item",
        ref: (ref) => this.FileRefCreated(ref)
      },
      /* @__PURE__ */ createElement(
        "div",
        {
          style: { display: "flex", alignItems: "center" },
          className: classes,
          draggable: true,
          onDragStart: (event) => this.onDragStart(event),
          onDragEnter: (event) => this.onDragEnter(event),
          onDragLeave: (event) => this.onDragLeave(event),
          onDrop: (event) => this.onDrop(event),
          onDragOver: (event) => this.onDragOver(event),
          onPointerDown: (event) => this.onPointerDown(event)
        },
        /* @__PURE__ */ createElement(
          "span",
          {
            style: { paddingLeft: "15px" }
          }
        ),
        /* @__PURE__ */ createElement("span", null, this.props.data.name)
      ),
      /* @__PURE__ */ createElement(
        "div",
        {
          className: "item-content"
        }
      )
    );
  }
}

class Tree extends Component {
  constructor(props) {
    super(props);
  }
  getChildrenForParent(data, parentId) {
    let out = [];
    for (let entry of data) {
      if (entry.parent == parentId) out.push(entry);
    }
    return out;
  }
  render() {
    let children = this.props.item ? this.getChildrenForParent(this.props.data, this.props.item.id) : this.getChildrenForParent(this.props.data, "");
    return /* @__PURE__ */ createElement(
      "div",
      {
        className: "treeview"
      },
      children.map((item) => {
        const itemChildren = this.getChildrenForParent(this.props.data, item.id);
        if (itemChildren.length > 0 || item.type == ITreeMapType.Folder) {
          return /* @__PURE__ */ createElement(
            Folder,
            {
              onToggled: this.props.onToggled ? (item2) => this.props.onToggled(item2) : null,
              item,
              data: this.props.data,
              onDropped: (from, to) => this.props.onDropped(from, to),
              onClicked: (data) => this.props.onClicked(data),
              onDoubleClicked: (data) => this.props.onDoubleClicked(data)
            },
            /* @__PURE__ */ createElement(
              Tree,
              {
                item,
                onToggled: this.props.onToggled ? (item2) => this.props.onToggled(item2) : null,
                onDropped: (from, to) => this.props.onDropped(from, to),
                onClicked: (data) => this.props.onClicked(data),
                onDragStarted: (event, data) => this.props.onDragStarted(event, data),
                data: this.props.data
              }
            )
          );
        } else {
          return /* @__PURE__ */ createElement(
            File,
            {
              data: item,
              onDropped: this.props.onDropped ? (from, to) => this.props.onDropped(from, to) : null,
              onClicked: this.props.onClicked ? (data) => this.props.onClicked(data) : null,
              onDoubleClicked: this.props.onDoubleClicked ? (data) => this.props.onDoubleClicked(data) : null,
              onDragStarted: this.props.onDragStarted ? (event, data) => this.props.onDragStarted(event, data) : null
            }
          );
        }
      })
    );
  }
}

class ExtendedDataTransfer {
  static data;
}

class Menu extends Component {
  constructor(props) {
    super(props);
    this.state = { isDropdownVisible: false };
  }
  toggleDropdown() {
    const next = !this.state.isDropdownVisible;
    if (this.props.onToggled) this.props.onToggled(next);
    this.setState({ isDropdownVisible: next });
  }
  closeSelfAndParent = () => {
    this.setState({ isDropdownVisible: false });
    if (this.props.closeMenu) this.props.closeMenu();
  };
  toArray(children) {
    if (children === void 0 || children === null) return [];
    return Array.isArray(children) ? children : [children];
  }
  withCloseMenu(children) {
    return children.map((child) => {
      if (!child || typeof child !== "object") return child;
      return {
        ...child,
        props: {
          ...child.props || {},
          closeMenu: this.closeSelfAndParent
        }
      };
    });
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "dropdown" }, /* @__PURE__ */ createElement("button", { className: "dropdown-btn", onPointerDown: () => this.toggleDropdown() }, this.props.name), this.state.isDropdownVisible ? /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { className: "dropdown-overlay", onPointerDown: () => this.toggleDropdown() }), /* @__PURE__ */ createElement("div", { className: "dropdown-content" }, this.withCloseMenu(this.toArray(this.props.children)))) : "");
  }
}

class MenuItem extends Component {
  constructor(props) {
    super(props);
  }
  onClicked(event) {
    if (this.props.closeMenu) {
      this.props.closeMenu();
    }
    if (this.props.onClicked) {
      this.props.onClicked();
    }
  }
  render() {
    return /* @__PURE__ */ createElement(
      "button",
      {
        className: "dropdown-btn dropdown-item-btn",
        onPointerDown: (event) => {
          this.onClicked(event);
        },
        ...this.props.disabled ? { disabled: true } : {}
      },
      this.props.name
    );
  }
}

async function dir(h) {
  const r = indexedDB.open("d", 1);
  await new Promise((res) => (r.onupgradeneeded = () => r.result.createObjectStore("s"), r.onsuccess = res));
  const db = r.result;
  const t = db.transaction("s", h ? "readwrite" : "readonly").objectStore("s");
  if (h) return t.put(h, "h"), h;
  return new Promise((res) => t.get("h").onsuccess = (e) => res(e.target.result || null));
}
Assets.ResourceFetchFn = async (input, init) => {
  if (input instanceof Request || input instanceof URL) throw Error("Not implemented");
  const handle = await FileBrowser.fopen(input, MODE.R);
  if (!handle) throw Error(`Could not get file at ${input}`);
  const file = await handle.getFile();
  return new Response(file);
};
class LayoutAssets extends Component {
  fileWatcher;
  constructor(props) {
    super(props);
    this.setState({ currentTreeMap: /* @__PURE__ */ new Map(), selected: void 0 });
    this.fileWatcher = new FileWatcher();
    EventSystem.on(ProjectEvents.Opened, () => {
      this.fileWatcher.watch("");
      dir(FileBrowser.getRootFolderHandle());
    });
    EventSystem.on(FileEvents.Created, (path, handle) => {
      this.onFileOrDirectoryCreated(path, handle);
    });
    EventSystem.on(DirectoryEvents.Created, (path, handle) => {
      this.onFileOrDirectoryCreated(path, handle);
    });
    EventSystem.on(DirectoryEvents.Deleted, (path, handle) => {
      this.onFileOrDirectoryDeleted(path);
    });
    EventSystem.on(FileEvents.Deleted, (path, handle) => {
      this.onFileOrDirectoryDeleted(path);
    });
    dir().then((handle) => {
      if (handle) {
        FileBrowser.setRootFolderHandle(handle);
        EventSystem.emit(ProjectEvents.Opened);
      }
    });
  }
  onFileOrDirectoryDeleted(path) {
    this.fileWatcher.unwatch(path);
    this.state.currentTreeMap.delete(path);
    this.setState({ currentTreeMap: this.state.currentTreeMap, selected: void 0 });
  }
  onFileOrDirectoryCreated(path, file) {
    if (file instanceof FileSystemDirectoryHandle) {
      this.fileWatcher.watch(path);
    }
    if (!this.state.currentTreeMap.has(path)) {
      let type = file instanceof FileSystemFileHandle ? ITreeMapType.File : ITreeMapType.Folder;
      this.state.currentTreeMap.set(path, {
        id: path,
        name: file.name,
        isSelected: false,
        parent: StringUtils.Dirname(path) == path ? null : StringUtils.Dirname(path),
        type,
        data: {
          path,
          file,
          instance: null
        }
      });
    }
    this.setState({ currentTreeMap: this.state.currentTreeMap, selected: this.state.selected });
  }
  async onToggled(item) {
    console.log("onToggled", item);
  }
  async onItemClicked(item) {
    if (!item.data.instance) {
      await this.LoadTreeItem(item);
    }
    this.setState({ currentTreeMap: this.state.currentTreeMap, selected: item.data });
  }
  async onItemDoubleClicked(item) {
    console.log("onItemDoubleClicked", item);
    if (!item.data.instance) {
      await this.LoadTreeItem(item);
    }
    if (item.data.instance.type === Scene.type) {
      this.props.engineAPI.currentScene.Clear();
      this.props.engineAPI.currentScene.Deserialize(item.data.instance);
      EventSystem.emit(SceneEvents.Loaded, item.data.instance);
    }
  }
  async LoadTreeItem(item) {
    if (item.data.file.kind === "file") {
      const loadedFile = await this.LoadFile(item.data.path, item.data.file);
      item.data.instance = loadedFile;
      return loadedFile;
    } else if (item.data.file.kind === "directory") {
      return item.data.file;
    }
  }
  async LoadFile(path, file) {
    return new Promise(async (resolve, reject) => {
      const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
      if (extension === "glb") {
        const data = await file.getFile();
        const arrayBuffer = await data.arrayBuffer();
        const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, void 0, file.name.slice(0, file.name.lastIndexOf(".")));
        resolve(prefab);
      } else if (extension == "scene") {
        const data = await file.getFile();
        const text = await data.text();
        const json = JSON.parse(text);
        resolve(json);
      } else if (extension == "prefab") {
        const data = await file.getFile();
        const text = await data.text();
        const json = JSON.parse(text);
        const prefab = this.props.engineAPI.deserializePrefab(json);
        prefab.assetPath = path;
        resolve(prefab);
      } else if (extension == "geometry") {
        const data = await file.getFile();
        const text = await data.text();
        const json = JSON.parse(text);
        const geometry = this.props.engineAPI.deserializeGeometry(json);
        geometry.assetPath = path;
        resolve(geometry);
      } else if (extension == "material") {
        const data = await file.getFile();
        const text = await data.text();
        const json = JSON.parse(text);
        const material = this.props.engineAPI.deserializeMaterial(json);
        material.assetPath = path;
        resolve(material);
      }
    });
  }
  onDropped(from, to) {
    console.log("onDropped");
  }
  onDragStarted(event, item) {
    if (!item.data.instance) {
      this.LoadTreeItem(item).then(() => {
        ExtendedDataTransfer.data = item.data.instance;
      });
    }
    ExtendedDataTransfer.data = item.data.instance;
    console.log("HERE", ExtendedDataTransfer.data);
  }
  getCurrentPath() {
    if (!this.state.selected) return "";
    if (this.state.selected.file instanceof FileSystemFileHandle) return this.state.selected.path.slice(0, this.state.selected.path.lastIndexOf("/"));
    else if (this.state.selected.file instanceof FileSystemDirectoryHandle) return this.state.selected.path;
    throw Error("Invalid selected file");
  }
  async createFolder() {
    const path = `${this.getCurrentPath()}/New folder`;
    const handle = await FileBrowser.mkdir(path);
    EventSystem.emit(DirectoryEvents.Created, path, handle);
  }
  async deleteAsset() {
    if (!this.state.selected) return;
    if (this.state.selected.file instanceof FileSystemFileHandle) {
      FileBrowser.remove(this.state.selected.path);
      EventSystem.emit(FileEvents.Deleted, this.state.selected.path, void 0);
    } else if (this.state.selected.file instanceof FileSystemDirectoryHandle) {
      FileBrowser.rmdir(this.state.selected.path);
      EventSystem.emit(DirectoryEvents.Deleted, this.state.selected.path, void 0);
    }
  }
  onDragOver(event) {
    event.preventDefault();
  }
  async onDrop(event) {
    console.log("on drop", event);
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const extension = file.name.slice(file.name.lastIndexOf(".") + 1);
    if (extension === "glb") {
      const arrayBuffer = await file.arrayBuffer();
      const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer, void 0, file.name.slice(0, file.name.lastIndexOf(".")));
      await FileBrowser.mkdir(file.name);
      prefab.traverse(async (prefab2) => {
        for (const component of prefab2.components) {
          if (component.type === IComponents.Mesh.type) {
            async function SaveToFile(path, blob) {
              const file2 = await FileBrowser.fopen(path, MODE.W);
              await FileBrowser.fwrite(file2, blob);
            }
            {
              const geometry = Assets.GetInstance(component.geometry.assetPath);
              const geometrySerialized = geometry.SerializeAsset();
              SaveToFile(geometry.assetPath, new Blob([JSON.stringify(geometrySerialized)]));
            }
            {
              const material = Assets.GetInstance(component.material.assetPath);
              const materialSerialized = material.SerializeAsset();
              SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));
              if (material.params.albedoMap && material.params.albedoMap.blob) SaveToFile(material.params.albedoMap.assetPath, material.params.albedoMap.blob);
              if (material.params.normalMap && material.params.normalMap.blob) SaveToFile(material.params.normalMap.assetPath, material.params.normalMap.blob);
              if (material.params.armMap && material.params.armMap.blob) SaveToFile(material.params.armMap.assetPath, material.params.armMap.blob);
              if (material.params.heightMap && material.params.heightMap.blob) SaveToFile(material.params.heightMap.assetPath, material.params.heightMap.blob);
              if (material.params.emissiveMap && material.params.emissiveMap.blob) SaveToFile(material.params.emissiveMap.assetPath, material.params.emissiveMap.blob);
            }
            {
              SaveToFile(`${file.name}/${file.name}.prefab`, new Blob([JSON.stringify(prefab2)]));
            }
          }
        }
      });
    }
  }
  render() {
    let treeMapArr = [];
    for (const [name, entry] of this.state.currentTreeMap) {
      entry.isSelected = this.state.selected && entry.id === this.state.selected.path ? true : false;
      treeMapArr.push(entry);
    }
    treeMapArr.sort(function(a, b) {
      if (a.type == ITreeMapType.Folder != (b.type == ITreeMapType.Folder)) {
        return a.type == ITreeMapType.Folder ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    return /* @__PURE__ */ createElement(
      "div",
      {
        class: "Layout",
        onDrop: (event) => this.onDrop(event),
        onDragOver: (event) => this.onDragOver(event)
      },
      /* @__PURE__ */ createElement("div", { class: "header" }, /* @__PURE__ */ createElement("div", { class: "title" }, "Assets"), /* @__PURE__ */ createElement("div", { class: "right-action" }, /* @__PURE__ */ createElement(Menu, { name: "\u22EE" }, /* @__PURE__ */ createElement(MenuItem, { name: "Folder", onClicked: () => {
        this.createFolder();
      } }), /* @__PURE__ */ createElement(MenuItem, { name: "Material", onClicked: () => {
        this.createMaterial();
      } }), /* @__PURE__ */ createElement(MenuItem, { name: "Script", onClicked: () => {
        this.createScript();
      } }), /* @__PURE__ */ createElement(MenuItem, { name: "Scene", onClicked: () => {
        this.createScene();
      } }), /* @__PURE__ */ createElement(MenuItem, { name: "Delete", onClicked: () => {
        this.deleteAsset();
      } })))),
      /* @__PURE__ */ createElement(
        Tree,
        {
          onToggled: (item) => this.onToggled(item),
          onDropped: (from, to) => this.onDropped(from, to),
          onClicked: (data) => this.onItemClicked(data),
          onDoubleClicked: (data) => this.onItemDoubleClicked(data),
          onDragStarted: (event, data) => this.onDragStarted(event, data),
          data: treeMapArr
        }
      )
    );
  }
}

class MenuDropdown extends Component {
  constructor(props) {
    super(props);
    this.state = { isDropdownVisible: false };
  }
  toggleDropdown() {
    if (this.props.onToggled) this.props.onToggled(!this.state.isDropdownVisible);
    this.setState({ isDropdownVisible: !this.state.isDropdownVisible });
  }
  onOptionClicked(option) {
    this.toggleDropdown();
    if (this.props.onOptionClicked) {
      this.props.onOptionClicked(option);
    }
  }
  async contentRef(container) {
    if (!container) return;
    setTimeout(() => {
      if (this.props.children) {
        const w = container.parentElement.clientWidth;
        container.parentElement.clientHeight;
        container.style.marginLeft = w + "px";
        container.style.marginTop = "-25px";
        container.style.display = "";
      }
    }, 1);
  }
  closeSelfAndParent = () => {
    this.setState({ isDropdownVisible: false });
    if (this.props.closeMenu) this.props.closeMenu();
  };
  withCloseMenu(children) {
    return children.map((child) => {
      if (!child || typeof child !== "object") return child;
      return {
        ...child,
        props: {
          ...child.props || {},
          closeMenu: this.closeSelfAndParent
        }
      };
    });
  }
  render() {
    return /* @__PURE__ */ createElement(
      "div",
      {
        className: "dropdown-menu"
      },
      /* @__PURE__ */ createElement(
        "button",
        {
          className: "dropdown-btn dropdown-item-btn",
          onPointerDown: (event) => this.toggleDropdown()
        },
        this.props.name
      ),
      /* @__PURE__ */ createElement("span", { className: "dropdown-right-icon" }, "\u25B6"),
      this.state.isDropdownVisible ? /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { ref: (ref) => this.contentRef(ref), className: "dropdown-content", style: "display: none;" }, this.withCloseMenu([].concat(this.props.children)))) : ""
    );
  }
}

class LayoutHierarchy extends Component {
  constructor(props) {
    super(props);
    this.setState({ selectedGameObject: null });
    EventSystem.on(GameObjectEvents.Created, (gameObject) => {
      this.selectGameObject(gameObject);
    });
    EventSystem.on(GameObjectEvents.Deleted, (gameObject) => {
      if (gameObject === this.state.selectedGameObject) this.setState({ selectedGameObject: null });
    });
    EventSystem.on(GameObjectEvents.Selected, (gameObject) => {
      this.selectGameObject(gameObject);
    });
    EventSystem.on(GameObjectEvents.Changed, (gameObject) => {
      this.selectGameObject(gameObject);
    });
    EventSystem.on(SceneEvents.Loaded, (scene) => {
      this.setState({ selectedGameObject: null });
    });
  }
  selectGameObject(gameObject) {
    EventSystem.emit(LayoutHierarchyEvents.Selected, gameObject);
    this.setState({ selectedGameObject: gameObject });
  }
  getGameObjectById(id) {
    console.log(this.props.engineAPI.currentScene.gameObjects);
    for (const gameObject of this.props.engineAPI.currentScene.gameObjects) {
      if (gameObject.transform.id === id) return gameObject;
    }
    return void 0;
  }
  onDropped(fromId, toId) {
    const fromGameObject = this.getGameObjectById(fromId);
    const toGameObject = this.getGameObjectById(toId);
    if (fromGameObject && toGameObject) {
      fromGameObject.transform.parent = toGameObject.transform;
      this.selectGameObject(toGameObject);
    }
  }
  onDragStarted(event, data) {
    console.log("onDragStarted", event);
  }
  onDrop(event) {
    const extendedEvent = ExtendedDataTransfer.data;
    const instance = extendedEvent;
    if (instance && this.props.engineAPI.isPrefab(instance)) {
      const gameObject = this.props.engineAPI.currentScene.Instantiate(instance);
      this.selectGameObject(gameObject);
      ExtendedDataTransfer.data = void 0;
    } else {
      const fromUuid = event.dataTransfer.getData("from-uuid");
      const gameObject = this.getGameObjectById(fromUuid);
      if (gameObject) {
        gameObject.transform.parent = null;
        this.selectGameObject(gameObject);
      }
    }
  }
  buildTreeFromGameObjects(gameObjects) {
    const treeMap = [];
    for (let gameObject of gameObjects) {
      treeMap.push({
        id: gameObject.transform.id,
        name: gameObject.name,
        isSelected: this.state.selectedGameObject && this.state.selectedGameObject == gameObject ? true : false,
        parent: gameObject.transform.parent ? gameObject.transform.parent.id : "",
        data: gameObject
      });
    }
    return treeMap;
  }
  createEmptyGameObject() {
    const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
    EventSystem.emit(GameObjectEvents.Created, gameObject);
  }
  deleteGameObject() {
    if (this.state.selectedGameObject === null) return;
    this.state.selectedGameObject.Destroy();
    EventSystem.emit(GameObjectEvents.Deleted, this.state.selectedGameObject);
    this.setState({ selectedGameObject: null });
  }
  createPrimitive(primitiveType) {
    const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
    const mesh = gameObject.AddComponent(IComponents.Mesh);
    if (primitiveType === "Cube") mesh.geometry = this.props.engineAPI.createCubeGeometry(), gameObject.name = "Cube";
    else if (primitiveType === "Capsule") mesh.geometry = this.props.engineAPI.createCapsuleGeometry(), gameObject.name = "Capsule";
    else if (primitiveType === "Plane") mesh.geometry = this.props.engineAPI.createPlaneGeometry(), gameObject.name = "Plane";
    else if (primitiveType === "Sphere") mesh.geometry = this.props.engineAPI.createSphereGeometry(), gameObject.name = "Sphere";
    mesh.material = this.props.engineAPI.createPBRMaterial();
    EventSystem.emit(GameObjectEvents.Created, gameObject);
  }
  createLight(lightType) {
    const gameObject = this.props.engineAPI.createGameObject(this.props.engineAPI.currentScene);
    if (lightType === "Directional") gameObject.AddComponent(IComponents.DirectionalLight), gameObject.name = "DirectionalLight";
    else if (lightType === "Point") gameObject.AddComponent(IComponents.PointLight), gameObject.name = "PointLight";
    else if (lightType === "Spot") gameObject.AddComponent(IComponents.SpotLight), gameObject.name = "SpotLight";
    EventSystem.emit(GameObjectEvents.Created, gameObject);
  }
  render() {
    if (!this.props.engineAPI.currentScene) return;
    const nodes = this.buildTreeFromGameObjects(this.props.engineAPI.currentScene.gameObjects);
    return /* @__PURE__ */ createElement("div", { class: "Layout" }, /* @__PURE__ */ createElement("div", { class: "header" }, /* @__PURE__ */ createElement("div", { class: "title" }, "Sample scene"), /* @__PURE__ */ createElement("div", { class: "right-action" }, /* @__PURE__ */ createElement(Menu, { name: "\u22EE" }, /* @__PURE__ */ createElement(MenuItem, { name: "Create Empty", onClicked: () => {
      this.createEmptyGameObject();
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Delete", onClicked: () => {
      this.deleteGameObject();
    } }), /* @__PURE__ */ createElement(MenuDropdown, { name: "3D Object" }, /* @__PURE__ */ createElement(MenuItem, { name: "Cube", onClicked: () => {
      this.createPrimitive("Cube");
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Capsule", onClicked: () => {
      this.createPrimitive("Capsule");
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Plane", onClicked: () => {
      this.createPrimitive("Plane");
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Sphere", onClicked: () => {
      this.createPrimitive("Sphere");
    } })), /* @__PURE__ */ createElement(MenuDropdown, { name: "Lights" }, /* @__PURE__ */ createElement(MenuItem, { name: "Directional Light", onClicked: () => {
      this.createLight("Directional");
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Point Light", onClicked: () => {
      this.createLight("Point");
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Spot Light", onClicked: () => {
      this.createLight("Spot");
    } }))))), /* @__PURE__ */ createElement(
      "div",
      {
        style: "width: 100%; height: 100%; overflow: auto;padding-top:5px",
        onDrop: (event) => this.onDrop(event),
        onDragOver: (e) => e.preventDefault()
      },
      /* @__PURE__ */ createElement(
        Tree,
        {
          onDropped: (from, to) => this.onDropped(from, to),
          onClicked: (data) => this.selectGameObject(data.data),
          onDragStarted: (event, data) => this.onDragStarted(event, data),
          data: nodes
        }
      )
    ));
  }
}

class InspectorNumber extends Component {
  constructor(props) {
    super(props);
    this.setState({ value: this.props.value });
  }
  onChanged(event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      if (input.value == "") return;
      this.props.onChanged(parseFloat(input.value));
    }
  }
  onClicked(event) {
    const MouseMoveEvent = (event2) => {
      const delta = event2.movementX;
      this.state.value += delta / 10;
      this.setState({ value: this.state.value });
      this.props.onChanged(this.state.value);
      event2.currentTarget.requestPointerLock();
    };
    const MouseUpEvent = (event2) => {
      document.body.removeEventListener("mousemove", MouseMoveEvent);
      document.body.removeEventListener("mouseup", MouseUpEvent);
      document.exitPointerLock();
    };
    document.body.addEventListener("mousemove", MouseMoveEvent);
    document.body.addEventListener("mouseup", MouseUpEvent);
  }
  render() {
    return /* @__PURE__ */ createElement("div", { class: "value" }, /* @__PURE__ */ createElement("span", { class: `vec-label ${this.props.titleClass}`, onMouseDown: (event) => {
      this.onClicked(event);
    } }, this.props.title), /* @__PURE__ */ createElement(
      "input",
      {
        class: "input vec-input",
        type: "number",
        onChange: (event) => {
          this.onChanged(event);
        },
        value: this.state.value.toPrecision(4)
      }
    ));
  }
}

class InspectorInput extends Component {
  constructor(props) {
    super(props);
  }
  onChanged(value) {
    if (this.props.onChanged) {
      if (value == "") return;
      this.props.onChanged(value);
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement(InspectorNumber, { title: "N", titleClass: "gray-bg", value: this.props.value, onChanged: (value) => {
      this.onChanged(value);
    } })));
  }
}

class InspectorCheckbox extends Component {
  constructor(props) {
    super(props);
  }
  onChanged(event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      this.props.onChanged(input.checked);
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement(
      "div",
      {
        style: {
          width: "100%"
        }
      },
      /* @__PURE__ */ createElement(
        "input",
        {
          style: { marginLeft: "0px" },
          type: "checkbox",
          checked: this.props.selected,
          onChange: (event) => {
            this.onChanged(event);
          }
        }
      )
    ));
  }
}

class InspectorVector3 extends Component {
  constructor(props) {
    super(props);
    this.setState({ vector3: this.props.vector3 });
  }
  onChanged(property, _value) {
    console.log("CAHHH");
    if (this.props.onChanged) {
      if (_value == "") return;
      const value = parseFloat(_value);
      if (property == 0 /* X */) this.state.vector3.x = value;
      else if (property == 1 /* Y */) this.state.vector3.y = value;
      else if (property == 2 /* Z */) this.state.vector3.z = value;
      this.props.onChanged(this.state.vector3);
    }
  }
  Vector3Equals(v1, v2, epsilon = Number.EPSILON) {
    return Math.abs(v1.x - v2.x) < epsilon && Math.abs(v1.y - v2.y) < epsilon && Math.abs(v1.z - v2.z) < epsilon;
  }
  componentDidUpdate() {
    if (!this.Vector3Equals(this.props.vector3, this.state.vector3)) {
      this.setState({ vector3: this.props.vector3 });
    }
  }
  onClicked(property, event) {
    event.preventDefault();
    const MouseMoveEvent = (event2) => {
      const delta = event2.movementX;
      if (property === 0 /* X */) this.state.vector3.x += delta / 10;
      if (property === 1 /* Y */) this.state.vector3.y += delta / 10;
      if (property === 2 /* Z */) this.state.vector3.z += delta / 10;
      this.setState({ vector3: this.props.vector3 });
    };
    const MouseUpEvent = (event2) => {
      document.body.removeEventListener("mousemove", MouseMoveEvent);
      document.body.removeEventListener("mouseup", MouseUpEvent);
    };
    document.body.addEventListener("mousemove", MouseMoveEvent);
    document.body.addEventListener("mouseup", MouseUpEvent);
  }
  render() {
    return /* @__PURE__ */ createElement("div", { class: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { class: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement(InspectorNumber, { title: "X", titleClass: "red-bg", value: this.state.vector3.x, onChanged: (value) => {
      this.onChanged(0 /* X */, value);
    } }), /* @__PURE__ */ createElement(InspectorNumber, { title: "Y", titleClass: "green-bg", value: this.state.vector3.y, onChanged: (value) => {
      this.onChanged(1 /* Y */, value);
    } }), /* @__PURE__ */ createElement(InspectorNumber, { title: "Z", titleClass: "blue-bg", value: this.state.vector3.z, onChanged: (value) => {
      this.onChanged(2 /* Z */, value);
    } })));
  }
}

class InspectorVector2 extends Component {
  constructor(props) {
    super(props);
    this.state = { vector2: this.props.vector2.clone() };
  }
  onChanged(property, event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      if (input.value == "") return;
      const value = parseFloat(input.value);
      if (property == 0 /* X */) this.state.vector2.x = value;
      else if (property == 1 /* Y */) this.state.vector2.y = value;
      this.props.onChanged(this.state.vector2);
    }
  }
  vector2Equals(v1, v2, epsilon = Number.EPSILON) {
    return Math.abs(v1.x - v2.x) < epsilon && Math.abs(v1.y - v2.y) < epsilon;
  }
  componentDidUpdate() {
    if (!this.vector2Equals(this.props.vector2, this.state.vector2)) {
      this.setState({ vector2: this.props.vector2.clone() });
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { style: {
      width: "35%",
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ createElement("span", { style: {
      fontSize: "12px"
    } }, "X"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        type: "number",
        onChange: (event) => {
          this.onChanged(0 /* X */, event);
        },
        value: this.state.vector2.x
      }
    )), /* @__PURE__ */ createElement("div", { style: {
      width: "35%",
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ createElement("span", { style: {
      fontSize: "12px"
    } }, "Y"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        type: "number",
        onChange: (event) => {
          this.onChanged(1 /* Y */, event);
        },
        value: this.state.vector2.y
      }
    )));
  }
}

class Collapsible extends Component {
  constructor(props) {
    super(props);
    this.state = { isOpen: this.props.open ? this.props.open : true, height: "" };
  }
  handleFilterOpening() {
    if (this.state.isOpen) {
      this.setState({ isOpen: false, height: "0px" });
    } else {
      this.setState({ isOpen: true, height: "" });
    }
  }
  onRightMenuClicked(event) {
    if (this.props.onRightMenuClicked) {
      this.props.onRightMenuClicked();
    }
    event.preventDefault();
    event.stopPropagation();
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "collapsible-card-edonec", id: this.props.id ? this.props.id : "" }, /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { className: "collapsible-header-edonec", onPointerDown: () => {
      this.handleFilterOpening();
    } }, /* @__PURE__ */ createElement("button", { type: "button", className: `collapsible-icon-button-edonec` }, /* @__PURE__ */ createElement(Arrow, { isOpen: this.state.isOpen })), /* @__PURE__ */ createElement("div", { className: "title-text-edonec" }, this.props.header), this.props.rightMenuText ? /* @__PURE__ */ createElement("div", { className: "title-right-menu", onPointerDown: (event) => {
      this.onRightMenuClicked(event);
    } }, this.props.rightMenuText) : "")), /* @__PURE__ */ createElement("div", { className: "collapsible-content-edonec", style: { height: `${this.state.height}` } }, /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { className: "collapsible-content-padding-edonec collapsible-children" }, this.props.children))));
  }
}

class InspectorColor extends Component {
  constructor(props) {
    super(props);
    this.state = { color: this.props.color.clone() };
  }
  onChanged(event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      this.state.color.setFromHex(input.value);
      this.props.onChanged(this.state.color);
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        style: "padding: 2px;",
        type: "color",
        onChange: (event) => {
          this.onChanged(event);
        },
        value: this.state.color.toHex().slice(0, 7)
      }
    )));
  }
}

class DrillDownMenu extends Component {
  constructor(props) {
    super(props);
    this.state = { items: this.props.items, currentParent: this.props.currentParent };
  }
  onItemClicked(item) {
    const children = this.getItemChildren(item);
    if (children.length == 0) {
      this.props.onItemClicked(item);
    }
    this.setState({ currentParent: item.id, items: this.state.items });
  }
  onBackClicked() {
    const parentItem = this.getItemById(this.state.currentParent);
    if (parentItem) {
      this.setState({ currentParent: parentItem.parentId, items: this.state.items });
    } else {
      this.setState({ currentParent: null, items: this.state.items });
    }
  }
  getItemById(id) {
    for (let item of this.state.items) {
      if (item.id == id) return item;
    }
    return null;
  }
  getItemChildren(item) {
    let children = [];
    for (let _item of this.state.items) {
      if (_item.parentId == item.id) children.push(_item);
    }
    return children;
  }
  prepareItems() {
    let items = [];
    for (let item of this.state.items) {
      if (item.parentId == this.state.currentParent) {
        const hasChildren = this.getItemChildren(item).length > 0;
        const itemElement = /* @__PURE__ */ createElement(
          "li",
          {
            className: "item",
            key: item.id,
            onClick: (event) => {
              this.onItemClicked(item);
            }
          },
          item.name,
          hasChildren ? /* @__PURE__ */ createElement("span", { className: "item-caret" }, "\u276F") : ""
        );
        items.push(itemElement);
      }
    }
    return items;
  }
  render() {
    const itemsElements = this.prepareItems();
    return /* @__PURE__ */ createElement("div", { className: "DrillDownMenu" }, /* @__PURE__ */ createElement("button", { className: "backBtn", onClick: (event) => this.onBackClicked() }, "Back"), itemsElements);
  }
}

const data = [
  {
    parentId: null,
    id: "Physics",
    name: "Physics"
  },
  {
    parentId: "Physics",
    id: "Rigidbody",
    name: "Rigidbody"
  },
  {
    parentId: "Physics",
    id: "BoxCollider",
    name: "BoxCollider"
  },
  {
    parentId: "Physics",
    id: "CapsuleCollider",
    name: "CapsuleCollider"
  },
  {
    parentId: "Physics",
    id: "MeshCollider",
    name: "MeshCollider"
  },
  {
    parentId: "Physics",
    id: "PlaneCollider",
    name: "PlaneCollider"
  },
  {
    parentId: "Physics",
    id: "SphereCollider",
    name: "SphereCollider"
  },
  {
    parentId: null,
    id: "Mesh",
    name: "Mesh"
  },
  {
    parentId: "Mesh",
    id: "MeshFilter",
    name: "MeshFilter"
  },
  {
    parentId: "Mesh",
    id: "MeshRenderer",
    name: "MeshRenderer"
  },
  {
    parentId: null,
    id: "Lights",
    name: "Lights"
  },
  {
    parentId: "Lights",
    id: "AreaLight",
    name: "AreaLight"
  },
  {
    parentId: "Lights",
    id: "DirectionalLight",
    name: "DirectionalLight"
  },
  {
    parentId: "Lights",
    id: "PointLight",
    name: "PointLight"
  },
  {
    parentId: "Lights",
    id: "SpotLight",
    name: "SpotLight"
  },
  {
    parentId: null,
    id: "Primitives",
    name: "Primitives"
  },
  {
    parentId: "Primitives",
    id: "Capsule",
    name: "Capsule"
  },
  {
    parentId: "Primitives",
    id: "Cube",
    name: "Cube"
  },
  {
    parentId: "Primitives",
    id: "Plane",
    name: "Plane"
  },
  {
    parentId: "Primitives",
    id: "Sphere",
    name: "Sphere"
  },
  {
    parentId: null,
    id: "Miscellaneous",
    name: "Miscellaneous"
  },
  {
    parentId: "Miscellaneous",
    id: "Animation",
    name: "Animation"
  },
  {
    parentId: "Miscellaneous",
    id: "ArticulationBody",
    name: "ArticulationBody"
  },
  {
    parentId: "Miscellaneous",
    id: "LineRenderer",
    name: "LineRenderer"
  }
];
class AddComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { isMenuOpen: false };
  }
  onAddComponentClicked(gameObject, event) {
    console.log("clciked");
    this.setState({ isMenuOpen: !this.state.isMenuOpen });
  }
  onMenuItemClicked(item) {
    const componentClass = Components[item.id] ? Components[item.id] : Component$1.Registry.get(item.id);
    console.log("onMenuItemClicked", item, componentClass);
    const componentInstance = this.props.gameObject.AddComponent(componentClass);
    EventSystem.emit(ComponentEvents.Created, this.props.gameObject, componentInstance);
    this.setState({ isMenuOpen: false });
  }
  render() {
    console.warn("TODO");
    let dataDynamic = JSON.parse(JSON.stringify(data));
    dataDynamic.push({
      parentId: null,
      id: "Scripts",
      name: "Scripts"
    });
    for (let componentPair of Component$1.Registry.entries()) {
      const path = componentPair[0];
      componentPair[1];
      const pathSplit = path.split("/");
      const nameWithExtension = pathSplit[pathSplit.length - 1];
      const name = nameWithExtension.split(".")[0];
      dataDynamic.push({
        parentId: "Scripts",
        id: path,
        name
      });
    }
    return /* @__PURE__ */ createElement("div", { style: {
      marginTop: "10px"
    } }, /* @__PURE__ */ createElement("div", { style: {
      textAlign: "center"
    } }, /* @__PURE__ */ createElement(
      "button",
      {
        style: {
          width: "70%",
          backgroundColor: "#404040",
          color: "inherit",
          border: "none",
          borderRadius: "2px",
          padding: "3px",
          cursor: "pointer"
        },
        onClick: (event) => {
          this.onAddComponentClicked(this.props.gameObject, event);
        }
      },
      "Add component"
    )), this.state.isMenuOpen ? /* @__PURE__ */ createElement(DrillDownMenu, { onItemClicked: (item) => this.onMenuItemClicked(item), currentParent: null, items: dataDynamic }) : "");
  }
}

class InspectorType extends Component {
  constructor(props) {
    super(props);
  }
  onDrop(event) {
    const draggedItem = ExtendedDataTransfer.data;
    const component = this.props.component[this.props.property];
    if (!draggedItem.constructor || !component.constructor) {
      console.warn("Invalid component");
      return;
    }
    const isValid = draggedItem.constructor === component.constructor;
    if (!isValid) return;
    this.props.component[this.props.property] = draggedItem;
    const input = event.currentTarget;
    if (input.classList.contains("active")) {
      input.classList.remove("active");
    }
    if (this.props.onChanged) {
      event.currentTarget;
      console.log("ON CHA");
      this.props.onChanged(draggedItem);
    }
    event.preventDefault();
    event.stopPropagation();
  }
  onDragOver(event) {
    event.preventDefault();
  }
  onDragEnter(event) {
    const draggedItem = ExtendedDataTransfer.data;
    const component = this.props.component[this.props.property];
    if (!draggedItem.constructor || !component.constructor) {
      console.warn("Invalid component");
      return;
    }
    const isValid = draggedItem.constructor === component.constructor;
    if (!isValid) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const input = event.currentTarget;
    if (!input.classList.contains("active")) {
      input.classList.add("active");
    }
  }
  onDragLeave(event) {
    const input = event.currentTarget;
    if (input.classList.contains("active")) {
      input.classList.remove("active");
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { class: "edit" }, /* @__PURE__ */ createElement("span", { class: `vec-label`, style: `background-color: #e67e2250; cursor: auto` }, "\u25C9"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        disabled: true,
        value: this.props.value,
        onDragEnter: (event) => this.onDragEnter(event),
        onDragLeave: (event) => this.onDragLeave(event),
        onDrop: (event) => this.onDrop(event),
        onDragOver: (event) => this.onDragOver(event)
      }
    )));
  }
}

class LayoutInspectorGameObject extends Component {
  constructor(props) {
    super(props);
    this.state = { gameObject: null };
    EventSystem.on(LayoutHierarchyEvents.Selected, (gameObject) => {
      this.setState({ gameObject });
    });
    EventSystem.on(ComponentEvents.Created, (gameObject, component) => {
      this.setState({ gameObject });
    });
    EventSystem.on(GameObjectEvents.Changed, (gameObject, component) => {
      this.setState({ gameObject });
    });
  }
  onRemoveComponent(component) {
  }
  onComponentPropertyChanged(component, property, value) {
    const type = typeof component[property];
    component.constructor.name;
    const customType = component[property];
    if (customType) {
      component[property] = value;
    } else if (this.props.engineAPI.isVector3(component[property]) && this.props.engineAPI.isVector3(value)) {
      component[property].copy(value);
    } else if (this.props.engineAPI.isColor(component[property]) && this.props.engineAPI.isColor(value)) {
      component[property].copy(value);
    } else if (type == "boolean") {
      component[property] = value;
    } else if (type == "number") {
      component[property] = parseFloat(value);
    }
    this.setState({ gameObject: this.state.gameObject });
  }
  onGameObjectNameChanged(gameObject, event) {
    const input = event.currentTarget;
    gameObject.name = input.value;
    EventSystem.emit(GameObjectEvents.Changed, gameObject);
  }
  renderInspectorForComponentProperty(component, property) {
    component.constructor.name;
    const type = typeof component[property];
    if (type == "function") return null;
    const title = StringUtils.CapitalizeStrArray(StringUtils.CamelCaseToArray(property)).join(" ");
    if (this.props.engineAPI.isVector3(component[property])) {
      return /* @__PURE__ */ createElement(InspectorVector3, { title, onChanged: (value) => {
        this.onComponentPropertyChanged(component, property, value);
      }, vector3: component[property] });
    } else if (this.props.engineAPI.isColor(component[property])) {
      return /* @__PURE__ */ createElement(InspectorColor, { title, onChanged: (value) => {
        this.onComponentPropertyChanged(component, property, value);
      }, color: component[property] });
    } else if (this.props.engineAPI.isVector2(component[property])) {
      return /* @__PURE__ */ createElement(InspectorVector2, { title, onChanged: (value) => {
        this.onComponentPropertyChanged(component, property, value);
      }, vector2: component[property] });
    } else if (type == "number") {
      return /* @__PURE__ */ createElement(InspectorInput, { onChanged: (value) => {
        this.onComponentPropertyChanged(component, property, value);
      }, title, value: component[property], type: "number" });
    } else if (type == "boolean") {
      return /* @__PURE__ */ createElement(InspectorCheckbox, { onChanged: (value) => {
        this.onComponentPropertyChanged(component, property, value);
      }, title, selected: component[property] });
    } else if (type == "object") {
      let valueForType = component[property].constructor.name;
      if (component[property].assetPath) {
        valueForType = StringUtils.GetNameForPath(component[property].assetPath);
      }
      return /* @__PURE__ */ createElement(
        InspectorType,
        {
          onChanged: (value) => {
            this.onComponentPropertyChanged(component, property, value);
          },
          title,
          component,
          property,
          value: valueForType
        }
      );
    }
  }
  renderInspectorForComponent(component) {
    let componentPropertiesHTML = [];
    const serializedProperties = this.props.engineAPI.GetSerializedFields(component);
    for (let property of serializedProperties) {
      try {
        const componentPropertyElement = this.renderInspectorForComponentProperty(component, property);
        if (componentPropertyElement) {
          componentPropertiesHTML.push(componentPropertyElement);
        }
      } catch (error) {
        console.warn(error);
      }
    }
    return componentPropertiesHTML;
  }
  renderInspectorForGameObject(gameObject) {
    let inspectorHTML = [];
    const components = gameObject.GetComponents();
    for (let component of components) {
      const componentCast = component;
      const componentPropertiesHTML = this.renderInspectorForComponent(componentCast);
      const componentHTML = /* @__PURE__ */ createElement(
        Collapsible,
        {
          header: componentCast.constructor.name,
          onRightMenuClicked: () => this.onRemoveComponent(component),
          rightMenuText: "x"
        },
        ...componentPropertiesHTML
      );
      inspectorHTML.push(componentHTML);
    }
    return inspectorHTML;
  }
  onGameObjectEnabled(event) {
    this.state.gameObject.enabled = event.target.checked;
  }
  render() {
    if (!this.state.gameObject) return /* @__PURE__ */ createElement("div", null);
    const componentsElements = this.renderInspectorForGameObject(this.state.gameObject);
    return /* @__PURE__ */ createElement("div", { style: {
      height: "100%",
      overflow: "auto",
      width: "100%"
    } }, /* @__PURE__ */ createElement("div", { style: {
      display: "flex",
      padding: "10px"
    } }, /* @__PURE__ */ createElement("input", { type: "checkbox", checked: this.state.gameObject.enabled, onChange: (event) => {
      this.onGameObjectEnabled(event);
    } }), /* @__PURE__ */ createElement(
      "input",
      {
        style: {
          width: "100%",
          fontSize: "12px",
          background: "#121212",
          borderRadius: "5px",
          color: "white",
          border: "none",
          outline: "none",
          paddingLeft: "5px"
        },
        type: "text",
        value: this.state.gameObject.name,
        onChange: (event) => {
          this.onGameObjectNameChanged(this.state.gameObject, event);
        }
      }
    )), /* @__PURE__ */ createElement(Collapsible, { header: "Transform" }, /* @__PURE__ */ createElement(InspectorVector3, { key: `position-${this.state.gameObject.id}`, title: "Position", onChanged: (value) => {
      this.onComponentPropertyChanged(this.state.gameObject.transform, "localPosition", value);
    }, vector3: this.state.gameObject.transform.localPosition }), /* @__PURE__ */ createElement(InspectorVector3, { key: `rotation-${this.state.gameObject.id}`, title: "Rotation", onChanged: (value) => {
      this.onComponentPropertyChanged(this.state.gameObject.transform, "localEulerAngles", value);
    }, vector3: this.state.gameObject.transform.localEulerAngles }), /* @__PURE__ */ createElement(InspectorVector3, { key: `scale-${this.state.gameObject.id}`, title: "Scale", onChanged: (value) => {
      this.onComponentPropertyChanged(this.state.gameObject.transform, "scale", value);
    }, vector3: this.state.gameObject.transform.scale })), componentsElements, /* @__PURE__ */ createElement(AddComponent, { gameObject: this.state.gameObject }));
  }
}

class LayoutInspector extends Component {
  render() {
    return /* @__PURE__ */ createElement(LayoutInspectorGameObject, { engineAPI: this.props.engineAPI });
  }
}

class LayoutTopbar extends Component {
  constructor(props) {
    super(props);
    this.setState({ selectedGameObject: null });
    EventSystem.on(LayoutHierarchyEvents.Selected, (gameObject) => {
      this.setState({ selectedGameObject: gameObject });
    });
  }
  openProject() {
    FileBrowser.init().then(() => {
      EventSystem.emit(ProjectEvents.Opened);
    });
  }
  async saveProject() {
    const serializedScene = this.props.engineAPI.currentScene.Serialize();
    const handle = await FileBrowser.fopen(`${this.props.engineAPI.currentScene.name}.scene`, MODE.W);
    FileBrowser.fwrite(handle, JSON.stringify(serializedScene));
  }
  async test() {
    const serializedScene = this.props.engineAPI.currentScene.Serialize();
    console.log(JSON.stringify(serializedScene));
  }
  render() {
    return /* @__PURE__ */ createElement("div", { style: "padding: 5px" }, /* @__PURE__ */ createElement(Menu, { name: "File" }, /* @__PURE__ */ createElement(MenuItem, { name: "Open Project...", onClicked: () => {
      this.openProject();
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Save Project", onClicked: () => {
      this.saveProject();
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Test", onClicked: () => {
      this.test();
    } })));
  }
}

class Layout extends Component {
  render() {
    return /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 1; height: 100%;" }, /* @__PURE__ */ createElement("flex-item", null, /* @__PURE__ */ createElement(LayoutTopbar, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex", { class: "h", style: "flex: 1; height: 100%;" }, /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 2;" }, /* @__PURE__ */ createElement("flex-item", { style: "flex: 2;" }, /* @__PURE__ */ createElement(LayoutCanvas, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutAssets, { engineAPI: this.props.engineAPI }))), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutHierarchy, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 1;" }, /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutInspector, { engineAPI: this.props.engineAPI })))));
  }
}

const engineAPI = new TridentAPI();
class App extends Component {
  render() {
    return /* @__PURE__ */ createElement(Layout, { engineAPI });
  }
}
render(/* @__PURE__ */ createElement(App, null), document.body);
