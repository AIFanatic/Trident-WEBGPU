import { EventSystem } from "./Events";
import { ComponentEvents } from "./components/Component";
import { RenderingPipeline } from "./renderer/RenderingPipeline";
import { Utils } from "./utils/Utils";
export class Scene {
    renderer;
    name = "Default scene";
    id = Utils.UUID();
    _hasStarted = false;
    get hasStarted() { return this._hasStarted; }
    ;
    gameObjects = [];
    toUpdate = new Map();
    componentsByType = new Map();
    renderPipeline;
    constructor(renderer) {
        this.renderer = renderer;
        this.renderPipeline = new RenderingPipeline(this.renderer);
        EventSystem.on(ComponentEvents.CallUpdate, (component, flag) => {
            if (flag)
                this.toUpdate.set(component, true);
            else
                this.toUpdate.delete(component);
        });
        EventSystem.on(ComponentEvents.AddedComponent, (component, scene) => {
            if (scene !== this)
                return;
            let componentsArray = this.componentsByType.get(component.name) || [];
            componentsArray.push(component);
            this.componentsByType.set(component.name, componentsArray);
            // let i =0;
            // while (component) {
            //     if (!this.componentsByType.has(component.name)) this.componentsByType.set(component.name, []);
            //     this.componentsByType.get(component.name)?.push(component);
            //     console.log(component.name, Component.name)
            //     component = Object.getPrototypeOf(component.constructor);
            //     console.log(component.name, Component.name)
            //     console.log("proto", component)
            //     if (component.name === Component.name) break;
            //     if (component.name === "") break;
            //     if (i === 100) {
            //         alert("HEREEE")
            //         break;
            //     }
            //     i++;
            // }
        });
        EventSystem.on(ComponentEvents.RemovedComponent, (component, scene) => {
            let componentsArray = this.componentsByType.get(component.name);
            if (componentsArray) {
                const index = componentsArray.indexOf(component);
                if (index !== -1) {
                    componentsArray.splice(index, 1);
                    this.componentsByType.set(component.name, componentsArray);
                }
            }
        });
    }
    AddGameObject(gameObject) { this.gameObjects.push(gameObject); }
    GetGameObjects() { return this.gameObjects; }
    GetComponents(type) { return this.componentsByType.get(type.name) || []; }
    RemoveGameObject(gameObject) {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1)
            this.gameObjects.splice(index, 1);
    }
    Start() {
        if (this.hasStarted)
            return;
        for (const gameObject of this.gameObjects)
            gameObject.Start();
        this._hasStarted = true;
        this.Tick();
    }
    Tick() {
        const componentUpdateStart = performance.now();
        for (const [component, _] of this.toUpdate)
            component.Update();
        // EngineDebug.componentUpdate.SetValue(performance.now() - componentUpdateStart);
        this.renderPipeline.Render(this);
        // setTimeout(() => {
        //     this.Tick()
        // }, 100);
        requestAnimationFrame(() => this.Tick());
    }
}
