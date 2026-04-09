import { ISceneManager } from "./ISceneManager";
import { ISystem } from "./ISystem";

export interface IRuntime {
    SceneManager: ISceneManager;
    Play(): void;
    AddSystem<T extends ISystem, A extends any[]>(ctor: new (...args: A) => T, ...args: A): Promise<T>;
}