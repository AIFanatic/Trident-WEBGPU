import { EventSystem } from "./Events";
import { GameObject } from "./GameObject";
import { Component, ComponentEvents } from "./components/Component";
import { Renderer } from "./renderer/Renderer";
import { RenderingPipeline } from "./renderer/RenderingPipeline";

export class Scene {
    public readonly renderer: Renderer;
    public name: string = "Default scene"
    private _hasStarted = false;
    public get hasStarted(): boolean { return this._hasStarted };

    private gameObjects: GameObject[] = [];
    private toUpdate: Map<Component, boolean> = new Map();
    private componentsByType: Map<string, Component[]> = new Map();

    private renderPipeline: RenderingPipeline;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.renderPipeline = new RenderingPipeline(this.renderer);


        EventSystem.on(ComponentEvents.CallUpdate, (component, flag) => {
            if (flag) this.toUpdate.set(component, true);
            else this.toUpdate.delete(component);
        });

        EventSystem.on(ComponentEvents.AddedComponent, (component, scene) => {
            if (scene !== this) return;
            
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

    public AddGameObject(gameObject: GameObject) { this.gameObjects.push(gameObject) }
    public GetGameObjects(): GameObject[] { return this.gameObjects }
    public GetComponents<T extends Component>(type: new(...args: any[]) => T): T[] { return this.componentsByType.get(type.name) as T[] || [] }
    public RemoveGameObject(gameObject: GameObject) {
        const index = this.gameObjects.indexOf(gameObject);
        if (index !== -1) this.gameObjects.splice(index, 1);
    }
    
    public Start() {
        if (this.hasStarted) return;
        for (const gameObject of this.gameObjects) gameObject.Start();
        this._hasStarted = true;

        this.Tick();
    }

    private Tick() {
        for (const [component, _] of this.toUpdate) component.Update();

        this.renderPipeline.Render(this);

        // setTimeout(() => {
        //     this.Tick()
        // }, 100);
        requestAnimationFrame(() => this.Tick());
    }
}