import { TridentAPI } from "./engine-api/trident/TridentAPI";
import { createElement, render, Component } from "./gooact";
import { Layout } from "./ui/Layout";
import { registerEditorBridge } from "@trident/editor";
import { SaveAsset } from "./commands/SaveAsset";
import { LayoutInspectorEvents, RuntimeEvents, SceneEvents } from "./Events";
import { InspectorInput, InspectorInputProps } from "./ui/Inspector/InspectorInput";
import { ExtendedDataTransfer } from "./helpers/ExtendedDataTransfer";

import { Components, Console } from "@trident/core";
import { Sky } from "@trident/plugins/Environment/Sky";
import { Environment } from "@trident/plugins/Environment/Environment";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { OrbitControls } from "@trident/plugins/OrbitControls";

export type EditorEventHandler<T extends (...args: any[]) => void> = (...args: Parameters<T>) => void;

const EngineAPI = new TridentAPI();

class App extends Component {
    constructor() {
        super();


        const engineAPI = new TridentAPI();

        registerEditorBridge({
            saveAsset: SaveAsset,
            repaintInspector: () => { TridentAPI.EventSystem.emit(LayoutInspectorEvents.Repaint) },
            LayoutInspectorInput: (props: InspectorInputProps) => { return <InspectorInput {...props} /> },
            ExtendedDataTransfer: () => { return ExtendedDataTransfer },
            events: {
                onSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.on(SceneEvents.Saved, handler) },
                offSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.off(SceneEvents.Saved, handler) },
            },
        });

        TridentAPI.EventSystem.on(RuntimeEvents.CreatedCanvas, async (canvas) => {
            Console.getVar("r_shadows_csm_splittypepracticallambda").value = 0.99;

            const Runtime = await engineAPI.createRuntime(canvas);
            const currentScene = Runtime.SceneManager.CreateScene("DefaultScene");
            Runtime.SceneManager.SetActiveScene(currentScene);

            const file = await fetch("./resources/DefaultScene.scene");
            const text = await file.text();
            const sceneJSON = JSON.parse(text);

            EngineAPI.currentScene.Clear();
            await EngineAPI.deserializer.deserializeScene(EngineAPI.currentScene, sceneJSON);

            const sky = new Sky();
            sky.SUN_ELEVATION_DEGREES = 60;
            await sky.init();
            const skyTexture = sky.skyTextureCubemap;

            const environment = new Environment(EngineAPI.currentScene, skyTexture);
            await environment.init();

            Runtime.AddSystem(PhysicsRapier);

            Runtime.Play();

            setTimeout(() => {
                console.log(Runtime)
            }, 1000);

            TridentAPI.EventSystem.emit(SceneEvents.Loaded, currentScene);
        })
    }

    render() {
        return (
            <Layout engineAPI={EngineAPI} />
        );
    }
}

render(<App />, document.body);