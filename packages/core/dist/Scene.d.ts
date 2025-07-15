import { GameObject } from "./GameObject";
import { Component } from "./components/Component";
import { Renderer } from "./renderer/Renderer";
import { RenderingPipeline } from "./renderer/RenderingPipeline";
export declare class Scene {
    readonly renderer: Renderer;
    name: string;
    id: string;
    private _hasStarted;
    get hasStarted(): boolean;
    private gameObjects;
    private toUpdate;
    private componentsByType;
    readonly renderPipeline: RenderingPipeline;
    constructor(renderer: Renderer);
    AddGameObject(gameObject: GameObject): void;
    GetGameObjects(): GameObject[];
    GetComponents<T extends Component>(type: new (...args: any[]) => T): T[];
    RemoveGameObject(gameObject: GameObject): void;
    Start(): void;
    private Tick;
}
//# sourceMappingURL=Scene.d.ts.map