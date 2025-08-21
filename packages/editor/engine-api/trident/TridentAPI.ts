import { GameObject, Renderer, Scene, Mathf, Geometry, PBRMaterial } from "@trident/core";

import { IEngineAPI } from "./IEngineAPI";
import { IGameObject } from "./components/IGameObject";
import { IScene } from "./IScene";
import { IVector3 } from "./math/IVector3";
import { IGeometry } from "./components/IGeometry";
import { IMaterial } from "./components/IMaterial";
import { IColor } from "./math/IColor";
import { IVector2 } from "./math/IVector2";

export class TridentAPI implements IEngineAPI {

    public currentScene: IScene;

    private gameObjectRefs = new WeakSet<GameObject>();
    private vector2Refs = new WeakSet<IVector2>();
    private vector3Refs = new WeakSet<IVector3>();
    private colorRefs = new WeakSet<IColor>();

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
        this.vector3Refs.add(vec3);
        return vec3;
    }

    public isVector3(vector3: IVector3): boolean {
        return this.vector3Refs.has(vector3);
    }

    public createVector2(x: number, y: number, z: number): IVector2 {
        const vec2 = new Mathf.Vector2(x, y);
        this.vector2Refs.add(vec2);
        return vec2;
    }

    public isVector2(vector2: IVector2): boolean {
        return this.vector2Refs.has(vector2);
    }

    public createColor(r: number, g: number, b: number, a: number): IColor {
        const color = new Mathf.Color(r, g, b, a);;
        this.colorRefs.add(color);
        return color;
    }

    public isColor(color: IColor): boolean {
        return this.colorRefs.has(color);
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
}