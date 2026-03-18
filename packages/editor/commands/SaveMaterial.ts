import { Serializer } from "@trident/core";
import { IMaterial } from "../engine-api/trident/IMaterial";
import { SaveToFile } from "./SaveToFile";

export async function SaveMaterial(material: IMaterial): Promise<void> {
    if (!material.assetPath) {
        throw Error("SaveMaterial: material doesn't have an assetPath.");
    }
    const ctor = material.constructor as any;
    await SaveToFile(material.assetPath, new Blob([JSON.stringify({ type: ctor.type, ...Serializer.serializeFields(material) })]));
}
