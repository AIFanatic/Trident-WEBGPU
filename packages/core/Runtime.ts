import { AudioManager } from "./AudioManager";
import { Input } from "./Input";
import { Renderer } from "./renderer";
import { SceneExecutionMode } from "./Scene";
import { SceneManager } from "./SceneManager";
import { System } from "./System";

export class Runtime {
    protected static _Input: Input;
    protected static _SceneManager: SceneManager;
    protected static _Renderer: Renderer;
    protected static _AudioManager: AudioManager;
    protected static _systems = new Map<Function, System>();

    public static get Input() { return Runtime._Input; }
    public static get SceneManager() { return Runtime._SceneManager; }
    public static get Renderer() { return Runtime._Renderer; }
    public static get AudioManager() { return Runtime._AudioManager; }
    public static get systems() { return Runtime._systems; }

    protected static async Create(canvas: HTMLCanvasElement): Promise<Runtime> {
        Runtime._Input = new Input();
        Runtime._SceneManager = new SceneManager();
        Runtime._Renderer = new Renderer(canvas);
        Runtime._AudioManager = new AudioManager();

        await Runtime._SceneManager.Start();
        await Runtime._Renderer.Start();
        await Runtime._Input.Start();
        await Runtime._AudioManager.Start();

        return this;
    }

    public static async AddSystem<T extends System, A extends any[]>(ctor: new (...args: A) => T, ...args: A): Promise<T> {
        const system = new ctor(...args);
        await system.Start();
        this.systems.set(ctor, system);
        return system;
    }

    public static GetSystem<T>(ctor: new (...args: any[]) => T): T {
        return this.systems.get(ctor) as T;
    }

    public static Tick(): void {
        this.SceneManager.Update();
        for (const s of this.systems.values()) {
            // TODO: Should not have any edit mode here, this is runtime, no editor related stuff
            if (this.SceneManager.GetActiveScene()?.mode === SceneExecutionMode.Edit && !s.runInEditMode) continue;
            s.Update();
        }
        this.Input.Update();
    }

    public static Render(): void {
        this.Renderer.Update();
    }
}

export class PlayerRuntime extends Runtime {
    public static async Create(canvas: HTMLCanvasElement): Promise<Runtime> {
        await Runtime.Create(canvas);

        const loop = () => {
            this.Tick();
            this.Render();
            requestAnimationFrame(loop);
        };
        loop();

        return this;
    }
}