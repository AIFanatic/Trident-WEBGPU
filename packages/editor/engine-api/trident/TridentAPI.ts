import { GameObject, Renderer, Scene, Mathf, Geometry, PBRMaterial, Utils, Component, Prefab } from "@trident/core";

import { IEngineAPI } from "./IEngineAPI";
import { IGameObject } from "./components/IGameObject";
import { IScene } from "./IScene";
import { IVector3 } from "./math/IVector3";
import { IGeometry } from "./components/IGeometry";
import { IMaterial } from "./components/IMaterial";
import { IColor } from "./math/IColor";
import { IVector2 } from "./math/IVector2";
import { IComponent } from "./components/IComponent";
import { IPrefab } from "./components/IPrefab";

export class TridentAPI implements IEngineAPI {

    public currentScene: IScene;

    private gameObjectRefs = new WeakSet<GameObject>();

    public createRenderer(canvas: HTMLCanvasElement) {
        Renderer.Create(canvas, "webgpu");
    }

    public createScene(): IScene {
        this.currentScene = new Scene(Renderer);
        return this.currentScene;
    }

    public createGameObject(scene: IScene): IGameObject {
        const gameObject = new GameObject(scene as Scene);
        this.gameObjectRefs.add(gameObject);
        return gameObject;
    }

    public isEngineGameObject(obj: IGameObject): boolean {
        return this.gameObjectRefs.has(obj as any);
    }

    public createVector3(x: number, y: number, z: number): IVector3 {
        const vec3 = new Mathf.Vector3(x, y, z);
        return vec3;
    }

    public isVector3(vector3: IVector3): boolean {
        return vector3.constructor === Mathf.Vector3;
    }

    public createVector2(x: number, y: number, z: number): IVector2 {
        const vec2 = new Mathf.Vector2(x, y);
        return vec2;
    }

    public isVector2(vector2: IVector2): boolean {
        return vector2.constructor === Mathf.Vector2;
    }

    public createColor(r: number, g: number, b: number, a: number): IColor {
        const color = new Mathf.Color(r, g, b, a);;
        return color;
    }

    public isColor(color: IColor): boolean {
        return color.constructor === Mathf.Color;
    }

    public isComponent(component: IComponent): boolean {
        return component.constructor === Component;
    }

    public isPrefab(prefab: IPrefab): boolean {
        return prefab.constructor === Prefab;
    }

    public createPlaneGeometry(): IGeometry {
        return Geometry.Plane();
    }

    public createCubeGeometry(): IGeometry {
        return Geometry.Cube();
    }

    public createPBRMaterial(args): IMaterial {
        return new PBRMaterial(args);
    }

    public GetSerializedFields = Utils.GetSerializedFields;
}