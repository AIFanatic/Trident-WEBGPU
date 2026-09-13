import { IComponent } from "./IComponent";
import { ICamera } from "./ICamera";
import { IColor } from "../math/IColor";
import { IVector3 } from "../math/IVector3";

export interface ILight extends IComponent {
    camera: ICamera;
    color: IColor;
    intensity: number;
    range: number;
    castShadows: boolean;
}

export interface ISpotLight extends ILight {
    direction: IVector3;
    angle: number;
}

export interface IPointLight extends ILight {}

export interface IAreaLight extends ILight {}

export interface IDirectionalLight extends ILight {
    direction: IVector3;
}