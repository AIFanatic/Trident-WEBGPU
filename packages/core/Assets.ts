import { SerializedComponent } from "./components/Component";

type ResponseType<T> = T extends 'json' ? object
                      : T extends 'text' ? string
                      : T extends 'binary' ? ArrayBuffer
                      : never;

export class Assets {
    private static cache: Map<string, Promise<any>> = new Map();
    private static instanceCache: Map<string, any> = new Map();

    public static GetInstance(path: string) {
        return Assets.instanceCache.get(path);
    }

    public static SetInstance(path: string, instance: any) {
        return Assets.instanceCache.set(path, instance);
    }

    public static async Register(path: string, resource: Promise<any> | any, force = false) {
        if (Assets.cache.has(path) && force === false) throw Error(`Assets[Register]: ${path} already set, use "force" to bypass.`);
        Assets.cache.set(path, Promise.resolve(resource));
    }

    public static async Load<T extends "json" | "text" | "binary">(url: string, type: T): Promise<ResponseType<T>> {
        const cached = Assets.cache.get(url);
        if (cached !== undefined) {
            return cached;
        }

        const promise = fetch(url).then(response => {
            if (!response.ok) throw Error(`File not found ${url}`);
            if (type === "json") return response.json();
            else if (type === "text") return response.text();
            else if (type === "binary") return response.arrayBuffer();
        }).then(result => {
            Assets.cache.set(url, Promise.resolve(result));
            return result;
        }).catch(error => {
            Assets.cache.delete(url);
            throw error;
        });

        Assets.cache.set(url, promise);
        return promise;
    }

    public static async LoadURL<T extends "json" | "text" | "binary">(url: URL, type: T): Promise<ResponseType<T>> {
        const cached = Assets.cache.get(url.href);
        if (cached !== undefined) {
            return cached;
        }

        const promise = fetch(url).then(response => {
            if (!response.ok) throw Error(`File not found ${url}`);
            if (type === "json") return response.json();
            else if (type === "text") return response.text();
            else if (type === "binary") return response.arrayBuffer();
        }).then(result => {
            Assets.cache.set(url.href, Promise.resolve(result));
            return result;
        }).catch(error => {
            Assets.cache.delete(url.href);
            throw error;
        });

        Assets.cache.set(url.href, promise);
        return promise;
    }
}

export class Prefab {
    public name: string;
    public type: string;
    public components: SerializedComponent[] = [];
    public transform: SerializedComponent;
    public children: Prefab[] = [];

    public traverse(fn: (prefab: Prefab) => void, prefab: Prefab = this) {
        fn(prefab);
        for (const child of prefab.children) {
            this.traverse(fn, child);
        }
    }
}