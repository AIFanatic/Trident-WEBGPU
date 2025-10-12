import { IGameObject } from "./IGameObject";
import { ITransform } from "./ITransform";

export interface IComponent {
    id: string;
    enabled: boolean;
    hasStarted: boolean;
    name: string;

    readonly gameObject: IGameObject;
    readonly transform: ITransform;

    Start();
    Update();
    Destroy();
}