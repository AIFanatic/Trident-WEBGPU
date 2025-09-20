import { EventSystem } from '../Events.js';
import { UUID } from '../utils/StringUtils.js';

class ComponentEvents {
  static CallUpdate = (component, shouldUpdate) => {
  };
  static AddedComponent = (component, scene) => {
  };
  static RemovedComponent = (component, scene) => {
  };
}
class Component {
  id = UUID();
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
    if (this.constructor.prototype.Update !== Component.prototype.Update) EventSystem.emit(ComponentEvents.CallUpdate, this, true);
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
}

export { Component, ComponentEvents };
