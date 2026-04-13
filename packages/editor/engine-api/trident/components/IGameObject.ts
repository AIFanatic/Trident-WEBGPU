import { IComponent, IComponentConstructor, IComponentInstance } from "./IComponent";
import { ITransform } from "./ITransform";

export interface IGameObject {
    id: string;
    transform: ITransform;
    name: string;
    enabled: boolean;

    AddComponent<T extends IComponentConstructor>(ctor: T): IComponentInstance<T>;

    GetComponents<T extends IComponent>(type?: new (...args: any[]) => T): T[];
    Destroy(): void;
}