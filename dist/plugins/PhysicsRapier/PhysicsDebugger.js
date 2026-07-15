import { Component, Utils } from '@trident/core';
import { PhysicsRapier } from './PhysicsRapier.js';
import { LineRenderer } from '@trident/plugins/LineRenderer.js';

class PhysicsDebugger extends Component {
  static type = "@trident/plugins/PhysicsRapier/PhysicsDebugger";
  runInEditMode = true;
  updateRate = 1e3;
  // ms between refreshes
  line;
  lastUpdate = 0;
  Start() {
    if (!this.line) {
      this.line = this.gameObject.AddComponent(LineRenderer);
      this.line.flags |= Utils.Flags.DontSaveInEditor | Utils.Flags.HideInInspector;
    }
  }
  Update() {
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

export { PhysicsDebugger };
