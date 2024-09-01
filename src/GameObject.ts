import { Component } from "./components/Component";
import { Scene } from "./Scene";
import { Transform } from "./components/Transform";
import { Camera } from "./components/Camera";
import { Utils } from "./utils/Utils";

export class GameObject {
    public id = Utils.UUID();
    public name: string = "GameObject";
    public scene: Scene;

    public transform: Transform;
    
    private componentsArray: Component[] = [];
    private componentsMapped: Map<string, Component[]> = new Map();

    constructor(scene: Scene) {
        this.scene = scene;
        this.transform = new Transform(this);
        this.scene.AddGameObject(this);
    }

    // TODO: Fix: A extends B, B extends Component, GetComponent(A) wont work
    public AddComponent<T extends Component>(component: new(...args: any[]) => T): T {
        try {
            let componentInstance = new component(this);
            if (!(componentInstance instanceof Component)) throw Error("Invalid component");
            if (componentInstance instanceof Transform) throw Error("A GameObject can only have one Transform");
            
            if (!this.componentsMapped.has(component.name)) this.componentsMapped.set(component.name, []);
            this.componentsMapped.get(component.name)?.push(componentInstance);
            this.componentsArray.push(componentInstance);

            if (componentInstance instanceof Camera && !Camera.mainCamera) Camera.mainCamera = componentInstance;

            if (this.scene.hasStarted) componentInstance.Start();

            return componentInstance;
        } catch (error) {
            throw Error(`Error creating component` + error);
        }
    }

    public GetComponent<T extends Component>(type: new(...args: any[]) => T): T | null {
        const components = this.GetComponents(type);
        if (components.length > 0) return components[0];
        return null;
    }

    public GetComponents<T extends Component>(type: new(...args: any[]) => T): T[] {
        return this.componentsMapped.get(type.name) as T[] || [];
    }

    public Start() {
        for (const component of this.componentsArray) {
            if (!component.hasStarted) {
                component.Start();
                component.hasStarted = true;
            }
        }
    }

    public Destroy() {
        for (const component of this.componentsArray) {
            component.Destroy();
        }
        this.componentsArray = [];
        this.componentsMapped.clear();
        this.scene.RemoveGameObject(this);
    }
}