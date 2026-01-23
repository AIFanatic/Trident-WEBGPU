import { Renderer, Scene, GameObject, Mathf, Component as Component$1, Geometry, PBRMaterial, Utils, Components } from '@trident/core';
import { OrbitControls } from '@trident/plugins/OrbitControls.js';
import { GLTFLoader } from '@trident/plugins/GLTF/GLTFLoader.js';

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
  createPlaneGeometry() {
    return Geometry.Plane();
  }
  createCubeGeometry() {
    return Geometry.Cube();
  }
  createPBRMaterial(args) {
    return new PBRMaterial(args);
  }
  SerializableFields = Utils.SerializableFields;
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
    [].concat(...vdom.children).map((child, index) => {
      const key = child.props && child.props.key || `__index_${index}`;
      dom.appendChild(pool[key] ? patch(pool[key], child) : render(child, dom));
      delete pool[key];
    });
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
  DirectionalLight: Components.DirectionalLight,
  Mesh: Components.Mesh
};

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
    camera.SetPerspective(72, canvas.width / canvas.height, 0.5, 500);
    const observer = new ResizeObserver((entries) => {
      camera.SetPerspective(72, canvas.width / canvas.height, 0.05, 500);
    });
    observer.observe(canvas);
    mainCameraGameObject.transform.position.set(0, 0, 10);
    mainCameraGameObject.transform.LookAtV1(EngineAPI.createVector3(0, 0, 0));
    new OrbitControls(canvas, camera);
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
    currentScene.Start();
  }
  render() {
    return /* @__PURE__ */ createElement("canvas", { ref: (canvas) => this.canvasRef(canvas) });
  }
}

class GameObjectEvents {
  static Selected = (gameObject) => {
  };
  static Created = (gameObject) => {
  };
  static Deleted = (gameObject) => {
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

class _FileBrowser {
  rootFolderHandle;
  constructor() {
    if (!window.showDirectoryPicker) {
      alert("FileSystem API not supported.");
      throw Error("FileSystem API not supported.");
    }
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
    this.update();
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
    return new Promise(async (resolve, reject) => {
      for (let watchPair of this.watches) {
        const directoryPath = watchPair[0];
        const directoryWatch = watchPair[1];
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
      resolve();
    }).then(() => {
      setTimeout(() => {
        this.update();
      }, 1e3);
    });
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
    const pathArray = path.split("/");
    const nameArr = pathArray[pathArray.length - 1].split(".");
    return nameArr[0];
  }
  static Dirname(path) {
    const pathArr = path.split("/");
    const parentPath = pathArr.slice(0, pathArr.length - 1);
    return parentPath.join("/");
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
    event.preventDefault();
    event.stopPropagation();
  }
  onDoubleClicked(event) {
    if (this.props.onDoubleClicked) {
      this.props.onDoubleClicked(this.props.item);
      event.preventDefault();
      event.stopPropagation();
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
          onClick: (event) => this.onClicked(event),
          onDoubleClick: (event) => this.onDoubleClicked(event)
        },
        /* @__PURE__ */ createElement(
          "span",
          {
            style: { width: "15px", height: "15px", fontSize: "10px" },
            onClick: (event) => {
              this.handleToggle(event);
            }
          },
          this.state.isOpen ? "\u25BC " : "\u25B6 "
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
  onClicked(event) {
    this.props.onClicked(this.props.data);
    event.preventDefault();
    event.stopPropagation();
  }
  onDoubleClicked(event) {
    if (this.props.onDoubleClicked) {
      this.props.onDoubleClicked(this.props.data);
      event.preventDefault();
      event.stopPropagation();
    }
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
          onClick: (event) => this.onClicked(event),
          onDoubleClick: (event) => this.onDoubleClicked(event)
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

class LayoutAssets extends Component {
  fileWatcher;
  constructor(props) {
    super(props);
    this.setState({ currentTreeMap: /* @__PURE__ */ new Map() });
    this.fileWatcher = new FileWatcher();
    EventSystem.on(ProjectEvents.Opened, () => {
      this.fileWatcher.watch("");
    });
    EventSystem.on(FileEvents.Created, (path, handle) => {
      this.onFileOrDirectoryCreated(path, handle);
    });
    EventSystem.on(DirectoryEvents.Created, (path, handle) => {
      this.onFileOrDirectoryCreated(path, handle);
    });
  }
  onFileOrDirectoryCreated(path, file) {
    if (file instanceof FileSystemDirectoryHandle) {
      this.fileWatcher.watch(path);
    }
    if (!this.state.currentTreeMap.has(path)) {
      this.state.currentTreeMap.set(path, {
        id: path,
        name: file.name,
        isSelected: false,
        parent: StringUtils.Dirname(path) == path ? null : StringUtils.Dirname(path),
        type: file instanceof FileSystemFileHandle ? ITreeMapType.File : ITreeMapType.Folder,
        data: {
          file,
          instance: null
        }
      });
    }
    console.log(this.state.currentTreeMap);
    this.setState({ currentTreeMap: this.state.currentTreeMap });
  }
  onToggled(item) {
    console.log("onToggled", item);
  }
  async onItemClicked(item) {
    console.log("onItemClicked", item);
    if (!item.data.instance) {
      if (item.data.file instanceof FileSystemFileHandle) {
        const extension = item.data.file.name.slice(item.data.file.name.lastIndexOf(".") + 1);
        if (extension === "glb") {
          console.log(extension);
          const data = await item.data.file.getFile();
          const arrayBuffer = await data.arrayBuffer();
          const prefab = await GLTFLoader.LoadFromArrayBuffer(arrayBuffer);
          console.log(prefab);
        }
      }
    }
  }
  onDropped(from, to) {
    console.log("onDropped");
  }
  render() {
    let treeMapArr = [];
    for (const [name, entry] of this.state.currentTreeMap) {
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
        style: {
          overflow: "auto",
          height: "100%"
        }
      },
      /* @__PURE__ */ createElement(
        Tree,
        {
          onToggled: (item) => this.onToggled(item),
          onDropped: (from, to) => this.onDropped(from, to),
          onClicked: (data) => this.onItemClicked(data),
          data: treeMapArr
        }
      )
    );
  }
}

class LayoutHierarchy extends Component {
  constructor(props) {
    super(props);
    this.setState({ gameObject: null });
    EventSystem.on(GameObjectEvents.Created, (gameObject) => {
      this.selectGameObject(gameObject);
    });
    EventSystem.on(GameObjectEvents.Deleted, (gameObject) => {
      if (gameObject === this.state.gameObject) this.setState({ gameObject: null });
    });
  }
  selectGameObject(gameObject) {
    console.log("selected", gameObject);
    EventSystem.emit(LayoutHierarchyEvents.Selected, gameObject);
    this.setState({ gameObject });
  }
  onDropped(from, to) {
  }
  onDragStarted(event, data) {
  }
  buildTreeFromGameObjects(gameObjects) {
    const treeMap = [];
    for (let gameObject of gameObjects) {
      treeMap.push({
        id: gameObject.transform.id,
        name: gameObject.name,
        isSelected: this.state.gameObject && this.state.gameObject == gameObject ? true : false,
        parent: gameObject.transform.parent ? gameObject.transform.parent.id : "",
        data: gameObject
      });
    }
    return treeMap;
  }
  render() {
    if (!this.props.engineAPI.currentScene) return;
    const nodes = this.buildTreeFromGameObjects(this.props.engineAPI.currentScene.gameObjects);
    return /* @__PURE__ */ createElement("div", { style: "width: 100%; overflow: auto;" }, /* @__PURE__ */ createElement(
      Tree,
      {
        onDropped: (from, to) => this.onDropped(from, to),
        onClicked: (data) => this.selectGameObject(data.data),
        onDragStarted: (event, data) => this.onDragStarted(event, data),
        data: nodes
      }
    ));
  }
}

class InspectorInput extends Component {
  constructor(props) {
    super(props);
  }
  onChanged(event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      if (input.value == "") return;
      this.props.onChanged(input.value);
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        type: this.props.type ? this.props.type : "text",
        onChange: (event) => {
          this.onChanged(event);
        },
        value: this.props.value
      }
    ));
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
          width: "70%"
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
    this.state = { vector3: this.props.vector3.clone() };
  }
  onChanged(property, event) {
    if (this.props.onChanged) {
      const input = event.currentTarget;
      if (input.value == "") return;
      const value = parseFloat(input.value);
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
      this.setState({ vector3: this.props.vector3.clone() });
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement("div", { style: {
      width: "22%",
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ createElement("span", { style: {
      fontSize: "12px"
    } }, "X"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input input-vector3",
        type: "number",
        onChange: (event) => {
          this.onChanged(0 /* X */, event);
        },
        value: this.state.vector3.x
      }
    )), /* @__PURE__ */ createElement("div", { style: {
      width: "22%",
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ createElement("span", { style: {
      fontSize: "12px"
    } }, "Y"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input input-vector3",
        type: "number",
        onChange: (event) => {
          this.onChanged(1 /* Y */, event);
        },
        value: this.state.vector3.y
      }
    )), /* @__PURE__ */ createElement("div", { style: {
      width: "22%",
      display: "flex",
      alignItems: "center"
    } }, /* @__PURE__ */ createElement("span", { style: {
      fontSize: "12px"
    } }, "Z"), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input input-vector3",
        type: "number",
        onChange: (event) => {
          this.onChanged(2 /* Z */, event);
        },
        value: this.state.vector3.z
      }
    )));
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
    return /* @__PURE__ */ createElement("div", { className: "collapsible-card-edonec", id: this.props.id ? this.props.id : "" }, /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { className: "collapsible-header-edonec", onClick: () => {
      this.handleFilterOpening();
    } }, /* @__PURE__ */ createElement("button", { type: "button", className: "collapsible-icon-button-edonec" }, this.state.isOpen ? "\u25BC" : "\u25B6"), /* @__PURE__ */ createElement("div", { className: "title-text-edonec" }, this.props.header), this.props.rightMenuText ? /* @__PURE__ */ createElement("div", { className: "title-right-menu", onClick: (event) => {
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
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement(
      "input",
      {
        className: "input",
        type: "color",
        onChange: (event) => {
          this.onChanged(event);
        },
        value: this.state.color.toHex().slice(0, 7)
      }
    ));
  }
}

class InspectorType extends Component {
  constructor(props) {
    super(props);
  }
  onDrop(event) {
  }
  onDragOver(event) {
    event.preventDefault();
  }
  onDragEnter(event) {
  }
  onDragLeave(event) {
    const input = event.currentTarget;
    if (input.classList.contains("active")) {
      input.classList.remove("active");
    }
  }
  render() {
    return /* @__PURE__ */ createElement("div", { className: "InspectorComponent" }, /* @__PURE__ */ createElement("span", { className: "title" }, this.props.title), /* @__PURE__ */ createElement(
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
    ), /* @__PURE__ */ createElement(
      "span",
      {
        style: {
          width: "15px",
          height: "15px",
          position: "relative",
          right: "10px",
          textAlign: "center"
        }
      },
      "o"
    ));
  }
}

class LayoutInspectorGameObject extends Component {
  constructor(props) {
    super(props);
    this.state = { gameObject: null };
    EventSystem.on(LayoutHierarchyEvents.Selected, (gameObject) => {
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
  }
  onGameObjectNameChanged(gameObject, event) {
    const input = event.currentTarget;
    gameObject.name = input.value;
  }
  getInstanceParentInstance(instance) {
    const prototype = Object.getPrototypeOf(instance);
    const prototypeParent = Object.getPrototypeOf(prototype);
    if (prototypeParent.constructor.name == "Object" || prototypeParent.constructor.name == "EventDispatcher") {
      return prototype.constructor;
    }
    return this.getInstanceParentInstance(prototype);
  }
  renderInspectorForComponentProperty(component, property, checkCustomTypeOnly = false) {
    component.constructor.name;
    const type = typeof component[property];
    if (type == "function") return null;
    const title = StringUtils.CapitalizeStrArray(StringUtils.CamelCaseToArray(property)).join(" ");
    component[property];
    if (checkCustomTypeOnly) return;
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
      if (component[property].userData && component[property].userData.fileId) {
        valueForType = StringUtils.GetNameForPath(component[property].userData.fileId);
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
    console.log("component", component);
    let componentPropertiesHTML = [];
    for (let property of Object.getOwnPropertyNames(Object.getPrototypeOf(component))) {
      if (!component[property]) continue;
      if (!this.props.engineAPI.SerializableFields.has(component, property)) continue;
      try {
        const componentPropertyElement = this.renderInspectorForComponentProperty(component, property);
        if (componentPropertyElement) {
          componentPropertiesHTML.push(componentPropertyElement);
        }
      } catch (error) {
        console.warn(error);
      }
    }
    for (let property in component) {
      try {
        if (!this.props.engineAPI.SerializableFields.has(component, property)) continue;
        const componentPropertyElement = this.renderInspectorForComponentProperty(component, property, false);
        if (componentPropertyElement && !componentPropertiesHTML.includes(componentPropertyElement)) {
          componentPropertiesHTML.push(componentPropertyElement);
        }
      } catch (error) {
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
      overflow: "auto"
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
          paddingLeft: "5px",
          paddingTop: "2px",
          paddingBottom: "2px",
          marginRight: "10px"
        },
        type: "text",
        value: this.state.gameObject.name,
        onChange: (event) => {
          this.onGameObjectNameChanged(this.state.gameObject, event);
        }
      }
    )), /* @__PURE__ */ createElement(Collapsible, { header: "Transform" }, /* @__PURE__ */ createElement(InspectorVector3, { title: "Position", onChanged: (value) => {
      this.onComponentPropertyChanged(this.state.gameObject.transform, "position", value);
    }, vector3: this.state.gameObject.transform.position }), /* @__PURE__ */ createElement(InspectorVector3, { title: "Rotation", onChanged: (value) => {
      this.onComponentPropertyChanged(this.state.gameObject.transform, "localEulerAngles", value);
    }, vector3: this.state.gameObject.transform.eulerAngles }), /* @__PURE__ */ createElement(InspectorVector3, { title: "Scale", onChanged: (value) => {
      this.onComponentPropertyChanged(this.state.gameObject.transform, "localScale", value);
    }, vector3: this.state.gameObject.transform.scale })), componentsElements);
  }
}

class LayoutInspector extends Component {
  render() {
    return /* @__PURE__ */ createElement(LayoutInspectorGameObject, { engineAPI: this.props.engineAPI });
  }
}

class LayoutConsole extends Component {
  constructor(props) {
    super(props);
    this.setState({ messages: [] });
    this.consoleOverride("log");
    this.consoleOverride("warn");
    this.consoleOverride("error");
  }
  consoleOverride(type) {
    const originalMethod = window.console[type];
    window.console[type] = (data) => {
      this.setState({ messages: this.state.messages.concat({ text: data, type }) });
      originalMethod.call(this, data);
    };
  }
  render() {
    let messages = [];
    for (const message of this.state.messages) {
      messages.push(/* @__PURE__ */ createElement("div", { class: message.type }, message.text));
    }
    return /* @__PURE__ */ createElement("div", { class: "LayoutConsole" }, "Console", ...messages);
  }
}

class LayoutTab extends Component {
  constructor(props) {
    super(props);
    this.setState({ selected: 0 });
  }
  onClicked(index) {
    this.setState({ selected: index });
  }
  render() {
    const headers = this.props.entries.map((entry, index) => {
      const classes = `title ${index === this.state.selected ? "selected" : ""}`;
      return /* @__PURE__ */ createElement("div", { onClick: (event) => {
        this.onClicked(index);
      }, class: classes }, entry.title);
    });
    const content = this.props.entries[this.state.selected].node;
    return /* @__PURE__ */ createElement("div", { class: "LayoutTab" }, /* @__PURE__ */ createElement("div", { class: "header" }, ...headers), content);
  }
}

class Menu extends Component {
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
  render() {
    return /* @__PURE__ */ createElement(
      "div",
      {
        className: "dropdown"
      },
      /* @__PURE__ */ createElement(
        "button",
        {
          className: "dropdown-btn",
          onClick: (event) => this.toggleDropdown()
        },
        this.props.name
      ),
      this.state.isDropdownVisible ? /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { className: "dropdown-overlay", onClick: (event) => this.toggleDropdown() }), /* @__PURE__ */ createElement("div", { className: "dropdown-content" }, this.props.children)) : ""
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
          onClick: (event) => this.toggleDropdown()
        },
        this.props.name
      ),
      /* @__PURE__ */ createElement("span", { className: "dropdown-right-icon" }, "\u25B6"),
      this.state.isDropdownVisible ? /* @__PURE__ */ createElement("div", null, /* @__PURE__ */ createElement("div", { ref: (ref) => this.contentRef(ref), className: "dropdown-content", style: "display: none;" }, this.props.children)) : ""
    );
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
        onClick: (event) => {
          this.onClicked(event);
        },
        ...this.props.disabled ? { disabled: true } : {}
      },
      this.props.name
    );
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
  openProject() {
    console.log("open project");
    FileBrowser.init().then(() => {
      EventSystem.emit(ProjectEvents.Opened);
    });
  }
  render() {
    return /* @__PURE__ */ createElement("div", { style: "padding: 5px" }, /* @__PURE__ */ createElement(Menu, { name: "File" }, /* @__PURE__ */ createElement(MenuItem, { name: "Open Project...", onClicked: () => {
      this.openProject();
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Save Project", onClicked: () => {
      this.saveProject();
    } })), /* @__PURE__ */ createElement(Menu, { name: "Edit" }, /* @__PURE__ */ createElement(MenuItem, { name: "Delete", onClicked: () => {
      this.deleteGameObject();
    } })), /* @__PURE__ */ createElement(Menu, { name: "Assets" }, /* @__PURE__ */ createElement(MenuDropdown, { name: "Create" }, /* @__PURE__ */ createElement(MenuItem, { name: "Folder", onClicked: () => {
      this.createFolder();
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Material", onClicked: () => {
      this.createMaterial();
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Script", onClicked: () => {
      this.createScript();
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Scene", onClicked: () => {
      this.createScene();
    } }))), /* @__PURE__ */ createElement(Menu, { name: "GameObject" }, /* @__PURE__ */ createElement(MenuItem, { name: "Create Empty", onClicked: () => {
      this.createEmptyGameObject();
    } }), /* @__PURE__ */ createElement(MenuDropdown, { name: "3D Object" }, /* @__PURE__ */ createElement(MenuItem, { name: "Cube", onClicked: () => {
      this.createPrimitive(PrimitiveType.Cube);
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Capsule", onClicked: () => {
      this.createPrimitive(PrimitiveType.Capsule);
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Plane", onClicked: () => {
      this.createPrimitive(PrimitiveType.Plane);
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Sphere", onClicked: () => {
      this.createPrimitive(PrimitiveType.Sphere);
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Cylinder", onClicked: () => {
      this.createPrimitive(PrimitiveType.Cylinder);
    } })), /* @__PURE__ */ createElement(MenuDropdown, { name: "Lights" }, /* @__PURE__ */ createElement(MenuItem, { name: "Directional Light", onClicked: () => {
      this.createLight(LightTypes.Directional);
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Point Light", onClicked: () => {
      this.createLight(LightTypes.Point);
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Spot Light", onClicked: () => {
      this.createLight(LightTypes.Spot);
    } }), /* @__PURE__ */ createElement(MenuItem, { name: "Area Light", onClicked: () => {
      this.createLight(LightTypes.Area);
    } }))));
  }
}

class Layout extends Component {
  render() {
    return /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 1; height: 100%;" }, /* @__PURE__ */ createElement("flex-item", null, /* @__PURE__ */ createElement(LayoutTopbar, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex", { class: "h", style: "flex: 1; height: 100%;" }, /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 2;" }, /* @__PURE__ */ createElement("flex-item", { style: "flex: 2;" }, /* @__PURE__ */ createElement(LayoutCanvas, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex", { class: "h", style: "flex: 1;" }, /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutTab, { entries: [
      { title: "Assets", node: /* @__PURE__ */ createElement(LayoutAssets, { engineAPI: this.props.engineAPI }) },
      { title: "Console", node: /* @__PURE__ */ createElement(LayoutConsole, { engineAPI: this.props.engineAPI }) }
    ] })))), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutHierarchy, { engineAPI: this.props.engineAPI })), /* @__PURE__ */ createElement(LayoutResizer, null), /* @__PURE__ */ createElement("flex", { class: "v", style: "flex: 1;" }, /* @__PURE__ */ createElement("flex-item", { style: "flex: 1;" }, /* @__PURE__ */ createElement(LayoutInspector, { engineAPI: this.props.engineAPI })))));
  }
}

const engineAPI = new TridentAPI();
class App extends Component {
  render() {
    return /* @__PURE__ */ createElement(Layout, { engineAPI });
  }
}
render(/* @__PURE__ */ createElement(App, null), document.body);
