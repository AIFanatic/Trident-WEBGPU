import { Component, SerializedComponent } from "./components/Component";
import { Scene } from "./Scene";
import { Transform } from "./components/Transform";
import { Camera } from "./components/Camera";
import { UUID } from "./utils";

export class GameObject {
    public id = UUID();
    public name: string = "GameObject";
    public scene: Scene;

    public transform: Transform;
    
    private componentsArray: Component[] = [];
    private componentsMapped: Map<string, Component[]> = new Map();

    public enabled: boolean = true;

    constructor(scene: Scene) {
        this.scene = scene;
        this.transform = new Transform(this);
        this.scene.AddGameObject(this);
    }

    public AddComponent<T extends Component>(component: new(...args: any[]) => T): T {
        try {
            let componentInstance = new component(this);
            if (!(componentInstance instanceof Component)) throw Error("Invalid component");
            if (componentInstance instanceof Transform) throw Error("A GameObject can only have one Transform");
            
            const AddComponentInternal = (component: new(...args: any[]) => T, instance: Component) => {
                if (!this.componentsMapped.has(component.name)) this.componentsMapped.set(component.name, []);
                this.componentsMapped.get(component.name)?.push(instance);
                this.componentsArray.push(instance);
            }
            
            AddComponentInternal(component, componentInstance);

            // let currentComponent = component;
            // let i = 0
            // while (i < 10) {
            //     currentComponent = Object.getPrototypeOf(currentComponent);
            //     if (currentComponent.name === Component.name || currentComponent.name === "") {
            //         break;
            //     }
            //     AddComponentInternal(currentComponent, componentInstance);
            //     i++;
            // }

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

    public GetComponents<T extends Component>(type?: new(...args: any[]) => T): T[] {
        if (!type) return this.componentsArray as T[];
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
        this.scene.RemoveGameObject(this);
    }

    public Serialize(): {name: string, components: Object[], transform: Object} {
        return {
            name: this.name,
            transform: this.transform.Serialize(),
            components: this.componentsArray.map(c => c.Serialize())
        };
    }

    public Deserialize(data: {name: string, components: SerializedComponent[], transform: Object}) {
        this.name = data.name;
        this.transform.Deserialize(data.transform);

        // Create first
        let componentInstances: Component[] = [];
        for (let i = 0; i < data.components.length; i++) {
            const component = data.components[i];
            const componentClass = Component.Registry.get(component.type);
            if (!componentClass) throw Error(`Component ${component.type} not found in component registry.`);
            console.log(componentClass)
            const instance = this.AddComponent(componentClass);
            componentInstances.push(instance);
        }

        // Deserialize after
        for (let i = 0; i < data.components.length; i++) {
            const componentInstance = componentInstances[i];
            const componentSerialized = data.components[i];
            componentInstance.Deserialize(componentSerialized);
        }
    }
}