import { TridentAPI } from "./engine-api/trident/TridentAPI";
import { createElement, render, Component } from "./gooact";
import { Layout } from "./ui/Layout";
import { registerEditorBridge } from "@trident/editor";
import { SaveAsset } from "./commands/SaveAsset";
import { LayoutInspectorEvents, RuntimeEvents, SceneEvents } from "./Events";
import { InspectorInput, InspectorInputProps } from "./ui/Inspector/InspectorInput";
import { ExtendedDataTransfer } from "./helpers/ExtendedDataTransfer";

import { EditorRuntime } from "./engine-api/trident/EditorRuntime";
import { Console, GPU, SceneExecutionMode } from "@trident/core";
import { Sky } from "@trident/plugins/Environment/Sky";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
import { IBLLightingPass } from "@trident/plugins/Environment/IBLLightingPass";
import { SkyboxPass } from "@trident/plugins/Environment/SkyboxPass";
import { IGameObject } from "./engine-api/trident/components/IGameObject";
import { LayoutHierarchyEvents } from "./ui/LayoutHierarchy";

export type EditorEventHandler<T extends (...args: any[]) => void> = (...args: Parameters<T>) => void;

const EngineAPI = new TridentAPI();

class App extends Component {
    constructor() {
        super();

        const engineAPI = new TridentAPI();

        let activeGameObject: IGameObject | null = null;

        TridentAPI.EventSystem.on(LayoutHierarchyEvents.Selected, (go: IGameObject | null) => {
            activeGameObject = go;
        });

        registerEditorBridge({
            saveAsset: SaveAsset,
            repaintInspector: () => { TridentAPI.EventSystem.emit(LayoutInspectorEvents.Repaint) },
            LayoutInspectorInput: (props: InspectorInputProps) => { return <InspectorInput {...props} /> },
            ExtendedDataTransfer: () => { return ExtendedDataTransfer },
            events: {
                onSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.on(SceneEvents.Saved, handler) },
                offSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.off(SceneEvents.Saved, handler) },
            },
            Selection: {
                get activeGameObject() { return activeGameObject; }
            }
        });

        TridentAPI.EventSystem.on(SceneEvents.Loaded, scene => {
            EditorRuntime.AttachEditorScene(engineAPI.currentScene);
        })

        TridentAPI.EventSystem.on(RuntimeEvents.CreatedCanvas, async (canvas) => {
            Console.getVar("r_shadows_csm_splittypepracticallambda").value = 0.99;

            const Runtime = await engineAPI.createRuntime(canvas);
            const currentScene = Runtime.SceneManager.CreateScene("DefaultScene");
            currentScene.mode = SceneExecutionMode.Edit;
            Runtime.SceneManager.SetActiveScene(currentScene);

            const file = await fetch("./resources/DefaultScene.scene");
            const text = await file.text();
            const sceneJSON = JSON.parse(text);

            // EngineAPI.currentScene.Clear();
            await EngineAPI.deserializer.deserializeScene(EngineAPI.currentScene, sceneJSON);
            TridentAPI.EventSystem.emit(SceneEvents.Loaded, EngineAPI.currentScene);



            const skyAtmosphere = new Sky();
            await skyAtmosphere.init();
            const iblLightingPass = Runtime.Renderer.RenderPipeline.AddPass(IBLLightingPass, GPU.RenderPassOrder.AfterLighting);
            const skyboxPass = Runtime.Renderer.RenderPipeline.AddPass(SkyboxPass, GPU.RenderPassOrder.AfterLighting);

            iblLightingPass.SetEnvironment(skyAtmosphere.skyTextureCubemap);
            skyboxPass.SetSkybox(skyAtmosphere.skyTextureCubemap);

            Runtime.AddSystem(PhysicsRapier);

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