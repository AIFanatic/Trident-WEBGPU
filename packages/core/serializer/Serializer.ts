import { Scene } from "../Scene";
import { GameObject } from "../GameObject";
import { Component, Transform, Camera } from "../components";
import { Vector3, Vector2, Quaternion, Color } from "../math";
import { Prefab } from "../Prefab";
import { Texture } from "../renderer/Texture";
import { GetSerializedFields } from "../utils/SerializeField";

export interface ISerializedGameObject {
    assetPath?: string;
    id: string;
    name: string;
    transform: any;
    components: any[];
    children: any[];
};

export interface ISerializedScene {
    type: string;
    name: string;
    mainCamera: string;
    gameObjects: any[];
};

export class Serializer {
    private static isTextureLike(value: any): value is Texture {
        return value instanceof Texture || value?.constructor?.type === Texture.type;
    }

    public static serializeValue(value: any): any {
        if (value == null || typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.map(v => this.serializeValue(v));
        if (ArrayBuffer.isView(value)) return Array.from(value as any);
        if (value instanceof GameObject) return { __ref: "GameObject", id: value.id };
        if (this.isTextureLike(value)) {
            if (!value.assetPath) return undefined;
            return { assetPath: value.assetPath, name: value.name, format: value.format, generateMips: value.mipLevels > 1 };
        }
        if (value instanceof Vector3) return { x: value.x, y: value.y, z: value.z };
        if (value instanceof Vector2) return { x: value.x, y: value.y };
        if (value instanceof Quaternion) return { x: value.x, y: value.y, z: value.z, w: value.w };
        if (value instanceof Color) return { r: value.r, g: value.g, b: value.b, a: value.a };
        if (value instanceof Map) return Array.from(value, ([k, v]) => [k, this.serializeValue(v)]);

        if (value instanceof Prefab) return value.assetPath ? { assetPath: value.assetPath } : undefined;
        if (value.assetPath) return { assetPath: value.assetPath };

        const fields = GetSerializedFields(value);
        if (fields.length > 0) return this.serializeFields(value);

        return value;
    }

    public static serializeFields(value: any): any {
        const out: any = {};
        for (const { name } of GetSerializedFields(value)) {
            out[name] = this.serializeValue(value[name]);
        }
        return out;
    }

    public static serializeComponent(component: Component): any {
        const ctor = component.constructor as any;
        const out: any = { id: component.id, type: ctor.type || ctor.name };
        if (ctor.assetPath) out.assetPath = ctor.assetPath;
        for (const { name } of GetSerializedFields(component)) out[name] = this.serializeValue(component[name]);
        return out;
    }
    
    public static serializeGameObject(gameObject: GameObject): ISerializedGameObject {
        const out: ISerializedGameObject = { id: gameObject.id, name: gameObject.name, transform: this.serializeComponent(gameObject.transform), components: [], children: [] };
        if (gameObject.assetPath) { out.assetPath = gameObject.assetPath; return out; }
        out.components = gameObject.GetComponents().filter(c => !(c instanceof Transform)).map(component => { return this.serializeComponent(component) });
        out.children = [];
        for (const child of gameObject.transform.children) out.children.push(this.serializeGameObject(child.gameObject));
        return out;
    }
    
    public static serializeScene(scene: Scene) {
        return {
            type: Scene.type,
            name: scene.name,
            mainCamera: Camera.mainCamera?.id,
            gameObjects: scene.GetRootGameObjects().map(gameObject => { return this.serializeGameObject(gameObject)}),
        };
    }
}
