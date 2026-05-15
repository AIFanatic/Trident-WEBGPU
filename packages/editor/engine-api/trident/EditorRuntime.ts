import { Deserializer, GameObject, ISerializedScene, Runtime, Scene, SceneExecutionMode, Serializer } from "@trident/core";
import { EditorScene } from "./EditorScene";

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

        const go = new GameObject(scene);
        go.name = "EditorScene";
        return go.AddComponent(EditorScene);
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