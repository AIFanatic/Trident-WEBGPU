import { IMaterial } from "../engine-api/trident/IMaterial";
import { serializeMaterialAsset } from "../serialization";
import { SaveToFile } from "./SaveToFile";

export async function SaveMaterial(material: IMaterial): Promise<void> {
    if (!material.assetPath) {
        throw Error("SaveMaterial: material doesn't have an assetPath.");
    }
    const materialSerialized = serializeMaterialAsset(material);
    await SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));
}
