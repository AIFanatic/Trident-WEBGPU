import { Assets } from "./Assets";
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

    public static Deserialize(data: any): Prefab {
        const prefab = new Prefab();
        prefab.id = data.id;
        prefab.name = data.name;
        prefab.assetPath = data.assetPath;
        prefab.transform = data.transform;
        prefab.components = Array.isArray(data?.components) ? data.components : [];
        prefab.children = Array.isArray(data?.children) ? data.children.map((c: any) => Prefab.Deserialize(c)) : [];
        prefab.data = data;
        return prefab;
    }

    public static async Load(assetPath: string): Promise<Prefab> {
        const json = await Assets.Load(assetPath, "json");
        const prefab = Prefab.Deserialize(json);
        prefab.assetPath = assetPath;
        return prefab;
    }
}
