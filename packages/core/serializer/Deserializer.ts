import { Scene } from "../Scene";
import { GameObject } from "../GameObject";
import { Component, Transform, Camera } from "../components";
import { Vector3, Vector2, Quaternion, Color } from "../math";
import { GetSerializedFields } from "../utils/SerializeField";

type DeferredRef = { component: Component; property: string; id: string };

export class Deserializer {
    public static Load: (assetPath: string, data?: any) => Promise<any> = async () => { throw Error("Deserializer.Load not set"); };

    private static deferredRefs: DeferredRef[] = [];
    private static idMap = new Map<string, GameObject>();

    public static deserializeValue(data: any, existing: any): any {
        if (data == null || typeof data !== 'object') return data;
        if (Array.isArray(data)) return data;
        if (existing instanceof Vector3) { existing.set(data.x, data.y, data.z); return existing; }
        if (existing instanceof Vector2) { existing.set(data.x, data.y); return existing; }
        if (existing instanceof Quaternion) { existing.set(data.x, data.y, data.z, data.w); return existing; }
        if (existing instanceof Color) { existing.set(data.r, data.g, data.b, data.a); return existing; }

        const fields = GetSerializedFields(existing);
        if (fields.length > 0) {
            for (const { name } of fields) {
                if (data[name] !== undefined) existing[name] = this.deserializeValue(data[name], existing[name]);
            }
            return existing;
        }

        return data;
    }

    /** Async field-by-field deserialization — handles assetPath loading. */
    public static async deserializeFields(target: any, data: any) {
        for (const { name } of GetSerializedFields(target)) {
            if (data[name] === undefined) continue;
            const value = data[name];
            if (value && typeof value === 'object' && value.assetPath) {
                target[name] = await this.Load(value.assetPath, value);
                continue;
            }
            target[name] = this.deserializeValue(value, target[name]);
        }
    }

    public static async deserializeComponent(component: Component, data: any) {
        if (data.id) component.id = data.id;
        for (const { name } of GetSerializedFields(component)) {
            if (data[name] === undefined) continue;
            const value = data[name];
            if (value && typeof value === 'object' && value.__ref === "GameObject") {
                this.deferredRefs.push({ component, property: name as string, id: value.id });
                continue;
            }
            if (value && typeof value === 'object' && value.assetPath) {
                component[name] = await this.Load(value.assetPath, value);
                continue;
            }
            component[name] = this.deserializeValue(value, component[name]);
        }
    }

    public static async deserializeGameObject(scene: Scene, data: any, parent?: Transform): Promise<GameObject> {
        let source = data;
        if (data.assetPath) source = await this.Load(data.assetPath);

        const go = new GameObject(scene);
        if (data.id) go.id = data.id;
        go.name = data.name ?? source.name;
        if (data.id) this.idMap.set(data.id, go);
        if (data.assetPath) go.assetPath = data.assetPath;
        if (parent) go.transform.parent = parent;

        await this.deserializeComponent(go.transform, source.transform);
        if (data.assetPath) await this.deserializeComponent(go.transform, data.transform);

        const instances: Component[] = [];
        for (const compData of (source.components ?? [])) {
            if (compData.assetPath && !Component.Registry.get(compData.type)) await this.Load(compData.assetPath);
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

    public static async deserializeScene(scene: Scene, data: any) {
        scene.name = data.name;
        for (const goData of data.gameObjects) await this.deserializeGameObject(scene, goData);

        for (const ref of this.deferredRefs) ref.component[ref.property] = this.idMap.get(ref.id) ?? null;
        this.deferredRefs.length = 0;

        // Restore mainCamera by component id, fallback to first Camera
        Camera.mainCamera = null;
        for (const go of scene.GetGameObjects()) {
            const cam = go.GetComponent(Camera);
            if (cam && cam.id === data.mainCamera) { Camera.mainCamera = cam; break; }
            if (cam && !Camera.mainCamera) Camera.mainCamera = cam;
        }

        this.idMap.clear();
    }
}
