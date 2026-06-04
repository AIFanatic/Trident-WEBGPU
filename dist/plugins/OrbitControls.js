import { Mathf, SerializeField, GameObject, Components, GPU, Input, MouseCodes, KeyCodes, Component } from '@trident/core';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __decoratorStart = (base) => [, , , __create(base?.[__knownSymbol("metadata")] ?? null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) flags & 1 ? fns[i].call(self) : value = fns[i].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = array.length + 1 ;
  var initializers = (array[j - 1] = []), extraInitializers = array[j] || (array[j] = []);
  ((target = target.prototype), k < 5);
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
      access.set = (x, y) => x[name] = y;
    }
    it = (0, decorators[i])(void 0  , ctx), done._ = 1;
    __expectFn(it) && (initializers.unshift(it) );
  }
  return target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _center_dec, _camera_dec, _a, _init;
const _v = new Mathf.Vector3();
class OrbitControls extends (_a = Component, _camera_dec = [SerializeField(GameObject)], _center_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "camera", __runInitializers(_init, 8, this)), __runInitializers(_init, 11, this);
    __publicField(this, "center", __runInitializers(_init, 12, this, new Mathf.Vector3())), __runInitializers(_init, 15, this);
    __publicField(this, "orbitSpeed", 0.01);
    __publicField(this, "panSpeed", 1);
    __publicField(this, "zoomSpeed", 0.1);
    __publicField(this, "enableZoom", true);
    __publicField(this, "enablePan", true);
    __publicField(this, "minRadius", 0);
    __publicField(this, "maxRadius", Infinity);
    __publicField(this, "minTheta", -Infinity);
    __publicField(this, "maxTheta", Infinity);
    __publicField(this, "minPhi", -Math.PI);
    __publicField(this, "maxPhi", Math.PI);
    __publicField(this, "theta", 0);
    __publicField(this, "phi", 0);
  }
  Start() {
    if (!this.camera) this.camera = Components.Camera.mainCamera;
    this.camera.transform.LookAt(this.center);
    if (GPU.Renderer.canvas) {
      GPU.Renderer.canvas.tabIndex = 0;
      GPU.Renderer.canvas.style.cursor = "grab";
      GPU.Renderer.canvas.style.touchAction = "none";
    }
  }
  Update() {
    if (!this.camera) return;
    const deltaX = Input.GetAxis("Mouse X");
    const deltaY = Input.GetAxis("Mouse Y");
    if (Input.GetMouseButton(MouseCodes.MOUSE_RIGHT)) {
      this.setCursor("grabbing");
      this.orbit(deltaX, deltaY);
    } else if (this.enablePan && Input.GetMouseButton(MouseCodes.MOUSE_MIDDLE)) {
      this.setCursor("grabbing");
      this.pan(deltaX, deltaY);
    } else {
      this.setCursor("grab");
    }
    this.handleMovement();
    const scroll = Input.GetAxis("Mouse ScrollWheel");
    if (this.enableZoom && scroll !== 0) {
      this.zoom(1 - scroll * this.zoomSpeed);
    }
  }
  handleMovement() {
    const boostSpeed = Input.GetKey(KeyCodes.SHIFT) ? 10 : 1;
    if (Input.GetKey(KeyCodes.A)) {
      this.pan(1 * boostSpeed, 0);
    }
    if (Input.GetKey(KeyCodes.D)) {
      this.pan(-1 * boostSpeed, 0);
    }
    if (Input.GetKey(KeyCodes.W)) {
      this.zoom(1 - 0.05 * boostSpeed * this.zoomSpeed);
    }
    if (Input.GetKey(KeyCodes.S)) {
      this.zoom(1 + 0.05 * boostSpeed * this.zoomSpeed);
    }
  }
  zoom(scale) {
    const offset = this.camera.transform.position.clone().sub(this.center);
    const radius = offset.length();
    if (radius <= 0) return;
    const nextRadius = Math.min(this.maxRadius, Math.max(this.minRadius, radius * scale));
    offset.normalize().mul(nextRadius);
    this.camera.transform.position.copy(this.center).add(offset);
    this.camera.transform.LookAt(this.center);
  }
  orbit(deltaX, deltaY) {
    if (deltaX === 0 && deltaY === 0) return;
    const distance = this.camera.transform.position.distanceTo(this.center);
    this.theta -= deltaX * this.orbitSpeed;
    this.phi -= deltaY * this.orbitSpeed;
    this.theta = Math.min(this.maxTheta, Math.max(this.minTheta, this.theta));
    this.phi = Math.min(this.maxPhi, Math.max(this.minPhi, this.phi));
    const rotation = new Mathf.Quaternion().setFromEuler(new Mathf.Vector3(this.phi, this.theta, 0));
    const position = new Mathf.Vector3(0, 0, distance).applyQuaternion(rotation).add(this.center);
    this.camera.transform.rotation.copy(rotation);
    this.camera.transform.position.copy(position);
  }
  pan(deltaX, deltaY) {
    if (deltaX === 0 && deltaY === 0) return;
    const radius = this.camera.transform.position.clone().sub(this.center).length();
    const height = Math.max(1, GPU.Renderer.height || GPU.Renderer.canvas?.clientHeight || 1);
    const panScale = this.panSpeed * radius / height;
    const offset = _v.set(-deltaX, deltaY, 0).applyQuaternion(this.camera.transform.rotation).mul(panScale);
    this.center.add(offset);
    this.camera.transform.position.add(offset);
  }
  setCursor(cursor) {
    if (!GPU.Renderer.canvas) return;
    GPU.Renderer.canvas.style.cursor = cursor;
  }
  Destroy() {
    this.setCursor("default");
    super.Destroy();
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 5, "camera", _camera_dec, OrbitControls);
__decorateElement(_init, 5, "center", _center_dec, OrbitControls);
__decoratorMetadata(_init, OrbitControls);
__publicField(OrbitControls, "type", "@trident/plugins/OrbitControls");

export { OrbitControls };
