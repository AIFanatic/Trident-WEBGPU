import { Component, Utils } from "@trident/core";
import { PhysicsRapier } from "./PhysicsRapier";
import { LineRenderer } from "@trident/plugins/LineRenderer";

export class PhysicsDebugger extends Component {
    public static type = "@trident/plugins/PhysicsRapier/PhysicsDebugger";
    public runInEditMode: boolean = true;
    public updateRate: number = 1000; // ms between refreshes
    private line: LineRenderer;
    private lastUpdate = 0;

    public Start(): void {
        if (!this.line) {
            this.line = this.gameObject.AddComponent(LineRenderer);
            this.line.flags |= Utils.Flags.DontSaveInEditor | Utils.Flags.HideInInspector;
        }
    }

    public Update(): void {
        if (!this.line || !PhysicsRapier.PhysicsWorld) return;

        const now = performance.now();
        if (now - this.lastUpdate < this.updateRate) return;
        this.lastUpdate = now;

        const { vertices, colors } = PhysicsRapier.PhysicsWorld.debugRender();
        if (vertices.length === 0) return;

        this.line.SetPositions(vertices);
        this.line.SetColors(colors);
    }
}