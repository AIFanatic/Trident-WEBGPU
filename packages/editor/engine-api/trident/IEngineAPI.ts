import { IGameObject } from "./components/IGameObject";
import { IGeometry } from "./components/IGeometry";

import { IMaterial } from "./components/IMaterial";

import { IScene } from "./IScene";

import { IColor } from "./math/IColor";
import { IVector3 } from "./math/IVector3";

import { IVector2 } from "./math/IVector2";

import { IComponent } from "./components/IComponent";
import { IPrefab } from "./components/IPrefab";

export interface IEngineAPI {
    currentScene?: IScene;

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

    isComponent(component: IComponent): boolean;
    isPrefab(prefab: object): boolean;
    isGeometry(geometry: object): boolean;
    isMaterial(material: object): boolean;

    createPlaneGeometry(): IGeometry;
    createCubeGeometry(): IGeometry;
    createSphereGeometry(): IGeometry;
    createCapsuleGeometry(): IGeometry;
    
    createPBRMaterial(args?): IMaterial;

    createPrefab(): IPrefab;

    deserializeGeometry(serialized): IGeometry;
    deserializeMaterial(serialized): IMaterial;
    deserializePrefab(args?): IPrefab;

    GetSerializedFields: (instance: object) => string[];
}