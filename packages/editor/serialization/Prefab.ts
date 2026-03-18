/**
 * Prefab — editor-only serialized representation of a GameObject hierarchy.
 * Moved from packages/core/Assets.ts so that core stays a pure runtime.
 */

export interface SerializedComponent {
    type: string;
    [key: string]: unknown;
}

export class Prefab {
    public id?: string;
    public name: string;
    public type: string;
    public components: SerializedComponent[] = [];
    public transform: SerializedComponent;
    public children: Prefab[] = [];
    public assetPath?: string;

    public traverse(fn: (prefab: Prefab) => void, prefab: Prefab = this) {
        fn(prefab);
        for (const child of prefab.children) {
            this.traverse(fn, child);
        }
    }

    public Deserialize(data: any): Prefab {
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.transform = data.transform;
        this.assetPath = data.assetPath;
        this.components = Array.isArray(data?.components) ? data.components : [];
        this.children = Array.isArray(data?.children) ? data.children.map((c: any) => Prefab.Deserialize(c)) : [];
        return this;
    }

    public static Deserialize(data: any): Prefab {
        const prefab = new Prefab();
        prefab.Deserialize(data);
        return prefab;
    }
}
