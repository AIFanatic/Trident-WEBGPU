import { IGameObject } from "./IGameObject";
import { ITransform } from "./ITransform";

export interface IComponent {
    id: string;
    enabled: boolean;
    hasStarted: boolean;
    name: string;

    readonly gameObject: IGameObject;
    readonly transform: ITransform;

    Start(): void;
    Update(): void;
    Destroy(): void;
}

export interface IComponentConstructor<T extends IComponent = IComponent> {
    new(...args: any[]): T;
    type?: string;
}

export type IComponentInstance<T extends IComponentConstructor> = T extends IComponentConstructor<infer I> ? I : never;