import { IGameObject } from "./components/IGameObject";
import { IPrefab } from "./components/IPrefab";

export interface IScene {
    gameObjects: IGameObject[];
    Start();
    Clear();
    Deserialize(data: any);
    Serialize();
    Instantiate(prefab: IPrefab);
};