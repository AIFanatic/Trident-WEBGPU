import { Deserializer, Prefab, Texture } from "@trident/core";
import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { GetFileExports, LoadScript } from "./ScriptLoader";

export async function LoadFile(path: string, file: FileSystemFileHandle, engineAPI: IEngineAPI): Promise<any> {
    const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();

    if (ext === "scene") {
        // TODO: item.data.instance is a json object, it should be a Scene
        const text = await (await file.getFile()).text();
        return JSON.parse(text);
    }
    else if (ext === "ts") {
        await LoadScript(path);   // ensures bundle is built + registered
        return GetFileExports(path) ?? {};
    }
    else if (ext === "prefab") {
        return Deserializer.Load(path, undefined, Prefab);
    }
    else if (ext === "png" || ext === "jpg" || ext === "jpeg") {
        return Deserializer.Load(path, undefined, Texture);
    }

    return Deserializer.Load(path);
}