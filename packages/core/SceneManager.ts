import { Scene } from "./Scene";
import { ISerializedScene } from "./serializer/Serializer";
import { Deserializer } from "./serializer/Deserializer";
import { System } from "./System";

export class SceneManager  extends System {
    private activeScene: Scene;

    public CreateScene(name: string): Scene {
        return new Scene(name);
    }

    public async LoadSceneAsync(sceneSerialized: ISerializedScene): Promise<Scene> {
        const scene = this.CreateScene(sceneSerialized.name);
        Deserializer.deserializeScene(scene, sceneSerialized);
        return scene;
    }
    
    public SetActiveScene(scene: Scene) {
        this.activeScene = scene;
    }

    public GetActiveScene(): Scene {
        return this.activeScene;
    }


    public Update() {
        if (!this.activeScene) throw Error("No active scene");
        this.activeScene.Update();
    }
}