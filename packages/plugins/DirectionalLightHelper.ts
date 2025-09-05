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

        this.lineRenderer.SetPositions(new Float32Array(positions))
    }

    public Start(): void {
        if (!this.light) throw Error("DirectionalLightHelper.light not defined");
    }

    public Update(): void {
        this.transform.position.copy(this.light.transform.position);
        this.transform.rotation.copy(this.light.transform.rotation);

        this.transform.LookAtV1(new Mathf.Vector3(0,0,0));
  
        // this.transform.scale.z = this.light.range;
    }
}