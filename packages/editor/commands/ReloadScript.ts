import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { LoadScript } from "../loaders/ScriptLoader";

export async function ReloadScript(engineAPI: IEngineAPI, path: string) {
    const loadedFile = await LoadScript(path);
    const { serializer, deserializer, currentScene } = engineAPI;

    for (const NewClass of Object.values(loadedFile)) {
        if (typeof NewClass !== "function") continue;

        const instances = currentScene.GetGameObjects().flatMap(go => go.GetComponents()).filter(c => c.constructor.name === NewClass.name);

        for (const component of instances) {
            const data = serializer.serializeComponent(component);
            const fresh = new NewClass(component.gameObject);
            const freshKeys = new Set(Object.keys(fresh));

            for (const k of Object.keys(component)) {
                if (!freshKeys.has(k)) delete (component as any)[k];
            }
            for (const k of freshKeys) {
                if (!(k in component)) (component as any)[k] = (fresh as any)[k];
            }

            Object.setPrototypeOf(component, NewClass.prototype);
            await deserializer.deserializeComponent(component, data);
            component.hasStarted = false;  // rerun Start on next Update (Unity-style)
        }
    }
}