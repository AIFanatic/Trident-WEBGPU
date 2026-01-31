import { Component, SerializedComponent } from "./components/Component";
import { Scene } from "./Scene";
import { Transform } from "./components/Transform";
import { UUID } from "./utils";

export interface SerializedGameObject {
    name: string;
    components: SerializedComponent[];
    transform: Object;
    children: SerializedGameObject[];
};

export type Prefab = SerializedGameObject;

function getCtorChain(ctor: Function): Function[] {
    const chain: Function[] = [];
    for (let c: any = ctor; c && c !== Component; c = Object.getPrototypeOf(c)) {
        chain.push(c);
    }
    return chain;
}

export class GameObject {
    public id = UUID();
    public name: string = "GameObject";
    public scene: Scene;

    public transform: Transform;

    private componentsByCtor = new Map<Function, Component[]>();
    private allComponents: Component[] = [];

    public enabled: boolean = true;

    constructor(scene: Scene) {
        this.scene = scene;
        this.transform = new Transform(this);
        this.scene.AddGameObject(this);
    }

    public AddComponent<T extends Component>(Ctor: new (go: GameObject, ...args: any[]) => T, ...args: any[]): T {
        const componentInstance = new Ctor(this, ...args);
        if (!(componentInstance instanceof Component)) throw new Error("Invalid component");
        if (componentInstance instanceof Transform && this.GetComponent(Transform)) throw new Error("A GameObject can only have one Transform");

        this.allComponents.push(componentInstance);

        for (const ctor of getCtorChain(componentInstance.constructor)) {
            let arr = this.componentsByCtor.get(ctor);
            if (!arr) this.componentsByCtor.set(ctor, arr = []);
            if (!arr.includes(componentInstance)) arr.push(componentInstance); // no dupes
        }

        if (this.scene.hasStarted && componentInstance.Start && !componentInstance.hasStarted) {
            componentInstance.Start();
            componentInstance.hasStarted = true;
        }

        return componentInstance;
    }

    public GetComponent<T extends Component>(Ctor: new (...a: any[]) => T): T | null {
        const arr = this.componentsByCtor.get(Ctor);
        return (arr && arr.length) ? (arr[0] as T) : null;
    }

    public GetComponents<T extends Component>(Ctor?: new (...a: any[]) => T): T[] {
        if (!Ctor) return this.allComponents as T[];                 // everything
        return (this.componentsByCtor.get(Ctor) as T[] | undefined) ?? [];
    }

    public GetComponentsExact<T extends Component>(Ctor: new (...a: any[]) => T): T[] {
        const arr = this.componentsByCtor.get(Ctor);
        return arr ? (arr.filter(c => (c as any).constructor === Ctor) as T[]) : [];
    }

    public GetComponentsInChildren<T extends Component>(Ctor?: new (...a: any[]) => T): T[] {
        const out: T[] = [];

        const walk = (go: GameObject) => {
            if (!Ctor) out.push(...(go.allComponents as T[]));
            else {
                const list = go.componentsByCtor.get(Ctor) as T[] | undefined;
                if (list) out.push(...list);
            }

            for (const child of go.transform.children) walk(child.gameObject);
        };

        walk(this);
        return out;
    }


    public Start() {
        for (const component of this.allComponents) {
            if (!component.hasStarted) {
                component.Start();
                component.hasStarted = true;
            }
        }
    }

    public Destroy() {
        for (const child of this.transform.children) {
            child.gameObject.Destroy();
        }
        for (const component of this.allComponents) {
            component.Destroy();
        }
        this.scene.RemoveGameObject(this);
    }

    public Serialize(metadata: any = {}): Prefab {
        let serializedChildren: Prefab[] = [];
        for (const childGameObject of this.transform.children) serializedChildren.push(childGameObject.gameObject.Serialize(metadata));

        return {
            name: this.name,
            transform: this.transform.Serialize(),
            components: this.allComponents.map(c => c.Serialize(metadata)),
            children: serializedChildren,
        };
    }

    public Deserialize(data: Prefab) {
        this.name = data.name;
        this.transform.Deserialize(data.transform);

        // Create first
        let componentInstances: Component[] = [];
        for (let i = 0; i < data.components.length; i++) {
            const component = data.components[i];
            const componentClass = Component.Registry.get(component.type);
            if (!componentClass) throw Error(`Component ${component.type} not found in component registry.`);
            const instance = this.AddComponent(componentClass);
            componentInstances.push(instance);
        }

        // Deserialize after
        for (let i = 0; i < data.components.length; i++) {
            const componentInstance = componentInstances[i];
            const componentSerialized = data.components[i];
            componentInstance.Deserialize(componentSerialized);
        }

        // Deserialize children
        for (let i = 0; i < data.children.length; i++) {
            const newGameObject = new GameObject(Scene.mainScene);
            newGameObject.transform.parent = this.transform;
            newGameObject.Deserialize(data.children[i]);
        }
    }
}