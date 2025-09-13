import { Component, Components, GameObject, Mathf } from "@trident/core";
import { LineRenderer } from "@trident/plugins/LineRenderer";

export class PointLightHelper extends Component {
    private lineRenderer: LineRenderer;
    public light: Components.PointLight;

    constructor(gameObject: GameObject) {
        super(gameObject);
        this.lineRenderer = gameObject.AddComponent(LineRenderer);

        // PointLight helper made of line segments
        const positions = [];
        const r = 1;        // radius of the helper (scale this as you like)
        const segs = 64;    // segments per ring (higher = smoother)

        // // --- rays (±X, ±Y, ±Z) ---
        // positions.push(
        //     0, 0, 0, r, 0, 0,
        //     0, 0, 0, -r, 0, 0,
        //     0, 0, 0, 0, r, 0,
        //     0, 0, 0, 0, -r, 0,
        //     0, 0, 0, 0, 0, r,
        //     0, 0, 0, 0, 0, -r
        // );

        // --- three great-circle rings: XY, XZ, YZ ---
        for (let i = 0, j = 1; i < segs; i++, j++) {
            const a1 = (i / segs) * Math.PI * 2;
            const a2 = (j / segs) * Math.PI * 2;

            // XY ring (z = 0)
            positions.push(
                r * Math.cos(a1), r * Math.sin(a1), 0,
                r * Math.cos(a2), r * Math.sin(a2), 0
            );

            // XZ ring (y = 0)
            positions.push(
                r * Math.cos(a1), 0, r * Math.sin(a1),
                r * Math.cos(a2), 0, r * Math.sin(a2)
            );

            // YZ ring (x = 0)
            positions.push(
                0, r * Math.cos(a1), r * Math.sin(a1),
                0, r * Math.cos(a2), r * Math.sin(a2)
            );
        }

        this.lineRenderer.SetPositions(new Float32Array(positions));
    }

    public Start(): void {
        if (!this.light) throw Error("SpotLightHelper.light not defined");
    }

    public Update(): void {
        this.transform.position.copy(this.light.transform.position);
        this.transform.rotation.copy(this.light.transform.rotation);
        this.transform.scale.set(this.light.range, this.light.range, this.light.range);
    }
}