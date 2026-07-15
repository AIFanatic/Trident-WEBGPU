import { Scene } from "../Scene";
import { GameObject } from "../GameObject";
import { Component, Transform, Camera } from "../components";
import { Vector3, Vector2, Quaternion, Color } from "../math";
import { GetSerializedFields } from "../utils/SerializeField";
import { Texture } from "../renderer/Texture";
import { Assets } from "../Assets";
import { TypeRegistry, UUID } from "../utils";
import { AudioClip } from "../components/AudioSource";

type DeferredRef = { target: any; property: string | symbol; id: string };

interface DeserializeContext {
    deferredRefs: DeferredRef[];
    idMap: Map<string, GameObject>;
}

interface SerializedGameObjectData {
    id?: string;
    name?: string;
    enabled?: boolean;
    assetPath?: string;
    transform?: SerializedComponentData;
    components?: SerializedComponentData[];
    children?: SerializedGameObjectData[];
}

interface SerializedComponentData {
    id?: string;
    type?: string;
    assetPath?: string;
    [key: string]: any;   // arbitrary serialized fields
}

export class Deserializer {
    private static readonly binaryExtensions = new Set(["png", "jpg", "jpeg", "bin", "wav", "mp3", "ogg", "glb"]);
    private static readonly typedArrayCtors: Set<Function> = new Set([
        Float32Array, Float64Array, Int8Array, Int16Array, Int32Array,
        Uint8Array, Uint16Array, Uint32Array, Uint8ClampedArray
    ]);

    private static instanceLoadCache = new Map<string, Promise<any>>();

    public static async Load(assetPath: string, data?: any, expectedType?: any): Promise<any> {
        const cached = Assets.GetInstance(assetPath);
        if (cached) return cached;

        const key = `${assetPath}:${expectedType?.type ?? expectedType?.name ?? ""}`;
        const pending = this.instanceLoadCache.get(key);
        if (pending) return pending;

        const promise = (async () => {
            const ext = assetPath.slice(assetPath.lastIndexOf(".") + 1).toLowerCase();
            const loadType = this.binaryExtensions.has(ext) ? "binary" : "json";

            const asset = await Assets.Load(assetPath, loadType) as any;

            if (expectedType?.Deserialize) {
                const instance = await expectedType.Deserialize(assetPath, data, asset);
                Assets.SetInstance(assetPath, instance);
                return instance;
            }

            if (asset?.type) {
                const Ctor = TypeRegistry.get(asset.type);
                if (!Ctor) throw Error(`Unknown type: ${asset.type}`);
                const instance = new Ctor();
                instance.assetPath = assetPath;
                await this.deserializeFields(instance, asset);
                Assets.SetInstance(assetPath, instance);
                return instance;
            }

            return asset;
        })();

        this.instanceLoadCache.set(key, promise);

        try {
            return await promise;
        } finally {
            this.instanceLoadCache.delete(key);
        }
    }

    private static isAssetRef(data: any): boolean {
        return !!data && typeof data === "object" && typeof data.assetPath === "string";
    }

    private static isGameObjectRef(data: any): boolean {
        return !!data && typeof data === "object" && data.__ref === "GameObject" && typeof data.id === "string";
    }

    private static createExpectedInstance(type: Function): any {
        if (
            type === Number || type === String || type === Boolean || type === Array || type === Object ||
            type === GameObject ||
            type === Component || (type.prototype instanceof Component)
        ) {
            return undefined;
        }

        return new (type as any)();
    }

    public static remapTemplateIds(source: any): any {
        const idMap = new Map<string, string>();
        const collect = (n: any) => {
            if (!n || typeof n !== "object") return;
            if (Array.isArray(n)) { n.forEach(collect); return; }
            if (typeof n.id === "string") idMap.set(n.id, UUID());
            for (const k in n) collect(n[k]);
        };
        collect(source);

        const remap = (n: any): any => {
            if (!n || typeof n !== "object") return n;
            if (Array.isArray(n)) return n.map(remap);
            if (n.__ref === "GameObject" && idMap.has(n.id)) return { __ref: "GameObject", id: idMap.get(n.id) };
            const out: any = {};
            for (const k in n) out[k] = k === "id" && idMap.has(n[k]) ? idMap.get(n[k]) : remap(n[k]);
            return out;
        };
        return remap(source);
    }

    public static async deserializeAny(data: any, expectedType?: Function, existing?: any, ctx?: DeserializeContext): Promise<any> {
        if (data == null || typeof data !== "object") return data;

        if (this.isAssetRef(data)) return this.Load(data.assetPath, data, expectedType);
        if (Array.isArray(data) && this.typedArrayCtors.has(expectedType as any)) return new (expectedType as any)(data);

        if (existing instanceof Map && Array.isArray(data)) {
            existing.clear();
            for (const [k, v] of data) existing.set(k, await this.deserializeAny(v, undefined, undefined, ctx));
            return existing;
        }

        if (Array.isArray(data)) {
            const result = new Array(data.length);
            await Promise.all(data.map(async (item, i) => {
                if (this.isGameObjectRef(item) && ctx) {
                    ctx.deferredRefs.push({ target: result, property: i, id: item.id });
                    result[i] = null;
                } else {
                    result[i] = await this.deserializeAny(item, expectedType, undefined, ctx);
                }
            }));
            return result;
        }

        if (existing instanceof Vector3) { existing.set(data.x, data.y, data.z); return existing; }
        if (existing instanceof Vector2) { existing.set(data.x, data.y); return existing; }
        if (existing instanceof Quaternion) { existing.set(data.x, data.y, data.z, data.w); return existing; }
        if (existing instanceof Color) { existing.set(data.r, data.g, data.b, data.a); return existing; }
        if (expectedType === Texture && !data.assetPath) return existing;
        if (expectedType === AudioClip && !data.assetPath) return existing;

        const target = existing ?? (expectedType ? this.createExpectedInstance(expectedType) : undefined);
        if (target) {
            const fields = GetSerializedFields(target);
            if (fields.length > 0) {
                await this.deserializeFields(target, data, ctx);
                return target;
            }
        }
        return data;
    }

    public static async deserializeFields(target: any, data: SerializedComponentData, ctx?: DeserializeContext): Promise<void> {
        const fields = GetSerializedFields(target).filter(({ name }) => data[name] !== undefined);

        const resolved = await Promise.all(fields.map(async ({ name, type }) => {
            const value = data[name];
            if (this.isGameObjectRef(value)) return { name, refId: value.id };
            return { name, value: await this.deserializeAny(value, type, target[name], ctx) };
        }));

        for (const item of resolved) {
            if ("refId" in item) {
                if (ctx) ctx.deferredRefs.push({ target, property: item.name, id: item.refId });
                else target[item.name] = null;
            } else {
                target[item.name] = item.value;
            }
        }
    }

    public static async deserializeComponent(component: Component, data: SerializedComponentData, ctx?: DeserializeContext): Promise<void> {
        const wasDeserializing = component.isDeserializing;
        component.isDeserializing = true;

        try {
            if (data.id) component.id = data.id;
            await this.deserializeFields(component, data, ctx);
        } finally {
            component.isDeserializing = wasDeserializing;
        }
    }

    public static async deserializeGameObject(scene: Scene, data: SerializedGameObjectData, parent?: Transform, ctx?: DeserializeContext): Promise<GameObject> {
        const ownsCtx = !ctx;
        ctx = ctx ?? { deferredRefs: [], idMap: new Map() };

        let source = data;
        if (data.assetPath) {
            source = await this.Load(data.assetPath);
            source = this.remapTemplateIds(source);   // fresh ids per use
        }

        const go = new GameObject(scene);
        if (data.id) go.id = data.id;
        go.name = data.name ?? source.name ?? go.name;
        if (data.id) ctx.idMap.set(data.id, go);
        if (data.assetPath) go.assetPath = data.assetPath;
        if (parent) go.transform.parent = parent;
        go.enabled = data.enabled ?? true;

        if (source.transform) await this.deserializeComponent(go.transform, source.transform, ctx);
        if (data.assetPath && data.transform) await this.deserializeComponent(go.transform, data.transform, ctx);

        const compsData = source.components ?? [];
        const instances: Component[] = [];

        for (const compData of compsData) {
            if (compData.assetPath && !Component.Registry.get(compData.type!)) await this.Load(compData.assetPath);

            const Ctor = Component.Registry.get(compData.type!);
            if (!Ctor) throw Error(`Component ${compData.type} not found`);

            const instance = go.AddComponent(Ctor as any);
            instance.isDeserializing = true;
            instances.push(instance);
        }

        try {
            for (let i = 0; i < instances.length; i++) await this.deserializeComponent(instances[i], compsData[i], ctx);
            for (const child of (source.children ?? [])) await this.deserializeGameObject(scene, child, go.transform, ctx);
        } finally {
            for (const instance of instances) instance.isDeserializing = false;
        }

        if (ownsCtx) this.resolve(ctx);
        return go;
    }

    public static async deserializeScene(scene: Scene, data: any): Promise<void> {
        scene.name = data.name;
        const ctx: DeserializeContext = { deferredRefs: [], idMap: new Map() };

        for (const goData of data.gameObjects) await this.deserializeGameObject(scene, goData, undefined, ctx);

        this.resolve(ctx);

        Camera.mainCamera = null;
        for (const go of scene.GetGameObjects()) {
            const cam = go.GetComponent(Camera);
            if (cam && cam.id === data.mainCamera) { Camera.mainCamera = cam; break; }
            if (cam && !Camera.mainCamera) Camera.mainCamera = cam;
        }
    }

    private static resolve(ctx: DeserializeContext): void {
        for (const ref of ctx.deferredRefs) {
            ref.target[ref.property] = ctx.idMap.get(ref.id) ?? null;
        }
    }
}
