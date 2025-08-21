import { ComponentInterface, IGameObject } from "./components/IGameObject";
import { IGeometry } from "./components/IGeometry";

import { IMaterial } from "./components/IMaterial";

import { IScene } from "./IScene";

import { IColor } from "./math/IColor";
import { IVector3 } from "./math/IVector3";

import { IComponent } from "./components/IComponent";
import { IVector2 } from "./math/IVector2";

export interface IEngineAPI {
    currentScene: IScene;

    createRenderer(canvas: HTMLCanvasElement);
    createScene(): IScene;
    createGameObject(scene: IScene): IGameObject;
    isEngineGameObject(obj: IGameObject): boolean;

    createColor(r: number, g: number, b: number, a: number): IColor;
    isColor(color: IColor): boolean;

    createVector2(x: number, y: number, z: number): IVector2;
    isVector2(vector2: IVector2): boolean;

    createVector3(x: number, y: number, z: number): IVector3;
    isVector3(vector3: IVector3): boolean;

    createPlaneGeometry(): IGeometry;
    createCubeGeometry(): IGeometry;
    
    createPBRMaterial(args): IMaterial;
}