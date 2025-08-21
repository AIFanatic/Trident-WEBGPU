import { IGameObject } from "./components/IGameObject";

export interface IScene {
    gameObjects: IGameObject[];
    Start();
};