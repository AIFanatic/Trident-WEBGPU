import { IGameObject } from "../engine-api/trident/components/IGameObject";
import { serializeGameObject } from "../serialization";
import { SaveToFile } from "./SaveToFile";

export async function SavePrefab(baseDir: string, gameObject: IGameObject): Promise<void> {
    const rootName = gameObject.name;
    const prefabName = rootName && rootName !== "" ? `${rootName}.prefab` : "Untitled.prefab";
    const prefab = serializeGameObject(gameObject as any);
    await SaveToFile(`${baseDir}/${prefabName}`, new Blob([JSON.stringify(prefab)]));
}
