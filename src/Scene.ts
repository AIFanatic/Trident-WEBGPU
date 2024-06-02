import { EventSystem } from "./Events";
import { GameObject } from "./GameObject";
import { Component } from "./components/Component";
import { Renderer } from "./renderer/Renderer";
import { RenderingPipeline } from "./renderer/RenderingPipeline";

export class Scene {
    public readonly renderer: Renderer;
    public name: string = "Default scene"
    private _hasStarted = false;
    public get hasStarted(): boolean { return this._hasStarted };

    private gameObjects: GameObject[] = [];
    private toUpdate: Map<Component, boolean> = new Map();

    private renderPipeline: RenderingPipeline;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.renderPipeline = new RenderingPipeline(this.renderer);


        EventSystem.on("CallUpdate", (component, flag) => {
            if (flag) this.toUpdate.set(component, true);
            else this.toUpdate.delete(component);
        });

    }

    public AddGameObject(gameObject: GameObject) { this.gameObjects.push(gameObject) }
    public GetGameObjects(): GameObject[] { return this.gameObjects }
    
    public Start() {
        if (this.hasStarted) return;
        for (const gameObject of this.gameObjects) gameObject.Start();
        this._hasStarted = true;

        this.Tick();
    }

    private Tick() {
        for (const [component, _] of this.toUpdate) component.Update();

        this.renderPipeline.Render();

        // setTimeout(() => {
        //     this.Tick()
        // }, 1000);
        requestAnimationFrame(() => this.Tick());
    }
}