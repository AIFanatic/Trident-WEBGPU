import { EventSystem } from './Events.js';
import { ComponentEvents } from './components/Component.js';
import { RenderingPipeline } from './renderer/RenderingPipeline.js';
import { UUID } from './utils/StringUtils.js';

class Scene {
  static Events = {
    OnStarted: (scene) => {
    }
  };
  renderer;
  name = "Default scene";
  id = UUID();
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
    for (const component of gameObject.GetComponents()) {
      let componentsArray = this.componentsByType.get(component.name);
      if (componentsArray) {
        const index2 = componentsArray.indexOf(component);
        if (index2 !== -1) {
          componentsArray.splice(index2, 1);
          this.componentsByType.set(component.name, componentsArray);
        }
      }
    }
  }
  Start() {
    if (this.hasStarted) return;
    for (const gameObject of this.gameObjects) gameObject.Start();
    this._hasStarted = true;
    EventSystem.emit(Scene.Events.OnStarted, this);
    this.Tick();
  }
  Tick() {
    for (const [component, _] of this.toUpdate) {
      if (component.gameObject.enabled === false) continue;
      if (!component.hasStarted) {
        component.Start();
        component.hasStarted = true;
      }
      component.Update();
    }
    this.renderPipeline.Render(this);
    requestAnimationFrame(() => this.Tick());
  }
}

export { Scene };
