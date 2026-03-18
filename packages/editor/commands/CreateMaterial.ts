import { Serializer } from "@trident/core";
import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { SaveToFile } from "./SaveToFile";

export async function CreateMaterial(engineAPI: IEngineAPI, currentPath: string): Promise<void> {
    const material = engineAPI.createPBRMaterial();
    material.assetPath = `${currentPath}/New Material.material`;
    const ctor = material.constructor as any;
    await SaveToFile(material.assetPath, new Blob([JSON.stringify({ type: ctor.type, ...Serializer.serializeFields(material) })]));
}
