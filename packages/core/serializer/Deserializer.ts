import { Scene } from "../Scene";
import { GameObject } from "../GameObject";
import { Component, Transform, Camera } from "../components";
import { Vector3, Vector2, Quaternion, Color } from "../math";
import { GetSerializedFields } from "../utils/SerializeField";
import { Texture } from "../renderer/Texture";
import { Assets } from "../Assets";
import { TypeRegistry } from "../utils";

type DeferredRef = { component: Component; property: string; id: string };

export class Deserializer {
    private static readonly binaryExtensions = new Set(["png", "jpg", "jpeg", "bin", "wav", "mp3", "ogg", "glb"]);

    public static async Load(assetPath: string, data?: any, expectedType?: any): Promise<any> {
        const cached = Assets.GetInstance(assetPath);
        if (cached) return cached;

        const ext = assetPath.slice(assetPath.lastIndexOf(".") + 1).toLowerCase();
        const loadType = this.binaryExtensions.has(ext) ? "binary" : "json";

        const asset = await Assets.Load(assetPath, loadType) as any;

        // Type with custom Deserialize — delegate (binary or JSON)
        if (expectedType?.Deserialize) {
            const instance = await expectedType.Deserialize(assetPath, data, asset);
            Assets.SetInstance(assetPath, instance);
            return instance;
        }

        // JSON asset with type field — generic construct + field-walk
        if (asset?.type) {
            const Ctor = TypeRegistry.get(asset.type);
            if (!Ctor) throw Error(`Unknown type: ${asset.type}`);
            const instance = new Ctor();
            instance.assetPath = assetPath;
            await this.deserializeFields(instance, asset);
            if (instance.OnDeserialized) await instance.OnDeserialized();
            Assets.SetInstance(assetPath, instance);
            return instance;
        }

        return asset;
    }

    private static deferredRefs: DeferredRef[] = [];
    private static idMap = new Map<string, GameObject>();

    private static isAssetRef(data: any): boolean {
        return !!data && typeof data === "object" && typeof data.assetPath === "string";
    }

    private static createExpectedInstance(type: Function): any {
        if (type === Number || type === String || type === Boolean || type === Array || type === Object) {
            return undefined;
        }

        return new (type as any)();
    }

    public static async deserializeAny(data: any, expectedType?: Function, existing?: any): Promise<any> {
        if (data == null || typeof data !== "object") return data;

        if (this.isAssetRef(data)) {
            return this.Load(data.assetPath, data, expectedType);
        }

        if (Array.isArray(data)) {
            return Promise.all(data.map(item => this.deserializeAny(item, expectedType)));
        }

        if (existing instanceof Vector3) {
            existing.set(data.x, data.y, data.z);
            return existing;
        }

        if (existing instanceof Vector2) {
            existing.set(data.x, data.y);
            return existing;
        }

        if (existing instanceof Quaternion) {
            existing.set(data.x, data.y, data.z, data.w);
            return existing;
        }

        if (existing instanceof Color) {
            existing.set(data.r, data.g, data.b, data.a);
            return existing;
        }

        if (expectedType === Texture && !data.assetPath) {
            return existing;
        }

        const target = existing ?? (expectedType ? this.createExpectedInstance(expectedType) : undefined);

        if (target) {
            const fields = GetSerializedFields(target);

            if (fields.length > 0) {
                await this.deserializeFields(target, data);
                return target;
            }
        }

        return data;
    }

    public static async deserializeFields(target: any, data: any): Promise<void> {
        for (const { name, type } of GetSerializedFields(target)) {
            if (data[name] === undefined) continue;

            target[name] = await this.deserializeAny(data[name], type, target[name]);
        }
    }

    public static async deserializeComponent(component: Component, data: any): Promise<void> {
        if (data.id) component.id = data.id;

        for (const { name, type } of GetSerializedFields(component)) {
            if (data[name] === undefined) continue;

            const value = data[name];

            if (value && typeof value === "object" && value.__ref === "GameObject") {
                this.deferredRefs.push({ component, property: name as string, id: value.id });
                continue;
            }

            component[name] = await this.deserializeAny(value, type, component[name]);
        }
    }

    public static async deserializeGameObject(scene: Scene, data: any, parent?: Transform): Promise<GameObject> {
        let source = data;

        if (data.assetPath) {
            source = await this.Load(data.assetPath);
        }

        const go = new GameObject(scene);

        if (data.id) go.id = data.id;
        go.name = data.name ?? source.name;

        if (data.id) this.idMap.set(data.id, go);
        if (data.assetPath) go.assetPath = data.assetPath;
        if (parent) go.transform.parent = parent;

        await this.deserializeComponent(go.transform, source.transform);

        if (data.assetPath) {
            await this.deserializeComponent(go.transform, data.transform);
        }

        const instances: Component[] = [];

        for (const compData of (source.components ?? [])) {
            if (compData.assetPath && !Component.Registry.get(compData.type)) {
                await this.Load(compData.assetPath);
            }

            const Ctor = Component.Registry.get(compData.type);
            if (!Ctor) throw Error(`Component ${compData.type} not found`);

            instances.push(go.AddComponent(Ctor as any));
        }

        for (let i = 0; i < instances.length; i++) {
            await this.deserializeComponent(instances[i], source.components[i]);
        }

        for (const child of (source.children ?? [])) {
            await this.deserializeGameObject(scene, child, go.transform);
        }

        return go;
    }

    public static async deserializeScene(scene: Scene, data: any): Promise<void> {
        scene.name = data.name;

        for (const goData of data.gameObjects) {
            await this.deserializeGameObject(scene, goData);
        }

        for (const ref of this.deferredRefs) {
            ref.component[ref.property] = this.idMap.get(ref.id) ?? null;
        }

        this.deferredRefs.length = 0;

        Camera.mainCamera = null;

        for (const go of scene.GetGameObjects()) {
            const cam = go.GetComponent(Camera);

            if (cam && cam.id === data.mainCamera) {
                Camera.mainCamera = cam;
                break;
            }

            if (cam && !Camera.mainCamera) {
                Camera.mainCamera = cam;
            }
        }

        this.idMap.clear();
    }
}