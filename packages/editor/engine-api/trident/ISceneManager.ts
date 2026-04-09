import { IScene } from "./IScene";

export interface ISceneManager {
    CreateScene(name: string): IScene;
    SetActiveScene(scene: IScene): void;
    GetActiveScene(): IScene;
};