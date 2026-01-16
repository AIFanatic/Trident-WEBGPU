import { Component, Mathf } from "@trident/core";

import { PhysicsRapier } from "./PhysicsRapier";
import { LineRenderer } from "@trident/plugins/LineRenderer";

export class PhysicsDebugger extends Component {
    public updateRate: number = 1000;

    public Start(): void {
        const line = this.gameObject.AddComponent(LineRenderer);

        setInterval(() => {
            const { vertices, colors } = PhysicsRapier.PhysicsWorld.debugRender();
            line.SetPositions(vertices);
            line.SetColors(colors);
        }, this.updateRate);
    }
}