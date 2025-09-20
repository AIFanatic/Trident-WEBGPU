import { EventSystemLocal, EventSystem } from '../Events.js';
import { Color } from '../math/Color.js';
import { Vector3 } from '../math/Vector3.js';
import { Renderer } from '../renderer/Renderer.js';
import { SerializeField } from '../utils/SerializeField.js';
import { Camera } from './Camera.js';
import { Component } from './Component.js';
import { TransformEvents } from './Transform.js';

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
var _castShadows_dec, _range_dec, _intensity_dec, _color_dec, _a, _init, _direction_dec, _b, _init2;
class LightEvents {
  static Updated = (light) => {
  };
}
class Light extends (_a = Component, _color_dec = [SerializeField], _intensity_dec = [SerializeField], _range_dec = [SerializeField], _castShadows_dec = [SerializeField], _a) {
  constructor() {
    super(...arguments);
    __publicField(this, "camera");
    __publicField(this, "color", __runInitializers(_init, 8, this, new Color(1, 1, 1))), __runInitializers(_init, 11, this);
    __publicField(this, "intensity", __runInitializers(_init, 12, this, 1)), __runInitializers(_init, 15, this);
    __publicField(this, "range", __runInitializers(_init, 16, this, 10)), __runInitializers(_init, 19, this);
    __publicField(this, "castShadows", __runInitializers(_init, 20, this, true)), __runInitializers(_init, 23, this);
  }
  Start() {
    this.camera = new Camera(this.gameObject);
    EventSystemLocal.on(TransformEvents.Updated, this.transform, () => {
      EventSystem.emit(LightEvents.Updated, this);
    });
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 5, "color", _color_dec, Light);
__decorateElement(_init, 5, "intensity", _intensity_dec, Light);
__decorateElement(_init, 5, "range", _range_dec, Light);
__decorateElement(_init, 5, "castShadows", _castShadows_dec, Light);
__decoratorMetadata(_init, Light);
class SpotLight extends Light {
  direction = new Vector3(0, -1, 0);
  angle = 1;
  Start() {
    super.Start();
    this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1e3);
  }
  // public Update(): void {
  //     this.camera.SetPerspective(this.angle / Math.PI * 180 * 2, Renderer.width / Renderer.height, 0.01, 1000);
  // }
}
class PointLight extends Light {
  Start() {
    super.Start();
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
  }
}
class AreaLight extends Light {
  Start() {
    super.Start();
    this.camera.SetPerspective(60, Renderer.width / Renderer.height, 0.01, 1e3);
  }
}
class DirectionalLight extends (_b = Light, _direction_dec = [SerializeField], _b) {
  constructor() {
    super(...arguments);
    __publicField(this, "direction", __runInitializers(_init2, 8, this, new Vector3(0, 1, 0))), __runInitializers(_init2, 11, this);
  }
  Start() {
    super.Start();
    const size = 1;
    this.camera.SetOrthographic(-size, size, -size, size, 0.1, 100);
  }
}
_init2 = __decoratorStart(_b);
__decorateElement(_init2, 5, "direction", _direction_dec, DirectionalLight);
__decoratorMetadata(_init2, DirectionalLight);

export { AreaLight, DirectionalLight, Light, LightEvents, PointLight, SpotLight };
