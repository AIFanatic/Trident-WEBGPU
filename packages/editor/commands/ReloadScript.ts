import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { BuildBundle } from "../loaders/ScriptLoader";
import { Serializer, Deserializer } from "@trident/core";

let reloadInFlight: Promise<void> | null = null;

export async function ReloadScript(engineAPI: IEngineAPI, _path: string) {
    // Coalesce rapid-fire saves into a single rebuild
    if (reloadInFlight) {
        await reloadInFlight;
        return;
    }
    reloadInFlight = doReload(engineAPI);
    try { await reloadInFlight; } finally { reloadInFlight = null; }
}

async function doReload(engineAPI: IEngineAPI) {
    const scene = engineAPI.currentScene;

    // 1. Snapshot the current scene exactly like EditorRuntime.Play does
    const snapshot = Serializer.serializeScene(scene);

    // 2. Tear down the live scene
    scene.Clear();

    // 3. Rebundle the entire project — registers new classes in Component.Registry
    await BuildBundle();

    // 4. Re-deserialize. The deserializer uses Component.Registry, so all instances
    //    are built from the new classes. @SerializeField values are restored.
    await Deserializer.deserializeScene(scene, snapshot);
}