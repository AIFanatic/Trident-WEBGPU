import { Components, Input, MouseCodes, Runtime, GPU, GameObject } from "@trident/core";
import { GPUPicker } from "./helpers/GPUPicker";
import { EditorAPI } from "@trident/editor";
import { ObjectHighlighter } from "./helpers/ObjectHighlighter";
import { TransformControls } from "./TransformControls";

export class ObjectPicker extends Components.Component {
    public static type = "@trident/plugins/ObjectPicker";

    public runInEditMode: boolean = true;

    private objectHighlighterInstance: ObjectHighlighter;

    public async Start() {
        // TODO: Destroy, for scene reload
        this.objectHighlighterInstance = Runtime.Renderer.RenderPipeline.AddPass(ObjectHighlighter, GPU.RenderPassOrder.BeforeScreenOutput);

        EditorAPI.Events.onHierarchySelected(gameObject => {
            this.PickObject(gameObject);
        })
    }

    private PickObject(gameObject: GameObject | null) {
        if (!gameObject) {
            this.objectHighlighterInstance.selectedGameObject = null;
            return;
        }

        this.objectHighlighterInstance.selectedGameObject = gameObject;
    }

    public async Update() {
        if (TransformControls.suppressSelection) return;

        if (Input.GetMouseButtonUp(MouseCodes.MOUSE_LEFT)) {
            GPUPicker.Pick(r => !TransformControls.IsGizmoObject(r.gameObject)).then(gameObject => {
                this.PickObject(gameObject);
                EditorAPI.Events.selectGameObject(gameObject);
            })
        }
    }
}