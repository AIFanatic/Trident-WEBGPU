import { Component } from "./components/Component";
import { Scene } from "./Scene";
import { Transform } from "./components/Transform";
import { UUID } from "./utils";
import { Assets, Prefab } from "./Assets";


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

    public _enabled: boolean = true;

    public get enabled(): boolean { return this._enabled };
    public set enabled(enabled: boolean) {
        this._enabled = enabled;
        for (const child of this.transform.children) child.gameObject.enabled = enabled;
    };

    public assetPath?: string;

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

    public RemoveComponent<T extends Component>(component: T): void {
        const idx = this.allComponents.indexOf(component);
        if (idx === -1) return;

        // Remove from allComponents
        this.allComponents.splice(idx, 1);

        // Remove from componentsByCtor map
        for (const ctor of getCtorChain(component.constructor)) {
            const arr = this.componentsByCtor.get(ctor);
            if (!arr) continue;
            const i = arr.indexOf(component);
            if (i !== -1) arr.splice(i, 1);
            if (arr.length === 0) this.componentsByCtor.delete(ctor);
        }

        component.Destroy();
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
        const prefab = new Prefab();
        prefab.name = this.name;
        prefab.transform = this.transform.Serialize();

        if (this.assetPath) {
            prefab.assetPath = this.assetPath;
            // Only store transform + reference, skip components/children
            return prefab;
        }

        // Non-prefab: full inline serialization (existing behavior)
        prefab.components = this.allComponents.map(c => c.Serialize(metadata));
        for (const child of this.transform.children) {
            prefab.children.push(child.gameObject.Serialize(metadata));
        }
        return prefab;
    }

    private DeserializeAsset(data: Prefab) {
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

    public Deserialize(data: Prefab) {
        if (data.assetPath && data.components.length === 0) {
            // Prefab reference — load from asset, apply transform override
            this.assetPath = data.assetPath;
            const instance = Assets.GetInstance(data.assetPath) as Prefab;
            
            if (instance) {
                this.name = data.name;
                // Deserialize from source prefab but use our transform
                this.Deserialize(instance);
                this.assetPath = data.assetPath;
                this.transform.Deserialize(data.transform);
                return;
            }

            Assets.SetInstance(data.assetPath, this);
            Assets.Load(data.assetPath, "json").then(json => {
                const prefab = Prefab.Deserialize(json);
                this.DeserializeAsset(prefab);
            });
            return;
        }

        this.DeserializeAsset(data);
    }
}