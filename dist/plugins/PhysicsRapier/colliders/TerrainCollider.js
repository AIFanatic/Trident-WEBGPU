import { SerializeField, EventSystemLocal } from '@trident/core';
import { PhysicsRapier } from '../PhysicsRapier.js';
import { Collider } from './Collider.js';
import { TerrainData, TerrainEvents } from '@trident/plugins/Terrain/Terrain.js';

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
var _terrainData_dec, _a, _init;
class TerrainCollider extends (_a = Collider, _terrainData_dec = [SerializeField(TerrainData)], _a) {
  constructor() {
    super(...arguments);
    __runInitializers(_init, 5, this);
    __publicField(this, "runInEditMode", true);
    __publicField(this, "_terrainData");
    __publicField(this, "onGeometryUpdated", (td) => this.Rebuild(td));
  }
  Start() {
    super.Start();
    this.CreateCollider();
  }
  CreateCollider() {
    if (!this._terrainData) return;
    this.Rebuild(this._terrainData);
  }
  get terrainData() {
    return this._terrainData;
  }
  set terrainData(td) {
    if (this._terrainData === td) return;
    if (this._terrainData) {
      EventSystemLocal.off(TerrainEvents.GeometryUpdated, this._terrainData, this.onGeometryUpdated);
    }
    this._terrainData = td;
    if (!td) return;
    EventSystemLocal.on(TerrainEvents.GeometryUpdated, td, this.onGeometryUpdated);
    this.Rebuild(td);
  }
  Rebuild(terrainData) {
    if (!PhysicsRapier.hasLoaded) {
      console.warn("PhysicsRapier not loaded");
      return;
    }
    const heights = terrainData.heights;
    if (!heights?.length) return;
    const size = Math.sqrt(heights.length);
    if (this.collider) PhysicsRapier.RemoveCollider(this.collider, true);
    this.colliderDesc = PhysicsRapier.Physics.ColliderDesc.heightfield(size - 1, size - 1, heights, terrainData.size);
    this.collider = PhysicsRapier.CreateCollider(this, this.colliderDesc);
    const pos = this.transform.position.clone();
    pos.y -= terrainData.size.y * 0.5;
    this.collider.setTranslation(pos);
    this.collider.setRotation(this.transform.rotation);
  }
  Destroy() {
    if (this._terrainData) EventSystemLocal.off(TerrainEvents.GeometryUpdated, this._terrainData, this.onGeometryUpdated);
    if (this.collider && PhysicsRapier.PhysicsWorld) PhysicsRapier.RemoveCollider(this.collider, true);
  }
}
_init = __decoratorStart(_a);
__decorateElement(_init, 2, "terrainData", _terrainData_dec, TerrainCollider);
__decoratorMetadata(_init, TerrainCollider);
__publicField(TerrainCollider, "type", "@trident/plugins/PhysicsRapier/Colliders/TerrainCollider");

export { TerrainCollider };
