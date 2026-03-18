import { GameObject, Renderer, Scene, Mathf, Geometry, PBRMaterial, Utils, Component, GPU } from "@trident/core";

import { IEngineAPI } from "./IEngineAPI";
import { IGameObject } from "./components/IGameObject";
import { IScene } from "./IScene";
import { IVector3 } from "./math/IVector3";
import { IGeometry } from "./components/IGeometry";
import { IMaterial } from "./components/IMaterial";
import { IColor } from "./math/IColor";
import { IVector2 } from "./math/IVector2";
import { IPrefab } from "./components/IPrefab";
import { ITexture } from "./components/ITexture";
import { Serializer, Deserializer } from "@trident/core";
import { Prefab } from "../../serialization/Prefab";
import "../../serialization/EditorLoad";

export class TridentAPI implements IEngineAPI {

    public currentScene: IScene;
    public serializer = Serializer;
    public deserializer = Deserializer;

    public createRenderer(canvas: HTMLCanvasElement) {
        Renderer.Create(canvas, "webgpu");
    }

    public createScene(): IScene {
        this.currentScene = new Scene(Renderer);
        return this.currentScene;
    }

    public createGameObject(scene: IScene): IGameObject {
        const gameObject = new GameObject(scene as Scene);
        return gameObject;
    }

    public createVector3(x: number, y: number, z: number): IVector3 {
        const vec3 = new Mathf.Vector3(x, y, z);
        return vec3;
    }

    public createVector2(x: number, y: number, z: number): IVector2 {
        const vec2 = new Mathf.Vector2(x, y);
        return vec2;
    }

    public createColor(r: number, g: number, b: number, a: number): IColor {
        const color = new Mathf.Color(r, g, b, a);;
        return color;
    }

    public createPlaneGeometry(): IGeometry {
        return Geometry.Plane();
    }

    public createCubeGeometry(): IGeometry {
        return Geometry.Cube();
    }

    public createSphereGeometry(): IGeometry {
        return Geometry.Sphere();
    }

    public createCapsuleGeometry(): IGeometry {
        return Geometry.Capsule();
    }

    public createPBRMaterial(args): IMaterial {
        return new PBRMaterial(args);
    }

    public createPrefab(): IPrefab {
        return new Prefab();
    }

    public async deserializeGeometry(serialized): Promise<IGeometry> {
        return Deserializer.Load(serialized.assetPath);
    }

    public async deserializeMaterial(serialized): Promise<IMaterial> {
        return Deserializer.Load(serialized.assetPath);
    }

    public deserializePrefab(serialized): IPrefab {
        return Prefab.Deserialize(serialized);
    }

    public async createTextureFromBlob(blob: Blob, format?: GPU.TextureFormat, options?: GPU.ImageLoadOptions): Promise<ITexture> {
        return GPU.Texture.LoadBlob(blob);
    }

    private compareType(value: any, type: Function) {
        if (typeof value === "function") return value === type;
        if (value instanceof type) return true;
        return value?.constructor?.type === (type as any).type;
    }

    public getFieldType(value: any): "Prefab" | "GameObject" | "Component" | "Vector3" | "Vector2" | "Color" | "Geometry" | "Material" | "Texture" | "unknown" {
        if (this.compareType(value, Prefab)) return "Prefab";
        else if (this.compareType(value, GameObject)) return "GameObject";
        else if (this.compareType(value, Component)) return "Component";
        else if (this.compareType(value, Mathf.Vector3)) return "Vector3";
        else if (this.compareType(value, Mathf.Vector2)) return "Vector2";
        else if (this.compareType(value, Mathf.Color)) return "Color";
        else if (this.compareType(value, Geometry)) return "Geometry";
        else if (this.compareType(value, GPU.Material)) return "Material";
        else if (this.compareType(value, GPU.Texture)) return "Texture";
        return "unknown";
    }

    public isGameObject(value: any): boolean {
        if (typeof value === "function") return value === GameObject;
        return value instanceof GameObject;
    }

    public isVector3(value: IVector3): boolean {
        if (typeof value === "function") return value === Mathf.Vector3;
        return value instanceof Mathf.Vector3;
    }

    public isVector2(value: any): boolean {
        if (typeof value === "function") return value === Mathf.Vector2;
        return value instanceof Mathf.Vector2;
    }

    public isColor(value: any): boolean {
        if (typeof value === "function") return value === Mathf.Color;
        return value instanceof Mathf.Color;
    }

    public isComponent(value: any): boolean {
        if (typeof value === "function") return value === Component;
        return value instanceof Component;
    }

    public isPrefab(value: any): boolean {
        if (typeof value === "function") return value === Prefab;
        return value instanceof Prefab;
    }

    public isGeometry(value: any): boolean {
        if (typeof value === "function") return value === Geometry;
        return value instanceof Geometry;
    }

    public isMaterial(value: any): boolean {
        if (typeof value === "function") return value === GPU.Material;
        return value instanceof GPU.Material;
    }

    public isTexture(value: any): boolean {
        if (typeof value === "function") return value === GPU.Texture;
        return value instanceof GPU.Texture;
    }

    public GetSerializedFields = Utils.GetSerializedFields;
}
