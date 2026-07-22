import { Component, Components, GameObject, Geometry, HideInInspector, Input, KeyCodes, PBRMaterial } from "@trident/core";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { EditorRuntime } from "./EditorRuntime";
import { EditorAPI } from "@trident/editor";

export class EditorScene extends Component {
    public static type = "@trident/editor/EditorScene"
    public runInEditMode: boolean = true;

    private editorCamera: Components.Camera;
    private orbitControls: OrbitControls;
    private selectedHierarchyGameObject: GameObject;

    public Start(): void {
        this.editorCamera = this.gameObject.GetComponent(Components.Camera) ?? this.gameObject.AddComponent(Components.Camera);
        this.editorCamera.SetPerspective(60, 2, 0.5, 10000);
        this.editorCamera.transform.position.z = -10;

        this.orbitControls = this.gameObject.GetComponent(OrbitControls) ?? this.gameObject.AddComponent(OrbitControls);
        this.orbitControls.camera = this.editorCamera;
        this.orbitControls.runInEditMode = true;

        Components.Camera.mainCamera = this.editorCamera;

        EditorAPI.Events.onHierarchySelected(gameObject => {
            this.selectedHierarchyGameObject = gameObject as unknown as GameObject;
        });
    }

    public Update(): void {
        if (EditorRuntime.isPlaying) {
            const gameCamera = this.gameObject.scene.GetComponents(Components.Camera).find(c => c !== this.editorCamera);

            console.log(gameCamera?.gameObject.name)
            if (gameCamera) Components.Camera.mainCamera = gameCamera;
            else console.warn("[EditorScene] Play started but scene has no camera.");

            this.orbitControls.enabled = false;
            this.enabled = false;
            return;
        }

        if (Input.GetKeyDown(KeyCodes.F) && this.selectedHierarchyGameObject) {
            this.orbitControls.center.copy(this.selectedHierarchyGameObject.transform.position);
            this.orbitControls.zoom(1);
        }
    }
}