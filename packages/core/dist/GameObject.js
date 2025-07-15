import { Component } from "./components/Component";
import { Transform } from "./components/Transform";
import { Camera } from "./components/Camera";
import { Utils } from "./utils/Utils";
export class GameObject {
    id = Utils.UUID();
    name = "GameObject";
    scene;
    transform;
    componentsArray = [];
    componentsMapped = new Map();
    constructor(scene) {
        this.scene = scene;
        this.transform = new Transform(this);
        this.scene.AddGameObject(this);
    }
    AddComponent(component) {
        try {
            let componentInstance = new component(this);
            if (!(componentInstance instanceof Component))
                throw Error("Invalid component");
            if (componentInstance instanceof Transform)
                throw Error("A GameObject can only have one Transform");
            const AddComponentInternal = (component, instance) => {
                if (!this.componentsMapped.has(component.name))
                    this.componentsMapped.set(component.name, []);
                this.componentsMapped.get(component.name)?.push(instance);
                this.componentsArray.push(instance);
            };
            AddComponentInternal(component, componentInstance);
            let currentComponent = component;
            let i = 0;
            while (i < 10) {
                currentComponent = Object.getPrototypeOf(currentComponent);
                if (currentComponent.name === Component.name || currentComponent.name === "") {
                    break;
                }
                AddComponentInternal(currentComponent, componentInstance);
                i++;
            }
            if (componentInstance instanceof Camera && !Camera.mainCamera)
                Camera.mainCamera = componentInstance;
            if (this.scene.hasStarted)
                componentInstance.Start();
            return componentInstance;
        }
        catch (error) {
            throw Error(`Error creating component` + error);
        }
    }
    GetComponent(type) {
        const components = this.GetComponents(type);
        if (components.length > 0)
            return components[0];
        return null;
    }
    GetComponents(type) {
        if (!type)
            return this.componentsArray;
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
}
