import { Components } from "@trident/core";
import { ITransform } from "./ITransform";
import { ICamera } from "./ICamera";
import { IComponents } from "./index";
import { ISpotLight } from "./ILight";
import { IMesh } from "./IMesh";
import { IComponent } from "./IComponent";

export type ComponentInterface<T> =
    T extends typeof Components.Camera ? ICamera :
    T extends typeof Components.SpotLight ? ISpotLight :
    T extends typeof Components.Mesh ? IMesh :
    InstanceType<T>;  // fallback


export type ComponentCtor = typeof IComponents[keyof typeof IComponents];

export interface IGameObject {
    transform: ITransform;
    name: string;

    AddComponent<T extends ComponentCtor>(ctor: T): InstanceType<T>;
    AddComponent<T extends ComponentCtor>(ctor: T): ComponentInterface<T>;

    GetComponents<T extends IComponent>(type?: new(...args: any[]) => T): T[];
};