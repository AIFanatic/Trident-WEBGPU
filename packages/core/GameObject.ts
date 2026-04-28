import { Component, ComponentEvents } from "./components/Component";
import { Scene } from "./Scene";
import { Transform } from "./components/Transform";
import { UUID } from "./utils";
import { EventSystem } from "./Events";
import { Flags } from "./utils/Flags";
import { Runtime } from "./Runtime";


function getCtorChain(ctor: Function): Function[] {
    const chain: Function[] = [];
    for (let c: any = ctor; c && c !== Component; c = Object.getPrototypeOf(c)) {
        chain.push(c);
    }
    return chain;
}

export class GameObject {
    public flags: Flags = Flags.None;
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

    public dontDestroyOnLoad = false;

    constructor() {
        this.scene = Runtime.SceneManager.GetActiveScene();
        this.transform = new Transform(this);
        this.scene.AddGameObject(this);

        EventSystem.on(ComponentEvents.RemovedComponent, (component: Component, scene: Scene) => {
            if (scene !== this.scene) return;
            this.RemoveComponent(component);
        });
    }

    public AddComponent<T extends Component>(Ctor: new (go: GameObject, ...args: any[]) => T, ...args: any[]): T {
        const componentInstance = new Ctor(this, ...args);
        if (!(componentInstance instanceof Component)) throw new Error(`Invalid component ${Ctor.name}`);
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
        // snapshot arrays with spread
        for (const child of [...this.transform.children]) {
            child.gameObject.Destroy();
        }
        for (const component of [...this.allComponents]) {
            component.Destroy();
        }
        this.allComponents.length = 0;
        this.componentsByCtor.clear();
        this.scene.RemoveGameObject(this);
    }
}
