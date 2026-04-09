import { GPU } from "@trident/core";

import { IGameObject } from "./components/IGameObject";
import { IGeometry } from "./components/IGeometry";

import { IMaterial } from "./components/IMaterial";

import { IScene } from "./IScene";

import { IColor } from "./math/IColor";
import { IVector3 } from "./math/IVector3";

import { IVector2 } from "./math/IVector2";

import { IComponent } from "./components/IComponent";
import { IPrefab } from "./components/IPrefab";
import { ITexture } from "./components/ITexture";
import { ISystem } from "./ISystem";
import { IRuntime } from "./IRuntime";

export interface IEngineAPI {
    currentScene: IScene;

    createRuntime(canvas: HTMLCanvasElement): Promise<IRuntime>;
    
    addSystem<T extends ISystem, A extends any[]>(ctor: new (...args: A) => T, ...args: A): Promise<T>;

    createScene(): IScene;
    createGameObject(scene: IScene): IGameObject;
    isGameObject(obj: IGameObject): boolean;

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

    isTexture(texture: object): boolean;

    createPlaneGeometry(): IGeometry;
    createCubeGeometry(): IGeometry;
    createSphereGeometry(): IGeometry;
    createCapsuleGeometry(): IGeometry;

    createPBRMaterial(args?): IMaterial;

    createPrefab(): IPrefab;
    createTextureFromBlob(blob: Blob, format?: GPU.TextureFormat, options?: GPU.ImageLoadOptions): Promise<ITexture>;

    deserializeGeometry(serialized): Promise<IGeometry>;
    deserializeMaterial(serialized): Promise<IMaterial>;
    deserializePrefab(args?): IPrefab;

    GetSerializedFields: (instance: object) => { name: string | symbol, type?: Function }[];

    getFieldType(value: any): "Prefab" | "GameObject" | "Component" | "Vector3" | "Vector2" | "Color" | "Geometry" | "Material" | "Texture" | "unknown";

    serializer: {
        serializeScene(scene: any): any;
        serializeGameObject(gameObject: any): any;
        serializeComponent(component: any): any;
        serializeFields(value: any): any;
    };

    deserializer: {
        deserializeScene(scene: any, data: any): Promise<void>;
        deserializeGameObject(scene: any, data: any, parent?: any): Promise<any>;
        deserializeFields(target: any, data: any): Promise<void>;
        Load(assetPath: string, data?: any): Promise<any>;
    };
}