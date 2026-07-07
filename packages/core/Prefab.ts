import { TypeRegistry } from "./utils";
import { SerializeField } from "./utils/SerializeField";

export class Prefab {
    public static type = "@trident/core/Prefab";

    @SerializeField public assetPath?: string;

    public id?: string;
    public name: string;
    public components: any[] = [];
    public transform: any;
    public children: Prefab[] = [];
    public data: any;

    public traverse(fn: (prefab: Prefab) => void) {
        fn(this);
        for (const child of this.children) child.traverse(fn);
    }

    public static Deserialize(assetPath: string, data: any, asset: any): Prefab {
        const source = asset ?? data;
        const prefab = new Prefab();
        prefab.id = source.id;
        prefab.name = source.name;
        prefab.assetPath = assetPath;
        prefab.transform = source.transform;
        prefab.components = Array.isArray(source?.components) ? source.components : [];
        prefab.children = Array.isArray(source?.children) ? source.children.map((c: any) => Prefab.Deserialize(c.assetPath, null, c)) : [];
        prefab.data = source;
        return prefab;
    }
}

TypeRegistry.set(Prefab.type, Prefab);