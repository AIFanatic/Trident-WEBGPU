import { IEngineAPI } from "../engine/api/trident/IEngineAPI";
import { BuildBundle } from "../loaders/ScriptLoader";
import { Serializer, Deserializer, Assets } from "@trident/core";

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

    const snapshot = Serializer.serializeScene(scene);
    scene.Clear();

    Assets.ClearInstances(path => !path.startsWith("@")); // Hacky, dont clear builtins

    await BuildBundle();
    await Deserializer.deserializeScene(scene, snapshot);
}