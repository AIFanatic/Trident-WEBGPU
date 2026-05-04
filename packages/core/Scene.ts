import { EventSystem } from "./Events";
import { GameObject } from "./GameObject";
import { Prefab } from "./Prefab";
import { Component, ComponentEvents } from "./components/Component";
import { Deserializer } from "./serializer/Deserializer";
import { Transform } from "./components/Transform";
import { UUID } from "./utils";

function getCtorChain(ctor: Function): Function[] {
    const chain: Function[] = [];
    for (let c: any = ctor; c && c !== Component; c = Object.getPrototypeOf(c)) {
        chain.push(c);
    }
    return chain;
}


export class Scene {
    public static type = "@trident/core/Scene";
    public static Events = {
        OnStarted: (scene: Scene) => { }
    }
    public id = UUID();
    public name: string;
    private _hasStarted = false;
    public get hasStarted(): boolean { return this._hasStarted };

    private gameObjects: GameObject[] = [];
    private toStart: Set<Component> = new Set();
    private toUpdate: Map<Component, boolean> = new Map();
    private componentsByType: Map<Function, Component[]> = new Map();

    constructor(name: string = "DefaultScene") {
        this.name = name;

        EventSystem.on(ComponentEvents.CallUpdate, (component, flag) => {
            if (flag) this.toUpdate.set(component, true);
            else this.toUpdate.delete(component);
        });

        EventSystem.on(ComponentEvents.AddedComponent, (component: Component, scene: Scene) => {
            if (scene !== this) return;
            this.toStart.add(component);
            for (const ctor of getCtorChain((component as any).constructor)) {
                let arr = this.componentsByType.get(ctor);
                if (!arr) this.componentsByType.set(ctor, arr = []);
                if (!arr.includes(component)) arr.push(component); // no dupes
            }
        });

        EventSystem.on(ComponentEvents.RemovedComponent, (component: Component, scene: Scene) => {
            if (scene !== this) return;
            this.toStart.delete(component);
            for (const ctor of getCtorChain((component as any).constructor)) {
                const arr = this.componentsByType.get(ctor);
                if (arr) {
                    const i = arr.indexOf(component);
                    if (i >= 0) arr.splice(i, 1);
                }
            }
        });
    }

    public AddGameObject(gameObject: GameObject) { this.gameObjects.push(gameObject) }
    public GetGameObjects(): GameObject[] { return this.gameObjects }
    public GetComponents<T extends Component>(Ctor: new (...a: any[]) => T): T[] { return (this.componentsByType.get(Ctor) as T[] | undefined) ?? [] }
    public GetRootGameObjects(): GameObject[] { return this.gameObjects.filter(go => !go.transform.parent); }
    public RemoveGameObject(gameObject: GameObject) {
        const i = this.gameObjects.indexOf(gameObject);
        if (i !== -1) this.gameObjects.splice(i, 1);

        for (const component of gameObject.GetComponents()) {
            for (const ctor of getCtorChain((component as any).constructor)) {
                const arr = this.componentsByType.get(ctor);
                if (!arr) continue;

                const j = arr.indexOf(component);
                if (j !== -1) arr.splice(j, 1);
                if (arr.length === 0) this.componentsByType.delete(ctor);
            }
        }
    }

    public Update() {
        for (const component of this.toStart) {
            if (component.gameObject.enabled === false) continue;
            component.Start();
            component.hasStarted = true;
        }
        this.toStart.clear();

        for (const [component, _] of this.toUpdate) {
            if (component.gameObject.enabled === false) continue;
            component.Update();
        }
    }

    public async Instantiate(prefab: Prefab, parent?: Transform): Promise<GameObject> {
        const data = prefab.data ?? prefab;
        const go = await Deserializer.deserializeGameObject(data, parent);
        if (this.hasStarted) go.Start();
        return go;
    }

    public Clear(): void {
        const persistent = new Set<GameObject>();

        const roots = this.GetRootGameObjects();
        for (const gameObject of roots) {
            if (gameObject.dontDestroyOnLoad === true) {
                persistent.add(gameObject);
                continue;
            }
            gameObject.Destroy();
        }

        // Rebuild lists keeping only persistent objects
        for (const [component] of this.toUpdate) {
            if (!persistent.has(component.gameObject)) this.toUpdate.delete(component);
        }
        for (const [ctor, arr] of this.componentsByType) {
            const kept = arr.filter(c => persistent.has(c.gameObject));
            if (kept.length > 0) this.componentsByType.set(ctor, kept);
            else this.componentsByType.delete(ctor);
        }
        this.gameObjects = this.gameObjects.filter(go => persistent.has(go));
    }
}
