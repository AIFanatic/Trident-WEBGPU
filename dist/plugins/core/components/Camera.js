import { EventSystemLocal, EventSystem } from '../Events.js';
import { Frustum } from '../math/Frustum.js';
import { Color } from '../math/Color.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Component } from './Component.js';
import { TransformEvents } from './Transform.js';
import { SerializeField } from '../utils/SerializeField.js';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) fns[i].call(self) ;
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = 2 , key = __decoratorStrings[k + 5];
  var extraInitializers = array[j] || (array[j] = []);
  var desc = ((target = target.prototype), __getOwnPropDesc(target , name));
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
    }
    it = (0, decorators[i])(desc[key]  , ctx), done._ = 1;
    __expectFn(it) && (desc[key] = it );
  }
  return desc && __defProp(target, name, desc), target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _aspect_dec, _fov_dec, _far_dec, _near_dec, _a, _init;
class CameraEvents {
  static Updated = (camera) => {
  };
}
class Camera extends (_a = Component, _near_dec = [SerializeField], _far_dec = [SerializeField], _fov_dec = [SerializeField], _aspect_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __runInitializers(_init, 5, this);
    __publicField(this, "backgroundColor", new Color(0, 0, 0, 1));
    __publicField(this, "projectionMatrix", new Matrix4());
    __publicField(this, "projectionScreenMatrix", new Matrix4());
    // public projectionScreenMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse )
    __publicField(this, "viewMatrix", new Matrix4());
    __publicField(this, "frustum", new Frustum());
    __publicField(this, "_near");
    __publicField(this, "_far");
    __publicField(this, "_fov");
    __publicField(this, "_aspect");
  }
  get near() {
    return this._near;
  }
  set near(near) {
    this.SetPerspective(this.fov, this.aspect, near, this.far);
  }
  get far() {
    return this._far;
  }
  set far(far) {
    this.SetPerspective(this.fov, this.aspect, this.near, far);
  }
  get fov() {
    return this._fov;
  }
  set fov(fov) {
    this.SetPerspective(fov, this.aspect, this.near, this.far);
  }
  get aspect() {
    return this._aspect;
  }
  set aspect(aspect) {
    this.SetPerspective(this.fov, aspect, this.near, this.far);
  }
  SetPerspective(fov, aspect, near, far) {
    this._fov = fov;
    this._aspect = aspect;
    this._near = near;
    this._far = far;
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
    this.projectionScreenMatrix.multiplyMatrices(this.projectionMatrix, this.transform.worldToLocalMatrix);
    this.frustum.setFromProjectionMatrix(this.projectionScreenMatrix);
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "near", _near_dec, Camera);
__decorateElement(_init, 2, "far", _far_dec, Camera);
__decorateElement(_init, 2, "fov", _fov_dec, Camera);
__decorateElement(_init, 2, "aspect", _aspect_dec, Camera);
__decoratorMetadata(_init, Camera);
__publicField(Camera, "mainCamera");

export { Camera, CameraEvents };
