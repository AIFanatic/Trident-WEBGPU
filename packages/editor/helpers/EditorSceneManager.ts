import { Component, GameObject } from "@trident/core";

export class EditorSceneManager extends Component {
    public static type = "@trident/plugins/EditorSceneManager";

    constructor(gameObject: GameObject) {
        super(gameObject);

        console.log("HERE")
    }
}