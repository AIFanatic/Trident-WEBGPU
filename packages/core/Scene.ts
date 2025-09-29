import { EventSystem } from "./Events";
import { GameObject } from "./GameObject";
import { Camera } from "./components";
import { Component, ComponentEvents, SerializedComponent } from "./components/Component";
import { Renderer } from "./renderer/Renderer";
import { RenderingPipeline } from "./renderer/RenderingPipeline";
import { UUID } from "./utils";

function getCtorChain(ctor: Function): Function[] {
    const chain: Function[] = [];
    for (let c: any = ctor; c && c !== Component; c = Object.getPrototypeOf(c)) {
        chain.push(c);
    }
    return chain;
}


export class Scene {
    public static Events = {
        OnStarted: (scene: Scene) => { }
    }
    public readonly renderer: Renderer;
    public name: string = "Default scene"
    public id = UUID();
    private _hasStarted = false;
    public get hasStarted(): boolean { return this._hasStarted };

    private gameObjects: GameObject[] = [];
    private toUpdate: Map<Component, boolean> = new Map();
    private componentsByType: Map<Function, Component[]> = new Map();

    public readonly renderPipeline: RenderingPipeline;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.renderPipeline = new RenderingPipeline(this.renderer);


        EventSystem.on(ComponentEvents.CallUpdate, (component, flag) => {
            if (flag) this.toUpdate.set(component, true);
            else this.toUpdate.delete(component);
        });

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


    public Start() {
        if (this.hasStarted) return;
        for (const gameObject of this.gameObjects) gameObject.Start();
        this._hasStarted = true;
        EventSystem.emit(Scene.Events.OnStarted, this);

        this.Tick();
    }

    private Tick() {
        for (const [component, _] of this.toUpdate) {
            if (component.gameObject.enabled === false) continue;
            if (!component.hasStarted) {
                component.Start();
                component.hasStarted = true;
            }
            component.Update();
        }

        for (const [component, _] of this.toUpdate) {
            if (component.gameObject.enabled === false) continue;
            component.LateUpdate();
        }

        this.renderPipeline.Render(this);

        // setTimeout(() => {
        //     this.Tick()
        // }, 100);
        requestAnimationFrame(() => this.Tick());
    }

    public Serialize(): { name: string, mainCamera: string, gameObjects: { components: SerializedComponent[], transform: Object }[] } {
        let serializedScene = { name: this.name, mainCamera: Camera.mainCamera.id, gameObjects: [] };
        for (const gameObject of this.gameObjects) {
            serializedScene.gameObjects.push(gameObject.Serialize());
        }
        return serializedScene;
    }

    public Deserialize(data: { name: string, mainCamera: string, gameObjects: { components: SerializedComponent[], transform: Object }[] }) {
        for (const serializedGameObject of data.gameObjects) {
            const gameObject = new GameObject(this);
            gameObject.Deserialize(serializedGameObject);
        }

        for (const gameObject of this.gameObjects) {
            for (const component of gameObject.GetComponents(Camera)) {
                if (component.id === data.mainCamera) {
                    Camera.mainCamera = component;
                }
            }
        }
    }
}