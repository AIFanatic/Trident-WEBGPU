import { Input } from "./Input";
import { Renderer } from "./renderer";
import { SceneManager } from "./SceneManager";
import { System } from "./System";

export class Runtime {
    // hardcoded core — always present, fixed order
    public static Input: Input;
    public static SceneManager: SceneManager;
    public static Renderer: Renderer;

    // plugin slot
    public static systems = new Map<Function, System>();

    private static isPlaying = false;

    public static async Create(canvas: HTMLCanvasElement, aspectRatio = 1): Promise<Runtime> {
        this.Input = new Input();
        this.SceneManager = new SceneManager();
        this.Renderer = new Renderer(canvas, aspectRatio);

        await this.SceneManager.Start();
        await this.Renderer.Start();
        await this.Input.Start();

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

    public static Play(): void {
        this.isPlaying = true;
        this.Run();
    }

    public static Stop(): void { this.isPlaying = false; }

    private static Run() {
        if (!this.isPlaying) return;

        this.SceneManager.Update();
        for (const s of this.systems.values()) s.Update();
        this.Renderer.Update();
        this.Input.Update();

        requestAnimationFrame(() => this.Run());
    }
}