import { Serializer } from "@trident/core";
import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { SaveToFile } from "./SaveToFile";

export async function SavePrefab(baseDir: string, gameObject: IGameObject): Promise<void> {
    const rootName = gameObject.name;
    const prefabName = rootName && rootName !== "" ? `${rootName}.prefab` : "Untitled.prefab";
    const prefab = Serializer.serializeGameObject(gameObject as any);
    await SaveToFile(`${baseDir}/${prefabName}`, new Blob([JSON.stringify(prefab)]));
}
