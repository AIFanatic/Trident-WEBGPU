import { EventSystem } from "./Events";
import { GameObject } from "./GameObject";
import { Prefab } from "./Prefab";
import { Component, ComponentEvents } from "./components/Component";
import { Deserializer } from "./serializer/Deserializer";
import { Transform } from "./components/Transform";
import { UUID } from "./utils";

export enum SceneExecutionMode { Play, Edit }

function getCtorChain(ctor: Function): Function[] {
    const chain: Function[] = [];
    for (let c: any = ctor; c && c !== Component; c = Object.getPrototypeOf(c)) {
        chain.push(c);
    }
    return chain;
}


export class Scene {
    public static type = "@trident/core/Scene";
    public id = UUID();
    public name: string;

    private gameObjects: GameObject[] = [];
    private componentsByType: Map<Function, Component[]> = new Map();

    public mode: SceneExecutionMode = SceneExecutionMode.Play;   // default = Play

    constructor(name: string = "DefaultScene") {
        this.name = name;

        EventSystem.on(ComponentEvents.AddedComponent, (component: Component, scene: Scene) => {
            if (scene !== this) return;
            for (const ctor of getCtorChain((component as any).constructor)) {
                let arr = this.componentsByType.get(ctor);
                if (!arr) this.componentsByType.set(ctor, arr = []);
                if (!arr.includes(component)) arr.push(component); // no dupes
            }
        });

        EventSystem.on(ComponentEvents.RemovedComponent, (component: Component, scene: Scene) => {
            if (scene !== this) return;
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

    public FindGameObject(path: string): GameObject | null {
        const segments = path.split("/").filter(s => s.length > 0);
        if (segments.length === 0) return null;

        const match = (gameObject: GameObject, depth: number): GameObject | null => {
            if (gameObject.name !== segments[depth]) return null;
            if (depth === segments.length - 1) return gameObject;

            for (const child of gameObject.transform.children) {
                const hit = match(child.gameObject, depth + 1);
                if (hit) return hit;
            }
            return null;
        };

        // a bare name matches anywhere; a path is resolved from the roots (as Unity does)
        if (segments.length === 1 && !path.startsWith("/")) {
            return this.gameObjects.find(go => go.name === segments[0]) ?? null;
        }

        for (const root of this.GetRootGameObjects()) {
            const hit = match(root, 0);
            if (hit) return hit;
        }
        return null;
    }

    public Update() {
        const edit = this.mode === SceneExecutionMode.Edit;
        for (const go of this.gameObjects) {
            if (!go.enabled) continue;
            for (const c of go.GetComponents()) {
                if (!c.enabled) continue;
                if (c.isDeserializing) continue;
                if (edit && !(c as Component).runInEditMode) continue;

                if (!c.hasStarted) {
                    c.hasStarted = true;
                    try { c.Start(); }
                    catch (err) { console.error(`[${c.constructor.name}.Start]`, err); c.enabled = false; }
                }

                if (!c.shouldUpdate) continue;
                try { c.Update(); }
                catch (err) { console.error(`[${c.constructor.name}.Update]`, err); c.enabled = false; }
            }
        }
    }

    public async Instantiate(prefab: Prefab, parent?: Transform): Promise<GameObject> {
        const source = Deserializer.remapTemplateIds(prefab.data);
        return await Deserializer.deserializeGameObject(this, source, parent);
    }

    public Clear(): void {
        const roots = this.GetRootGameObjects();
        for (const gameObject of roots) gameObject.Destroy()
        this.componentsByType.clear();
        this.gameObjects = [];
    }
}
