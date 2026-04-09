import { IEngineAPI } from "../engine-api/trident/IEngineAPI";
import { LoadScript } from "../loaders/ScriptLoader";

export async function ReloadScript(engineAPI: IEngineAPI, path: string) {
    const loadedFile = await LoadScript(path);
    const serializer = engineAPI.serializer;
    const deserializer = engineAPI.deserializer;

    for (const key of Object.keys(loadedFile)) {
        const NewClass = loadedFile[key];
        if (typeof NewClass !== "function") continue;

        for (const go of engineAPI.currentScene.GetGameObjects()) {
            const toReplace: { component: any, index: number }[] = [];
            const components = go.GetComponents();
            for (let i = 0; i < components.length; i++) {
                if (components[i].constructor.name === NewClass.name) {
                    toReplace.push({ component: components[i], index: i });
                }
            }

            for (const { component } of toReplace) {
                // 1. Serialize field values
                const data = serializer.serializeComponent(component);

                // 2. Destroy old instance
                go.RemoveComponent(component);

                // 3. Create new instance
                const newComponent = go.AddComponent(NewClass);

                // 4. Deserialize field values back
                await deserializer.deserializeComponent(newComponent, data);
            }
        }
    }
}