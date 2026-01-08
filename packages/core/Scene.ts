import { EventSystem } from "./Events";
import { GameObject, Prefab } from "./GameObject";
import { Input, KeyCodes } from "./Input";
import { Camera } from "./components";
import { Component, ComponentEvents, SerializedComponent } from "./components/Component";
import { Quaternion, Vector3 } from "./math";
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

    public static mainScene: Scene;
    private previousTime: number = 0;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.renderPipeline = new RenderingPipeline(this.renderer);

        if (!Scene.mainScene) Scene.mainScene = this;

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

        Renderer.info.frame = 0;
        this.previousTime = performance.now();

        // TODO: This handles deno and web, probably better to abstract distinction away
        const webMainLoop = () => {
            this.Tick();

            // setTimeout(() => {
            //     webMainLoop()
            // }, 1000);
            requestAnimationFrame(() => webMainLoop());
        }

        const denoMainLoop = () => {
            globalThis.mainloop(async () => {
                await this.Tick();
                Renderer.canvas.surface.present();
            }, false)
        }

        if (globalThis.mainloop) denoMainLoop();
        else webMainLoop();
    }

    private async Tick() {
        Renderer.info.frame++;
        const currentTime = performance.now();
        Renderer.info.deltaTime = currentTime - this.previousTime;
        this.previousTime = currentTime;

        for (const [component, _] of this.toUpdate) {
            if (component.gameObject.enabled === false) continue;
            if (!component.hasStarted) {
                component.Start();
                component.hasStarted = true;
            }
            component.Update();
        }

        await this.renderPipeline.Render(this);

        Input.Update();
    }

    public Serialize(): { name: string, mainCamera: string, gameObjects: { components: SerializedComponent[], transform: Object }[] } {
        let serializedScene = { name: this.name, mainCamera: Camera.mainCamera.id, gameObjects: [] };
        for (const gameObject of this.gameObjects) {
            serializedScene.gameObjects.push(gameObject.Serialize());
        }
        return serializedScene;
    }

    public Deserialize(data: { name: string, mainCamera: string, gameObjects: { name: string, components: SerializedComponent[], transform: Object }[] }) {
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

    // private static serializedCache: Map<string, {name: string, components: SerializedComponent[], transform: Object }> = new Map();
    // public static Instantiate(gameObject: GameObject, position?: Vector3, rotation?: Quaternion): GameObject {
    //     let serializedGameObject = Scene.serializedCache.get(gameObject.id);
    //     if (!serializedGameObject) {
    //         serializedGameObject = gameObject.Serialize({base64Textures: false});
    //         Scene.serializedCache.set(gameObject.id, serializedGameObject);
    //     }
    //     const newGameObject = new GameObject(Scene.mainScene);
    //     newGameObject.Deserialize(serializedGameObject);
    //     if (position) newGameObject.transform.position.copy(position);
    //     if (rotation) newGameObject.transform.rotation.copy(rotation);

    //     return newGameObject;
    // }

    public static Instantiate(prefab: Prefab, position?: Vector3, rotation?: Quaternion): GameObject {
        const newGameObject = new GameObject(Scene.mainScene);
        newGameObject.Deserialize(prefab);
        if (position) newGameObject.transform.position.copy(position);
        if (rotation) newGameObject.transform.rotation.copy(rotation);

        return newGameObject;
    }

    public Instantiate(prefab: Prefab, position?: Vector3, rotation?: Quaternion): GameObject {
        return Scene.Instantiate(prefab, position, rotation);
    }
}