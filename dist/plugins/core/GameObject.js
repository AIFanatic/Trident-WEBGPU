import { Component } from './components/Component.js';
import { Transform } from './components/Transform.js';
import { Camera } from './components/Camera.js';
import { UUID } from './utils/StringUtils.js';

class GameObject {
  id = UUID();
  name = "GameObject";
  scene;
  transform;
  componentsArray = [];
  componentsMapped = /* @__PURE__ */ new Map();
  enabled = true;
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
    if (!type) return this.componentsArray;
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
    this.scene.RemoveGameObject(this);
  }
}

export { GameObject };
