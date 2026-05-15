import { Component } from "@trident/core";
import { OrbitControls } from "@trident/plugins/OrbitControls";
import { EditorRuntime } from "./EditorRuntime";

export class EditorScene extends Component {
    public static type = "@trident/editor/EditorScene"
    public runInEditMode: boolean = true;

    private orbitControls: OrbitControls;

    public Start(): void {
        this.orbitControls = this.gameObject.GetComponent(OrbitControls) ?? this.gameObject.AddComponent(OrbitControls);
        this.orbitControls.runInEditMode = true;
    }

    public Update(): void {
        if (this.orbitControls) {
            this.orbitControls.enabled = !EditorRuntime.isPlaying;
        };
    }
}