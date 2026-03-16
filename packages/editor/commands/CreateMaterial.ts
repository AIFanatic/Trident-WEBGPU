import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { serializeMaterialAsset } from "../serialization";
import { SaveToFile } from "./SaveToFile";

export async function CreateMaterial(engineAPI: IEngineAPI, currentPath: string): Promise<void> {
    const material = engineAPI.createPBRMaterial();
    material.assetPath = `${currentPath}/New Material.material`;
    const materialSerialized = serializeMaterialAsset(material);
    await SaveToFile(material.assetPath, new Blob([JSON.stringify(materialSerialized)]));
}
