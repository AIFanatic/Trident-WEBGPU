import { Deserializer, GameObject, ISerializedScene, Runtime, Scene, SceneExecutionMode, Serializer } from "@trident/core";
import { EditorScene } from "./EditorScene";
import { EnvironmentManager } from "./EnvironmentManager";
import { PostProcessing } from "./PostProcessing";

import { PhysicsDebugger } from "@trident/plugins/PhysicsRapier/PhysicsDebugger";
import { ObjectPicker } from "./ObjectPicker";
import { TransformControls } from "./TransformControls";

export class EditorRuntime extends Runtime {
    public static isPlaying = false;
    private static snapshot: ISerializedScene | null = null;

    public static async Create(canvas: HTMLCanvasElement, aspectRatio = 1): Promise<Runtime> {
        await Runtime.Create(canvas, aspectRatio);
        const loop = () => {
            this.Tick();
            this.Render();
            requestAnimationFrame(loop);
        };
        loop();
        return this;
    }

    public static AttachEditorScene(scene: Scene): EditorScene {
        const existing = scene.GetComponents(EditorScene)[0];
        if (existing) return existing;

        const editorSceneGO = new GameObject(scene);
        editorSceneGO.name = "EditorScene";

        // EditorScene
        {
            const go = new GameObject(scene);
            go.transform.parent = editorSceneGO.transform;
            go.name = "EditorScene";
            go.AddComponent(EditorScene);
        }
        // PhysicsDebugger
        {
            const go = new GameObject(scene);
            go.transform.parent = editorSceneGO.transform;
            go.name = "PhysicsDebugger";
            go.AddComponent(PhysicsDebugger);
        }
        // EnvironmentManager
        {
            const go = new GameObject(scene);
            go.transform.parent = editorSceneGO.transform;
            go.name = "EnvironmentManager";
            go.AddComponent(EnvironmentManager);
        }

        // PostProcessing
        {
            const go = new GameObject(scene);
            go.transform.parent = editorSceneGO.transform;
            go.name = "PostProcessing";
            go.AddComponent(PostProcessing);
        }

        // ObjectPicker
        {
            const go = new GameObject(scene);
            go.transform.parent = editorSceneGO.transform;
            go.name = "ObjectPicker";
            go.AddComponent(ObjectPicker);
        }
        // TransformControls
        {
            const go = new GameObject(scene);
            go.transform.parent = editorSceneGO.transform;
            go.name = "TransformControls";
            go.AddComponent(TransformControls);
        }

        return editorSceneGO;
    }

    public static Play() {
        const scene = this.SceneManager.GetActiveScene();
        this.snapshot = Serializer.serializeScene(scene);
        scene.mode = SceneExecutionMode.Play;
        this.isPlaying = true;
    }

    public static async Stop() {
        this.isPlaying = false;
        if (!this.snapshot) return;

        this.SceneManager.GetActiveScene().Clear();

        const newScene = this.SceneManager.CreateScene(this.snapshot.name);
        newScene.mode = SceneExecutionMode.Edit;
        this.SceneManager.SetActiveScene(newScene);
        await Deserializer.deserializeScene(newScene, this.snapshot);

        this.snapshot = null;
    }
}