import { Scene } from "./Scene";
import { ISerializedScene } from "./serializer/Serializer";
import { Deserializer } from "./serializer/Deserializer";
import { System } from "./System";

export class SceneManager extends System {
    private activeScene: Scene;
    public static readonly scenes: Scene[] = [];

    public CreateScene(name: string): Scene {
        const scene = new Scene(name);
        SceneManager.scenes.push(scene);
        return scene;
    }

    public async LoadSceneAsync(sceneSerialized: ISerializedScene): Promise<Scene> {
        const scene = this.CreateScene(sceneSerialized.name);
        await Deserializer.deserializeScene(scene, sceneSerialized);
        return scene;
    }

    public SetActiveScene(scene: Scene) {
        this.activeScene = scene;
    }

    public GetActiveScene(): Scene {
        return this.activeScene;
    }

    public GetScenes(): Scene[] {
        return SceneManager.scenes;
    }

    public Update() {
        for (const scene of SceneManager.scenes) scene.Update();
    }

    public UnloadScene(scene: Scene): void {
        scene.Clear();
        const sceneIndex = SceneManager.scenes.indexOf(scene);
        if (sceneIndex !== -1) SceneManager.scenes.splice(sceneIndex, 1);
    }
}