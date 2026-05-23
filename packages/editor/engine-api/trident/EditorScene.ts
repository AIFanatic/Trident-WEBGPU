import { Component, Components, GameObject, Input, KeyCodes } from "@trident/core";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { EditorRuntime } from "./EditorRuntime";
import { EditorAPI } from "@trident/editor";

export class EditorScene extends Component {
    public static type = "@trident/editor/EditorScene"
    public runInEditMode: boolean = true;

    private orbitControls: OrbitControls;
    private selectedHierarchyGameObject: GameObject;

    public Start(): void {
        this.orbitControls = this.gameObject.GetComponent(OrbitControls) ?? this.gameObject.AddComponent(OrbitControls);
        this.orbitControls.camera = Components.Camera.mainCamera;
        this.orbitControls.runInEditMode = true;

        EditorAPI.Events.onHierarchySelected(gameObject => {
            this.selectedHierarchyGameObject = gameObject as unknown as GameObject;
        })
    }

    public Update(): void {
        if (this.orbitControls) {
            this.orbitControls.enabled = !EditorRuntime.isPlaying;

            if (Input.GetKeyDown(KeyCodes.F) && this.selectedHierarchyGameObject) {
                this.orbitControls.center.copy(this.selectedHierarchyGameObject.transform.position);
                this.orbitControls.zoom(1); // TODO: Update orbitcontrols somehow cleaner
            }
        };
    }
}