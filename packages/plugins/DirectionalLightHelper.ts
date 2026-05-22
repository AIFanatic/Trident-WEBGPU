import { Component, Components, GameObject, Mathf } from "@trident/core";
import { LineRenderer } from "@trident/plugins/LineRenderer";

export class DirectionalLightHelper extends Component {
    private lineRenderer: LineRenderer;
    public light: Components.DirectionalLight;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.lineRenderer = gameObject.AddComponent(LineRenderer);

        const positions = [
			-1, -1, 0,   -1, 1, 0,
            -1, 1, 0,    1, 1, 0,
            1, 1, 0,     1, -1, 0,
            1, -1, 0,    -1, -1, 0,

            0, 0, 0,     0, 0, -1
		];

        this.lineRenderer.SetPositions(new Float32Array(positions));
    }

    public Start(): void {
        const light = this.gameObject.GetComponent(Components.DirectionalLight);
        if (!light) throw Error("DirectionalLightHelper.light not defined");
        this.light = light;
    }
}