import { TridentAPI } from "./engine-api/trident/TridentAPI";
import { createElement, render, Component } from "./gooact";
import { Layout } from "./ui/Layout";
import { registerEditorBridge } from "@trident/editor";
import { SaveAsset } from "./commands/SaveAsset";
import { LayoutInspectorEvents, RuntimeEvents, SceneEvents } from "./Events";
import { InspectorInput, InspectorInputProps } from "./ui/Inspector/InspectorInput";
import { ExtendedDataTransfer } from "./helpers/ExtendedDataTransfer";

import { EditorRuntime } from "./engine-api/trident/EditorRuntime";
import { IGameObject } from "./engine-api/trident/components/IGameObject";
import { LayoutHierarchyEvents } from "./ui/LayoutHierarchy";
import { Components, SceneExecutionMode } from "@trident/core";
import { PhysicsRapier } from "@trident/plugins/PhysicsRapier/PhysicsRapier";
// import "./helpers/LeakTracker";

import { Debugger } from "@trident/plugins/Debugger";
import { SaveToFile } from "./commands/SaveToFile";
import { InspectorProperty, InspectorPropertyProps } from "./ui/Inspector/InspectorProperty";

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
            writeFile: (path, data) => SaveToFile(path, data instanceof Blob ? data : new Blob([data as BufferSource])),
            repaintInspector: () => { TridentAPI.EventSystem.emit(LayoutInspectorEvents.Repaint) },
            LayoutInspectorInput: (props: InspectorInputProps) => { return <InspectorInput {...props} /> },
            LayoutInspectorProperty: (props: InspectorPropertyProps) => { return <InspectorProperty {...props} /> },
            ExtendedDataTransfer: () => { return ExtendedDataTransfer },
            events: {
                onSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.on(SceneEvents.Saved, handler) },
                offSceneSaved: (handler: () => void) => { TridentAPI.EventSystem.off(SceneEvents.Saved, handler) },

                onHierarchySelected(handler: (gameObject: IGameObject) => void) { TridentAPI.EventSystem.on(LayoutHierarchyEvents.Selected, handler); },
                offHierarchySelected(handler: (gameObject: IGameObject) => void) { TridentAPI.EventSystem.off(LayoutHierarchyEvents.Selected, handler); }
            },
            Selection: {
                get activeGameObject() { return activeGameObject; }
            }
        });

        TridentAPI.EventSystem.on(SceneEvents.Loaded, scene => {
            EditorRuntime.AttachEditorScene(engineAPI.currentScene);
            EditorRuntime.AttachEnvironment(engineAPI.currentScene);
        })

        TridentAPI.EventSystem.on(RuntimeEvents.CreatedCanvas, async (canvas) => {
            const Runtime = await engineAPI.createRuntime(canvas);
            // Runtime.Renderer.SetResolution({mode: "fixed", width: 1280, height: 720})
            const currentScene = Runtime.SceneManager.CreateScene("DefaultScene");
            currentScene.mode = SceneExecutionMode.Edit;
            Runtime.SceneManager.SetActiveScene(currentScene);

            const file = await fetch("./resources/DefaultScene.scene");
            const text = await file.text();
            const sceneJSON = JSON.parse(text);

            await Runtime.AddSystem(PhysicsRapier);

            await EngineAPI.deserializer.deserializeScene(EngineAPI.currentScene, sceneJSON);
            TridentAPI.EventSystem.emit(SceneEvents.Loaded, EngineAPI.currentScene);

            TridentAPI.EventSystem.emit(SceneEvents.Loaded, currentScene);

            Debugger.Enable();

            setTimeout(() => {
                Components.Camera.mainCamera.aspect = canvas.width / canvas.height;
            }, 1000);

            // const atlasView = new UITextureViewer(Debugger.ui, "VT Atlas", BindlessVT.manager.Atlas());
            // const tableView = new UITextureViewer(Debugger.ui, "VT PageTable", BindlessVT.manager.PageTables());
            // setInterval(() => { atlasView.Update(); tableView.Update(); }, 1000);  
        })
    }

    render() {
        return (
            <Layout engineAPI={EngineAPI} />
        );
    }
}

render(<App />, document.body);