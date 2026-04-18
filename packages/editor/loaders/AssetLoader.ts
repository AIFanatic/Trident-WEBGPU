import { Deserializer, Prefab } from "@trident/core";
import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { LoadScript } from "./ScriptLoader";

export async function LoadFile(path: string, file: FileSystemFileHandle, engineAPI: IEngineAPI): Promise<any> {
    const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();

    if (ext === "scene") {
        const text = await (await file.getFile()).text();
        return JSON.parse(text);
    }
    else if (ext === "ts") {
        return LoadScript(path);
    }
    else if (ext === "prefab") {
        return Deserializer.Load(path, undefined, Prefab);
    }

    return Deserializer.Load(path);
}