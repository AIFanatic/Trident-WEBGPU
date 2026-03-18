import { GLTFLoader } from "@trident/plugins/GLTF/GLTFLoader";
import { Deserializer } from "@trident/core";
import { Prefab } from "../serialization/Prefab";
import { IEngineAPI } from "../engine-api/trident/IEngineAPI";

export async function LoadFile( path: string, file: FileSystemFileHandle, engineAPI: IEngineAPI ): Promise<any> {
    const extension = file.name.slice(file.name.lastIndexOf(".") + 1);

    if (extension === "glb") {
        const data = await file.getFile();
        const arrayBuffer = await data.arrayBuffer();
        const rootName = file.name.slice(0, file.name.lastIndexOf("."));
        return GLTFLoader.LoadFromArrayBuffer(arrayBuffer, engineAPI.currentScene, rootName);
    }
    else if (extension === "scene") {
        const data = await file.getFile();
        const text = await data.text();
        return JSON.parse(text);
    }
    else if (extension === "prefab") {
        const data = await file.getFile();
        const text = await data.text();
        return Prefab.Deserialize(JSON.parse(text));
    }
    else if (extension === "geometry") {
        const geometry = await Deserializer.Load(path);
        geometry.assetPath = path;
        return geometry;
    }
    else if (extension === "material") {
        const material = await Deserializer.Load(path);
        material.assetPath = path;
        return material;
    }
    else if (extension === "png" || extension === "jpg") {
        const data = await file.getFile();
        const arrayBuffer = await data.arrayBuffer();
        const texture = await engineAPI.createTextureFromBlob(new Blob([arrayBuffer]));
        texture.assetPath = path;
        return texture;
    }
    else if (extension === "ts") {
        const { LoadScript } = await import("./ScriptLoader");
        return LoadScript(path);
    }

    return file;
}
