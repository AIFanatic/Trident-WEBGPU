import { IGameObject } from "./components/IGameObject";
import { IPrefab } from "./components/IPrefab";

export interface IScene {
    name: string;
    GetGameObjects(): IGameObject[];
    Clear(): void;
    Deserialize(data: any): any;
    Serialize(): any;
    Instantiate(prefab: IPrefab): any;
};