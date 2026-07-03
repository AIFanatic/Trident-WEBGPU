import { TypeRegistry } from "./utils";
import { SerializeField } from "./utils/SerializeField";

export class Prefab {
    public static type = "@trident/core/Prefab";

    @SerializeField public assetPath?: string;
    public data: any;

    public static Deserialize(assetPath: string, data: any, asset: any): Prefab {
        const prefab = new Prefab();
        prefab.assetPath = assetPath || undefined;
        prefab.data = asset ?? data;
        return prefab;
    }
}

TypeRegistry.set(Prefab.type, Prefab);